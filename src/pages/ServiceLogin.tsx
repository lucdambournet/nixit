import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

function ServiceLogin() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleServiceLogin = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);

    const response = await fetch('/service-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'lucdambournet@gmail.com',
        password: '12qwaszx',
        username: 'lucdambournet',
      }),
    });

    const body = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(body.error || 'Service login failed');
      return;
    }

    if (body.success) {
      setMessage('Service login succeeded. You can now sign in using the normal login screen.');
      return;
    }

    setError('Unexpected response from service login.');
  };

  return (
    <div className="nixit-blob-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/assets/logo.svg" height={36} alt="NixIt" style={{ display: 'inline-block' }} />
        </div>

        <Card variant="glass" padding="lg">
          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-bold)',
            fontSize: 'var(--text-xl)', color: 'var(--color-text)',
            marginBottom: 8, letterSpacing: 'var(--tracking-snug)',
          }}>
            Service login
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 24, lineHeight: 'var(--leading-relaxed)' }}>
            This temporary route uses the Supabase service role to ensure the test account exists.
          </p>

          <Button variant="primary" size="lg" onClick={handleServiceLogin} disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Processing…' : 'Create / Sign in test account'}
          </Button>

          {message && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--lavender-600)', marginTop: 16, textAlign: 'center' }}>
              {message}
            </p>
          )}
          {error && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--purple-600)', marginTop: 16, textAlign: 'center' }}>
              {error}
            </p>
          )}

          {message && (
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>Go to login →</Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default ServiceLogin;
