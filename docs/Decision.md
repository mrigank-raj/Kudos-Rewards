# Product & Engineering Decision Log
*A record of strategic product choices and technical architecture decisions, focusing on feasibility, user experience, and scalability.*

---

## Post-Phase 6 Decisions

### 1. Introduction of Peer-to-Peer (P2P) Kudos Feed
- **Decision:** Implemented a social recognition feed allowing recipients to send points and shoutouts to colleagues.
- **Why we did it:** Top-down (Manager-to-Employee) recognition often creates bottlenecks and limits engagement. A P2P system democratizes recognition, creating a viral loop of engagement.
- **PM Value:** Increases Daily Active Users (DAU), fosters a strong horizontal company culture, and provides organizations with organic data on cross-functional collaboration.

### 2. Atomic Point Transfers via Postgres RPC (`send_kudos`)
- **Decision:** Built the P2P points transfer entirely within a PostgreSQL Stored Procedure (RPC) rather than executing multiple API calls from the React frontend.
- **Why we did it:** Moving points from User A to User B requires strict atomicity. If the network failed halfway through client-side API calls, User A could lose points without User B receiving them, or vice-versa.
- **PM Value:** Guarantees 100% data integrity and prevents exploits (e.g., race conditions causing negative balances). System reliability directly impacts user trust in the rewards platform.

### 3. Automated User Onboarding via Postgres Triggers
- **Decision:** Bypassed frontend Row-Level Security (RLS) constraints for new signups by moving profile creation to a backend Postgres Trigger (`handle_new_user`).
- **Why we did it:** Supabase enforces Email Confirmations by default, preventing immediate authenticated sessions. This caused RLS policies to block the frontend from inserting the user's initial profile and 500-point balance.
- **PM Value:** Radically improves the "Time to First Value" (TTFV). Users no longer hit schema errors or wait for email loops; the backend automatically provisions their account, allowing a frictionless Day 1 experience.

### 4. Real-time Balance Synchronization (State Management Fix)
- **Decision:** Exposed a `refreshProfile` method in the global `AuthContext` to instantly sync the user's balance with the database upon redemptions and Kudos transfers.
- **Why we did it:** We encountered a state-desync issue where the database correctly deducted points, but the frontend context held a stale balance.
- **PM Value:** Prevents user frustration. Displaying an artificially high balance leads to "insufficient funds" errors when the user tries to spend points they no longer have, which is a major driver of customer support tickets.
