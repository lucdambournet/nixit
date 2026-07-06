import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function ServiceLogin() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleServiceLogin = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);

    const response = await fetch("/service-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "lucdambournet@gmail.com",
        password: "12qwaszx",
        username: "lucdambournet",
      }),
    });

    const body = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(body.error || "Service login failed");
      return;
    }

    if (body.success) {
      setMessage(
        "Service login succeeded. You can now sign in using the normal login screen.",
      );
      return;
    }

    setError("Unexpected response from service login.");
  };

  return (
    <main className="page-shell">
      <h1>Temporary Service Login</h1>
      <div className="card form-card">
        <p>This temporary route uses the Supabase service role to ensure the test account exists.</p>
        <button type="button" onClick={handleServiceLogin} disabled={loading}>
          {loading ? 'Processing...' : 'Create / Sign in test account'}
        </button>
        {message && <p className="muted">{message}</p>}
        {error && <p className="error-text">{error}</p>}
        <p className="muted">Then go to <button type="button" className="link-button" onClick={() => navigate('/login')}>Login</button>.</p>
      </div>
    </main>
  );
}

export default ServiceLogin;
