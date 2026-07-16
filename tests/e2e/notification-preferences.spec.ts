/**
 * E2E: notification preferences + in-app notification badge (Issue #49)
 */
import { expect, test } from '@playwright/test';
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

const USER_A = { email: 'e2e_notifprefs_a@nixit.dev', password: 'testpass123', username: 'e2e_notif_a' };
const USER_B = { email: 'e2e_notifprefs_b@nixit.dev', password: 'testpass123', username: 'e2e_notif_b' };

let cohortId: string;
let nixDateId: string;

// Dedicated, disposable cohort — not the shared "earliest upcoming" one —
// so this spec's blanket `chat_messages` cleanup can't race with other
// spec files that happen to share that cohort under parallel workers.
async function createIsolatedCohort(): Promise<{ nixDateId: string; cohortId: string }> {
  const month = `notif-prefs-test-${Date.now()}`;
  const { data: nixDate } = await admin.from('nix_dates').insert({ month, start_date: '2099-01-01' }).select('id').single();
  const { data: cohort } = await admin.from('cohorts').insert({ nix_date_id: nixDate!.id, start_date: '2099-01-01', max_members: 25 }).select('id').single();
  return { nixDateId: nixDate!.id, cohortId: cohort!.id };
}

async function resetUser(user: typeof USER_A): Promise<string> {
  const { data: { users } } = await admin.auth.admin.listUsers();
  const existing = users.find(entry => entry.email === user.email);
  if (existing) {
    await admin.from('notification_preferences').delete().eq('user_id', existing.id);
    await admin.from('chat_messages').delete().eq('author_id', existing.id);
    await admin.from('cohort_members').delete().eq('user_id', existing.id);
    await admin.from('users').delete().eq('id', existing.id);
    await admin.auth.admin.deleteUser(existing.id);
  }
  const { data } = await admin.auth.admin.createUser({ email: user.email, password: user.password, email_confirm: true });
  return data.user!.id;
}

async function login(page: Page, user: typeof USER_A) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard');
}

test.beforeAll(async () => {
  const cohort = await createIsolatedCohort();
  cohortId = cohort.cohortId;
  nixDateId = cohort.nixDateId;

  const idA = await resetUser(USER_A);
  const idB = await resetUser(USER_B);

  await admin.from('users').upsert([
    { id: idA, email: USER_A.email, username: USER_A.username, active_cohort_id: cohortId },
    { id: idB, email: USER_B.email, username: USER_B.username, active_cohort_id: cohortId },
  ], { onConflict: 'id' });
  await admin.from('cohort_members').insert([
    { user_id: idA, cohort_id: cohortId },
    { user_id: idB, cohort_id: cohortId },
  ]);
});

test.afterAll(async () => {
  for (const user of [USER_A, USER_B]) {
    const { data: { users } } = await admin.auth.admin.listUsers();
    const existing = users.find(entry => entry.email === user.email);
    if (existing) {
      await admin.from('notification_preferences').delete().eq('user_id', existing.id);
      await admin.from('cohort_members').delete().eq('user_id', existing.id);
      await admin.from('users').delete().eq('id', existing.id);
      await admin.auth.admin.deleteUser(existing.id);
    }
  }
  await admin.from('chat_messages').delete().eq('cohort_id', cohortId);
  await admin.from('cohorts').delete().eq('id', cohortId);
  await admin.from('nix_dates').delete().eq('id', nixDateId);
});

test.describe('Notification preferences', () => {
  test('toggling a preference persists to the backend and survives reload', async ({ page }) => {
    await login(page, USER_A);
    await page.getByRole('button', { name: 'Profile', exact: true }).click();
    await expect(page.getByText('Notifications', { exact: true })).toBeVisible();

    const helpAlertsRow = page.getByText('Help alerts', { exact: true }).locator('..').locator('..');
    const helpAlertsSwitch = helpAlertsRow.getByRole('switch');
    await expect(helpAlertsSwitch).toHaveAttribute('aria-checked', 'true');

    await helpAlertsSwitch.click();
    await expect(helpAlertsSwitch).toHaveAttribute('aria-checked', 'false');

    const { data: { users } } = await admin.auth.admin.listUsers();
    const userId = users.find(u => u.email === USER_A.email)!.id;
    await expect.poll(async () => {
      const { data } = await admin.from('notification_preferences').select('help_alerts_enabled').eq('user_id', userId).maybeSingle();
      return data?.help_alerts_enabled;
    }).toBe(false);

    await page.reload();
    await page.getByRole('button', { name: 'Profile', exact: true }).click();
    const helpAlertsRowAfterReload = page.getByText('Help alerts', { exact: true }).locator('..').locator('..');
    await expect(helpAlertsRowAfterReload.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });
});

test.describe('Chat notification badge', () => {
  test('a help alert badges the Chat nav item, and opening chat clears it', async ({ browser }) => {
    test.setTimeout(60000);

    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    pageB.on('dialog', dialog => dialog.accept());

    await login(pageA, USER_A);
    await login(pageB, USER_B);

    // Once the badge renders, the button's accessible name becomes "Chat N",
    // so it can't be matched with an exact "Chat" name — match by prefix.
    const chatNavItem = pageA.getByRole('button', { name: /^Chat/ });
    await expect(chatNavItem).not.toContainText(/[1-9]/);

    await pageB.getByRole('button', { name: '🆘 Send Help Alert' }).click();

    await expect(chatNavItem).toContainText('1', { timeout: 15000 });

    await chatNavItem.click();
    await expect(pageA.getByPlaceholder("Share how you're doing…")).toBeVisible();
    await expect(chatNavItem).not.toContainText(/[1-9]/);

    await contextA.close();
    await contextB.close();
  });
});
