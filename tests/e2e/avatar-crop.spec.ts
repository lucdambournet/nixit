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

const USER = { email: 'avatar_crop_test@nixit.com', password: '12qwaszx', username: 'avatar_crop_tester' };
const FIXTURE = path.resolve(process.cwd(), 'tests/e2e/fixtures/avatar-test.png');

async function resetUser(): Promise<string> {
  const { data: { users } } = await admin.auth.admin.listUsers();
  const existing = users.find(entry => entry.email === USER.email);

  if (existing) {
    await admin.from('cohort_members').delete().eq('user_id', existing.id);
    await admin.from('users').delete().eq('id', existing.id);
    await admin.auth.admin.deleteUser(existing.id);
  }

  const { data } = await admin.auth.admin.createUser({
    email: USER.email,
    password: USER.password,
    email_confirm: true,
  });

  return data.user!.id;
}

let userId: string;
let cohortId: string;

test.beforeAll(async () => {
  const { data: cohort } = await admin.from('cohorts').select('id').eq('start_date', '2026-11-01').single();
  cohortId = cohort!.id;

  userId = await resetUser();

  await admin.from('cohort_members').delete().eq('user_id', userId);
  await admin.from('users').delete().eq('id', userId);

  await admin.from('users').insert([{ id: userId, email: USER.email, username: USER.username, profile_image_url: null, active_cohort_id: cohortId }]);
  await admin.from('cohort_members').insert([{ user_id: userId, cohort_id: cohortId }]);
});

test.afterAll(async () => {
  await admin.from('cohort_members').delete().eq('user_id', userId);
  await admin.from('users').delete().eq('id', userId);
  await admin.auth.admin.deleteUser(userId);
});

test.describe('Avatar crop upload', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure each test starts from a photo-less profile, regardless of what a
    // prior test in this file uploaded (uploads now persist for real).
    await admin.from('users').update({ profile_image_url: null }).eq('id', userId);

    await page.goto('/login');
    await page.getByLabel('Email').fill(USER.email);
    await page.getByLabel('Password').fill(USER.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/dashboard');
    await page.getByRole('button', { name: 'Profile' }).click();
  });

  test('picking a photo opens the crop modal; Save uploads and updates the avatar', async ({ page }) => {
    const profileCardAvatar = page.getByRole('main').getByRole('img', { name: USER.username });
    await expect(profileCardAvatar).toHaveCount(0); // no photo yet → initials shown, no <img>

    await page.locator('input[type="file"]').setInputFiles(FIXTURE);

    const dialog = page.getByRole('dialog', { name: 'Crop profile photo' });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toHaveCount(0);

    await expect(page.getByText('Profile photo updated.')).toBeVisible();
    await expect(profileCardAvatar).toBeVisible();
    // The <img> element renders regardless of whether its src 404s (fixed size
    // placeholder), so also assert the browser actually decoded pixel data —
    // this is what would have caught the missing storage.objects SELECT RLS
    // policy that broke every avatar upload in production.
    await expect.poll(() =>
      profileCardAvatar.evaluate((img: HTMLImageElement) => img.naturalWidth)
    ).toBeGreaterThan(0);
  });

  test('Cancel closes the crop modal without uploading', async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles(FIXTURE);

    const dialog = page.getByRole('dialog', { name: 'Crop profile photo' });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);

    await expect(page.getByText('Profile photo updated.')).toHaveCount(0);
    await expect(page.getByRole('main').getByRole('img', { name: USER.username })).toHaveCount(0);
  });
});
