// Applies every migration to an in-memory Postgres (PGlite, no Docker or
// Supabase project needed) behind a minimal Supabase shim — roles, the auth
// schema, auth.uid() from JWT claims, default grants, the realtime
// publication — and then runs community_security_tests.sql.
//
//   npm run test:db
//
// The shim is NOT Supabase: it validates SQL, RLS policies, triggers and
// RPC authorization logic, but not PostgREST, Realtime or GoTrue. See
// docs/community.md for the checks that still need a real project.
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (...parts) => readFileSync(join(root, ...parts), 'utf8')

const SHIM = `
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE TABLE auth.users (
  instance_id uuid, id uuid PRIMARY KEY, aud text, role text, email text,
  encrypted_password text, email_confirmed_at timestamptz, raw_user_meta_data jsonb,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
                  (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid
$$;
GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
-- Like Supabase: new functions are granted to the API roles directly, not
-- just via PUBLIC (this is what 016 has to revoke).
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
CREATE PUBLICATION supabase_realtime;
`

// 004 (demo seed) needs pgcrypto and real GoTrue rows, so it's skipped;
// create_user_trigger.sql is superseded by 007.
const MIGRATIONS = [
  '001_create_tables.sql', '002_rls_policies.sql', '003_rpc_functions.sql',
  '005_fix_rls.sql', '006_send_kudos_rpc.sql', '007_team_and_pending_members.sql',
  '008_redemption_fulfillment_and_kudos_tags.sql', '009_org_member_visibility.sql',
  '010_reactions_notifications_badges.sql', '011_security_hardening.sql',
  '012_community_core.sql', '013_community_messaging.sql',
  '014_community_notifications_reputation.sql', '015_community_moderation.sql',
  '016_hardening_followups.sql', '017_leaderboard_and_conversation_role.sql',
]

const db = new PGlite()
await db.exec(SHIM)

for (const file of MIGRATIONS) {
  try {
    // 008 changes get_top_recipients' return type via CREATE OR REPLACE,
    // which Postgres rejects on a fresh database (the hosted project was
    // patched by hand). Drop it first so a clean install works.
    if (file.startsWith('008')) await db.exec('DROP FUNCTION IF EXISTS get_top_recipients(uuid, int);')
    await db.exec(read('supabase', 'migrations', file))
    console.log(`applied  ${file}`)
  } catch (e) {
    console.error(`FAILED   ${file}\n  ${e.message}`)
    process.exit(1)
  }
}

let passed = 0
try {
  await db.exec(read('supabase', 'tests', 'community_security_tests.sql'), {
    onNotice: (n) => {
      if (n.message.startsWith('PASS') || n.message.startsWith('ALL')) {
        if (n.message.startsWith('PASS')) passed++
        console.log(`  ${n.message}`)
      }
    },
  })
} catch (e) {
  console.error(`\n  ${e.message}`)
  console.error(`\n${passed} checks passed before the failure.`)
  process.exit(1)
}
console.log(`\n${passed} security checks passed.`)
await db.close()
