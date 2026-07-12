import { expect, test, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const admin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const USER_C = { email: 'test5@nixit.com', password: '12qwaszx', username: 'test5' };
const USER_D = { email: 'test6@nixit.com', password: '12qwaszx', username: 'test6' };

let cohortId: string;

async function resetUser(user: typeof USER_C): Promise<string> {
  const { data: { users } } = await admin.auth.admin.listUsers();
  const existing = users.find(entry => entry.email === user.email);

  if (existing) {
    await admin.from('cohort_members').delete().eq('user_id', existing.id);
    await admin.from('users').delete().eq('id', existing.id);
    await admin.auth.admin.deleteUser(existing.id);
  }

  const { data } = await admin.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
  });

  return data.user!.id;
}

test.beforeAll(async () => {
  const { data: cohort } = await admin.from('cohorts').select('id').eq('start_date', '2026-11-01').single();
  cohortId = cohort!.id;

  const idC = await resetUser(USER_C);
  const idD = await resetUser(USER_D);

  await admin.from('users').upsert([
    { id: idC, email: USER_C.email, username: USER_C.username, active_cohort_id: cohortId, dnd: false },
    { id: idD, email: USER_D.email, username: USER_D.username, active_cohort_id: cohortId, dnd: false },
  ], { onConflict: 'id' });

  await admin.from('cohort_members').insert([
    { user_id: idC, cohort_id: cohortId },
    { user_id: idD, cohort_id: cohortId },
  ]);
});

test.afterAll(async () => {
  for (const user of [USER_C, USER_D]) {
    const { data: { users } } = await admin.auth.admin.listUsers();
    const existing = users.find(entry => entry.email === user.email);

    if (existing) {
      await admin.from('cohort_members').delete().eq('user_id', existing.id);
      await admin.from('users').delete().eq('id', existing.id);
      await admin.auth.admin.deleteUser(existing.id);
    }
  }
});

async function signIn(page: Page, user: typeof USER_C) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard');
}

test.describe('Online status indicators', () => {
  test('DND is visible to cohort mates, and closing a session shows offline', async ({ browser }) => {
    test.setTimeout(60000);

    const contextC = await browser.newContext();
    const contextD = await browser.newContext();
    const pageC = await contextC.newPage();
    const pageD = await contextD.newPage();

    await test.step('both members sign in', async () => {
      await signIn(pageC, USER_C);
      await signIn(pageD, USER_D);
    });

    const dStatusDot = pageC.getByLabel(new RegExp(`^${USER_D.username} status:`));

    await test.step('user D shows online to user C by default', async () => {
      await expect(dStatusDot).toHaveAttribute('data-status', 'online');
    });

    await test.step('user D turns on Do Not Disturb from their profile', async () => {
      await pageD.getByRole('button', { name: 'Profile' }).click();
      await pageD.getByRole('switch').first().click();
    });

    await test.step('user C sees user D go red', async () => {
      await expect(dStatusDot).toHaveAttribute('data-status', 'dnd');
    });

    await test.step('user D turns Do Not Disturb back off', async () => {
      await pageD.getByRole('switch').first().click();
    });

    await test.step('user C sees user D back to online', async () => {
      await expect(dStatusDot).toHaveAttribute('data-status', 'online');
    });

    await test.step("user D's session ends", async () => {
      await contextD.close();
    });

    await test.step('user C sees user D go offline', async () => {
      await expect(dStatusDot).toHaveAttribute('data-status', 'offline', { timeout: 15000 });
    });

    await contextC.close();
  });
});
