-- ============================================================
-- 022_message_delete.sql
-- Senders can delete their own private messages ("delete for everyone").
--   * Soft delete: the row stays (so ordering and read receipts hold) but
--     the text is wiped and deleted_at is set; both people see
--     "This message was deleted".
--   * If it was the newest message, the conversation preview and the
--     recipient's message notification no longer show its text.
--   * Deleted messages don't count as unread.
-- ============================================================

ALTER TABLE community_messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE community_messages DROP CONSTRAINT IF EXISTS community_messages_body_check;
ALTER TABLE community_messages ADD CONSTRAINT community_messages_body_check
    CHECK (deleted_at IS NOT NULL OR length(trim(body)) BETWEEN 1 AND 4000);

CREATE OR REPLACE FUNCTION public.community_delete_message(p_message_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_msg community_messages%ROWTYPE;
    v_newest UUID;
BEGIN
    SELECT * INTO v_msg FROM community_messages WHERE id = p_message_id FOR UPDATE;
    -- community_is_participant also rejects removed users (019).
    IF NOT FOUND OR NOT community_is_participant(v_msg.conversation_id) THEN
        RAISE EXCEPTION 'Message not found' USING ERRCODE = '42501';
    END IF;
    IF v_msg.sender_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'You can only delete your own messages' USING ERRCODE = '42501';
    END IF;
    IF v_msg.deleted_at IS NOT NULL THEN
        RETURN; -- already deleted; a double click is harmless
    END IF;

    UPDATE community_messages SET body = '', deleted_at = now() WHERE id = p_message_id;

    -- The preview and the (deduplicated, refreshed) message notification
    -- always show the newest message, so only that case needs clearing.
    SELECT id INTO v_newest FROM community_messages
    WHERE conversation_id = v_msg.conversation_id
    ORDER BY created_at DESC LIMIT 1;

    IF v_newest = p_message_id THEN
        UPDATE community_conversations SET last_message_preview = 'Message deleted'
        WHERE id = v_msg.conversation_id;
        UPDATE notifications SET body = 'Message deleted'
        WHERE dedupe_key = 'message:' || v_msg.conversation_id::text
          AND user_id <> v_msg.sender_id;
    END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.community_delete_message(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_delete_message(UUID) TO authenticated;

-- ------------------------------------------------------------ unread counts skip deleted messages
CREATE OR REPLACE FUNCTION public.community_list_conversations()
RETURNS TABLE(conversation_id uuid, other_user_id uuid, other_name text, other_avatar_url text, other_team text, other_role text, other_job_title text, other_last_read_at timestamp with time zone, last_message_at timestamp with time zone, last_message_preview text, last_message_sender uuid, unread_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        c.id,
        o.user_id,
        u.name,
        u.avatar_url,
        u.team,
        u.role,
        cp.job_title,
        o.last_read_at,
        c.last_message_at,
        c.last_message_preview,
        c.last_message_sender,
        (SELECT count(*) FROM community_messages m
          WHERE m.conversation_id = c.id
            AND m.sender_id <> auth.uid()
            AND m.deleted_at IS NULL
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
RETURNS bigint
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT count(*)
    FROM community_conversation_participants me
    JOIN community_messages m ON m.conversation_id = me.conversation_id
    WHERE me.user_id = auth.uid()
      AND m.sender_id <> auth.uid()
      AND m.deleted_at IS NULL
      AND m.created_at > me.last_read_at;
$$;
