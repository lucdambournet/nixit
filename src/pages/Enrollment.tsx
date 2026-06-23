import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

type Cohort = {
  id: string;
  member_count: number;
  max_members: number;
  status: string;
  nix_date: {
    month: string;
    start_date: string;
  };
};

function Enrollment() {
  const navigate = useNavigate();
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCohorts = async () => {
      const { data, error } = await supabase
        .from('cohorts')
        .select('id, member_count, max_members, status, nix_date:nix_date_id(month, start_date)')
        .eq('status', 'upcoming')
        .order('start_date', { ascending: true });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      setCohorts((data ?? []) as unknown as Cohort[]);
      setLoading(false);
    };
    loadCohorts();
  }, []);

  const handleJoin = async (cohortId: string) => {
    setError(null);
    setJoining(cohortId);
    const { error } = await supabase.rpc('join_cohort', { target_cohort_id: cohortId });
    if (error) {
      setError(error.message);
      setJoining(null);
      return;
    }
    navigate('/dashboard');
  };

  return (
    <main className="page-shell">
      <h1>Join a NixIt cohort</h1>
      {loading ? (
        <p>Loading available cohorts…</p>
      ) : (
        <div className="card list-card">
          {error && <p className="error-text">{error}</p>}
          {cohorts.length === 0 ? (
            <p>No cohorts available yet.</p>
          ) : (
            cohorts.map((cohort) => (
              <div key={cohort.id} className="list-item">
                <div>
                  <strong>{cohort.nix_date.month}</strong>
                  <p>Starts {new Date(cohort.nix_date.start_date).toLocaleDateString()}</p>
                  <p>{cohort.member_count} / {cohort.max_members} members</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleJoin(cohort.id)}
                  disabled={joining === cohort.id || cohort.member_count >= cohort.max_members}
                >
                  {joining === cohort.id ? 'Joining…' : cohort.member_count >= cohort.max_members ? 'Full' : 'Join'}
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
