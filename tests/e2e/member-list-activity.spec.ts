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

// Inserted in this order so the offline member (E) is first in DB/query order,
// letting the activity sort be the only thing that could put F ahead of it.
const USER_E = { email: 'test7@nixit.com', password: '12qwaszx', username: 'test7' };
const USER_F = { email: 'test8@nixit.com', password: '12qwaszx', username: 'test8' };

let cohortId: string;

async function resetUser(user: typeof USER_E): Promise<string> {
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

  const idE = await resetUser(USER_E);
  const idF = await resetUser(USER_F);

  await admin.from('users').upsert([
    { id: idE, email: USER_E.email, username: USER_E.username, active_cohort_id: cohortId, dnd: false },
    { id: idF, email: USER_F.email, username: USER_F.username, active_cohort_id: cohortId, dnd: false },
  ], { onConflict: 'id' });

  await admin.from('cohort_members').insert([
    { user_id: idE, cohort_id: cohortId },
    { user_id: idF, cohort_id: cohortId },
  ]);
});

test.afterAll(async () => {
  for (const user of [USER_E, USER_F]) {
    const { data: { users } } = await admin.auth.admin.listUsers();
    const existing = users.find(entry => entry.email === user.email);

    if (existing) {
      await admin.from('cohort_members').delete().eq('user_id', existing.id);
      await admin.from('users').delete().eq('id', existing.id);
      await admin.auth.admin.deleteUser(existing.id);
    }
  }
});

async function signIn(page: Page, user: typeof USER_E) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard');
}

test.describe('Cohort member list activity ordering', () => {
  test('online members sort ahead of offline members and offline avatars are greyscale', async ({ browser }) => {
    test.setTimeout(60000);

    // USER_F stays offline (never signs in) even though it was inserted after USER_E.
    const contextE = await browser.newContext();
    const pageE = await contextE.newPage();

    await test.step('user E signs in and lands on the cohort home screen', async () => {
      await signIn(pageE, USER_E);
    });

    const eDot = pageE.getByLabel(new RegExp(`^${USER_E.username} status:`));
    const fDot = pageE.getByLabel(new RegExp(`^${USER_F.username} status:`));

    await test.step('user E (online) appears before user F (offline) in the member list', async () => {
      await expect(eDot).toHaveAttribute('data-status', 'online');
      await expect(fDot).toHaveAttribute('data-status', 'offline');

      const order = await pageE.locator('[aria-label^="test7 status:"], [aria-label^="test8 status:"]').evaluateAll(
        nodes => nodes.map(n => n.getAttribute('aria-label'))
      );
      expect(order[0]).toContain(USER_E.username);
      expect(order[order.length - 1]).toContain(USER_F.username);
    });

    await test.step("offline user F's avatar is rendered greyscale", async () => {
      const fAvatarRoot = fDot.locator('..');
      await expect(fAvatarRoot).toHaveCSS('filter', /grayscale/);
    });

    await test.step("online user E's avatar is not greyscale", async () => {
      const eAvatarRoot = eDot.locator('..');
      await expect(eAvatarRoot).not.toHaveCSS('filter', /grayscale/);
    });

    await contextE.close();
  });
});
