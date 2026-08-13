-- ============================================================
-- 006_send_kudos_rpc.sql
-- Kudos R&R Platform — Peer-to-Peer Kudos Function
-- ============================================================

CREATE OR REPLACE FUNCTION send_kudos(
    p_from_user_id UUID,
    p_to_user_id UUID,
    p_message TEXT,
    p_points INTEGER
)
RETURNS JSON AS $$
DECLARE
    v_sender_balance INTEGER;
    v_receiver_balance INTEGER;
    v_kudos_id UUID;
    v_sender_name TEXT;
BEGIN
    -- 1. Validate inputs
    IF p_from_user_id = p_to_user_id THEN
        RAISE EXCEPTION 'You cannot send kudos to yourself.';
    END IF;

    IF p_points < 0 THEN
        RAISE EXCEPTION 'Points must be 0 or greater.';
    END IF;

    IF p_message IS NULL OR TRIM(p_message) = '' THEN
        RAISE EXCEPTION 'A message is required.';
    END IF;

    -- 2. Validate sender balance if points > 0
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

    -- 3. Verify receiver exists
    PERFORM id FROM users WHERE id = p_to_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Receiver not found.';
    END IF;

    -- 4. Get sender name for the transaction reason
    SELECT name INTO v_sender_name FROM users WHERE id = p_from_user_id;

    -- 5. Create Kudos record
    INSERT INTO kudos (from_user_id, to_user_id, message, points_included)
    VALUES (p_from_user_id, p_to_user_id, p_message, p_points)
    RETURNING id INTO v_kudos_id;

    -- 6. Process point transfer if applicable
    IF p_points > 0 THEN
        -- Deduct from sender
        UPDATE users
        SET points_balance = points_balance - p_points
        WHERE id = p_from_user_id
        RETURNING points_balance INTO v_sender_balance;

        INSERT INTO transactions (user_id, type, points, reason)
        VALUES (p_from_user_id, 'manual_debit', -p_points, 'Sent Kudos');

        -- Add to receiver
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
