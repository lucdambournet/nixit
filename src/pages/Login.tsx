import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (!data || !data.user) {
      setError('Login succeeded but no user session was returned.');
      setLoading(false);
      return;
    }

    navigate('/enrollment');
  };

  const handleReset = async () => {
    setResetMessage(null);
    if (!email) {
      setResetMessage('Enter your email above to receive a reset link.');
      return;
    }
    setResetting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/login' });
    if (error) {
      setResetMessage(error.message);
    } else {
      setResetMessage('Password reset email sent. Check your inbox.');
    }
    setResetting(false);
  };

  return (
    <main className="page-shell">
      <h1>Sign in to NixIt</h1>
      <form onSubmit={handleSubmit} className="card form-card">
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
        {error && <p className="error-text">{error}</p>}
        {resetMessage && <p className="muted">{resetMessage}</p>}
        <p className="muted"><button type="button" className="link-button" onClick={handleReset} disabled={resetting}>{resetting ? 'Sending...' : 'Forgot password?'}</button></p>
      </form>
    </main>
  );
}

export default Login;
