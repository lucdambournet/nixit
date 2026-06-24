import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { NixDateCard } from '../components/nix/NixDateCard';
import { Toast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';

type Cohort = {
  id: string;
  member_count: number;
  max_members: number;
  status: string;
  start_date: string;
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
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    const loadCohorts = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }

      const { data, error } = await supabase
        .from('cohorts')
        .select('id, member_count, max_members, status, start_date, nix_date:nix_date_id(month, start_date)')
        .in('status', ['upcoming', 'active'])
        .order('start_date', { ascending: true });

      if (error) { setError(error.message); setLoading(false); return; }
      setCohorts((data ?? []) as unknown as Cohort[]);
      setLoading(false);
    };
    loadCohorts();
  }, [navigate]);

  const handleJoin = async (cohortId: string, monthLabel: string) => {
    setError(null);
    setJoining(cohortId);
    const { error } = await supabase.rpc('join_cohort', { target_cohort_id: cohortId });
    if (error) {
      setError(error.message);
      setJoining(null);
      return;
    }
    setToast({ type: 'success', msg: `You joined the ${monthLabel} cohort! See you on the 1st.` });
    setTimeout(() => navigate('/dashboard'), 1800);
  };

  const parseDateCard = (cohort: Cohort) => {
    const d = new Date(cohort.nix_date?.start_date ?? cohort.start_date);
    return { month: d.getUTCMonth() + 1, year: d.getUTCFullYear() };
  };

  return (
    <div className="nixit-blob-bg" style={{ minHeight: '100vh', position: 'relative' }}>
      {toast && (
        <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 100 }}>
          <Toast type={toast.type} message={toast.msg} visible onClose={() => setToast(null)} />
        </div>
      )}

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 24px 64px' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, var(--lavender-400), var(--purple-500))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: 16, fontFamily: 'var(--font-display)', fontWeight: 800,
            }}>N</div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-xl)', color: 'var(--lavender-600)', letterSpacing: 'var(--tracking-tight)' }}>NixIt</span>
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-3xl)',
            color: 'var(--color-text)', letterSpacing: 'var(--tracking-tight)', marginBottom: 10,
          }}>
            Pick your Nix Date
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)', lineHeight: 'var(--leading-relaxed)' }}>
            Every Nix Date is the first of the month. Join a cohort of up to 25 people and quit together.
          </p>
        </div>

        {/* Info note */}
        <div style={{
          fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)',
          background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(12px)',
          borderRadius: 'var(--radius-md)', padding: '10px 16px',
          border: '1px solid var(--color-border-subtle)',
          marginBottom: 24, lineHeight: 'var(--leading-relaxed)',
        }}>
          You can only be in one cohort at a time.
        </div>

        {error && (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--purple-600)', marginBottom: 16 }}>
            {error}
          </p>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', letterSpacing: 'var(--tracking-widest)', textTransform: 'uppercase' }}>
              Loading cohorts…
            </div>
          </div>
        ) : cohorts.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 24px',
            background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(16px)',
            borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border-subtle)',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--color-text)', marginBottom: 6 }}>
              No cohorts yet
            </p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
              Check back soon — new Nix Dates open every month.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {cohorts.map(cohort => {
              const { month, year } = parseDateCard(cohort);
              const isFull = cohort.member_count >= cohort.max_members;
              const cardStatus = isFull ? 'full' : (cohort.status as 'upcoming' | 'active');
              return (
                <NixDateCard
                  key={cohort.id}
                  month={month}
                  year={year}
                  joined={cohort.member_count}
                  total={cohort.max_members}
                  status={cardStatus}
                  isJoined={false}
                  onJoin={() => {
                    if (!joining) handleJoin(cohort.id, `${new Date(0, month - 1).toLocaleString('default', { month: 'long' })} ${year}`);
                  }}
                />
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut().then(() => navigate('/login'))}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}

export default Enrollment;
