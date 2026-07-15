# Design — Backlog Clearance

## Execution order (dependency-driven)
1. #22 QA unit tests (independent, fast, foundational)
2. #23 QA integration test (independent, fast, foundational)
3. #76 CraveCrushers fast-follows (independent, self-contained)
4. #47 Chat backend gap-fill (adds `tap-out-request` message type; base for #48/#50)
5. #51 Push service (VAPID + `push_subscriptions` table; base for #48/#49/#50)
6. #48 Help alert (uses #47 message type + #51 dispatch)
7. #50 Tap-out workflow (uses #47 message type + #51 dispatch)
8. #49 Notification preferences + center (uses #51 subscriptions + #48/#50 events)
9. #69 Mobile DrawerNav (UI, after nav-consuming features exist)
10. #52 UI polish (after all features exist)
11. #53 Final QA / launch readiness (last, validates everything)

Each issue = one branch off `main` (`issue-N-slug`), one PR, squash-merged to `main` after local test run, issue closed via PR closing keyword.

## Data model additions

```sql
-- #51
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- #50
create table if not exists tap_out_requests (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references cohorts(id) on delete cascade,
  requester_id uuid not null references users(id) on delete cascade,
  status text not null default 'pending', -- pending | approved | undone
  approvals_needed int not null default 3,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists tap_out_approvals (
  request_id uuid not null references tap_out_requests(id) on delete cascade,
  approver_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (request_id, approver_id)
);

-- #49
create table if not exists notification_preferences (
  user_id uuid primary key references users(id) on delete cascade,
  help_alerts_enabled boolean not null default true,
  tap_out_updates_enabled boolean not null default true
);
```

All new tables get RLS: cohort-member-scoped select, self-scoped insert/delete, `security definer` RPCs for cross-user writes (approvals, threshold resolution) mirroring `join_cohort`.

## Push dispatch (#51)
No custom backend exists, so server-side push send (needs VAPID private key) lives in a Supabase Edge Function (`supabase/functions/dispatch-push/index.ts`), invoked via `supabase.functions.invoke()`. Client-side: service worker (`public/sw.js`) + subscribe helper storing `push_subscriptions` row. Edge Function send is a stub (`console.log` + TODO) until `VAPID_PRIVATE_KEY` secret is set in the Supabase project — documented in README, not blocking merge since it degrades gracefully (subscription UI works, actual OS-level push silently no-ops until secret configured).

## Error handling
- Existing pattern: catch Supabase errors, map schema-cache-miss errors to a user-facing "run migrations" message (see `formatChatError`). New tables follow the same helper pattern.

## Testing strategy
- Unit (Vitest): pure logic (join validation, tap-out threshold math, preference resolution, craving session timer).
- E2E (Playwright): signup→join→dashboard, chat send/receive, help-alert dispatch visible in chat, tap-out request→approve→resolve, tap-out undo.
- Run `npm run test` and relevant `npx playwright test` before every merge.
