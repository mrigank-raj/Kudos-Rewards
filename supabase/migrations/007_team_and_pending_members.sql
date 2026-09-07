-- ============================================================
-- 007_team_and_pending_members.sql
-- Kudos R&R Platform — Real team field + admin-added pending members
-- ============================================================
-- Context: the People page previously showed a hardcoded "Team" badge
-- on every user because no team concept existed in the schema. This
-- adds a real `team` field and a `pending_members` table so an admin
-- can pre-configure a teammate (name/email/team/role) before that
-- person has an actual login — they're promoted to a real `users` row
-- automatically the first time they sign up with a matching email.
-- ============================================================

-- ------------------------------------------------------------ team field
ALTER TABLE users
    ADD COLUMN team TEXT CHECK (team IN ('Design', 'Frontend', 'Backend', 'Product'));

-- ------------------------------------------------------------ pending members
CREATE TABLE pending_members (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL,
    role        TEXT NOT NULL CHECK (role IN ('admin', 'recipient')),
    team        TEXT CHECK (team IN ('Design', 'Frontend', 'Backend', 'Product')),
    invited_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE (org_id, email)
);

CREATE INDEX idx_pending_members_email ON pending_members(email);

ALTER TABLE pending_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage pending members"
    ON pending_members FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
            AND u.org_id = pending_members.org_id
        )
    );

-- ------------------------------------------------------------ trigger update
-- Supersedes create_user_trigger.sql: same auto-provisioning behaviour,
-- plus a lookup against pending_members so an admin-configured team/role
-- gets applied instead of the generic recipient/Acme Corp default.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    v_pending pending_members%ROWTYPE;
BEGIN
    SELECT * INTO v_pending FROM public.pending_members WHERE email = new.email LIMIT 1;

    IF FOUND THEN
        INSERT INTO public.users (id, org_id, name, email, role, team, points_balance, created_at)
        VALUES (
            new.id,
            v_pending.org_id,
            COALESCE(new.raw_user_meta_data->>'full_name', v_pending.name),
            new.email,
            v_pending.role,
            v_pending.team,
            500,
            now()
        )
        ON CONFLICT (id) DO NOTHING;

        DELETE FROM public.pending_members WHERE id = v_pending.id;
    ELSE
        INSERT INTO public.users (id, org_id, name, email, role, points_balance, created_at)
        VALUES (
            new.id,
            'a0000000-0000-0000-0000-000000000001', -- Acme Corp Org ID
            COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
            new.email,
            'recipient',
            500,
            now()
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ------------------------------------------------------------ placeholder team backfill
-- The real roster wasn't available yet at implementation time, so the
-- existing seed people are distributed across the four teams as
-- placeholders. Replace with real assignments once the roster is known.
UPDATE users SET team = 'Frontend' WHERE email IN ('priya@acme.com', 'james@acme.com', 'omar@acme.com');
UPDATE users SET team = 'Backend' WHERE email IN ('aisha@acme.com', 'david@acme.com', 'kenji@acme.com');
UPDATE users SET team = 'Design' WHERE email IN ('emma@acme.com', 'lisa@acme.com');
UPDATE users SET team = 'Product' WHERE email IN ('carlos@acme.com', 'rachel@acme.com');
