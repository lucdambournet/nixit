/**
 * E2E: help alert workflow (Issue #48)
 * Member A sends a help alert from Home; member B (in chat) sees it live,
 * rendered distinctly from a normal chat message.
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

const USER_A = { email: 'e2e_helpalert_a@nixit.dev', password: 'testpass123', username: 'e2e_alert_a' };
const USER_B = { email: 'e2e_helpalert_b@nixit.dev', password: 'testpass123', username: 'e2e_alert_b' };

let cohortId: string;

async function resetUser(user: typeof USER_A): Promise<string> {
  const { data: { users } } = await admin.auth.admin.listUsers();
  const existing = users.find(entry => entry.email === user.email);

  if (existing) {
    await admin.from('chat_messages').delete().eq('author_id', existing.id);
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
  const { data: cohort } = await admin
    .from('cohorts')
    .select('id')
    .eq('status', 'upcoming')
    .order('start_date', { ascending: true })
    .limit(1)
    .single();
  cohortId = cohort!.id;

  const idA = await resetUser(USER_A);
  const idB = await resetUser(USER_B);

  await admin.from('chat_messages').delete().eq('cohort_id', cohortId);

  await admin.from('users').update({ active_cohort_id: cohortId }).in('id', [idA, idB]);
  await admin.from('cohort_members').insert([
    { user_id: idA, cohort_id: cohortId },
    { user_id: idB, cohort_id: cohortId },
  ]);
  await admin.from('users').update({ username: USER_A.username }).eq('id', idA);
  await admin.from('users').update({ username: USER_B.username }).eq('id', idB);
});

test.afterAll(async () => {
  await admin.from('chat_messages').delete().eq('cohort_id', cohortId);

  for (const user of [USER_A, USER_B]) {
    const { data: { users } } = await admin.auth.admin.listUsers();
    const existing = users.find(entry => entry.email === user.email);
    if (existing) {
      await admin.from('cohort_members').delete().eq('user_id', existing.id);
      await admin.from('users').delete().eq('id', existing.id);
      await admin.auth.admin.deleteUser(existing.id);
    }
  }
});

test.describe('Help alert', () => {
  test('sending a help alert on Home renders distinctly in chat for another member', async ({ browser }) => {
    test.setTimeout(60000);

    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    pageA.on('dialog', dialog => dialog.accept());

    await test.step('both members sign in', async () => {
      for (const [page, user] of [[pageA, USER_A], [pageB, USER_B]] as const) {
        await page.goto('/login');
        await page.getByLabel('Email').fill(user.email);
        await page.getByLabel('Password').fill(user.password);
        await page.getByRole('button', { name: 'Sign in' }).click();
        await page.waitForURL('**/dashboard');
      }
      await pageB.getByRole('button', { name: 'Chat' }).click();
      await expect(pageB.getByPlaceholder("Share how you're doing…")).toBeVisible();
    });

    await test.step('user A sends a help alert from Home', async () => {
      await expect(pageA.getByRole('button', { name: '🆘 Send Help Alert' })).toBeVisible();
      await pageA.getByRole('button', { name: '🆘 Send Help Alert' }).click();
      await expect(pageA.getByText('Help alert sent to your cohort.')).toBeVisible();
    });

    await test.step('user B sees the help alert live, styled distinctly from a normal message', async () => {
      const alertBanner = pageB.getByRole('status').filter({ hasText: `${USER_A.username} sent a help alert.` });
      await expect(alertBanner).toBeVisible();
    });

    await test.step('the help-alert row persisted with the right type', async () => {
      const { data: rows } = await admin.from('chat_messages').select('*').eq('cohort_id', cohortId).eq('type', 'help-alert');
      expect(rows).toHaveLength(1);
      expect(rows![0].text).toBe(`${USER_A.username} sent a help alert.`);
    });

    await contextA.close();
    await contextB.close();
  });
});
