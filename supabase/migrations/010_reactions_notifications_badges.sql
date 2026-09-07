-- ============================================================
-- 010_reactions_notifications_badges.sql
-- Kudos R&R Platform — Reactions, in-app notifications, badges
-- ============================================================

-- ------------------------------------------------------------ kudos org visibility fix
-- Same class of bug as 009: `kudos` only had "view own" (sender/receiver)
-- and "admins view org" SELECT policies. The recipient dashboard's
-- "Company recognition" panel is explicitly labeled "Live across your
-- organization" and the README calls P2P kudos a "public shoutout"
-- feature, but under RLS as written a real recipient session could only
-- ever see kudos they personally sent or received — the org-wide feed
-- would silently come back near-empty for anyone but an admin.
CREATE POLICY "Org members view org kudos"
    ON kudos FOR SELECT
    USING (
        get_user_org() IN (
            SELECT org_id FROM users WHERE id = kudos.from_user_id
            UNION
            SELECT org_id FROM users WHERE id = kudos.to_user_id
        )
    );

-- ------------------------------------------------------------ reactions
CREATE TABLE kudos_reactions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kudos_id    UUID NOT NULL REFERENCES kudos(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji       TEXT NOT NULL CHECK (emoji IN ('👏', '🎉', '❤️', '🔥')),
    created_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE (kudos_id, user_id, emoji)
);

CREATE INDEX idx_kudos_reactions_kudos ON kudos_reactions(kudos_id);

ALTER TABLE kudos_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view kudos reactions"
    ON kudos_reactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM kudos k
            WHERE k.id = kudos_reactions.kudos_id
            AND get_user_org() IN (
                SELECT org_id FROM users WHERE id = k.from_user_id
                UNION
                SELECT org_id FROM users WHERE id = k.to_user_id
            )
        )
    );

CREATE POLICY "Users add own reactions"
    ON kudos_reactions FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users remove own reactions"
    ON kudos_reactions FOR DELETE
    USING (user_id = auth.uid());

-- ------------------------------------------------------------ notifications
CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        TEXT NOT NULL CHECK (type IN ('kudos_received', 'points_credited', 'redemption_status')),
    title       TEXT NOT NULL,
    body        TEXT,
    read        BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
    ON notifications FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users mark own notifications read"
    ON notifications FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Notifications are only ever created by these SECURITY DEFINER triggers,
-- never inserted directly by the client.
CREATE OR REPLACE FUNCTION notify_kudos_received()
RETURNS trigger AS $$
DECLARE
    v_sender_name TEXT;
BEGIN
    SELECT name INTO v_sender_name FROM users WHERE id = NEW.from_user_id;

    INSERT INTO notifications (user_id, type, title, body)
    VALUES (
        NEW.to_user_id,
        'kudos_received',
        COALESCE(v_sender_name, 'A teammate') || ' sent you kudos',
        NEW.message
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_kudos_created ON kudos;
CREATE TRIGGER on_kudos_created
    AFTER INSERT ON kudos
    FOR EACH ROW EXECUTE PROCEDURE notify_kudos_received();

CREATE OR REPLACE FUNCTION notify_points_credited()
RETURNS trigger AS $$
BEGIN
    -- Only manual admin credits — kudos-driven 'earn' rows are already
    -- covered by notify_kudos_received(), so this avoids a duplicate
    -- notification for the same event.
    IF NEW.type = 'manual_credit' THEN
        INSERT INTO notifications (user_id, type, title, body)
        VALUES (
            NEW.user_id,
            'points_credited',
            'You received ' || NEW.points || ' points',
            NEW.reason
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_transaction_created ON transactions;
CREATE TRIGGER on_transaction_created
    AFTER INSERT ON transactions
    FOR EACH ROW EXECUTE PROCEDURE notify_points_credited();

-- Enable Realtime on notifications so the frontend can subscribe instead
-- of polling — same primitive the app already uses for balance sync.
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

-- ------------------------------------------------------------ badges
CREATE TABLE badges (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key          TEXT UNIQUE NOT NULL,
    name         TEXT NOT NULL,
    description  TEXT NOT NULL,
    icon         TEXT NOT NULL -- lucide-react icon name, rendered client-side
);

CREATE TABLE user_badges (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id    UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    awarded_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, badge_id)
);

ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view badge definitions" ON badges FOR SELECT USING (true);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members view earned badges"
    ON user_badges FOR SELECT
    USING (user_id IN (SELECT id FROM users WHERE org_id = get_user_org()));

INSERT INTO badges (key, name, description, icon) VALUES
    ('first_kudos_sent', 'First Kudos', 'Sent your first kudos to a teammate', 'Sparkles'),
    ('team_player', 'Team Player', 'Sent 5 kudos to teammates', 'Users'),
    ('top_earner', 'Top Earner', 'Reached #1 on the leaderboard', 'Trophy')
ON CONFLICT (key) DO NOTHING;

-- Badges are awarded once and kept forever (no revocation) — this checks
-- whether p_user_id newly qualifies for any badge and awards what's due.
-- SECURITY DEFINER since there's no direct client INSERT policy on
-- user_badges; only this function and the RPCs below write to it.
CREATE OR REPLACE FUNCTION check_and_award_badges(p_user_id UUID)
RETURNS void AS $$
DECLARE
    v_kudos_sent_count INT;
    v_org_id UUID;
    v_top_user_id UUID;
BEGIN
    SELECT COUNT(*) INTO v_kudos_sent_count FROM kudos WHERE from_user_id = p_user_id;

    IF v_kudos_sent_count >= 1 THEN
        INSERT INTO user_badges (user_id, badge_id)
        SELECT p_user_id, id FROM badges WHERE key = 'first_kudos_sent'
        ON CONFLICT (user_id, badge_id) DO NOTHING;
    END IF;

    IF v_kudos_sent_count >= 5 THEN
        INSERT INTO user_badges (user_id, badge_id)
        SELECT p_user_id, id FROM badges WHERE key = 'team_player'
        ON CONFLICT (user_id, badge_id) DO NOTHING;
    END IF;

    SELECT org_id INTO v_org_id FROM users WHERE id = p_user_id;

    SELECT u.id INTO v_top_user_id
    FROM users u
    LEFT JOIN transactions t ON t.user_id = u.id
    WHERE u.role = 'recipient' AND u.org_id = v_org_id
    GROUP BY u.id
    ORDER BY COALESCE(SUM(CASE WHEN t.type IN ('earn', 'manual_credit') THEN t.points ELSE 0 END), 0) DESC
    LIMIT 1;

    IF v_top_user_id = p_user_id THEN
        INSERT INTO user_badges (user_id, badge_id)
        SELECT p_user_id, id FROM badges WHERE key = 'top_earner'
        ON CONFLICT (user_id, badge_id) DO NOTHING;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Wire badge checks into the two RPCs that can earn them.
CREATE OR REPLACE FUNCTION send_kudos(
    p_from_user_id UUID,
    p_to_user_id UUID,
    p_message TEXT,
    p_points INTEGER,
    p_tags TEXT[] DEFAULT '{}'
)
RETURNS JSON AS $$
DECLARE
    v_sender_balance INTEGER;
    v_receiver_balance INTEGER;
    v_kudos_id UUID;
    v_sender_name TEXT;
BEGIN
    IF p_from_user_id = p_to_user_id THEN
        RAISE EXCEPTION 'You cannot send kudos to yourself.';
    END IF;

    IF p_points < 0 THEN
        RAISE EXCEPTION 'Points must be 0 or greater.';
    END IF;

    IF p_message IS NULL OR TRIM(p_message) = '' THEN
        RAISE EXCEPTION 'A message is required.';
    END IF;

    IF p_points > 0 THEN
        SELECT points_balance INTO v_sender_balance
        FROM users WHERE id = p_from_user_id FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Sender not found.';
        END IF;

        IF v_sender_balance < p_points THEN
            RAISE EXCEPTION 'Insufficient balance to send % points.', p_points;
        END IF;
    END IF;

    PERFORM id FROM users WHERE id = p_to_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Receiver not found.';
    END IF;

    SELECT name INTO v_sender_name FROM users WHERE id = p_from_user_id;

    INSERT INTO kudos (from_user_id, to_user_id, message, points_included, tags)
    VALUES (p_from_user_id, p_to_user_id, p_message, p_points, COALESCE(p_tags, '{}'))
    RETURNING id INTO v_kudos_id;

    IF p_points > 0 THEN
        UPDATE users
        SET points_balance = points_balance - p_points
        WHERE id = p_from_user_id
        RETURNING points_balance INTO v_sender_balance;

        INSERT INTO transactions (user_id, type, points, reason)
        VALUES (p_from_user_id, 'manual_debit', -p_points, 'Sent Kudos');

        UPDATE users
        SET points_balance = points_balance + p_points
        WHERE id = p_to_user_id
        RETURNING points_balance INTO v_receiver_balance;

        INSERT INTO transactions (user_id, type, points, reason)
        VALUES (p_to_user_id, 'earn', p_points, 'Received Kudos from ' || v_sender_name);
    END IF;

    PERFORM check_and_award_badges(p_from_user_id);
    PERFORM check_and_award_badges(p_to_user_id);

    RETURN json_build_object(
        'success', true,
        'kudos_id', v_kudos_id,
        'points_sent', p_points
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION credit_points(
    p_user_id UUID,
    p_points INTEGER,
    p_reason TEXT,
    p_program_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_new_balance INTEGER;
BEGIN
    IF p_points <= 0 THEN
        RAISE EXCEPTION 'Points must be greater than 0';
    END IF;

    IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
        RAISE EXCEPTION 'Reason is required';
    END IF;

    INSERT INTO transactions (user_id, type, points, reason, program_id)
    VALUES (p_user_id, 'manual_credit', p_points, p_reason, p_program_id);

    UPDATE users
    SET points_balance = points_balance + p_points
    WHERE id = p_user_id
    RETURNING points_balance INTO v_new_balance;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    PERFORM check_and_award_badges(p_user_id);

    RETURN json_build_object(
        'success', true,
        'new_balance', v_new_balance,
        'points_credited', p_points
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
