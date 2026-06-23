import { useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

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

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setAvatarFile(file);
    if (file) {
      setAvatarPreview(URL.createObjectURL(file));
    } else {
      setAvatarPreview(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    const user = data.user;
    if (!user) {
      setError('Signup succeeded but no user was returned.');
      setLoading(false);
      return;
    }

    let profileImageUrl: string | null = null;
    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop();
      const filePath = `${user.id}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, { upsert: true });
      if (uploadError) {
        setError(`Profile image upload failed: ${uploadError.message}`);
        setLoading(false);
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      profileImageUrl = publicUrl;
    }

    const { error: profileError } = await supabase.from('users').insert([
      {
        id: user.id,
        email,
        username,
        profile_image_url: profileImageUrl,
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
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <div className="avatar-upload">
          {avatarPreview && (
            <img src={avatarPreview} alt="Avatar preview" className="avatar-preview" />
          )}
          <button type="button" className="avatar-upload-btn" onClick={() => fileInputRef.current?.click()}>
            {avatarPreview ? 'Change photo' : 'Add profile photo (optional)'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            style={{ display: 'none' }}
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Signing up…' : 'Sign up'}
        </button>
        {error && <p className="error-text">{error}</p>}
      </form>
      <p className="muted">Already have an account? <button type="button" className="link-button" onClick={() => navigate('/login')}>Sign in</button></p>
    </main>
  );
}

export default Signup;
