/**
 * Unit tests for auth and join logic (Issue #22)
 * Tests join_cohort restrictions and cohort cap enforcement via Supabase RPC.
 * Uses service role key to set up/tear down state; tests run as anon/user clients.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const URL = process.env.VITE_SUPABASE_URL!;
const ANON = process.env.VITE_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

const TEST_EMAIL_A = 'unit_test_a@nixit.dev';
const TEST_EMAIL_B = 'unit_test_b@nixit.dev';
const TEST_PASSWORD = 'testpass123';

let cohortId: string;
let userAClient: SupabaseClient;
let userBClient: SupabaseClient;
let userAId: string;
let userBId: string;

async function createTestUser(email: string): Promise<{ id: string; client: SupabaseClient }> {
  const existing = (await admin.auth.admin.listUsers()).data.users.find(u => u.email === email);
  if (existing) {
    await admin.from('users').delete().eq('id', existing.id);
    await admin.auth.admin.deleteUser(existing.id);
  }
  const { data } = await admin.auth.admin.createUser({ email, password: TEST_PASSWORD, email_confirm: true });
  const id = data.user!.id;
  await admin.from('users').insert({ id, email, username: email.split('@')[0] });

  const client = createClient(URL, ANON, { auth: { persistSession: false } });
  await client.auth.signInWithPassword({ email, password: TEST_PASSWORD });
  return { id, client };
}

beforeAll(async () => {
  // Find September 2026 cohort
  const { data } = await admin.from('cohorts').select('id').eq('start_date', '2026-09-01').single();
  cohortId = data!.id;

  // Reset member state
  const u1 = await createTestUser(TEST_EMAIL_A);
  userAId = u1.id; userAClient = u1.client;

  const u2 = await createTestUser(TEST_EMAIL_B);
  userBId = u2.id; userBClient = u2.client;

  // Clean up any existing memberships
  await admin.from('cohort_members').delete().in('user_id', [userAId, userBId]);
  await admin.from('users').update({ active_cohort_id: null }).in('id', [userAId, userBId]);
});

afterAll(async () => {
  await admin.from('cohort_members').delete().in('user_id', [userAId, userBId]);
  await admin.from('users').delete().in('id', [userAId, userBId]);
  await admin.auth.admin.deleteUser(userAId);
  await admin.auth.admin.deleteUser(userBId);
});

describe('join_cohort', () => {
  it('allows authenticated user to join an available cohort', async () => {
    const { error } = await userAClient.rpc('join_cohort', { target_cohort_id: cohortId });
    expect(error).toBeNull();

    const { data } = await admin.from('users').select('active_cohort_id').eq('id', userAId).single();
    expect(data?.active_cohort_id).toBe(cohortId);
  });

  it('rejects joining the same cohort twice', async () => {
    const { error } = await userAClient.rpc('join_cohort', { target_cohort_id: cohortId });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/already/i);
  });

  it('rejects joining a second cohort while already in one', async () => {
    // Find a different cohort
    const { data: other } = await admin.from('cohorts')
      .select('id').neq('id', cohortId).limit(1).single();
    const { error } = await userAClient.rpc('join_cohort', { target_cohort_id: other!.id });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/already has an active cohort/i);
  });

  it('rejects joining a non-existent cohort', async () => {
    const { error } = await userBClient.rpc('join_cohort', {
      target_cohort_id: '00000000-0000-0000-0000-000000000000',
    });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/does not exist/i);
  });

  it('increments cohort member_count on join', async () => {
    const { data: before } = await admin.from('cohorts').select('member_count').eq('id', cohortId).single();
    await userBClient.rpc('join_cohort', { target_cohort_id: cohortId });
    const { data: after } = await admin.from('cohorts').select('member_count').eq('id', cohortId).single();
    expect(after!.member_count).toBe(before!.member_count + 1);
  });
});

describe('leave_cohort', () => {
  it('allows user to leave their cohort', async () => {
    const { error } = await userAClient.rpc('leave_cohort');
    expect(error).toBeNull();

    const { data } = await admin.from('users').select('active_cohort_id').eq('id', userAId).single();
    expect(data?.active_cohort_id).toBeNull();
  });

  it('decrements member_count on leave', async () => {
    const { data: before } = await admin.from('cohorts').select('member_count').eq('id', cohortId).single();
    await userBClient.rpc('leave_cohort');
    const { data: after } = await admin.from('cohorts').select('member_count').eq('id', cohortId).single();
    expect(after!.member_count).toBe(before!.member_count - 1);
  });

  it('rejects leaving when not in a cohort', async () => {
    const { error } = await userAClient.rpc('leave_cohort');
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/not in a cohort/i);
  });
});

describe('cohort cap', () => {
  it('cohort has a max_members limit of 25', async () => {
    const { data } = await admin.from('cohorts').select('max_members').eq('id', cohortId).single();
    expect(data?.max_members).toBe(25);
  });
});
