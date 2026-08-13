# Context: Kudos — Employee & Channel Partner Rewards & Recognition Platform

## What Is This?

Kudos is a **web-based SaaS platform** that enables organizations to create, manage, and track **reward and recognition (R&R) programs** for employees and channel partners. It is a portfolio-scope implementation inspired by platforms like Kudosday, Empuls, and Bonusly — focused on demonstrating the **core product loop end-to-end**.

---

## The Problem

Organizations need to recognize and reward good performance — whether from employees (hitting sales targets, peer recognition, work anniversaries) or channel partners (resellers hitting volume targets). Today, this is done manually via spreadsheets, physical gift cards, and email approvals — a process that is **slow, inconsistent, and provides no visibility** into whether the program is actually driving engagement.

### Core Value Propositions

| For | Value |
|-----|-------|
| **Admins** | Define reward rules once → auto-apply or approve with a lightweight step |
| **Recipients** | Simple, motivating way to see and redeem what they've earned |
| **Org Leaders** | Data-driven visibility into program effectiveness |

---

## Users & Roles

### Admin (Org / HR / Manager)
- Creates and manages reward programs
- Defines rules for point allocation (manual or rule-based triggers)
- Manages employee/partner roster and point balances
- Approves or triggers reward disbursement
- Views engagement analytics

### Recipient (Employee / Channel Partner)
- Views points balance and recognition history
- Receives recognition/points (automated or peer-given)
- Browses and redeems from a rewards catalog
- Views a leaderboard *(stretch goal)*

---

## MVP Feature Scope

| # | Feature | Description |
|---|---------|-------------|
| 1 | **Auth & Roles** | Simple login/signup with role selection (Admin vs Recipient); basic session handling |
| 2 | **Reward Program Management** | Admins create programs with name, trigger type (manual/rule-based), point value; view, edit, deactivate |
| 3 | **People Management** | Admin view of employees/partners with balances; manual credit/debit with reason; individual transaction history |
| 4 | **Recipient Dashboard** | Point balance, activity feed (points received, redemptions), peer kudos *(stretch)* |
| 5 | **Rewards Catalog & Redemption** | 5–8 mock rewards (gift cards, merchandise, experiences); redeem flow with point deduction — simulated, no real fulfillment |
| 6 | **Analytics Dashboard** | Points issued vs redeemed, redemption rate chart, most recognized recipients, program-wise breakdown |
| 7 | **Leaderboard** | Ranked list of top recipients by points earned *(stretch goal)* |

---

## Data Model

```
User           → id, name, email, role, org_id, points_balance, created_at
Organization   → id, name, created_at
RewardProgram  → id, org_id, name, description, trigger_type, rule_metric, rule_threshold, points_value, is_active, created_at
Transaction    → id, user_id, type (earn/redeem/manual_credit/manual_debit), points, reason, program_id?, created_at
CatalogItem    → id, name, description, image_url, points_cost, category
Redemption     → id, user_id, catalog_item_id, points_spent, status, created_at
Kudos (stretch)→ id, from_user_id, to_user_id, message, points_included, created_at
```

---

## Technical Constraints & Stack

| Layer | Choice |
|-------|--------|
| **Frontend** | React + Tailwind CSS |
| **Backend / DB** | Supabase or Firebase (auth + database without custom backend) |
| **Charts** | Recharts or Chart.js |
| **Hosting** | Vercel |

---

## Non-Functional Requirements

- **Responsive** — usable on mobile and desktop
- **Persistent data** — real database, not just local state
- **Clean, modern UI** — avoid generic/templated look
- **Demo-ready** — seeded with realistic sample data (orgs, users, programs, transaction history) so it's impressive on first load

---

## Explicitly Out of Scope

- HRMS / ERP integrations
- Real payment processing or gift card fulfillment
- Multi-currency / international payouts
- Enterprise SSO / SAML
- Channel partner-specific workflows (beyond treating them as another recipient type)
- Notification systems (email/push) — mocked or skipped

---

## Definition of Done

- [ ] Admin can create a reward program and see it reflected in the system
- [ ] Admin can manually credit points to a recipient
- [ ] Recipient can log in, see their balance, and redeem a reward from the catalog
- [ ] Analytics dashboard shows at least 2 real charts driven by actual transaction data
- [ ] Platform is seeded with realistic demo data for live demonstration
- [ ] Deployed live with a public URL
- [ ] Short case study written covering: the problem, what was built, key product decisions, and what would be built next
