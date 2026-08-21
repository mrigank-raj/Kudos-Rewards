# Developer Handover: Kudos

## 1. Executive Summary

Welcome to Kudos. This document is your **central map and takeover guide**.

**What is this project?**
Kudos is a web-based SaaS platform designed to manage reward and recognition (R&R) programs for employees and channel partners. It replaces manual spreadsheets and physical gift cards with a centralized dashboard where Admins can issue points and Recipients can redeem them from a catalog.

**Where is the MVP currently?**
The Minimum Viable Product (MVP) has been successfully built and deployed. The core end-to-end loop—creating programs, managing people, issuing points, and redeeming rewards—is fully functional. The UI has undergone a major visual polish phase, resulting in a modern, production-ready aesthetic. 

---

## 2. Current Project Status

The project is **functional and demo-ready**.

**Currently Working & Implemented:**
* **Authentication:** Supabase Auth (Email/Password) with role-based routing (Admin vs Recipient).
* **Admin Dashboard:** High-level metrics and recent activity feed.
* **Analytics:** Real Recharts-powered graphs reflecting transaction history (Points Issued vs Redeemed, Redemption Rates, Top Recipients).
* **People Management:** Admin view of users, balances, and manual credit/debit capabilities.
* **Reward Programs:** Admins can define manual or rule-based reward programs.
* **Recipient Dashboard:** Point balance and recent activity.
* **Peer-to-Peer (P2P) Kudos:** Users can send points and messages to each other.
* **Rewards Catalog:** Recipients can browse and simulate redeeming rewards.
* **Transaction History:** Ledger of all point movements.

**Intentionally Out of Scope for MVP:**
* Real payment processing or gift card fulfillment (redemptions are simulated database entries).
* HRMS/ERP integrations.
* Real email notifications for specific events (mostly skipped/mocked to prevent spam).

---

## 3. Start Here (Documentation Map)

Do not read the codebase blindly. Read the existing documentation in this exact order:

1. **`README.md`** - General introduction and basic local setup commands.
2. **`docs/context.md`** - The product requirements, roles, MVP scope, and definitions of done. (Start here to understand *why* we built what we built).
3. **`docs/Architecture.md`** - The technical blueprint. Explains the component structure, Supabase schema (RLS policies), and data flows.
4. **`docs/Decision.md`** - The rationale behind tricky technical pivots (e.g., P2P kudos, atomic Postgres RPC functions).
5. **`docs/Deployment-Plan.md`** - How the app is deployed on Vercel and Supabase.
6. **`docs/Edge-Case.md`** - Deep-dive into edge cases handled by the system.
7. **`docs/Implementation-plan.md`** - Historical artifact showing how the MVP was built in phases. Useful for tracing history, but do not rely on this for current state.

---

## 4. Repository Map

```text
/
├── src/                    → React application source code
│   ├── components/         → UI components, grouped by domain (admin, recipient, shared)
│   ├── context/            → React Context providers (Auth, Theme, Toast)
│   ├── lib/                → Supabase client and static mock data
│   ├── pages/              → Route-level page components
│   └── styles/             → Tailwind CSS configuration and base styles
├── public/                 → Static assets (favicon, etc.)
├── supabase/               → Supabase configuration, schema, and migrations
├── kudos-redesign/         → Original HTML/CSS static prototype (kept for design reference)
├── docs/                   → Project documentation
├── .env.local              → Local environment variables (Supabase URL/Key)
├── package.json            → Dependencies and NPM scripts
├── vercel.json             → Vercel SPA routing configuration
└── vite.config.js          → Vite bundler configuration
```

---

## 5. Running the Project

### Prerequisites
* Node.js (v18+)
* Git

### Setup & Run
1. Install dependencies: `npm install`
2. Ensure you have the `.env.local` file with the correct Supabase keys:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
3. Start the dev server: `npm run dev`
4. The application will run on `http://localhost:5173`

*(Note: There is no custom backend to run. The database and API are fully hosted on Supabase).*

---

## 6. Required Access & Environment

To take full ownership of the project, you must secure access to the following external services:

1. **GitHub:** Repository access.
2. **Vercel:** Hosting and continuous deployment dashboard.
3. **Supabase:** The database, authentication, and backend dashboard. This is critical for managing the database schema, viewing actual user data, and modifying RLS policies.

*Warning: Never commit your `.env` or `.env.local` files containing Supabase credentials.*

---

## 7. Remaining Work (Unfinished)

The MVP is complete. However, if you are moving towards a V2 or production launch with real customers, prioritize the following:

**P1 (Important before real launch):**
* **Real Email Provider:** Supabase's default SMTP limits are very strict. You must configure a custom SMTP provider (like Resend or SendGrid) in the Supabase Dashboard to handle user invites and magic links without bouncing.
* **Fulfillment Webhooks:** Currently, redeeming a reward just updates the database. You will need to build edge functions or webhooks to integrate with a real gift card API (e.g., Tremendous).

**P2 (Future Enhancements):**
* Real-time notifications (Supabase Realtime).
* Leaderboard UI (data is partially ready, but needs a dedicated view).

---

## 8. Known Issues & Risks

* **Email Bounces During Testing:** If you test authentication locally by creating fake email addresses (e.g., `@acme.com`), Supabase attempts to send a confirmation email. Because the domain is fake, the email bounces, which can lead to Supabase temporarily restricting your project's email sending privileges. **Fix:** Disable "Confirm email" in the Supabase Auth settings during development, or configure a local SMTP catcher like Mailtrap.
* **Global Margin Reset:** Tailwind v4 utility classes were previously broken due to a misconfigured global `* { margin: 0; }` in `index.css`. This has been fixed by moving custom resets into `@layer base`. If UI elements suddenly break their layout, check the cascade in `index.css`.
* **Mock Data Fallbacks:** In some specific UI previews or edge cases where database data is missing, the frontend might silently fall back to mock data from `src/lib/data.js`. Be aware of this when debugging empty states.

---

## 9. Important Technical Decisions

Do not casually change the following architectural pillars without consulting `Decision.md` and `Architecture.md`:

* **Atomic RPC Functions:** Point transfers (like sending Kudos or redeeming rewards) are handled via Postgres RPC functions (e.g., `send_kudos`), **not** client-side mutations. This prevents race conditions and negative balances.
* **Row Level Security (RLS):** All data fetching happens directly from the frontend to Supabase. Security is enforced purely via Postgres RLS policies. Do not bypass these policies or use the Service Role key in the frontend.
* **State Management:** `TanStack Query` (React Query) is used for server state. Do not revert to standard `useEffect` fetching, as React Query handles caching and optimistic updates essential for the dashboard experience.

---

## 10. What Should NOT Be Changed Manually?

* **Database Schema directly via SQL UI:** Always write Supabase migrations if you need to alter the schema so changes can be tracked in source control.
* **`vercel.json` routing:** The configuration explicitly rewrites all routes to `index.html` for React Router to function properly. Modifying this will break direct linking and page refreshes in production.

---

## 11. Technical Debt

* **What:** Analytics charts are relatively basic.
* **Why it exists:** To save time during the MVP phase, complex window functions and time-series rollups in Postgres were simplified.
* **Impact:** Analytics load quickly but lack deep drill-down capabilities or date-range filtering.
* **Recommended action:** Implement time-series views in Postgres and add date-picker filters to the frontend.

---

## 12. Recommended Takeover Sequence

1. **Get Access:** Ensure you have admin access to the GitHub repo, the Vercel project, and the Supabase project.
2. **Read Docs:** Read this document, `context.md`, and `Architecture.md`.
3. **Local Setup:** Pull the repository, set up `.env.local`, and run `npm run dev`.
4. **Fix Supabase Email Settings:** Immediately log into Supabase (Auth > Providers > Email) and toggle **OFF** "Confirm email" to prevent test accounts from bouncing and ruining the project's IP reputation.
5. **Explore the App:** Log in as an Admin (`admin1@acme.com`) and poke around. Then log out and log in as a Recipient (`employee1@acme.com`).
6. **Review the Database:** Look at the Supabase Table Editor to understand how the tables relate to what you just saw in the UI.
7. **Make a Small Change:** Pick a minor bug or text change, implement it, and verify the deployment pipeline works when you push to GitHub.
