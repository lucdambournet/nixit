import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const users = [
  { email: 'testuser1@nixit.dev', password: 'testpass123', username: 'alex_quit' },
  { email: 'testuser2@nixit.dev', password: 'testpass123', username: 'jordan_clean' },
];

const { data: { users: all } } = await sb.auth.admin.listUsers();

for (const u of users) {
  const existing = all.find(x => x.email === u.email);
  if (existing) {
    await sb.from('users').delete().eq('id', existing.id);
    await sb.auth.admin.deleteUser(existing.id);
    console.log(`Deleted existing ${u.email}`);
  }

  const { data, error } = await sb.auth.admin.createUser({ email: u.email, password: u.password, email_confirm: true });
  if (error) { console.error('FAIL', u.email, error.message); continue; }

  const { error: pe } = await sb.from('users').upsert({ id: data.user.id, email: u.email, username: u.username }, { onConflict: 'id' });
  if (pe) { console.error('PROFILE FAIL', u.email, pe.message); continue; }

  console.log(`OK ${u.email} → ${data.user.id}`);
}
