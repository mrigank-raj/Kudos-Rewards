-- ============================================================
-- 019_member_removal.sql
-- HR can remove a person (employee or HR) from the portal.
--   * Removal is a soft close: users.removed_at is set, history is kept,
--     login is blocked and every org-scoped permission stops at once.
--   * Optional: revoke the person's remaining points (recorded in the ledger).
--   * Guards: no self-removal, never zero HR, no removal while the person
--     has reward requests waiting.
-- Also fixes found while auditing:
--   * cancelling a reward request now refunds the points; handled requests
--     can't change again (no double refunds)
--   * drops the old 4-arg send_kudos that skipped newer checks
--   * pending_members: lowercase @kiit.ac.in only, no existing/removed accounts
--   * HR stays out of the reward shop
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ;

-- ------------------------------------------------------------ removed users lose org access
-- Every org-scoped RLS policy and most RPCs go through these two helpers,
-- so a removed person's still-valid access token stops working right away.
CREATE OR REPLACE FUNCTION public.get_user_org()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM public.users WHERE id = auth.uid() AND removed_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid() AND removed_at IS NULL;
$$;

-- Messages are guarded by participation only, not org, so check it here too.
CREATE OR REPLACE FUNCTION public.community_is_participant(p_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM community_conversation_participants cp
        JOIN users u ON u.id = cp.user_id
        WHERE cp.conversation_id = p_conversation_id
          AND cp.user_id = auth.uid()
          AND u.removed_at IS NULL
    );
$$;

-- removed_at is server-only, like role and balance.
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
        NEW.role := 'recipient';
        NEW.points_balance := 0;
        NEW.org_id := NULL;
        NEW.removed_at := NULL;
        RETURN NEW;
    END IF;

    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.role IS DISTINCT FROM OLD.role
       OR NEW.org_id IS DISTINCT FROM OLD.org_id
       OR NEW.points_balance IS DISTINCT FROM OLD.points_balance
       OR NEW.email IS DISTINCT FROM OLD.email
       OR NEW.team IS DISTINCT FROM OLD.team
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
       OR NEW.removed_at IS DISTINCT FROM OLD.removed_at THEN
        RAISE EXCEPTION 'You can only change your own name or avatar'
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$;

-- ------------------------------------------------------------ remove_member
CREATE OR REPLACE FUNCTION public.remove_member(p_user_id UUID, p_revoke_points BOOLEAN)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org UUID;
    v_target users%ROWTYPE;
    v_pending INTEGER;
    v_revoked INTEGER := 0;
BEGIN
    SELECT org_id INTO v_org FROM users
    WHERE id = auth.uid() AND role = 'admin' AND removed_at IS NULL;
    IF v_org IS NULL THEN
        RAISE EXCEPTION 'Only HR can remove people' USING ERRCODE = '42501';
    END IF;

    IF p_user_id = auth.uid() THEN
        RAISE EXCEPTION 'You cannot remove yourself';
    END IF;

    -- One removal per org at a time, so two HRs can't remove each other
    -- simultaneously. Re-check the caller after waiting for the lock.
    PERFORM 1 FROM organizations WHERE id = v_org FOR UPDATE;
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin' AND removed_at IS NULL) THEN
        RAISE EXCEPTION 'Only HR can remove people' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_target FROM users WHERE id = p_user_id AND org_id = v_org FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Person not found';
    END IF;
    IF v_target.removed_at IS NOT NULL THEN
        RAISE EXCEPTION '% has already been removed', v_target.name;
    END IF;

    IF v_target.role = 'admin'
       AND (SELECT count(*) FROM users WHERE org_id = v_org AND role = 'admin' AND removed_at IS NULL) <= 1 THEN
        RAISE EXCEPTION 'The last HR cannot be removed';
    END IF;

    SELECT count(*) INTO v_pending FROM redemptions WHERE user_id = p_user_id AND status = 'pending';
    IF v_pending > 0 THEN
        RAISE EXCEPTION '% has % reward request(s) waiting. Deliver or cancel them on the Redemptions page first.', v_target.name, v_pending;
    END IF;

    IF p_revoke_points AND v_target.points_balance > 0 THEN
        v_revoked := v_target.points_balance;
        INSERT INTO transactions (user_id, type, points, reason)
        VALUES (p_user_id, 'manual_debit', -v_revoked, 'Points revoked on leaving');
    END IF;

    -- Demoting to recipient also shuts every inline role = 'admin' check.
    UPDATE users
    SET removed_at = now(),
        role = 'recipient',
        points_balance = points_balance - v_revoked
    WHERE id = p_user_id;

    -- Block future logins and kill refresh tokens; the access token they
    -- already hold is useless because the helpers above now return NULL.
    UPDATE auth.users SET banned_until = now() + INTERVAL '100 years' WHERE id = p_user_id;
    DELETE FROM auth.sessions WHERE user_id = p_user_id;

    RETURN json_build_object('success', true, 'points_revoked', v_revoked);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.remove_member(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_member(UUID, BOOLEAN) TO authenticated;

-- ------------------------------------------------------------ approved list hygiene
CREATE OR REPLACE FUNCTION public.pending_members_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_removed TIMESTAMPTZ;
BEGIN
    NEW.email := lower(trim(NEW.email));

    IF NEW.email NOT LIKE '%@kiit.ac.in' THEN
        RAISE EXCEPTION 'Use an official @kiit.ac.in email address';
    END IF;

    SELECT removed_at INTO v_removed FROM users WHERE lower(email) = NEW.email;
    IF FOUND THEN
        IF v_removed IS NOT NULL THEN
            RAISE EXCEPTION 'This person was removed earlier. Contact the portal admin to restore them.';
        END IF;
        RAISE EXCEPTION 'This person already has an account';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pending_members_before_write ON pending_members;
CREATE TRIGGER pending_members_before_write
    BEFORE INSERT OR UPDATE ON pending_members
    FOR EACH ROW EXECUTE FUNCTION public.pending_members_before_write();

REVOKE EXECUTE ON FUNCTION public.pending_members_before_write() FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------ Thank You !: active people only
DROP FUNCTION IF EXISTS public.send_kudos(UUID, UUID, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION public.send_kudos(p_from_user_id uuid, p_to_user_id uuid, p_message text, p_points integer, p_tags text[] DEFAULT '{}'::text[])
RETURNS json
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
        RAISE EXCEPTION 'You can only send a Thank You ! as yourself' USING ERRCODE = '42501';
    END IF;

    IF p_from_user_id = p_to_user_id THEN
        RAISE EXCEPTION 'You cannot send a Thank You ! to yourself.';
    END IF;

    IF p_points IS NULL OR p_points < 0 THEN
        RAISE EXCEPTION 'Points must be 0 or greater.';
    END IF;

    IF p_message IS NULL OR TRIM(p_message) = '' THEN
        RAISE EXCEPTION 'A message is required.';
    END IF;

    SELECT points_balance, org_id, name INTO v_sender_balance, v_sender_org, v_sender_name
    FROM users WHERE id = p_from_user_id AND removed_at IS NULL FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Your account has been closed.' USING ERRCODE = '42501';
    END IF;

    IF p_points > 0 AND v_sender_balance < p_points THEN
        RAISE EXCEPTION 'Insufficient balance to send % points.', p_points;
    END IF;

    PERFORM id FROM users WHERE id = p_to_user_id AND org_id = v_sender_org AND removed_at IS NULL FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'This person is no longer at KIIT.';
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
        VALUES (p_from_user_id, 'manual_debit', -p_points, 'Sent a Thank You !');

        UPDATE users
        SET points_balance = points_balance + p_points
        WHERE id = p_to_user_id
        RETURNING points_balance INTO v_receiver_balance;

        INSERT INTO transactions (user_id, type, points, reason)
        VALUES (p_to_user_id, 'earn', p_points, 'Thank You ! from ' || v_sender_name);
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

-- ------------------------------------------------------------ official points: active people only
CREATE OR REPLACE FUNCTION public.credit_points(p_user_id uuid, p_points integer, p_reason text, p_program_id uuid DEFAULT NULL::uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_balance INTEGER;
    v_admin_org UUID;
BEGIN
    SELECT org_id INTO v_admin_org FROM users WHERE id = auth.uid() AND role = 'admin' AND removed_at IS NULL;
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

    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND org_id = v_admin_org AND removed_at IS NULL) THEN
        RAISE EXCEPTION 'This person is no longer at KIIT';
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

-- ------------------------------------------------------------ reward shop: active employees only
CREATE OR REPLACE FUNCTION public.redeem_reward(p_user_id uuid, p_catalog_item_id uuid)
RETURNS json
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
    FROM users WHERE id = p_user_id AND role = 'recipient' AND removed_at IS NULL FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Only employees can redeem rewards' USING ERRCODE = '42501';
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

-- ------------------------------------------------------------ reward requests: refund on cancel
-- Only pending -> fulfilled|cancelled. A handled request is final, so a
-- refund can never be paid twice. The refund is a positive 'redeem' row so
-- "redeemed" stats net it out instead of counting it as newly issued points.
CREATE OR REPLACE FUNCTION public.update_redemption_status(p_redemption_id uuid, p_status text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_org UUID;
    v_r redemptions%ROWTYPE;
    v_item_name TEXT;
BEGIN
    IF p_status NOT IN ('fulfilled', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid status: %', p_status;
    END IF;

    SELECT org_id INTO v_admin_org FROM users WHERE id = auth.uid() AND role = 'admin' AND removed_at IS NULL;
    IF v_admin_org IS NULL THEN
        RAISE EXCEPTION 'Only admins can update redemption status';
    END IF;

    SELECT r.* INTO v_r
    FROM redemptions r JOIN users u ON u.id = r.user_id
    WHERE r.id = p_redemption_id AND u.org_id = v_admin_org
    FOR UPDATE OF r;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Redemption not found in your organization';
    END IF;

    IF v_r.status <> 'pending' THEN
        RAISE EXCEPTION 'This request was already %', v_r.status;
    END IF;

    UPDATE redemptions SET status = p_status WHERE id = p_redemption_id;

    IF p_status = 'cancelled' AND v_r.points_spent > 0 THEN
        SELECT name INTO v_item_name FROM catalog_items WHERE id = v_r.catalog_item_id;
        INSERT INTO transactions (user_id, type, points, reason)
        VALUES (v_r.user_id, 'redeem', v_r.points_spent, 'Refund: ' || COALESCE(v_item_name, 'cancelled reward'));
        UPDATE users SET points_balance = points_balance + v_r.points_spent WHERE id = v_r.user_id;
    END IF;

    RETURN json_build_object('success', true, 'redemption_id', p_redemption_id, 'status', p_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_points_summary(p_org_id uuid)
RETURNS TABLE(month text, issued bigint, redeemed bigint)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT
        to_char(t.created_at, 'YYYY-MM') AS month,
        COALESCE(SUM(CASE WHEN t.type IN ('earn', 'manual_credit') THEN t.points ELSE 0 END), 0) AS issued,
        COALESCE(-SUM(CASE WHEN t.type = 'redeem' THEN t.points ELSE 0 END), 0) AS redeemed
    FROM transactions t
    JOIN users u ON t.user_id = u.id
    WHERE u.org_id = p_org_id
    GROUP BY to_char(t.created_at, 'YYYY-MM')
    ORDER BY month;
$$;

-- ------------------------------------------------------------ lists: hide removed people
CREATE OR REPLACE FUNCTION public.get_top_recipients(p_org_id uuid, p_limit integer DEFAULT 10)
RETURNS TABLE(user_id uuid, user_name text, user_email text, avatar_url text, team text, total_earned bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        u.id,
        u.name,
        u.email,
        u.avatar_url,
        u.team,
        COALESCE(SUM(CASE WHEN t.type IN ('earn', 'manual_credit') THEN t.points ELSE 0 END), 0)::bigint
    FROM users u
    LEFT JOIN transactions t ON t.user_id = u.id
    WHERE u.org_id = p_org_id
      AND p_org_id = get_user_org()
      AND u.role = 'recipient'
      AND u.removed_at IS NULL
    GROUP BY u.id, u.name, u.email, u.avatar_url, u.team
    ORDER BY 6 DESC
    LIMIT least(greatest(p_limit, 1), 100);
$$;

CREATE OR REPLACE FUNCTION public.community_directory(p_search text DEFAULT NULL::text, p_team text DEFAULT NULL::text, p_skill text DEFAULT NULL::text, p_user_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 24, p_offset integer DEFAULT 0)
RETURNS TABLE(user_id uuid, name text, avatar_url text, team text, role text, job_title text, bio text, skills text[], reputation bigint, accepted_answers bigint, appreciations bigint, post_count bigint, answer_count bigint, badges json, joined_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
    WITH me AS (SELECT get_user_org() AS org_id),
    members AS (
        SELECT u.*
        FROM users u, me
        WHERE me.org_id IS NOT NULL
          AND u.org_id = me.org_id
          AND u.removed_at IS NULL
          AND (p_user_id IS NULL OR u.id = p_user_id)
          AND (p_team IS NULL OR u.team = p_team)
    )
    SELECT
        m.id, m.name, m.avatar_url, m.team, m.role,
        cp.job_title, cp.bio, COALESCE(cp.skills, '{}'),
        COALESCE(c.reputation, 0),
        COALESCE(c.accepted, 0),
        COALESCE(c.appreciations, 0),
        (SELECT count(*) FROM community_posts p WHERE p.author_id = m.id AND NOT p.is_hidden),
        (SELECT count(*) FROM community_comments cc WHERE cc.author_id = m.id AND NOT cc.is_deleted AND NOT cc.is_hidden),
        COALESCE((
            SELECT json_agg(json_build_object('key', b.key, 'name', b.name, 'icon', b.icon, 'description', b.description, 'awarded_at', ub.awarded_at) ORDER BY ub.awarded_at DESC)
            FROM user_badges ub JOIN badges b ON b.id = ub.badge_id
            WHERE ub.user_id = m.id
        ), '[]'::json),
        m.created_at
    FROM members m
    LEFT JOIN community_profiles cp ON cp.user_id = m.id
    LEFT JOIN LATERAL (
        SELECT sum(points) AS reputation,
               count(*) FILTER (WHERE kind = 'accepted_answer') AS accepted,
               count(*) FILTER (WHERE kind IN ('post_appreciated', 'comment_appreciated')) AS appreciations
        FROM community_contributions WHERE community_contributions.user_id = m.id
    ) c ON true
    WHERE (p_skill IS NULL OR lower(trim(p_skill)) = ANY (COALESCE(cp.skills, '{}')))
      AND (
        p_search IS NULL OR trim(p_search) = ''
        OR m.name ILIKE '%' || trim(p_search) || '%'
        OR cp.job_title ILIKE '%' || trim(p_search) || '%'
        OR EXISTS (SELECT 1 FROM unnest(COALESCE(cp.skills, '{}')) s WHERE s ILIKE '%' || trim(p_search) || '%')
      )
    ORDER BY COALESCE(c.reputation, 0) DESC, m.name
    LIMIT least(greatest(p_limit, 1), 100) OFFSET greatest(p_offset, 0);
$$;

-- ------------------------------------------------------------ messages: no new messages to removed people
CREATE OR REPLACE FUNCTION public.community_start_conversation(p_other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_me UUID := auth.uid();
    v_org UUID := get_user_org();
    v_key TEXT;
    v_id UUID;
BEGIN
    IF v_me IS NULL OR v_org IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
    END IF;
    IF p_other_user_id IS NULL OR p_other_user_id = v_me THEN
        RAISE EXCEPTION 'Choose a colleague to message';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_other_user_id AND org_id = v_org AND removed_at IS NULL) THEN
        RAISE EXCEPTION 'This person is no longer at KIIT' USING ERRCODE = '42501';
    END IF;

    v_key := least(v_me::text, p_other_user_id::text) || ':' || greatest(v_me::text, p_other_user_id::text);

    INSERT INTO community_conversations (org_id, direct_key, created_by)
    VALUES (v_org, v_key, v_me)
    ON CONFLICT (direct_key) DO NOTHING
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
        SELECT id INTO v_id FROM community_conversations WHERE direct_key = v_key;
    ELSE
        INSERT INTO community_conversation_participants (conversation_id, user_id)
        VALUES (v_id, v_me), (v_id, p_other_user_id)
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.community_messages_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF is_api_client() THEN
        NEW.sender_id := auth.uid();
        -- Participants of a conversation are visible to each other, so this
        -- runs fine under the sender's own permissions.
        IF EXISTS (
            SELECT 1 FROM community_conversation_participants cp
            JOIN users u ON u.id = cp.user_id
            WHERE cp.conversation_id = NEW.conversation_id
              AND cp.user_id <> NEW.sender_id
              AND u.removed_at IS NOT NULL
        ) THEN
            RAISE EXCEPTION 'This person is no longer at KIIT';
        END IF;
    END IF;
    NEW.body := trim(NEW.body);
    NEW.created_at := clock_timestamp();
    RETURN NEW;
END;
$$;
