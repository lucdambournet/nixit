# NixIt Sprint Backlog

Date: 2026-06-23

This sprint backlog breaks the approved MVP plan into four sprint-ready batches with features, stories, and tasks.

Supabase is the chosen backend platform for auth, database storage, and realtime cohort/chat support.

## Sprint 1: Core auth, cohort enrollment, and dashboard

### Goals

- Enable account creation
- Present available Nix Dates
- Allow users to join a cohort
- Show active cohort details and timer

### Features and Stories

1. User registration and profile
   - Story: As a new user, I want to sign up with email/password and create a profile so I can join NixIt.
   - Acceptance:
     - signup endpoint exists
     - username/profile image entry exists
     - success redirects to cohort enrollment

2. Cohort listing and join flow
   - Story: As a user, I want to browse future Nix Dates and join one cohort so I can quit with others.
   - Acceptance:
     - user sees a list of upcoming first-of-month cohorts
     - user can join a cohort if they have no active cohort
     - cohort membership caps at 25

3. Active cohort dashboard
   - Story: As a cohort member, I want to see my cohort’s start date, timer, and status on my dashboard.
   - Acceptance:
     - dashboard shows cohort month, start date, and timer
     - dashboard shows cohort count and active status
     - dashboard links to chat and tap-out

### Tasks

#### Backend

- set up Supabase project, configure database tables, auth, and realtime
- create `User`, `Cohort`, and `NixDate` models
- build auth/signup endpoint with profile creation
- build `GET /cohorts` or `GET /nix-dates`
- build `POST /cohorts/:id/join`
- build `GET /users/:id/active-cohort`
- build dashboard data endpoint
- add validation for one active cohort per user and 25-member limit

#### Frontend

- build signup page and profile capture UI
- build cohort enrollment page with list of future months
- build join cohort flow and error handling
- build cohort dashboard view with timer and cohort details
- add responsive layout for mobile screens

#### QA

- test signup and profile creation
- test cohort listing and join restrictions
- test dashboard data and timer display
- validate responsive behavior on mobile/desktop

---

## Sprint 2: Cohort chatroom and help alert notifications

### Goals

- Add cohort group chat
- Add help alert flow
- Deliver push notification support for help alerts

### Features and Stories

1. Cohort chatroom
   - Story: As a cohort member, I want to chat with peers so I can get and offer support.
   - Acceptance:
     - users can send and receive chat messages
     - messages show author, timestamp, and content
     - chat supports system messages for help-alerts

2. Help alert
   - Story: As a user in distress, I want to send a quick help alert to my cohort.
   - Acceptance:
     - help alert posts a special message in chat
     - cohort members receive push notifications if enabled
     - help alerts appear in the dashboard notification center

### Tasks

#### Backend

- add `ChatMessage` model and chat storage
- build `GET /cohorts/:id/messages` and `POST /cohorts/:id/messages`
- define message types: normal, help-alert, tap-out request
- integrate push notification service and token storage
- build help alert endpoint with push dispatch
- add in-app notification records or badge endpoint

#### Frontend

- build chatroom UI and message feed
- support sending text messages
- render help alert system messages distinctly
- add help alert button to dashboard
- add in-app notification badge/notification center UI
- create push permission prompt and enable workflow

#### Notifications

- configure push service for web browser/mobile browsers
- register device/browser push tokens
- dispatch notifications for help alerts
- ensure opt-in settings are respected

#### QA

- test chat send/receive
- test help alert creation and chat appearance
- test push notifications for help alerts
- test notification opt-in behavior

---

## Sprint 3: Tap-out approval workflow and notification settings

### Goals

- Implement tap-out request, approval, and undo
- Add notification preference controls
- Support active-user approval rules

### Features and Stories

1. Tap-out workflow
   - Story: As a user, I want to request a tap-out and receive cohort approval so I only leave with consensus.
   - Acceptance:
     - tap-out button available on dashboard
     - reason entry and confirmation flow exists
     - automatic tap-out request posts to chat
     - required approvals and live tally display correctly
     - tap-out persists for up to 3 days
     - user can undo the request before approval
     - if approvals fail, user stays in cohort
     - once approved, user is removed from cohort

2. Notification preferences
   - Story: As a user, I want to manage push notifications so I only receive alerts I want.
   - Acceptance:
     - settings page includes push notification toggle
     - help-alert and chat notification preferences are respected

### Tasks

#### Backend

- add `TapOutRequest` model and approval state
- add `ActiveUser` logic based on app usage in last 24 hours
- build `POST /cohorts/:id/tap-out-requests`
- build `POST /tap-out-requests/:id/approve`
- build `DELETE /tap-out-requests/:id` for undo
- build logic to calculate required approvals and enforce persistence rules
- build notification endpoints for tap-out updates
- add notification preference model/API

#### Frontend

- build multi-step tap-out UI on dashboard
- add reason selection / free text entry
- add confirmation modal and final submit
- render tap-out request system message in chat with approval count and approve button
- add undo tap-out action for requesters
- build notification settings screen

#### Notifications

- dispatch notifications for tap-out request creation and approval/rejection updates
- ensure settings toggle prevents unwanted notifications

#### QA

- test tap-out request creation and chat posting
- test approval flows and active-user threshold logic
- test undo behavior and persistence for 3 days
- test notification preference toggling

---

## Sprint 4: UI polish, final testing, and launch prep

### Goals

- Polish UI and responsiveness
- Finish end-to-end validation
- Prepare for launch-ready quality

### Features and Stories

1. UI polish and responsive improvements
   - Story: As a user, I want a smooth, visually consistent interface on mobile and desktop.
   - Acceptance:
     - layout adapts cleanly to narrow screens
     - pastel gradient styling is applied
     - dashboard, chat, and enrollment views are polished

2. Final testing and bugfixes
   - Story: As a product team, we want the app to work reliably in common scenarios.
   - Acceptance:
     - integration tests pass for all core flows
     - manual checks confirm push notifications, chat, and tap-out behavior

### Tasks

#### Frontend

- refine responsive CSS and spacing
- tune color usage and component styling
- improve onboarding flow transitions
- finalize dashboard and chat UX

#### Backend

- review validation and error handling across APIs
- optimize database queries for cohort and chat data
- audit push notification delivery logic

#### QA / Testing

- run end-to-end tests for signup, cohort join, chat, help alert, and tap-out
- run cross-device checks for mobile and desktop
- verify push notifications on supported browsers/devices
- fix remaining bugs and edge cases

---

## Task format for execution

Each sprint task should be tracked as:

- Title
- Description
- Acceptance criteria
- Dependencies
- Estimated effort
- Owner

Example:

- Title: Build cohort join API
- Description: Implement the backend endpoint to join a selected Nix Date cohort, enforce one active cohort per user, and cap cohorts at 25 members.
- Acceptance criteria:
  - endpoint accepts cohort id and user session
  - returns success only if user has no active cohort
  - cohort member count does not exceed 25
- Dependencies: auth, cohort model
- Effort: 3 points

---

## Recommended prioritization

1. Sprint 1 tasks first: these unlock the basic user flow.
2. Sprint 2 tasks second: they add the social and notification value.
3. Sprint 3 tasks third: they add the cohort governance behavior.
4. Sprint 4 last: polish, cleanup, and launch readiness.
