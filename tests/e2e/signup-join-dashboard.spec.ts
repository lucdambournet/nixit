/**
 * E2E: signup → join cohort → dashboard (Issue #23)
 * Covers the main happy path using a pre-confirmed test account.
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

const E2E_EMAIL = 'e2e_test@nixit.dev';
const E2E_PASSWORD = 'testpass123';
const E2E_USERNAME = 'e2e_user';

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

async function setEnrollmentState(enrolled: boolean) {
  const userId = await getE2EUserId();

  await admin.from('cohort_members').delete().eq('user_id', userId);
  await admin.from('users').update({ active_cohort_id: null }).eq('id', userId);

  if (!enrolled) {
    return;
  }

  const cohortId = await getAvailableCohortId();

  await admin.from('cohort_members').insert({ user_id: userId, cohort_id: cohortId });
  await admin.from('users').update({ active_cohort_id: cohortId }).eq('id', userId);
}

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(E2E_EMAIL);
  await page.getByLabel('Password').fill(E2E_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

test.beforeAll(async () => {
  // Clean up and create a confirmed test account with no active cohort
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

// Note: we deliberately don't drive the live signup form's real
// `supabase.auth.signUp()` call in an automated test. This Supabase project
// enforces a strict confirmation-email send rate limit (a handful per hour),
// shared with real users, so repeatedly exercising that path here would make
// the suite flaky/undeterministic and could starve real signups of their
// confirmation emails. Instead this regresses the exact bug that surfaced
// while wiring up this suite: the `handle_new_user` DB trigger always sets
// `username` to the email's local part and ignores auth user metadata, so a
// signed-up user's chosen username was silently discarded until reconciled
// on first login (see Signup.tsx / Login.tsx). `admin.auth.admin.createUser`
// exercises the same trigger without sending an email, so it's a safe stand-in.
test.describe('Signup username reconciliation', () => {
  const SIGNUP_EMAIL = `e2e_signup_${Date.now()}@nixit.dev`;
  const SIGNUP_PASSWORD = 'testpass123';
  const CHOSEN_USERNAME = 'e2e_signup_user';

  test.beforeAll(async () => {
    const { data, error } = await admin.auth.admin.createUser({
      email: SIGNUP_EMAIL,
      password: SIGNUP_PASSWORD,
      email_confirm: true,
      user_metadata: { username: CHOSEN_USERNAME },
    });
    if (error) throw error;

    // Sanity-check the trigger really does default to the email prefix here,
    // same as it does for a real (email-confirmed) signup.
    const { data: row } = await admin.from('users').select('username').eq('id', data.user.id).single();
    if (row?.username === CHOSEN_USERNAME) {
      throw new Error('Test setup assumption changed: trigger now honors user metadata directly.');
    }
  });

  test.afterAll(async () => {
    const { data: { users } } = await admin.auth.admin.listUsers();
    const u = users.find(candidate => candidate.email === SIGNUP_EMAIL);
    if (u) {
      await admin.from('cohort_members').delete().eq('user_id', u.id);
      await admin.from('users').delete().eq('id', u.id);
      await admin.auth.admin.deleteUser(u.id);
    }
  });

  test('first login reconciles the profile username with the one chosen at signup', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(SIGNUP_EMAIL);
    await page.getByLabel('Password').fill(SIGNUP_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/enrollment');

    await page.getByRole('button', { name: /join/i }).first().click();
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await expect(page.getByText(`Good morning, ${CHOSEN_USERNAME}`)).toBeVisible();
  });
});

test.describe('Signup → Join → Dashboard', () => {
  test('login redirects unenrolled user to enrollment page', async ({ page }) => {
    await setEnrollmentState(false);
    await login(page);
    await page.waitForURL('**/enrollment');
    await expect(page).toHaveURL(/enrollment/);
  });

  test('enrollment page shows available cohorts', async ({ page }) => {
    await setEnrollmentState(false);
    await login(page);
    await page.waitForURL('**/enrollment');

    await expect(page.getByText('Pick your Nix Date')).toBeVisible();
    await expect(page.getByRole('button', { name: /join/i }).first()).toBeVisible();
  });

  test('joining a cohort redirects to dashboard', async ({ page }) => {
    await setEnrollmentState(false);
    await login(page);
    await page.waitForURL('**/enrollment');

    // Join the first available cohort
    await page.getByRole('button', { name: /join/i }).first().click();
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await expect(page).toHaveURL(/dashboard/);
  });

  test('dashboard shows username and cohort info', async ({ page }) => {
    await setEnrollmentState(true);
    await login(page);
    await page.waitForURL('**/dashboard');

    await expect(page.getByText(`Good morning, ${E2E_USERNAME}`)).toBeVisible();
    await expect(page.getByText('Nicotine-free for', { exact: false })).toBeVisible();
  });

  test('login with active cohort goes directly to dashboard', async ({ page }) => {
    await setEnrollmentState(true);
    await login(page);
    await page.waitForURL('**/dashboard');
    await expect(page).toHaveURL(/dashboard/);
  });

  test('sign out returns to login page', async ({ page }) => {
    await setEnrollmentState(true);
    await login(page);
    await page.waitForURL('**/dashboard');

    await page.getByTitle('Sign out').click();
    await page.waitForURL('**/login');
    await expect(page).toHaveURL(/login/);
  });
});
