/**
 * E2E: Nix Date carousel on the Dashboard "Nix Dates" page (Issue #84)
 * Same carousel pattern as the Enrollment page's, embedded next to the
 * SideNav — the left arrow was overlapping the first card's content.
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

const E2E_EMAIL = 'e2e_dates_carousel@nixit.dev';
const E2E_PASSWORD = 'testpass123';
const E2E_USERNAME = 'e2e_dates_carousel_user';

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
    await admin.from('cohort_members').delete().eq('user_id', existing.id);
    await admin.from('users').delete().eq('id', existing.id);
    await admin.auth.admin.deleteUser(existing.id);
  }
  const { data: cohort } = await admin
    .from('cohorts')
    .select('id')
    .eq('status', 'upcoming')
    .order('start_date', { ascending: true })
    .limit(1)
    .single();
  const { data } = await admin.auth.admin.createUser({ email: E2E_EMAIL, password: E2E_PASSWORD, email_confirm: true });
  await admin.from('users').upsert({ id: data.user!.id, email: E2E_EMAIL, username: E2E_USERNAME, active_cohort_id: cohort!.id }, { onConflict: 'id' });
  await admin.from('cohort_members').insert({ user_id: data.user!.id, cohort_id: cohort!.id });
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

test.describe('Dashboard — Nix Dates carousel', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Nix Dates', exact: true }).click();
    await expect(page.locator('.nixit-carousel')).toBeVisible();
  });

  test('left arrow does not overlap the first card\'s content', async ({ page }) => {
    const cards = page.locator('[data-carousel-card]');
    await expect(cards.first()).toBeVisible();
    test.skip((await cards.count()) < 2, 'need at least 2 upcoming cohorts to verify arrow placement');

    const prevButton = page.getByRole('button', { name: 'Scroll to previous cohort' });
    const prevBox = await prevButton.boundingBox();
    const firstCardBox = await cards.first().boundingBox();
    expect(prevBox).not.toBeNull();
    expect(firstCardBox).not.toBeNull();
    expect(prevBox!.x + prevBox!.width).toBeLessThanOrEqual(firstCardBox!.x - 2);
  });

  test('arrows still work: next scrolls forward, prev scrolls back', async ({ page }) => {
    const track = page.locator('.nixit-carousel');
    const nextButton = page.getByRole('button', { name: 'Scroll to next cohort' });
    const prevButton = page.getByRole('button', { name: 'Scroll to previous cohort' });

    test.skip(!(await nextButton.isVisible().catch(() => false)), 'need at least 2 upcoming cohorts');

    const initialScrollLeft = await track.evaluate(el => el.scrollLeft);
    await nextButton.click();
    await expect.poll(() => track.evaluate(el => el.scrollLeft)).toBeGreaterThan(initialScrollLeft);

    const afterNextScrollLeft = await track.evaluate(el => el.scrollLeft);
    await prevButton.click();
    await expect.poll(() => track.evaluate(el => el.scrollLeft)).toBeLessThan(afterNextScrollLeft);
  });

  test('arrows are hidden on mobile, full-width card layout instead', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole('button', { name: 'Scroll to previous cohort' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Scroll to next cohort' })).toHaveCount(0);
  });
});
