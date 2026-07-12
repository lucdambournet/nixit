/**
 * E2E: CraveCrushers mini-games (Issue #65)
 * Covers both entry points (Home SOS button, nav item) landing on the
 * picker, and each game rendering plus exiting back to the picker.
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

const E2E_EMAIL = 'e2e_crave@nixit.dev';
const E2E_PASSWORD = 'testpass123';
const E2E_USERNAME = 'e2e_crave_user';

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

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(E2E_EMAIL);
  await page.getByLabel('Password').fill(E2E_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard');
}

test.beforeAll(async () => {
  const { data: { users } } = await admin.auth.admin.listUsers();
  const existing = users.find(u => u.email === E2E_EMAIL);
  if (existing) {
    await admin.from('craving_sessions').delete().eq('user_id', existing.id);
    await admin.from('cohort_members').delete().eq('user_id', existing.id);
    await admin.from('users').delete().eq('id', existing.id);
    await admin.auth.admin.deleteUser(existing.id);
  }

  const { data } = await admin.auth.admin.createUser({
    email: E2E_EMAIL, password: E2E_PASSWORD, email_confirm: true,
  });
  const cohortId = await getAvailableCohortId();
  await admin.from('users').upsert({
    id: data.user!.id,
    email: E2E_EMAIL,
    username: E2E_USERNAME,
    active_cohort_id: cohortId,
  }, { onConflict: 'id' });
  await admin.from('cohort_members').insert({ user_id: data.user!.id, cohort_id: cohortId });
});

test.afterAll(async () => {
  const { data: { users } } = await admin.auth.admin.listUsers();
  const u = users.find(u => u.email === E2E_EMAIL);
  if (u) {
    await admin.from('craving_sessions').delete().eq('user_id', u.id);
    await admin.from('cohort_members').delete().eq('user_id', u.id);
    await admin.from('users').delete().eq('id', u.id);
    await admin.auth.admin.deleteUser(u.id);
  }
});

test.describe('Crave Crushers', () => {
  test('SOS button on Home navigates to the Crave Crushers picker', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Feeling a craving?' }).click();
    await expect(page.getByRole('heading', { name: 'Crave Crushers' })).toBeVisible();
  });

  test('Crave nav item navigates to the same picker', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Crave', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Crave Crushers' })).toBeVisible();
  });

  test('Box Breathing renders and exits back to the picker', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Crave', exact: true }).click();
    await page.getByRole('button', { name: 'Play Box Breathing' }).click();
    await expect(page.getByText('Breathe in')).toBeVisible();

    await page.getByRole('button', { name: 'Back to Crave Crushers' }).click();
    await expect(page.getByRole('heading', { name: 'Crave Crushers' })).toBeVisible();
  });

  test('Craving Countdown renders, tracks taps, and exits back to the picker', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Crave', exact: true }).click();
    await page.getByRole('button', { name: 'Play Craving Countdown' }).click();
    await expect(page.getByText('Taps: 0')).toBeVisible();

    await page.getByRole('button', { name: 'Release tension' }).click();
    await expect(page.getByText('Taps: 1')).toBeVisible();

    await page.getByRole('button', { name: 'Back to Crave Crushers' }).click();
    await expect(page.getByRole('heading', { name: 'Crave Crushers' })).toBeVisible();
  });

  test('Ping-Pong vs AI renders a canvas and exits back to the picker', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Crave', exact: true }).click();
    await page.getByRole('button', { name: 'Play Ping-Pong vs AI' }).click();
    await expect(page.locator('canvas')).toBeVisible();

    await page.getByRole('button', { name: 'Back to Crave Crushers' }).click();
    await expect(page.getByRole('heading', { name: 'Crave Crushers' })).toBeVisible();
  });
});
