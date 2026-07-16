# Tasks — Backlog Clearance

Legend: [ ] pending, [~] in progress, [x] done (PR merged + issue closed)

- [x] #22 QA unit tests auth/join — branch `issue-22-auth-join-unit-tests` (PR #78)
- [x] #23 QA integration test signup→join→dashboard — branch `issue-23-signup-join-dashboard-e2e` (PR #79)
- [x] #76 CraveCrushers follow-ups (5 sub-fixes) — branch `issue-76-cravecrushers-followups`
- [x] #47 Chat backend gap-fill (tap-out-request message type) — branch `issue-47-chat-tapout-message-type` (needs manual SQL migration on live project, see PR)
- [x] #51 Push notification service (VAPID, push_subscriptions, edge fn stub) — branch `issue-51-push-notifications` (needs manual SQL migration + edge fn deploy + VAPID secrets, see PR)
- [x] #48 Help alert workflow + dispatch — branch `issue-48-help-alert-workflow`
- [x] #50 Tap-out request/approval/undo — branch `issue-50-tapout-workflow` (schema migrated live; also fixed a real double-count bug in member_count + broken DND grant, both pre-existing)
- [x] #49 Notification preferences + in-app center — branch `issue-49-notification-center`
- [x] #69 Mobile DrawerNav — branch `issue-69-mobile-drawernav`
- [x] #52 UI polish / responsive / onboarding transitions — branch `issue-52-ui-polish`
- [x] #53 Final QA / launch readiness — branch `issue-53-launch-readiness` (hardened test isolation for help-alert/notification-preferences specs; full suite green)

Each: implement → `npm run test` (+ relevant Playwright spec) → PR (closes #N) → merge to main → next branch cut from updated main.

## Backlog cleared — all 11 issues closed (#22, #23, #76, #47, #51, #48, #50, #49, #69, #52, #53)

Real bugs found and fixed along the way (all pre-existing, not introduced this pass):
- Stale worktree test files were being picked up by `vitest run tests/unit` and hitting the live DB repeatedly (#22).
- Signup form's chosen username was silently discarded whenever email confirmation was required (#23).
- CraveCrushers session logging double-fired under React 18 StrictMode in dev, polluting `craving_sessions` (#76).
- `cohorts.member_count` was double-counting on every join/leave (undocumented trigger + redundant manual increment in `join_cohort`/`leave_cohort`) — some cohorts showed as full while mostly empty (#50).
- DND toggle was silently broken by an incomplete column-level UPDATE grant (#50).
- Orphaned test cohorts from interrupted debug runs were leaking into the live enrollment picker (#52).
- Two E2E specs shared a mutable cohort and raced under parallel workers (#53).
