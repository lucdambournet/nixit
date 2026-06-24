import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const EMAILS = ['testuser1@nixit.dev', 'testuser2@nixit.dev'];

const run = async () => {
  const { data: { users } } = await supabase.auth.admin.listUsers();
  for (const email of EMAILS) {
    const u = users.find(x => x.email === email);
    if (!u) { console.log(`${email}: not found`); continue; }
    await supabase.from('users').delete().eq('id', u.id);
    await supabase.auth.admin.deleteUser(u.id);
    console.log(`Deleted ${email}`);
  }
};

run().catch(err => { console.error(err); process.exit(1); });
