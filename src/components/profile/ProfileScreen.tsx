import React, { useRef, useState } from 'react';
import { supabase } from '../../app/lib/supabase';
import { Avatar } from '../../app/components/ui/Avatar';
import { Button } from '../../app/components/ui/Button';
import { Card } from '../../app/components/ui/Card';
import { Input } from '../../app/components/ui/Input';
import { Badge } from '../../app/components/ui/Badge';
import { Toast } from '../../app/components/ui/Toast';
import { AvatarCropModal } from '../../app/components/ui/AvatarCropModal';
import { isPushSupported, subscribeToPush } from '../../app/lib/push';

/* ── Preferences (client-only, persisted to localStorage — no backend column yet) ── */
const PREFS_KEY = 'nixit:prefs';
type Prefs = { emailNotifications: boolean; chatSound: boolean; reducedMotion: boolean };
const DEFAULT_PREFS: Prefs = { emailNotifications: true, chatSound: true, reducedMotion: false };

function loadPrefs(): Prefs {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') };
  } catch {
    return DEFAULT_PREFS;
  }
}

/* ── Toggle switch (design-system styled) ── */
function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 42, height: 24, flexShrink: 0, padding: 0,
        borderRadius: 'var(--radius-full)', border: 'none', cursor: 'pointer',
        background: checked ? 'var(--lavender-500)' : 'var(--neutral-300)',
        position: 'relative', transition: 'background var(--transition-fast)',
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: checked ? 21 : 3,
        width: 18, height: 18, borderRadius: 'var(--radius-full)', background: 'white',
        boxShadow: 'var(--shadow-xs)', transition: 'left var(--transition-fast)',
      }} />
    </button>
  );
}

/* ── Section header ── */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-lg)',
      color: 'var(--color-text)', margin: 0, letterSpacing: 'var(--tracking-snug)',
    }}>
      {children}
    </h2>
  );
}

interface ProfileUser {
  id: string;
  username: string;
  email: string;
  profile_image_url: string | null;
  created_at: string;
  cohortLabel?: string | null;
  dnd: boolean;
}

interface ProfileScreenProps {
  user: ProfileUser;
  onUserUpdate: (patch: Partial<Pick<ProfileUser, 'username' | 'profile_image_url'>>) => void;
  onSignOut: () => void;
  onToggleDnd: (next: boolean) => Promise<boolean>;
}

export function ProfileScreen({ user, onUserUpdate, onSignOut, onToggleDnd }: ProfileScreenProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState(user.username);
  const [savingName, setSavingName] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);
  const [savingPw, setSavingPw] = useState(false);

  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [pushEnabling, setPushEnabling] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  const flash = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const memberSince = new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const nameChanged = username.trim() !== user.username && username.trim().length > 0;

  /* ── Handlers ── */
  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { flash('error', 'Please choose an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { flash('error', 'Image must be under 5 MB.'); return; }

    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.onerror = () => flash('error', 'Could not read image.');
    reader.readAsDataURL(file);
  };

  const handleCropSave = async (blob: Blob) => {
    setCropSrc(null);
    setUploading(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { setUploading(false); flash('error', 'Your session expired. Please sign in again.'); return; }

    const path = `${authUser.id}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
    if (uploadError) { setUploading(false); flash('error', `Upload failed: ${uploadError.message}`); return; }

    const publicUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
    // Cache-bust so the new image replaces the old one at the same path.
    const bustedUrl = `${publicUrl}?v=${Date.now()}`;

    const { error: updateError } = await supabase.from('users').update({ profile_image_url: bustedUrl }).eq('id', authUser.id);
    setUploading(false);
    if (updateError) { flash('error', updateError.message); return; }

    onUserUpdate({ profile_image_url: bustedUrl });
    flash('success', 'Profile photo updated.');
  };

  const handleSaveName = async () => {
    const next = username.trim();
    if (!next) return;
    setSavingName(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { setSavingName(false); flash('error', 'Your session expired. Please sign in again.'); return; }

    const { error } = await supabase.from('users').update({ username: next }).eq('id', authUser.id);
    setSavingName(false);
    if (error) { flash('error', error.message); return; }

    onUserUpdate({ username: next });
    flash('success', 'Username updated.');
  };

  const handleSavePassword = async () => {
    setPwError(null);
    if (newPassword.length < 6) { setPwError('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match.'); return; }

    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPw(false);
    if (error) { setPwError(error.message); return; }

    setNewPassword('');
    setConfirmPassword('');
    flash('success', 'Password updated.');
  };

  const handleEnablePush = async () => {
    setPushEnabling(true);
    const result = await subscribeToPush(user.id);
    setPushEnabling(false);
    if (!result.ok) { flash('error', result.message); return; }
    setPushEnabled(true);
    flash('success', 'Push notifications enabled on this device.');
  };

  const setPref = (key: keyof Prefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  };

  const PREF_ROWS: { key: keyof Prefs; label: string; desc: string }[] = [
    { key: 'emailNotifications', label: 'Email notifications', desc: 'Get a nudge when your cohort is active and on milestone days.' },
    { key: 'chatSound',          label: 'Chat sounds',         desc: 'Play a soft sound when a new message lands in your cohort.' },
    { key: 'reducedMotion',      label: 'Reduce motion',       desc: 'Tone down animated transitions across the app.' },
  ];

  return (
    <div style={{ padding: '32px 40px 64px', maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {toast && (
        <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 100 }}>
          <Toast type={toast.type} message={toast.msg} visible onClose={() => setToast(null)} />
        </div>
      )}

      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-3xl)', color: 'var(--color-text)', margin: '0 0 8px', letterSpacing: 'var(--tracking-tight)' }}>
          Profile
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)', margin: 0 }}>
          Manage your account, sign-in details, and preferences.
        </p>
      </div>

      {/* ── Identity header ── */}
      <Card variant="default" padding="lg">
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Avatar src={user.profile_image_url} name={user.username} size="2xl" />
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFilePick} style={{ display: 'none' }} />
          </div>
          <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-2xl)', color: 'var(--color-text)', lineHeight: 1.1 }}>
              {user.username}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
              {user.email}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              {user.cohortLabel && <Badge variant="lavender" dot size="sm">{user.cohortLabel}</Badge>}
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', letterSpacing: 'var(--tracking-wide)' }}>
                Member since {memberSince}
              </span>
            </div>
            <div style={{ marginTop: 8 }}>
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? 'Uploading…' : 'Change Photo'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Status ── */}
      <Card variant="default" padding="lg">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--color-text)' }}>
              Do Not Disturb
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-snug)', marginTop: 2 }}>
              Shows a red status to your cohort regardless of whether you're actually online. Online, away, and offline are detected automatically and can't be set manually.
            </div>
          </div>
          <Switch
            checked={user.dnd}
            onChange={async v => {
              const ok = await onToggleDnd(v);
              if (!ok) flash('error', 'Could not update your status. Try again.');
            }}
          />
        </div>
      </Card>

      {/* ── Push notifications ── */}
      {isPushSupported() && (
        <Card variant="default" padding="lg">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--color-text)' }}>
                Push notifications
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-snug)', marginTop: 2 }}>
                Get notified on this device for help alerts and tap-out updates from your cohort.
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleEnablePush} disabled={pushEnabling || pushEnabled}>
              {pushEnabled ? 'Enabled' : pushEnabling ? 'Enabling…' : 'Enable on this device'}
            </Button>
          </div>
        </Card>
      )}

      {/* ── Account details ── */}
      <Card variant="default" padding="lg" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <SectionTitle>Account</SectionTitle>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <Input
            label="Username"
            value={username}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
            placeholder="your_handle"
            autoComplete="username"
            style={{ flex: 1, minWidth: 220 }}
          />
          <Button variant="primary" onClick={handleSaveName} disabled={!nameChanged || savingName}>
            {savingName ? 'Saving…' : 'Save'}
          </Button>
        </div>
        <Input label="Email" value={user.email} disabled hint="Email is used to sign in and can't be changed here." />
      </Card>

      {/* ── Security ── */}
      <Card variant="default" padding="lg" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <SectionTitle>Password</SectionTitle>
        <Input
          label="New password"
          type="password"
          value={newPassword}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
          error={pwError ?? undefined}
        />
        <Input
          label="Confirm new password"
          type="password"
          value={confirmPassword}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
        />
        <div>
          <Button variant="primary" onClick={handleSavePassword} disabled={savingPw || !newPassword || !confirmPassword}>
            {savingPw ? 'Updating…' : 'Update Password'}
          </Button>
        </div>
      </Card>

      {/* ── Preferences ── */}
      <Card variant="default" padding="lg" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <SectionTitle>Preferences</SectionTitle>
        {PREF_ROWS.map((row, i) => (
          <div key={row.key} style={{
            display: 'flex', alignItems: 'center', gap: 16, padding: '14px 0',
            borderTop: i === 0 ? 'none' : '1px solid var(--color-border-subtle)',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--color-text)' }}>
                {row.label}
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-snug)', marginTop: 2 }}>
                {row.desc}
              </div>
            </div>
            <Switch checked={prefs[row.key]} onChange={v => setPref(row.key, v)} />
          </div>
        ))}
      </Card>

      {/* ── Sign out ── */}
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 4 }}>
        <Button variant="danger" size="sm" onClick={onSignOut}>Sign Out</Button>
      </div>

      {cropSrc && (
        <AvatarCropModal
          src={cropSrc}
          onCancel={() => setCropSrc(null)}
          onSave={handleCropSave}
        />
      )}
    </div>
  );
}
