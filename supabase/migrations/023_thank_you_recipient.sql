-- ============================================================
-- 023_thank_you_recipient.sql
-- The sender's ledger row now names who the Thank You ! went to
-- ("Thank You ! to Akasa Patri"), matching the receiver's
-- "Thank You ! from ...". Existing rows are back-filled.
-- ============================================================

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
    v_receiver_name TEXT;
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

    SELECT name INTO v_receiver_name FROM users
    WHERE id = p_to_user_id AND org_id = v_sender_org AND removed_at IS NULL FOR UPDATE;
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
        VALUES (p_from_user_id, 'thank_you', -p_points, 'Thank You ! to ' || v_receiver_name);

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

-- Back-fill: the kudos row and the sender's ledger row are written in the
-- same transaction, so they share created_at (now()).
UPDATE transactions t
SET reason = 'Thank You ! to ' || r.name
FROM kudos k
JOIN users r ON r.id = k.to_user_id
WHERE t.type = 'thank_you'
  AND t.reason = 'Sent a Thank You !'
  AND k.from_user_id = t.user_id
  AND k.points_included = -t.points
  AND k.created_at = t.created_at;
