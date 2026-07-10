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

-- Online status: manual Do Not Disturb override. Online/away/offline are
-- derived live from presence and never persisted.
alter table public.users
  add column if not exists dnd boolean not null default false;
