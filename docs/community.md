# Employee Community — Setup & Architecture

The community is a module inside the existing Kudos app (same shell, same
auth, same Supabase project). Employees ask questions, share tips, discuss,
appreciate helpful contributions, message each other privately and build a
**community reputation**. HR moderates and reviews contributions from the
existing admin area.

Reputation is **not** money. It never touches `transactions` or
`users.points_balance`. HR can turn great contributions into official points
only through the existing admin `credit_points` workflow.

---

## 1. Migrations (run in order)

Apply these in the Supabase SQL editor (or `supabase db push`) **after**
the existing `001`–`010`:

| File | What it does |
|---|---|
| `011_security_hardening.sql` | **Required, fixes existing holes.** Blocks clients from changing their own `role` / `org_id` / `points_balance` / `team` / `email`; `credit_points` / `debit_points` require an admin of the same org (and never self); `redeem_reward` / `send_kudos` only act as the caller; drops the unchecked 4-argument `send_kudos` overload and the direct-insert policies on `transactions`, `redemptions`, `kudos`; pins `search_path` on all `SECURITY DEFINER` functions; adds `register_admin_organization()` for admin self-signup. |
| `012_community_core.sql` | Profiles (job title, bio, skills), categories (seeded per org), posts, threaded comments (max depth 2), accepted answers (composite FK guarantees the answer belongs to the question), appreciation on posts/comments, bookmarks, question lifecycle RPCs, all RLS. |
| `013_community_messaging.sql` | 1:1 conversations, participants, messages, read receipts, conversation-list / unread RPCs, Realtime publication. |
| `014_community_notifications_reputation.sql` | Extends the existing `notifications` table (link, actor, dedupe key, new types), contribution ledger + reputation, 5 community badges, directory RPC. |
| `015_community_moderation.sql` | Reports, audited HR moderation, HR analytics, manual badge awards. |
| `017_leaderboard_and_conversation_role.sql` | Fixes the employee Leaderboard (showed 0 for everyone because `get_top_recipients` ran with the employee's RLS) by making it org-scoped `SECURITY DEFINER`; adds the other person's role to the conversation list so HR is labelled in Messages. |
| `016_hardening_followups.sql` | Follow-ups from Supabase's advisors: removes API execute rights from trigger functions/internal helpers (Supabase grants them to `anon`/`authenticated` by default), pins `search_path` on the analytics functions, adds a few foreign-key indexes. |

> **Fresh databases:** `008` uses `CREATE OR REPLACE` to change
> `get_top_recipients`' return type, which Postgres rejects on a clean
> install. Run `DROP FUNCTION IF EXISTS get_top_recipients(uuid, int);`
> before `008` if you are building a new project. (The test harness does
> this automatically.)

### Status of the shared project (`rhinfbtehnidrszkrhkv`, applied 2026-10-29)

The hosted database had only `001`–`006` applied (no migration history was
recorded). `007`–`017` were applied in order as tracked migrations; `008`
was preceded by `DROP FUNCTION get_top_recipients(uuid, int)`. Before
applying, a snapshot of every existing table plus the definitions of all
functions, policies and triggers was copied into the schema
`backup_20261029` (not exposed through the API). All 35 security checks
then passed against the real database inside a rolled-back transaction,
and user/points/transaction totals matched the snapshot exactly.

To roll a table back from the snapshot (example):
`TRUNCATE public.transactions; INSERT INTO public.transactions SELECT * FROM backup_20261029.transactions;`
Old function/policy definitions are in `backup_20261029.definitions`. Once
everything is confirmed working: `DROP SCHEMA backup_20261029 CASCADE;`

Each migration's header lists rollback statements. Rolling back `011` is
not recommended — it reopens privilege escalation.

### Supabase dashboard settings

- **Realtime:** `012`–`013` add `community_messages` to the
  `supabase_realtime` publication (and `010` already added `notifications`).
  Check *Database → Publications* if live updates don't arrive.
- **Auth → Email confirmation:** if enabled, admin self-signup only
  completes after the user confirms and signs in (the
  `register_admin_organization` call needs a session).
- No storage buckets are needed (attachments are not implemented).

---

## 2. Environment variables

No new variables. The app still uses only the public values in
`.env.example`:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Never put the service-role key in a `VITE_` variable — everything is
enforced by RLS and `SECURITY DEFINER` functions.

---

## 3. Trust model

| Question | Source of truth |
|---|---|
| Who am I? | `auth.uid()` |
| Which organization? | `get_user_org()` → `users.org_id` (client-immutable since `011`) |
| Am I HR? | `get_user_role() = 'admin'` (client-immutable since `011`) |

- Every community row stores `org_id`, filled by a `BEFORE INSERT` trigger
  from the author — the browser never sends it. Spoofed `author_id`,
  `sender_id`, `reporter_id` are overwritten with `auth.uid()`.
- Counters (`like_count`, `comment_count`), question `status`,
  `accepted_comment_id` and moderation flags can't be written by clients;
  triggers reject the update. They change only through triggers or RPCs.
- Policies that need "is this user in my org" or "am I in this
  conversation" use `SECURITY DEFINER` helpers (`community_same_org`,
  `community_is_participant`) so no policy queries its own table
  (no recursive RLS).
- Likes and bookmarks are private rows (you only ever see your own); the
  feed learns "did I like this" by embedding them, which RLS filters to the
  caller.
- `anon` has no table privileges on community tables and can't execute the
  RPCs.
- HR analytics never read `community_messages`; HR is not a participant and
  RLS gives them no access to private conversations.

### Question lifecycle

`open` → (someone other than the author comments) → `answered` → (author or
HR accepts an answer) → `resolved`. Reopening clears the accepted answer
and recalculates `open`/`answered`. Deleting or hiding the accepted answer
re-opens the question automatically.

### Reputation rules (enforced in SQL, shown in the UI)

| Event | Points | Guard |
|---|---|---|
| Your answer is accepted | +15 | not for your own question; moves if the author accepts a different answer; removed on reopen |
| A colleague appreciates your post | +2 | once per colleague; removed if they undo it; self-likes are rejected |
| A colleague appreciates your comment | +2 | same |
| Your tip reaches 3 appreciations | +5 | once per tip |

Hiding or deleting content removes the reputation it generated. Badges
(Helpful Contributor, Problem Solver, Knowledge Sharer, Collaborator,
Community Champion) are awarded automatically from the ledger or manually
by HR. *Collaborator* is the community "team player" badge — the existing
kudos badge already uses the name *Team Player*.

---

## 4. Routes

Community pages exist under both areas so each role keeps its own shell.
A link for the other role (e.g. an employee shares `/app/community/post/…`
with HR) is redirected to the same page in the right area.

| Path (`/app/…` employees, `/admin/…` HR) | Page |
|---|---|
| `community` | Feed — Latest, Trending, Unanswered, Resolved, Tips, My Department; search, category, tag |
| `community/ask`, `community/new?type=` | Create post / ask for help |
| `community/mine`, `community/saved` | My posts, saved posts |
| `community/post/:id` (`?comment=` to highlight) | Post detail, answers, replies, accept/reopen, report |
| `community/post/:id/edit` | Edit own post |
| `directory`, `directory/:userId` | Employee directory and profiles |
| `profile` | My profile (edit job title, bio, skills; reputation history) |
| `messages`, `messages/:conversationId` | Private messages |
| `notifications` | Full notification list |
| `/admin/community/moderation` | Reports, hidden content, audit log, categories (HR only) |
| `/admin/community/insights` | Engagement analytics, top contributors, award badge/points (HR only) |

The sidebar is grouped (Menu / Rewards for employees, Menu / Community for
HR) with unread badges on Messages and Notifications. Employees now get the
mobile menu too; the bottom tab bar is Home · Community · Give Kudos ·
Messages · Profile. The top-bar search box searches community posts.

## 5. Code map

```
src/lib/community.js                 constants, validation, comment tree, safe text parser (pure, unit-tested)
src/hooks/useCommunity.js            feed, posts, comments, likes, bookmarks, accept/reopen, reports
src/hooks/useCommunityPeople.js      directory, profiles, contributions, start conversation
src/hooks/useMessages.js             conversations, threads, send, read receipts, one Realtime channel
src/hooks/useCommunityAdmin.js       HR overview, contributors, reports, moderation, badges, categories
src/hooks/useNotifications.js        (+ paginated feed and exact unread count)
src/components/community/            PostCard, CommentThread, ReportDialog, shared UI bits
src/pages/community/                 feed, editor, detail, directory, profile, messages, notifications
src/pages/admin/Community*Page.jsx   moderation and insights
```

## 6. Testing

```bash
npm test          # unit tests for src/lib/community.js (node:test, no extra deps)
npm run test:db   # applies 001–015 to in-memory Postgres (PGlite) and runs 35 security checks
npm run lint
npm run build
```

`npm run test:db` runs `supabase/tests/community_security_tests.sql` against
a local Supabase shim (roles, `auth.uid()`, default grants). It proves the
SQL, RLS, triggers and RPC checks — including cross-org isolation, private
messages, notification privacy, "employees can't award themselves points",
and HR-only moderation. It does **not** exercise PostgREST, Realtime or
GoTrue.

To run the same checks against a real **development** project, paste
`supabase/tests/community_security_tests.sql` into the SQL editor. It runs
in a transaction and rolls back, leaving no data.

### Manual check against a real project

1. Apply `011`–`015`. Sign in as two employees (A, B) in one org and one admin.
2. A asks a question → it shows *Needs help* in **Unanswered**.
3. B answers, appreciates the question, saves it → A gets notifications; counts update.
4. A accepts B's answer → *Resolved*; B's profile shows +15 reputation. A reopens → reputation removed.
5. B tries to edit A's post via the API → 0 rows updated.
6. A messages B from B's profile → B sees the unread badge live, opens it, A sees *Seen*.
7. B reports a comment → admin sees it in **Moderation**, hides it with a reason → author notified, audit log row created.
8. Admin opens **Contributions**, awards a badge and points → points appear in the employee's wallet/history as a normal manual credit.
9. Regression: log in, send kudos, redeem a reward, fulfil a redemption, view analytics.

## 7. Known limitations

- **Performance advisor notes (not urgent at this size):** many RLS policies call `auth.uid()` directly instead of `(select auth.uid())`, and several tables have more than one permissive SELECT policy. Both only matter with thousands of rows.
- **Leaked-password protection** is off in Supabase Auth settings (dashboard → Authentication → Policies); worth enabling.

- **Attachments** are not implemented (no storage bucket is configured); the editor tells people to link documents instead.
- **Messages** can't be edited or deleted; one-to-one only (no group chats); 30 messages/minute rate limit.
- **Email addresses** remain readable by org members through the pre-existing `users` policy from `009`. Community queries never request them, but restricting the column would break existing `select('*')` calls and is left for a follow-up.
- **Employees can't change their department** (`users.team` is HR-managed and now protected); avatars are still the existing colour/URL field.
- **Moderator unhide** restores content but not the reputation it earned before being hidden.
- **Tip reputation** (+5 at 3 appreciations) is not removed if appreciations later drop below 3.
- **Directory text search** uses `ILIKE`, fine for org-sized data; feed search uses Postgres full-text search (English stemming).
- **Organizations:** new self-signups are still placed in the demo org by the existing `handle_new_user` trigger.
