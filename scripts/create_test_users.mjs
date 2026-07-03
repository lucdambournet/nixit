import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const TEST_USERS = [
  { email: 'testuser1@nixit.dev', password: 'testpass123', username: 'alex_quit' },
  { email: 'testuser2@nixit.dev', password: 'testpass123', username: 'jordan_clean' },
];

const run = async () => {
  // Find September 2026 cohort
  const { data: cohort, error: cohortErr } = await supabase
    .from('cohorts')
    .select('id, member_count, nix_date:nix_date_id(month)')
    .eq('start_date', '2026-09-01')
    .single();

  if (cohortErr || !cohort) {
    console.error('Could not find September 2026 cohort:', cohortErr?.message);
    process.exit(1);
  }
  console.log(`Found cohort: ${cohort.nix_date?.month} (${cohort.id})`);

  for (const u of TEST_USERS) {
    console.log(`\nProcessing ${u.email}...`);

    // Delete existing auth user if present (idempotent)
    const { data: existing } = await supabase.auth.admin.listUsers();
    const existingUser = existing?.users?.find(x => x.email === u.email);
    if (existingUser) {
      await supabase.auth.admin.deleteUser(existingUser.id);
      console.log(`  Deleted existing auth user`);
    }

    // Create auth user
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
    });
    if (authErr) { console.error(`  Auth create failed:`, authErr.message); continue; }
    const uid = authData.user.id;
    console.log(`  Created auth user: ${uid}`);

    // Upsert public.users row
    const { error: profileErr } = await supabase.from('users').upsert({
      id: uid,
      email: u.email,
      username: u.username,
      active_cohort_id: cohort.id,
    }, { onConflict: 'id' });
    if (profileErr) { console.error(`  Profile upsert failed:`, profileErr.message); continue; }
    console.log(`  Created profile: ${u.username}`);

    // Upsert cohort_members
    const { error: memberErr } = await supabase.from('cohort_members').upsert({
      user_id: uid,
      cohort_id: cohort.id,
    }, { onConflict: 'user_id,cohort_id' });
    if (memberErr) { console.error(`  cohort_members upsert failed:`, memberErr.message); continue; }
    console.log(`  Joined cohort`);
  }

  // Recount members
  const { count } = await supabase
    .from('cohort_members')
    .select('*', { count: 'exact', head: true })
    .eq('cohort_id', cohort.id);

  await supabase.from('cohorts').update({ member_count: count }).eq('id', cohort.id);
  console.log(`\nCohort member_count updated to ${count}`);
  console.log('\nDone. Test credentials:');
  TEST_USERS.forEach(u => console.log(`  ${u.email} / ${u.password}`));
};

run().catch(err => { console.error(err); process.exit(1); });
