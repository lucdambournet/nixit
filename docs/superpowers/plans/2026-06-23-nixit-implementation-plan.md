# NixIt Implementation Plan

Date: 2026-06-23

## Overview

This implementation plan follows the approved MVP design for NixIt, focusing on cohort sign-up, shared quitting timeline, cohort chat, help alerts, tap-out approval, and mobile push notifications.

## Features

1. Email/password signup and profile creation
2. Cohort enrollment for future Nix Dates
3. Active cohort dashboard with shared timer
4. Cohort group chatroom
5. Help alert with push notification delivery
6. Tap-out approval workflow with active-user consent
7. Notification preferences and in-app alert surface

## Stories and Acceptance Criteria

### Story 1: User Registration and Profile

- As a new user, I want to register with email, password, username, and profile image so I can create an account.
- Acceptance criteria:
  - user can create an account with a valid email and password
  - user can choose a username and upload a profile image
  - successful signup redirects to the NixIt enrollment page

### Story 2: Cohort Enrollment

- As a user, I want to browse future Nix Dates and join one cohort so I can participate in a shared quit group.
- Acceptance criteria:
  - user sees a list of upcoming monthly Nix Dates
  - user can join any future Nix Date cohort
  - the system prevents joining if the user has an active cohort
  - cohorts are capped at 25 members

### Story 3: Active Cohort Dashboard

- As a cohort member, I want to see my active cohort details and timer so I understand my quitting progress.
- Acceptance criteria:
  - dashboard shows Nix Date month, start date, and shared timer
  - dashboard shows cohort size and status
  - dashboard includes quick links to chat and tap-out

### Story 4: Cohort Chatroom

- As a cohort member, I want to chat with peers in a shared room so I can support and motivate one another.
- Acceptance criteria:
  - active cohort members can send and view text chat messages
  - messages show author, timestamp, and content
  - system-generated messages support help-alert and tap-out request types

### Story 5: Help Alert with Notifications

- As a user in distress, I want to send a help alert to my cohort so the group can support me immediately.
- Acceptance criteria:
  - help alert posts a special message in the cohort chat
  - cohort members who enabled push notifications receive a notification
  - the help alert is visible in the chatroom and dashboard notification center

### Story 6: Tap-Out Approval Workflow

- As a user, I want to request a tap-out and get approval from active cohort members so I only leave with group consensus.
- Acceptance criteria:
  - tap-out button is available on the cohort dashboard
  - users select or enter a reason and confirm the tap-out request
  - an automatic tap-out request message appears in cohort chat
  - the message displays the required approval count and live tally
  - approval requires consent from at least half of active users
  - if approvals are not met, the user remains in the cohort
  - the tap-out message persists for 3 days and can be undone by the requester
  - once approved, the user is removed from the cohort and may join another future cohort

### Story 7: Notification Preferences and In-App Alerts

- As a user, I want to control notification settings and see alerts inside the app so I can manage how I receive cohort updates.
- Acceptance criteria:
  - user can enable or disable push notifications
  - notification badges appear for new chat activity and help alerts
  - push and in-app alert behavior is consistent with user preferences

## Tasks

### Backend

- Define and implement data models:
  - User
  - Cohort
  - ChatMessage
  - TapOutRequest
  - NotificationSubscription
- Implement authentication endpoints and profile creation
- Implement cohort and Nix Date APIs:
  - list available cohorts
  - join cohort
  - verify active cohort status
- Implement active cohort dashboard APIs:
  - get cohort details
  - compute shared timer
- Implement chat APIs:
  - send message
  - fetch messages
  - send system messages for help-alert and tap-out request
- Implement help alert handling and push notification dispatch
- Implement tap-out workflow APIs:
  - create tap-out request
  - approve tap-out request
  - undo tap-out request
  - enforce approval thresholds and active-user rules
- Implement notification preference APIs
- Add backend validation and error handling for cohort constraints

### Frontend

- Create signup and profile screens
- Create NixIt enrollment page with future Nix Dates
- Create cohort dashboard UI with timer, status, help alert, and tap-out button
- Create cohort chatroom UI with message feed and help-alert/tap-out message rendering
- Create tap-out multi-step modal/page:
  - reason selection/entry
  - confirmation
  - undo option
- Create notification preferences/settings UI
- Implement in-app notification badges and notification center indicators
- Add responsive styling and pastel gradient UI treatment

### Notifications

- Integrate push notification service for web/mobile browsers
- Register and store push tokens for users
- Dispatch push notifications for:
  - help alerts
  - chat activity when user is inactive in chat
  - cohort join confirmation
  - tap-out request and approval status updates
- Add fallback in-app alerting

### QA / Testing

- Create unit tests for backend APIs and validation logic
- Create integration tests for key user flows:
  - signup and onboarding
  - cohort join and dashboard display
  - chat messaging
  - help alert notification flow
  - tap-out request, approval, undo, and cohort persistence
- Test push notification delivery and user preference handling
- Test responsiveness on mobile and desktop layouts

## Dependencies and Risks

- Reliable push notification support is required for the MVP
- Cohort approval logic must handle active user counts in low-activity cohorts
- Chatroom and notification timing must remain consistent for cohort members
- Tap-out undo and persistence behavior must avoid accidental cohort removal

## Implementation Approach

1. Build backend models and APIs for auth, cohorts, chat, and notifications
2. Build frontend signup, enrollment, and cohort dashboard
3. Add chatroom and help alert integration
4. Add tap-out workflow and approval flow
5. Add notification settings and push delivery
6. Test end-to-end flows and validate cohort rules

## Delivery Plan

- Sprint 1: Authentication, cohort listing, cohort join, dashboard
- Sprint 2: Chatroom, help alert, push notification basics
- Sprint 3: Tap-out approval workflow, undo flow, notification preferences
- Sprint 4: UI polish, responsive behavior, final testing
