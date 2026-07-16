import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { SideNav } from '../components/navigation/SideNav';
import { CohortTimer } from '../components/nix/CohortTimer';
import { NixDateCard } from '../components/nix/NixDateCard';
import { DailyCheckInCard } from '../components/nix/DailyCheckInCard';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Toast } from '../components/ui/Toast';
import { Logo } from '../components/ui/Logo';
import { StatusPopover } from '../components/ui/StatusPopover';
import { useIsActive } from '../hooks/useIsActive';
import { useIsMobile } from '../hooks/useIsMobile';
import { BottomNav } from '../components/navigation/BottomNav';
import { resolveStatus, sortByActivity, type ResolvedStatus } from '../lib/presence';
import { ProfileScreen } from '../../components/profile/ProfileScreen';
import { CraveCrushers } from './crave/CraveCrushers';
import { mapMessageRow, shouldShowAuthorName, type ChatMessageRow, type DisplayMessage } from '../lib/chatMessages';
import { hasCheckedInToday, todayISODate } from '../lib/dailyCheckIn';
import { dispatchPushNotification } from '../lib/pushDispatch';

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
const ChevronLeftIcon = ({ n = 18 }) => (
  <svg width={n} height={n} viewBox="0 0 24 24" fill="none" stroke="currentColor" {...S}>
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const ChevronRightIcon = ({ n = 18 }) => (
  <svg width={n} height={n} viewBox="0 0 24 24" fill="none" stroke="currentColor" {...S}>
    <polyline points="9 18 15 12 9 6" />
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
const UserIcon = ({ n = 18 }) => (
  <svg width={n} height={n} viewBox="0 0 24 24" fill="none" stroke="currentColor" {...S}>
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const CraveIcon = ({ n = 18 }) => (
  <svg width={n} height={n} viewBox="0 0 24 24" fill="none" stroke="currentColor" {...S}>
    <path d="M12 21c-4.5 0-7-2.5-7-6 0-3 2-4.5 2-7.5C7 5 9 3 9 3s1 3 3 3 3-3 3-3 2 2 2 4.5c0 3 2 4.5 2 7.5 0 3.5-2.5 6-7 6z" />
  </svg>
);

/* ── Types ── */
type Page = 'home' | 'chat' | 'dates' | 'profile' | 'crave';
type CohortData = { id: string; start_date: string; member_count: number; max_members: number; status: string; nix_date: { month: string; start_date: string } };
type UserData = { id: string; username: string; email: string; created_at: string; profile_image_url: string | null; dnd: boolean; active_cohort: CohortData | null; current_streak: number; longest_streak: number; last_check_in_date: string | null };
type Member = { user: { id: string; username: string; profile_image_url: string | null; dnd: boolean } };
type UpcomingCohort = { id: string; member_count: number; max_members: number; status: string; start_date: string; nix_date: { month: string; start_date: string } };

const CHAT_SCHEMA_CACHE_ERROR = "Could not find the table 'public.chat_messages' in the schema cache";

function formatChatError(message: string) {
  if (message.includes(CHAT_SCHEMA_CACHE_ERROR)) {
    return 'Chat is not enabled in this Supabase project yet. Run supabase/schema.sql and supabase/rls_policies.sql, then refresh.';
  }

  return message;
}

/* ── Home Screen ── */
function HomeScreen({ user, cohort, members, presence, onGoToChat, onGoToCrave, onTapOut, onSendHelpAlert, onCheckInSuccess }: { user: UserData; cohort: CohortData; members: Member[]; presence: Map<string, boolean>; onGoToChat: () => void; onGoToCrave: () => void; onTapOut: () => void; onSendHelpAlert: () => Promise<boolean>; onCheckInSuccess: (patch: Pick<UserData, 'current_streak' | 'longest_streak' | 'last_check_in_date'>) => void }) {
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInToast, setCheckInToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [sendingHelpAlert, setSendingHelpAlert] = useState(false);
  const [helpAlertToast, setHelpAlertToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const handleSendHelpAlert = async () => {
    setSendingHelpAlert(true);
    const ok = await onSendHelpAlert();
    setSendingHelpAlert(false);
    if (ok) setHelpAlertToast({ type: 'success', msg: 'Help alert sent to your cohort.' });
  };

  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    const { data, error } = await supabase.rpc('record_check_in').single();
    setIsCheckingIn(false);

    if (error) {
      setCheckInToast({ type: 'error', msg: error.message === 'Already checked in today' ? "You're already checked in for today." : `Check-in failed: ${error.message}` });
      return;
    }

    const result = data as { current_streak: number; longest_streak: number; check_in_date: string };
    onCheckInSuccess({ current_streak: result.current_streak, longest_streak: result.longest_streak, last_check_in_date: result.check_in_date });
    setCheckInToast({ type: 'success', msg: `Checked in! Streak: ${result.current_streak} day${result.current_streak === 1 ? '' : 's'}.` });
  };

  const startDate = cohort.nix_date?.start_date ?? cohort.start_date;
  const now = Date.now();
  const start = new Date(startDate).getTime();
  const days = Math.floor((now - start) / 86400000);
  const hasStarted = now >= start;
  // Can tap out: before cohort starts (change of mind) OR after first full day
  const canTapOut = !hasStarted || days >= 1;
  const tapOutHint = hasStarted && days < 1
    ? 'Available after your first full day.'
    : 'Tapping out removes you from the cohort.';
  const today = new Date();
  const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][today.getDay()];
  const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const cohortLabel = cohort.nix_date?.month ?? 'Your Cohort';

  return (
    <div style={{ padding: '32px clamp(16px, 6vw, 40px) 64px', maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
      {checkInToast && (
        <div style={{ position: 'fixed', bottom: 88, left: '50%', transform: 'translateX(-50%)', zIndex: 100 }}>
          <Toast type={checkInToast.type} message={checkInToast.msg} visible onClose={() => setCheckInToast(null)} />
        </div>
      )}
      {helpAlertToast && (
        <div style={{ position: 'fixed', bottom: 88, left: '50%', transform: 'translateX(-50%)', zIndex: 100 }}>
          <Toast type={helpAlertToast.type} message={helpAlertToast.msg} visible onClose={() => setHelpAlertToast(null)} />
        </div>
      )}
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

      {/* Daily Check-In */}
      <DailyCheckInCard
        currentStreak={user.current_streak}
        longestStreak={user.longest_streak}
        alreadyCheckedInToday={hasCheckedInToday({ lastCheckInDate: user.last_check_in_date }, todayISODate())}
        isCheckingIn={isCheckingIn}
        onCheckIn={handleCheckIn}
      />

      {/* Crave SOS */}
      <Card variant="purple" padding="md" style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', margin: '0 0 10px' }}>
          Craving hitting hard right now?
        </p>
        <Button variant="purple" size="md" onClick={onGoToCrave}>Feeling a craving?</Button>
      </Card>

      {/* Help Alert */}
      <Card variant="default" padding="md" style={{ textAlign: 'center', borderColor: 'rgba(220, 53, 69, 0.3)' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', margin: '0 0 10px' }}>
          Going through something tougher? Let your cohort know.
        </p>
        <Button variant="danger" size="md" onClick={handleSendHelpAlert} disabled={sendingHelpAlert}>
          {sendingHelpAlert ? 'Sending…' : '🆘 Send Help Alert'}
        </Button>
      </Card>

      {/* Cohort members */}
      {members.length > 0 && (
        <Card variant="default" padding="md">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-md)', color: 'var(--color-text)' }}>{cohortLabel}</span>
            <Badge variant="lavender" size="sm">{cohort.member_count} members</Badge>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {sortByActivity(
              members.filter(m => m.user).map(m => ({ m, status: resolveStatus(m.user.id, m.user.dnd, presence) })),
              ({ status }) => status,
            ).map(({ m, status }, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <Avatar
                  src={m.user.profile_image_url}
                  name={m.user.username}
                  size="md"
                  status={status}
                  style={status === 'offline' ? { filter: 'grayscale(1)', opacity: 0.6 } : undefined}
                />
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
        <Button variant="danger" size="sm" disabled={!canTapOut} onClick={onTapOut}>
          {hasStarted ? 'Tap Out' : 'Change / Leave Cohort'}
        </Button>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', margin: '6px 0 0' }}>
          {tapOutHint}
        </p>
      </div>
    </div>
  );
}

/* ── Chat Screen ── */
function ChatScreen({ user, cohort, members, presence, selfStatus, onToggleDnd }: { user: UserData; cohort: CohortData; members: Member[]; presence: Map<string, boolean>; selfStatus: ResolvedStatus; onToggleDnd: (next: boolean) => Promise<boolean> }) {
  const cohortLabel = cohort.nix_date?.month ?? 'Your Cohort';
  const [msgs, setMsgs] = useState<DisplayMessage[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [toast, setToast] = useState<{ msg: string } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const membersRef = useRef(members);

  useEffect(() => {
    membersRef.current = members;
  }, [members]);

  const resolveAuthor = (authorId: string) =>
    membersRef.current.find(member => member.user.id === authorId)?.user;

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [msgs]);

  useEffect(() => {
    let cancelled = false;

    setLoadError(null);

    supabase
      .from('chat_messages')
      .select('id, cohort_id, author_id, text, type, request_id, created_at')
      .eq('cohort_id', cohort.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (cancelled) {
          return;
        }

        if (error) {
          setLoadError(formatChatError(error.message));
          return;
        }

        const rows = ((data ?? []) as ChatMessageRow[]).slice().reverse();
        setMsgs(rows.map(row => mapMessageRow(row, resolveAuthor(row.author_id), user.id)));
      });

    return () => {
      cancelled = true;
    };
  }, [cohort.id, user.id]);

  useEffect(() => {
    const channel = supabase
      .channel(`cohort-chat-${cohort.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `cohort_id=eq.${cohort.id}` },
        payload => {
          const row = payload.new as ChatMessageRow;

          setMsgs(prev => {
            if (prev.some(message => message.id === row.id)) {
              return prev;
            }

            return [...prev, mapMessageRow(row, resolveAuthor(row.author_id), user.id)];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cohort.id, user.id]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;

    setInput('');

    const { error } = await supabase
      .from('chat_messages')
      .insert({ cohort_id: cohort.id, author_id: user.id, text, type: 'normal' });

    if (error) {
      setInput(text);
      setToast({ msg: `Message failed to send: ${formatChatError(error.message)}` });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {toast && (
        <div style={{ position: 'fixed', bottom: 88, left: '50%', transform: 'translateX(-50%)', zIndex: 100 }}>
          <Toast type="error" message={toast.msg} visible onClose={() => setToast(null)} />
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '18px clamp(16px, 5vw, 32px)', borderBottom: '1px solid var(--color-border-subtle)', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                <Avatar src={m.user.profile_image_url} name={m.user.username} size="sm" status={resolveStatus(m.user.id, m.user.dnd, presence)} />
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
      <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '20px clamp(16px, 5vw, 32px)', display: 'flex', flexDirection: 'column', gap: 0 }}>
        {loadError && (
          <div style={{ textAlign: 'center', padding: 24, fontFamily: 'var(--font-body)', color: 'var(--color-text-muted)' }}>
            Couldn't load messages: {loadError}
          </div>
        )}
        {msgs.map((msg, i) => {
          const showName = shouldShowAuthorName(msgs, i);

          if (msg.type === 'help-alert') {
            return (
              <div key={msg.id} role="status" style={{ display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'rgba(220, 53, 69, 0.1)', border: '1px solid rgba(220, 53, 69, 0.35)',
                  color: '#a52834', borderRadius: 'var(--radius-full)', padding: '8px 16px',
                  fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 'var(--text-sm)', textAlign: 'center',
                }}>
                  🆘 {msg.text}
                </span>
              </div>
            );
          }

          if (msg.type === 'tap-out-request' && msg.requestId) {
            return (
              <TapOutRequestBanner
                key={msg.id}
                requestId={msg.requestId}
                requesterId={msg.authorId}
                requesterName={msg.from}
                currentUserId={user.id}
                text={msg.text}
              />
            );
          }

          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.isMe ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
              {showName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, marginLeft: 2 }}>
                  <Avatar name={msg.from} size="xs" status={msg.isMe ? selfStatus : resolveStatus(msg.authorId, resolveAuthor(msg.authorId)?.dnd ?? false, presence)} />
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
      <div style={{ padding: '14px clamp(14px, 4vw, 24px)', borderTop: '1px solid var(--color-border-subtle)', display: 'flex', gap: 10, alignItems: 'center', background: 'white', flexShrink: 0 }}>
        <StatusPopover src={user.profile_image_url} name={user.username} size="sm" status={selfStatus} dnd={user.dnd} onToggleDnd={onToggleDnd} />
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

/* ── Tap-out request banner (rendered in chat, #50) ── */
type TapOutStatus = 'pending' | 'approved' | 'undone';

function TapOutRequestBanner({ requestId, requesterId, requesterName, currentUserId, text }: {
  requestId: string; requesterId: string; requesterName: string; currentUserId: string; text: string;
}) {
  const [status, setStatus] = useState<TapOutStatus>('pending');
  const [approvalsCount, setApprovalsCount] = useState(0);
  const [approvalsNeeded, setApprovalsNeeded] = useState(3);
  const [hasApproved, setHasApproved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRequester = requesterId === currentUserId;

  useEffect(() => {
    let cancelled = false;

    const refetch = async () => {
      const [{ data: reqData }, { data: approvals }] = await Promise.all([
        supabase.from('tap_out_requests').select('status, approvals_needed').eq('id', requestId).single(),
        supabase.from('tap_out_approvals').select('approver_id').eq('request_id', requestId),
      ]);
      if (cancelled) return;
      if (reqData) {
        setStatus(reqData.status as TapOutStatus);
        setApprovalsNeeded(reqData.approvals_needed);
      }
      if (approvals) {
        setApprovalsCount(approvals.length);
        setHasApproved(approvals.some(a => a.approver_id === currentUserId));
      }
    };

    void refetch();

    // Realtime is the fast path, but postgres_changes delivery isn't fully
    // reliable across multiple concurrent inserts in practice — a short
    // poll while pending guarantees this converges even if an event drops.
    const channel = supabase
      .channel(`tap-out-${requestId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tap_out_requests', filter: `id=eq.${requestId}` },
        () => void refetch()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tap_out_approvals', filter: `request_id=eq.${requestId}` },
        () => void refetch()
      )
      .subscribe();

    const interval = setInterval(() => void refetch(), 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, currentUserId]);

  const handleApprove = async () => {
    setBusy(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc('approve_tap_out_request', { target_request_id: requestId });
    setBusy(false);
    if (rpcError) { setError(rpcError.message); return; }
    setHasApproved(true);
  };

  const handleUndo = async () => {
    setBusy(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc('undo_tap_out_request', { target_request_id: requestId });
    setBusy(false);
    if (rpcError) setError(rpcError.message);
  };

  return (
    <div role="status" style={{ display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        background: 'rgba(111, 66, 193, 0.08)', border: '1px solid rgba(111, 66, 193, 0.3)',
        borderRadius: 'var(--radius-lg)', padding: '12px 18px', maxWidth: 420, textAlign: 'center',
      }}>
        <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
          🚪 {text}
        </span>

        {status === 'pending' && (
          <>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              {approvalsCount}/{approvalsNeeded} approvals
            </span>
            {isRequester ? (
              <Button variant="outline" size="sm" onClick={handleUndo} disabled={busy}>
                {busy ? 'Undoing…' : 'Undo request'}
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleApprove} disabled={busy || hasApproved}>
                {hasApproved ? 'Approved ✓' : busy ? 'Approving…' : 'Approve'}
              </Button>
            )}
          </>
        )}
        {status === 'approved' && (
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            Approved — {requesterName} has left the cohort.
          </span>
        )}
        {status === 'undone' && (
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            Request withdrawn.
          </span>
        )}
        {error && (
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: '#c0392b' }}>{error}</span>
        )}
      </div>
    </div>
  );
}

/* ── Nix Dates Screen ── */
function DatesScreen({ activeCohortStart }: { activeCohortStart: string }) {
  const [cohorts, setCohorts] = useState<UpcomingCohort[]>([]);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const navigate = useNavigate();
  const trackRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const scrollByCard = (dir: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>('[data-carousel-card]');
    const step = card ? card.offsetWidth + 16 : track.clientWidth * 0.8;
    track.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

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
    <div style={{ padding: '32px clamp(16px, 6vw, 40px) 64px', maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
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

      {cohorts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
          No upcoming cohorts yet.
        </div>
      ) : (
        <div style={{ position: 'relative', margin: isMobile ? '0' : '0 44px' }}>
          <div
            ref={trackRef}
            className="nixit-carousel"
            style={{ display: 'flex', gap: 16, overflowX: 'auto', scrollSnapType: 'x mandatory', padding: '4px 4px 12px', margin: '-4px -4px 0' }}
          >
            {cohorts.map(c => {
              const { month, year } = parseDateCard(c);
              const isActive = month === activeMonth && year === activeYear;
              const isFull = c.member_count >= c.max_members;
              const cardStatus = isActive ? 'active' : isFull ? 'full' : 'upcoming';
              return (
                <div key={c.id} data-carousel-card style={{ flex: '0 0 300px', scrollSnapAlign: 'start' }}>
                  <NixDateCard
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
                </div>
              );
            })}
          </div>

          {!isMobile && cohorts.length > 1 && (
            <>
              <button
                aria-label="Scroll to previous cohort"
                onClick={() => scrollByCard(-1)}
                style={{
                  position: 'absolute', top: '50%', left: -40, transform: 'translateY(-50%)',
                  width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--color-border-subtle)',
                  background: 'var(--surface-card)', color: 'var(--color-text-secondary)', boxShadow: 'var(--shadow-sm)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}
              >
                <ChevronLeftIcon n={16} />
              </button>
              <button
                aria-label="Scroll to next cohort"
                onClick={() => scrollByCard(1)}
                style={{
                  position: 'absolute', top: '50%', right: -40, transform: 'translateY(-50%)',
                  width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--color-border-subtle)',
                  background: 'var(--surface-card)', color: 'var(--color-text-secondary)', boxShadow: 'var(--shadow-sm)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}
              >
                <ChevronRightIcon n={16} />
              </button>
            </>
          )}
        </div>
      )}

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
        .select('username, email, created_at, profile_image_url, dnd, current_streak, longest_streak, last_check_in_date, active_cohort:active_cohort_id(id, start_date, member_count, max_members, status, nix_date:nix_date_id(month, start_date))')
        .eq('id', user.id)
        .single();

      if (error) { setError(error.message); setLoading(false); return; }
      if (!data || !data.active_cohort) { navigate('/enrollment'); return; }

      setUserData({ ...(data as object), id: user.id } as unknown as UserData);

      const cohort = data.active_cohort as unknown as CohortData;
      const { data: membersData } = await supabase
        .from('cohort_members')
        .select('user:user_id(id, username, profile_image_url, dnd)')
        .eq('cohort_id', cohort.id)
        .limit(20);

      setMembers((membersData ?? []) as unknown as Member[]);
      setLoading(false);
    };
    load();
  }, [navigate]);

  const isActive = useIsActive();
  const isMobile = useIsMobile();
  const [presence, setPresence] = useState<Map<string, boolean>>(new Map());
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const cohortId = userData?.active_cohort?.id;

  useEffect(() => {
    if (!cohortId || !userData) return;

    const channel = supabase.channel(`presence:cohort-${cohortId}`, {
      config: { presence: { key: userData.id } },
    });
    presenceChannelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ active: boolean }>();
        setPresence(new Map(Object.entries(state).map(([id, entries]) => [id, entries[0]?.active ?? false])));
      })
      .subscribe(subscribeStatus => {
        if (subscribeStatus === 'SUBSCRIBED') channel.track({ active: isActive });
      });

    return () => {
      supabase.removeChannel(channel);
      presenceChannelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cohortId, userData?.id]);

  useEffect(() => {
    presenceChannelRef.current?.track({ active: isActive });
  }, [isActive]);

  useEffect(() => {
    if (!cohortId) return;

    const channel = supabase
      .channel(`users-dnd-cohort-${cohortId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users', filter: `active_cohort_id=eq.${cohortId}` },
        payload => {
          const { id, dnd } = payload.new as { id: string; dnd: boolean };
          setMembers(current => current.map(m => (m.user?.id === id ? { ...m, user: { ...m.user, dnd } } : m)));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cohortId]);

  // If my own tap-out request gets approved while I'm elsewhere in the app
  // (not looking at the chat banner), still move me off to enrollment (#50).
  useEffect(() => {
    if (!userData?.id) return;
    const userId = userData.id;

    const checkForApprovedRequest = async () => {
      const { data } = await supabase
        .from('tap_out_requests')
        .select('status')
        .eq('requester_id', userId)
        .eq('status', 'approved')
        .order('resolved_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) navigate('/enrollment');
    };

    // Realtime is the fast path; a short poll is the reliable fallback (see
    // the same note on TapOutRequestBanner's effect).
    const channel = supabase
      .channel(`tap-out-requester-${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tap_out_requests', filter: `requester_id=eq.${userId}` },
        () => void checkForApprovedRequest()
      )
      .subscribe();

    const interval = setInterval(() => void checkForApprovedRequest(), 4000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [userData?.id, navigate]);

  // In-app notification badge on the Chat nav item (#49): counts help-alert
  // / tap-out-request messages posted since this user last opened chat.
  const [unseenAlertCount, setUnseenAlertCount] = useState(0);

  useEffect(() => {
    if (!cohortId || !userData?.id) return;
    const lastSeenKey = `nixit:lastSeenAlertAt:${userData.id}`;
    if (!localStorage.getItem(lastSeenKey)) {
      localStorage.setItem(lastSeenKey, new Date().toISOString());
    }

    // Reads lastSeenAt fresh each call (not captured) so it reflects the
    // "entered chat" reset from the effect below even mid-poll.
    const refresh = () =>
      supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('cohort_id', cohortId)
        .in('type', ['help-alert', 'tap-out-request'])
        .gt('created_at', localStorage.getItem(lastSeenKey)!)
        .then(({ count }) => setUnseenAlertCount(count ?? 0));

    void refresh();

    // Realtime is the fast path; a short poll is the reliable fallback (see
    // the same note on TapOutRequestBanner's effect).
    const channel = supabase
      .channel(`unseen-alerts-${cohortId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `cohort_id=eq.${cohortId}` },
        () => void refresh()
      )
      .subscribe();

    const interval = setInterval(() => void refresh(), 3000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [cohortId, userData?.id]);

  useEffect(() => {
    if (page !== 'chat' || !userData?.id) return;
    localStorage.setItem(`nixit:lastSeenAlertAt:${userData.id}`, new Date().toISOString());
    setUnseenAlertCount(0);
  }, [page, userData?.id]);

  const toggleDnd = async (next: boolean): Promise<boolean> => {
    if (!userData) return false;
    const prev = userData.dnd;
    setUserData(u => (u ? { ...u, dnd: next } : u));

    const { error: dndError } = await supabase.from('users').update({ dnd: next }).eq('id', userData.id);
    if (dndError) {
      setUserData(u => (u ? { ...u, dnd: prev } : u));
      return false;
    }
    return true;
  };

  const NAV = [
    { id: 'home',    label: 'Home',      icon: <HomeIcon /> },
    { id: 'chat',    label: 'Chat',      icon: <ChatIcon />, badge: unseenAlertCount > 0 ? unseenAlertCount : undefined },
    { id: 'crave',   label: 'Crave',     icon: <CraveIcon /> },
    { id: 'dates',   label: 'Nix Dates', icon: <CalIcon /> },
    { id: 'profile', label: 'Profile',   icon: <UserIcon /> },
  ];

  const SidebarLogo = () => collapsed
    ? <Logo variant="mark" height={26} />
    : <Logo height={22} />;

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
  const selfStatus: ResolvedStatus = resolveStatus(userData.id, userData.dnd, presence);

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

      {/* Sidebar (desktop) / bottom tab bar (mobile, #69) */}
      {isMobile ? (
        <BottomNav items={NAV} activeId={page} onNavigate={id => setPage(id as Page)} />
      ) : (
        <div style={{ position: 'relative', zIndex: 10, flexShrink: 0, boxShadow: 'var(--shadow-sm)' }}>
          <SideNav
            items={NAV}
            activeId={page}
            onNavigate={id => setPage(id as Page)}
            collapsed={collapsed}
            onToggle={() => setCollapsed(c => !c)}
            logo={<SidebarLogo />}
            userAvatar={<StatusPopover src={userData.profile_image_url} name={userData.username} size="sm" status={selfStatus} dnd={userData.dnd} onToggleDnd={toggleDnd} />}
            userName={userData.username}
            onUserClick={() => setPage('profile')}
            userActive={page === 'profile'}
            onSignOut={() => supabase.auth.signOut().then(() => navigate('/login'))}
            style={{ height: '100vh' }}
          />
        </div>
      )}

      {/* Main content. On mobile, reserve space for the fixed BottomNav so it
          never overlaps page content or ChatScreen's own fixed input bar. */}
      <main style={{
        flex: 1, overflowY: page === 'chat' ? 'hidden' : 'auto', position: 'relative', zIndex: 1,
        height: isMobile ? 'calc(100vh - 56px - env(safe-area-inset-bottom, 0px))' : '100vh',
      }}>
        {page === 'home' && (
          <HomeScreen
            user={userData}
            cohort={cohort}
            members={members}
            presence={presence}
            onGoToChat={() => setPage('chat')}
            onGoToCrave={() => setPage('crave')}
            onTapOut={async () => {
              const cohortHasStarted = Date.now() >= new Date(startDate).getTime();

              if (!cohortHasStarted) {
                // Hasn't started yet: a simple change-of-mind, no cohort approval needed.
                if (!confirm('Are you sure you want to leave this cohort?')) return;
                const { error } = await supabase.rpc('leave_cohort');
                if (error) { alert(error.message); return; }
                navigate('/enrollment');
                return;
              }

              // Already underway: tapping out needs cohort approval (#50).
              if (!confirm("Request to tap out? Your cohort will need to approve it before you're removed. You can undo the request any time before then.")) return;
              const { error } = await supabase.rpc('request_tap_out');
              if (error) { alert(error.message); return; }
              setPage('chat');

              const recipientIds = members
                .filter(m => m.user && m.user.id !== userData.id)
                .map(m => m.user.id);
              void dispatchPushNotification({
                userIds: recipientIds,
                title: 'Tap-Out Request',
                body: `${userData.username} requested to tap out and needs your approval.`,
                category: 'tap_out_updates',
              });
            }}
            onSendHelpAlert={async () => {
              if (!confirm('Send a help alert to your cohort? Everyone will see it in chat and be notified.')) return false;
              const { error } = await supabase.from('chat_messages').insert({
                cohort_id: cohort.id,
                author_id: userData.id,
                text: `${userData.username} sent a help alert.`,
                type: 'help-alert',
              });
              if (error) { alert(`Could not send help alert: ${error.message}`); return false; }

              const recipientIds = members
                .filter(m => m.user && m.user.id !== userData.id)
                .map(m => m.user.id);
              void dispatchPushNotification({
                userIds: recipientIds,
                title: 'Help Alert',
                body: `${userData.username} could use support in your cohort.`,
                category: 'help_alerts',
              });
              return true;
            }}
            onCheckInSuccess={patch => setUserData(u => (u ? { ...u, ...patch } : u))}
          />
        )}
        {page === 'chat' && (
          <ChatScreen user={userData} cohort={cohort} members={members} presence={presence} selfStatus={selfStatus} onToggleDnd={toggleDnd} />
        )}
        {page === 'dates' && (
          <DatesScreen activeCohortStart={startDate} />
        )}
        {page === 'profile' && (
          <ProfileScreen
            user={{
              id: userData.id,
              username: userData.username,
              email: userData.email,
              profile_image_url: userData.profile_image_url,
              created_at: userData.created_at,
              cohortLabel: cohort.nix_date?.month ?? null,
              dnd: userData.dnd,
            }}
            onUserUpdate={(patch: Partial<Pick<UserData, 'username' | 'profile_image_url'>>) => setUserData(u => (u ? { ...u, ...patch } : u))}
            onSignOut={() => supabase.auth.signOut().then(() => navigate('/login'))}
            onToggleDnd={toggleDnd}
          />
        )}
        {page === 'crave' && (
          <CraveCrushers userId={userData.id} />
        )}
      </main>
    </div>
  );
}

export default Dashboard;
