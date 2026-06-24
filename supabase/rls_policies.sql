-- NixIt — RLS policies
-- Run this once in the Supabase Dashboard → SQL Editor
-- https://supabase.com/dashboard/project/vuylmwyiecanklvehxiz/sql/new

-- ── Enable RLS on all tables ──────────────────────────────────
alter table public.nix_dates       enable row level security;
alter table public.cohorts         enable row level security;
alter table public.users           enable row level security;
alter table public.cohort_members  enable row level security;

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

-- ── users: each user sees and edits only their own row ────────
drop policy if exists "users can read own row" on public.users;
create policy "users can read own row"
  on public.users for select
  to authenticated
  using ((select auth.uid()) = id);

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

-- ── cohort_members: users can see members of their cohort ─────
drop policy if exists "users can read cohort members" on public.cohort_members;
create policy "users can read cohort members"
  on public.cohort_members for select
  to authenticated
  using (
    cohort_id in (
      select active_cohort_id
      from public.users
      where id = (select auth.uid())
    )
  );
