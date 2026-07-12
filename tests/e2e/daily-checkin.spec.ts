/**
 * E2E: Daily Check-In streak tracking (Issue #64)
 * Covers fresh check-in, consecutive-day streak increment, same-day duplicate
 * blocked, and the card being absent when the user has no active cohort.
 */
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const admin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const E2E_EMAIL = 'e2e_checkin@nixit.dev';
const E2E_PASSWORD = 'testpass123';
const E2E_USERNAME = 'e2e_checkin_user';

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

async function getE2EUserId() {
  const { data: { users } } = await admin.auth.admin.listUsers();
  const user = users.find(candidate => candidate.email === E2E_EMAIL);
  if (!user) {
    throw new Error(`Missing E2E user ${E2E_EMAIL}`);
  }

  return user.id;
}

async function getAvailableCohortId() {
  const { data, error } = await admin
    .from('cohorts')
    .select('id')
    .eq('status', 'upcoming')
    .order('start_date', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    throw new Error(`Missing available cohort for E2E setup: ${error?.message ?? 'no rows returned'}`);
  }

  return data.id;
}

async function setCheckInState(state: { hasCohort: boolean; currentStreak?: number; longestStreak?: number; lastCheckInDate?: string | null }) {
  const userId = await getE2EUserId();

  await admin.from('cohort_members').delete().eq('user_id', userId);
  await admin.from('users').update({ active_cohort_id: null }).eq('id', userId);
  await admin.from('daily_check_ins').delete().eq('user_id', userId);

  if (state.hasCohort) {
    const cohortId = await getAvailableCohortId();
    await admin.from('cohort_members').insert({ user_id: userId, cohort_id: cohortId });
    await admin.from('users').update({ active_cohort_id: cohortId }).eq('id', userId);
  }

  await admin
    .from('users')
    .update({
      current_streak: state.currentStreak ?? 0,
      longest_streak: state.longestStreak ?? 0,
      last_check_in_date: state.lastCheckInDate ?? null,
    })
    .eq('id', userId);
}

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(E2E_EMAIL);
  await page.getByLabel('Password').fill(E2E_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

test.beforeAll(async () => {
  const { data: { users } } = await admin.auth.admin.listUsers();
  const existing = users.find(u => u.email === E2E_EMAIL);
  if (existing) {
    await admin.from('daily_check_ins').delete().eq('user_id', existing.id);
    await admin.from('cohort_members').delete().eq('user_id', existing.id);
    await admin.from('users').delete().eq('id', existing.id);
    await admin.auth.admin.deleteUser(existing.id);
  }
  const { data } = await admin.auth.admin.createUser({
    email: E2E_EMAIL, password: E2E_PASSWORD, email_confirm: true,
  });
  await admin.from('users').upsert({
    id: data.user!.id,
    email: E2E_EMAIL,
    username: E2E_USERNAME,
  }, { onConflict: 'id' });
});

test.afterAll(async () => {
  const { data: { users } } = await admin.auth.admin.listUsers();
  const u = users.find(u => u.email === E2E_EMAIL);
  if (u) {
    await admin.from('daily_check_ins').delete().eq('user_id', u.id);
    await admin.from('cohort_members').delete().eq('user_id', u.id);
    await admin.from('users').delete().eq('id', u.id);
    await admin.auth.admin.deleteUser(u.id);
  }
});

test.describe('Daily Check-In', () => {
  test('first-ever check-in starts a 1-day streak', async ({ page }) => {
    await setCheckInState({ hasCohort: true, currentStreak: 0, longestStreak: 0, lastCheckInDate: null });
    await login(page);
    await page.waitForURL('**/dashboard');

    await expect(page.getByText('No streak yet')).toBeVisible();
    await page.getByRole('button', { name: 'Check in for today' }).click();

    await expect(page.getByText('Checked in! Streak: 1 day.')).toBeVisible();
    await expect(page.getByText('Checked in for today', { exact: false })).toBeVisible();
  });

  test('checking in the day after a previous check-in increments the streak', async ({ page }) => {
    await setCheckInState({ hasCohort: true, currentStreak: 4, longestStreak: 4, lastCheckInDate: isoDaysAgo(1) });
    await login(page);
    await page.waitForURL('**/dashboard');

    await expect(page.getByText('🔥 4 days')).toBeVisible();
    await page.getByRole('button', { name: 'Check in for today' }).click();

    await expect(page.getByText('Checked in! Streak: 5 days.')).toBeVisible();
  });

  test('already checked in today shows completed state, not the action button', async ({ page }) => {
    await setCheckInState({ hasCohort: true, currentStreak: 3, longestStreak: 3, lastCheckInDate: isoDaysAgo(0) });
    await login(page);
    await page.waitForURL('**/dashboard');

    await expect(page.getByText('Checked in for today', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Check in for today' })).not.toBeVisible();
  });

  test('user with no active cohort is redirected to enrollment and never sees the check-in card', async ({ page }) => {
    await setCheckInState({ hasCohort: false });
    await login(page);
    await page.waitForURL('**/enrollment');

    await expect(page).toHaveURL(/enrollment/);
    await expect(page.getByText('Daily Check-In')).not.toBeVisible();
  });
});
