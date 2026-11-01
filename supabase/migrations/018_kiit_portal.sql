-- ============================================================
-- 018_kiit_portal.sql
-- Turns the demo into the KIIT University Employee Portal:
--   * renames the org
--   * sign-up becomes invite-only: @kiit.ac.in AND on HR's pending_members list
--   * seeds the first HR + employee invites
--   * "kudos" copy becomes "Thank You !"
--   * catalog localised for India
--   * removes the Acme demo accounts (cascades to all their data)
-- ============================================================

UPDATE organizations SET name = 'KIIT University'
WHERE id = 'a0000000-0000-0000-0000-000000000001';

-- ------------------------------------------------------------ invite-only sign-up
-- Supersedes 007: no more default-org fallback. The exception aborts the
-- auth.users insert, so an uninvited email never gets an account.
-- Role/org come only from the invite; HR adds people on the People page.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pending pending_members%ROWTYPE;
BEGIN
    IF lower(new.email) NOT LIKE '%@kiit.ac.in' THEN
        RAISE EXCEPTION 'Only @kiit.ac.in email addresses can register';
    END IF;

    SELECT * INTO v_pending FROM public.pending_members
    WHERE lower(email) = lower(new.email) LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'This email is not registered with KIIT HR';
    END IF;

    INSERT INTO public.users (id, org_id, name, email, role, team, points_balance, created_at)
    VALUES (
        new.id,
        v_pending.org_id,
        COALESCE(NULLIF(trim(new.raw_user_meta_data->>'full_name'), ''), v_pending.name),
        new.email,
        v_pending.role,
        v_pending.team,
        500,
        now()
    )
    ON CONFLICT (id) DO NOTHING;

    DELETE FROM public.pending_members WHERE id = v_pending.id;

    RETURN new;
END;
$$;

-- Self-service "create an org and become its admin" no longer applies:
-- HR is assigned through invites only.
REVOKE EXECUTE ON FUNCTION public.register_admin_organization(TEXT, TEXT) FROM authenticated;

-- ------------------------------------------------------------ first invites
INSERT INTO pending_members (org_id, name, email, role) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'chandani.kumarifcs', 'chandani.kumarifcs@kiit.ac.in', 'admin'),
    ('a0000000-0000-0000-0000-000000000001', '2305226',  '2305226@kiit.ac.in',  'recipient'),
    ('a0000000-0000-0000-0000-000000000001', '2305313',  '2305313@kiit.ac.in',  'recipient'),
    ('a0000000-0000-0000-0000-000000000001', '2305317',  '2305317@kiit.ac.in',  'recipient'),
    ('a0000000-0000-0000-0000-000000000001', '23052054', '23052054@kiit.ac.in', 'recipient'),
    ('a0000000-0000-0000-0000-000000000001', '23052078', '23052078@kiit.ac.in', 'recipient'),
    ('a0000000-0000-0000-0000-000000000001', '2305747',  '2305747@kiit.ac.in',  'recipient')
ON CONFLICT (org_id, email) DO NOTHING;

-- ------------------------------------------------------------ "Thank You !" copy
CREATE OR REPLACE FUNCTION public.notify_kudos_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sender_name TEXT;
BEGIN
    SELECT name INTO v_sender_name FROM users WHERE id = NEW.from_user_id;

    INSERT INTO notifications (user_id, type, title, body)
    VALUES (
        NEW.to_user_id,
        'kudos_received',
        COALESCE(v_sender_name, 'A colleague') || ' sent you a Thank You !',
        NEW.message
    );

    RETURN NEW;
END;
$$;

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

UPDATE badges SET name = 'First Thank You !', description = 'Sent your first Thank You ! to a colleague'
WHERE key = 'first_kudos_sent';
UPDATE badges SET description = 'Sent 5 Thank You ! notes to colleagues'
WHERE key = 'team_player';

-- ------------------------------------------------------------ Indian catalog
UPDATE catalog_items SET name = 'Amazon Pay Gift Card (₹500)', description = 'A ₹500 Amazon Pay gift card.'
WHERE id = 'e0000000-0000-0000-0000-000000000001';
UPDATE catalog_items SET name = 'Café Coffee Day Voucher (₹200)', description = 'Coffee and snacks at any CCD outlet.'
WHERE id = 'e0000000-0000-0000-0000-000000000002';
UPDATE catalog_items SET name = 'KIIT University Hoodie', description = 'Official KIIT University hoodie.'
WHERE id = 'e0000000-0000-0000-0000-000000000003';
UPDATE catalog_items SET name = 'boAt Wireless Earbuds', description = 'boAt Bluetooth earbuds.'
WHERE id = 'e0000000-0000-0000-0000-000000000004';
UPDATE catalog_items SET name = 'Ayurvedic Spa Voucher', description = 'A full-day Ayurvedic spa session.'
WHERE id = 'e0000000-0000-0000-0000-000000000005';
UPDATE catalog_items SET name = 'PVR Movie Night for Two', description = 'Two PVR tickets with popcorn.'
WHERE id = 'e0000000-0000-0000-0000-000000000006';
UPDATE catalog_items SET name = 'Zomato Voucher (₹300)', description = '₹300 food delivery credit.'
WHERE id = 'e0000000-0000-0000-0000-000000000007';
UPDATE catalog_items SET name = 'Extra Leave Day', description = 'One additional paid leave day.'
WHERE id = 'e0000000-0000-0000-0000-000000000008';

-- ------------------------------------------------------------ remove demo accounts
-- auth.users -> public.users -> transactions/redemptions/kudos/community all cascade.
DELETE FROM auth.users WHERE email ILIKE '%@acme.com' OR email = 'emp@gmail.com';
DELETE FROM public.users WHERE email ILIKE '%@acme.com' OR email = 'emp@gmail.com';
