/**
 * E2E: Nix Date cohort carousel on the Enrollment page (Issue #57)
 * Verifies cards scroll horizontally (not stacked) and arrow controls work.
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

const E2E_EMAIL = 'e2e_carousel@nixit.dev';
const E2E_PASSWORD = 'testpass123';
const E2E_USERNAME = 'e2e_carousel_user';

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
    await admin.from('cohort_members').delete().eq('user_id', u.id);
    await admin.from('users').delete().eq('id', u.id);
    await admin.auth.admin.deleteUser(u.id);
  }
});

test.describe('Enrollment page — cohort carousel', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.waitForURL('**/enrollment');
  });

  test('cards render side-by-side inside a horizontally scrollable track, not stacked', async ({ page }) => {
    const track = page.locator('.nixit-carousel');
    await expect(track).toBeVisible();
    await expect(track).toHaveCSS('overflow-x', 'auto');

    const cards = page.locator('[data-carousel-card]');
    await expect(cards).not.toHaveCount(0);

    await test.step('first two cards sit on the same row (same top offset) at different x positions', async () => {
      const count = await cards.count();
      test.skip(count < 2, 'need at least 2 seeded cohorts to verify horizontal layout');

      const firstBox = await cards.nth(0).boundingBox();
      const secondBox = await cards.nth(1).boundingBox();
      expect(firstBox).not.toBeNull();
      expect(secondBox).not.toBeNull();

      expect(Math.abs(firstBox!.y - secondBox!.y)).toBeLessThan(2);
      expect(secondBox!.x).toBeGreaterThan(firstBox!.x);
    });

    await test.step('track content overflows its visible width, confirming it scrolls rather than wraps', async () => {
      const { scrollWidth, clientWidth } = await track.evaluate(el => ({
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      }));
      expect(scrollWidth).toBeGreaterThan(clientWidth);
    });
  });

  test('next arrow scrolls the track forward and prev arrow scrolls it back', async ({ page }) => {
    const track = page.locator('.nixit-carousel');
    const nextButton = page.getByRole('button', { name: 'Scroll to next cohort' });
    const prevButton = page.getByRole('button', { name: 'Scroll to previous cohort' });

    await expect(nextButton).toBeVisible();
    await expect(prevButton).toBeVisible();

    const initialScrollLeft = await track.evaluate(el => el.scrollLeft);

    await nextButton.click();
    await expect.poll(() => track.evaluate(el => el.scrollLeft)).toBeGreaterThan(initialScrollLeft);

    const afterNextScrollLeft = await track.evaluate(el => el.scrollLeft);
    await prevButton.click();
    await expect.poll(() => track.evaluate(el => el.scrollLeft)).toBeLessThan(afterNextScrollLeft);
  });

  test('prev/next arrows sit clear of the cards, not overlapping their content (issue #84)', async ({ page }) => {
    const cards = page.locator('[data-carousel-card]');
    await expect(cards.first()).toBeVisible();
    test.skip((await cards.count()) < 2, 'need at least 2 seeded cohorts to verify arrow placement');

    const prevButton = page.getByRole('button', { name: 'Scroll to previous cohort' });
    const prevBox = await prevButton.boundingBox();
    const firstCardBox = await cards.first().boundingBox();
    expect(prevBox).not.toBeNull();
    expect(firstCardBox).not.toBeNull();
    // The arrow's right edge must not reach past the card's left edge.
    expect(prevBox!.x + prevBox!.width).toBeLessThanOrEqual(firstCardBox!.x - 2);
  });

  test('arrows are hidden on mobile — swipe is the only affordance there', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole('button', { name: 'Scroll to previous cohort' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Scroll to next cohort' })).toHaveCount(0);
  });

  test('mobile viewport: swipe gesture scrolls the carousel', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'CDP touch dispatch is only wired up for chromium');

    await page.setViewportSize({ width: 390, height: 844 });
    const track = page.locator('.nixit-carousel');
    await expect(track).toBeVisible();

    const box = await track.boundingBox();
    expect(box).not.toBeNull();

    const startX = box!.x + box!.width - 20;
    const endX = box!.x + 20;
    const y = box!.y + box!.height / 2;

    const cdp = await page.context().newCDPSession(page);
    const touchPoint = (x: number) => [{ x, y, id: 1 }];

    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: touchPoint(startX) });
    for (let i = 1; i <= 10; i++) {
      const x = startX + ((endX - startX) * i) / 10;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: touchPoint(x) });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

    await expect.poll(() => track.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
  });
});
