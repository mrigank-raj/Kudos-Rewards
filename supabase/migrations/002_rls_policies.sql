-- ============================================================
-- 002_rls_policies.sql
-- Kudos R&R Platform — Row Level Security Policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kudos ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ORGANIZATIONS
-- ============================================================

-- Users can view their own organization
CREATE POLICY "Users can view own organization"
    ON organizations FOR SELECT
    USING (
        id IN (SELECT org_id FROM users WHERE users.id = auth.uid())
    );

-- ============================================================
-- USERS
-- ============================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON users FOR SELECT
    USING (id = auth.uid());

-- Admins can view all users in their organization
CREATE POLICY "Admins can view org users"
    ON users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
            AND u.org_id = users.org_id
        )
    );

-- Users can update their own profile (avatar, name)
CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Allow insert during signup (user creates their own profile)
CREATE POLICY "Users can insert own profile"
    ON users FOR INSERT
    WITH CHECK (id = auth.uid());

-- ============================================================
-- REWARD PROGRAMS
-- ============================================================

-- Admins can perform all operations on programs within their org
CREATE POLICY "Admins manage programs"
    ON reward_programs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
            AND u.org_id = reward_programs.org_id
        )
    );

-- Recipients can view active programs in their org
CREATE POLICY "Recipients view active programs"
    ON reward_programs FOR SELECT
    USING (
        is_active = true
        AND EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.org_id = reward_programs.org_id
        )
    );

-- ============================================================
-- TRANSACTIONS
-- ============================================================

-- Users can view their own transactions
CREATE POLICY "Users view own transactions"
    ON transactions FOR SELECT
    USING (user_id = auth.uid());

-- Admins can view all transactions in their org
CREATE POLICY "Admins view org transactions"
    ON transactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
            AND u.org_id = (SELECT org_id FROM users WHERE id = transactions.user_id)
        )
    );

-- Admins can insert transactions (manual credit/debit)
CREATE POLICY "Admins can insert transactions"
    ON transactions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

-- System can insert transactions (via RPC functions using service role)
-- This is handled by the RPC functions running with SECURITY DEFINER

-- ============================================================
-- CATALOG ITEMS
-- ============================================================

-- Everyone can view catalog items (public catalog)
CREATE POLICY "Anyone can view catalog"
    ON catalog_items FOR SELECT
    USING (true);

-- Admins can manage catalog items
CREATE POLICY "Admins can manage catalog"
    ON catalog_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

-- ============================================================
-- REDEMPTIONS
-- ============================================================

-- Users can view their own redemptions
CREATE POLICY "Users view own redemptions"
    ON redemptions FOR SELECT
    USING (user_id = auth.uid());

-- Admins can view all redemptions in their org
CREATE POLICY "Admins view org redemptions"
    ON redemptions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
            AND u.org_id = (SELECT org_id FROM users WHERE id = redemptions.user_id)
        )
    );

-- Users can create redemptions for themselves
CREATE POLICY "Users can redeem for themselves"
    ON redemptions FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- ============================================================
-- KUDOS (Stretch Goal)
-- ============================================================

-- Users can view kudos they sent or received
CREATE POLICY "Users view own kudos"
    ON kudos FOR SELECT
    USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

-- Users can send kudos
CREATE POLICY "Users can send kudos"
    ON kudos FOR INSERT
    WITH CHECK (from_user_id = auth.uid());

-- Admins can view all kudos in their org
CREATE POLICY "Admins view org kudos"
    ON kudos FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
            AND u.org_id IN (
                SELECT org_id FROM users WHERE id = kudos.from_user_id
                UNION
                SELECT org_id FROM users WHERE id = kudos.to_user_id
            )
        )
    );
