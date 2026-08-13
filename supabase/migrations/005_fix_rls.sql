-- Fix Infinite Recursion on Users Table

-- 1. Create helper functions that bypass RLS to check permissions
CREATE OR REPLACE FUNCTION get_user_role() RETURNS text AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_user_org() RETURNS uuid AS $$
  SELECT org_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- 2. Drop the recursive policy
DROP POLICY IF EXISTS "Admins can view org users" ON public.users;

-- 3. Create the fixed policy using the helper functions
CREATE POLICY "Admins can view org users"
    ON public.users FOR SELECT
    USING (
        get_user_role() = 'admin'
        AND org_id = get_user_org()
    );
