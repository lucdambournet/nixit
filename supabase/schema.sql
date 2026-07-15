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

  update cohorts
  set member_count = member_count + 1
  where id = target_cohort_id and member_count < max_members;

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

-- Online status: manual Do Not Disturb override. Online/away/offline are
-- derived live from presence and never persisted.
alter table public.users
  add column if not exists dnd boolean not null default false;

-- Broadcast dnd changes to cohort mates in real time.
alter publication supabase_realtime add table public.users;

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
