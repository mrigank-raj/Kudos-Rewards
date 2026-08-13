-- ============================================================
-- 001_create_tables.sql
-- Kudos R&R Platform — Database Schema
-- ============================================================

-- Organizations
CREATE TABLE organizations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Users (extends Supabase auth.users)
CREATE TABLE users (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id          UUID REFERENCES organizations(id) ON DELETE SET NULL,
    name            TEXT NOT NULL,
    email           TEXT UNIQUE NOT NULL,
    role            TEXT NOT NULL CHECK (role IN ('admin', 'recipient')),
    points_balance  INTEGER NOT NULL DEFAULT 0,
    avatar_url      TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Reward Programs
CREATE TABLE reward_programs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT,
    trigger_type    TEXT NOT NULL CHECK (trigger_type IN ('manual', 'rule')),
    rule_metric     TEXT,
    rule_threshold  NUMERIC,
    points_value    INTEGER NOT NULL CHECK (points_value > 0),
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Transactions (point ledger — source of truth)
CREATE TABLE transactions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        TEXT NOT NULL CHECK (type IN ('earn', 'redeem', 'manual_credit', 'manual_debit')),
    points      INTEGER NOT NULL,
    reason      TEXT,
    program_id  UUID REFERENCES reward_programs(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Catalog Items (reward marketplace)
CREATE TABLE catalog_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    description TEXT,
    image_url   TEXT,
    points_cost INTEGER NOT NULL CHECK (points_cost > 0),
    category    TEXT NOT NULL CHECK (category IN ('gift_card', 'merchandise', 'experience'))
);

-- Redemptions
CREATE TABLE redemptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    catalog_item_id UUID NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
    points_spent    INTEGER NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'cancelled')),
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Kudos (stretch goal — peer-to-peer recognition)
CREATE TABLE kudos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message         TEXT,
    points_included INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Indexes for common query patterns
-- ============================================================

CREATE INDEX idx_users_org_id ON users(org_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_program_id ON transactions(program_id);
CREATE INDEX idx_reward_programs_org_id ON reward_programs(org_id);
CREATE INDEX idx_reward_programs_is_active ON reward_programs(is_active);
CREATE INDEX idx_redemptions_user_id ON redemptions(user_id);
CREATE INDEX idx_redemptions_status ON redemptions(status);
CREATE INDEX idx_kudos_to_user_id ON kudos(to_user_id);
CREATE INDEX idx_kudos_from_user_id ON kudos(from_user_id);
