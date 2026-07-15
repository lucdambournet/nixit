/**
 * E2E: mobile DrawerNav (Issue #69)
 * On a phone-width viewport the top/side nav becomes a fixed bottom tab bar,
 * and page content (notably the cohort timer) is no longer squeezed by it.
 */
import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const admin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const E2E_EMAIL = 'e2e_mobilenav@nixit.dev';
const E2E_PASSWORD = 'testpass123';
const E2E_USERNAME = 'e2e_mobilenav_user';

async function getAvailableCohortId() {
  const { data } = await admin
    .from('cohorts')
    .select('id')
    .eq('status', 'upcoming')
    .order('start_date', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data!.id;
}

test.beforeAll(async () => {
  const { data: { users } } = await admin.auth.admin.listUsers();
  const existing = users.find(u => u.email === E2E_EMAIL);
  if (existing) {
    await admin.from('cohort_members').delete().eq('user_id', existing.id);
    await admin.from('users').delete().eq('id', existing.id);
    await admin.auth.admin.deleteUser(existing.id);
  }
  const { data } = await admin.auth.admin.createUser({ email: E2E_EMAIL, password: E2E_PASSWORD, email_confirm: true });
  const cohortId = await getAvailableCohortId();
  await admin.from('users').upsert({ id: data.user!.id, email: E2E_EMAIL, username: E2E_USERNAME, active_cohort_id: cohortId }, { onConflict: 'id' });
  await admin.from('cohort_members').insert({ user_id: data.user!.id, cohort_id: cohortId });
});

test.afterAll(async () => {
  const { data: { users } } = await admin.auth.admin.listUsers();
  const u = users.find(u => u.email === E2E_EMAIL);
  if (u) {
    await admin.from('cohort_members').delete().eq('user_id', u.id);
    await admin.from('users').delete().eq('id', u.id);
    await admin.auth.admin.deleteUser(u.id);
  }
});

test.describe('Mobile DrawerNav', () => {
  test('phone width shows a fixed bottom nav instead of the side nav, and the timer is fully visible', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');
    await page.getByLabel('Email').fill(E2E_EMAIL);
    await page.getByLabel('Password').fill(E2E_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/dashboard');

    // Side nav's collapse toggle is desktop-only chrome; it should be gone.
    await expect(page.getByRole('button', { name: 'Collapse menu' })).toHaveCount(0);

    const bottomNav = page.getByRole('navigation').filter({ has: page.getByRole('button', { name: 'Home' }) });
    await expect(bottomNav).toBeVisible();
    const navBox = await bottomNav.boundingBox();
    expect(navBox).not.toBeNull();
    // Pinned to the bottom edge of the viewport.
    expect(navBox!.y + navBox!.height).toBeGreaterThanOrEqual(844 - 2);

    // The timer's full width should be visible, not clipped by a side rail.
    const timer = page.getByText('Nicotine-free for');
    await expect(timer).toBeVisible();
    const timerBox = await timer.boundingBox();
    expect(timerBox!.x).toBeGreaterThanOrEqual(0);
    expect(timerBox!.x + timerBox!.width).toBeLessThanOrEqual(390);

    await page.getByRole('button', { name: 'Chat', exact: true }).click();
    await expect(page.getByPlaceholder("Share how you're doing…")).toBeVisible();
    // The bottom nav must stay visible and not be covered by chat's own input bar.
    await expect(bottomNav).toBeVisible();
  });

  test('desktop width still shows the side nav, no bottom nav', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/login');
    await page.getByLabel('Email').fill(E2E_EMAIL);
    await page.getByLabel('Password').fill(E2E_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/dashboard');

    await expect(page.getByRole('button', { name: 'Collapse menu' })).toBeVisible();
  });
});
