-- ============================================================
-- 003_rpc_functions.sql
-- Kudos R&R Platform — Atomic Database Functions
-- ============================================================

-- ============================================================
-- credit_points: Atomically credit points to a user
-- ============================================================
CREATE OR REPLACE FUNCTION credit_points(
    p_user_id UUID,
    p_points INTEGER,
    p_reason TEXT,
    p_program_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_new_balance INTEGER;
BEGIN
    -- Validate inputs
    IF p_points <= 0 THEN
        RAISE EXCEPTION 'Points must be greater than 0';
    END IF;

    IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
        RAISE EXCEPTION 'Reason is required';
    END IF;

    -- Insert transaction record
    INSERT INTO transactions (user_id, type, points, reason, program_id)
    VALUES (p_user_id, 'manual_credit', p_points, p_reason, p_program_id);

    -- Update user balance atomically
    UPDATE users
    SET points_balance = points_balance + p_points
    WHERE id = p_user_id
    RETURNING points_balance INTO v_new_balance;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    RETURN json_build_object(
        'success', true,
        'new_balance', v_new_balance,
        'points_credited', p_points
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- debit_points: Atomically debit points from a user
-- ============================================================
CREATE OR REPLACE FUNCTION debit_points(
    p_user_id UUID,
    p_points INTEGER,
    p_reason TEXT
)
RETURNS JSON AS $$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- Validate inputs
    IF p_points <= 0 THEN
        RAISE EXCEPTION 'Points must be greater than 0';
    END IF;

    IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
        RAISE EXCEPTION 'Reason is required';
    END IF;

    -- Check current balance
    SELECT points_balance INTO v_current_balance
    FROM users WHERE id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    IF v_current_balance < p_points THEN
        RAISE EXCEPTION 'Insufficient balance. Current balance: %', v_current_balance;
    END IF;

    -- Insert transaction record
    INSERT INTO transactions (user_id, type, points, reason)
    VALUES (p_user_id, 'manual_debit', -p_points, p_reason);

    -- Update user balance atomically
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- redeem_reward: Atomically redeem a catalog item
-- ============================================================
CREATE OR REPLACE FUNCTION redeem_reward(
    p_user_id UUID,
    p_catalog_item_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_points_cost INTEGER;
    v_item_name TEXT;
    v_current_balance INTEGER;
    v_new_balance INTEGER;
    v_redemption_id UUID;
BEGIN
    -- Get catalog item details
    SELECT points_cost, name INTO v_points_cost, v_item_name
    FROM catalog_items WHERE id = p_catalog_item_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Catalog item not found';
    END IF;

    -- Check user balance
    SELECT points_balance INTO v_current_balance
    FROM users WHERE id = p_user_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    IF v_current_balance < v_points_cost THEN
        RAISE EXCEPTION 'Insufficient points. Need %, have %', v_points_cost, v_current_balance;
    END IF;

    -- Create redemption record
    INSERT INTO redemptions (user_id, catalog_item_id, points_spent, status)
    VALUES (p_user_id, p_catalog_item_id, v_points_cost, 'pending')
    RETURNING id INTO v_redemption_id;

    -- Create transaction record
    INSERT INTO transactions (user_id, type, points, reason)
    VALUES (p_user_id, 'redeem', -v_points_cost, 'Redeemed: ' || v_item_name);

    -- Update balance
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- get_points_summary: Monthly points issued vs redeemed
-- ============================================================
CREATE OR REPLACE FUNCTION get_points_summary(p_org_id UUID)
RETURNS TABLE(month TEXT, issued BIGINT, redeemed BIGINT) AS $$
    SELECT
        to_char(t.created_at, 'YYYY-MM') AS month,
        COALESCE(SUM(CASE WHEN t.type IN ('earn', 'manual_credit') THEN t.points ELSE 0 END), 0) AS issued,
        COALESCE(SUM(CASE WHEN t.type = 'redeem' THEN ABS(t.points) ELSE 0 END), 0) AS redeemed
    FROM transactions t
    JOIN users u ON t.user_id = u.id
    WHERE u.org_id = p_org_id
    GROUP BY to_char(t.created_at, 'YYYY-MM')
    ORDER BY month;
$$ LANGUAGE sql STABLE;

-- ============================================================
-- get_top_recipients: Leaderboard by total points earned
-- ============================================================
CREATE OR REPLACE FUNCTION get_top_recipients(p_org_id UUID, p_limit INT DEFAULT 10)
RETURNS TABLE(user_id UUID, user_name TEXT, user_email TEXT, avatar_url TEXT, total_earned BIGINT) AS $$
    SELECT
        u.id AS user_id,
        u.name AS user_name,
        u.email AS user_email,
        u.avatar_url,
        COALESCE(SUM(CASE WHEN t.type IN ('earn', 'manual_credit') THEN t.points ELSE 0 END), 0) AS total_earned
    FROM users u
    LEFT JOIN transactions t ON t.user_id = u.id
    WHERE u.org_id = p_org_id AND u.role = 'recipient'
    GROUP BY u.id, u.name, u.email, u.avatar_url
    ORDER BY total_earned DESC
    LIMIT p_limit;
$$ LANGUAGE sql STABLE;

-- ============================================================
-- get_program_breakdown: Points distribution per program
-- ============================================================
CREATE OR REPLACE FUNCTION get_program_breakdown(p_org_id UUID)
RETURNS TABLE(program_id UUID, program_name TEXT, total_points BIGINT, transaction_count BIGINT) AS $$
    SELECT
        rp.id AS program_id,
        rp.name AS program_name,
        COALESCE(SUM(CASE WHEN t.type IN ('earn', 'manual_credit') THEN t.points ELSE 0 END), 0) AS total_points,
        COUNT(t.id) AS transaction_count
    FROM reward_programs rp
    LEFT JOIN transactions t ON t.program_id = rp.id
    WHERE rp.org_id = p_org_id AND rp.is_active = true
    GROUP BY rp.id, rp.name
    ORDER BY total_points DESC;
$$ LANGUAGE sql STABLE;
