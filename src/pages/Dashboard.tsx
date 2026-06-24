import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { SideNav } from '../components/navigation/SideNav';
import { CohortTimer } from '../components/nix/CohortTimer';
import { NixDateCard } from '../components/nix/NixDateCard';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Toast } from '../components/ui/Toast';

/* ── Inline SVG Icons ── */
const S = { strokeWidth: '2', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const HomeIcon = ({ n = 18 }) => (
  <svg width={n} height={n} viewBox="0 0 24 24" fill="none" stroke="currentColor" {...S}>
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const ChatIcon = ({ n = 18 }) => (
  <svg width={n} height={n} viewBox="0 0 24 24" fill="none" stroke="currentColor" {...S}>
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);
const CalIcon = ({ n = 18 }) => (
  <svg width={n} height={n} viewBox="0 0 24 24" fill="none" stroke="currentColor" {...S}>
    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const SendIcon = ({ n = 15 }) => (
  <svg width={n} height={n} viewBox="0 0 24 24" fill="none" stroke="currentColor" {...S}>
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" fill="currentColor" stroke="none" />
  </svg>
);

/* ── Types ── */
type Page = 'home' | 'chat' | 'dates';
type CohortData = { id: string; start_date: string; member_count: number; max_members: number; status: string; nix_date: { month: string; start_date: string } };
type UserData = { username: string; profile_image_url: string | null; active_cohort: CohortData | null };
type Member = { user: { username: string; profile_image_url: string | null } };
type UpcomingCohort = { id: string; member_count: number; max_members: number; status: string; start_date: string; nix_date: { month: string; start_date: string } };
type Message = { id: number; from: string; text: string; time: string; isMe: boolean };

/* ── Home Screen ── */
function HomeScreen({ user, cohort, members, onGoToChat }: { user: UserData; cohort: CohortData; members: Member[]; onGoToChat: () => void }) {
  const startDate = cohort.nix_date?.start_date ?? cohort.start_date;
  const days = Math.floor((Date.now() - new Date(startDate).getTime()) / 86400000);
  const today = new Date();
  const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][today.getDay()];
  const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const cohortLabel = cohort.nix_date?.month ?? 'Your Cohort';

  return (
    <div style={{ padding: '32px 40px 64px', maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', letterSpacing: 'var(--tracking-widest)', textTransform: 'uppercase', marginBottom: 6 }}>
          {dayName}, {dateStr}
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-3xl)', color: 'var(--color-text)', margin: 0, letterSpacing: 'var(--tracking-tight)' }}>
          Good morning, {user.username}
        </h1>
      </div>

      {/* Timer hero */}
      <Card variant="default" padding="lg" style={{ textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, var(--neutral-200) 1px, transparent 1px)', backgroundSize: '20px 20px', opacity: 0.5, pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <Badge variant="lavender" dot style={{ marginBottom: 16 }}>{cohortLabel} · Day {days}</Badge>
          <CohortTimer startDate={startDate} label="Nicotine-free for" />
        </div>
      </Card>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {[
          { label: 'Members strong', val: String(cohort.member_count), clr: 'var(--lavender-500)', bg: 'var(--lavender-50)' },
          { label: 'Days clean',     val: String(days),                clr: 'var(--purple-400)',   bg: 'var(--purple-50)' },
          { label: 'Cohort size',    val: `/${cohort.max_members}`,    clr: 'var(--neutral-500)',  bg: 'var(--neutral-100)' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 'var(--radius-xl)', padding: 'var(--space-5)', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-3xl)', color: s.clr, lineHeight: 1, marginBottom: 4 }}>{s.val}</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', letterSpacing: 'var(--tracking-wide)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Cohort members */}
      {members.length > 0 && (
        <Card variant="default" padding="md">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-md)', color: 'var(--color-text)' }}>{cohortLabel}</span>
            <Badge variant="lavender" size="sm">{cohort.member_count} members</Badge>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {members.filter(m => m.user).map((m, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <Avatar src={m.user.profile_image_url} name={m.user.username} size="md" status="online" />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--color-text-muted)' }}>{m.user.username}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Go to chat */}
      <Card variant="default" padding="md">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-md)', color: 'var(--color-text)' }}>Cohort Chat</span>
          <Button variant="ghost" size="sm" onClick={onGoToChat}>View all →</Button>
        </div>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', margin: 0 }}>
          Check in with your cohort — everyone's in this together.
        </p>
      </Card>

      {/* Tap Out */}
      <div style={{ textAlign: 'center' }}>
        <Button variant="danger" size="sm">Tap Out</Button>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', margin: '6px 0 0' }}>
          Tapping out removes you from the cohort. Available after your first full day.
        </p>
      </div>
    </div>
  );
}

/* ── Chat Screen ── */
function ChatScreen({ user, cohort, members }: { user: UserData; cohort: CohortData; members: Member[] }) {
  const cohortLabel = cohort.nix_date?.month ?? 'Your Cohort';
  const [msgs, setMsgs] = useState<Message[]>([
    { id: 1, from: members[1]?.user.username ?? 'Member', text: 'who else is struggling today ngl', time: '8:12 AM', isMe: false },
    { id: 2, from: members[2]?.user.username ?? 'Member', text: 'same but just taking it one hour at a time', time: '8:14 AM', isMe: false },
    { id: 3, from: user.username, text: 'we got this 💪', time: '8:17 AM', isMe: true },
  ]);
  const [input, setInput] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [msgs]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    setMsgs(m => [...m, { id: Date.now(), from: user.username, text, time, isMe: true }]);
    setInput('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <div style={{ padding: '18px 32px', borderBottom: '1px solid var(--color-border-subtle)', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-xl)', color: 'var(--color-text)' }}>{cohortLabel}</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 2 }}>
            {cohort.member_count} members
          </div>
        </div>
        {members.length > 0 && (
          <div style={{ display: 'flex' }}>
            {members.slice(0, 5).map((m, i) => (
              <div key={i} style={{ marginLeft: i ? -8 : 0 }}>
                <Avatar src={m.user.profile_image_url} name={m.user.username} size="sm" />
              </div>
            ))}
            {cohort.member_count > 5 && (
              <div style={{ marginLeft: -8, width: 32, height: 32, borderRadius: '50%', background: 'var(--neutral-100)', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--neutral-500)' }}>
                +{cohort.member_count - 5}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Message list */}
      <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 32px', display: 'flex', flexDirection: 'column', gap: 0 }}>
        {msgs.map((msg, i) => {
          const showName = !msg.isMe && (i === 0 || msgs[i - 1].from !== msg.from);
          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.isMe ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
              {showName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, marginLeft: 2 }}>
                  <Avatar name={msg.from} size="xs" />
                  <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>{msg.from}</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, flexDirection: msg.isMe ? 'row-reverse' : 'row' }}>
                <div style={{
                  maxWidth: 440,
                  background: msg.isMe ? 'var(--lavender-500)' : 'var(--neutral-100)',
                  color: msg.isMe ? 'white' : 'var(--color-text)',
                  borderRadius: msg.isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  padding: '10px 14px',
                  fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-snug)',
                }}>
                  {msg.text}
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-text-muted)', flexShrink: 0 }}>{msg.time}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input bar */}
      <div style={{ padding: '14px 24px', borderTop: '1px solid var(--color-border-subtle)', display: 'flex', gap: 10, alignItems: 'center', background: 'white', flexShrink: 0 }}>
        <Avatar src={user.profile_image_url} name={user.username} size="sm" status="online" />
        <div style={{ flex: 1 }}>
          <Input
            placeholder="Share how you're doing…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            style={{ margin: 0 }}
          />
        </div>
        <Button variant="primary" onClick={send} icon={<SendIcon />}>Send</Button>
      </div>
    </div>
  );
}

/* ── Nix Dates Screen ── */
function DatesScreen({ activeCohortStart }: { activeCohortStart: string }) {
  const [cohorts, setCohorts] = useState<UpcomingCohort[]>([]);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase
      .from('cohorts')
      .select('id, member_count, max_members, status, start_date, nix_date:nix_date_id(month, start_date)')
      .in('status', ['upcoming', 'active'])
      .order('start_date', { ascending: true })
      .then(({ data }) => setCohorts((data ?? []) as unknown as UpcomingCohort[]));
  }, []);

  const parseDateCard = (c: UpcomingCohort) => {
    const d = new Date(c.nix_date?.start_date ?? c.start_date);
    return { month: d.getUTCMonth() + 1, year: d.getUTCFullYear() };
  };

  const activeDate = new Date(activeCohortStart);
  const activeMonth = activeDate.getUTCMonth() + 1;
  const activeYear = activeDate.getUTCFullYear();

  return (
    <div style={{ padding: '32px 40px 64px', maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {toast && (
        <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 100 }}>
          <Toast type={toast.type} message={toast.msg} visible onClose={() => setToast(null)} />
        </div>
      )}

      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-3xl)', color: 'var(--color-text)', margin: '0 0 8px', letterSpacing: 'var(--tracking-tight)' }}>
          Nix Dates
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)', margin: 0 }}>
          Every Nix Date is the first of the month. Join a cohort of up to 25 people and quit together.
        </p>
      </div>

      <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', background: 'var(--neutral-50)', borderRadius: 'var(--radius-md)', padding: '10px 14px', border: '1px solid var(--color-border-subtle)', lineHeight: 'var(--leading-relaxed)' }}>
        You can only be in one cohort at a time. Tap Out of your current cohort to join a future one.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {cohorts.map(c => {
          const { month, year } = parseDateCard(c);
          const isActive = month === activeMonth && year === activeYear;
          const isFull = c.member_count >= c.max_members;
          const cardStatus = isActive ? 'active' : isFull ? 'full' : 'upcoming';
          return (
            <NixDateCard
              key={c.id}
              month={month}
              year={year}
              joined={c.member_count}
              total={c.max_members}
              status={cardStatus}
              isJoined={isActive}
              onJoin={() => {
                setToast({ type: 'default' as unknown as 'error', msg: 'Tap Out of your current cohort first.' });
                setTimeout(() => setToast(null), 4000);
              }}
            />
          );
        })}
        {cohorts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
            No upcoming cohorts yet.
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center' }}>
        <Button variant="ghost" size="sm" onClick={() => navigate('/enrollment')}>Browse all cohorts</Button>
      </div>
    </div>
  );
}

/* ── App Shell ── */
function Dashboard() {
  const navigate = useNavigate();
  const [page, setPage] = useState<Page>('home');
  const [collapsed, setCollapsed] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }

      const { data, error } = await supabase
        .from('users')
        .select('username, profile_image_url, active_cohort:active_cohort_id(id, start_date, member_count, max_members, status, nix_date:nix_date_id(month, start_date))')
        .eq('id', user.id)
        .single();

      if (error) { setError(error.message); setLoading(false); return; }
      if (!data || !data.active_cohort) { navigate('/enrollment'); return; }

      setUserData(data as unknown as UserData);

      const cohort = data.active_cohort as unknown as CohortData;
      const { data: membersData } = await supabase
        .from('cohort_members')
        .select('user:user_id(username, profile_image_url)')
        .eq('cohort_id', cohort.id)
        .limit(20);

      setMembers((membersData ?? []) as unknown as Member[]);
      setLoading(false);
    };
    load();
  }, [navigate]);

  const NAV = [
    { id: 'home',  label: 'Home',      icon: <HomeIcon /> },
    { id: 'chat',  label: 'Chat',      icon: <ChatIcon /> },
    { id: 'dates', label: 'Nix Dates', icon: <CalIcon /> },
  ];

  const Logo = () => collapsed
    ? <img src="/assets/logo-mark.svg" height={28} alt="NixIt" style={{ display: 'block' }} />
    : <img src="/assets/logo.svg" height={24} alt="NixIt" style={{ display: 'block' }} />;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', letterSpacing: 'var(--tracking-widest)', textTransform: 'uppercase' }}>
          Loading…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--purple-600)' }}>{error}</p>
        <Button variant="outline" onClick={() => navigate('/enrollment')}>Go to enrollment</Button>
      </div>
    );
  }

  if (!userData || !userData.active_cohort) return null;

  const cohort = userData.active_cohort;
  const startDate = cohort.nix_date?.start_date ?? cohort.start_date;

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'white', overflow: 'hidden', position: 'relative' }}>
      {/* Blob background */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 600px 500px at 15% 10%, var(--blob-lavender), transparent 70%),
          radial-gradient(ellipse 500px 500px at 90% 80%, var(--blob-purple), transparent 70%),
          radial-gradient(ellipse 500px 380px at 72% 5%, var(--blob-lavender-soft), transparent 70%),
          radial-gradient(ellipse 380px 450px at 5% 90%, var(--blob-purple-deep), transparent 70%)
        `,
      }} />

      {/* Sidebar */}
      <div style={{ position: 'relative', zIndex: 10, flexShrink: 0, boxShadow: 'var(--shadow-sm)' }}>
        <SideNav
          items={NAV}
          activeId={page}
          onNavigate={id => setPage(id as Page)}
          collapsed={collapsed}
          onToggle={() => setCollapsed(c => !c)}
          logo={<Logo />}
          userAvatar={<Avatar src={userData.profile_image_url} name={userData.username} size="sm" status="online" />}
          userName={userData.username}
          onSignOut={() => supabase.auth.signOut().then(() => navigate('/login'))}
          style={{ height: '100vh' }}
        />
      </div>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: page === 'chat' ? 'hidden' : 'auto', position: 'relative', zIndex: 1 }}>
        {page === 'home' && (
          <HomeScreen user={userData} cohort={cohort} members={members} onGoToChat={() => setPage('chat')} />
        )}
        {page === 'chat' && (
          <ChatScreen user={userData} cohort={cohort} members={members} />
        )}
        {page === 'dates' && (
          <DatesScreen activeCohortStart={startDate} />
        )}
      </main>
    </div>
  );
}

export default Dashboard;
