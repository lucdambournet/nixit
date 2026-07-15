/**
 * E2E: tap-out request, approval, and undo workflow (Issue #50)
 * Uses a disposable cohort with a past start_date (already "underway") so
 * the app takes the approval-required tap-out path rather than the
 * instant pre-start "change of mind" leave.
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

const PASSWORD = 'testpass123';

async function createIsolatedCohort(label: string) {
  const month = `tap-out-test-${Date.now()}-${label}`;
  const { data: nixDate } = await admin
    .from('nix_dates')
    .insert({ month, start_date: '2026-01-01' })
    .select('id')
    .single();
  const { data: cohort } = await admin
    .from('cohorts')
    .insert({ nix_date_id: nixDate!.id, start_date: '2026-01-01', max_members: 25 })
    .select('id')
    .single();
  return { nixDateId: nixDate!.id, cohortId: cohort!.id };
}

async function createCohortUser(email: string, username: string, cohortId: string) {
  const { data: { users } } = await admin.auth.admin.listUsers();
  const existing = users.find(u => u.email === email);
  if (existing) {
    await admin.from('users').delete().eq('id', existing.id);
    await admin.auth.admin.deleteUser(existing.id);
  }
  const { data } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  await admin.from('users').upsert({ id: data.user!.id, email, username, active_cohort_id: cohortId }, { onConflict: 'id' });
  await admin.from('cohort_members').insert({ user_id: data.user!.id, cohort_id: cohortId });
  return data.user!.id;
}

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard');
}

async function cleanupUser(email: string) {
  const { data: { users } } = await admin.auth.admin.listUsers();
  const u = users.find(entry => entry.email === email);
  if (u) {
    await admin.from('cohort_members').delete().eq('user_id', u.id);
    await admin.from('users').delete().eq('id', u.id);
    await admin.auth.admin.deleteUser(u.id);
  }
}

test.describe('Tap-out workflow', () => {
  test('request reaches full approval, resolves, and removes the requester', async ({ browser }) => {
    test.setTimeout(90000);

    const { nixDateId, cohortId } = await createIsolatedCohort('approve');
    const requesterEmail = 'e2e_tapout_requester@nixit.dev';
    const approverEmails = ['e2e_tapout_approver_b@nixit.dev', 'e2e_tapout_approver_c@nixit.dev', 'e2e_tapout_approver_d@nixit.dev'];

    const requesterId = await createCohortUser(requesterEmail, 'e2e_requester', cohortId);
    for (const [i, email] of approverEmails.entries()) {
      await createCohortUser(email, `e2e_approver_${i}`, cohortId);
    }
    await admin.from('cohorts').update({ member_count: 4 }).eq('id', cohortId);

    try {
      const requesterCtx = await browser.newContext();
      const requesterPage = await requesterCtx.newPage();
      requesterPage.on('dialog', dialog => dialog.accept());

      await test.step('requester requests to tap out', async () => {
        await login(requesterPage, requesterEmail);
        await expect(requesterPage.getByRole('button', { name: 'Tap Out' })).toBeVisible();
        await requesterPage.getByRole('button', { name: 'Tap Out' }).click();
        await expect(requesterPage.getByPlaceholder("Share how you're doing…")).toBeVisible();
        await expect(requesterPage.getByText('e2e_requester requested to tap out.')).toBeVisible();
        await expect(requesterPage.getByText('0/3 approvals')).toBeVisible();
        await expect(requesterPage.getByRole('button', { name: 'Undo request' })).toBeVisible();
      });

      for (const [i, email] of approverEmails.entries()) {
        const isLastApproval = i === approverEmails.length - 1;
        await test.step(`approver ${i} approves`, async () => {
          const ctx = await browser.newContext();
          const page = await ctx.newPage();
          await login(page, email);
          await page.getByRole('button', { name: 'Chat' }).click();
          await expect(page.getByText('e2e_requester requested to tap out.')).toBeVisible();
          await page.getByRole('button', { name: 'Approve', exact: true }).click();
          if (isLastApproval) {
            // The 3rd approval resolves the request in the same RPC call, so
            // the banner switches straight to the resolved state instead of
            // ever showing "Approved ✓" for this approver.
            await expect(page.getByText('Approved — e2e_requester has left the cohort.')).toBeVisible();
          } else {
            await expect(page.getByRole('button', { name: 'Approved ✓' })).toBeVisible();
          }
          await ctx.close();
        });
      }

      await test.step('requester is auto-navigated to enrollment once approved', async () => {
        await requesterPage.waitForURL('**/enrollment', { timeout: 15000 });
      });

      await test.step('DB reflects the resolved request and removed membership', async () => {
        const { data: reqRow } = await admin.from('tap_out_requests').select('status').eq('requester_id', requesterId).single();
        expect(reqRow?.status).toBe('approved');

        const { data: membership } = await admin.from('cohort_members').select('*').eq('user_id', requesterId).eq('cohort_id', cohortId).maybeSingle();
        expect(membership).toBeNull();

        const { data: userRow } = await admin.from('users').select('active_cohort_id').eq('id', requesterId).single();
        expect(userRow?.active_cohort_id).toBeNull();
      });

      await requesterCtx.close();
    } finally {
      await cleanupUser(requesterEmail);
      for (const email of approverEmails) await cleanupUser(email);
      await admin.from('tap_out_approvals').delete().in('request_id',
        (await admin.from('tap_out_requests').select('id').eq('cohort_id', cohortId)).data?.map(r => r.id) ?? []);
      await admin.from('tap_out_requests').delete().eq('cohort_id', cohortId);
      await admin.from('chat_messages').delete().eq('cohort_id', cohortId);
      await admin.from('cohorts').delete().eq('id', cohortId);
      await admin.from('nix_dates').delete().eq('id', nixDateId);
    }
  });

  test('requester can undo a pending request before it is approved', async ({ page }) => {
    test.setTimeout(60000);

    const { nixDateId, cohortId } = await createIsolatedCohort('undo');
    const requesterEmail = 'e2e_tapout_undo_requester@nixit.dev';
    const requesterId = await createCohortUser(requesterEmail, 'e2e_undo_requester', cohortId);
    await admin.from('cohorts').update({ member_count: 1 }).eq('id', cohortId);

    try {
      page.on('dialog', dialog => dialog.accept());
      await login(page, requesterEmail);
      await page.getByRole('button', { name: 'Tap Out' }).click();
      await expect(page.getByText('e2e_undo_requester requested to tap out.')).toBeVisible();

      await page.getByRole('button', { name: 'Undo request' }).click();
      await expect(page.getByText('Request withdrawn.')).toBeVisible();

      const { data: reqRow } = await admin.from('tap_out_requests').select('status').eq('requester_id', requesterId).single();
      expect(reqRow?.status).toBe('undone');

      const { data: membership } = await admin.from('cohort_members').select('*').eq('user_id', requesterId).eq('cohort_id', cohortId).maybeSingle();
      expect(membership).not.toBeNull();
    } finally {
      await cleanupUser(requesterEmail);
      await admin.from('tap_out_requests').delete().eq('cohort_id', cohortId);
      await admin.from('chat_messages').delete().eq('cohort_id', cohortId);
      await admin.from('cohorts').delete().eq('id', cohortId);
      await admin.from('nix_dates').delete().eq('id', nixDateId);
    }
  });
});
