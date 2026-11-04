-- ============================================================
-- message_delete_tests.sql — deleting private messages (migration 022).
-- One transaction, rolled back; raises on failure, NOTICE 'PASS ...'.
-- ============================================================

BEGIN;

CREATE TEMP TABLE d_ids (k TEXT PRIMARY KEY, id UUID NOT NULL);
GRANT SELECT ON d_ids TO authenticated;
INSERT INTO d_ids VALUES ('org', gen_random_uuid()), ('a', gen_random_uuid()), ('b', gen_random_uuid());

CREATE TEMP TABLE d_state (k TEXT PRIMARY KEY, id UUID);
GRANT SELECT, INSERT ON d_state TO authenticated;

CREATE FUNCTION pg_temp.did(p_key TEXT) RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT id FROM d_ids WHERE k = p_key
$$;
GRANT EXECUTE ON FUNCTION pg_temp.did(TEXT) TO authenticated;

CREATE FUNCTION pg_temp.as_d(p_key TEXT) RETURNS void LANGUAGE sql AS $$
    SELECT set_config('request.jwt.claims',
        json_build_object('sub', (SELECT id FROM d_ids WHERE k = p_key), 'role', 'authenticated')::text, true);
    SELECT set_config('request.jwt.claim.sub', (SELECT id FROM d_ids WHERE k = p_key)::text, true);
$$;
GRANT EXECUTE ON FUNCTION pg_temp.as_d(TEXT) TO authenticated;

INSERT INTO organizations (id, name) VALUES (pg_temp.did('org'), 'Message Test Org');
INSERT INTO pending_members (org_id, name, email, role) VALUES
    (pg_temp.did('org'), 'A', 'd.a@kiit.ac.in', 'recipient'),
    (pg_temp.did('org'), 'B', 'd.b@kiit.ac.in', 'recipient');
INSERT INTO auth.users (id, email) VALUES (pg_temp.did('a'), 'd.a@kiit.ac.in'), (pg_temp.did('b'), 'd.b@kiit.ac.in');

-- A writes two messages to B.
SELECT pg_temp.as_d('a'); SET LOCAL ROLE authenticated;
DO $$
DECLARE v_conv UUID; v_first UUID; v_second UUID;
BEGIN
    v_conv := community_start_conversation(pg_temp.did('b'));
    INSERT INTO community_messages (conversation_id, body) VALUES (v_conv, 'first message') RETURNING id INTO v_first;
    INSERT INTO community_messages (conversation_id, body) VALUES (v_conv, 'something I regret') RETURNING id INTO v_second;
    INSERT INTO d_state VALUES ('conv', v_conv), ('first', v_first), ('second', v_second);
END $$;
RESET ROLE;

-- B cannot delete A's message, and has 2 unread.
SELECT pg_temp.as_d('b'); SET LOCAL ROLE authenticated;
DO $$
BEGIN
    IF community_unread_message_count() <> 2 THEN RAISE EXCEPTION 'FAIL: expected 2 unread'; END IF;
    BEGIN
        PERFORM community_delete_message((SELECT id FROM d_state WHERE k = 'second'));
        RAISE EXCEPTION 'FAIL: deleted someone else''s message';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    RAISE NOTICE 'PASS only the sender can delete a message';
END $$;
RESET ROLE;

-- A deletes the newest message (twice, to prove it is harmless).
SELECT pg_temp.as_d('a'); SET LOCAL ROLE authenticated;
DO $$
BEGIN
    PERFORM community_delete_message((SELECT id FROM d_state WHERE k = 'second'));
    PERFORM community_delete_message((SELECT id FROM d_state WHERE k = 'second'));
END $$;
RESET ROLE;

DO $$
BEGIN
    IF (SELECT body FROM community_messages WHERE id = (SELECT id FROM d_state WHERE k = 'second')) <> ''
       OR (SELECT deleted_at FROM community_messages WHERE id = (SELECT id FROM d_state WHERE k = 'second')) IS NULL THEN
        RAISE EXCEPTION 'FAIL: message text not wiped';
    END IF;
    IF (SELECT last_message_preview FROM community_conversations WHERE id = (SELECT id FROM d_state WHERE k = 'conv')) <> 'Message deleted' THEN
        RAISE EXCEPTION 'FAIL: conversation preview still shows the deleted text';
    END IF;
    IF EXISTS (SELECT 1 FROM notifications WHERE user_id = pg_temp.did('b') AND body LIKE '%regret%') THEN
        RAISE EXCEPTION 'FAIL: notification still shows the deleted text';
    END IF;
    RAISE NOTICE 'PASS deleting wipes the text, the preview and the notification; repeat delete is harmless';
END $$;

-- B now has 1 unread (the deleted one no longer counts) and sees the placeholder row.
SELECT pg_temp.as_d('b'); SET LOCAL ROLE authenticated;
DO $$
BEGIN
    IF community_unread_message_count() <> 1 THEN RAISE EXCEPTION 'FAIL: deleted message still counted as unread'; END IF;
    IF (SELECT unread_count FROM community_list_conversations() LIMIT 1) <> 1 THEN
        RAISE EXCEPTION 'FAIL: conversation list unread count';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM community_messages WHERE id = (SELECT id FROM d_state WHERE k = 'second') AND deleted_at IS NOT NULL) THEN
        RAISE EXCEPTION 'FAIL: recipient cannot see the deleted placeholder';
    END IF;
    RAISE NOTICE 'PASS deleted messages are not unread; both people see the placeholder';
END $$;
RESET ROLE;

DO $$ BEGIN RAISE NOTICE 'ALL MESSAGE DELETE TESTS PASSED'; END $$;
ROLLBACK;
