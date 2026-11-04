# KIIT University Employee Portal

**Live:** [kudos-rewards.vercel.app](https://kudos-rewards.vercel.app)

A reward, recognition and community portal for KIIT University staff. HR runs reward programmes and gives official points. Employees thank each other with **"Thank You !"** notes that can carry points, spend points in a reward shop, and help each other in a community forum.

Every point movement is recorded in an auditable ledger. Every rule (who can join, who can give points, who can see what) is enforced inside the database, not only in the browser.

## Features

### For employees
- **Invite-only access:** only `@kiit.ac.in` emails that HR has approved can sign up.
- **Say Thank You !:** thank a colleague publicly, with value tags (Teamwork, Innovation, Impact, Leadership) and optional points.
- **Thank You ! wall:** an organisation-wide feed with emoji reactions.
- **Reward shop:** 8 Indian rewards (CCD, Zomato, Amazon Pay, PVR, KIIT Hoodie, boAt, spa, extra leave day), with progress towards each.
- **Reward requests:** redeem, then track whether HR has approved or cancelled the request; cancelled requests are refunded automatically.
- **Points history:** a full ledger with running balance, filters, date ranges and CSV export.
- **Leaderboard and badges:** First Thank You !, Team Player and Top Earner.
- **Community:** questions with accepted answers, discussions and tips, threaded replies, appreciation, bookmarks and reputation.
- **Directory and profiles:** search colleagues by name, job title, skill or department.
- **Private messaging:** one-to-one chats with live unread counts and read receipts.
- **Notifications:** live, for Thank You notes, points, reward updates, replies, messages and badges.

### For HR
- **Dashboard:** members, points issued, reward requests and the live ledger.
- **People:**
  - add members to the approved list;
  - set departments;
  - give or deduct points, with confirmation for large credits;
  - remove members, choosing to revoke or keep their points; their history is kept and their login is blocked.
- **Programmes:** create, edit and turn reward programmes on or off.
- **Redemptions:** approve or cancel reward requests, with a confirmation step and automatic refunds.
- **Analytics:** points issued vs redeemed, programme breakdown, top earners, redemption rate, CSV export.
- **Community moderation and insights:** reports, hidden content, categories, audit log, engagement metrics.

## How it is built

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS v4 (design tokens, light and dark themes) |
| Data fetching | TanStack React Query |
| Database, auth, API, realtime | Supabase (PostgreSQL) |
| Charts | Recharts |
| Hosting | Vercel (deploys from `main`) |
| Tests | `node:test`, PGlite (in-memory PostgreSQL) |

There is no custom backend server. Trusted logic runs inside PostgreSQL:
- **Row-Level Security** on every table: users only see their own organisation's data, and only conversation participants can read private messages.
- **Stored procedures** for every point movement (credit, debit, Thank You, redeem, refund, revoke). Each one checks permissions, locks the rows involved, and writes the balance and the ledger in one transaction.
- **Triggers** for sign-up rules, notifications, community counters and reputation.
- **Protected columns:** users cannot change their own role, balance, organisation or department.

**Ledger invariant:** for every user, `points_balance = SUM(transactions.points)`.

## Project structure

```
src/
  pages/            employee (recipient/), HR (admin/), shared community (community/) and auth pages
  components/       ui/ (design system), shell/ (sidebar and top bar), community/, dashboard/, auth/
  hooks/            data fetching and mutations (React Query + Supabase)
  context/          auth, theme and toast providers
  lib/              pure helpers: ledger meanings, CSV export, community utilities (unit-tested)
supabase/
  migrations/       001–021, applied in order
  tests/            database security and logic tests (run on PGlite)
docs/               architecture, decisions, edge cases, deployment, community guide
```

## Running locally

```bash
npm install
cp .env.example .env.local   # add your Supabase project URL and anon key
npm run dev                  # http://localhost:5173
```

Apply the SQL files in `supabase/migrations/` to your Supabase project in numeric order (`001` → `021`). See [docs/Deployment-Plan.md](docs/Deployment-Plan.md) for project setup.

## Tests

```bash
npm test          # unit tests (community helpers, CSV escaping)
npm run test:db   # every migration on in-memory PostgreSQL + 57 security and logic checks
npm run lint
npm run build
```

`npm run test:db` needs no Docker and no Supabase project. It signs in as different users (employees, HR, another organisation) and checks what each one can and cannot do. Among other things it checks invite-only sign-up, member removal, private messages, refunds and the ledger rules.

## Documentation

- [Architecture](docs/Architecture.md)
- [Decision log](docs/Decision.md)
- [Edge cases](docs/Edge-Case.md)
- [Deployment](docs/Deployment-Plan.md)
- [Community module](docs/community.md)

## Team

Group project, KIIT University:

- Akasa Patri
- Mrigank Raj Chauhan
- Priyanshu Pandey
- Ranjit Singh Virdi
- Kaustubh Gaurav Tiwari
- Vaibhav Deep Srivastava
