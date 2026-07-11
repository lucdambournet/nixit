-- NixIt — RLS policies
-- Run this once in the Supabase Dashboard → SQL Editor
-- https://supabase.com/dashboard/project/vuylmwyiecanklvehxiz/sql/new

-- ── Enable RLS on all tables ──────────────────────────────────
alter table public.nix_dates       enable row level security;
alter table public.cohorts         enable row level security;
alter table public.users           enable row level security;
alter table public.cohort_members  enable row level security;
alter table public.chat_messages   enable row level security;

-- ── nix_dates: any signed-in user can read ───────────────────
drop policy if exists "authenticated can read nix_dates" on public.nix_dates;
create policy "authenticated can read nix_dates"
  on public.nix_dates for select
  to authenticated
  using (true);

-- ── cohorts: any signed-in user can read ─────────────────────
drop policy if exists "authenticated can read cohorts" on public.cohorts;
create policy "authenticated can read cohorts"
  on public.cohorts for select
  to authenticated
  using (true);

-- ── users: each user sees their own row + cohort members' rows ──
-- Uses cohort_members self-join to avoid recursive RLS on public.users
drop policy if exists "users can read own row" on public.users;
create policy "users can read own row"
  on public.users for select
  to authenticated
  using (
    (select auth.uid()) = id
    or id in (
      select cm2.user_id
      from public.cohort_members cm1
      join public.cohort_members cm2 on cm1.cohort_id = cm2.cohort_id
      where cm1.user_id = (select auth.uid())
    )
  );

drop policy if exists "users can insert own row" on public.users;
create policy "users can insert own row"
  on public.users for insert
  to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "users can update own row" on public.users;
create policy "users can update own row"
  on public.users for update
  to authenticated
  using  ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ── Helper: bypasses RLS to get current user's cohort IDs ────
create or replace function get_my_cohort_ids()
returns setof uuid language sql security definer stable as $$
  select cohort_id from public.cohort_members where user_id = auth.uid();
$$;

-- ── cohort_members: see all members of your cohort ────────────
drop policy if exists "users can read cohort members" on public.cohort_members;
create policy "users can read cohort members"
  on public.cohort_members for select
  to authenticated
  using (cohort_id in (select get_my_cohort_ids()));

-- ── users: own row + cohort members (uses security definer fn) ─
drop policy if exists "users can read own row" on public.users;
create policy "users can read own row"
  on public.users for select
  to authenticated
  using (
    (select auth.uid()) = id
    or id in (
      select user_id from public.cohort_members
      where cohort_id in (select get_my_cohort_ids())
    )
  );

grant select, insert on table public.chat_messages to authenticated;
grant select, insert, update, delete on table public.chat_messages to service_role;

drop policy if exists "cohort members can read their cohort's messages" on public.chat_messages;
create policy "cohort members can read their cohort's messages"
  on public.chat_messages for select
  to authenticated
  using (cohort_id in (select get_my_cohort_ids()));

drop policy if exists "cohort members can send messages as themselves" on public.chat_messages;
create policy "cohort members can send messages as themselves"
  on public.chat_messages for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and cohort_id in (select get_my_cohort_ids())
  );

alter publication supabase_realtime add table public.chat_messages;

-- ── daily_check_ins: users can read only their own check-in history ──
-- All writes go through record_check_in() (security definer) — no insert/
-- update/delete grant to authenticated, mirroring join_cohort's pattern.
alter table public.daily_check_ins enable row level security;

drop policy if exists "users can read own check-ins" on public.daily_check_ins;
create policy "users can read own check-ins"
  on public.daily_check_ins for select
  to authenticated
  using ((select auth.uid()) = user_id);

grant select on table public.daily_check_ins to authenticated;

-- ── users: block direct client writes to streak columns ──
-- Defense in depth: column-level grants, not the row-level "users can update
-- own row" policy, are what stop an authenticated client from calling
-- `update users set current_streak = ...` directly. record_check_in() is
-- security definer, so it bypasses grants (runs as the function owner) and
-- is unaffected by this revoke.
revoke update on public.users from authenticated;
grant update (username, profile_image_url) on public.users to authenticated;
