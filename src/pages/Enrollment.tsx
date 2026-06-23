import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export type NixDate = {
  id: string;
  month: string;
  start_date: string;
  member_count: number;
};

function Enrollment() {
  const navigate = useNavigate();
  const [nixDates, setNixDates] = useState<NixDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadNixDates = async () => {
      const { data, error } = await supabase.from('nix_dates').select('id,month,start_date,member_count').order('start_date', { ascending: true });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      setNixDates(data ?? []);
      setLoading(false);
    };
    loadNixDates();
  }, []);

  const handleJoin = async (cohortId: string) => {
    setError(null);
    const { error } = await supabase.rpc('join_cohort', { cohort_id: cohortId });
    if (error) {
      setError(error.message);
      return;
    }
    navigate('/dashboard');
  };

  return (
    <main className="page-shell">
      <h1>Join a NixIt cohort</h1>
      {loading ? (
        <p>Loading available Nix Dates…</p>
      ) : (
        <div className="card list-card">
          {error && <p className="error-text">{error}</p>}
          {nixDates.length === 0 ? (
            <p>No cohorts available yet.</p>
          ) : (
            nixDates.map((item) => (
              <div key={item.id} className="list-item">
                <div>
                  <strong>{item.month}</strong>
                  <p>Starts {new Date(item.start_date).toLocaleDateString()}</p>
                  <p>{item.member_count} members</p>
                </div>
                <button type="button" onClick={() => handleJoin(item.id)}>
                  Join
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </main>
  );
}

export default Enrollment;
