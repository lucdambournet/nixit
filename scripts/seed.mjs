import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  throw new Error('Missing SUPABASE env vars in .env');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
});

const seed = async () => {
  const nft = [
    { month: 'June 2026',     start_date: '2026-06-01' },
    { month: 'July 2026',     start_date: '2026-07-01' },
    { month: 'August 2026',   start_date: '2026-08-01' },
    { month: 'September 2026',start_date: '2026-09-01' },
    { month: 'October 2026',  start_date: '2026-10-01' },
    { month: 'November 2026', start_date: '2026-11-01' },
    { month: 'December 2026', start_date: '2026-12-01' },
    { month: 'January 2027',  start_date: '2027-01-01' },
  ];

  console.log('Seeding Nix Dates...');
  const { error } = await supabase.from('nix_dates').upsert(nft, { onConflict: ['month'] });
  if (error) throw error;

  console.log('Seeding cohorts...');
  const { data: dates } = await supabase.from('nix_dates').select('id,month,start_date');
  if (!dates) throw new Error('Unable to load nix_dates');

  const cohortRows = dates.map((date) => ({
    nix_date_id: date.id,
    start_date: date.start_date,
    member_count: 0,
  }));
  const { error: cohortError } = await supabase.from('cohorts').upsert(cohortRows, { onConflict: ['nix_date_id'] });
  if (cohortError) throw cohortError;

  console.log('Seed complete.');
  console.log('\n⚠️  If the enrollment screen shows no dates, you need to apply RLS policies.');
  console.log('   Open: https://supabase.com/dashboard/project/vuylmwyiecanklvehxiz/sql/new');
  console.log('   Paste and run: supabase/rls_policies.sql');
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
