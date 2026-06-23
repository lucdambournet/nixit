import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const user = data.user;
    if (!user) {
      setError('Signup succeeded but no user was returned.');
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase.from('users').insert([
      {
        id: user.id,
        email,
        username,
      },
    ]);

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    navigate('/enrollment');
  };

  return (
    <main className="page-shell">
      <h1>Sign up for NixIt</h1>
      <form onSubmit={handleSubmit} className="card form-card">
        <label>
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        <label>
          Username
          <input value={username} onChange={(event) => setUsername(event.target.value)} required />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Signing up...' : 'Sign up'}
        </button>
        {error && <p className="error-text">{error}</p>}
      </form>
      <p className="muted">Already have an account? <button type="button" className="link-button" onClick={() => navigate('/login')}>Sign in</button></p>
    </main>
  );
}

export default Signup;
