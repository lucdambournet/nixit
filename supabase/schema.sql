-- Supabase schema for NixIt Sprint 1
-- Tables: users, nix_dates, cohorts, cohort_members

create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  username text not null,
  profile_image_url text,
  active_cohort_id uuid references cohorts(id),
  created_at timestamptz not null default now()
);

create table if not exists nix_dates (
  id uuid primary key default gen_random_uuid(),
  month text not null unique,
  start_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists cohorts (
  id uuid primary key default gen_random_uuid(),
  nix_date_id uuid not null references nix_dates(id) on delete cascade unique,
  start_date date not null,
  member_count int not null default 0,
  max_members int not null default 25,
  status text not null default 'upcoming',
  created_at timestamptz not null default now()
);

create table if not exists cohort_members (
  user_id uuid not null references users(id) on delete cascade,
  cohort_id uuid not null references cohorts(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (user_id, cohort_id)
);

-- Indexes
create index if not exists idx_users_active_cohort on users(active_cohort_id);
create index if not exists idx_cohorts_status on cohorts(status);
create index if not exists idx_cohorts_start_date on cohorts(start_date);
create index if not exists idx_cohort_members_cohort on cohort_members(cohort_id);
create index if not exists idx_cohort_members_user on cohort_members(user_id);

-- join_cohort uses auth.uid() so the caller cannot impersonate another user
create or replace function join_cohort(target_cohort_id uuid)
  returns void language plpgsql security definer as $$
declare
  requesting_user_id uuid := auth.uid();
begin
  if requesting_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not exists(select 1 from users where id = requesting_user_id) then
    raise exception 'User profile not found. Please complete signup first.';
  end if;

  if exists(select 1 from users where id = requesting_user_id and active_cohort_id is not null) then
    raise exception 'User already has an active cohort';
  end if;

  if not exists(select 1 from cohorts where id = target_cohort_id) then
    raise exception 'Cohort does not exist';
  end if;

  perform 1 from cohort_members where user_id = requesting_user_id and cohort_id = target_cohort_id;
  if found then
    raise exception 'User already joined this cohort';
  end if;

  -- Lock the cohort row for the rest of this transaction so two concurrent
  -- joins can't both pass this capacity check before either's insert lands
  -- (serializes on this row instead). member_count itself is NOT
  -- incremented here — the trg_cohort_member_count trigger on
  -- cohort_members does that on INSERT, and is the single source of truth
  -- (a prior version of this function *also* incremented it directly,
  -- double-counting every join against the trigger).
  perform 1 from cohorts where id = target_cohort_id and member_count < max_members for update;
  if not found then
    raise exception 'Cohort is full';
  end if;

  insert into cohort_members (user_id, cohort_id)
  values (requesting_user_id, target_cohort_id);

  update users
  set active_cohort_id = target_cohort_id
  where id = requesting_user_id;
end;
$$;

-- leave_cohort predates version control (created directly on the live
-- project). Captured here so it's no longer drift; behavior matches what
-- tests/unit/auth-join.test.ts already asserts against the live function.
create or replace function leave_cohort()
  returns void language plpgsql security definer as $$
declare
  requesting_user_id uuid := auth.uid();
  target_cohort_id uuid;
begin
  if requesting_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select active_cohort_id into target_cohort_id from users where id = requesting_user_id;
  if target_cohort_id is null then
    raise exception 'User is not in a cohort';
  end if;

  -- member_count is decremented by the trg_cohort_member_count trigger on
  -- cohort_members' DELETE — don't also do it here (see join_cohort's note).
  delete from cohort_members where user_id = requesting_user_id and cohort_id = target_cohort_id;

  update users set active_cohort_id = null where id = requesting_user_id;
end;
$$;

-- Chat messages: one row per cohort chat message
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references cohorts(id) on delete cascade,
  author_id uuid not null references users(id) on delete cascade,
  text text not null check (char_length(trim(text)) > 0),
  type text not null default 'normal' check (type in ('normal', 'help-alert')),
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_messages_cohort_created
  on chat_messages(cohort_id, created_at);

-- Widen chat_messages.type to support tap-out-request messages (#47, used by #50).
-- `create table if not exists` above is a no-op against an already-created
-- table, so re-run this against existing installations to pick up the change.
alter table chat_messages drop constraint if exists chat_messages_type_check;
alter table chat_messages add constraint chat_messages_type_check
  check (type in ('normal', 'help-alert', 'tap-out-request'));

-- Tap-out requests: a member's request to leave a cohort mid-run needs
-- cohort approval before it takes effect (#50).
create table if not exists tap_out_requests (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references cohorts(id) on delete cascade,
  requester_id uuid not null references users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'undone')),
  approvals_needed int not null default 3 check (approvals_needed > 0),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists tap_out_approvals (
  request_id uuid not null references tap_out_requests(id) on delete cascade,
  approver_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (request_id, approver_id)
);

create index if not exists idx_tap_out_requests_cohort on tap_out_requests(cohort_id);
create unique index if not exists idx_tap_out_requests_one_pending_per_user
  on tap_out_requests(requester_id) where status = 'pending';

-- Links a chat_messages row to the tap-out request it announces, so the UI
-- can show live approval count / status / undo directly on that message.
alter table chat_messages add column if not exists request_id uuid references tap_out_requests(id) on delete set null;

-- request_tap_out/approve_tap_out_request/undo_tap_out_request are
-- security definer: they bypass RLS on tap_out_requests/tap_out_approvals/
-- chat_messages/cohort_members/cohorts/users the same way join_cohort and
-- leave_cohort already do, so no INSERT/UPDATE/DELETE grants to
-- `authenticated` are needed on those tables — all writes go through here.

create or replace function request_tap_out()
  returns uuid language plpgsql security definer as $$
declare
  requesting_user_id uuid := auth.uid();
  requesting_username text;
  target_cohort_id uuid;
  new_request_id uuid;
begin
  if requesting_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select active_cohort_id, username into target_cohort_id, requesting_username
  from users where id = requesting_user_id;

  if target_cohort_id is null then
    raise exception 'User is not in a cohort';
  end if;

  if exists(select 1 from tap_out_requests where requester_id = requesting_user_id and status = 'pending') then
    raise exception 'You already have a pending tap-out request';
  end if;

  insert into tap_out_requests (cohort_id, requester_id)
  values (target_cohort_id, requesting_user_id)
  returning id into new_request_id;

  insert into chat_messages (cohort_id, author_id, text, type, request_id)
  values (target_cohort_id, requesting_user_id, requesting_username || ' requested to tap out.', 'tap-out-request', new_request_id);

  return new_request_id;
end;
$$;

create or replace function approve_tap_out_request(target_request_id uuid)
  returns table(approvals_count int, approvals_needed int, resolved boolean)
  language plpgsql security definer as $$
declare
  approving_user_id uuid := auth.uid();
  req record;
  count_now int;
begin
  if approving_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into req from tap_out_requests where id = target_request_id;
  if not found then
    raise exception 'Tap-out request does not exist';
  end if;

  if req.status <> 'pending' then
    raise exception 'This tap-out request is no longer pending';
  end if;

  if req.requester_id = approving_user_id then
    raise exception 'You cannot approve your own tap-out request';
  end if;

  if req.cohort_id not in (select get_my_cohort_ids()) then
    raise exception 'You are not a member of this cohort';
  end if;

  insert into tap_out_approvals (request_id, approver_id)
  values (target_request_id, approving_user_id)
  on conflict (request_id, approver_id) do nothing;

  if not found then
    raise exception 'You already approved this request';
  end if;

  select count(*) into count_now from tap_out_approvals where request_id = target_request_id;

  if count_now >= req.approvals_needed then
    update tap_out_requests set status = 'approved', resolved_at = now() where id = target_request_id;

    -- member_count is decremented by the trg_cohort_member_count trigger on
    -- cohort_members' DELETE — don't also do it here (see join_cohort's note).
    delete from cohort_members where user_id = req.requester_id and cohort_id = req.cohort_id;
    update users set active_cohort_id = null where id = req.requester_id;

    return query select count_now, req.approvals_needed, true;
  else
    return query select count_now, req.approvals_needed, false;
  end if;
end;
$$;

create or replace function undo_tap_out_request(target_request_id uuid)
  returns void language plpgsql security definer as $$
declare
  requesting_user_id uuid := auth.uid();
  req record;
begin
  if requesting_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into req from tap_out_requests where id = target_request_id;
  if not found then
    raise exception 'Tap-out request does not exist';
  end if;

  if req.requester_id <> requesting_user_id then
    raise exception 'You can only undo your own tap-out request';
  end if;

  if req.status <> 'pending' then
    raise exception 'This tap-out request is no longer pending';
  end if;

  update tap_out_requests set status = 'undone', resolved_at = now() where id = target_request_id;
end;
$$;

-- Online status: manual Do Not Disturb override. Online/away/offline are
-- derived live from presence and never persisted.
alter table public.users
  add column if not exists dnd boolean not null default false;

-- Broadcast dnd changes to cohort mates in real time.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'users'
  ) then
    alter publication supabase_realtime add table public.users;
  end if;
end $$;

-- Daily check-ins: one row per user per calendar day they checked in.
-- Streak counters are denormalized onto `users` so the Dashboard can read
-- them without recomputing consecutive-day runs from full history on every load.
alter table users
  add column if not exists current_streak int not null default 0,
  add column if not exists longest_streak int not null default 0,
  add column if not exists last_check_in_date date;

create table if not exists daily_check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  check_in_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, check_in_date)
);

create index if not exists idx_daily_check_ins_user_date
  on daily_check_ins(user_id, check_in_date desc);

-- record_check_in uses auth.uid() so the caller cannot impersonate another
-- user or backdate a check-in; streak math is server-only (never trust the client).
create or replace function record_check_in()
  returns table (current_streak int, longest_streak int, check_in_date date)
  language plpgsql security definer as $$
declare
  requesting_user_id uuid := auth.uid();
  today date := current_date;
  prev_date date;
  prev_streak int;
  prev_longest int;
  new_streak int;
  new_longest int;
begin
  if requesting_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select users.last_check_in_date, users.current_streak, users.longest_streak
    into prev_date, prev_streak, prev_longest
    from users
    where id = requesting_user_id and active_cohort_id is not null;

  if not found then
    raise exception 'No active cohort';
  end if;

  if prev_date = today then
    raise exception 'Already checked in today';
  end if;

  if prev_date = today - 1 then
    new_streak := prev_streak + 1;
  else
    new_streak := 1;
  end if;
  new_longest := greatest(prev_longest, new_streak);

  begin
    insert into daily_check_ins (user_id, check_in_date)
    values (requesting_user_id, today);
  exception when unique_violation then
    -- Lost a same-day race against another concurrent check-in request.
    raise exception 'Already checked in today';
  end;

  update users
  set current_streak = new_streak,
      longest_streak = new_longest,
      last_check_in_date = today
  where id = requesting_user_id;

  return query select new_streak, new_longest, today;
end;
$$;

-- Craving sessions: one row per CraveCrushers play session (personal stat, no cohort scoping)
create table if not exists craving_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  game_type text not null check (game_type in ('box_breathing', 'craving_countdown', 'ping_pong_ai')),
  started_at timestamptz not null,
  duration_seconds int not null check (duration_seconds >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_craving_sessions_user_created
  on craving_sessions(user_id, created_at);

-- Push subscriptions: one row per browser/device Web Push registration (#51)
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_user on push_subscriptions(user_id);

-- Notification preferences: one row per user, upserted on first change (#49)
create table if not exists notification_preferences (
  user_id uuid primary key references users(id) on delete cascade,
  help_alerts_enabled boolean not null default true,
  tap_out_updates_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
