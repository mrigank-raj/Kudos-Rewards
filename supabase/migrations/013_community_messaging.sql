-- ============================================================
-- 013_community_messaging.sql
-- Kudos R&R Platform — One-to-one private messages between colleagues.
-- ============================================================
-- Security model:
--   * Conversations and participants are created ONLY by
--     community_start_conversation(), which checks the other person is in
--     the caller's org. There are no client INSERT/UPDATE/DELETE policies
--     on those two tables, so nobody can add themselves to a conversation.
--   * Participant checks use a SECURITY DEFINER helper so the policy on
--     community_conversation_participants doesn't query itself (which
--     would be infinitely recursive under RLS).
--   * Messages are readable/insertable only by participants. Supabase
--     Realtime applies the same SELECT policy to postgres_changes events.
--   * Nothing here is exposed to HR analytics.
--
-- Rollback:
--   DROP TABLE community_messages, community_conversation_participants,
--     community_conversations CASCADE;
--   DROP FUNCTION community_is_participant(UUID),
--     community_start_conversation(UUID), community_mark_conversation_read(UUID),
--     community_list_conversations(), community_unread_message_count();
-- ============================================================

CREATE TABLE community_conversations (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id               UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    -- "<smaller uuid>:<larger uuid>" — one direct conversation per pair.
    direct_key           TEXT NOT NULL UNIQUE,
    created_by           UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_message_at      TIMESTAMPTZ,
    last_message_preview TEXT,
    last_message_sender  UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE community_conversation_participants (
    conversation_id UUID NOT NULL REFERENCES community_conversations(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Read receipt: everything up to this instant has been seen.
    last_read_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX idx_community_participants_user ON community_conversation_participants(user_id);

CREATE TABLE community_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES community_conversations(id) ON DELETE CASCADE,
    sender_id       UUID NOT NULL DEFAULT auth.uid() REFERENCES users(id) ON DELETE CASCADE,
    body            TEXT NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 4000),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_community_messages_conversation ON community_messages(conversation_id, created_at DESC);

-- ------------------------------------------------------------ helper
CREATE OR REPLACE FUNCTION public.community_is_participant(p_conversation_id UUID)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM community_conversation_participants
        WHERE conversation_id = p_conversation_id AND user_id = auth.uid()
    );
$$;

-- ------------------------------------------------------------ RLS
ALTER TABLE community_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view conversations"
    ON community_conversations FOR SELECT
    USING (community_is_participant(id));

CREATE POLICY "Participants view participants"
    ON community_conversation_participants FOR SELECT
    USING (community_is_participant(conversation_id));

CREATE POLICY "Participants view messages"
    ON community_messages FOR SELECT
    USING (community_is_participant(conversation_id));

CREATE POLICY "Participants send messages"
    ON community_messages FOR INSERT
    WITH CHECK (sender_id = auth.uid() AND community_is_participant(conversation_id));

-- No UPDATE/DELETE policies: messages are immutable from the client.

REVOKE ALL ON community_conversations, community_conversation_participants, community_messages FROM anon;

-- ------------------------------------------------------------ triggers
CREATE OR REPLACE FUNCTION public.community_messages_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF is_api_client() THEN
        NEW.sender_id := auth.uid();
    END IF;
    NEW.body := trim(NEW.body);
    -- clock_timestamp(), not now(): ordering and read receipts must be
    -- strict even for several messages within one transaction.
    NEW.created_at := clock_timestamp();
    RETURN NEW;
END;
$$;

CREATE TRIGGER community_messages_before_insert
    BEFORE INSERT ON community_messages
    FOR EACH ROW EXECUTE FUNCTION public.community_messages_before_insert();

-- Rate limit: at most 30 messages per sender per minute.
CREATE OR REPLACE FUNCTION public.community_messages_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF (SELECT count(*) FROM community_messages
        WHERE sender_id = NEW.sender_id AND created_at > now() - INTERVAL '1 minute') >= 30 THEN
        RAISE EXCEPTION 'You are sending messages too quickly — wait a moment' USING ERRCODE = '54000';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER community_messages_rate_limit
    BEFORE INSERT ON community_messages
    FOR EACH ROW EXECUTE FUNCTION public.community_messages_rate_limit();

CREATE OR REPLACE FUNCTION public.community_messages_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE community_conversations
    SET last_message_at = NEW.created_at,
        last_message_preview = left(NEW.body, 140),
        last_message_sender = NEW.sender_id
    WHERE id = NEW.conversation_id;

    -- Sending implies you've read everything up to now.
    UPDATE community_conversation_participants
    SET last_read_at = NEW.created_at
    WHERE conversation_id = NEW.conversation_id AND user_id = NEW.sender_id;

    RETURN NULL;
END;
$$;

CREATE TRIGGER community_messages_after_insert
    AFTER INSERT ON community_messages
    FOR EACH ROW EXECUTE FUNCTION public.community_messages_after_insert();

-- ------------------------------------------------------------ RPCs
-- Find or create the direct conversation between the caller and another
-- member of their organization. Idempotent.
CREATE OR REPLACE FUNCTION public.community_start_conversation(p_other_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_me UUID := auth.uid();
    v_org UUID := get_user_org();
    v_key TEXT;
    v_id UUID;
BEGIN
    IF v_me IS NULL OR v_org IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
    END IF;
    IF p_other_user_id IS NULL OR p_other_user_id = v_me THEN
        RAISE EXCEPTION 'Choose a colleague to message';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_other_user_id AND org_id = v_org) THEN
        RAISE EXCEPTION 'Colleague not found' USING ERRCODE = '42501';
    END IF;

    v_key := least(v_me::text, p_other_user_id::text) || ':' || greatest(v_me::text, p_other_user_id::text);

    INSERT INTO community_conversations (org_id, direct_key, created_by)
    VALUES (v_org, v_key, v_me)
    ON CONFLICT (direct_key) DO NOTHING
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
        SELECT id INTO v_id FROM community_conversations WHERE direct_key = v_key;
    ELSE
        INSERT INTO community_conversation_participants (conversation_id, user_id)
        VALUES (v_id, v_me), (v_id, p_other_user_id)
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.community_mark_conversation_read(p_conversation_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE community_conversation_participants
    SET last_read_at = clock_timestamp()
    WHERE conversation_id = p_conversation_id AND user_id = auth.uid();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Conversation not found' USING ERRCODE = '42501';
    END IF;
END;
$$;

-- Conversation list for the caller in one round trip (no N+1): the other
-- participant's public identity, the last message preview, and how many
-- messages from them are unread. Never returns email.
CREATE OR REPLACE FUNCTION public.community_list_conversations()
RETURNS TABLE (
    conversation_id UUID,
    other_user_id UUID,
    other_name TEXT,
    other_avatar_url TEXT,
    other_team TEXT,
    other_job_title TEXT,
    other_last_read_at TIMESTAMPTZ,
    last_message_at TIMESTAMPTZ,
    last_message_preview TEXT,
    last_message_sender UUID,
    unread_count BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        c.id,
        o.user_id,
        u.name,
        u.avatar_url,
        u.team,
        cp.job_title,
        o.last_read_at,
        c.last_message_at,
        c.last_message_preview,
        c.last_message_sender,
        (SELECT count(*) FROM community_messages m
          WHERE m.conversation_id = c.id
            AND m.sender_id <> auth.uid()
            AND m.created_at > me.last_read_at)
    FROM community_conversation_participants me
    JOIN community_conversations c ON c.id = me.conversation_id
    JOIN community_conversation_participants o
      ON o.conversation_id = c.id AND o.user_id <> me.user_id
    JOIN users u ON u.id = o.user_id
    LEFT JOIN community_profiles cp ON cp.user_id = o.user_id
    WHERE me.user_id = auth.uid()
    ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
    LIMIT 100;
$$;

CREATE OR REPLACE FUNCTION public.community_unread_message_count()
RETURNS BIGINT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT count(*)
    FROM community_conversation_participants me
    JOIN community_messages m ON m.conversation_id = me.conversation_id
    WHERE me.user_id = auth.uid()
      AND m.sender_id <> auth.uid()
      AND m.created_at > me.last_read_at;
$$;

REVOKE EXECUTE ON FUNCTION public.community_start_conversation(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.community_mark_conversation_read(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.community_list_conversations() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.community_unread_message_count() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_start_conversation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_mark_conversation_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_list_conversations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_unread_message_count() TO authenticated;

-- Realtime: new messages are pushed to subscribed participants (RLS is
-- enforced by Realtime for postgres_changes).
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE community_messages;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;  -- local Postgres without Supabase
END $$;
