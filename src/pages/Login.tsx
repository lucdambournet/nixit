import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Logo } from '../components/ui/Logo';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    if (!data?.user) { setError('Login succeeded but no session was returned.'); setLoading(false); return; }
    const { data: userData } = await supabase
      .from('users')
      .select('active_cohort_id')
      .eq('id', data.user.id)
      .single();
    navigate(userData?.active_cohort_id ? '/dashboard' : '/enrollment');
  };

  const handleReset = async () => {
    setResetMessage(null);
    if (!email) { setResetMessage('Enter your email above to receive a reset link.'); return; }
    setResetting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/login' });
    setResetMessage(error ? error.message : 'Password reset email sent. Check your inbox.');
    setResetting(false);
  };

  return (
    <div className="nixit-blob-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Logo height={44} style={{ margin: '0 auto' }} />
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 8 }}>
            Quit together. Stay accountable.
          </p>
        </div>

        <Card variant="glass" padding="lg">
          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-bold)',
            fontSize: 'var(--text-xl)', color: 'var(--color-text)',
            marginBottom: 24, letterSpacing: 'var(--tracking-snug)',
          }}>
            Sign in to NixIt
          </h1>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
              autoComplete="current-password"
            />

            {error && (
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--purple-600)', margin: 0 }}>
                {error}
              </p>
            )}

            <Button type="submit" variant="primary" size="lg" disabled={loading} style={{ width: '100%', marginTop: 4 }}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div style={{ marginTop: 16, textAlign: 'center' }}>
            {resetMessage && (
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                {resetMessage}
              </p>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={handleReset} disabled={resetting}>
              {resetting ? 'Sending…' : 'Forgot password?'}
            </Button>
          </div>
        </Card>

        <p style={{
          textAlign: 'center', marginTop: 20,
          fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
          color: 'var(--color-text-muted)',
        }}>
          Don't have an account?{' '}
          <button
            onClick={() => navigate('/signup')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--lavender-500)', fontWeight: 'var(--weight-semibold)',
              fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
              padding: 0,
            }}
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;
