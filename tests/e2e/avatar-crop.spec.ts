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

test.beforeAll(async () => {
  userId = await resetUser();
  await admin.from('users').insert([{ id: userId, email: USER.email, username: USER.username, profile_image_url: null }]);
});

test.afterAll(async () => {
  await admin.from('users').delete().eq('id', userId);
  await admin.auth.admin.deleteUser(userId);
});

test.describe('Avatar crop upload', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(USER.email);
    await page.getByLabel('Password').fill(USER.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/dashboard');
    await page.getByRole('button', { name: 'Profile' }).click();
  });

  test('picking a photo opens the crop modal; Save uploads and updates the avatar', async ({ page }) => {
    const avatarImgBefore = page.locator('img[alt="avatar_crop_tester"]');
    await expect(avatarImgBefore).toHaveCount(0); // no photo yet → initials shown, no <img>

    await page.locator('input[type="file"]').setInputFiles(FIXTURE);

    const dialog = page.getByRole('dialog', { name: 'Crop profile photo' });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toHaveCount(0);

    await expect(page.getByText('Profile photo updated.')).toBeVisible();
    await expect(page.locator('img[alt="avatar_crop_tester"]')).toBeVisible();
  });

  test('Cancel closes the crop modal without uploading', async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles(FIXTURE);

    const dialog = page.getByRole('dialog', { name: 'Crop profile photo' });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);

    await expect(page.getByText('Profile photo updated.')).toHaveCount(0);
    await expect(page.locator('img[alt="avatar_crop_tester"]')).toHaveCount(0);
  });
});
