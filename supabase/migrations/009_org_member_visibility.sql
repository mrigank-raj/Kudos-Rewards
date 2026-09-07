-- ============================================================
-- 009_org_member_visibility.sql
-- Kudos R&R Platform — Recipients can see their co-workers
-- ============================================================
-- Real bug found while building the recipient-facing Leaderboard: the
-- only SELECT policies on `users` were "view own profile" and "admins
-- view org users" (002_rls_policies.sql / 005_fix_rls.sql). A recipient
-- has never been able to see any other user's row under RLS as written.
--
-- That's silently broken several already-shipped features for a real
-- (non-admin) session, not just this one: the P2P Kudos recipient picker
-- (`useKudos`'s `recipients` query excludes the caller, so it would
-- return nothing for a recipient), the kudos feed's sender/receiver
-- names (embedded `users` joins are RLS-scoped too), and now the
-- leaderboard. It likely went unnoticed because manual testing during
-- the redesign was done from the admin account, which already has org
-- read access.
--
-- Recognition products are inherently public-within-org (everyone's
-- points, kudos, and leaderboard rank are meant to be visible to
-- teammates) so the fix is a straightforward org-scoped read policy,
-- reusing the get_user_org() helper from 005_fix_rls.sql to avoid the
-- recursion issue that helper was written to solve.
CREATE POLICY "Org members can view each other"
    ON users FOR SELECT
    USING (org_id = get_user_org());
