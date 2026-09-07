# CLAUDE.md — Kudos Rewards & Recognition Platform

## Project Identity

Kudos is a **web-based SaaS MVP** for employee and channel partner **reward and recognition (R&R)**. Admins create programs, issue points, and view analytics. Recipients earn points, send peer-to-peer kudos, and redeem rewards from a catalog. The app is fully functional, demo-seeded, and deployed.

**Live:** https://kudos-rewards.vercel.app/login
**Repo:** https://github.com/mrigank-raj/Kudos-Rewards

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 19 + Vite 8 | SPA, lazy-loaded routes |
| Styling | Tailwind CSS v4 | Uses `@theme` directive + CSS custom properties for semantic tokens |
| State | TanStack React Query v5 | All server state; 5min staleTime default |
| Icons | Lucide React | |
| Charts | Recharts | Admin analytics |
| Auth + DB + API | Supabase (PostgreSQL) | Auth, RLS, RPC functions—no custom backend |
| Hosting | Vercel | Auto-deploys from `main` branch |

**Path alias:** `@` → `./src` (configured in `vite.config.js`)

---

## Architecture Overview

### Provider Tree (main.jsx)
```
StrictMode → QueryClientProvider → ThemeProvider → AuthProvider → ToastProvider → App
```

### Routing (App.jsx)
```
/login              → LoginPage (public)
/signup             → SignupPage (public)
/admin/*            → ProtectedRoute(admin) → AdminLayout
  /admin/dashboard  → AdminDashboard
  /admin/programs   → ProgramsPage
  /admin/people     → PeoplePage
  /admin/analytics  → AnalyticsPage
/app/*              → ProtectedRoute(recipient) → RecipientLayout
  /app/dashboard    → RecipientDashboard
  /app/catalog      → CatalogPage
  /app/history      → HistoryPage
/                   → RootRedirect (role-based)
```

### Two Roles, Two Shells
- **Admin** routes are under `/admin/*`, wrapped in `AdminLayout`.
- **Recipient** routes are under `/app/*`, wrapped in `RecipientLayout`.
- Both layout shells import from `src/components/shell/AppShell.jsx` which provides the sidebar, topbar, and mobile tab bar.

---

## Database Schema (Supabase PostgreSQL)

**Tables:** `organizations`, `users`, `reward_programs`, `transactions`, `catalog_items`, `redemptions`, `kudos`

Key relationships:
- `users.id` → `auth.users.id` (FK, CASCADE)
- `users.org_id` → `organizations.id`
- `transactions.user_id` → `users.id`
- `transactions.program_id` → `reward_programs.id` (nullable)
- `redemptions.catalog_item_id` → `catalog_items.id`
- `kudos.from_user_id` / `kudos.to_user_id` → `users.id`

**`users.role`** is `CHECK (role IN ('admin', 'recipient'))`.
**`transactions.type`** is `CHECK (type IN ('earn', 'redeem', 'manual_credit', 'manual_debit'))`.

The `transactions` table is the **source of truth** for all point movements. `users.points_balance` is a denormalized running total updated atomically by RPC functions.

### Migration Files (supabase/migrations/)
```
001_create_tables.sql       — Schema creation + indexes
002_rls_policies.sql        — Row Level Security policies
003_rpc_functions.sql       — credit_points, debit_points, redeem_reward, get_points_summary, get_top_recipients, get_program_breakdown
004_seed_data.sql           — Demo data (org, users, programs, transactions, catalog items, redemptions)
005_fix_rls.sql             — RLS policy fixes
006_send_kudos_rpc.sql      — Atomic P2P kudos transfer function
create_user_trigger.sql     — Auto-creates public profile when auth.users row is inserted
create_test_user.sql        — Helper for creating test users
```

---

## Critical RPC Functions

All point-mutating operations use **SECURITY DEFINER** Postgres functions to guarantee atomicity. **Never** do multi-step point mutations from the frontend.

| Function | Purpose | Called From |
|---|---|---|
| `credit_points(p_user_id, p_points, p_reason, p_program_id?)` | Admin credits points | `useCreditPoints` hook |
| `debit_points(p_user_id, p_points, p_reason)` | Admin debits points | `useDebitPoints` hook |
| `redeem_reward(p_user_id, p_catalog_item_id)` | Recipient redeems catalog item | `useRedeemReward` hook |
| `send_kudos(p_from_user_id, p_to_user_id, p_message, p_points)` | P2P kudos with optional point transfer | `useKudos` hook |
| `get_points_summary(p_org_id)` | Monthly issued vs redeemed stats | `usePointsSummary` hook |
| `get_top_recipients(p_org_id, p_limit)` | Leaderboard query | `useTopRecipients` hook |
| `get_program_breakdown(p_org_id)` | Per-program point distribution | `useProgramBreakdown` hook |

---

## Key Source Files

### Hooks (src/hooks/) — All data fetching and mutations
- `useAuth.js` — Re-exports `useAuth` from AuthContext
- `useAnalytics.js` — `usePointsSummary`, `useTopRecipients`, `useProgramBreakdown`, `useAnalyticsStats`. Each has a client-side fallback if the RPC isn't deployed.
- `usePeople.js` — `usePeople`, `useUserTransactions`, `useCreditPoints`, `useDebitPoints`
- `usePrograms.js` — `usePrograms`, `useCreateProgram`, `useUpdateProgram`, `useToggleProgram`
- `useKudos.js` — `useKudos` (feed + send mutation)
- `useRedemptions.js` — `useRedemptions`, `useRedeemReward`
- `useCatalog.js` — Fetches catalog_items
- `useTransactions.js` — Current user's transaction history

### Context Providers (src/context/)
- `AuthContext.jsx` — Session, profile, signUp, signIn, signOut, refreshProfile, role helpers
- `ThemeContext.jsx` — Dark/light theme toggle via `data-theme` attribute on `<html>`
- `ToastContext.jsx` — Toast notification system

### UI System (src/components/)
- `ui/index.jsx` — ~545 lines of reusable primitives: Card, SectionTitle, Avatar, Badge, Pill, Modal, Sheet, Field, Select, SearchSelect, PointsPill, EmptyState, KPICard, Trend, StatusDot, etc.
- `shell/AppShell.jsx` — ~408 lines. Sidebar (collapsible), TopBar, MobileHeader, MobileTabBar, GiveKudos FAB. Used by both admin and recipient layouts.

### Design System (src/styles/index.css)
- Tailwind v4 `@theme` directive defines all semantic color tokens, typography scale, shadows, animations.
- Light/dark themes via CSS custom properties (RGB triples) toggled by `[data-theme='dark']`.
- **Important:** Global resets are inside `@layer base`. A previous bug placed `* { margin: 0 }` outside the layer which broke Tailwind utilities like `ml-auto`. This has been fixed—do not add global resets outside `@layer base`.

---

## Authentication Flow

1. **Signup:** `AuthContext.signUp()` → creates `auth.users` row → Postgres trigger `handle_new_user` auto-creates `public.users` row with role='recipient', org_id=Acme Corp, 500 starting points.
2. **Signup (Admin):** `AuthContext.signUp()` also creates an `organizations` row and sets `org_id`.
3. **Login:** `AuthContext.signIn()` → fetches profile from `users` table (including joined org name).
4. **Route protection:** `ProtectedRoute` component checks `isAuthenticated` and `profile.role` against `allowedRole` prop.

**Hardcoded value:** The `create_user_trigger.sql` trigger assigns all new signups to org `a0000000-0000-0000-0000-000000000001` (Acme Corp). This is an MVP shortcut.

---

## Environment Variables

```env
VITE_SUPABASE_URL=<supabase project URL>
VITE_SUPABASE_ANON_KEY=<supabase anon/public key>
VITE_APP_ENV=development
```

These are stored in `.env.local` (gitignored). The Supabase project ID is `rhinfbtehnidrszkrhkv`.

**Never use the Service Role key in frontend code.** All security is enforced via RLS.

---

## Deployment

- **Vercel** auto-deploys on push to `main`.
- `vercel.json` has a catch-all rewrite (`/(.*) → /index.html`) required for React Router SPA routing. Do not remove this.
- Build command: `vite build` (output to `dist/`).

---

## Known Issues & Gotchas

1. **Supabase email bounces:** Test accounts use fake `@acme.com` emails. Supabase sends confirmation emails to these, which bounce. The "Confirm email" setting in Supabase Auth should be **disabled** during development. If bounces spike, Supabase may restrict the project's email privileges.

2. **`kudos-redesign/` folder:** This is a standalone static prototype (separate package.json, Tailwind v3). It was the design reference used to build the current app. It is NOT part of the running application—Vercel may try to auto-detect it as a separate project. Ignore those Vercel emails.

3. **Mock data fallbacks in analytics hooks:** `useAnalytics.js` hooks try the RPC function first, then fall back to client-side aggregation from raw transaction data. This means analytics will still render even if an RPC function is missing, but the fallback is slower and less accurate for large datasets.

4. **Dual component systems:** The app has both old components (`src/components/layout/`, `src/components/shared/`) and newer redesigned ones (`src/components/shell/AppShell.jsx`, `src/components/ui/index.jsx`). The layouts currently import from both. The newer shell/ui system is the canonical one going forward.

5. **`src/lib/data.js`:** Contains ~12KB of static mock/fallback data used by some UI components when database data is empty. Not all components use it; some have inline fallbacks.

---

## What Is Implemented vs. Not

### ✅ Fully Implemented
- Authentication (signup, login, logout, role-based routing)
- Admin Dashboard (stat cards, recent activity)
- Reward Program CRUD (create, edit, toggle active/inactive)
- People Management (view users, credit/debit points, view individual transaction history)
- Analytics (Points Issued vs Redeemed chart, Top Recipients table, Program Breakdown, Redemption Rate)
- Recipient Dashboard (balance, activity feed, P2P kudos feed)
- Peer-to-Peer Kudos (send recognition with optional point transfer)
- Rewards Catalog (browse, redeem with simulated fulfillment)
- Transaction History (recipient's ledger view)
- Dark/Light theme toggle
- Responsive mobile layout with bottom tab bar

### 🔶 Partially Implemented / MVP Shortcuts
- **Leaderboard:** Data is queryable via `get_top_recipients` RPC, shown in analytics table, but no dedicated standalone leaderboard page.
- **Org management:** All new signups are hardcoded to Acme Corp org. No multi-org support or org selection.
- **Notifications:** No push/email notifications. Toast notifications are client-side only.
- **Search:** Search bar is rendered in TopBar but is non-functional (placeholder only).

### ❌ Not Implemented (Intentionally Out of Scope)
- Real gift card fulfillment / payment processing
- HRMS / ERP integrations
- Enterprise SSO / SAML
- Multi-currency support
- Email notifications (transactional)
- Admin user management (invite users, change roles)

---

## Test Accounts (Seeded)

| Email | Password | Role |
|---|---|---|
| `admin1@acme.com` | `Demo1234!` | Admin |
| `admin2@acme.com` | `Demo1234!` | Admin |
| `employee1@acme.com` (and similar) | `Demo1234!` | Recipient |

---

## Documentation Index

| File | Purpose |
|---|---|
| `docs/context.md` | Product requirements, roles, MVP scope, data model |
| `docs/Architecture.md` | Full technical architecture, schema, RLS, data flows, component structure |
| `docs/Decision.md` | Key engineering/product decisions and their rationale |
| `docs/Deployment-Plan.md` | Step-by-step deployment guide for Supabase + Vercel |
| `docs/Edge-Case.md` | Edge cases by domain (auth, points, redemption, analytics, etc.) |
| `docs/Implementation-plan.md` | Phase-by-phase build plan (historical reference) |
| `docs/evals.md` | Evaluation rubric and E2E test scenarios |
| `docs/handover.md` | Developer handover guide |

---

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server (http://localhost:5173)
npm run build        # Production build → dist/
npm run preview      # Preview production build locally
npm run lint         # Run oxlint
```

---

## Style & Code Conventions

- **Imports:** Use `@/` path alias (e.g., `import { useAuth } from '@/hooks/useAuth'`).
- **Components:** Functional components only. No class components.
- **State:** Server state via React Query hooks. Local UI state via `useState`. Global state via Context.
- **Mutations:** All point-mutating operations MUST go through Supabase RPC functions—never direct table inserts/updates from the frontend for transactions.
- **CSS:** Use Tailwind utility classes with the semantic tokens defined in `src/styles/index.css` (e.g., `text-ink-primary`, `bg-surface-base`, `border-stroke-subtle`). Avoid hardcoded hex colors.
- **Theme:** Dark mode via `data-theme="dark"` on `<html>`. Toggle managed by `ThemeContext`.
