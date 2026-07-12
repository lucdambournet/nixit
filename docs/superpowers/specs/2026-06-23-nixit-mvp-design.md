# NixIt MVP Design

Date: 2026-06-23

## Overview

NixIt is a mobile-friendly web app for high schoolers to quit nicotine together through cohort accountability and social support. The MVP will focus on the core cohort experience plus required push notifications so quitting feels communal, not solitary.

## Goal

Deliver a first release that lets users:

- sign up and create a profile,
- browse and join a future monthly "Nix Date" cohort,
- see their active cohort timeline,
- chat with cohort peers,
- send a "need help" alert to the group,
- receive push notifications for key cohort activity,
- tap out and rejoin later.

## Scope

### Included in MVP

- Email/password signup and profile creation
- Browse future Nix Dates and join any one cohort
- One active cohort per user at a time
- Shared cohort dashboard with timer and status
- Cohort group chatroom
- "Need help" alert button
- Mobile push notifications
- Tap-out flow
- Responsive, clean UI with pastel gradient styling behind white surfaces

### Deferred

- Full onboarding survey
- Advanced user analytics
- Gamification (credits/XP/levels) — daily check-in streak tracking shipped, see
  `docs/superpowers/specs/2026-07-10-daily-checkin-design.md` (Issue #64); an economy layer on top
  remains deferred
- Multi-channel notification settings beyond push and in-app alerts

## Core User Flows

### 1. Signup and profile creation

User signs up with email and password, chooses a username, and uploads a profile image. Signup creates a profile and navigates to the NixIt enrollment page.

### 2. Cohort selection

User views upcoming Nix Dates, selects any future month, and joins that cohort. The system verifies they are not already in an active cohort.

### 3. Cohort dashboard

Once joined, the user lands on their cohort dashboard. It displays:

- the active Nix Date month and start date,
- a countdown/timer since the cohort start,
- cohort size and status,
- quick access to chat,
- a prominent "Need help" alert button.

### 4. Cohort chatroom

Users can send group messages within their active cohort chatroom. Chat messages include text, author, and timestamp. The chatroom supports both normal messages and system-generated help alerts.

### 5. Need help alert

When a user taps the help button, the app:

- posts a help-alert message in the cohort chat,
- sends immediate push notifications to cohort members who opt in.

### 6. Tap out and rejoin

The tap-out button is available on the cohort dashboard. When pressed, the user enters a multi-step tap-out flow:

- select or enter a reason for leaving the cohort,
- review and confirm the tap-out decision,
- the app posts an automatic tap-out request message to the cohort chat.

The cohort must approve the tap-out before the user is removed from the cohort. Approval requires consent from at least half of the cohort's "active" users.

"Active" users are defined as cohort members who have opened the NixIt app at least once in the last 24 hours.

The tap-out approval appears in the cohort chat as a highlighted system message with the user’s reason, the required approval count, and a live approval tally. Active members can tap an "Approve tap-out" button directly in chat.

If the approval threshold is not met, the user remains in the cohort. The tap-out message can stay in the chat for up to 3 days, and the user may undo the tap-out request at any time before final approval, which deletes the message and cancels the request.

Once the tap-out request receives the required approvals, a follow-up system message confirms the tap-out, and the user is removed from the cohort and may join a new future Nix Date cohort.

## Pages and Navigation

- Home / Dashboard
  - Active cohort summary
  - timer and status
  - chat access
  - help alert button
- Cohort Chatroom
  - group messages
  - help alert indicator
- NixIt Enrollment
  - list of future Nix Dates
  - join buttons and cohort details
- Profile / Settings
  - push notification preferences
  - tap-out control
  - basic profile info

## Data Model

### User

- id
- email
- password hash
- username
- profile image URL
- active cohort id
- push notification token(s)
- push notification enabled

### Cohort

- id
- nix date month/year
- start date (first of month)
- member ids
- chat room id
- status

### ChatMessage

- id
- cohort id
- author id
- text
- created at
- type (normal | help-alert)

### TapOut

- id
- user id
- cohort id
- timestamp
- optional reason

## Notifications

Push notifications are a must-have for the MVP.

Send push notifications for:

- new help-alerts from cohort members,
- new cohort chat messages when the recipient is not currently active in the chat,
- cohort join confirmation,
- tap-out confirmation.

In-app alert badges and a notification center on the dashboard should complement push notifications.

## Rules and Constraints

- Cohort size caps at 25 members.
- Users may join any future Nix Date month, not just the next one.
- A user may only be in a single active cohort at a time.
- Users can join another cohort only after tapping out from their current cohort.
- The UI must be responsive and work well on mobile and desktop.

## Success Criteria

- Users can register and create a profile.
- Users can join an upcoming Nix Date cohort.
- Users can view a shared cohort timer on the dashboard.
- Users can participate in a cohort group chat.
- Help alerts post to the cohort and notify members via push.
- Users can tap out and later join a different cohort.

## Future Enhancements

- onboarding survey and tailored support prompts,
- cohort progress stats and streak tracking,
- private messaging or buddy pairing,
- richer notification preferences,
- mobile app wrappers for native push and deeper device integration.
