# Tasks — Backlog Clearance

Legend: [ ] pending, [~] in progress, [x] done (PR merged + issue closed)

- [x] #22 QA unit tests auth/join — branch `issue-22-auth-join-unit-tests` (PR #78)
- [ ] #23 QA integration test signup→join→dashboard — branch `issue-23-signup-join-dashboard-e2e`
- [x] #76 CraveCrushers follow-ups (5 sub-fixes) — branch `issue-76-cravecrushers-followups`
- [x] #47 Chat backend gap-fill (tap-out-request message type) — branch `issue-47-chat-tapout-message-type` (needs manual SQL migration on live project, see PR)
- [x] #51 Push notification service (VAPID, push_subscriptions, edge fn stub) — branch `issue-51-push-notifications` (needs manual SQL migration + edge fn deploy + VAPID secrets, see PR)
- [x] #48 Help alert workflow + dispatch — branch `issue-48-help-alert-workflow`
- [ ] #50 Tap-out request/approval/undo — branch `issue-50-tapout-workflow`
- [ ] #49 Notification preferences + in-app center — branch `issue-49-notification-center`
- [ ] #69 Mobile DrawerNav — branch `issue-69-mobile-drawernav`
- [ ] #52 UI polish / responsive / onboarding transitions — branch `issue-52-ui-polish`
- [ ] #53 Final QA / launch readiness — branch `issue-53-launch-readiness`

Each: implement → `npm run test` (+ relevant Playwright spec) → PR (closes #N) → merge to main → next branch cut from updated main.
