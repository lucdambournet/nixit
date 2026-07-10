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

const USER_A = { email: 'chat_test_a@nixit.dev', password: 'testpass123', username: 'chat_test_alex' };
const USER_B = { email: 'chat_test_b@nixit.dev', password: 'testpass123', username: 'chat_test_jordan' };

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
  const { data: cohort } = await admin.from('cohorts').select('id').eq('start_date', '2026-11-01').single();
  cohortId = cohort!.id;

  const idA = await resetUser(USER_A);
  const idB = await resetUser(USER_B);

  // A DB trigger auto-creates the public.users row on signup, so update it
  // rather than insert (which would conflict on the primary key).
  await admin.from('users').update({ username: USER_A.username, active_cohort_id: cohortId }).eq('id', idA);
  await admin.from('users').update({ username: USER_B.username, active_cohort_id: cohortId }).eq('id', idB);

  await admin.from('cohort_members').insert([
    { user_id: idA, cohort_id: cohortId },
    { user_id: idB, cohort_id: cohortId },
  ]);
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

test.describe('Cohort chat', () => {
  test('message sent by one member appears live for another member', async ({ browser }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    await test.step('both members log in and open chat', async () => {
      for (const [page, user] of [[pageA, USER_A], [pageB, USER_B]] as const) {
        await page.goto('/login');
        await page.getByLabel('Email').fill(user.email);
        await page.getByLabel('Password').fill(user.password);
        await page.getByRole('button', { name: 'Sign in' }).click();
        await page.waitForURL('**/dashboard');
        await page.getByRole('button', { name: 'Chat' }).click();
      }
    });

    const messageText = `hello from ${USER_A.username} ${Date.now()}`;

    await test.step('user A sends a message', async () => {
      await pageA.getByPlaceholder("Share how you're doing…").fill(messageText);
      await pageA.getByRole('button', { name: 'Send' }).click();
    });

    await test.step('user B sees the message live, attributed to user A', async () => {
      await expect(pageB.getByText(messageText)).toBeVisible();
      await expect(pageB.getByText(USER_A.username, { exact: true })).toBeVisible();
    });

    await contextA.close();
    await contextB.close();
  });
});