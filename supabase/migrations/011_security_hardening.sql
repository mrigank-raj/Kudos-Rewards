-- ============================================================
-- 011_security_hardening.sql
-- Kudos R&R Platform — Close privilege-escalation holes before the
-- community module builds on top of users.role / users.org_id.
-- ============================================================
-- Problems found while auditing for the community feature:
--
-- 1. "Users can update own profile" (002) has no column restriction, so a
--    recipient could PATCH their own row to role='admin', move org_id into
--    another organization, or set points_balance to anything.
-- 2. credit_points / debit_points (003, 010) never checked the caller —
--    any signed-in user could credit themselves points via supabase.rpc().
-- 3. redeem_reward / send_kudos trusted a client-supplied user id, so a
--    caller could spend someone else's balance.
-- 4. None of the SECURITY DEFINER functions pinned search_path.
--
-- Fix strategy: keep every function signature the frontend already calls
-- so nothing else has to change, but derive identity from auth.uid() and
-- check role/org inside the function. Privileged columns on `users` are
-- protected by a trigger that only lets them change from inside trusted
-- SECURITY DEFINER code (where current_user is the function owner, not the
-- `authenticated` API role).
--
-- Rollback: re-run 003/006/008/010 function bodies and
--   DROP TRIGGER protect_user_privileged_columns ON users;
--   DROP FUNCTION register_admin_organization(TEXT, TEXT);
-- (not recommended — it reopens the holes above).
-- ============================================================

-- ------------------------------------------------------------ helpers
-- True when the statement is running directly as an API client role
-- (PostgREST sets the role to anon/authenticated), false inside SECURITY
-- DEFINER functions and for the SQL editor / migrations.
CREATE OR REPLACE FUNCTION public.is_api_client()
RETURNS boolean
LANGUAGE sql STABLE
SET search_path = public
AS $$
    SELECT current_user IN ('authenticated', 'anon');
$$;

ALTER FUNCTION public.get_user_role() SET search_path = public;
ALTER FUNCTION public.get_user_org() SET search_path = public;

-- ------------------------------------------------------------ users: privileged columns
-- Deliberately NOT security definer: current_user must reflect the caller.
CREATE OR REPLACE FUNCTION public.protect_user_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_api_client() THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        -- A client-side insert can only ever create a plain recipient row
        -- for itself; org/role/balance come from handle_new_user().
        NEW.role := 'recipient';
        NEW.points_balance := 0;
        NEW.org_id := NULL;
        RETURN NEW;
    END IF;

    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.role IS DISTINCT FROM OLD.role
       OR NEW.org_id IS DISTINCT FROM OLD.org_id
       OR NEW.points_balance IS DISTINCT FROM OLD.points_balance
       OR NEW.email IS DISTINCT FROM OLD.email
       OR NEW.team IS DISTINCT FROM OLD.team
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'You can only change your own name or avatar'
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_user_privileged_columns ON users;
CREATE TRIGGER protect_user_privileged_columns
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION public.protect_user_privileged_columns();

-- ------------------------------------------------------------ admin self-signup
-- The signup form lets someone create a brand-new organization and become
-- its admin. Previously the browser inserted into `organizations` and then
-- upserted role='admin' onto its own users row — exactly the write the
-- trigger above now blocks. This function does the same thing server-side
-- and only for a just-created account with no history, so an existing
-- employee can't use it to promote themselves.
CREATE OR REPLACE FUNCTION public.register_admin_organization(p_org_name TEXT, p_name TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_user users%ROWTYPE;
    v_org_id UUID;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
    END IF;

    IF p_org_name IS NULL OR length(trim(p_org_name)) < 2 OR length(trim(p_org_name)) > 100 THEN
        RAISE EXCEPTION 'Organization name must be 2-100 characters';
    END IF;

    SELECT * INTO v_user FROM users WHERE id = v_uid FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found';
    END IF;

    IF v_user.role = 'admin' THEN
        RAISE EXCEPTION 'You are already an admin';
    END IF;

    IF v_user.created_at < now() - INTERVAL '1 hour'
       OR EXISTS (SELECT 1 FROM transactions WHERE user_id = v_uid)
       OR EXISTS (SELECT 1 FROM redemptions WHERE user_id = v_uid)
       OR EXISTS (SELECT 1 FROM kudos WHERE from_user_id = v_uid OR to_user_id = v_uid) THEN
        RAISE EXCEPTION 'Only a newly created account can register an organization'
            USING ERRCODE = '42501';
    END IF;

    INSERT INTO organizations (name) VALUES (trim(p_org_name)) RETURNING id INTO v_org_id;

    UPDATE users
    SET role = 'admin',
        org_id = v_org_id,
        name = COALESCE(NULLIF(trim(p_name), ''), name)
    WHERE id = v_uid;

    RETURN json_build_object('success', true, 'org_id', v_org_id);
END;
$$;

-- ------------------------------------------------------------ transactions
-- Every legitimate transaction insert goes through a SECURITY DEFINER RPC;
-- this policy let any admin insert arbitrary ledger rows for any org.
DROP POLICY IF EXISTS "Admins can insert transactions" ON transactions;

-- ------------------------------------------------------------ credit_points
CREATE OR REPLACE FUNCTION credit_points(
    p_user_id UUID,
    p_points INTEGER,
    p_reason TEXT,
    p_program_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_balance INTEGER;
    v_admin_org UUID;
BEGIN
    SELECT org_id INTO v_admin_org FROM users WHERE id = auth.uid() AND role = 'admin';
    IF v_admin_org IS NULL THEN
        RAISE EXCEPTION 'Only admins can credit points' USING ERRCODE = '42501';
    END IF;

    IF p_user_id = auth.uid() THEN
        RAISE EXCEPTION 'You cannot credit points to yourself' USING ERRCODE = '42501';
    END IF;

    IF p_points IS NULL OR p_points <= 0 THEN
        RAISE EXCEPTION 'Points must be greater than 0';
    END IF;

    IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
        RAISE EXCEPTION 'Reason is required';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND org_id = v_admin_org) THEN
        RAISE EXCEPTION 'User not found in your organization';
    END IF;

    IF p_program_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM reward_programs WHERE id = p_program_id AND org_id = v_admin_org) THEN
        RAISE EXCEPTION 'Program not found in your organization';
    END IF;

    INSERT INTO transactions (user_id, type, points, reason, program_id)
    VALUES (p_user_id, 'manual_credit', p_points, p_reason, p_program_id);

    UPDATE users
    SET points_balance = points_balance + p_points
    WHERE id = p_user_id
    RETURNING points_balance INTO v_new_balance;

    PERFORM check_and_award_badges(p_user_id);

    RETURN json_build_object(
        'success', true,
        'new_balance', v_new_balance,
        'points_credited', p_points
    );
END;
$$;

-- ------------------------------------------------------------ debit_points
CREATE OR REPLACE FUNCTION debit_points(
    p_user_id UUID,
    p_points INTEGER,
    p_reason TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
    v_admin_org UUID;
BEGIN
    SELECT org_id INTO v_admin_org FROM users WHERE id = auth.uid() AND role = 'admin';
    IF v_admin_org IS NULL THEN
        RAISE EXCEPTION 'Only admins can debit points' USING ERRCODE = '42501';
    END IF;

    IF p_points IS NULL OR p_points <= 0 THEN
        RAISE EXCEPTION 'Points must be greater than 0';
    END IF;

    IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
        RAISE EXCEPTION 'Reason is required';
    END IF;

    SELECT points_balance INTO v_current_balance
    FROM users WHERE id = p_user_id AND org_id = v_admin_org FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found in your organization';
    END IF;

    IF v_current_balance < p_points THEN
        RAISE EXCEPTION 'Insufficient balance. Current balance: %', v_current_balance;
    END IF;

    INSERT INTO transactions (user_id, type, points, reason)
    VALUES (p_user_id, 'manual_debit', -p_points, p_reason);

    UPDATE users
    SET points_balance = points_balance - p_points
    WHERE id = p_user_id
    RETURNING points_balance INTO v_new_balance;

    RETURN json_build_object(
        'success', true,
        'new_balance', v_new_balance,
        'points_debited', p_points
    );
END;
$$;

-- ------------------------------------------------------------ redeem_reward
-- p_user_id is kept for signature compatibility but must be the caller.
CREATE OR REPLACE FUNCTION redeem_reward(
    p_user_id UUID,
    p_catalog_item_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_points_cost INTEGER;
    v_item_name TEXT;
    v_current_balance INTEGER;
    v_new_balance INTEGER;
    v_redemption_id UUID;
BEGIN
    IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'You can only redeem rewards for yourself' USING ERRCODE = '42501';
    END IF;

    SELECT points_cost, name INTO v_points_cost, v_item_name
    FROM catalog_items WHERE id = p_catalog_item_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Catalog item not found';
    END IF;

    SELECT points_balance INTO v_current_balance
    FROM users WHERE id = p_user_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    IF v_current_balance < v_points_cost THEN
        RAISE EXCEPTION 'Insufficient points. Need %, have %', v_points_cost, v_current_balance;
    END IF;

    INSERT INTO redemptions (user_id, catalog_item_id, points_spent, status)
    VALUES (p_user_id, p_catalog_item_id, v_points_cost, 'pending')
    RETURNING id INTO v_redemption_id;

    INSERT INTO transactions (user_id, type, points, reason)
    VALUES (p_user_id, 'redeem', -v_points_cost, 'Redeemed: ' || v_item_name);

    UPDATE users
    SET points_balance = points_balance - v_points_cost
    WHERE id = p_user_id
    RETURNING points_balance INTO v_new_balance;

    RETURN json_build_object(
        'success', true,
        'redemption_id', v_redemption_id,
        'new_balance', v_new_balance,
        'points_spent', v_points_cost,
        'item_name', v_item_name
    );
END;
$$;

-- The direct-insert policy on redemptions bypassed the balance check above
-- (a client could create "pending" redemptions without paying). The
-- frontend only ever redeems through redeem_reward().
DROP POLICY IF EXISTS "Users can redeem for themselves" ON redemptions;

-- ------------------------------------------------------------ send_kudos
-- Same body as 010, plus: sender must be the caller, receiver must be in
-- the caller's organization.
CREATE OR REPLACE FUNCTION send_kudos(
    p_from_user_id UUID,
    p_to_user_id UUID,
    p_message TEXT,
    p_points INTEGER,
    p_tags TEXT[] DEFAULT '{}'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sender_balance INTEGER;
    v_receiver_balance INTEGER;
    v_kudos_id UUID;
    v_sender_name TEXT;
    v_sender_org UUID;
BEGIN
    IF auth.uid() IS NULL OR p_from_user_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'You can only send kudos as yourself' USING ERRCODE = '42501';
    END IF;

    IF p_from_user_id = p_to_user_id THEN
        RAISE EXCEPTION 'You cannot send kudos to yourself.';
    END IF;

    IF p_points IS NULL OR p_points < 0 THEN
        RAISE EXCEPTION 'Points must be 0 or greater.';
    END IF;

    IF p_message IS NULL OR TRIM(p_message) = '' THEN
        RAISE EXCEPTION 'A message is required.';
    END IF;

    SELECT points_balance, org_id, name INTO v_sender_balance, v_sender_org, v_sender_name
    FROM users WHERE id = p_from_user_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sender not found.';
    END IF;

    IF p_points > 0 AND v_sender_balance < p_points THEN
        RAISE EXCEPTION 'Insufficient balance to send % points.', p_points;
    END IF;

    PERFORM id FROM users WHERE id = p_to_user_id AND org_id = v_sender_org FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Receiver not found.';
    END IF;

    INSERT INTO kudos (from_user_id, to_user_id, message, points_included, tags)
    VALUES (p_from_user_id, p_to_user_id, p_message, p_points, COALESCE(p_tags, '{}'))
    RETURNING id INTO v_kudos_id;

    IF p_points > 0 THEN
        UPDATE users
        SET points_balance = points_balance - p_points
        WHERE id = p_from_user_id
        RETURNING points_balance INTO v_sender_balance;

        INSERT INTO transactions (user_id, type, points, reason)
        VALUES (p_from_user_id, 'manual_debit', -p_points, 'Sent Kudos');

        UPDATE users
        SET points_balance = points_balance + p_points
        WHERE id = p_to_user_id
        RETURNING points_balance INTO v_receiver_balance;

        INSERT INTO transactions (user_id, type, points, reason)
        VALUES (p_to_user_id, 'earn', p_points, 'Received Kudos from ' || v_sender_name);
    END IF;

    PERFORM check_and_award_badges(p_from_user_id);
    PERFORM check_and_award_badges(p_to_user_id);

    RETURN json_build_object(
        'success', true,
        'kudos_id', v_kudos_id,
        'points_sent', p_points
    );
END;
$$;

-- 006 created a 4-argument send_kudos; 008 added the 5-argument version as
-- an overload rather than replacing it, so the old unchecked one is still
-- callable. The frontend always passes p_tags.
DROP FUNCTION IF EXISTS public.send_kudos(UUID, UUID, TEXT, INTEGER);

-- Direct kudos inserts skipped the balance/org checks in send_kudos().
DROP POLICY IF EXISTS "Users can send kudos" ON kudos;

-- ------------------------------------------------------------ search_path on remaining definer functions
ALTER FUNCTION public.update_redemption_status(UUID, TEXT) SET search_path = public;
ALTER FUNCTION public.check_and_award_badges(UUID) SET search_path = public;
ALTER FUNCTION public.notify_kudos_received() SET search_path = public;
ALTER FUNCTION public.notify_points_credited() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- check_and_award_badges is an internal helper; nobody should call it over
-- the API.
REVOKE EXECUTE ON FUNCTION public.check_and_award_badges(UUID) FROM PUBLIC, anon, authenticated;

-- Points-moving functions are never meant for anonymous callers.
REVOKE EXECUTE ON FUNCTION public.credit_points(UUID, INTEGER, TEXT, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.debit_points(UUID, INTEGER, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.redeem_reward(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.send_kudos(UUID, UUID, TEXT, INTEGER, TEXT[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.register_admin_organization(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.credit_points(UUID, INTEGER, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.debit_points(UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_reward(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_kudos(UUID, UUID, TEXT, INTEGER, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_admin_organization(TEXT, TEXT) TO authenticated;
