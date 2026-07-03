import { useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Avatar } from '../components/ui/Avatar';

function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setAvatarFile(file);
    setAvatarPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) { setError(signUpError.message); setLoading(false); return; }
    const user = data.user;
    if (!user) { setError('Signup succeeded but no user was returned.'); setLoading(false); return; }

    const hasSession = !!data.session;

    // Avatar upload requires an active session — skip if email confirmation is pending
    let profileImageUrl: string | null = null;
    if (avatarFile && hasSession) {
      const ext = avatarFile.name.split('.').pop();
      const { error: uploadError } = await supabase.storage
        .from('avatars').upload(`${user.id}.${ext}`, avatarFile, { upsert: true });
      if (uploadError) { setError(`Profile image upload failed: ${uploadError.message}`); setLoading(false); return; }
      profileImageUrl = supabase.storage.from('avatars').getPublicUrl(`${user.id}.${ext}`).data.publicUrl;
    }

    if (hasSession) {
      // Session active: insert profile and go to enrollment
      const { error: profileError } = await supabase.from('users').insert([{ id: user.id, email, username, profile_image_url: profileImageUrl }]);
      if (profileError) { setError(profileError.message); setLoading(false); return; }
      navigate('/enrollment');
    } else {
      // No session: email confirmation required — the trigger will create the profile row
      // User must confirm email then log in; avatar can be set later
      setLoading(false);
      setError(null);
      navigate('/login', { state: { notice: 'Check your email to confirm your account, then sign in.' } });
    }
  };

  return (
    <div className="nixit-blob-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/assets/logo.svg" height={36} alt="NixIt" style={{ display: 'inline-block' }} />
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 8 }}>
            Join a cohort. Quit together.
          </p>
        </div>

        <Card variant="glass" padding="lg">
          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-bold)',
            fontSize: 'var(--text-xl)', color: 'var(--color-text)',
            marginBottom: 24, letterSpacing: 'var(--tracking-snug)',
          }}>
            Create your account
          </h1>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Avatar upload */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 4 }}>
              <div style={{ flexShrink: 0 }}>
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" style={{ width: 56, height: 56, borderRadius: 'var(--radius-full)', objectFit: 'cover', border: '2px solid var(--lavender-200)' }} />
                ) : (
                  <Avatar name={username || 'N'} size="xl" />
                )}
              </div>
              <div>
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  {avatarPreview ? 'Change photo' : 'Add photo'}
                </Button>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>
                  Optional
                </p>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
            </div>

            <Input
              label="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="your_handle"
              required
              autoComplete="username"
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="new-password"
            />

            {error && (
              <div style={{
                fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
                color: '#c0392b',
                background: 'rgba(220, 53, 69, 0.08)',
                border: '1px solid rgba(220, 53, 69, 0.35)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 16px',
                lineHeight: 'var(--leading-relaxed)',
                fontWeight: 500,
              }}>
                ⚠ {error}
              </div>
            )}

            <Button type="submit" variant="primary" size="lg" disabled={loading} style={{ width: '100%', marginTop: 4 }}>
              {loading ? 'Creating account…' : 'Sign up'}
            </Button>
          </form>
        </Card>

        <p style={{
          textAlign: 'center', marginTop: 20,
          fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
          color: 'var(--color-text-muted)',
        }}>
          Already have an account?{' '}
          <button
            onClick={() => navigate('/login')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--lavender-500)', fontWeight: 'var(--weight-semibold)',
              fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
              padding: 0,
            }}
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}

export default Signup;
