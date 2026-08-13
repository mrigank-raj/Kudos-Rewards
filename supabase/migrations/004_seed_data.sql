-- ============================================================
-- 004_seed_data.sql
-- Kudos R&R Platform — Realistic Demo Data
-- ============================================================
-- IMPORTANT: Before running this script, you MUST manually create 
-- admin1@acme.com and priya@acme.com in the Supabase Authentication dashboard!
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create Organization
INSERT INTO organizations (id, name, created_at) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Acme Corp', '2025-01-15 09:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- 2. Create Dummy Auth Users (For the leaderboard)
-- These are the 10 users you WON'T log in as. We create them here so you don't have to do it manually.
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'admin1@acme.com', crypt('Demo1234!', gen_salt('bf')), now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'admin2@acme.com', crypt('Demo1234!', gen_salt('bf')), now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'priya@acme.com', crypt('Demo1234!', gen_salt('bf')), now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'james@acme.com', crypt('Demo1234!', gen_salt('bf')), now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'aisha@acme.com', crypt('Demo1234!', gen_salt('bf')), now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'david@acme.com', crypt('Demo1234!', gen_salt('bf')), now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'emma@acme.com', crypt('Demo1234!', gen_salt('bf')), now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'carlos@acme.com', crypt('Demo1234!', gen_salt('bf')), now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'lisa@acme.com', crypt('Demo1234!', gen_salt('bf')), now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'omar@acme.com', crypt('Demo1234!', gen_salt('bf')), now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'rachel@acme.com', crypt('Demo1234!', gen_salt('bf')), now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'kenji@acme.com', crypt('Demo1234!', gen_salt('bf')), now(), now(), now())
ON CONFLICT DO NOTHING;

-- 3. Create Public Profiles dynamically linking to whoever is in auth.users
INSERT INTO users (id, org_id, name, email, role, points_balance, created_at)
SELECT id, 'a0000000-0000-0000-0000-000000000001', 'Sarah Chen', email, 'admin', 0, '2025-01-15 09:00:00+00' FROM auth.users WHERE email = 'admin1@acme.com' ON CONFLICT DO NOTHING;

INSERT INTO users (id, org_id, name, email, role, points_balance, created_at)
SELECT id, 'a0000000-0000-0000-0000-000000000001', 'Marcus Rivera', email, 'admin', 0, '2025-01-16 10:00:00+00' FROM auth.users WHERE email = 'admin2@acme.com' ON CONFLICT DO NOTHING;

INSERT INTO users (id, org_id, name, email, role, points_balance, created_at)
SELECT id, 'a0000000-0000-0000-0000-000000000001', 'Priya Sharma', email, 'recipient', 2350, '2025-02-01 08:00:00+00' FROM auth.users WHERE email = 'priya@acme.com' ON CONFLICT DO NOTHING;

INSERT INTO users (id, org_id, name, email, role, points_balance, created_at)
SELECT id, 'a0000000-0000-0000-0000-000000000001', 'James Wilson', email, 'recipient', 1800, '2025-02-05 09:30:00+00' FROM auth.users WHERE email = 'james@acme.com' ON CONFLICT DO NOTHING;

INSERT INTO users (id, org_id, name, email, role, points_balance, created_at)
SELECT id, 'a0000000-0000-0000-0000-000000000001', 'Aisha Patel', email, 'recipient', 3100, '2025-02-10 10:00:00+00' FROM auth.users WHERE email = 'aisha@acme.com' ON CONFLICT DO NOTHING;

INSERT INTO users (id, org_id, name, email, role, points_balance, created_at)
SELECT id, 'a0000000-0000-0000-0000-000000000001', 'David Kim', email, 'recipient', 950, '2025-02-12 11:00:00+00' FROM auth.users WHERE email = 'david@acme.com' ON CONFLICT DO NOTHING;

INSERT INTO users (id, org_id, name, email, role, points_balance, created_at)
SELECT id, 'a0000000-0000-0000-0000-000000000001', 'Emma Thompson', email, 'recipient', 4200, '2025-03-01 08:00:00+00' FROM auth.users WHERE email = 'emma@acme.com' ON CONFLICT DO NOTHING;

INSERT INTO users (id, org_id, name, email, role, points_balance, created_at)
SELECT id, 'a0000000-0000-0000-0000-000000000001', 'Carlos Mendez', email, 'recipient', 1450, '2025-03-05 09:00:00+00' FROM auth.users WHERE email = 'carlos@acme.com' ON CONFLICT DO NOTHING;

INSERT INTO users (id, org_id, name, email, role, points_balance, created_at)
SELECT id, 'a0000000-0000-0000-0000-000000000001', 'Lisa Chang', email, 'recipient', 2800, '2025-03-10 10:00:00+00' FROM auth.users WHERE email = 'lisa@acme.com' ON CONFLICT DO NOTHING;

INSERT INTO users (id, org_id, name, email, role, points_balance, created_at)
SELECT id, 'a0000000-0000-0000-0000-000000000001', 'Omar Hassan', email, 'recipient', 600, '2025-04-01 08:00:00+00' FROM auth.users WHERE email = 'omar@acme.com' ON CONFLICT DO NOTHING;

INSERT INTO users (id, org_id, name, email, role, points_balance, created_at)
SELECT id, 'a0000000-0000-0000-0000-000000000001', 'Rachel Green', email, 'recipient', 1700, '2025-04-05 09:00:00+00' FROM auth.users WHERE email = 'rachel@acme.com' ON CONFLICT DO NOTHING;

INSERT INTO users (id, org_id, name, email, role, points_balance, created_at)
SELECT id, 'a0000000-0000-0000-0000-000000000001', 'Kenji Tanaka', email, 'recipient', 3500, '2025-04-10 10:00:00+00' FROM auth.users WHERE email = 'kenji@acme.com' ON CONFLICT DO NOTHING;


-- 4. Reward Programs
INSERT INTO reward_programs (id, org_id, name, description, trigger_type, rule_metric, rule_threshold, points_value, is_active, created_at) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Spot Bonus', 'Recognize exceptional work.', 'manual', NULL, NULL, 500, true, '2025-01-20 09:00:00+00'),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Sales Star', 'Automatically awarded for 10 deals.', 'rule', 'deals_closed', 10, 1000, true, '2025-01-25 10:00:00+00'),
  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Innovation Award', 'Creative idea implemented.', 'manual', NULL, NULL, 750, true, '2025-02-01 08:00:00+00'),
  ('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Team Player', 'Helps colleagues.', 'manual', NULL, NULL, 300, false, '2025-03-01 09:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- 5. Catalog Items
INSERT INTO catalog_items (id, name, description, image_url, points_cost, category) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'Amazon Gift Card ($25)', 'A $25 Amazon gift card.', 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop', 500, 'gift_card'),
  ('e0000000-0000-0000-0000-000000000002', 'Starbucks Gift Card ($10)', 'Favorite coffee.', 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=300&fit=crop', 200, 'gift_card'),
  ('e0000000-0000-0000-0000-000000000003', 'Branded Hoodie', 'Premium hoodie.', 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=300&fit=crop', 1500, 'merchandise'),
  ('e0000000-0000-0000-0000-000000000004', 'Wireless Earbuds', 'Bluetooth earbuds.', 'https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=400&h=300&fit=crop', 3000, 'merchandise'),
  ('e0000000-0000-0000-0000-000000000005', 'Spa Day Voucher', 'Full-day spa experience.', 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=300&fit=crop', 4000, 'experience'),
  ('e0000000-0000-0000-0000-000000000006', 'Movie Night Bundle', 'Tickets + popcorn.', 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=300&fit=crop', 800, 'experience'),
  ('e0000000-0000-0000-0000-000000000007', 'DoorDash Credit ($15)', '$15 credit.', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop', 300, 'gift_card'),
  ('e0000000-0000-0000-0000-000000000008', 'Extra PTO Day', 'Paid day off.', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop', 5000, 'experience')
ON CONFLICT (id) DO NOTHING;

-- 6. Transactions
DO $$ 
DECLARE
  v_priya UUID;
  v_admin1 UUID;
  v_james UUID;
  v_aisha UUID;
  v_david UUID;
  v_emma UUID;
  v_carlos UUID;
  v_lisa UUID;
  v_omar UUID;
  v_rachel UUID;
  v_kenji UUID;
BEGIN
  SELECT id INTO v_admin1 FROM auth.users WHERE email = 'admin1@acme.com';
  SELECT id INTO v_priya FROM auth.users WHERE email = 'priya@acme.com';
  SELECT id INTO v_james FROM auth.users WHERE email = 'james@acme.com';
  SELECT id INTO v_aisha FROM auth.users WHERE email = 'aisha@acme.com';
  SELECT id INTO v_david FROM auth.users WHERE email = 'david@acme.com';
  SELECT id INTO v_emma FROM auth.users WHERE email = 'emma@acme.com';
  SELECT id INTO v_carlos FROM auth.users WHERE email = 'carlos@acme.com';
  SELECT id INTO v_lisa FROM auth.users WHERE email = 'lisa@acme.com';
  SELECT id INTO v_omar FROM auth.users WHERE email = 'omar@acme.com';
  SELECT id INTO v_rachel FROM auth.users WHERE email = 'rachel@acme.com';
  SELECT id INTO v_kenji FROM auth.users WHERE email = 'kenji@acme.com';

  INSERT INTO transactions (user_id, type, points, reason, program_id, created_at) VALUES
    (v_priya, 'manual_credit', 500, 'Outstanding Q4 presentation',       'd0000000-0000-0000-0000-000000000001', '2025-02-05 09:00:00+00'),
    (v_aisha, 'manual_credit', 750, 'New onboarding flow improvement',   'd0000000-0000-0000-0000-000000000003', '2025-02-08 10:30:00+00'),
    (v_james, 'manual_credit', 300, 'Helped train new hires',            'd0000000-0000-0000-0000-000000000004', '2025-02-10 14:00:00+00'),
    (v_emma, 'manual_credit', 500, 'Client rescue — saved Omega deal',  'd0000000-0000-0000-0000-000000000001', '2025-02-12 11:00:00+00'),
    (v_david, 'manual_credit', 500, 'Weekend deploy support',            'd0000000-0000-0000-0000-000000000001', '2025-02-14 08:30:00+00'),
    (v_priya, 'manual_credit', 300, 'Mentored two interns',              'd0000000-0000-0000-0000-000000000004', '2025-02-18 10:00:00+00'),
    (v_lisa, 'manual_credit', 500, 'Bug fix marathon — 12 issues',      'd0000000-0000-0000-0000-000000000001', '2025-02-20 15:00:00+00'),
    (v_kenji, 'manual_credit', 1000, 'Closed 15 deals in Q1',            'd0000000-0000-0000-0000-000000000002', '2025-02-25 09:00:00+00'),
    (v_carlos, 'manual_credit', 500, 'Customer success story write-up',   'd0000000-0000-0000-0000-000000000001', '2025-02-28 11:00:00+00'),
    (v_emma, 'manual_credit', 1000, 'Exceeded sales target by 200%',   'd0000000-0000-0000-0000-000000000002', '2025-03-03 10:00:00+00'),
    (v_aisha, 'manual_credit', 500, 'Open source contribution',         'd0000000-0000-0000-0000-000000000001', '2025-03-05 09:00:00+00'),
    (v_priya, 'manual_credit', 750, 'Proposed new CI/CD pipeline',      'd0000000-0000-0000-0000-000000000003', '2025-03-08 14:00:00+00'),
    (v_rachel, 'manual_credit', 500, 'Organized team building event',    'd0000000-0000-0000-0000-000000000001', '2025-03-10 08:30:00+00'),
    (v_james, 'manual_credit', 500, 'Great customer feedback score',    'd0000000-0000-0000-0000-000000000001', '2025-03-12 10:00:00+00'),
    (v_emma, 'manual_credit', 500, 'Led successful product demo',      'd0000000-0000-0000-0000-000000000001', '2025-03-15 11:00:00+00'),
    (v_lisa, 'manual_credit', 750, 'Created automated test suite',     'd0000000-0000-0000-0000-000000000003', '2025-03-18 15:00:00+00'),
    (v_kenji, 'manual_credit', 500, 'Referral bonus — hired Alex',      'd0000000-0000-0000-0000-000000000001', '2025-03-20 09:00:00+00'),
    (v_david, 'manual_credit', 300, 'Documentation sprint champion',    'd0000000-0000-0000-0000-000000000004', '2025-03-22 14:00:00+00'),
    (v_carlos, 'manual_credit', 750, 'Built internal dashboard tool',    'd0000000-0000-0000-0000-000000000003', '2025-03-25 10:30:00+00'),
    (v_omar, 'manual_credit', 500, 'First month performance bonus',    'd0000000-0000-0000-0000-000000000001', '2025-03-28 08:00:00+00'),
    (v_aisha, 'redeem', -200, 'Redeemed: Starbucks Gift Card',       NULL, '2025-03-15 12:00:00+00'),
    (v_priya, 'redeem', -500, 'Redeemed: Amazon Gift Card',          NULL, '2025-03-20 16:00:00+00'),
    (v_emma, 'manual_credit', 750, 'Hackathon winner — AI chatbot',    'd0000000-0000-0000-0000-000000000003', '2025-04-02 10:00:00+00'),
    (v_aisha, 'manual_credit', 1000, 'Closed enterprise deal — $500K',  'd0000000-0000-0000-0000-000000000002', '2025-04-05 09:00:00+00'),
    (v_james, 'manual_credit', 750, 'Redesigned checkout flow',         'd0000000-0000-0000-0000-000000000003', '2025-04-08 11:00:00+00'),
    (v_rachel, 'manual_credit', 500, 'Ran accessibility audit',          'd0000000-0000-0000-0000-000000000001', '2025-04-10 14:00:00+00'),
    (v_priya, 'manual_credit', 500, 'Sprint velocity improvement',      'd0000000-0000-0000-0000-000000000001', '2025-04-12 08:30:00+00'),
    (v_kenji, 'manual_credit', 1000, 'Q1 top performer award',          'd0000000-0000-0000-0000-000000000002', '2025-04-15 10:00:00+00'),
    (v_lisa, 'manual_credit', 500, 'Knowledge sharing sessions',       'd0000000-0000-0000-0000-000000000001', '2025-04-18 15:00:00+00'),
    (v_carlos, 'manual_credit', 500, 'Cross-team collaboration win',     'd0000000-0000-0000-0000-000000000001', '2025-04-20 09:00:00+00'),
    (v_david, 'manual_credit', 500, 'Shipped mobile app v2',            'd0000000-0000-0000-0000-000000000001', '2025-04-22 11:00:00+00'),
    (v_omar, 'manual_credit', 500, 'Server migration zero-downtime',   'd0000000-0000-0000-0000-000000000001', '2025-04-25 14:00:00+00'),
    (v_emma, 'redeem', -800, 'Redeemed: Movie Night Bundle',        NULL, '2025-04-14 17:00:00+00'),
    (v_kenji, 'redeem', -500, 'Redeemed: Amazon Gift Card',          NULL, '2025-04-20 12:00:00+00'),
    (v_james, 'redeem', -300, 'Redeemed: DoorDash Credit',           NULL, '2025-04-25 18:00:00+00'),
    (v_emma, 'manual_credit', 500, 'Led design thinking workshop',    'd0000000-0000-0000-0000-000000000001', '2025-05-02 10:00:00+00'),
    (v_aisha, 'manual_credit', 500, 'Published engineering blog post', 'd0000000-0000-0000-0000-000000000001', '2025-05-05 09:00:00+00'),
    (v_priya, 'manual_credit', 500, 'API performance optimization',   'd0000000-0000-0000-0000-000000000001', '2025-05-08 14:00:00+00'),
    (v_lisa, 'manual_credit', 1000, 'Hit 50 PR milestone',           'd0000000-0000-0000-0000-000000000002', '2025-05-12 10:00:00+00'),
    (v_rachel, 'manual_credit', 750, 'Built Slack integration',        'd0000000-0000-0000-0000-000000000003', '2025-05-15 11:00:00+00'),
    (v_kenji, 'manual_credit', 500, 'Mentored 3 junior devs',         'd0000000-0000-0000-0000-000000000001', '2025-05-18 08:30:00+00'),
    (v_james, 'manual_credit', 500, 'Zero-defect release sprint',     'd0000000-0000-0000-0000-000000000001', '2025-05-22 15:00:00+00'),
    (v_carlos, 'manual_credit', 300, 'Volunteered for on-call rotation','d0000000-0000-0000-0000-000000000004', '2025-05-25 09:00:00+00'),
    (v_aisha, 'redeem', -1500, 'Redeemed: Branded Hoodie',           NULL, '2025-05-10 13:00:00+00'),
    (v_lisa, 'redeem', -200, 'Redeemed: Starbucks Gift Card',       NULL, '2025-05-20 16:00:00+00'),
    (v_priya, 'redeem', -300, 'Redeemed: DoorDash Credit',           NULL, '2025-05-28 11:00:00+00'),
    (v_emma, 'manual_credit', 500, 'Customer NPS improvement lead',  'd0000000-0000-0000-0000-000000000001', '2025-06-02 10:00:00+00'),
    (v_aisha, 'manual_credit', 500, 'Security audit champion',        'd0000000-0000-0000-0000-000000000001', '2025-06-05 09:00:00+00'),
    (v_kenji, 'manual_credit', 500, 'Database optimization project',  'd0000000-0000-0000-0000-000000000001', '2025-06-08 14:00:00+00'),
    (v_rachel, 'manual_credit', 500, 'Led retrospective — top feedback','d0000000-0000-0000-0000-000000000001', '2025-06-12 10:00:00+00'),
    (v_david, 'manual_credit', 750, 'Built analytics dashboard POC',  'd0000000-0000-0000-0000-000000000003', '2025-06-15 11:00:00+00'),
    (v_omar, 'manual_credit', 500, 'Successful product launch',      'd0000000-0000-0000-0000-000000000001', '2025-06-18 08:30:00+00'),
    (v_james, 'manual_credit', 500, 'Won internal hackathon',         'd0000000-0000-0000-0000-000000000001', '2025-06-22 15:00:00+00'),
    (v_priya, 'manual_credit', 500, 'Q2 team lead excellence',        'd0000000-0000-0000-0000-000000000001', '2025-06-25 09:00:00+00'),
    (v_emma, 'redeem', -500, 'Redeemed: Amazon Gift Card',          NULL, '2025-06-10 12:00:00+00'),
    (v_rachel, 'redeem', -800, 'Redeemed: Movie Night Bundle',        NULL, '2025-06-20 17:00:00+00'),
    (v_emma, 'manual_credit', 500, 'Mid-year review excellence',     'd0000000-0000-0000-0000-000000000001', '2025-07-02 10:00:00+00'),
    (v_lisa, 'manual_credit', 500, 'Infra cost reduction — 30%',     'd0000000-0000-0000-0000-000000000001', '2025-07-08 09:00:00+00'),
    (v_aisha, 'manual_credit', 500, 'Recruited 2 senior engineers',   'd0000000-0000-0000-0000-000000000001', '2025-07-12 14:00:00+00'),
    (v_carlos, 'manual_credit', 500, 'Customer retention campaign',    'd0000000-0000-0000-0000-000000000001', '2025-07-15 11:00:00+00'),
    (v_priya, 'manual_credit', 500, 'Release management excellence',  'd0000000-0000-0000-0000-000000000001', '2025-07-18 08:30:00+00'),
    (v_kenji, 'redeem', -3000, 'Redeemed: Wireless Earbuds',         NULL, '2025-07-10 12:00:00+00'),
    (v_priya, 'redeem', -200, 'Redeemed: Starbucks Gift Card',       NULL, '2025-07-20 16:00:00+00');
    
  -- Redemptions
  INSERT INTO redemptions (user_id, catalog_item_id, points_spent, status, created_at) VALUES
    (v_aisha, 'e0000000-0000-0000-0000-000000000002', 200,  'fulfilled', '2025-03-15 12:00:00+00'),
    (v_priya, 'e0000000-0000-0000-0000-000000000001', 500,  'fulfilled', '2025-03-20 16:00:00+00'),
    (v_emma, 'e0000000-0000-0000-0000-000000000006', 800,  'fulfilled', '2025-04-14 17:00:00+00'),
    (v_kenji, 'e0000000-0000-0000-0000-000000000001', 500,  'fulfilled', '2025-04-20 12:00:00+00'),
    (v_james, 'e0000000-0000-0000-0000-000000000007', 300,  'fulfilled', '2025-04-25 18:00:00+00'),
    (v_aisha, 'e0000000-0000-0000-0000-000000000003', 1500, 'fulfilled', '2025-05-10 13:00:00+00'),
    (v_lisa, 'e0000000-0000-0000-0000-000000000002', 200,  'fulfilled', '2025-05-20 16:00:00+00'),
    (v_priya, 'e0000000-0000-0000-0000-000000000007', 300,  'fulfilled', '2025-05-28 11:00:00+00'),
    (v_emma, 'e0000000-0000-0000-0000-000000000001', 500,  'fulfilled', '2025-06-10 12:00:00+00'),
    (v_rachel, 'e0000000-0000-0000-0000-000000000006', 800,  'pending',   '2025-06-20 17:00:00+00'),
    (v_kenji, 'e0000000-0000-0000-0000-000000000004', 3000, 'pending',   '2025-07-10 12:00:00+00'),
    (v_priya, 'e0000000-0000-0000-0000-000000000002', 200,  'pending',   '2025-07-20 16:00:00+00');
END $$;
