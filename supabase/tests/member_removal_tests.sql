-- ============================================================
-- member_removal_tests.sql
-- Invite-only sign-up (018) and member removal / reward refunds (019).
-- Same conventions as community_security_tests.sql: one transaction,
-- rolled back; each check raises on failure and NOTICEs 'PASS ...'.
-- ============================================================

BEGIN;

CREATE TEMP TABLE r_ids (k TEXT PRIMARY KEY, id UUID NOT NULL);
GRANT SELECT ON r_ids TO authenticated, anon;
INSERT INTO r_ids VALUES
    ('org', gen_random_uuid()), ('hr1', gen_random_uuid()), ('hr2', gen_random_uuid()),
    ('emp1', gen_random_uuid()), ('emp2', gen_random_uuid()), ('item', gen_random_uuid());

CREATE TEMP TABLE r_state (k TEXT PRIMARY KEY, id UUID);
GRANT SELECT, INSERT ON r_state TO authenticated;

CREATE FUNCTION pg_temp.as_user(p_key TEXT) RETURNS void LANGUAGE sql AS $$
    SELECT set_config('request.jwt.claims',
        json_build_object('sub', (SELECT id FROM r_ids WHERE k = p_key), 'role', 'authenticated')::text, true);
    SELECT set_config('request.jwt.claim.sub', (SELECT id FROM r_ids WHERE k = p_key)::text, true);
$$;
GRANT EXECUTE ON FUNCTION pg_temp.as_user(TEXT) TO authenticated;

CREATE FUNCTION pg_temp.rid(p_key TEXT) RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT id FROM r_ids WHERE k = p_key
$$;
GRANT EXECUTE ON FUNCTION pg_temp.rid(TEXT) TO authenticated;

INSERT INTO organizations (id, name) VALUES (pg_temp.rid('org'), 'Removal Test Org');
INSERT INTO catalog_items (id, name, points_cost, category) VALUES (pg_temp.rid('item'), 'Test Hoodie', 200, 'merchandise');

-- ============================================================ invite-only sign-up
DO $$
BEGIN
    BEGIN
        INSERT INTO auth.users (id, email) VALUES (gen_random_uuid(), 'someone@gmail.com');
        RAISE EXCEPTION 'FAIL: non-KIIT sign-up accepted';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM LIKE 'FAIL%' THEN RAISE; END IF;
    END;
    BEGIN
        INSERT INTO auth.users (id, email) VALUES (gen_random_uuid(), 'not.invited@kiit.ac.in');
        RAISE EXCEPTION 'FAIL: uninvited sign-up accepted';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM LIKE 'FAIL%' THEN RAISE; END IF;
    END;
    RAISE NOTICE 'PASS sign-up rejects non-KIIT and uninvited emails';

    -- Invites are normalised: upper-case input is stored lower-case.
    INSERT INTO pending_members (org_id, name, email, role) VALUES
        (pg_temp.rid('org'), 'HR One',   '  HR1@KIIT.AC.IN ', 'admin'),
        (pg_temp.rid('org'), 'HR Two',   'hr2@kiit.ac.in',    'admin'),
        (pg_temp.rid('org'), 'Emp One',  'emp1@kiit.ac.in',   'recipient'),
        (pg_temp.rid('org'), 'Emp Two',  'emp2@kiit.ac.in',   'recipient');
    IF NOT EXISTS (SELECT 1 FROM pending_members WHERE email = 'hr1@kiit.ac.in') THEN
        RAISE EXCEPTION 'FAIL: invite email not normalised';
    END IF;
    BEGIN
        INSERT INTO pending_members (org_id, name, email, role) VALUES (pg_temp.rid('org'), 'X', 'x@gmail.com', 'recipient');
        RAISE EXCEPTION 'FAIL: non-KIIT invite accepted';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM LIKE 'FAIL%' THEN RAISE; END IF;
    END;
    RAISE NOTICE 'PASS invites are lower-cased and KIIT-only';

    INSERT INTO auth.users (id, email)
    SELECT id, k || '@kiit.ac.in' FROM r_ids WHERE k IN ('hr1', 'hr2', 'emp1', 'emp2');

    IF (SELECT role FROM users WHERE id = pg_temp.rid('hr1')) <> 'admin'
       OR (SELECT role FROM users WHERE id = pg_temp.rid('emp1')) <> 'recipient'
       OR (SELECT org_id FROM users WHERE id = pg_temp.rid('emp1')) <> pg_temp.rid('org')
       OR (SELECT points_balance FROM users WHERE id = pg_temp.rid('emp1')) <> 500 THEN
        RAISE EXCEPTION 'FAIL: invite role/org/points not applied';
    END IF;
    IF EXISTS (SELECT 1 FROM pending_members WHERE org_id = pg_temp.rid('org')) THEN
        RAISE EXCEPTION 'FAIL: used invites not consumed';
    END IF;
    RAISE NOTICE 'PASS invited sign-up gets role, org and 500 points from the invite';

    BEGIN
        INSERT INTO pending_members (org_id, name, email, role) VALUES (pg_temp.rid('org'), 'Dup', 'EMP1@kiit.ac.in', 'recipient');
        RAISE EXCEPTION 'FAIL: invite for existing account accepted';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM NOT LIKE '%already has an account%' THEN RAISE; END IF;
    END;
    RAISE NOTICE 'PASS cannot invite an email that already has an account';
END $$;

-- ============================================================ Thank You ! between HR and employees
SELECT pg_temp.as_user('emp1'); SET LOCAL ROLE authenticated;
DO $$
BEGIN
    PERFORM send_kudos(pg_temp.rid('emp1'), pg_temp.rid('hr1'), 'Thanks HR', 50, '{}');
    -- Conversation with emp2 exists before emp1 leaves.
    INSERT INTO r_state VALUES ('conv', community_start_conversation(pg_temp.rid('emp2')));
    PERFORM redeem_reward(pg_temp.rid('emp1'), pg_temp.rid('item'));
    BEGIN
        UPDATE users SET removed_at = now() WHERE id = pg_temp.rid('emp1');
        RAISE EXCEPTION 'FAIL: client changed removed_at';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    RAISE NOTICE 'PASS employee can thank HR; removed_at is server-only';
END $$;
RESET ROLE;

SELECT pg_temp.as_user('hr1'); SET LOCAL ROLE authenticated;
DO $$
BEGIN
    PERFORM send_kudos(pg_temp.rid('hr1'), pg_temp.rid('hr2'), 'Thanks colleague', 30, '{}');
    BEGIN
        PERFORM redeem_reward(pg_temp.rid('hr1'), pg_temp.rid('item'));
        RAISE EXCEPTION 'FAIL: HR redeemed a reward';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    RAISE NOTICE 'PASS HR can thank HR; HR cannot use the reward shop';

    -- ======================================================== removal guards
    BEGIN
        PERFORM remove_member(pg_temp.rid('hr1'), true);
        RAISE EXCEPTION 'FAIL: HR removed themselves';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM NOT LIKE '%cannot remove yourself%' THEN RAISE; END IF;
    END;
    BEGIN
        PERFORM remove_member(pg_temp.rid('emp1'), true);
        RAISE EXCEPTION 'FAIL: removed someone with a pending reward';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM NOT LIKE '%reward request%' THEN RAISE; END IF;
    END;
    RAISE NOTICE 'PASS no self-removal; pending rewards must be handled first';

    -- ======================================================== refund on cancel
    PERFORM update_redemption_status((SELECT id FROM redemptions WHERE user_id = pg_temp.rid('emp1')), 'cancelled');
    BEGIN
        PERFORM update_redemption_status((SELECT id FROM redemptions WHERE user_id = pg_temp.rid('emp1')), 'cancelled');
        RAISE EXCEPTION 'FAIL: handled request changed again';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM NOT LIKE '%already%' THEN RAISE; END IF;
    END;
    BEGIN
        PERFORM update_redemption_status((SELECT id FROM redemptions WHERE user_id = pg_temp.rid('emp1')), 'pending');
        RAISE EXCEPTION 'FAIL: request moved back to pending';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM NOT LIKE '%Invalid status%' THEN RAISE; END IF;
    END;
END $$;
RESET ROLE;

DO $$
BEGIN
    -- 500 - 50 (thanked HR) - 200 (reward) + 200 (refund)
    IF (SELECT points_balance FROM users WHERE id = pg_temp.rid('emp1')) <> 450 THEN
        RAISE EXCEPTION 'FAIL: refund wrong, balance %', (SELECT points_balance FROM users WHERE id = pg_temp.rid('emp1'));
    END IF;
    IF (SELECT redeemed FROM get_points_summary(pg_temp.rid('org'))) <> 0 THEN
        RAISE EXCEPTION 'FAIL: refunded reward still counted as redeemed';
    END IF;
    RAISE NOTICE 'PASS cancel refunds once, is final, and nets out of redeemed stats';
END $$;

-- ============================================================ removal
INSERT INTO auth.sessions (user_id) VALUES (pg_temp.rid('emp1'));

SELECT pg_temp.as_user('emp2'); SET LOCAL ROLE authenticated;
DO $$
BEGIN
    BEGIN
        PERFORM remove_member(pg_temp.rid('emp1'), true);
        RAISE EXCEPTION 'FAIL: employee removed someone';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    RAISE NOTICE 'PASS only HR can remove people';
END $$;
RESET ROLE;

SELECT pg_temp.as_user('hr1'); SET LOCAL ROLE authenticated;
DO $$
DECLARE v_res JSON;
BEGIN
    v_res := remove_member(pg_temp.rid('emp1'), true);
    IF (v_res->>'points_revoked')::int <> 450 THEN RAISE EXCEPTION 'FAIL: revoked %', v_res; END IF;
    BEGIN
        PERFORM remove_member(pg_temp.rid('emp1'), true);
        RAISE EXCEPTION 'FAIL: removed twice';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM NOT LIKE '%already been removed%' THEN RAISE; END IF;
    END;
    BEGIN
        PERFORM credit_points(pg_temp.rid('emp1'), 10, 'late bonus');
        RAISE EXCEPTION 'FAIL: credited a removed person';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM NOT LIKE '%no longer at KIIT%' THEN RAISE; END IF;
    END;
    -- Keep-points option: hr2 leaves with their balance frozen.
    v_res := remove_member(pg_temp.rid('hr2'), false);
    IF (v_res->>'points_revoked')::int <> 0 THEN RAISE EXCEPTION 'FAIL: keep option revoked points'; END IF;
    RAISE NOTICE 'PASS remove with revoke, remove keeping points, no double removal, no credits after';
END $$;
RESET ROLE;

DO $$
BEGIN
    IF (SELECT points_balance FROM users WHERE id = pg_temp.rid('emp1')) <> 0
       OR NOT EXISTS (SELECT 1 FROM transactions WHERE user_id = pg_temp.rid('emp1') AND reason = 'Points revoked on leaving' AND points = -450) THEN
        RAISE EXCEPTION 'FAIL: revoke not recorded';
    END IF;
    IF (SELECT points_balance FROM users WHERE id = pg_temp.rid('hr2')) <> 530 THEN
        RAISE EXCEPTION 'FAIL: kept points changed';
    END IF;
    IF (SELECT role FROM users WHERE id = pg_temp.rid('hr2')) <> 'recipient' THEN
        RAISE EXCEPTION 'FAIL: removed HR kept admin role';
    END IF;
    IF (SELECT banned_until FROM auth.users WHERE id = pg_temp.rid('emp1')) < now() + INTERVAL '50 years'
       OR EXISTS (SELECT 1 FROM auth.sessions WHERE user_id = pg_temp.rid('emp1')) THEN
        RAISE EXCEPTION 'FAIL: login not blocked';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM kudos WHERE from_user_id = pg_temp.rid('emp1')) THEN
        RAISE EXCEPTION 'FAIL: history deleted';
    END IF;
    RAISE NOTICE 'PASS ledger, frozen points, demotion, login ban and history all correct';
END $$;

-- hr2 was removed while holding a valid token: no HR powers left.
SELECT pg_temp.as_user('hr2'); SET LOCAL ROLE authenticated;
DO $$
BEGIN
    BEGIN
        PERFORM remove_member(pg_temp.rid('emp2'), true);
        RAISE EXCEPTION 'FAIL: removed HR still removing people';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    RAISE NOTICE 'PASS a removed HR loses HR powers immediately';
END $$;
RESET ROLE;

-- The removed employee, still holding a token, can't do anything.
SELECT pg_temp.as_user('emp1'); SET LOCAL ROLE authenticated;
DO $$
BEGIN
    IF get_user_org() IS NOT NULL THEN RAISE EXCEPTION 'FAIL: removed user still has an org'; END IF;
    IF EXISTS (SELECT 1 FROM users WHERE id <> pg_temp.rid('emp1')) THEN
        RAISE EXCEPTION 'FAIL: removed user can still see colleagues';
    END IF;
    IF EXISTS (SELECT 1 FROM community_messages WHERE conversation_id = (SELECT id FROM r_state WHERE k = 'conv'))
       OR community_is_participant((SELECT id FROM r_state WHERE k = 'conv')) THEN
        RAISE EXCEPTION 'FAIL: removed user can still read messages';
    END IF;
    BEGIN
        PERFORM send_kudos(pg_temp.rid('emp1'), pg_temp.rid('emp2'), 'one last thing', 0, '{}');
        RAISE EXCEPTION 'FAIL: removed user sent a Thank You';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        PERFORM redeem_reward(pg_temp.rid('emp1'), pg_temp.rid('item'));
        RAISE EXCEPTION 'FAIL: removed user redeemed';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    RAISE NOTICE 'PASS removed user with a live token is locked out';
END $$;
RESET ROLE;

-- Colleagues can't reach the removed person; they vanish from lists.
SELECT pg_temp.as_user('emp2'); SET LOCAL ROLE authenticated;
DO $$
BEGIN
    BEGIN
        PERFORM send_kudos(pg_temp.rid('emp2'), pg_temp.rid('emp1'), 'bye', 10, '{}');
        RAISE EXCEPTION 'FAIL: thanked a removed person';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM NOT LIKE '%no longer at KIIT%' THEN RAISE; END IF;
    END;
    BEGIN
        INSERT INTO community_messages (conversation_id, body) VALUES ((SELECT id FROM r_state WHERE k = 'conv'), 'still there?');
        RAISE EXCEPTION 'FAIL: messaged a removed person';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM NOT LIKE '%no longer at KIIT%' THEN RAISE; END IF;
    END;
    BEGIN
        PERFORM community_start_conversation(pg_temp.rid('emp1'));
        RAISE EXCEPTION 'FAIL: new chat with a removed person';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    IF EXISTS (SELECT 1 FROM community_directory(NULL, NULL, NULL, pg_temp.rid('emp1'), 24, 0))
       OR EXISTS (SELECT 1 FROM get_top_recipients(pg_temp.rid('org'), 10) WHERE user_id = pg_temp.rid('emp1')) THEN
        RAISE EXCEPTION 'FAIL: removed person still listed';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM kudos WHERE from_user_id = pg_temp.rid('emp1')) THEN
        RAISE EXCEPTION 'FAIL: colleagues lost the removed person''s past notes';
    END IF;
    RAISE NOTICE 'PASS removed person is unreachable and unlisted, past notes stay visible';
END $$;
RESET ROLE;

DO $$
BEGIN
    BEGIN
        INSERT INTO pending_members (org_id, name, email, role) VALUES (pg_temp.rid('org'), 'Back again', 'emp1@kiit.ac.in', 'recipient');
        RAISE EXCEPTION 'FAIL: re-invited a removed person';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM NOT LIKE '%removed earlier%' THEN RAISE; END IF;
    END;
    RAISE NOTICE 'PASS removed person cannot be re-invited through the list';
END $$;

-- HR can remove another HR, and the last HR can never be removed:
-- a new HR (hr3) removes hr1, leaving hr3 as the only HR.
DO $$
DECLARE v_hr3 UUID := gen_random_uuid();
BEGIN
    INSERT INTO pending_members (org_id, name, email, role) VALUES (pg_temp.rid('org'), 'HR Three', 'hr3@kiit.ac.in', 'admin');
    INSERT INTO auth.users (id, email) VALUES (v_hr3, 'hr3@kiit.ac.in');
    INSERT INTO r_ids VALUES ('hr3', v_hr3);
END $$;

SELECT pg_temp.as_user('hr3'); SET LOCAL ROLE authenticated;
DO $$
BEGIN
    PERFORM remove_member(pg_temp.rid('hr1'), false);
    IF (SELECT count(*) FROM users WHERE org_id = pg_temp.rid('org') AND role = 'admin' AND removed_at IS NULL) <> 1 THEN
        RAISE EXCEPTION 'FAIL: HR count after removal';
    END IF;
    BEGIN
        PERFORM remove_member(pg_temp.rid('hr3'), false);
        RAISE EXCEPTION 'FAIL: last HR removed';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM LIKE 'FAIL%' THEN RAISE; END IF;
    END;
    RAISE NOTICE 'PASS HR can remove another HR; the last HR always remains';
END $$;
RESET ROLE;

DO $$ BEGIN RAISE NOTICE 'ALL MEMBER REMOVAL TESTS PASSED'; END $$;
ROLLBACK;
