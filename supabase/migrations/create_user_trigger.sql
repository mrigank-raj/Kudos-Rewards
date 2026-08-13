-- ============================================================
-- Automatically create public profile for new Supabase Auth users
-- ============================================================

-- 1. Create a function that automatically creates a recipient profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, org_id, name, email, role, points_balance, created_at)
  VALUES (
    new.id, 
    'a0000000-0000-0000-0000-000000000001', -- Acme Corp Org ID
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email, 
    'recipient', 
    500, -- Give them 500 starting points
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop the trigger if it exists (so you can re-run this safely)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
