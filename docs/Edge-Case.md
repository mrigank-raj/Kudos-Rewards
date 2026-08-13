# Edge Cases: Xoxo — Rewards & Recognition Platform

This document catalogs edge cases across every feature area of the platform. Each entry describes the scenario, expected behavior, and recommended handling strategy.

---

## 1. Authentication & Session Management

| # | Edge Case | Expected Behavior | Handling |
|---|-----------|-------------------|----------|
| 1.1 | **User signs up with an email that already exists** | Show clear error: "An account with this email already exists" | Catch Supabase `auth.signUp` error code `user_already_exists`; link to login page |
| 1.2 | **User enters wrong password on login** | Show error: "Invalid email or password" — don't reveal which field is wrong | Catch `invalid_credentials` error; generic message prevents enumeration attacks |
| 1.3 | **Session expires mid-interaction** | Supabase auto-refreshes JWT; if refresh fails, redirect to `/login` with message "Session expired, please log in again" | `onAuthStateChange` listener handles `TOKEN_REFRESHED` and `SIGNED_OUT` events |
| 1.4 | **User opens app in two tabs, logs out in one** | Both tabs should reflect logged-out state | `onAuthStateChange` fires across tabs via `localStorage` events; both tabs redirect to `/login` |
| 1.5 | **User manually navigates to `/admin/*` with a recipient account** | Redirect to `/app/dashboard` with no error (silent role correction) | `ProtectedRoute` checks `profile.role` and redirects to the correct home |
| 1.6 | **User manually navigates to `/app/*` with an admin account** | Redirect to `/admin/dashboard` | Same `ProtectedRoute` logic |
| 1.7 | **User hits a protected route while auth is still loading** | Show a full-screen skeleton/spinner — never flash the login page | `ProtectedRoute` checks `loading` state before deciding to redirect |
| 1.8 | **Signup form submitted with empty name** | Block submission; show inline validation error "Name is required" | Client-side validation before Supabase call; DB `NOT NULL` constraint as fallback |
| 1.9 | **User signs up as admin when org doesn't exist yet** | Auto-create a new organization and assign the admin to it | Signup flow: check if org exists → if not, create one → insert user with `org_id` |
| 1.10 | **Rapid multiple clicks on "Sign Up" / "Log In" button** | Only one request fires; button shows loading state and is disabled | Disable button on click; re-enable on response |

---

## 2. Points & Balance

| # | Edge Case | Expected Behavior | Handling |
|---|-----------|-------------------|----------|
| 2.1 | **Admin credits 0 points** | Block: "Points must be greater than 0" | Client-side validation + DB `CHECK (points > 0)` constraint |
| 2.2 | **Admin credits negative points** | Block: "Use the debit function for negative adjustments" | Input field rejects negative values; absolute value enforced in form |
| 2.3 | **Admin debits more points than the recipient has** | Allow but warn: "This will result in a negative balance of -X points. Continue?" — OR block entirely | **Decision required**: define business rule. Recommendation: **block** with error "Insufficient balance. Current balance: X" |
| 2.4 | **Two admins credit the same user simultaneously** | Both credits should apply; final balance = original + credit1 + credit2 | Atomic `credit_points()` RPC uses `UPDATE ... SET points_balance = points_balance + $1` (no read-then-write race) |
| 2.5 | **Admin credits very large number (e.g., 999,999,999)** | Allow but validate within reasonable bounds | Set max input: 1,000,000 points per transaction; DB column `INTEGER` caps at ~2.1B |
| 2.6 | **Points balance exceeds INTEGER max** | PostgreSQL error | Monitor with a CHECK constraint: `CHECK (points_balance <= 10000000)` — or use `BIGINT` |
| 2.7 | **Transaction inserted but balance update fails** | Inconsistent state: transaction exists but balance is wrong | Wrap in a single `PERFORM` / database function with transaction semantics — both succeed or both roll back |
| 2.8 | **Admin enters a debit reason with special characters (quotes, HTML tags)** | Should display correctly without breaking the UI | React auto-escapes JSX output; DB stores raw text; no `dangerouslySetInnerHTML` used |
| 2.9 | **Admin credits points without specifying a reason** | Block: "Reason is required for audit trail" | `reason` field is required in the form; DB column allows NULL but form enforces it |
| 2.10 | **Points balance shows stale data after mutation** | Balance should update immediately | React Query `invalidateQueries(['users'])` after every credit/debit mutation; optimistic updates for instant UI feedback |

---

## 3. Reward Program Management

| # | Edge Case | Expected Behavior | Handling |
|---|-----------|-------------------|----------|
| 3.1 | **Admin creates a program with 0 points value** | Block: "Points value must be at least 1" | DB `CHECK (points_value > 0)` + form validation |
| 3.2 | **Admin creates a rule-based program but leaves metric/threshold empty** | Block: "Metric and threshold are required for rule-based programs" | Conditional form validation: if `trigger_type === 'rule'`, require `rule_metric` and `rule_threshold` |
| 3.3 | **Admin creates two programs with the same name** | Allow — names are not unique identifiers (IDs are UUIDs) | No unique constraint on `name`; display both in the list |
| 3.4 | **Admin deactivates a program that has pending/in-progress transactions** | Program becomes inactive; existing transactions are unaffected; no new earn transactions can reference it | `is_active = false` only prevents future use; historical data preserved |
| 3.5 | **Admin deletes a program (if supported)** | Soft delete only — set `is_active = false`; never hard delete to preserve transaction history | No DELETE endpoint; only deactivate toggle |
| 3.6 | **Admin edits a program and changes the points value** | Future credits use the new value; past transactions keep their original value | Transactions store `points` at time of creation (snapshot), not a reference to the program's current value |
| 3.7 | **Admin creates a program with a very long description (>5000 chars)** | Accept but truncate display; full text in detail/edit view | DB `TEXT` has no limit; UI truncates with "Show more" at ~200 chars; form could warn at >1000 chars |
| 3.8 | **Program list is empty (new org)** | Show an encouraging empty state: illustration + "Create your first reward program" CTA | `EmptyState` component with a direct link to the create form |
| 3.9 | **Admin filters/searches programs and nothing matches** | Show "No programs match your search" with a clear filter button | Separate empty state for search vs. truly empty |
| 3.10 | **Rule-based trigger fires but metric data is unavailable** | Log a warning; don't crash the evaluation | Since rule evaluation is manual/simulated in MVP, this is informational — admin manually triggers anyway |

---

## 4. Rewards Catalog & Redemption

| # | Edge Case | Expected Behavior | Handling |
|---|-----------|-------------------|----------|
| 4.1 | **Recipient redeems a reward but balance drops between clicking "Redeem" and confirming** | Server-side check in `redeem_reward()` RPC: if `points_balance < points_cost`, return error | RPC function checks balance atomically; UI shows error: "Insufficient points. Your balance may have changed." |
| 4.2 | **Recipient clicks "Redeem" rapidly 5 times** | Only one redemption should process | Disable button on click; RPC uses a serializable transaction or explicit balance check |
| 4.3 | **Recipient tries to redeem with exactly 0 points balance** | "Redeem" button is disabled; tooltip: "You need X more points" | Client-side: `disabled={balance < item.points_cost}` |
| 4.4 | **Recipient redeems their entire balance** | Allow; balance becomes 0; "Redeem" buttons on all items become disabled | Post-mutation, React Query refetches balance; all CatalogCards re-evaluate the disabled state |
| 4.5 | **Catalog item image fails to load** | Show a placeholder image with the item's category icon | `<img onError>` handler swaps to a fallback; CSS `object-fit: cover` for consistency |
| 4.6 | **Catalog is empty (no items configured)** | Show empty state: "No rewards available yet. Check back soon!" | `EmptyState` component on the catalog page |
| 4.7 | **Catalog item has a point cost higher than any user has ever earned** | Still display it but clearly show it's out of reach | Show "You need X more points" in a muted label; maybe a progress bar toward the goal |
| 4.8 | **Two recipients redeem the last "limited" item simultaneously** | Not applicable for MVP — catalog items are unlimited (no stock count) | Future: add `stock` column with decrement + check |
| 4.9 | **Recipient tries to redeem while not authenticated (expired session)** | Redirect to login; preserve intent (return to catalog after re-login) | `ProtectedRoute` redirect with `?returnTo=/app/catalog` query param |
| 4.10 | **Redemption succeeds but the confirmation modal is closed before animation completes** | Transaction is already committed — state is consistent | Modal close doesn't affect backend; balance is already updated via React Query invalidation |

---

## 5. Analytics Dashboard

| # | Edge Case | Expected Behavior | Handling |
|---|-----------|-------------------|----------|
| 5.1 | **No transactions exist yet (brand new org)** | Charts show empty state with a message: "Start recognizing your team to see analytics here" | Each chart component checks for empty data and renders a custom empty state |
| 5.2 | **All transactions happened in a single day** | Charts should still render with at least one data point | Area/line charts show a single point; add padding so it's not just a dot |
| 5.3 | **Very large transaction volumes (10,000+ rows)** | Charts should still load within 2 seconds | Use PostgreSQL aggregation functions (server-side) — never fetch raw rows to the client for charting |
| 5.4 | **Redemption rate exceeds 100%** | Possible if more points are redeemed than issued (e.g., seeded balance + redemption) | Cap display at 100% or show actual value with a note; don't let the Y-axis break |
| 5.5 | **Admin filters by date range with no data in that range** | Show "No data for the selected period" | Conditional rendering per chart when dataset is empty |
| 5.6 | **Top recipients table has fewer than 10 recipients** | Show all available; don't show empty rows | Query with `LIMIT 10` but display only returned rows |
| 5.7 | **All points were issued to a single person** | Pie chart shows 100% for one program; leaderboard has one entry | Charts handle gracefully; pie chart shows one full slice with label |
| 5.8 | **Browser window is very narrow (<375px)** | Charts resize without overlapping labels | Recharts `ResponsiveContainer` handles this; hide axis labels at very small widths |
| 5.9 | **Analytics RPC function times out** | Show error state with retry button | React Query `retry: 2` with exponential backoff; `isError` state shows retry UI |
| 5.10 | **Admin switches between analytics and other pages rapidly** | Previous query should be cancelled; no stale data shown | React Query cancels in-flight queries on component unmount (`signal` support) |

---

## 6. People Management

| # | Edge Case | Expected Behavior | Handling |
|---|-----------|-------------------|----------|
| 6.1 | **Org has no recipients yet** | People table shows empty state: "Invite your team to get started" | `EmptyState` with an explanation of how to add people |
| 6.2 | **Search for a user that doesn't exist** | Show "No users match 'query'" with clear search button | Filter empty state distinct from truly empty state |
| 6.3 | **Admin views a recipient who was just deleted (cascading)** | 404 / user not found | `UserHistory` modal shows error: "User not found" if the query returns null |
| 6.4 | **Transaction history for a user is very long (500+ entries)** | Paginate: show 20 per page with "Load more" or pagination controls | Supabase `.range(offset, offset + limit)` for efficient pagination |
| 6.5 | **Admin accidentally credits wrong user** | No built-in undo — admin must manually debit the same amount | Future: add "Undo" toast with 5-second window before commit. For MVP: admin can debit to correct |
| 6.6 | **Admin sorts by points balance — all balances are 0** | Sort works correctly (stable sort); no visual weirdness | Standard `ORDER BY` handles equal values; UI shows all zeros correctly |
| 6.7 | **Table has 100+ users** | Virtual scrolling or pagination to avoid rendering 100+ DOM rows | Initial MVP: paginate at 25 rows; future: virtual scrolling with `react-window` |
| 6.8 | **Admin tries to credit/debit themselves** | Allow — admins can also be recipients of recognition | No restriction; admin's own balance updates correctly |
| 6.9 | **Admin from Org A sees users from Org B** | Must never happen | RLS policy: `users.org_id = auth_user.org_id` enforced at database level |
| 6.10 | **Concurrent admin edits on the same user's balance** | Both should apply correctly | Atomic `credit_points()` function uses `points_balance + $amount`, not read-then-write |

---

## 7. UI / UX Edge Cases

| # | Edge Case | Expected Behavior | Handling |
|---|-----------|-------------------|----------|
| 7.1 | **User has JavaScript disabled** | Show a `<noscript>` message: "This application requires JavaScript" | Add `<noscript>` tag in `index.html` |
| 7.2 | **Network goes offline during a mutation** | Show error toast: "You appear to be offline. Changes were not saved." | React Query's `onError` callback; check `navigator.onLine` |
| 7.3 | **User resizes browser during chart render** | Charts should reflow smoothly | Recharts `ResponsiveContainer` with `width="100%"` handles this |
| 7.4 | **User navigates back/forward with browser buttons** | App state should be consistent with the URL | React Router handles history; React Query cache ensures data is available |
| 7.5 | **Very long user name (50+ characters)** | Truncate with ellipsis in table cells and sidebar; full name on hover | CSS `text-overflow: ellipsis` + `title` attribute |
| 7.6 | **User copy-pastes rich text into a text field** | Strip formatting; accept plain text only | Input fields naturally strip rich text; `<textarea>` handles this by default |
| 7.7 | **Dark mode toggle mid-animation** | Transition should be smooth, not jarring | CSS `transition: background-color 0.3s, color 0.3s` on key elements |
| 7.8 | **User double-clicks a navigation link** | Only one navigation occurs; no flicker | React Router deduplicates navigations to the same path |
| 7.9 | **Modal is open and user presses Escape** | Modal closes; no action is taken | Modal component listens for `Escape` key event |
| 7.10 | **Modal is open and user clicks outside it** | Modal closes (unless it's a destructive action like confirm delete)** | Backdrop click handler; destructive modals require explicit button click |

---

## 8. Data Integrity & Security Edge Cases

| # | Edge Case | Expected Behavior | Handling |
|---|-----------|-------------------|----------|
| 8.1 | **User modifies the Supabase anon key in DevTools** | RLS still enforces — different key doesn't grant more access | Anon key is public by design; RLS policies are the real security layer |
| 8.2 | **User crafts a direct Supabase REST API call to bypass the UI** | RLS blocks unauthorized operations | Every table has RLS enabled; policies use `auth.uid()` for scoping |
| 8.3 | **User tries SQL injection via form fields** | Supabase client uses parameterized queries — immune to SQL injection | No raw SQL from client; all queries via `.from().select()` which auto-parameterizes |
| 8.4 | **Transaction table has orphaned records (user deleted but transactions remain)** | Shouldn't happen — `ON DELETE CASCADE` on `user_id` FK | Foreign key constraints handle this; transactions are deleted with the user |
| 8.5 | **Supabase service is temporarily unavailable** | App shows error state with retry button; doesn't crash | Global error boundary; React Query retry with backoff |
| 8.6 | **points_balance gets out of sync with sum of transactions** | Periodic reconciliation check (admin tool or scheduled job) | Future: add a DB trigger or cron that validates `SUM(transactions) = points_balance`; for MVP: atomic functions prevent this |
| 8.7 | **User attempts XSS via the "reason" or "message" field** | Script tags are harmless — React escapes all rendered text | No `dangerouslySetInnerHTML`; React's JSX auto-escaping neutralizes XSS |
| 8.8 | **Rate limiting — user spams API calls** | Supabase has built-in rate limiting on the auth and REST APIs | Default Supabase rate limits apply; additional client-side debouncing on search inputs |
