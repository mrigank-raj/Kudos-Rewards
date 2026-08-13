# Evaluation Criteria: Xoxo — Rewards & Recognition Platform

This document defines how the Xoxo platform will be evaluated across **functional correctness**, **user experience**, **technical quality**, **performance**, and **product thinking**. Each section includes specific test scenarios, acceptance criteria, and a scoring rubric.

---

## Evaluation Summary

| Category | Weight | Sections |
|----------|--------|----------|
| **Functional Completeness** | 30% | Auth, Programs, People, Catalog, Redemption, Analytics |
| **User Experience & Design** | 25% | Visual quality, responsiveness, interactions, accessibility |
| **Technical Quality** | 20% | Code structure, data integrity, security, error handling |
| **Performance** | 10% | Load times, bundle size, query efficiency |
| **Product Thinking** | 15% | Demo readiness, case study, decision articulation |

---

## 1. Functional Completeness (30%)

### 1.1 Authentication & Roles

| Test ID | Scenario | Pass Criteria |
|---------|----------|---------------|
| AUTH-01 | Admin signup | New admin can sign up with name, email, password, and role → lands on `/admin/dashboard` |
| AUTH-02 | Recipient signup | New recipient can sign up → lands on `/app/dashboard` |
| AUTH-03 | Login (admin) | Existing admin can log in → routed to admin dashboard |
| AUTH-04 | Login (recipient) | Existing recipient can log in → routed to recipient dashboard |
| AUTH-05 | Invalid credentials | Wrong password shows a user-friendly error — does not reveal which field is wrong |
| AUTH-06 | Logout | Clicking logout clears session, redirects to `/login` |
| AUTH-07 | Route protection (admin) | Recipient visiting `/admin/*` is redirected to `/app/dashboard` |
| AUTH-08 | Route protection (recipient) | Admin visiting `/app/*` is redirected to `/admin/dashboard` |
| AUTH-09 | Unauthenticated access | Visiting any protected route while logged out → `/login` |
| AUTH-10 | Session persistence | Refreshing the page does not lose the session |

**Scoring**:
- 10/10 pass → Full marks
- 7–9 pass → Minor gaps
- <7 pass → Significant issues

---

### 1.2 Reward Program Management

| Test ID | Scenario | Pass Criteria |
|---------|----------|---------------|
| PROG-01 | Create a manual program | Fill form → program appears in the list immediately |
| PROG-02 | Create a rule-based program | Selecting "rule" trigger shows metric/threshold fields → saves correctly |
| PROG-03 | Edit a program | Change name/description/points → changes reflected in the list and detail views |
| PROG-04 | Deactivate a program | Program shows "Inactive" badge; no longer available for point crediting |
| PROG-05 | Reactivate a program | Inactive program toggled back to active |
| PROG-06 | Program list displays correctly | Shows name, trigger type, points value, status badge for each program |
| PROG-07 | Empty state | No programs → helpful empty state with "Create" CTA |
| PROG-08 | Validation: missing fields | Submitting with empty required fields shows inline errors |

---

### 1.3 People Management

| Test ID | Scenario | Pass Criteria |
|---------|----------|---------------|
| PPL-01 | View people list | Table shows all recipients with name, email, points balance |
| PPL-02 | Credit points | Admin credits 100 points with reason → recipient balance increases by 100 |
| PPL-03 | Debit points | Admin debits 50 points → recipient balance decreases by 50 |
| PPL-04 | View transaction history | Clicking a user shows their full transaction log with dates, types, amounts, reasons |
| PPL-05 | Search/filter | Searching by name filters the table correctly |
| PPL-06 | Balance updates in real-time | After crediting, the table row reflects the new balance without a page reload |
| PPL-07 | Validation: zero or negative credit | Form prevents submitting 0 or negative point values |
| PPL-08 | Validation: missing reason | Form requires a reason for every credit/debit |

---

### 1.4 Recipient Dashboard

| Test ID | Scenario | Pass Criteria |
|---------|----------|---------------|
| DASH-01 | Points balance display | Current balance is prominently shown and matches the database value |
| DASH-02 | Activity feed | Shows recent transactions (credits, debits, redemptions) in chronological order |
| DASH-03 | Activity feed detail | Each entry shows: type icon, points amount, reason/description, timestamp |
| DASH-04 | Quick actions | "Browse Rewards" button navigates to `/app/catalog` |
| DASH-05 | Balance updates after action | After a redemption, returning to dashboard shows the updated balance |

---

### 1.5 Rewards Catalog & Redemption

| Test ID | Scenario | Pass Criteria |
|---------|----------|---------------|
| CAT-01 | Catalog display | Shows 5–8 reward items with images, names, point costs, and categories |
| CAT-02 | Category filter | Filtering by category (gift card / merchandise / experience / all) works correctly |
| CAT-03 | Insufficient balance | "Redeem" button is disabled; shows "Need X more points" |
| CAT-04 | Redeem flow — happy path | Click Redeem → confirmation modal → confirm → points deducted → success feedback |
| CAT-05 | Balance after redemption | Points balance is reduced by the item's cost; reflected immediately in the UI |
| CAT-06 | Transaction created | Redemption creates a `type='redeem'` entry in the transaction history |
| CAT-07 | Redemption record | A row is created in the `redemptions` table with correct `status='pending'` |
| CAT-08 | Multiple redemptions | User can redeem multiple items as long as balance allows |

---

### 1.6 Analytics Dashboard

| Test ID | Scenario | Pass Criteria |
|---------|----------|---------------|
| ANA-01 | Points Issued vs Redeemed chart | Renders with real data; shows monthly breakdown as area or bar chart |
| ANA-02 | Redemption Rate chart | Line chart showing `(redeemed/issued)*100` trend over time |
| ANA-03 | Top Recipients table | Ranked list of recipients by total points earned; correct ordering |
| ANA-04 | Program Breakdown chart | Pie/donut chart showing points distribution per program |
| ANA-05 | Summary stat cards | Total issued, total redeemed, redemption rate %, active programs — all accurate |
| ANA-06 | Charts driven by real data | Charts are NOT hardcoded; adding a transaction updates the chart on refresh |
| ANA-07 | Empty state | No data → friendly message instead of broken/empty charts |
| ANA-08 | Responsive charts | Charts resize correctly on mobile and desktop viewports |

---

## 2. User Experience & Design (25%)

### 2.1 Visual Quality

| Criterion | Excellent (5) | Good (3) | Poor (1) |
|-----------|--------------|----------|----------|
| **Color palette** | Curated, harmonious palette with proper contrast ratios | Decent colors but some clashes or generic choices | Default browser colors or clashing palette |
| **Typography** | Custom web font (e.g., Inter); clear hierarchy (h1–h6 + body) | Custom font but inconsistent sizing/weights | System font with no hierarchy |
| **Component design** | Polished cards, buttons, modals with shadows, borders, and consistent padding | Functional but plain components | Unstyled or visually broken components |
| **Dark mode** | Fully implemented with smooth transitions and proper contrast | Partially implemented — some elements don't respect dark mode | Not implemented or broken |
| **Overall impression** | "This looks like a real product" | "This works but looks like a student project" | "This looks unfinished" |

### 2.2 Responsiveness

| Breakpoint | Pass Criteria |
|------------|---------------|
| **Mobile (375px)** | All pages usable; sidebar collapses to hamburger menu; tables scroll horizontally; charts resize |
| **Tablet (768px)** | Sidebar visible or collapsible; content takes full width; no overflow |
| **Desktop (1280px+)** | Full layout with sidebar + content area; charts at proper sizes; good use of whitespace |

### 2.3 Interactions & Micro-Animations

| Criterion | What to Look For |
|-----------|-----------------|
| **Loading states** | Skeleton loaders or spinners while data loads — never blank screens |
| **Hover effects** | Cards lift, buttons change shade, table rows highlight |
| **Transitions** | Page transitions are smooth (fade/slide); modal open/close is animated |
| **Feedback** | Success/error toasts after mutations; button loading states during async operations |
| **Empty states** | Illustrated, encouraging empty states — not just "No data" text |

### 2.4 Accessibility (Basic)

| Criterion | Pass Criteria |
|-----------|---------------|
| **Keyboard navigation** | All interactive elements reachable via Tab; Enter/Space activates buttons |
| **Focus indicators** | Visible focus rings on all focusable elements |
| **Color contrast** | Text meets WCAG AA contrast ratio (4.5:1 for normal text) |
| **ARIA labels** | Icon-only buttons have `aria-label`; form inputs have associated labels |
| **Screen reader** | Critical flows (login, redeem) are understandable via screen reader |

---

## 3. Technical Quality (20%)

### 3.1 Code Structure

| Criterion | Excellent | Acceptable | Poor |
|-----------|-----------|------------|------|
| **File organization** | Clear separation: pages / components / hooks / config / lib | Mostly organized with a few misplaced files | Flat structure; everything in `src/` |
| **Component design** | Small, focused, reusable components; clear props interface | Some large components but generally reasonable | God components (500+ lines) doing everything |
| **Custom hooks** | All data fetching in hooks; no Supabase calls in components directly | Most data fetching in hooks | Data fetching inline in components |
| **Naming conventions** | Consistent PascalCase components, camelCase hooks/utils, kebab-case filenames | Mostly consistent | Mixed conventions |
| **Dead code** | None | Minimal commented-out code | Significant dead code or unused imports |

### 3.2 Data Integrity

| Test ID | Scenario | Pass Criteria |
|---------|----------|---------------|
| DATA-01 | Credit + balance atomicity | `credit_points()` inserts transaction AND updates balance in a single atomic operation |
| DATA-02 | Redeem + balance atomicity | `redeem_reward()` creates redemption, transaction, and balance update atomically |
| DATA-03 | Balance consistency | `points_balance` on `users` table equals `SUM(credits) - SUM(debits)` in `transactions` |
| DATA-04 | RLS enforcement — cross-org | Admin from Org A cannot see users or transactions from Org B |
| DATA-05 | RLS enforcement — role | Recipient cannot access admin-only data (e.g., all users, all transactions) |
| DATA-06 | FK constraints | Deleting a user cascades to their transactions and redemptions |
| DATA-07 | Input validation | No way to create a program with 0 points, a transaction with 0 amount, or a redemption without sufficient balance |

### 3.3 Error Handling

| Criterion | Pass Criteria |
|-----------|---------------|
| **Network errors** | All API calls have error handling; errors are shown to the user via toasts or inline messages |
| **Error boundaries** | React error boundary prevents white-screen crashes; shows fallback UI |
| **Form validation** | Every form validates required fields, data types, and constraints before submission |
| **Auth errors** | Login/signup errors are user-friendly; no raw Supabase error codes shown |
| **Retry capability** | Failed data fetches show a "Retry" button |

### 3.4 Security

| Criterion | Pass Criteria |
|-----------|---------------|
| **No secrets in client** | Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in client code (both are public by design) |
| **RLS on every table** | All tables have `ENABLE ROW LEVEL SECURITY`; verified via Supabase dashboard |
| **No raw SQL from client** | All queries use Supabase JS client methods (`.from()`, `.select()`, `.rpc()`) — never raw SQL strings |
| **XSS prevention** | No `dangerouslySetInnerHTML`; all user input is escaped by React |
| **CSRF prevention** | Supabase uses JWT in headers (not cookies) — CSRF not applicable |

---

## 4. Performance (10%)

### 4.1 Load Time Benchmarks

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| **First Contentful Paint (FCP)** | < 1.5s | Lighthouse (production build on Vercel) |
| **Largest Contentful Paint (LCP)** | < 2.5s | Lighthouse |
| **Time to Interactive (TTI)** | < 3.0s | Lighthouse |
| **Bundle size (gzipped)** | < 300KB | `npm run build` output |

### 4.2 Runtime Performance

| Criterion | Pass Criteria |
|-----------|---------------|
| **Page navigation** | Route changes feel instant (< 100ms perceived) |
| **Data loading** | Tables and charts load within 1s with skeleton states shown during fetch |
| **Mutation feedback** | Credit/debit/redeem operations complete within 2s with loading feedback |
| **Chart rendering** | Charts render smoothly without jank; resize without lag |
| **Lazy loading** | Admin and recipient page groups are code-split via `React.lazy()` |

---

## 5. Product Thinking (15%)

### 5.1 Demo Readiness

| Criterion | Excellent (5) | Good (3) | Poor (1) |
|-----------|--------------|----------|----------|
| **Seed data quality** | Realistic names, diverse transactions over 6 months, meaningful chart patterns | Some data but sparse or unrealistic | No seed data; empty on first load |
| **First impression** | Platform feels alive and polished on first visit; charts show trends; leaderboard is populated | Functional but feels empty in places | Requires manual data entry to demonstrate anything |
| **End-to-end demo flow** | Can walk through: admin creates program → credits user → user redeems → analytics updates — all in < 5 minutes | Flow works but has gaps or requires explanation | Cannot demonstrate the full loop |

### 5.2 Case Study

| Criterion | Pass Criteria |
|-----------|---------------|
| **Problem statement** | Clearly articulates the problem being solved and who it's for |
| **Solution overview** | Describes what was built with screenshots |
| **Key decisions** | Explains 3+ product/technical decisions with reasoning (e.g., "Why Supabase over Firebase", "Why denormalized balance") |
| **Trade-offs acknowledged** | Honestly discusses what was left out and why |
| **What's next** | Proposes 3+ features for a future iteration with brief rationale |
| **Visual quality** | Includes screenshots and/or a demo video link |

### 5.3 Product Decisions to Articulate

These are the decisions an evaluator would look for in the case study or during a demo walkthrough:

| Decision | What to Explain |
|----------|----------------|
| **Why Supabase over Firebase?** | Relational data model (joins, aggregations) fits R&R better than a document store |
| **Why denormalized `points_balance`?** | Fast reads for the most-accessed value; atomic updates prevent drift |
| **Why no real payment integration?** | Portfolio scope — demonstrating the product loop matters more than payment plumbing |
| **Why TanStack Query?** | Cache management, loading/error states, and cache invalidation — better DX than manual `useEffect` fetching |
| **Why atomic database functions?** | Prevents points balance desync — the most critical data integrity requirement |
| **Why soft-delete programs?** | Preserving transaction history and audit trail is more important than a clean program list |
| **Why seed data matters** | A demo with empty charts and zero users fails to demonstrate value — first impressions are critical |

---

## 6. End-to-End Test Scenarios

These are full user journey tests that validate the complete product loop:

### E2E-01: Admin Creates and Runs a Reward Program

```
1. Admin signs up → lands on admin dashboard
2. Navigates to Programs → creates "Q3 Sales Bonus" (manual, 500 pts)
3. Program appears in the list with "Active" badge
4. Navigates to People → selects a recipient
5. Credits 500 points with reason "Q3 Sales Bonus — Target exceeded"
6. Recipient's balance updates from 0 → 500
7. Transaction appears in the recipient's history
```

**Pass**: All 7 steps complete without errors

### E2E-02: Recipient Redeems a Reward

```
1. Recipient logs in → dashboard shows 500 points balance
2. Activity feed shows the recent credit from Admin
3. Navigates to Catalog → browses rewards
4. Selects "$50 Amazon Gift Card" (300 pts)
5. Confirmation modal shows: cost 300, balance after: 200
6. Confirms → success feedback shown
7. Balance updates to 200
8. Navigates to History → sees both the credit and the redemption
```

**Pass**: All 8 steps complete without errors

### E2E-03: Analytics Reflect Real Activity

```
1. Admin logs in → navigates to Analytics
2. "Points Issued vs Redeemed" chart shows the 500 issued and 300 redeemed
3. "Top Recipients" table shows the recipient who earned 500
4. "Program Breakdown" shows "Q3 Sales Bonus" accounting for 100% of activity
5. Summary cards: Total Issued = 500, Total Redeemed = 300, Redemption Rate = 60%
```

**Pass**: All 5 data points are accurate and visually represented

### E2E-04: Role Isolation

```
1. Recipient logs in → cannot access /admin/* routes
2. Recipient cannot see other recipients' balances or transaction histories
3. Admin from Org A cannot see users from Org B (if multi-org seeded)
```

**Pass**: All 3 isolation checks enforce correctly

---

## 7. Scoring Rubric

### Overall Score Calculation

| Category | Weight | Max Score | Weighted Max |
|----------|--------|-----------|-------------|
| Functional Completeness | 30% | 100 | 30 |
| User Experience & Design | 25% | 100 | 25 |
| Technical Quality | 20% | 100 | 20 |
| Performance | 10% | 100 | 10 |
| Product Thinking | 15% | 100 | 15 |
| **Total** | **100%** | | **100** |

### Grade Bands

| Score | Grade | Description |
|-------|-------|-------------|
| 90–100 | **Exceptional** | Portfolio-ready; demonstrates professional-level product and engineering thinking |
| 75–89 | **Strong** | Feature-complete with good design; minor gaps in polish or edge case handling |
| 60–74 | **Adequate** | Core loop works but has noticeable UX or technical gaps |
| 40–59 | **Below Expectations** | Major features missing or broken; poor visual design |
| <40 | **Insufficient** | Incomplete; cannot demonstrate the core reward-redeem loop |

---

## 8. Quick Verification Checklist

A fast pass/fail checklist for rapid evaluation:

- [ ] App loads at a public URL without errors
- [ ] Admin can sign up and log in
- [ ] Recipient can sign up and log in
- [ ] Admin can create a reward program
- [ ] Admin can credit points to a recipient
- [ ] Recipient can see their updated balance
- [ ] Recipient can browse the rewards catalog
- [ ] Recipient can redeem a reward (points deducted)
- [ ] Analytics dashboard shows at least 2 charts with real data
- [ ] App has seed data — doesn't look empty on first visit
- [ ] UI is responsive on mobile
- [ ] Dark mode works
- [ ] No console errors during normal usage
- [ ] Case study / write-up is complete
