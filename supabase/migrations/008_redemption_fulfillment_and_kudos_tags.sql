-- ============================================================
-- 008_redemption_fulfillment_and_kudos_tags.sql
-- Kudos R&R Platform — Redemption fulfillment queue + core-values tagging
-- ============================================================

-- ------------------------------------------------------------ leaderboard: include team
-- get_top_recipients already existed (003_rpc_functions.sql) but didn't
-- return team, so every consumer (Analytics, the new Leaderboard page)
-- had to fake it as the literal string "Team".
CREATE OR REPLACE FUNCTION get_top_recipients(p_org_id UUID, p_limit INT DEFAULT 10)
RETURNS TABLE(user_id UUID, user_name TEXT, user_email TEXT, avatar_url TEXT, team TEXT, total_earned BIGINT) AS $$
    SELECT
        u.id AS user_id,
        u.name AS user_name,
        u.email AS user_email,
        u.avatar_url,
        u.team,
        COALESCE(SUM(CASE WHEN t.type IN ('earn', 'manual_credit') THEN t.points ELSE 0 END), 0) AS total_earned
    FROM users u
    LEFT JOIN transactions t ON t.user_id = u.id
    WHERE u.org_id = p_org_id AND u.role = 'recipient'
    GROUP BY u.id, u.name, u.email, u.avatar_url, u.team
    ORDER BY total_earned DESC
    LIMIT p_limit;
$$ LANGUAGE sql STABLE;

-- ------------------------------------------------------------ redemption fulfillment
-- Redemptions already had a status column (pending/fulfilled/cancelled)
-- but nothing could ever move a row out of "pending" — there was no
-- admin UPDATE policy and no RPC for it.
CREATE POLICY "Admins update org redemptions"
    ON redemptions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
            AND u.org_id = (SELECT org_id FROM users WHERE id = redemptions.user_id)
        )
    );

CREATE OR REPLACE FUNCTION update_redemption_status(
    p_redemption_id UUID,
    p_status TEXT
)
RETURNS JSON AS $$
DECLARE
    v_admin_org UUID;
    v_redemption_org UUID;
BEGIN
    IF p_status NOT IN ('fulfilled', 'cancelled', 'pending') THEN
        RAISE EXCEPTION 'Invalid status: %', p_status;
    END IF;

    SELECT org_id INTO v_admin_org FROM users WHERE id = auth.uid() AND role = 'admin';
    IF v_admin_org IS NULL THEN
        RAISE EXCEPTION 'Only admins can update redemption status';
    END IF;

    SELECT u.org_id INTO v_redemption_org
    FROM redemptions r JOIN users u ON u.id = r.user_id
    WHERE r.id = p_redemption_id;

    IF v_redemption_org IS NULL OR v_redemption_org != v_admin_org THEN
        RAISE EXCEPTION 'Redemption not found in your organization';
    END IF;

    UPDATE redemptions SET status = p_status WHERE id = p_redemption_id;

    RETURN json_build_object('success', true, 'redemption_id', p_redemption_id, 'status', p_status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------ core values tagging on kudos
-- GiveKudosModal already had value-tag UI (Teamwork/Innovation/Impact/
-- Leadership) but appended them into the free-text message as a workaround
-- ("the DB schema doesn't have a tags column yet" per its own comment).
ALTER TABLE kudos ADD COLUMN tags TEXT[] DEFAULT '{}';

CREATE OR REPLACE FUNCTION send_kudos(
    p_from_user_id UUID,
    p_to_user_id UUID,
    p_message TEXT,
    p_points INTEGER,
    p_tags TEXT[] DEFAULT '{}'
)
RETURNS JSON AS $$
DECLARE
    v_sender_balance INTEGER;
    v_receiver_balance INTEGER;
    v_kudos_id UUID;
    v_sender_name TEXT;
BEGIN
    IF p_from_user_id = p_to_user_id THEN
        RAISE EXCEPTION 'You cannot send kudos to yourself.';
    END IF;

    IF p_points < 0 THEN
        RAISE EXCEPTION 'Points must be 0 or greater.';
    END IF;

    IF p_message IS NULL OR TRIM(p_message) = '' THEN
        RAISE EXCEPTION 'A message is required.';
    END IF;

    IF p_points > 0 THEN
        SELECT points_balance INTO v_sender_balance
        FROM users WHERE id = p_from_user_id FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Sender not found.';
        END IF;

        IF v_sender_balance < p_points THEN
            RAISE EXCEPTION 'Insufficient balance to send % points.', p_points;
        END IF;
    END IF;

    PERFORM id FROM users WHERE id = p_to_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Receiver not found.';
    END IF;

    SELECT name INTO v_sender_name FROM users WHERE id = p_from_user_id;

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

    RETURN json_build_object(
        'success', true,
        'kudos_id', v_kudos_id,
        'points_sent', p_points
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
