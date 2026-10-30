-- ============================================================
-- 014_community_notifications_reputation.sql
-- Kudos R&R Platform — Community notifications, contribution ledger,
-- reputation, community badges, employee directory.
-- ============================================================
-- Reputation is NOT money. It lives in community_contributions and is
-- never written to `transactions` or `users.points_balance`. If HR wants
-- to turn community help into official points they use the existing,
-- admin-only credit_points() RPC (hardened in 011) — there is no automatic
-- bridge between the two.
--
-- Contribution rules (transparent, shown in the UI):
--   accepted_answer       +15  your answer was accepted on someone else's question
--   post_appreciated      +2   a colleague appreciated your post
--   comment_appreciated   +2   a colleague appreciated your comment/answer
--   tip_shared            +5   your tip was appreciated by 3+ colleagues
-- Guarantees:
--   * Rows are written only by SECURITY DEFINER triggers; clients have no
--     INSERT/UPDATE/DELETE policy, so nobody can set their own score.
--   * Unique (user, kind, source, actor) — the same event never counts twice.
--   * Self-appreciation is rejected by 012; self-accepted answers earn 0.
--   * Un-appreciating, re-opening, deleting or a moderator hiding content
--     removes the credit it generated.
--
-- Rollback:
--   DROP TABLE community_contributions CASCADE;
--   DELETE FROM badges WHERE key LIKE 'community_%';
--   ALTER TABLE notifications DROP COLUMN link, DROP COLUMN actor_id,
--     DROP COLUMN dedupe_key;  (and restore the 010 type CHECK)
-- ============================================================

-- ------------------------------------------------------------ notifications (extend 010)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS dedupe_key TEXT;

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'kudos_received', 'points_credited', 'redemption_status',
    'community_comment', 'community_reply', 'community_answer_accepted',
    'community_appreciation', 'community_message', 'community_moderation',
    'badge_awarded'
));

-- One notification per logical event (e.g. one per liker per post, one
-- live "new messages" item per conversation).
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedupe
    ON notifications(user_id, dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
    ON notifications(user_id, created_at DESC);

-- 010's update policy let a user rewrite any column of their own
-- notification. Restrict client edits to the read flag.
CREATE OR REPLACE FUNCTION public.notifications_before_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF is_api_client() AND (
        NEW.id IS DISTINCT FROM OLD.id OR NEW.user_id IS DISTINCT FROM OLD.user_id
        OR NEW.type IS DISTINCT FROM OLD.type OR NEW.title IS DISTINCT FROM OLD.title
        OR NEW.body IS DISTINCT FROM OLD.body OR NEW.link IS DISTINCT FROM OLD.link
        OR NEW.actor_id IS DISTINCT FROM OLD.actor_id OR NEW.dedupe_key IS DISTINCT FROM OLD.dedupe_key
        OR NEW.created_at IS DISTINCT FROM OLD.created_at
    ) THEN
        RAISE EXCEPTION 'Only the read state of a notification can be changed' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notifications_before_update ON notifications;
CREATE TRIGGER notifications_before_update
    BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION public.notifications_before_update();

-- Internal helper. Skips self-notifications. p_refresh=true re-surfaces an
-- existing deduped notification (used for message threads) instead of
-- ignoring it.
CREATE OR REPLACE FUNCTION public.community_notify(
    p_user_id UUID, p_type TEXT, p_title TEXT, p_body TEXT, p_link TEXT,
    p_actor_id UUID, p_dedupe_key TEXT, p_refresh BOOLEAN DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_user_id IS NULL OR p_user_id = p_actor_id THEN
        RETURN;
    END IF;

    IF p_refresh THEN
        INSERT INTO notifications (user_id, type, title, body, link, actor_id, dedupe_key)
        VALUES (p_user_id, p_type, p_title, left(p_body, 200), p_link, p_actor_id, p_dedupe_key)
        ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL
        DO UPDATE SET read = false, title = EXCLUDED.title, body = EXCLUDED.body,
                      actor_id = EXCLUDED.actor_id, created_at = now();
    ELSE
        INSERT INTO notifications (user_id, type, title, body, link, actor_id, dedupe_key)
        VALUES (p_user_id, p_type, p_title, left(p_body, 200), p_link, p_actor_id, p_dedupe_key)
        ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
    END IF;
END;
$$;

-- ------------------------------------------------------------ contribution ledger
CREATE TABLE community_contributions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind        TEXT NOT NULL CHECK (kind IN ('accepted_answer', 'post_appreciated', 'comment_appreciated', 'tip_shared')),
    points      INTEGER NOT NULL CHECK (points > 0),
    source_id   UUID NOT NULL,   -- post or comment id
    actor_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_community_contributions_once
    ON community_contributions(user_id, kind, source_id, COALESCE(actor_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX idx_community_contributions_org_user ON community_contributions(org_id, user_id);
CREATE INDEX idx_community_contributions_source ON community_contributions(source_id);
CREATE INDEX idx_community_contributions_created ON community_contributions(org_id, created_at DESC);

ALTER TABLE community_contributions ENABLE ROW LEVEL SECURITY;

-- Reputation is public within the org (that's the point of it).
CREATE POLICY "Org members view contributions"
    ON community_contributions FOR SELECT
    USING (org_id = get_user_org());

REVOKE ALL ON community_contributions FROM anon;

CREATE OR REPLACE FUNCTION public.community_credit(
    p_user_id UUID, p_kind TEXT, p_points INTEGER, p_source_id UUID, p_actor_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_user_id IS NULL OR p_user_id = p_actor_id THEN
        RETURN;
    END IF;
    INSERT INTO community_contributions (org_id, user_id, kind, points, source_id, actor_id)
    SELECT u.org_id, u.id, p_kind, p_points, p_source_id, p_actor_id
    FROM users u WHERE u.id = p_user_id AND u.org_id IS NOT NULL
    ON CONFLICT DO NOTHING;
END;
$$;

-- ------------------------------------------------------------ community badges
INSERT INTO badges (key, name, description, icon) VALUES
    ('community_helpful_contributor', 'Helpful Contributor', 'Received 10 appreciations for community posts or answers', 'HandHeart'),
    ('community_problem_solver', 'Problem Solver', 'Had 3 answers accepted as the solution', 'CircleCheck'),
    ('community_knowledge_sharer', 'Knowledge Sharer', 'Shared 2 tips that 3+ colleagues found useful', 'Lightbulb'),
    ('community_collaborator', 'Collaborator', 'Appreciated by 5 different colleagues in the community', 'Handshake'),
    ('community_champion', 'Community Champion', 'Earned 150 community reputation', 'Crown')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.community_check_badges(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_appreciations INT;
    v_distinct_appreciators INT;
    v_accepted INT;
    v_tips INT;
    v_total INT;
BEGIN
    SELECT
        count(*) FILTER (WHERE kind IN ('post_appreciated', 'comment_appreciated')),
        count(DISTINCT actor_id) FILTER (WHERE kind IN ('post_appreciated', 'comment_appreciated')),
        count(*) FILTER (WHERE kind = 'accepted_answer'),
        count(*) FILTER (WHERE kind = 'tip_shared'),
        COALESCE(sum(points), 0)
    INTO v_appreciations, v_distinct_appreciators, v_accepted, v_tips, v_total
    FROM community_contributions WHERE user_id = p_user_id;

    INSERT INTO user_badges (user_id, badge_id)
    SELECT p_user_id, b.id FROM badges b
    WHERE (b.key = 'community_helpful_contributor' AND v_appreciations >= 10)
       OR (b.key = 'community_problem_solver' AND v_accepted >= 3)
       OR (b.key = 'community_knowledge_sharer' AND v_tips >= 2)
       OR (b.key = 'community_collaborator' AND v_distinct_appreciators >= 5)
       OR (b.key = 'community_champion' AND v_total >= 150)
    ON CONFLICT (user_id, badge_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.community_contributions_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM community_check_badges(NEW.user_id);
    RETURN NULL;
END;
$$;

CREATE TRIGGER community_contributions_after_insert
    AFTER INSERT ON community_contributions
    FOR EACH ROW EXECUTE FUNCTION public.community_contributions_after_insert();

-- Every badge award (kudos badges from 010 too) now notifies the earner.
CREATE OR REPLACE FUNCTION public.notify_badge_awarded()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_badge badges%ROWTYPE;
BEGIN
    SELECT * INTO v_badge FROM badges WHERE id = NEW.badge_id;
    PERFORM community_notify(
        NEW.user_id, 'badge_awarded',
        'You earned the ' || v_badge.name || ' badge',
        v_badge.description, '/profile', NULL, 'badge:' || NEW.badge_id::text
    );
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_user_badge_awarded ON user_badges;
CREATE TRIGGER on_user_badge_awarded
    AFTER INSERT ON user_badges
    FOR EACH ROW EXECUTE FUNCTION public.notify_badge_awarded();

-- ------------------------------------------------------------ event triggers
CREATE OR REPLACE FUNCTION public.community_comments_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_post community_posts%ROWTYPE;
    v_parent_author UUID;
    v_actor_name TEXT;
    v_link TEXT;
BEGIN
    SELECT * INTO v_post FROM community_posts WHERE id = NEW.post_id;
    SELECT name INTO v_actor_name FROM users WHERE id = NEW.author_id;
    v_link := '/community/post/' || NEW.post_id::text || '?comment=' || NEW.id::text;

    IF NEW.parent_id IS NOT NULL THEN
        SELECT author_id INTO v_parent_author FROM community_comments WHERE id = NEW.parent_id;
        PERFORM community_notify(
            v_parent_author, 'community_reply',
            COALESCE(v_actor_name, 'A colleague') || ' replied to your comment',
            NEW.body, v_link, NEW.author_id, 'reply:' || NEW.id::text
        );
    END IF;

    -- Don't double-notify the post author if they were the reply target.
    IF v_parent_author IS DISTINCT FROM v_post.author_id THEN
        PERFORM community_notify(
            v_post.author_id, 'community_comment',
            COALESCE(v_actor_name, 'A colleague') ||
                CASE WHEN v_post.type = 'question' THEN ' answered your question' ELSE ' commented on your post' END,
            v_post.title, v_link, NEW.author_id, 'comment:' || NEW.id::text
        );
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER community_comments_notify
    AFTER INSERT ON community_comments
    FOR EACH ROW EXECUTE FUNCTION public.community_comments_notify();

CREATE OR REPLACE FUNCTION public.community_posts_after_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_answer_author UUID;
BEGIN
    IF NEW.accepted_comment_id IS DISTINCT FROM OLD.accepted_comment_id THEN
        IF OLD.accepted_comment_id IS NOT NULL THEN
            DELETE FROM community_contributions
            WHERE kind = 'accepted_answer' AND source_id = NEW.id;
        END IF;

        IF NEW.accepted_comment_id IS NOT NULL THEN
            SELECT author_id INTO v_answer_author FROM community_comments WHERE id = NEW.accepted_comment_id;
            -- Accepting your own answer resolves the question but earns nothing.
            IF v_answer_author IS DISTINCT FROM NEW.author_id THEN
                PERFORM community_credit(v_answer_author, 'accepted_answer', 15, NEW.id, NULL);
            END IF;
            PERFORM community_notify(
                v_answer_author, 'community_answer_accepted',
                'Your answer was accepted',
                NEW.title,
                '/community/post/' || NEW.id::text || '?comment=' || NEW.accepted_comment_id::text,
                COALESCE(auth.uid(), NEW.author_id),
                'accepted:' || NEW.id::text || ':' || NEW.accepted_comment_id::text
            );
        END IF;
    END IF;

    IF NEW.is_hidden AND NOT OLD.is_hidden THEN
        DELETE FROM community_contributions WHERE source_id = NEW.id;
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER community_posts_after_update
    AFTER UPDATE OF accepted_comment_id, is_hidden ON community_posts
    FOR EACH ROW EXECUTE FUNCTION public.community_posts_after_update();

CREATE OR REPLACE FUNCTION public.community_content_after_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM community_contributions WHERE source_id = OLD.id;
    RETURN NULL;
END;
$$;

CREATE TRIGGER community_posts_after_delete
    AFTER DELETE ON community_posts
    FOR EACH ROW EXECUTE FUNCTION public.community_content_after_delete();

CREATE TRIGGER community_comments_after_delete
    AFTER DELETE ON community_comments
    FOR EACH ROW EXECUTE FUNCTION public.community_content_after_delete();

CREATE OR REPLACE FUNCTION public.community_comments_after_removed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF (NEW.is_hidden AND NOT OLD.is_hidden) OR (NEW.is_deleted AND NOT OLD.is_deleted) THEN
        DELETE FROM community_contributions WHERE source_id = NEW.id;
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER community_comments_after_removed
    AFTER UPDATE OF is_hidden, is_deleted ON community_comments
    FOR EACH ROW EXECUTE FUNCTION public.community_comments_after_removed();

CREATE OR REPLACE FUNCTION public.community_post_likes_reputation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_post community_posts%ROWTYPE;
    v_actor_name TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM community_contributions
        WHERE kind = 'post_appreciated' AND source_id = OLD.post_id AND actor_id = OLD.user_id;
        RETURN NULL;
    END IF;

    SELECT * INTO v_post FROM community_posts WHERE id = NEW.post_id;
    PERFORM community_credit(v_post.author_id, 'post_appreciated', 2, NEW.post_id, NEW.user_id);

    IF v_post.type = 'tip'
       AND (SELECT count(*) FROM community_post_likes WHERE post_id = NEW.post_id) >= 3 THEN
        PERFORM community_credit(v_post.author_id, 'tip_shared', 5, NEW.post_id, NULL);
    END IF;

    SELECT name INTO v_actor_name FROM users WHERE id = NEW.user_id;
    PERFORM community_notify(
        v_post.author_id, 'community_appreciation',
        COALESCE(v_actor_name, 'A colleague') || ' appreciated your post',
        v_post.title, '/community/post/' || NEW.post_id::text,
        NEW.user_id, 'post_like:' || NEW.post_id::text || ':' || NEW.user_id::text
    );
    RETURN NULL;
END;
$$;

CREATE TRIGGER community_post_likes_reputation
    AFTER INSERT OR DELETE ON community_post_likes
    FOR EACH ROW EXECUTE FUNCTION public.community_post_likes_reputation();

CREATE OR REPLACE FUNCTION public.community_comment_likes_reputation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_comment community_comments%ROWTYPE;
    v_actor_name TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM community_contributions
        WHERE kind = 'comment_appreciated' AND source_id = OLD.comment_id AND actor_id = OLD.user_id;
        RETURN NULL;
    END IF;

    SELECT * INTO v_comment FROM community_comments WHERE id = NEW.comment_id;
    PERFORM community_credit(v_comment.author_id, 'comment_appreciated', 2, NEW.comment_id, NEW.user_id);

    SELECT name INTO v_actor_name FROM users WHERE id = NEW.user_id;
    PERFORM community_notify(
        v_comment.author_id, 'community_appreciation',
        COALESCE(v_actor_name, 'A colleague') || ' appreciated your comment',
        left(v_comment.body, 120),
        '/community/post/' || v_comment.post_id::text || '?comment=' || v_comment.id::text,
        NEW.user_id, 'comment_like:' || NEW.comment_id::text || ':' || NEW.user_id::text
    );
    RETURN NULL;
END;
$$;

CREATE TRIGGER community_comment_likes_reputation
    AFTER INSERT OR DELETE ON community_comment_likes
    FOR EACH ROW EXECUTE FUNCTION public.community_comment_likes_reputation();

CREATE OR REPLACE FUNCTION public.community_messages_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sender_name TEXT;
    v_recipient UUID;
BEGIN
    SELECT name INTO v_sender_name FROM users WHERE id = NEW.sender_id;
    FOR v_recipient IN
        SELECT user_id FROM community_conversation_participants
        WHERE conversation_id = NEW.conversation_id AND user_id <> NEW.sender_id
    LOOP
        PERFORM community_notify(
            v_recipient, 'community_message',
            'New message from ' || COALESCE(v_sender_name, 'a colleague'),
            NEW.body, '/messages/' || NEW.conversation_id::text,
            NEW.sender_id, 'message:' || NEW.conversation_id::text, true
        );
    END LOOP;
    RETURN NULL;
END;
$$;

CREATE TRIGGER community_messages_notify
    AFTER INSERT ON community_messages
    FOR EACH ROW EXECUTE FUNCTION public.community_messages_notify();

-- Opening a conversation also clears its message notification.
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

    UPDATE notifications
    SET read = true
    WHERE user_id = auth.uid() AND dedupe_key = 'message:' || p_conversation_id::text AND NOT read;
END;
$$;

-- ------------------------------------------------------------ directory / profile
-- One row per org member with public profile + community stats. Used by
-- the directory (search/filter, paginated) and the profile page
-- (p_user_id). Never returns email or points balance.
CREATE OR REPLACE FUNCTION public.community_directory(
    p_search TEXT DEFAULT NULL,
    p_team TEXT DEFAULT NULL,
    p_skill TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 24,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    user_id UUID,
    name TEXT,
    avatar_url TEXT,
    team TEXT,
    role TEXT,
    job_title TEXT,
    bio TEXT,
    skills TEXT[],
    reputation BIGINT,
    accepted_answers BIGINT,
    appreciations BIGINT,
    post_count BIGINT,
    answer_count BIGINT,
    badges JSON,
    joined_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    WITH me AS (SELECT get_user_org() AS org_id),
    members AS (
        SELECT u.*
        FROM users u, me
        WHERE me.org_id IS NOT NULL
          AND u.org_id = me.org_id
          AND (p_user_id IS NULL OR u.id = p_user_id)
          AND (p_team IS NULL OR u.team = p_team)
    )
    SELECT
        m.id, m.name, m.avatar_url, m.team, m.role,
        cp.job_title, cp.bio, COALESCE(cp.skills, '{}'),
        COALESCE(c.reputation, 0),
        COALESCE(c.accepted, 0),
        COALESCE(c.appreciations, 0),
        (SELECT count(*) FROM community_posts p WHERE p.author_id = m.id AND NOT p.is_hidden),
        (SELECT count(*) FROM community_comments cc WHERE cc.author_id = m.id AND NOT cc.is_deleted AND NOT cc.is_hidden),
        COALESCE((
            SELECT json_agg(json_build_object('key', b.key, 'name', b.name, 'icon', b.icon, 'description', b.description, 'awarded_at', ub.awarded_at) ORDER BY ub.awarded_at DESC)
            FROM user_badges ub JOIN badges b ON b.id = ub.badge_id
            WHERE ub.user_id = m.id
        ), '[]'::json),
        m.created_at
    FROM members m
    LEFT JOIN community_profiles cp ON cp.user_id = m.id
    LEFT JOIN LATERAL (
        SELECT sum(points) AS reputation,
               count(*) FILTER (WHERE kind = 'accepted_answer') AS accepted,
               count(*) FILTER (WHERE kind IN ('post_appreciated', 'comment_appreciated')) AS appreciations
        FROM community_contributions WHERE community_contributions.user_id = m.id
    ) c ON true
    WHERE (p_skill IS NULL OR lower(trim(p_skill)) = ANY (COALESCE(cp.skills, '{}')))
      AND (
        p_search IS NULL OR trim(p_search) = ''
        OR m.name ILIKE '%' || trim(p_search) || '%'
        OR cp.job_title ILIKE '%' || trim(p_search) || '%'
        OR EXISTS (SELECT 1 FROM unnest(COALESCE(cp.skills, '{}')) s WHERE s ILIKE '%' || trim(p_search) || '%')
      )
    ORDER BY COALESCE(c.reputation, 0) DESC, m.name
    LIMIT least(greatest(p_limit, 1), 100) OFFSET greatest(p_offset, 0);
$$;

-- Distinct skills in the caller's org, for the directory filter.
CREATE OR REPLACE FUNCTION public.community_org_skills()
RETURNS TABLE (skill TEXT, member_count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT s, count(*)
    FROM community_profiles cp
    JOIN users u ON u.id = cp.user_id
    CROSS JOIN LATERAL unnest(cp.skills) AS s
    WHERE u.org_id = get_user_org()
    GROUP BY s
    ORDER BY count(*) DESC, s
    LIMIT 100;
$$;

-- ------------------------------------------------------------ grants
REVOKE EXECUTE ON FUNCTION public.community_notify(UUID, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.community_credit(UUID, TEXT, INTEGER, UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.community_check_badges(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.community_directory(TEXT, TEXT, TEXT, UUID, INTEGER, INTEGER) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.community_org_skills() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_directory(TEXT, TEXT, TEXT, UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_org_skills() TO authenticated;
