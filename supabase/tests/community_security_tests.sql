-- ============================================================
-- community_security_tests.sql
-- Authorization / integrity tests for migrations 011-015.
-- ============================================================
-- Run against a DEVELOPMENT database (Supabase SQL editor, psql, or the
-- local PGlite harness described in docs/community.md) AFTER applying all
-- migrations. Everything happens inside one transaction that is rolled
-- back at the end, so no test data is left behind.
--
-- Each check raises an exception on failure (aborting the run) and emits a
-- NOTICE on success. The last line printed is
--   NOTICE: ALL COMMUNITY SECURITY TESTS PASSED
-- ============================================================

BEGIN;

-- ------------------------------------------------------------ fixtures (as postgres)
CREATE TEMP TABLE t_ids (k TEXT PRIMARY KEY, id UUID NOT NULL);
GRANT SELECT ON t_ids TO authenticated, anon;

INSERT INTO t_ids VALUES
    ('orgA', gen_random_uuid()), ('orgB', gen_random_uuid()),
    ('hrA', gen_random_uuid()), ('e1', gen_random_uuid()), ('e2', gen_random_uuid()),
    ('eB', gen_random_uuid());

-- handle_new_user() defaults new signups into the demo org; make sure it
-- exists so the trigger's FK holds on an empty database.
INSERT INTO organizations (id, name) VALUES ('a0000000-0000-0000-0000-000000000001', 'Acme Corp')
ON CONFLICT (id) DO NOTHING;

INSERT INTO organizations (id, name)
SELECT id, 'Test Org ' || k FROM t_ids WHERE k IN ('orgA', 'orgB');

INSERT INTO auth.users (id, email, aud, role, instance_id)
SELECT id, k || '-' || left(id::text, 8) || '@community-test.local', 'authenticated', 'authenticated',
       '00000000-0000-0000-0000-000000000000'
FROM t_ids WHERE k IN ('hrA', 'e1', 'e2', 'eB');

-- Backdated: these represent existing employees, not fresh signups.
UPDATE users u SET org_id = (SELECT id FROM t_ids WHERE k = 'orgA'), name = t.k,
    role = CASE WHEN t.k = 'hrA' THEN 'admin' ELSE 'recipient' END, points_balance = 500,
    created_at = now() - INTERVAL '30 days'
FROM t_ids t WHERE u.id = t.id AND t.k IN ('hrA', 'e1', 'e2');
UPDATE users u SET org_id = (SELECT id FROM t_ids WHERE k = 'orgB'), name = 'eB', points_balance = 500
FROM t_ids t WHERE u.id = t.id AND t.k = 'eB';

CREATE TEMP TABLE t_state (k TEXT PRIMARY KEY, id UUID);
GRANT SELECT, INSERT, UPDATE ON t_state TO authenticated;

-- Switch identity: SELECT pg_temp.act_as('e1'); then SET LOCAL ROLE authenticated;
CREATE FUNCTION pg_temp.act_as(p_key TEXT) RETURNS void LANGUAGE sql AS $$
    SELECT set_config('request.jwt.claims',
        json_build_object('sub', (SELECT id FROM t_ids WHERE k = p_key), 'role', 'authenticated')::text, true);
    SELECT set_config('request.jwt.claim.sub', (SELECT id FROM t_ids WHERE k = p_key)::text, true);
$$;
GRANT EXECUTE ON FUNCTION pg_temp.act_as(TEXT) TO authenticated;

-- ============================================================ posts
SELECT pg_temp.act_as('e1'); SET LOCAL ROLE authenticated;
DO $$
DECLARE v_post community_posts%ROWTYPE; v_cat UUID;
BEGIN
    SELECT id INTO v_cat FROM community_categories WHERE slug = 'technical-help';
    IF v_cat IS NULL THEN RAISE EXCEPTION 'FAIL: categories not seeded for new org'; END IF;

    -- Spoofed author/org/counters are overwritten server-side.
    INSERT INTO community_posts (author_id, org_id, category_id, type, title, body, tags, like_count, status)
    VALUES ((SELECT id FROM t_ids WHERE k = 'e2'), (SELECT id FROM t_ids WHERE k = 'orgB'), v_cat,
            'question', '  How do I   rotate the staging DB password?  ',
            'Our staging credentials expired and I am not sure who owns rotation.', ARRAY[' Security ', 'security', 'DB'], 99, 'resolved')
    RETURNING * INTO v_post;

    IF v_post.author_id <> (SELECT id FROM t_ids WHERE k = 'e1') THEN RAISE EXCEPTION 'FAIL: author spoofed'; END IF;
    IF v_post.org_id <> (SELECT id FROM t_ids WHERE k = 'orgA') THEN RAISE EXCEPTION 'FAIL: org spoofed'; END IF;
    IF v_post.like_count <> 0 OR v_post.status <> 'open' THEN RAISE EXCEPTION 'FAIL: counters/status spoofed'; END IF;
    IF v_post.title <> 'How do I rotate the staging DB password?' THEN RAISE EXCEPTION 'FAIL: title not normalised: %', v_post.title; END IF;
    IF v_post.tags <> ARRAY['db', 'security'] THEN RAISE EXCEPTION 'FAIL: tags not normalised: %', v_post.tags; END IF;
    INSERT INTO t_state VALUES ('q1', v_post.id);
    RAISE NOTICE 'PASS create question (identity, org, counters derived server-side)';

    BEGIN
        INSERT INTO community_posts (category_id, type, title, body)
        VALUES (v_cat, 'question', 'How do I rotate the staging DB password?', 'Duplicate submission of the same question body.');
        RAISE EXCEPTION 'FAIL: duplicate post accepted';
    EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'PASS duplicate submission rejected';
    END;

    BEGIN
        INSERT INTO community_posts (category_id, type, title, body)
        VALUES (v_cat, 'announcement', 'Office closed on Friday', 'Employees should not be able to announce.');
        RAISE EXCEPTION 'FAIL: employee created announcement';
    EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS employee cannot post announcements';
    END;

    BEGIN
        INSERT INTO community_posts (category_id, type, title, body) VALUES (v_cat, 'discussion', 'Hi', 'short');
        RAISE EXCEPTION 'FAIL: too-short post accepted';
    EXCEPTION WHEN check_violation THEN RAISE NOTICE 'PASS length limits enforced';
    END;

    INSERT INTO community_posts (category_id, type, title, body)
    VALUES (v_cat, 'discussion', 'Second post for accepted-answer integrity', 'A discussion used to test cross-post answer acceptance.')
    RETURNING id INTO v_post.id;
    INSERT INTO t_state VALUES ('d1', v_post.id);

    BEGIN
        UPDATE community_posts SET status = 'resolved' WHERE id = (SELECT id FROM t_state WHERE k = 'q1');
        RAISE EXCEPTION 'FAIL: author changed status directly';
    EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS author cannot set status/counters directly';
    END;

    UPDATE community_posts SET body = body || ' Edited with more detail.' WHERE id = (SELECT id FROM t_state WHERE k = 'q1');
    IF (SELECT edited_at FROM community_posts WHERE id = (SELECT id FROM t_state WHERE k = 'q1')) IS NULL THEN
        RAISE EXCEPTION 'FAIL: edited_at not set';
    END IF;
    RAISE NOTICE 'PASS author edits own post';
END $$;
RESET ROLE;

SELECT pg_temp.act_as('hrA'); SET LOCAL ROLE authenticated;
DO $$
BEGIN
    INSERT INTO community_posts (category_id, type, title, body)
    VALUES ((SELECT id FROM community_categories WHERE slug = 'general'), 'announcement',
            'Welcome to the community space', 'Ask questions, share tips, and help each other out here.');
    RAISE NOTICE 'PASS HR can post announcements';
END $$;
RESET ROLE;

SELECT pg_temp.act_as('e2'); SET LOCAL ROLE authenticated;
DO $$
DECLARE v_n INT; v_cid UUID;
BEGIN
    UPDATE community_posts SET title = 'Hijacked title by someone else' WHERE id = (SELECT id FROM t_state WHERE k = 'q1');
    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n <> 0 THEN RAISE EXCEPTION 'FAIL: e2 edited e1 post'; END IF;
    DELETE FROM community_posts WHERE id = (SELECT id FROM t_state WHERE k = 'q1');
    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n <> 0 THEN RAISE EXCEPTION 'FAIL: e2 deleted e1 post'; END IF;
    RAISE NOTICE 'PASS employee cannot edit/delete another employee''s post';

    -- Answer the question.
    INSERT INTO community_comments (post_id, author_id, body)
    VALUES ((SELECT id FROM t_state WHERE k = 'q1'), (SELECT id FROM t_ids WHERE k = 'e1'), 'Ask the platform team in #infra, they own rotation.')
    RETURNING id INTO v_cid;
    IF (SELECT author_id FROM community_comments WHERE id = v_cid) <> (SELECT id FROM t_ids WHERE k = 'e2') THEN
        RAISE EXCEPTION 'FAIL: comment author spoofed';
    END IF;
    INSERT INTO t_state VALUES ('c1', v_cid);
    IF (SELECT status FROM community_posts WHERE id = (SELECT id FROM t_state WHERE k = 'q1')) <> 'answered' THEN
        RAISE EXCEPTION 'FAIL: question not marked answered';
    END IF;
    IF (SELECT comment_count FROM community_posts WHERE id = (SELECT id FROM t_state WHERE k = 'q1')) <> 1 THEN
        RAISE EXCEPTION 'FAIL: comment_count not updated';
    END IF;
    RAISE NOTICE 'PASS comment updates count and question status';

    INSERT INTO community_comments (post_id, body)
    VALUES ((SELECT id FROM t_state WHERE k = 'd1'), 'A comment on a different post entirely.')
    RETURNING id INTO v_cid;
    INSERT INTO t_state VALUES ('c_other', v_cid);

    -- Appreciation
    INSERT INTO community_post_likes (post_id) VALUES ((SELECT id FROM t_state WHERE k = 'q1'));
    BEGIN
        INSERT INTO community_post_likes (post_id) VALUES ((SELECT id FROM t_state WHERE k = 'q1'));
        RAISE EXCEPTION 'FAIL: duplicate like';
    EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'PASS duplicate appreciation rejected';
    END;
    IF (SELECT like_count FROM community_posts WHERE id = (SELECT id FROM t_state WHERE k = 'q1')) <> 1 THEN
        RAISE EXCEPTION 'FAIL: like_count';
    END IF;

    INSERT INTO community_bookmarks (post_id) VALUES ((SELECT id FROM t_state WHERE k = 'q1'));
    BEGIN
        INSERT INTO community_bookmarks (post_id) VALUES ((SELECT id FROM t_state WHERE k = 'q1'));
        RAISE EXCEPTION 'FAIL: duplicate bookmark';
    EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'PASS duplicate bookmark rejected';
    END;

    BEGIN
        PERFORM community_accept_answer((SELECT id FROM t_state WHERE k = 'c1'));
        RAISE EXCEPTION 'FAIL: non-author accepted answer';
    EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS only question author can accept';
    END;
END $$;
RESET ROLE;

SELECT pg_temp.act_as('e1'); SET LOCAL ROLE authenticated;
DO $$
DECLARE v_n INT; v_reply UUID;
BEGIN
    IF (SELECT count(*) FROM community_contributions WHERE user_id = (SELECT id FROM t_ids WHERE k = 'e1') AND kind = 'post_appreciated') <> 1 THEN
        RAISE EXCEPTION 'FAIL: appreciation reputation not credited';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM notifications WHERE type = 'community_comment') THEN
        RAISE EXCEPTION 'FAIL: author not notified of comment';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM notifications WHERE type = 'community_appreciation') THEN
        RAISE EXCEPTION 'FAIL: author not notified of appreciation';
    END IF;
    RAISE NOTICE 'PASS reputation + notifications for comment and appreciation';

    BEGIN
        INSERT INTO community_post_likes (post_id) VALUES ((SELECT id FROM t_state WHERE k = 'q1'));
        RAISE EXCEPTION 'FAIL: self-like accepted';
    EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS self-appreciation rejected';
    END;

    SELECT count(*) INTO v_n FROM community_bookmarks;
    IF v_n <> 0 THEN RAISE EXCEPTION 'FAIL: e1 can see e2 bookmarks'; END IF;
    SELECT count(*) INTO v_n FROM community_post_likes;
    IF v_n <> 0 THEN RAISE EXCEPTION 'FAIL: e1 can see e2 likes'; END IF;
    RAISE NOTICE 'PASS bookmarks/likes private to their owner';

    INSERT INTO community_comments (post_id, parent_id, body)
    VALUES ((SELECT id FROM t_state WHERE k = 'q1'), (SELECT id FROM t_state WHERE k = 'c1'), 'Thanks — which channel exactly?')
    RETURNING id INTO v_reply;
    IF (SELECT depth FROM community_comments WHERE id = v_reply) <> 1 THEN RAISE EXCEPTION 'FAIL: reply depth'; END IF;

    DELETE FROM community_comments WHERE id = (SELECT id FROM t_state WHERE k = 'c1');
    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n <> 0 OR NOT EXISTS (SELECT 1 FROM community_comments WHERE id = (SELECT id FROM t_state WHERE k = 'c1') AND NOT is_deleted) THEN
        RAISE EXCEPTION 'FAIL: e1 deleted e2 comment';
    END IF;
    RAISE NOTICE 'PASS employee cannot delete another employee''s comment';

    BEGIN
        PERFORM community_accept_answer((SELECT id FROM t_state WHERE k = 'c_other'));
        RAISE EXCEPTION 'FAIL: accepted an answer that is not a question/comment pair';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM LIKE 'FAIL%' THEN RAISE; END IF;
        RAISE NOTICE 'PASS cannot accept a comment from a non-question post';
    END;

    PERFORM community_accept_answer((SELECT id FROM t_state WHERE k = 'c1'));
    IF (SELECT status FROM community_posts WHERE id = (SELECT id FROM t_state WHERE k = 'q1')) <> 'resolved' THEN
        RAISE EXCEPTION 'FAIL: question not resolved';
    END IF;
    RAISE NOTICE 'PASS question author accepts an answer';

    PERFORM community_reopen_question((SELECT id FROM t_state WHERE k = 'q1'));
    IF (SELECT status FROM community_posts WHERE id = (SELECT id FROM t_state WHERE k = 'q1')) <> 'answered'
       OR (SELECT accepted_comment_id FROM community_posts WHERE id = (SELECT id FROM t_state WHERE k = 'q1')) IS NOT NULL THEN
        RAISE EXCEPTION 'FAIL: reopen';
    END IF;
    RAISE NOTICE 'PASS question reopened';

    PERFORM community_accept_answer((SELECT id FROM t_state WHERE k = 'c1'));
END $$;
RESET ROLE;

DO $$
BEGIN
    IF (SELECT count(*) FROM community_contributions
        WHERE user_id = (SELECT id FROM t_ids WHERE k = 'e2') AND kind = 'accepted_answer') <> 1 THEN
        RAISE EXCEPTION 'FAIL: accepted answer credited % times (expected exactly once after reopen + re-accept)',
            (SELECT count(*) FROM community_contributions WHERE user_id = (SELECT id FROM t_ids WHERE k = 'e2') AND kind = 'accepted_answer');
    END IF;
    RAISE NOTICE 'PASS accepted-answer reputation credited exactly once';
END $$;

-- Integrity at the storage level: even as postgres, an accepted answer
-- must belong to the same post.
DO $$
BEGIN
    BEGIN
        UPDATE community_posts SET accepted_comment_id = (SELECT id FROM t_state WHERE k = 'c_other')
        WHERE id = (SELECT id FROM t_state WHERE k = 'q1');
        SET CONSTRAINTS ALL IMMEDIATE;
        RAISE EXCEPTION 'FAIL: cross-post accepted answer stored';
    EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'PASS accepted answer FK enforces same post';
    END;
END $$;
SET CONSTRAINTS ALL DEFERRED;

-- ============================================================ cross-org isolation
SELECT pg_temp.act_as('eB'); SET LOCAL ROLE authenticated;
DO $$
DECLARE v_n INT;
BEGIN
    SELECT count(*) INTO v_n FROM community_posts;
    IF v_n <> 0 THEN RAISE EXCEPTION 'FAIL: other org sees posts'; END IF;
    SELECT count(*) INTO v_n FROM community_comments;
    IF v_n <> 0 THEN RAISE EXCEPTION 'FAIL: other org sees comments'; END IF;
    SELECT count(*) INTO v_n FROM community_directory() WHERE user_id = (SELECT id FROM t_ids WHERE k = 'e1');
    IF v_n <> 0 THEN RAISE EXCEPTION 'FAIL: other org sees directory'; END IF;
    BEGIN
        INSERT INTO community_comments (post_id, body) VALUES ((SELECT id FROM t_state WHERE k = 'q1'), 'cross org comment attempt');
        RAISE EXCEPTION 'FAIL: cross-org comment';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        PERFORM community_start_conversation((SELECT id FROM t_ids WHERE k = 'e1'));
        RAISE EXCEPTION 'FAIL: cross-org conversation';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    RAISE NOTICE 'PASS other organization cannot see or touch community data';
END $$;
RESET ROLE;

-- ============================================================ messaging
SELECT pg_temp.act_as('e1'); SET LOCAL ROLE authenticated;
DO $$
DECLARE v_conv UUID; v_again UUID; v_msg community_messages%ROWTYPE;
BEGIN
    v_conv := community_start_conversation((SELECT id FROM t_ids WHERE k = 'e2'));
    v_again := community_start_conversation((SELECT id FROM t_ids WHERE k = 'e2'));
    IF v_conv <> v_again THEN RAISE EXCEPTION 'FAIL: duplicate conversation'; END IF;
    INSERT INTO t_state VALUES ('conv', v_conv);

    INSERT INTO community_messages (conversation_id, sender_id, body)
    VALUES (v_conv, (SELECT id FROM t_ids WHERE k = 'e2'), 'Hey, quick question about the rotation')
    RETURNING * INTO v_msg;
    IF v_msg.sender_id <> (SELECT id FROM t_ids WHERE k = 'e1') THEN RAISE EXCEPTION 'FAIL: sender spoofed'; END IF;
    RAISE NOTICE 'PASS start conversation (idempotent) and send message';
END $$;
RESET ROLE;

SELECT pg_temp.act_as('e2'); SET LOCAL ROLE authenticated;
DO $$
BEGIN
    IF (SELECT unread_count FROM community_list_conversations() LIMIT 1) <> 1 THEN
        RAISE EXCEPTION 'FAIL: unread count';
    END IF;
    IF community_unread_message_count() <> 1 THEN RAISE EXCEPTION 'FAIL: unread total'; END IF;
    PERFORM community_mark_conversation_read((SELECT id FROM t_state WHERE k = 'conv'));
    IF community_unread_message_count() <> 0 THEN RAISE EXCEPTION 'FAIL: mark read'; END IF;
    IF EXISTS (SELECT 1 FROM notifications WHERE type = 'community_message' AND NOT read) THEN
        RAISE EXCEPTION 'FAIL: message notification not cleared';
    END IF;
    RAISE NOTICE 'PASS recipient sees message, unread count and read receipt';
END $$;
RESET ROLE;

SELECT pg_temp.act_as('hrA'); SET LOCAL ROLE authenticated;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM community_messages) THEN RAISE EXCEPTION 'FAIL: non-participant (HR) reads messages'; END IF;
    IF EXISTS (SELECT 1 FROM community_conversations) THEN RAISE EXCEPTION 'FAIL: non-participant sees conversation'; END IF;
    BEGIN
        INSERT INTO community_conversation_participants (conversation_id, user_id)
        VALUES ((SELECT id FROM t_state WHERE k = 'conv'), (SELECT id FROM t_ids WHERE k = 'hrA'));
        RAISE EXCEPTION 'FAIL: joined someone else''s conversation';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        INSERT INTO community_messages (conversation_id, body) VALUES ((SELECT id FROM t_state WHERE k = 'conv'), 'injected');
        RAISE EXCEPTION 'FAIL: non-participant sent message';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    RAISE NOTICE 'PASS private messages restricted to participants (HR included)';
END $$;
RESET ROLE;

-- ============================================================ notifications privacy
SELECT pg_temp.act_as('e2'); SET LOCAL ROLE authenticated;
DO $$
DECLARE v_n INT;
BEGIN
    SELECT count(*) INTO v_n FROM notifications WHERE user_id = (SELECT id FROM t_ids WHERE k = 'e1');
    IF v_n <> 0 THEN RAISE EXCEPTION 'FAIL: e2 reads e1 notifications'; END IF;
    UPDATE notifications SET read = true WHERE user_id = (SELECT id FROM t_ids WHERE k = 'e1');
    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n <> 0 THEN RAISE EXCEPTION 'FAIL: e2 modified e1 notifications'; END IF;
    BEGIN
        UPDATE notifications SET title = 'tampered' WHERE user_id = (SELECT id FROM t_ids WHERE k = 'e2');
        RAISE EXCEPTION 'FAIL: notification content editable';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    RAISE NOTICE 'PASS notifications private to recipient, only read-state editable';
END $$;
RESET ROLE;

-- ============================================================ rewards integrity
SELECT pg_temp.act_as('e1'); SET LOCAL ROLE authenticated;
DO $$
BEGIN
    BEGIN
        PERFORM credit_points((SELECT id FROM t_ids WHERE k = 'e1'), 1000, 'self award');
        RAISE EXCEPTION 'FAIL: employee credited own points';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        UPDATE users SET points_balance = 999999 WHERE id = (SELECT id FROM t_ids WHERE k = 'e1');
        RAISE EXCEPTION 'FAIL: employee edited own balance';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        UPDATE users SET role = 'admin' WHERE id = (SELECT id FROM t_ids WHERE k = 'e1');
        RAISE EXCEPTION 'FAIL: employee promoted self';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        PERFORM redeem_reward((SELECT id FROM t_ids WHERE k = 'e2'), gen_random_uuid());
        RAISE EXCEPTION 'FAIL: redeemed for someone else';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        PERFORM send_kudos((SELECT id FROM t_ids WHERE k = 'e2'), (SELECT id FROM t_ids WHERE k = 'e1'), 'spoof', 100, '{}');
        RAISE EXCEPTION 'FAIL: kudos sent as someone else';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        INSERT INTO community_contributions (org_id, user_id, kind, points, source_id)
        VALUES ((SELECT id FROM t_ids WHERE k = 'orgA'), (SELECT id FROM t_ids WHERE k = 'e1'), 'accepted_answer', 1000, gen_random_uuid());
        RAISE EXCEPTION 'FAIL: employee wrote own reputation';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    UPDATE users SET name = 'Employee One' WHERE id = (SELECT id FROM t_ids WHERE k = 'e1');
    RAISE NOTICE 'PASS employee cannot award points/reputation, escalate role, or spend others'' balance';
END $$;
RESET ROLE;

SELECT pg_temp.act_as('hrA'); SET LOCAL ROLE authenticated;
DO $$
BEGIN
    PERFORM credit_points((SELECT id FROM t_ids WHERE k = 'e2'), 50, 'Community: accepted answers this month');
    BEGIN
        PERFORM credit_points((SELECT id FROM t_ids WHERE k = 'eB'), 50, 'other org');
        RAISE EXCEPTION 'FAIL: HR credited another org';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM LIKE 'FAIL%' THEN RAISE; END IF;
    END;
    BEGIN
        PERFORM credit_points((SELECT id FROM t_ids WHERE k = 'hrA'), 50, 'self');
        RAISE EXCEPTION 'FAIL: HR credited self';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    RAISE NOTICE 'PASS HR awards official points only to own org, never to self';
END $$;
RESET ROLE;

DO $$
BEGIN
    IF (SELECT points_balance FROM users WHERE id = (SELECT id FROM t_ids WHERE k = 'e2')) <> 550 THEN
        RAISE EXCEPTION 'FAIL: official wallet changed by community activity (balance %)',
            (SELECT points_balance FROM users WHERE id = (SELECT id FROM t_ids WHERE k = 'e2'));
    END IF;
    RAISE NOTICE 'PASS community reputation never touches the rewards wallet';
END $$;

-- Leaderboard (017): employees see colleagues' totals; other orgs see nothing.
SELECT pg_temp.act_as('e1'); SET LOCAL ROLE authenticated;
DO $$
BEGIN
    IF (SELECT total_earned FROM get_top_recipients((SELECT id FROM t_ids WHERE k = 'orgA'), 10)
        WHERE user_id = (SELECT id FROM t_ids WHERE k = 'e2')) <> 50 THEN
        RAISE EXCEPTION 'FAIL: employee leaderboard does not show colleague totals';
    END IF;
END $$;
RESET ROLE;
SELECT pg_temp.act_as('eB'); SET LOCAL ROLE authenticated;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM get_top_recipients((SELECT id FROM t_ids WHERE k = 'orgA'), 10)) THEN
        RAISE EXCEPTION 'FAIL: leaderboard leaks another organization';
    END IF;
    RAISE NOTICE 'PASS leaderboard shows colleague totals, scoped to own organization';
END $$;
RESET ROLE;

-- ============================================================ moderation
SELECT pg_temp.act_as('e1'); SET LOCAL ROLE authenticated;
DO $$
BEGIN
    INSERT INTO community_reports (comment_id, reason, details)
    VALUES ((SELECT id FROM t_state WHERE k = 'c_other'), 'off_topic', 'Not related');
    BEGIN
        PERFORM community_moderate('post', (SELECT id FROM t_state WHERE k = 'd1'), 'hide', 'test');
        RAISE EXCEPTION 'FAIL: employee moderated';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        PERFORM community_hr_overview(30);
        RAISE EXCEPTION 'FAIL: employee read HR analytics';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        PERFORM community_award_badge((SELECT id FROM t_ids WHERE k = 'e2'), 'community_champion', NULL);
        RAISE EXCEPTION 'FAIL: employee awarded badge';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    IF EXISTS (SELECT 1 FROM community_moderation_actions) THEN RAISE EXCEPTION 'FAIL: employee reads audit log'; END IF;
    RAISE NOTICE 'PASS employee cannot use HR moderation/analytics';
END $$;
RESET ROLE;

SELECT pg_temp.act_as('e2'); SET LOCAL ROLE authenticated;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM community_reports) THEN RAISE EXCEPTION 'FAIL: reported user sees report'; END IF;
    RAISE NOTICE 'PASS reports visible only to reporter and HR';
END $$;
RESET ROLE;

SELECT pg_temp.act_as('hrA'); SET LOCAL ROLE authenticated;
DO $$
DECLARE v_overview JSON;
BEGIN
    PERFORM community_moderate('comment', (SELECT id FROM t_state WHERE k = 'c_other'), 'hide', 'Off topic');
    IF (SELECT status FROM community_reports LIMIT 1) <> 'actioned' THEN RAISE EXCEPTION 'FAIL: report not actioned'; END IF;
    PERFORM community_moderate('post', (SELECT id FROM t_state WHERE k = 'd1'), 'hide', 'Duplicate of another thread');
    IF (SELECT count(*) FROM community_moderation_actions) <> 2 THEN RAISE EXCEPTION 'FAIL: audit log'; END IF;
    PERFORM community_award_badge((SELECT id FROM t_ids WHERE k = 'e2'), 'community_champion', 'Great mentoring');
    v_overview := community_hr_overview(30);
    IF (v_overview->>'posts')::int < 3 THEN RAISE EXCEPTION 'FAIL: overview %', v_overview; END IF;
    PERFORM * FROM community_top_contributors(30, 10);
    RAISE NOTICE 'PASS HR moderates (audited), awards badge, reads aggregate analytics';
END $$;
RESET ROLE;

SELECT pg_temp.act_as('e2'); SET LOCAL ROLE authenticated;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM community_posts WHERE id = (SELECT id FROM t_state WHERE k = 'd1')) THEN
        RAISE EXCEPTION 'FAIL: hidden post visible to other employees';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM notifications WHERE type = 'badge_awarded') THEN
        RAISE EXCEPTION 'FAIL: badge notification missing';
    END IF;
    RAISE NOTICE 'PASS hidden content invisible to other employees; badge notification delivered';
END $$;
RESET ROLE;

SELECT pg_temp.act_as('e1'); SET LOCAL ROLE authenticated;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM community_posts WHERE id = (SELECT id FROM t_state WHERE k = 'd1') AND is_hidden) THEN
        RAISE EXCEPTION 'FAIL: author cannot see own hidden post';
    END IF;
    -- Own post delete still works (and cleans up its comments).
    DELETE FROM community_posts WHERE id = (SELECT id FROM t_state WHERE k = 'd1');
    BEGIN
        PERFORM register_admin_organization('Sneaky Org', NULL);
        RAISE EXCEPTION 'FAIL: existing employee self-promoted via org registration';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    RAISE NOTICE 'PASS author sees own hidden post, deletes own post; no self-promotion via signup RPC';
END $$;
RESET ROLE;

-- ============================================================ anonymous
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SELECT set_config('request.jwt.claim.sub', '', true);
SET LOCAL ROLE anon;
DO $$
BEGIN
    BEGIN
        PERFORM 1 FROM community_posts;
        RAISE EXCEPTION 'FAIL: anon read posts';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        PERFORM community_start_conversation(gen_random_uuid());
        RAISE EXCEPTION 'FAIL: anon called RPC';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    RAISE NOTICE 'PASS unauthenticated users cannot access community data or RPCs';
END $$;
RESET ROLE;

DO $$ BEGIN RAISE NOTICE 'ALL COMMUNITY SECURITY TESTS PASSED'; END $$;

ROLLBACK;
