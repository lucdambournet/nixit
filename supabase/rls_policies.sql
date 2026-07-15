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

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end $$;

-- ── tap_out_requests / tap_out_approvals: read-only to clients (#50) ──
-- All writes go through request_tap_out()/approve_tap_out_request()/
-- undo_tap_out_request(), which are security definer and bypass RLS the
-- same way join_cohort/leave_cohort already do — no INSERT/UPDATE/DELETE
-- grants needed here.
alter table public.tap_out_requests  enable row level security;
alter table public.tap_out_approvals enable row level security;

grant select on table public.tap_out_requests  to authenticated;
grant select on table public.tap_out_approvals to authenticated;
grant all on table public.tap_out_requests, public.tap_out_approvals to service_role;

-- Includes `or requester_id = auth.uid()` so a requester whose tap-out just
-- got approved (their cohort_members row is deleted in the same
-- transaction that sets status='approved') can still see their own
-- now-resolved request — otherwise they'd lose SELECT visibility on it in
-- the same instant it resolves, since get_my_cohort_ids() would no longer
-- include that cohort.
drop policy if exists "cohort members can read their cohort's tap-out requests" on public.tap_out_requests;
create policy "cohort members can read their cohort's tap-out requests"
  on public.tap_out_requests for select
  to authenticated
  using (cohort_id in (select get_my_cohort_ids()) or requester_id = (select auth.uid()));

drop policy if exists "cohort members can read approvals for their cohort's requests" on public.tap_out_approvals;
create policy "cohort members can read approvals for their cohort's requests"
  on public.tap_out_approvals for select
  to authenticated
  using (request_id in (select id from public.tap_out_requests where cohort_id in (select get_my_cohort_ids())));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tap_out_requests'
  ) then
    alter publication supabase_realtime add table public.tap_out_requests;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tap_out_approvals'
  ) then
    alter publication supabase_realtime add table public.tap_out_approvals;
  end if;
end $$;

-- ── push_subscriptions: strictly self-scoped (#51) ────────────
alter table public.push_subscriptions enable row level security;

grant select, insert, delete on table public.push_subscriptions to authenticated;
grant select, insert, update, delete on table public.push_subscriptions to service_role;
revoke update on public.push_subscriptions from authenticated;

drop policy if exists "users can read their own push subscriptions" on public.push_subscriptions;
create policy "users can read their own push subscriptions"
  on public.push_subscriptions for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "users can create their own push subscriptions" on public.push_subscriptions;
create policy "users can create their own push subscriptions"
  on public.push_subscriptions for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "users can delete their own push subscriptions" on public.push_subscriptions;
create policy "users can delete their own push subscriptions"
  on public.push_subscriptions for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ── storage.objects (avatars bucket): public read ─────────────
-- Applied 2026-07-11 while debugging issue #61 (avatar crop upload).
-- storage.objects already had INSERT/UPDATE policies scoping each user to
-- their own `{uid}.ext` path, but no SELECT policy existed. Supabase's
-- storage API issues an INSERT ... RETURNING internally, which requires the
-- inserted row to satisfy a SELECT policy — with none granted, every avatar
-- upload (old code and new) failed with a generic RLS error even though the
-- INSERT's own with_check passed. Avatars are meant to be public anyway
-- (served via getPublicUrl), so a public SELECT policy is correct here.
drop policy if exists "Anyone can view avatars" on storage.objects;
create policy "Anyone can view avatars"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');
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
-- `dnd` must stay in this list: without it, ProfileScreen's Do Not Disturb
-- toggle (supabase.from('users').update({ dnd })) silently fails RLS's
-- column-level grant check (discovered live via status-indicators.spec.ts
-- while working on #50 — this predates that work, added when the streak
-- columns were locked down and dnd was missed).
revoke update on public.users from authenticated;
grant update (username, profile_image_url, dnd) on public.users to authenticated;

-- ── craving_sessions: personal only, no cohort scoping ─────────
grant select, insert on table public.craving_sessions to authenticated;
grant select, insert, update, delete on table public.craving_sessions to service_role;

alter table public.craving_sessions enable row level security;

drop policy if exists "users can read own craving sessions" on public.craving_sessions;
create policy "users can read own craving sessions"
  on public.craving_sessions for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "users can log own craving sessions" on public.craving_sessions;
create policy "users can log own craving sessions"
  on public.craving_sessions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
