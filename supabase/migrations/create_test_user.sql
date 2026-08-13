-- Run this in your Supabase SQL Editor to create a test recipient!
DO $$ 
DECLARE
  new_user_id UUID := gen_random_uuid();
  user_email TEXT := 'tester@acme.com';
  user_password TEXT := 'Password123!';
BEGIN
  -- 1. Create GoTrue User
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
    created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated', 'authenticated', 
    user_email, crypt(user_password, gen_salt('bf')), now(), now(), now()
  );

  -- 2. Create GoTrue Identity (REQUIRED for login!)
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), new_user_id, json_build_object('sub', new_user_id::text, 'email', user_email), 
    'email', new_user_id::text, now(), now()
  );

  -- 3. Create Public Profile in our users table
  INSERT INTO public.users (
    id, org_id, name, email, role, points_balance, created_at
  ) VALUES (
    new_user_id, 'a0000000-0000-0000-0000-000000000001', 'Test User', user_email, 'recipient', 500, now()
  );

END $$;
