# Requirements — Backlog Clearance (Issues #22,23,76,47,51,48,50,49,69,52,53)

Architecture note: nixit is a Vite/React SPA talking directly to Supabase (auth, Postgres via RLS, Realtime). There is no custom backend server. Where an issue describes REST endpoints (e.g. `POST /cohorts/:id/tap-out-requests`), the equivalent is implemented as a Supabase table + RLS policy + `security definer` RPC, invoked via `supabase-js`, consistent with the existing `join_cohort` / `chat_messages` pattern.

## #22 — QA: Unit tests for auth and join logic
- WHEN a user signs up with a duplicate email, THE SYSTEM SHALL reject signup with a clear error.
- WHEN a user attempts to join a cohort that is at `max_members`, THE SYSTEM SHALL reject the join.
- WHEN a user attempts to join while already having an `active_cohort_id`, THE SYSTEM SHALL reject the join.
- THE SYSTEM SHALL have unit tests covering these paths for `join_cohort` and signup validation logic.

## #23 — QA: Integration test for signup→join→dashboard flow
- WHEN a new user signs up, joins a cohort, and lands on the dashboard, THE SYSTEM SHALL render cohort data correctly end-to-end (Playwright).

## #76 — CraveCrushers follow-ups
- WHEN a user exits a craving-game session via sidenav (not the in-game Done button), THE SYSTEM SHALL still log the session (`endSession` on unmount).
- WHEN the Craving Countdown reaches 0:00, THE SYSTEM SHALL auto-return to the picker and log the session without requiring a manual tap.
- THE SYSTEM SHALL tune `AI_FOLLOW_SPEED` (or add lag/error term) so the Ping-Pong AI is beatable.
- THE SYSTEM SHALL have a test asserting a `craving_sessions` row is written on `endSession`.
- THE SYSTEM SHALL consolidate session start-time tracking to one source of truth (`useCravingSession`).

## #47 — Cohort chatroom and message backend
- Largely implemented on `main` already (`chat_messages` table, RLS, realtime subscription, `ChatScreen`). Remaining gap: no `tap-out-request` message type (only `normal`/`help-alert` exist).
- WHERE a tap-out request/approval occurs, THE SYSTEM SHALL be able to render it as a distinct chat message type.

## #51 — Push notification service integration
- THE SYSTEM SHALL register a service worker and use Web Push (VAPID) for browser push.
- WHEN a user opts in, THE SYSTEM SHALL request notification permission and register a push subscription, storing it securely (own-row-only RLS) in a `push_subscriptions` table.
- THE SYSTEM SHALL provide a dispatch helper capable of sending a push payload to a user's stored subscriptions for help-alert and tap-out events.
- IF no server-side push secret (VAPID private key) is configured, THEN THE SYSTEM SHALL no-op the actual network send but keep subscription storage/UI functional (documented gap — needs `VAPID_PRIVATE_KEY` secret in a server context, which this SPA-only repo does not have; dispatch is exposed as a Supabase Edge Function stub).

## #48 — Help alert workflow and notification dispatch
- WHEN a user taps "Help Alert" on the dashboard, THE SYSTEM SHALL insert a `help-alert` chat message visible distinctly to the cohort.
- THE SYSTEM SHALL dispatch a push notification (via #51's helper) to cohort members with alerts enabled.

## #50 — Tap-out request, approval, and undo workflow
- WHEN a user requests tap-out, THE SYSTEM SHALL create a `tap_out_requests` row (status `pending`).
- WHEN cohort members approve, THE SYSTEM SHALL record approvals; WHEN approvals reach a threshold, THE SYSTEM SHALL mark the requester tapped-out (clear `active_cohort_id`).
- WHILE a request is pending and the requester has not been removed, THE SYSTEM SHALL allow the requester to undo (delete) their own request.
- THE SYSTEM SHALL surface request status and approval counts in the chat/UI.

## #49 — Notification preferences and in-app notification center
- THE SYSTEM SHALL provide a settings screen to toggle push categories (help-alert, tap-out).
- THE SYSTEM SHALL show an in-app badge/notification center listing recent alerts.
- THE SYSTEM SHALL respect stored preferences when dispatching (#48/#50 dispatch checks preference row first).

## #69 — Mobile layout: SideNav → DrawerNav
- WHILE viewport is mobile-width, THE SYSTEM SHALL move primary navigation to the bottom (drawer/tab bar) instead of top/side, reclaiming vertical space so the timer is not cut off.

## #52 — Polish UI, responsive design, onboarding transitions
- THE SYSTEM SHALL refine spacing/color/responsive CSS and add onboarding transition polish across dashboard, chat, enrollment — done last so it reflects the final feature set.

## #53 — Final tests, launch readiness, bugfix validation
- THE SYSTEM SHALL have E2E coverage for signup, join, chat, help-alert, tap-out.
- THE SYSTEM SHALL be checked cross-device (mobile/desktop) and pass a final bugfix pass.
