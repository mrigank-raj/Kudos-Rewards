-- ============================================================
-- points_logic_tests.sql
-- Ledger and points rules from migration 021. Same conventions as the
-- other test files: one transaction, rolled back; raise on failure,
-- NOTICE 'PASS ...' on success.
-- ============================================================

BEGIN;

CREATE TEMP TABLE p_ids (k TEXT PRIMARY KEY, id UUID NOT NULL);
GRANT SELECT ON p_ids TO authenticated;
INSERT INTO p_ids VALUES
    ('org', gen_random_uuid()), ('hr', gen_random_uuid()),
    ('a', gen_random_uuid()), ('b', gen_random_uuid()), ('item', gen_random_uuid());

CREATE FUNCTION pg_temp.pid(p_key TEXT) RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT id FROM p_ids WHERE k = p_key
$$;
GRANT EXECUTE ON FUNCTION pg_temp.pid(TEXT) TO authenticated;

CREATE FUNCTION pg_temp.as_p(p_key TEXT) RETURNS void LANGUAGE sql AS $$
    SELECT set_config('request.jwt.claims',
        json_build_object('sub', (SELECT id FROM p_ids WHERE k = p_key), 'role', 'authenticated')::text, true);
    SELECT set_config('request.jwt.claim.sub', (SELECT id FROM p_ids WHERE k = p_key)::text, true);
$$;
GRANT EXECUTE ON FUNCTION pg_temp.as_p(TEXT) TO authenticated;

INSERT INTO organizations (id, name) VALUES (pg_temp.pid('org'), 'Points Test Org');
INSERT INTO catalog_items (id, name, points_cost, category) VALUES (pg_temp.pid('item'), 'Test Mug', 100, 'merchandise');
INSERT INTO pending_members (org_id, name, email, role) VALUES
    (pg_temp.pid('org'), 'HR', 'p.hr@kiit.ac.in', 'admin'),
    (pg_temp.pid('org'), 'A', 'p.a@kiit.ac.in', 'recipient'),
    (pg_temp.pid('org'), 'B', 'p.b@kiit.ac.in', 'recipient');
INSERT INTO auth.users (id, email) VALUES
    (pg_temp.pid('hr'), 'p.hr@kiit.ac.in'), (pg_temp.pid('a'), 'p.a@kiit.ac.in'), (pg_temp.pid('b'), 'p.b@kiit.ac.in');

DO $$
BEGIN
    IF (SELECT points_balance FROM users WHERE id = pg_temp.pid('a')) <> 500
       OR (SELECT COALESCE(sum(points), 0) FROM transactions WHERE user_id = pg_temp.pid('a') AND type = 'welcome') <> 500 THEN
        RAISE EXCEPTION 'FAIL: welcome points not in the ledger';
    END IF;
    IF (SELECT issued FROM get_points_summary(pg_temp.pid('org'))) <> 0 THEN
        RAISE EXCEPTION 'FAIL: welcome points counted as issued';
    END IF;
    RAISE NOTICE 'PASS sign-up writes 500 welcome points to the ledger, not counted as issued';
END $$;

SELECT pg_temp.as_p('a'); SET LOCAL ROLE authenticated;
DO $$
BEGIN
    BEGIN
        PERFORM send_kudos(pg_temp.pid('a'), pg_temp.pid('b'), ' . ', 0, '{}');
        RAISE EXCEPTION 'FAIL: 1-character Thank You accepted';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM NOT LIKE '%at least 3 characters%' THEN RAISE; END IF;
    END;
    PERFORM send_kudos(pg_temp.pid('a'), pg_temp.pid('b'), 'Thanks for covering my class', 1, '{}');
    PERFORM redeem_reward(pg_temp.pid('a'), pg_temp.pid('item'));
    RAISE NOTICE 'PASS Thank You messages need at least 3 characters';
END $$;
RESET ROLE;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM transactions WHERE user_id = pg_temp.pid('a') AND type = 'thank_you' AND points = -1)
       OR NOT EXISTS (SELECT 1 FROM transactions WHERE user_id = pg_temp.pid('b') AND type = 'earn' AND points = 1) THEN
        RAISE EXCEPTION 'FAIL: Thank You ledger types';
    END IF;
    IF EXISTS (SELECT 1 FROM user_badges ub JOIN badges bd ON bd.id = ub.badge_id JOIN users u ON u.id = ub.user_id WHERE bd.key = 'top_earner' AND u.org_id = pg_temp.pid('org')) THEN
        RAISE EXCEPTION 'FAIL: Top Earner for 1 point';
    END IF;
    IF (SELECT issued FROM get_points_summary(pg_temp.pid('org'))) <> 0 THEN
        RAISE EXCEPTION 'FAIL: peer Thank You counted as issued';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = pg_temp.pid('hr') AND type = 'redemption_status' AND link = '/redemptions') THEN
        RAISE EXCEPTION 'FAIL: HR not told about the reward request';
    END IF;
    RAISE NOTICE 'PASS Thank You is thank_you/earn, not issued; no Top Earner for 1 point; HR told of requests';
END $$;

SELECT pg_temp.as_p('hr'); SET LOCAL ROLE authenticated;
DO $$
BEGIN
    PERFORM update_redemption_status((SELECT id FROM redemptions WHERE user_id = pg_temp.pid('a')), 'cancelled');
    PERFORM credit_points(pg_temp.pid('b'), 1000, 'Teaching Excellence');
END $$;
RESET ROLE;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = pg_temp.pid('a') AND type = 'redemption_status' AND title LIKE 'Reward request cancelled%') THEN
        RAISE EXCEPTION 'FAIL: employee not told about the cancelled request';
    END IF;
    IF (SELECT issued FROM get_points_summary(pg_temp.pid('org'))) <> 1000 THEN
        RAISE EXCEPTION 'FAIL: HR credit not counted as issued';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM user_badges ub JOIN badges bd ON bd.id = ub.badge_id
                   WHERE bd.key = 'top_earner' AND ub.user_id = pg_temp.pid('b')) THEN
        RAISE EXCEPTION 'FAIL: clear #1 with 1,000+ earned did not get Top Earner';
    END IF;
    RAISE NOTICE 'PASS employee notified on cancel; HR credits are issued; Top Earner needs a clear 1,000+';
END $$;

SELECT pg_temp.as_p('a'); SET LOCAL ROLE authenticated;
DO $$
BEGIN
    BEGIN
        PERFORM set_member_department(pg_temp.pid('a'), 'CSE');
        RAISE EXCEPTION 'FAIL: employee set a department';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
END $$;
RESET ROLE;

SELECT pg_temp.as_p('hr'); SET LOCAL ROLE authenticated;
DO $$ BEGIN PERFORM set_member_department(pg_temp.pid('a'), '  School of Computer Engineering '); END $$;
RESET ROLE;

DO $$
BEGIN
    IF (SELECT team FROM users WHERE id = pg_temp.pid('a')) <> 'School of Computer Engineering' THEN
        RAISE EXCEPTION 'FAIL: HR could not set department';
    END IF;
    RAISE NOTICE 'PASS only HR sets departments (trimmed)';
END $$;

DO $$ BEGIN RAISE NOTICE 'ALL POINTS LOGIC TESTS PASSED'; END $$;
ROLLBACK;
