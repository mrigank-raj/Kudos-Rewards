-- ============================================================
-- 012_community_core.sql
-- Kudos R&R Platform — Employee Community: profiles, categories, posts,
-- threaded comments, accepted answers, appreciation, bookmarks.
-- ============================================================
-- Requires 011_security_hardening.sql (is_api_client()).
--
-- Trust model, same as the rest of the app:
--   * identity  = auth.uid()
--   * org       = get_user_org()  (users.org_id, now client-immutable)
--   * HR        = get_user_role() = 'admin'
-- Every community row carries org_id, always filled in server-side by a
-- BEFORE INSERT trigger — the client never chooses it. Counters, question
-- status, accepted answers and moderation flags are likewise only writable
-- from SECURITY DEFINER code; triggers reject client attempts to change
-- them.
--
-- Rollback (drops all community data):
--   DROP TABLE community_bookmarks, community_comment_likes,
--     community_post_likes, community_comments, community_posts,
--     community_categories, community_profiles CASCADE;
--   then DROP the community_* functions created below.
-- ============================================================

-- ------------------------------------------------------------ shared helpers
-- Is p_user_id a member of the caller's organization? SECURITY DEFINER so
-- policies on other tables can ask without re-entering users' RLS.
CREATE OR REPLACE FUNCTION public.community_same_org(p_user_id UUID)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM users
        WHERE id = p_user_id AND org_id IS NOT NULL AND org_id = get_user_org()
    );
$$;

CREATE OR REPLACE FUNCTION public.community_is_admin()
RETURNS boolean
LANGUAGE sql STABLE
SET search_path = public
AS $$
    SELECT COALESCE(get_user_role() = 'admin', false);
$$;

-- Normalise a tag list: trimmed, lower-case, de-duplicated, empty dropped.
CREATE OR REPLACE FUNCTION public.community_clean_tags(p_tags TEXT[])
RETURNS TEXT[]
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
    SELECT COALESCE(array_agg(DISTINCT t ORDER BY t), '{}')
    FROM (
        SELECT lower(trim(x)) AS t FROM unnest(COALESCE(p_tags, '{}')) AS x
    ) s
    WHERE t <> '';
$$;

-- ------------------------------------------------------------ profiles
-- Extra, community-only profile fields. Kept out of `users` so the
-- privileged-column trigger there stays simple and nothing in the rewards
-- code has to know about them. Department reuses users.team.
CREATE TABLE community_profiles (
    user_id     UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    job_title   TEXT CHECK (job_title IS NULL OR length(job_title) <= 80),
    bio         TEXT CHECK (bio IS NULL OR length(bio) <= 500),
    skills      TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(skills) <= 15),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_community_profiles_skills ON community_profiles USING GIN (skills);

ALTER TABLE community_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view community profiles"
    ON community_profiles FOR SELECT
    USING (community_same_org(user_id));

CREATE POLICY "Users create own community profile"
    ON community_profiles FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own community profile"
    ON community_profiles FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.community_profiles_before_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.job_title := NULLIF(trim(NEW.job_title), '');
    NEW.bio := NULLIF(trim(NEW.bio), '');
    NEW.skills := community_clean_tags(NEW.skills);
    IF EXISTS (SELECT 1 FROM unnest(NEW.skills) s WHERE length(s) > 40) THEN
        RAISE EXCEPTION 'Each skill must be 40 characters or fewer';
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER community_profiles_before_write
    BEFORE INSERT OR UPDATE ON community_profiles
    FOR EACH ROW EXECUTE FUNCTION public.community_profiles_before_write();

-- ------------------------------------------------------------ categories
CREATE TABLE community_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    slug        TEXT NOT NULL CHECK (slug ~ '^[a-z0-9-]{2,40}$'),
    name        TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 40),
    description TEXT CHECK (description IS NULL OR length(description) <= 200),
    is_active   BOOLEAN NOT NULL DEFAULT true,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (org_id, slug)
);

ALTER TABLE community_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view categories"
    ON community_categories FOR SELECT
    USING (org_id = get_user_org());

CREATE POLICY "Admins insert org categories"
    ON community_categories FOR INSERT
    WITH CHECK (community_is_admin() AND org_id = get_user_org());

CREATE POLICY "Admins update org categories"
    ON community_categories FOR UPDATE
    USING (community_is_admin() AND org_id = get_user_org())
    WITH CHECK (community_is_admin() AND org_id = get_user_org());

-- No DELETE policy: categories are deactivated, never deleted, so existing
-- posts keep a valid category.

CREATE OR REPLACE FUNCTION public.community_seed_categories(p_org_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    INSERT INTO community_categories (org_id, slug, name, description, sort_order) VALUES
        (p_org_id, 'technical-help', 'Technical Help', 'Bugs, code, infrastructure and debugging', 1),
        (p_org_id, 'career-development', 'Career Development', 'Growth, feedback, mentoring and goals', 2),
        (p_org_id, 'tools-software', 'Tools & Software', 'Apps, licences, setup and shortcuts', 3),
        (p_org_id, 'company-processes', 'Company Processes', 'Policies, approvals and how things work here', 4),
        (p_org_id, 'learning-training', 'Learning & Training', 'Courses, certifications and resources', 5),
        (p_org_id, 'project-collaboration', 'Project Collaboration', 'Find collaborators and coordinate work', 6),
        (p_org_id, 'workplace-tips', 'Workplace Tips', 'Productivity, remote work and wellbeing', 7),
        (p_org_id, 'general', 'General Discussion', 'Everything else', 8)
    ON CONFLICT (org_id, slug) DO NOTHING;
$$;

REVOKE EXECUTE ON FUNCTION public.community_seed_categories(UUID) FROM PUBLIC, anon, authenticated;

SELECT community_seed_categories(id) FROM organizations;

CREATE OR REPLACE FUNCTION public.community_on_org_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM community_seed_categories(NEW.id);
    RETURN NEW;
END;
$$;

CREATE TRIGGER community_on_org_created
    AFTER INSERT ON organizations
    FOR EACH ROW EXECUTE FUNCTION public.community_on_org_created();

-- ------------------------------------------------------------ posts
CREATE TABLE community_posts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    author_id           UUID NOT NULL DEFAULT auth.uid() REFERENCES users(id) ON DELETE CASCADE,
    category_id         UUID NOT NULL REFERENCES community_categories(id),
    type                TEXT NOT NULL CHECK (type IN ('question', 'discussion', 'tip', 'announcement')),
    title               TEXT NOT NULL CHECK (length(title) BETWEEN 8 AND 150),
    body                TEXT NOT NULL CHECK (length(body) BETWEEN 20 AND 10000),
    tags                TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(tags) <= 5),
    -- Only questions have a lifecycle; NULL for every other type.
    status              TEXT CHECK (status IN ('open', 'answered', 'resolved')),
    accepted_comment_id UUID,
    like_count          INTEGER NOT NULL DEFAULT 0 CHECK (like_count >= 0),
    comment_count       INTEGER NOT NULL DEFAULT 0 CHECK (comment_count >= 0),
    -- Gravity-style ranking: engagement plus a time component, recomputed
    -- whenever counts change so "Trending" is a plain indexed sort.
    hot_score           DOUBLE PRECISION NOT NULL DEFAULT 0,
    is_hidden           BOOLEAN NOT NULL DEFAULT false,
    hidden_reason       TEXT,
    hidden_by           UUID REFERENCES users(id) ON DELETE SET NULL,
    hidden_at           TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    edited_at           TIMESTAMPTZ,
    last_activity_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Feed cards read this instead of the full body.
    excerpt             TEXT GENERATED ALWAYS AS (left(body, 280)) STORED,
    search_vector       TSVECTOR GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(body, '')), 'B')
    ) STORED,
    CONSTRAINT community_posts_status_matches_type CHECK (
        (type = 'question' AND status IS NOT NULL) OR (type <> 'question' AND status IS NULL)
    ),
    CONSTRAINT community_posts_accepted_only_resolved CHECK (
        accepted_comment_id IS NULL OR status = 'resolved'
    )
);

CREATE INDEX idx_community_posts_org_created ON community_posts(org_id, created_at DESC);
CREATE INDEX idx_community_posts_org_hot ON community_posts(org_id, hot_score DESC);
CREATE INDEX idx_community_posts_org_type_status ON community_posts(org_id, type, status, created_at DESC);
CREATE INDEX idx_community_posts_author ON community_posts(author_id, created_at DESC);
CREATE INDEX idx_community_posts_category ON community_posts(category_id);
CREATE INDEX idx_community_posts_tags ON community_posts USING GIN (tags);
CREATE INDEX idx_community_posts_search ON community_posts USING GIN (search_vector);

CREATE OR REPLACE FUNCTION public.community_hot_score(p_likes INTEGER, p_comments INTEGER, p_created TIMESTAMPTZ)
RETURNS DOUBLE PRECISION
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
    -- log10 dampens big numbers; every 12.5h of age is worth one order of
    -- magnitude of engagement.
    SELECT log(10, greatest(1, p_likes * 2 + p_comments * 3 + 1)::numeric)::double precision
           + (extract(epoch FROM p_created) / 45000.0)::double precision;
$$;

-- ------------------------------------------------------------ comments
CREATE TABLE community_comments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id     UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    author_id   UUID NOT NULL DEFAULT auth.uid() REFERENCES users(id) ON DELETE CASCADE,
    parent_id   UUID REFERENCES community_comments(id) ON DELETE CASCADE,
    -- 0 = answer/comment, 1 = reply, 2 = reply-to-reply. Deeper replies are
    -- attached to the depth-2 ancestor's parent instead of nesting further.
    depth       SMALLINT NOT NULL DEFAULT 0 CHECK (depth BETWEEN 0 AND 2),
    body        TEXT NOT NULL CHECK (length(body) <= 5000),
    like_count  INTEGER NOT NULL DEFAULT 0 CHECK (like_count >= 0),
    -- Soft-deleted when it still has replies, so threads keep their shape.
    is_deleted  BOOLEAN NOT NULL DEFAULT false,
    is_hidden   BOOLEAN NOT NULL DEFAULT false,
    hidden_reason TEXT,
    hidden_by   UUID REFERENCES users(id) ON DELETE SET NULL,
    hidden_at   TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    edited_at   TIMESTAMPTZ,
    -- Lets the composite FK below prove an accepted answer belongs to its
    -- own question.
    UNIQUE (id, post_id),
    CONSTRAINT community_comments_body_present CHECK (is_deleted OR length(trim(body)) >= 1)
);

CREATE INDEX idx_community_comments_post ON community_comments(post_id, created_at);
CREATE INDEX idx_community_comments_parent ON community_comments(parent_id);
CREATE INDEX idx_community_comments_author ON community_comments(author_id, created_at DESC);

-- Accepted-answer integrity: the accepted comment must be a comment on the
-- same post. ON DELETE SET NULL (accepted_comment_id) is handled by the
-- comment-delete trigger, which also re-opens the question.
ALTER TABLE community_posts
    ADD CONSTRAINT community_posts_accepted_comment_fk
    FOREIGN KEY (accepted_comment_id, id)
    REFERENCES community_comments(id, post_id)
    DEFERRABLE INITIALLY DEFERRED;

-- ------------------------------------------------------------ likes & bookmarks
CREATE TABLE community_post_likes (
    post_id     UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL DEFAULT auth.uid() REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (post_id, user_id)
);
CREATE INDEX idx_community_post_likes_user ON community_post_likes(user_id);

CREATE TABLE community_comment_likes (
    comment_id  UUID NOT NULL REFERENCES community_comments(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL DEFAULT auth.uid() REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (comment_id, user_id)
);
CREATE INDEX idx_community_comment_likes_user ON community_comment_likes(user_id);

CREATE TABLE community_bookmarks (
    post_id     UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL DEFAULT auth.uid() REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (post_id, user_id)
);
CREATE INDEX idx_community_bookmarks_user ON community_bookmarks(user_id, created_at DESC);

-- ------------------------------------------------------------ post triggers
CREATE OR REPLACE FUNCTION public.community_posts_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF is_api_client() THEN
        NEW.author_id := auth.uid();
    END IF;

    NEW.org_id := (SELECT org_id FROM users WHERE id = NEW.author_id);
    IF NEW.org_id IS NULL THEN
        RAISE EXCEPTION 'You must belong to an organization to post' USING ERRCODE = '42501';
    END IF;

    IF NEW.type = 'announcement'
       AND NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.author_id AND role = 'admin') THEN
        RAISE EXCEPTION 'Only HR admins can post announcements' USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM community_categories
        WHERE id = NEW.category_id AND org_id = NEW.org_id AND is_active
    ) THEN
        RAISE EXCEPTION 'Choose a valid category';
    END IF;

    NEW.title := regexp_replace(trim(NEW.title), '\s+', ' ', 'g');
    NEW.body := trim(NEW.body);
    NEW.tags := community_clean_tags(NEW.tags);
    IF EXISTS (SELECT 1 FROM unnest(NEW.tags) t WHERE length(t) > 30) THEN
        RAISE EXCEPTION 'Each tag must be 30 characters or fewer';
    END IF;

    NEW.status := CASE WHEN NEW.type = 'question' THEN 'open' ELSE NULL END;
    NEW.accepted_comment_id := NULL;
    NEW.like_count := 0;
    NEW.comment_count := 0;
    NEW.is_hidden := false;
    NEW.hidden_reason := NULL;
    NEW.hidden_by := NULL;
    NEW.hidden_at := NULL;
    NEW.created_at := now();
    NEW.updated_at := now();
    NEW.edited_at := NULL;
    NEW.last_activity_at := now();
    NEW.hot_score := community_hot_score(0, 0, NEW.created_at);
    RETURN NEW;
END;
$$;

CREATE TRIGGER community_posts_before_insert
    BEFORE INSERT ON community_posts
    FOR EACH ROW EXECUTE FUNCTION public.community_posts_before_insert();

-- Simple duplicate/spam guard: the same author can't post an identical
-- title twice within 10 minutes (e.g. a double-submitted form).
CREATE OR REPLACE FUNCTION public.community_posts_dedupe()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM community_posts
        WHERE author_id = NEW.author_id
          AND lower(title) = lower(NEW.title)
          AND created_at > now() - INTERVAL '10 minutes'
          AND id <> NEW.id
    ) THEN
        RAISE EXCEPTION 'You just posted this — check your recent posts' USING ERRCODE = '23505';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER community_posts_dedupe
    BEFORE INSERT ON community_posts
    FOR EACH ROW EXECUTE FUNCTION public.community_posts_dedupe();

CREATE OR REPLACE FUNCTION public.community_posts_before_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF is_api_client() THEN
        -- Authors may edit content only. Lifecycle, counters and moderation
        -- go through community_* RPCs.
        IF NEW.id IS DISTINCT FROM OLD.id
           OR NEW.org_id IS DISTINCT FROM OLD.org_id
           OR NEW.author_id IS DISTINCT FROM OLD.author_id
           OR NEW.type IS DISTINCT FROM OLD.type
           OR NEW.status IS DISTINCT FROM OLD.status
           OR NEW.accepted_comment_id IS DISTINCT FROM OLD.accepted_comment_id
           OR NEW.like_count IS DISTINCT FROM OLD.like_count
           OR NEW.comment_count IS DISTINCT FROM OLD.comment_count
           OR NEW.hot_score IS DISTINCT FROM OLD.hot_score
           OR NEW.is_hidden IS DISTINCT FROM OLD.is_hidden
           OR NEW.hidden_reason IS DISTINCT FROM OLD.hidden_reason
           OR NEW.hidden_by IS DISTINCT FROM OLD.hidden_by
           OR NEW.hidden_at IS DISTINCT FROM OLD.hidden_at
           OR NEW.created_at IS DISTINCT FROM OLD.created_at
           OR NEW.last_activity_at IS DISTINCT FROM OLD.last_activity_at THEN
            RAISE EXCEPTION 'Only the title, description, category and tags can be edited'
                USING ERRCODE = '42501';
        END IF;

        IF NEW.category_id IS DISTINCT FROM OLD.category_id AND NOT EXISTS (
            SELECT 1 FROM community_categories
            WHERE id = NEW.category_id AND org_id = NEW.org_id AND is_active
        ) THEN
            RAISE EXCEPTION 'Choose a valid category';
        END IF;

        NEW.title := regexp_replace(trim(NEW.title), '\s+', ' ', 'g');
        NEW.body := trim(NEW.body);
        NEW.tags := community_clean_tags(NEW.tags);
        IF EXISTS (SELECT 1 FROM unnest(NEW.tags) t WHERE length(t) > 30) THEN
            RAISE EXCEPTION 'Each tag must be 30 characters or fewer';
        END IF;

        IF NEW.title IS DISTINCT FROM OLD.title OR NEW.body IS DISTINCT FROM OLD.body
           OR NEW.tags IS DISTINCT FROM OLD.tags OR NEW.category_id IS DISTINCT FROM OLD.category_id THEN
            NEW.edited_at := now();
        END IF;
    END IF;

    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER community_posts_before_update
    BEFORE UPDATE ON community_posts
    FOR EACH ROW EXECUTE FUNCTION public.community_posts_before_update();

-- ------------------------------------------------------------ comment triggers
CREATE OR REPLACE FUNCTION public.community_comments_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_post community_posts%ROWTYPE;
    v_parent community_comments%ROWTYPE;
BEGIN
    IF is_api_client() THEN
        NEW.author_id := auth.uid();
    END IF;

    SELECT * INTO v_post FROM community_posts WHERE id = NEW.post_id;
    IF NOT FOUND OR v_post.is_hidden
       OR v_post.org_id IS DISTINCT FROM (SELECT org_id FROM users WHERE id = NEW.author_id) THEN
        RAISE EXCEPTION 'Post not found' USING ERRCODE = '42501';
    END IF;

    NEW.org_id := v_post.org_id;
    NEW.depth := 0;

    IF NEW.parent_id IS NOT NULL THEN
        SELECT * INTO v_parent FROM community_comments WHERE id = NEW.parent_id;
        IF NOT FOUND OR v_parent.post_id <> NEW.post_id THEN
            RAISE EXCEPTION 'Reply target not found';
        END IF;
        IF v_parent.is_deleted OR v_parent.is_hidden THEN
            RAISE EXCEPTION 'You cannot reply to a removed comment';
        END IF;
        IF v_parent.depth >= 2 THEN
            -- Flatten: answer alongside the deepest reply instead of under it.
            NEW.parent_id := v_parent.parent_id;
            NEW.depth := 2;
        ELSE
            NEW.depth := v_parent.depth + 1;
        END IF;
    END IF;

    NEW.body := trim(NEW.body);
    IF length(NEW.body) < 2 THEN
        RAISE EXCEPTION 'Comment is too short';
    END IF;
    NEW.like_count := 0;
    NEW.is_deleted := false;
    NEW.is_hidden := false;
    NEW.hidden_reason := NULL;
    NEW.hidden_by := NULL;
    NEW.hidden_at := NULL;
    NEW.created_at := now();
    NEW.updated_at := now();
    NEW.edited_at := NULL;
    RETURN NEW;
END;
$$;

CREATE TRIGGER community_comments_before_insert
    BEFORE INSERT ON community_comments
    FOR EACH ROW EXECUTE FUNCTION public.community_comments_before_insert();

CREATE OR REPLACE FUNCTION public.community_comments_before_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF is_api_client() THEN
        IF NEW.id IS DISTINCT FROM OLD.id
           OR NEW.post_id IS DISTINCT FROM OLD.post_id
           OR NEW.org_id IS DISTINCT FROM OLD.org_id
           OR NEW.author_id IS DISTINCT FROM OLD.author_id
           OR NEW.parent_id IS DISTINCT FROM OLD.parent_id
           OR NEW.depth IS DISTINCT FROM OLD.depth
           OR NEW.like_count IS DISTINCT FROM OLD.like_count
           OR NEW.is_deleted IS DISTINCT FROM OLD.is_deleted
           OR NEW.is_hidden IS DISTINCT FROM OLD.is_hidden
           OR NEW.hidden_reason IS DISTINCT FROM OLD.hidden_reason
           OR NEW.hidden_by IS DISTINCT FROM OLD.hidden_by
           OR NEW.hidden_at IS DISTINCT FROM OLD.hidden_at
           OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
            RAISE EXCEPTION 'Only the comment text can be edited' USING ERRCODE = '42501';
        END IF;
        IF OLD.is_deleted THEN
            RAISE EXCEPTION 'This comment was deleted' USING ERRCODE = '42501';
        END IF;
        NEW.body := trim(NEW.body);
        IF length(NEW.body) < 2 THEN
            RAISE EXCEPTION 'Comment is too short';
        END IF;
        IF NEW.body IS DISTINCT FROM OLD.body THEN
            NEW.edited_at := now();
        END IF;
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER community_comments_before_update
    BEFORE UPDATE ON community_comments
    FOR EACH ROW EXECUTE FUNCTION public.community_comments_before_update();

-- Deleting a comment that has replies keeps a "[deleted]" placeholder so
-- the replies stay attached; a leaf comment is removed outright.
-- SECURITY DEFINER so the placeholder UPDATE isn't blocked by the
-- client-edit rules above.
CREATE OR REPLACE FUNCTION public.community_comments_before_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF pg_trigger_depth() = 1
       AND EXISTS (SELECT 1 FROM community_comments WHERE parent_id = OLD.id)
       AND EXISTS (SELECT 1 FROM community_posts WHERE id = OLD.post_id) THEN
        UPDATE community_comments
        SET is_deleted = true, body = '', edited_at = NULL
        WHERE id = OLD.id;
        RETURN NULL;  -- skip the physical delete
    END IF;
    RETURN OLD;
END;
$$;

-- Shared clean-up when a comment stops counting (deleted, soft-deleted or
-- hidden): un-accept it and recompute the question's status.
CREATE OR REPLACE FUNCTION public.community_on_comment_removed(p_comment_id UUID, p_post_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE community_posts
    SET accepted_comment_id = NULL,
        status = 'open'
    WHERE id = p_post_id AND accepted_comment_id = p_comment_id;

    PERFORM community_refresh_question_status(p_post_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.community_refresh_question_status(p_post_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE community_posts p
    SET status = CASE
            WHEN EXISTS (
                SELECT 1 FROM community_comments c
                WHERE c.post_id = p.id AND c.author_id <> p.author_id
                  AND NOT c.is_deleted AND NOT c.is_hidden
            ) THEN 'answered'
            ELSE 'open'
        END
    WHERE p.id = p_post_id AND p.type = 'question' AND p.status <> 'resolved';
END;
$$;

CREATE TRIGGER community_comments_before_delete
    BEFORE DELETE ON community_comments
    FOR EACH ROW EXECUTE FUNCTION public.community_comments_before_delete();

-- Keeps comment_count / hot_score / question status in step with comments.
CREATE OR REPLACE FUNCTION public.community_comments_after_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_post_id UUID := COALESCE(NEW.post_id, OLD.post_id);
BEGIN
    UPDATE community_posts p
    SET comment_count = sub.cnt,
        hot_score = community_hot_score(p.like_count, sub.cnt, p.created_at),
        last_activity_at = CASE WHEN TG_OP = 'INSERT' THEN now() ELSE p.last_activity_at END
    FROM (
        SELECT count(*)::int AS cnt FROM community_comments
        WHERE post_id = v_post_id AND NOT is_deleted AND NOT is_hidden
    ) sub
    WHERE p.id = v_post_id;

    IF TG_OP = 'DELETE' THEN
        PERFORM community_on_comment_removed(OLD.id, OLD.post_id);
    ELSIF TG_OP = 'UPDATE' AND (NEW.is_deleted OR NEW.is_hidden) THEN
        PERFORM community_on_comment_removed(NEW.id, NEW.post_id);
    ELSE
        PERFORM community_refresh_question_status(v_post_id);
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER community_comments_after_change
    AFTER INSERT OR DELETE OR UPDATE OF is_deleted, is_hidden ON community_comments
    FOR EACH ROW EXECUTE FUNCTION public.community_comments_after_change();

-- ------------------------------------------------------------ like triggers
CREATE OR REPLACE FUNCTION public.community_likes_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_author UUID;
    v_org UUID;
    v_blocked BOOLEAN;
BEGIN
    IF is_api_client() THEN
        NEW.user_id := auth.uid();
    END IF;

    IF TG_TABLE_NAME = 'community_post_likes' THEN
        SELECT author_id, org_id, is_hidden INTO v_author, v_org, v_blocked
        FROM community_posts WHERE id = NEW.post_id;
    ELSE
        SELECT author_id, org_id, (is_hidden OR is_deleted) INTO v_author, v_org, v_blocked
        FROM community_comments WHERE id = NEW.comment_id;
    END IF;

    IF v_org IS NULL OR v_blocked
       OR v_org IS DISTINCT FROM (SELECT org_id FROM users WHERE id = NEW.user_id) THEN
        RAISE EXCEPTION 'Content not found' USING ERRCODE = '42501';
    END IF;

    IF v_author = NEW.user_id THEN
        RAISE EXCEPTION 'You cannot appreciate your own contribution' USING ERRCODE = '42501';
    END IF;

    NEW.created_at := now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER community_post_likes_before_insert
    BEFORE INSERT ON community_post_likes
    FOR EACH ROW EXECUTE FUNCTION public.community_likes_before_insert();

CREATE TRIGGER community_comment_likes_before_insert
    BEFORE INSERT ON community_comment_likes
    FOR EACH ROW EXECUTE FUNCTION public.community_likes_before_insert();

CREATE OR REPLACE FUNCTION public.community_post_likes_after_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_post_id UUID := COALESCE(NEW.post_id, OLD.post_id);
BEGIN
    UPDATE community_posts p
    SET like_count = sub.cnt,
        hot_score = community_hot_score(sub.cnt, p.comment_count, p.created_at)
    FROM (SELECT count(*)::int AS cnt FROM community_post_likes WHERE post_id = v_post_id) sub
    WHERE p.id = v_post_id;
    RETURN NULL;
END;
$$;

CREATE TRIGGER community_post_likes_after_change
    AFTER INSERT OR DELETE ON community_post_likes
    FOR EACH ROW EXECUTE FUNCTION public.community_post_likes_after_change();

CREATE OR REPLACE FUNCTION public.community_comment_likes_after_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_comment_id UUID := COALESCE(NEW.comment_id, OLD.comment_id);
BEGIN
    UPDATE community_comments c
    SET like_count = (SELECT count(*)::int FROM community_comment_likes WHERE comment_id = v_comment_id)
    WHERE c.id = v_comment_id;
    RETURN NULL;
END;
$$;

CREATE TRIGGER community_comment_likes_after_change
    AFTER INSERT OR DELETE ON community_comment_likes
    FOR EACH ROW EXECUTE FUNCTION public.community_comment_likes_after_change();

CREATE OR REPLACE FUNCTION public.community_bookmarks_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF is_api_client() THEN
        NEW.user_id := auth.uid();
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM community_posts p
        WHERE p.id = NEW.post_id
          AND p.org_id = (SELECT org_id FROM users WHERE id = NEW.user_id)
          AND NOT p.is_hidden
    ) THEN
        RAISE EXCEPTION 'Post not found' USING ERRCODE = '42501';
    END IF;
    NEW.created_at := now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER community_bookmarks_before_insert
    BEFORE INSERT ON community_bookmarks
    FOR EACH ROW EXECUTE FUNCTION public.community_bookmarks_before_insert();

-- ------------------------------------------------------------ RLS
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_bookmarks ENABLE ROW LEVEL SECURITY;

-- Posts: everyone in the org sees visible posts; hidden posts stay visible
-- to their author (with a "hidden by moderator" banner) and to HR.
CREATE POLICY "Org members view posts"
    ON community_posts FOR SELECT
    USING (
        org_id = get_user_org()
        AND (NOT is_hidden OR author_id = auth.uid() OR community_is_admin())
    );

CREATE POLICY "Members create own posts"
    ON community_posts FOR INSERT
    WITH CHECK (author_id = auth.uid() AND org_id = get_user_org());

CREATE POLICY "Authors edit own posts"
    ON community_posts FOR UPDATE
    USING (author_id = auth.uid() AND org_id = get_user_org())
    WITH CHECK (author_id = auth.uid() AND org_id = get_user_org());

CREATE POLICY "Authors delete own posts"
    ON community_posts FOR DELETE
    USING (author_id = auth.uid() AND org_id = get_user_org());

-- Comments: visible if the parent post is visible to the caller (that
-- sub-select is itself RLS-filtered on community_posts — no recursion).
CREATE POLICY "Org members view comments"
    ON community_comments FOR SELECT
    USING (
        org_id = get_user_org()
        AND (NOT is_hidden OR author_id = auth.uid() OR community_is_admin())
        AND EXISTS (SELECT 1 FROM community_posts p WHERE p.id = community_comments.post_id)
    );

CREATE POLICY "Members create own comments"
    ON community_comments FOR INSERT
    WITH CHECK (author_id = auth.uid() AND org_id = get_user_org());

CREATE POLICY "Authors edit own comments"
    ON community_comments FOR UPDATE
    USING (author_id = auth.uid() AND org_id = get_user_org())
    WITH CHECK (author_id = auth.uid() AND org_id = get_user_org());

CREATE POLICY "Authors delete own comments"
    ON community_comments FOR DELETE
    USING (author_id = auth.uid() AND org_id = get_user_org());

-- Likes and bookmarks are private relationships: a user only ever sees
-- their own rows (aggregate counts live on the post/comment).
CREATE POLICY "Users view own post likes" ON community_post_likes
    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users add own post likes" ON community_post_likes
    FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users remove own post likes" ON community_post_likes
    FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Users view own comment likes" ON community_comment_likes
    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users add own comment likes" ON community_comment_likes
    FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users remove own comment likes" ON community_comment_likes
    FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Users view own bookmarks" ON community_bookmarks
    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users add own bookmarks" ON community_bookmarks
    FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users remove own bookmarks" ON community_bookmarks
    FOR DELETE USING (user_id = auth.uid());

-- ------------------------------------------------------------ question lifecycle RPCs
-- Accept an answer. Only the question's author (or HR in the same org) may
-- do this, and the comment must be a live top-level-or-reply comment on
-- that same question. The composite FK above enforces the latter at the
-- storage level too.
CREATE OR REPLACE FUNCTION public.community_accept_answer(p_comment_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_comment community_comments%ROWTYPE;
    v_post community_posts%ROWTYPE;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_comment FROM community_comments WHERE id = p_comment_id;
    IF NOT FOUND OR v_comment.is_deleted OR v_comment.is_hidden THEN
        RAISE EXCEPTION 'Answer not found';
    END IF;

    SELECT * INTO v_post FROM community_posts WHERE id = v_comment.post_id FOR UPDATE;
    IF v_post.org_id IS DISTINCT FROM get_user_org() THEN
        RAISE EXCEPTION 'Answer not found';
    END IF;
    IF v_post.type <> 'question' THEN
        RAISE EXCEPTION 'Only questions can have an accepted answer';
    END IF;
    IF v_post.author_id <> auth.uid() AND NOT community_is_admin() THEN
        RAISE EXCEPTION 'Only the person who asked can accept an answer' USING ERRCODE = '42501';
    END IF;
    IF v_post.is_hidden THEN
        RAISE EXCEPTION 'This question has been hidden by a moderator';
    END IF;

    UPDATE community_posts
    SET accepted_comment_id = v_comment.id,
        status = 'resolved',
        last_activity_at = now()
    WHERE id = v_post.id;

    RETURN json_build_object('success', true, 'post_id', v_post.id, 'accepted_comment_id', v_comment.id);
END;
$$;

-- Re-open a resolved question (clears the accepted answer).
CREATE OR REPLACE FUNCTION public.community_reopen_question(p_post_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_post community_posts%ROWTYPE;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_post FROM community_posts WHERE id = p_post_id FOR UPDATE;
    IF NOT FOUND OR v_post.org_id IS DISTINCT FROM get_user_org() THEN
        RAISE EXCEPTION 'Question not found';
    END IF;
    IF v_post.type <> 'question' THEN
        RAISE EXCEPTION 'Only questions can be reopened';
    END IF;
    IF v_post.author_id <> auth.uid() AND NOT community_is_admin() THEN
        RAISE EXCEPTION 'Only the person who asked can reopen this question' USING ERRCODE = '42501';
    END IF;

    UPDATE community_posts
    SET accepted_comment_id = NULL, status = 'open', last_activity_at = now()
    WHERE id = p_post_id;

    PERFORM community_refresh_question_status(p_post_id);

    RETURN json_build_object('success', true, 'post_id', p_post_id);
END;
$$;

-- ------------------------------------------------------------ grants
-- Internal helpers are not part of the API surface.
REVOKE EXECUTE ON FUNCTION public.community_on_comment_removed(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.community_refresh_question_status(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.community_accept_answer(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.community_reopen_question(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_accept_answer(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_reopen_question(UUID) TO authenticated;

-- Supabase grants table privileges to anon by default; the community is
-- for signed-in employees only, so take them away explicitly. RLS would
-- already return nothing (get_user_org() is NULL for anon) — this is
-- defence in depth.
REVOKE ALL ON community_profiles, community_categories, community_posts, community_comments,
    community_post_likes, community_comment_likes, community_bookmarks FROM anon;
