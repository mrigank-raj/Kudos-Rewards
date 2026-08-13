# Kudos: Employee Recognition & Rewards Platform

## Overview
**Kudos** is a full-stack, enterprise-grade Employee Recognition and Rewards platform. Built with a strong **Product Management lens**, this project prioritizes **feasibility, scalability, and exceptional user experience**, while rigorously handling edge cases and database integrity.

The product aims to boost employee retention, engagement, and cross-functional collaboration by providing a centralized hub where organizations can distribute reward points and employees can redeem them for tangible benefits or shout out their peers.

## 🎯 Value Proposition & Product Strategy
- **For Employees**: A seamless, gamified experience to earn, track, and redeem points for meaningful rewards (e.g., gift cards, PTO). Empowers peer-to-peer recognition to build a positive culture.
- **For Managers/Admins**: A powerful dashboard to track engagement metrics, issue spot bonuses, and manage catalog items, driving alignment with company values.
- **For the Business**: Increases employee retention (reducing churn costs) and provides measurable data on team engagement and top performers.

## 🚀 Key Features & MVP Scope
1. **Role-Based Workflows**: Segregated experiences for Admins (point issuance, catalog management, analytics) and Recipients (point redemption, activity feed).
2. **Atomic Transactions**: The core points ledger is built on strictly atomic PostgreSQL RPC functions to prevent race conditions, double-spending, and negative balances.
3. **Peer-to-Peer Recognition (Social Feed)**: Employees can attach points to public shoutouts, fostering a culture of continuous appreciation.
4. **Real-time Synchronization**: The UI reflects point balances instantly across multiple tabs using React Query and Supabase Auth subscriptions.
5. **Secure Authentication**: Built on Supabase GoTrue with automated Row-Level Security (RLS) and Postgres triggers for seamless onboarding.

## 🛠 Tech Stack
- **Frontend**: React (Vite), Tailwind CSS, React Query (Tanstack), Lucide Icons, date-fns.
- **Backend & Database**: Supabase (PostgreSQL), Row-Level Security (RLS), custom Stored Procedures (RPC).
- **Deployment**: Vite build optimized for Vercel/Netlify.

## 📈 Product & Engineering Decisions
To understand the "Why" behind the technical and product choices (e.g., why we chose an immutable ledger over direct balance updates, how we handled RLS edge cases, and the introduction of P2P Kudos), please read the [Decision Log](docs/Decision.md).

## 🧪 Edge Cases Handled (The "PM Lens")
- **Double-spend prevention**: Database-level constraints ensure a user cannot redeem a reward if their balance drops below the cost during the request.
- **Null states & Onboarding**: The app gracefully handles empty feeds, missing avatars, and first-time logins with encouraging empty states (e.g., "Be the first to recognize a colleague!").
- **Auth Integrity**: Database triggers (`handle_new_user`) ensure that whenever a user signs up, their public profile and initial point balance are created synchronously, bypassing RLS pitfalls.

## Running Locally
```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

*Note: You must connect your own Supabase project and run the provided SQL migrations in the `supabase/migrations` folder to initialize the database.*
