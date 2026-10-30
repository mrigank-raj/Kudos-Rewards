-- ============================================================
-- 015_community_moderation.sql
-- Kudos R&R Platform — Reports, auditable HR moderation, HR community
-- analytics, manual community badge awards.
-- ============================================================
-- * Any member can report a post/comment in their org (once per item).
-- * Only admins of the same org can review reports and hide / unhide /
--   delete content, always through SECURITY DEFINER RPCs that write a row
--   to community_moderation_actions. The audit log stores who did what to
--   which item and why — not a copy of the content, so deleted content
--   isn't kept around.
-- * HR analytics are aggregate-only and never read private messages.
--
-- Rollback:
--   DROP TABLE community_moderation_actions, community_reports CASCADE;
--   DROP FUNCTION community_moderate(TEXT, UUID, TEXT, TEXT),
--     community_resolve_report(UUID, TEXT, TEXT),
--     community_award_badge(UUID, TEXT, TEXT),
--     community_hr_overview(INTEGER), community_top_contributors(INTEGER, INTEGER);
-- ============================================================

CREATE TABLE community_reports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    reporter_id     UUID NOT NULL DEFAULT auth.uid() REFERENCES users(id) ON DELETE CASCADE,
    post_id         UUID REFERENCES community_posts(id) ON DELETE SET NULL,
    comment_id      UUID REFERENCES community_comments(id) ON DELETE SET NULL,
    -- Kept even after the content is deleted so the report history stays
    -- meaningful.
    target_type     TEXT NOT NULL CHECK (target_type IN ('post', 'comment')),
    target_author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reason          TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'off_topic', 'inappropriate', 'misinformation', 'other')),
    details         TEXT CHECK (details IS NULL OR length(details) <= 500),
    status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'dismissed', 'actioned')),
    resolved_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at     TIMESTAMPTZ,
    resolution_note TEXT CHECK (resolution_note IS NULL OR length(resolution_note) <= 500),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_community_reports_once_post
    ON community_reports(reporter_id, post_id) WHERE post_id IS NOT NULL AND target_type = 'post';
CREATE UNIQUE INDEX idx_community_reports_once_comment
    ON community_reports(reporter_id, comment_id) WHERE comment_id IS NOT NULL;
CREATE INDEX idx_community_reports_org_status ON community_reports(org_id, status, created_at DESC);

CREATE TABLE community_moderation_actions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    moderator_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    action           TEXT NOT NULL CHECK (action IN (
                        'hide_post', 'unhide_post', 'delete_post',
                        'hide_comment', 'unhide_comment', 'delete_comment',
                        'dismiss_report', 'action_report', 'award_badge')),
    target_type      TEXT NOT NULL CHECK (target_type IN ('post', 'comment', 'report', 'user')),
    target_id        UUID NOT NULL,
    target_author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    -- Post title at the time of the action, for context in the log. Not
    -- the body.
    target_label     TEXT,
    reason           TEXT CHECK (reason IS NULL OR length(reason) <= 500),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_community_moderation_org ON community_moderation_actions(org_id, created_at DESC);

-- ------------------------------------------------------------ RLS
ALTER TABLE community_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_moderation_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members file reports"
    ON community_reports FOR INSERT
    WITH CHECK (reporter_id = auth.uid() AND org_id = get_user_org());

CREATE POLICY "Reporters and HR view reports"
    ON community_reports FOR SELECT
    USING (
        org_id = get_user_org()
        AND (reporter_id = auth.uid() OR community_is_admin())
    );

CREATE POLICY "HR views moderation log"
    ON community_moderation_actions FOR SELECT
    USING (org_id = get_user_org() AND community_is_admin());

REVOKE ALL ON community_reports, community_moderation_actions FROM anon;

-- Runs as the caller (not SECURITY DEFINER) so the target lookups below
-- are RLS-filtered: you can only report content you can actually see.
CREATE OR REPLACE FUNCTION public.community_reports_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_org UUID;
    v_author UUID;
    v_reporter_org UUID;
BEGIN
    IF is_api_client() THEN
        NEW.reporter_id := auth.uid();
    END IF;

    SELECT org_id INTO v_reporter_org FROM users WHERE id = NEW.reporter_id;

    IF (NEW.post_id IS NULL) = (NEW.comment_id IS NULL) THEN
        RAISE EXCEPTION 'Report exactly one post or comment';
    END IF;

    IF NEW.post_id IS NOT NULL THEN
        SELECT org_id, author_id INTO v_org, v_author FROM community_posts WHERE id = NEW.post_id;
        NEW.target_type := 'post';
    ELSE
        SELECT org_id, author_id INTO v_org, v_author FROM community_comments WHERE id = NEW.comment_id;
        NEW.target_type := 'comment';
    END IF;

    IF v_org IS NULL OR v_org IS DISTINCT FROM v_reporter_org THEN
        RAISE EXCEPTION 'Content not found' USING ERRCODE = '42501';
    END IF;
    IF v_author = NEW.reporter_id THEN
        RAISE EXCEPTION 'You cannot report your own content';
    END IF;

    NEW.org_id := v_org;
    NEW.target_author_id := v_author;
    NEW.details := NULLIF(trim(NEW.details), '');
    NEW.status := 'open';
    NEW.resolved_by := NULL;
    NEW.resolved_at := NULL;
    NEW.resolution_note := NULL;
    NEW.created_at := now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER community_reports_before_insert
    BEFORE INSERT ON community_reports
    FOR EACH ROW EXECUTE FUNCTION public.community_reports_before_insert();

-- ------------------------------------------------------------ helper
CREATE OR REPLACE FUNCTION public.community_require_admin()
RETURNS UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org UUID;
BEGIN
    SELECT org_id INTO v_org FROM users WHERE id = auth.uid() AND role = 'admin';
    IF v_org IS NULL THEN
        RAISE EXCEPTION 'HR admin access required' USING ERRCODE = '42501';
    END IF;
    RETURN v_org;
END;
$$;

-- ------------------------------------------------------------ moderation RPC
CREATE OR REPLACE FUNCTION public.community_moderate(
    p_target_type TEXT, p_target_id UUID, p_action TEXT, p_reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org UUID := community_require_admin();
    v_post community_posts%ROWTYPE;
    v_comment community_comments%ROWTYPE;
    v_author UUID;
    v_label TEXT;
    v_reason TEXT := NULLIF(trim(p_reason), '');
BEGIN
    IF p_action NOT IN ('hide', 'unhide', 'delete') THEN
        RAISE EXCEPTION 'Unknown moderation action';
    END IF;
    IF p_action IN ('hide', 'delete') AND v_reason IS NULL THEN
        RAISE EXCEPTION 'A reason is required';
    END IF;

    IF p_target_type = 'post' THEN
        SELECT * INTO v_post FROM community_posts WHERE id = p_target_id AND org_id = v_org FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION 'Post not found'; END IF;
        v_author := v_post.author_id;
        v_label := v_post.title;

        IF p_action = 'hide' THEN
            UPDATE community_posts
            SET is_hidden = true, hidden_reason = v_reason, hidden_by = auth.uid(), hidden_at = now()
            WHERE id = p_target_id;
        ELSIF p_action = 'unhide' THEN
            UPDATE community_posts
            SET is_hidden = false, hidden_reason = NULL, hidden_by = NULL, hidden_at = NULL
            WHERE id = p_target_id;
        ELSE
            DELETE FROM community_posts WHERE id = p_target_id;
        END IF;

    ELSIF p_target_type = 'comment' THEN
        SELECT * INTO v_comment FROM community_comments WHERE id = p_target_id AND org_id = v_org FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION 'Comment not found'; END IF;
        v_author := v_comment.author_id;
        SELECT title INTO v_label FROM community_posts WHERE id = v_comment.post_id;

        IF p_action = 'hide' THEN
            UPDATE community_comments
            SET is_hidden = true, hidden_reason = v_reason, hidden_by = auth.uid(), hidden_at = now()
            WHERE id = p_target_id;
        ELSIF p_action = 'unhide' THEN
            UPDATE community_comments
            SET is_hidden = false, hidden_reason = NULL, hidden_by = NULL, hidden_at = NULL
            WHERE id = p_target_id;
            PERFORM community_refresh_question_status(v_comment.post_id);
        ELSE
            -- Same semantics as an author delete (012): a comment with
            -- replies becomes a "[deleted]" placeholder, a leaf is removed.
            DELETE FROM community_comments WHERE id = p_target_id;
        END IF;
    ELSE
        RAISE EXCEPTION 'Unknown target type';
    END IF;

    INSERT INTO community_moderation_actions
        (org_id, moderator_id, action, target_type, target_id, target_author_id, target_label, reason)
    VALUES
        (v_org, auth.uid(), p_action || '_' || p_target_type, p_target_type, p_target_id, v_author, left(v_label, 150), v_reason);

    IF p_action IN ('hide', 'delete') THEN
        UPDATE community_reports
        SET status = 'actioned', resolved_by = auth.uid(), resolved_at = now(),
            resolution_note = COALESCE(resolution_note, v_reason)
        WHERE status = 'open'
          AND ((p_target_type = 'post' AND post_id = p_target_id AND target_type = 'post')
            OR (p_target_type = 'comment' AND comment_id = p_target_id));

        PERFORM community_notify(
            v_author, 'community_moderation',
            CASE WHEN p_action = 'hide' THEN 'HR hid one of your community contributions'
                 ELSE 'HR removed one of your community contributions' END,
            'Reason: ' || v_reason,
            CASE WHEN p_action = 'hide' AND p_target_type = 'post'
                 THEN '/community/post/' || p_target_id::text ELSE '/community/mine' END,
            auth.uid(), NULL
        );
    END IF;

    RETURN json_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.community_resolve_report(p_report_id UUID, p_status TEXT, p_note TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org UUID := community_require_admin();
BEGIN
    IF p_status NOT IN ('dismissed', 'actioned') THEN
        RAISE EXCEPTION 'Invalid status';
    END IF;

    UPDATE community_reports
    SET status = p_status, resolved_by = auth.uid(), resolved_at = now(),
        resolution_note = NULLIF(trim(p_note), '')
    WHERE id = p_report_id AND org_id = v_org;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Report not found';
    END IF;

    INSERT INTO community_moderation_actions (org_id, moderator_id, action, target_type, target_id, reason)
    VALUES (v_org, auth.uid(), CASE WHEN p_status = 'dismissed' THEN 'dismiss_report' ELSE 'action_report' END,
            'report', p_report_id, NULLIF(trim(p_note), ''));

    RETURN json_build_object('success', true);
END;
$$;

-- HR can recognise someone with a community badge directly. Only
-- community_* badges — kudos badges stay rule-based.
CREATE OR REPLACE FUNCTION public.community_award_badge(p_user_id UUID, p_badge_key TEXT, p_reason TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org UUID := community_require_admin();
    v_badge_id UUID;
BEGIN
    IF p_user_id = auth.uid() THEN
        RAISE EXCEPTION 'You cannot award a badge to yourself' USING ERRCODE = '42501';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND org_id = v_org) THEN
        RAISE EXCEPTION 'Employee not found in your organization';
    END IF;
    SELECT id INTO v_badge_id FROM badges WHERE key = p_badge_key AND key LIKE 'community\_%';
    IF v_badge_id IS NULL THEN
        RAISE EXCEPTION 'Unknown community badge';
    END IF;

    INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, v_badge_id)
    ON CONFLICT (user_id, badge_id) DO NOTHING;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'This employee already has that badge';
    END IF;

    INSERT INTO community_moderation_actions (org_id, moderator_id, action, target_type, target_id, target_author_id, target_label, reason)
    VALUES (v_org, auth.uid(), 'award_badge', 'user', p_user_id, p_user_id, p_badge_key, NULLIF(trim(p_reason), ''));

    RETURN json_build_object('success', true);
END;
$$;

-- ------------------------------------------------------------ HR analytics
-- Aggregate community health for the caller's org over the last p_days.
-- Deliberately excludes community_messages.
CREATE OR REPLACE FUNCTION public.community_hr_overview(p_days INTEGER DEFAULT 30)
RETURNS JSON
LANGUAGE plpgsql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org UUID := community_require_admin();
    v_since TIMESTAMPTZ := now() - make_interval(days => least(greatest(p_days, 1), 365));
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'posts', (SELECT count(*) FROM community_posts WHERE org_id = v_org AND created_at >= v_since),
        'questions', (SELECT count(*) FROM community_posts WHERE org_id = v_org AND type = 'question' AND created_at >= v_since),
        'resolved_questions', (SELECT count(*) FROM community_posts WHERE org_id = v_org AND type = 'question' AND status = 'resolved' AND created_at >= v_since),
        'unanswered_questions', (SELECT count(*) FROM community_posts WHERE org_id = v_org AND type = 'question' AND status = 'open' AND NOT is_hidden),
        'tips', (SELECT count(*) FROM community_posts WHERE org_id = v_org AND type = 'tip' AND created_at >= v_since),
        'comments', (SELECT count(*) FROM community_comments WHERE org_id = v_org AND created_at >= v_since AND NOT is_deleted),
        'appreciations', (SELECT count(*) FROM community_contributions WHERE org_id = v_org AND created_at >= v_since AND kind IN ('post_appreciated', 'comment_appreciated')),
        'active_members', (
            SELECT count(DISTINCT a) FROM (
                SELECT author_id AS a FROM community_posts WHERE org_id = v_org AND created_at >= v_since
                UNION SELECT author_id FROM community_comments WHERE org_id = v_org AND created_at >= v_since
            ) x),
        'members', (SELECT count(*) FROM users WHERE org_id = v_org),
        'open_reports', (SELECT count(*) FROM community_reports WHERE org_id = v_org AND status = 'open'),
        'hidden_items', (
            (SELECT count(*) FROM community_posts WHERE org_id = v_org AND is_hidden)
            + (SELECT count(*) FROM community_comments WHERE org_id = v_org AND is_hidden)),
        'by_category', COALESCE((
            SELECT json_agg(row_to_json(c) ORDER BY c.posts DESC)
            FROM (
                SELECT cat.name, count(p.id) AS posts,
                       count(p.id) FILTER (WHERE p.type = 'question' AND p.status = 'resolved') AS resolved
                FROM community_categories cat
                LEFT JOIN community_posts p ON p.category_id = cat.id AND p.created_at >= v_since
                WHERE cat.org_id = v_org
                GROUP BY cat.name
            ) c), '[]'::json),
        'weekly', COALESCE((
            SELECT json_agg(row_to_json(w) ORDER BY w.week)
            FROM (
                SELECT to_char(date_trunc('week', d), 'YYYY-MM-DD') AS week,
                       (SELECT count(*) FROM community_posts p WHERE p.org_id = v_org AND date_trunc('week', p.created_at) = date_trunc('week', d)) AS posts,
                       (SELECT count(*) FROM community_comments c WHERE c.org_id = v_org AND date_trunc('week', c.created_at) = date_trunc('week', d)) AS comments
                FROM generate_series(date_trunc('week', v_since), date_trunc('week', now()), INTERVAL '1 week') d
            ) w), '[]'::json)
    ) INTO v_result;
    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.community_top_contributors(p_days INTEGER DEFAULT 30, p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
    user_id UUID, name TEXT, avatar_url TEXT, team TEXT, job_title TEXT,
    period_reputation BIGINT, period_accepted BIGINT, period_appreciations BIGINT, period_tips BIGINT,
    period_answers BIGINT, total_reputation BIGINT, badge_count BIGINT
)
LANGUAGE plpgsql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org UUID := community_require_admin();
    v_since TIMESTAMPTZ := now() - make_interval(days => least(greatest(p_days, 1), 365));
BEGIN
    RETURN QUERY
    SELECT u.id, u.name, u.avatar_url, u.team, cp.job_title,
           COALESCE(sum(c.points) FILTER (WHERE c.created_at >= v_since), 0)::bigint,
           count(c.id) FILTER (WHERE c.kind = 'accepted_answer' AND c.created_at >= v_since),
           count(c.id) FILTER (WHERE c.kind IN ('post_appreciated', 'comment_appreciated') AND c.created_at >= v_since),
           count(c.id) FILTER (WHERE c.kind = 'tip_shared' AND c.created_at >= v_since),
           (SELECT count(*) FROM community_comments cc WHERE cc.author_id = u.id AND cc.created_at >= v_since AND NOT cc.is_deleted AND NOT cc.is_hidden),
           COALESCE(sum(c.points), 0)::bigint,
           (SELECT count(*) FROM user_badges ub JOIN badges b ON b.id = ub.badge_id WHERE ub.user_id = u.id AND b.key LIKE 'community\_%')
    FROM users u
    LEFT JOIN community_profiles cp ON cp.user_id = u.id
    LEFT JOIN community_contributions c ON c.user_id = u.id
    WHERE u.org_id = v_org
    GROUP BY u.id, u.name, u.avatar_url, u.team, cp.job_title
    HAVING COALESCE(sum(c.points) FILTER (WHERE c.created_at >= v_since), 0) > 0
    ORDER BY 6 DESC, u.name
    LIMIT least(greatest(p_limit, 1), 100);
END;
$$;

-- ------------------------------------------------------------ grants
REVOKE EXECUTE ON FUNCTION public.community_require_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.community_moderate(TEXT, UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.community_resolve_report(UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.community_award_badge(UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.community_hr_overview(INTEGER) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.community_top_contributors(INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_moderate(TEXT, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_resolve_report(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_award_badge(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_hr_overview(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_top_contributors(INTEGER, INTEGER) TO authenticated;
