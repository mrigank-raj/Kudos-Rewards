-- ============================================================
-- 017_leaderboard_and_conversation_role.sql
-- Kudos R&R Platform — fixes found while testing on the hosted project.
-- ============================================================
-- 1. get_top_recipients (003/008) runs as the caller. Under RLS a
--    recipient can only read their own transactions, so on the employee
--    Leaderboard every colleague showed 0 points (HR saw real totals).
--    Make it SECURITY DEFINER and scope it to the caller's own
--    organization, whatever p_org_id is passed — so it can't be used to
--    read another org's leaderboard. Same columns, so callers don't change.
-- 2. community_list_conversations (013) didn't return the other person's
--    role, so the Messages header labelled HR as "Team member". Adds
--    other_role (return type change → drop and recreate).
--
-- Rollback: re-run get_top_recipients from 008 and
-- community_list_conversations from 013.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_top_recipients(p_org_id UUID, p_limit INT DEFAULT 10)
RETURNS TABLE(user_id UUID, user_name TEXT, user_email TEXT, avatar_url TEXT, team TEXT, total_earned BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        u.id,
        u.name,
        u.email,
        u.avatar_url,
        u.team,
        COALESCE(SUM(CASE WHEN t.type IN ('earn', 'manual_credit') THEN t.points ELSE 0 END), 0)::bigint
    FROM users u
    LEFT JOIN transactions t ON t.user_id = u.id
    WHERE u.org_id = p_org_id
      AND p_org_id = get_user_org()
      AND u.role = 'recipient'
    GROUP BY u.id, u.name, u.email, u.avatar_url, u.team
    ORDER BY 6 DESC
    LIMIT least(greatest(p_limit, 1), 100);
$$;

REVOKE EXECUTE ON FUNCTION public.get_top_recipients(UUID, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_top_recipients(UUID, INT) TO authenticated;

DROP FUNCTION IF EXISTS public.community_list_conversations();

CREATE FUNCTION public.community_list_conversations()
RETURNS TABLE (
    conversation_id UUID,
    other_user_id UUID,
    other_name TEXT,
    other_avatar_url TEXT,
    other_team TEXT,
    other_role TEXT,
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
        u.role,
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

REVOKE EXECUTE ON FUNCTION public.community_list_conversations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_list_conversations() TO authenticated;
