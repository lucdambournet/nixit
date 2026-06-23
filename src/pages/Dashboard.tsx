import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

function formatTimer(startDate: string) {
  const now = new Date();
  const start = new Date(startDate);
  const diff = Math.max(0, now.getTime() - start.getTime());
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  return `${days}d ${hours}h ${minutes}m`;
}

function Dashboard() {
  const navigate = useNavigate();
  const [cohort, setCohort] = useState<{ month: string; start_date: string; member_count: number; status: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState('');

  useEffect(() => {
    const loadCohort = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('active_cohort:active_cohort_id (start_date,member_count,status,nix_dates(month))')
        .single();
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      if (!data || !data.active_cohort) {
        setError('No active cohort found.');
        setLoading(false);
        return;
      }
      const raw = data.active_cohort as unknown as { start_date: string; member_count: number; status: string; nix_dates: { month: string } };
      setCohort({ month: raw.nix_dates.month, start_date: raw.start_date, member_count: raw.member_count, status: raw.status });
      setLoading(false);
    };
    loadCohort();
  }, []);

  useEffect(() => {
    if (!cohort) return;
    setTimer(formatTimer(cohort.start_date));
    const interval = window.setInterval(() => {
      setTimer(formatTimer(cohort.start_date));
    }, 60000);
    return () => window.clearInterval(interval);
  }, [cohort]);

  const content = useMemo(() => {
    if (loading) return <p>Loading dashboard…</p>;
    if (error) return <p className="error-text">{error}</p>;
    if (!cohort) return <p>No active cohort. Please join one.</p>;

    return (
      <div className="card dashboard-card">
        <h2>{cohort.month}</h2>
        <p>Starts {new Date(cohort.start_date).toLocaleDateString()}</p>
        <p>Status: {cohort.status}</p>
        <p>Timer: {timer}</p>
        <p>Members: {cohort.member_count}</p>
        <div className="dashboard-actions">
          <button type="button" onClick={() => navigate('/enrollment')}>
            Change cohort
          </button>
        </div>
      </div>
    );
  }, [loading, error, cohort, timer, navigate]);

  return (
    <main className="page-shell">
      <h1>Your cohort dashboard</h1>
      {content}
    </main>
  );
}

export default Dashboard;
