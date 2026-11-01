-- ============================================================
-- 021_points_logic.sql
-- Makes the points ledger tell the truth:
--   * the 500 starting points are a 'welcome' ledger row (they were only
--     ever written to users.points_balance, so History showed "earned 0")
--   * sending a Thank You ! is a 'thank_you' row, not an HR 'manual_debit'
--   * "issued" analytics count HR credits only, not peer transfers
--   * Top Earner needs a clear #1 with 1,000+ points earned
--   * reward requests notify HR when made and the employee when handled
--   * Thank You ! messages need at least 3 characters
-- ============================================================

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check
    CHECK (type IN ('earn', 'redeem', 'manual_credit', 'manual_debit', 'welcome', 'thank_you'));

-- ------------------------------------------------------------ welcome points in the ledger
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

    IF FOUND THEN
        INSERT INTO public.transactions (user_id, type, points, reason)
        VALUES (new.id, 'welcome', 500, 'Welcome points');
    END IF;

    DELETE FROM public.pending_members WHERE id = v_pending.id;

    RETURN new;
END;
$$;

-- Everyone who already signed up got 500 the same way; record it.
INSERT INTO transactions (user_id, type, points, reason, created_at)
SELECT u.id, 'welcome', 500, 'Welcome points', u.created_at
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM transactions t WHERE t.user_id = u.id AND t.type = 'welcome');

-- ------------------------------------------------------------ Thank You ! is its own ledger type
UPDATE transactions SET type = 'thank_you'
WHERE type = 'manual_debit' AND reason IN ('Sent a Thank You !', 'Sent Kudos');

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

    IF p_message IS NULL OR length(trim(p_message)) < 3 THEN
        RAISE EXCEPTION 'Write a short message (at least 3 characters).';
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
    VALUES (p_from_user_id, p_to_user_id, trim(p_message), p_points, COALESCE(p_tags, '{}'))
    RETURNING id INTO v_kudos_id;

    IF p_points > 0 THEN
        UPDATE users
        SET points_balance = points_balance - p_points
        WHERE id = p_from_user_id
        RETURNING points_balance INTO v_sender_balance;

        INSERT INTO transactions (user_id, type, points, reason)
        VALUES (p_from_user_id, 'thank_you', -p_points, 'Sent a Thank You !');

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

-- ------------------------------------------------------------ "issued" = HR credits only
CREATE OR REPLACE FUNCTION public.get_points_summary(p_org_id uuid)
RETURNS TABLE(month text, issued bigint, redeemed bigint)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT
        to_char(t.created_at, 'YYYY-MM') AS month,
        COALESCE(SUM(CASE WHEN t.type = 'manual_credit' THEN t.points ELSE 0 END), 0) AS issued,
        COALESCE(-SUM(CASE WHEN t.type = 'redeem' THEN t.points ELSE 0 END), 0) AS redeemed
    FROM transactions t
    JOIN users u ON t.user_id = u.id
    WHERE u.org_id = p_org_id
    GROUP BY to_char(t.created_at, 'YYYY-MM')
    ORDER BY month;
$$;

-- ------------------------------------------------------------ Top Earner: clear #1 with 1,000+ earned
CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_kudos_sent_count INT;
    v_org_id UUID;
    v_top_user_id UUID;
    v_top_total BIGINT;
    v_second_total BIGINT;
BEGIN
    SELECT COUNT(*) INTO v_kudos_sent_count FROM kudos WHERE from_user_id = p_user_id;

    IF v_kudos_sent_count >= 1 THEN
        INSERT INTO user_badges (user_id, badge_id)
        SELECT p_user_id, id FROM badges WHERE key = 'first_kudos_sent'
        ON CONFLICT (user_id, badge_id) DO NOTHING;
    END IF;

    IF v_kudos_sent_count >= 5 THEN
        INSERT INTO user_badges (user_id, badge_id)
        SELECT p_user_id, id FROM badges WHERE key = 'team_player'
        ON CONFLICT (user_id, badge_id) DO NOTHING;
    END IF;

    SELECT org_id INTO v_org_id FROM users WHERE id = p_user_id;

    WITH totals AS (
        SELECT u.id, COALESCE(SUM(t.points) FILTER (WHERE t.type IN ('earn', 'manual_credit')), 0) AS earned
        FROM users u
        LEFT JOIN transactions t ON t.user_id = u.id
        WHERE u.role = 'recipient' AND u.org_id = v_org_id AND u.removed_at IS NULL
        GROUP BY u.id
    ), ranked AS (
        SELECT id, earned, row_number() OVER (ORDER BY earned DESC, id) AS rn FROM totals
    )
    SELECT max(id::text) FILTER (WHERE rn = 1)::uuid,
           max(earned) FILTER (WHERE rn = 1),
           COALESCE(max(earned) FILTER (WHERE rn = 2), 0)
    INTO v_top_user_id, v_top_total, v_second_total
    FROM ranked;

    IF v_top_user_id = p_user_id AND v_top_total >= 1000 AND v_top_total > v_second_total THEN
        INSERT INTO user_badges (user_id, badge_id)
        SELECT p_user_id, id FROM badges WHERE key = 'top_earner'
        ON CONFLICT (user_id, badge_id) DO NOTHING;
    END IF;
END;
$$;

UPDATE badges SET description = 'Clear #1 on the leaderboard with 1,000+ points earned'
WHERE key = 'top_earner';

-- Badges handed out under the old rule (e.g. #1 with 1 point).
DELETE FROM user_badges ub
USING badges b
WHERE ub.badge_id = b.id AND b.key = 'top_earner'
  AND (SELECT COALESCE(SUM(t.points), 0) FROM transactions t
       WHERE t.user_id = ub.user_id AND t.type IN ('earn', 'manual_credit')) < 1000;

-- ------------------------------------------------------------ reward request notifications
CREATE OR REPLACE FUNCTION public.notify_redemption_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_item TEXT;
    v_name TEXT;
    v_org UUID;
BEGIN
    SELECT name INTO v_item FROM catalog_items WHERE id = NEW.catalog_item_id;
    v_item := COALESCE(v_item, 'a reward');

    IF TG_OP = 'INSERT' THEN
        SELECT name, org_id INTO v_name, v_org FROM users WHERE id = NEW.user_id;
        INSERT INTO notifications (user_id, type, title, body, link, actor_id)
        SELECT u.id, 'redemption_status',
               'New reward request: ' || v_item,
               COALESCE(v_name, 'An employee') || ' redeemed ' || NEW.points_spent || ' points.',
               '/redemptions', NEW.user_id
        FROM users u
        WHERE u.org_id = v_org AND u.role = 'admin' AND u.removed_at IS NULL;
    ELSIF OLD.status = 'pending' AND NEW.status IN ('fulfilled', 'cancelled') THEN
        INSERT INTO notifications (user_id, type, title, body, link)
        VALUES (
            NEW.user_id, 'redemption_status',
            CASE WHEN NEW.status = 'fulfilled'
                 THEN 'Your reward is approved: ' || v_item
                 ELSE 'Reward request cancelled: ' || v_item END,
            CASE WHEN NEW.status = 'fulfilled'
                 THEN 'HR will arrange delivery.'
                 ELSE 'Your ' || NEW.points_spent || ' points have been refunded.' END,
            '/catalog'
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_redemption_change ON redemptions;
CREATE TRIGGER on_redemption_change
    AFTER INSERT OR UPDATE OF status ON redemptions
    FOR EACH ROW EXECUTE FUNCTION public.notify_redemption_change();

REVOKE EXECUTE ON FUNCTION public.notify_redemption_change() FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------ HR sets a member's department
-- users.team is a protected column (011), so this goes through a definer
-- function. Empty clears it; the 1-60 character rule is the table check (020).
CREATE OR REPLACE FUNCTION public.set_member_department(p_user_id UUID, p_team TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org UUID;
BEGIN
    SELECT org_id INTO v_org FROM users WHERE id = auth.uid() AND role = 'admin' AND removed_at IS NULL;
    IF v_org IS NULL THEN
        RAISE EXCEPTION 'Only HR can set departments' USING ERRCODE = '42501';
    END IF;

    UPDATE users SET team = NULLIF(trim(p_team), '')
    WHERE id = p_user_id AND org_id = v_org AND removed_at IS NULL;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Person not found';
    END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_member_department(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_member_department(UUID, TEXT) TO authenticated;
