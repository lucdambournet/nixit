# Cohort Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mock in-memory messages in `ChatScreen` (`src/pages/Dashboard.tsx`) with a real, RLS-scoped, realtime cohort chat backed by a new `chat_messages` Supabase table.

**Architecture:** A new `chat_messages` table (RLS-scoped to cohort membership via the existing `get_my_cohort_ids()` helper) stores messages. `ChatScreen` fetches the last 50 on mount and subscribes to a Supabase Realtime channel for live inserts; sending a message is a plain insert, with the UI updating from the realtime echo rather than local optimistic state. A small pure helper module (`src/lib/chatMessages.ts`) handles row→display mapping and name-grouping logic so it's unit-testable without a live Supabase connection.

**Tech Stack:** React 18 + TypeScript + Vite, Supabase (Postgres + Auth + Realtime), Vitest (unit), Playwright (e2e).

## Global Constraints

- Plain text messages only this pass — `type` column supports `'normal' | 'help-alert'` for schema-compat with future work, but only `'normal'` is ever written here.
- No message edit/delete, no pagination beyond the initial 50, no push notifications — all deferred per the spec.
- RLS must scope both read and write to `cohort_id in (select get_my_cohort_ids())` — reuse the existing SECURITY DEFINER helper, do not re-derive cohort membership inline (that's what caused the prior recursive-RLS bug on `users`).
- Follow existing file conventions: single quotes, semicolons, inline `style={{}}` objects matching `Dashboard.tsx`'s existing style (no CSS modules/styled-components introduced).
- Spec: `docs/superpowers/specs/2026-07-03-cohort-chat-design.md`.

---

### Task 1: Test tooling + local environment setup

**Files:**
- Modify: `package.json`
- Create: `playwright.config.ts`
- No test file yet — this task only makes `npm test` / `npm run test:e2e` runnable.

**Interfaces:**
- Produces: `npm test` (vitest, `tests/unit/**`), `npm run test:e2e` (playwright, `tests/e2e/**`) — later tasks' tests rely on these scripts existing.

This worktree's `package.json` predates the project's test tooling (it's present as uncommitted work in the main checkout but not yet committed to any branch this worktree descends from), so it must be added here directly. `.env` (Supabase credentials) is git-ignored and per-checkout, so it also needs to be copied in — this is a local secrets file, not a code change, so there is no commit for this step.

- [ ] **Step 1: Copy the local Supabase credentials file into the worktree**

```bash
cp /home/rapha/projects/nixit/.env /home/rapha/projects/nixit/.claude/worktrees/cohort-chat/.env
```

Expected: `.env` now exists at the worktree root (confirm with `test -f .env && echo present`). It stays untracked (already covered by `.gitignore`).

- [ ] **Step 2: Add test scripts and devDependencies to `package.json`**

Modify the `"scripts"` block:

```json
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "seed": "node --experimental-fetch ./scripts/seed.mjs",
    "format": "prettier --write .",
    "lint": "eslint . --ext .ts,.tsx,.js,.jsx",
    "test": "vitest run tests/unit",
    "test:e2e": "playwright test"
  },
```

Modify the `"devDependencies"` block (add the two new entries, keep the rest as-is):

```json
  "devDependencies": {
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "@playwright/test": "^1.61.1",
    "eslint": "^8.0.0",
    "eslint-plugin-react": "^7.0.0",
    "eslint-plugin-react-hooks": "^4.0.0",
    "dotenv": "^16.0.0",
    "prettier": "^3.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    "vitest": "^4.1.9"
  }
```

- [ ] **Step 3: Create `playwright.config.ts`**

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:5174',
    headless: true,
  },
  webServer: {
    command: 'npm run dev -- --port 5174',
    port: 5174,
    reuseExistingServer: true,
  },
});
```

- [ ] **Step 4: Install dependencies and verify the scripts resolve**

Run: `npm install`
Expected: installs `@playwright/test` and `vitest` without errors.

Run: `npx playwright install chromium` (only if this is the first Playwright run in this environment)
Expected: Chromium browser installed for the e2e task later. (Skip `--with-deps` — it needs root; if the sandbox is missing system libs for Chromium, surface that when Task 5 actually runs the browser, not here.)

Run: `npx vitest --version && npx playwright --version`
Expected: both print a version number — confirms the binaries installed correctly. (Don't run `npm test` yet — with no files under `tests/unit/` it exits code 1 with "No test files found", which would look like a false failure.)

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json playwright.config.ts
git commit -m "chore: add vitest and playwright test tooling"
```

---

### Task 2: Cohort chat database migration

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `supabase/rls_policies.sql`

**Interfaces:**
- Produces: `chat_messages` table with columns `id, cohort_id, author_id, text, type, created_at`; RLS policies scoped via `get_my_cohort_ids()`; the table added to the `supabase_realtime` publication so later tasks can subscribe to `postgres_changes`.
- Consumes: `get_my_cohort_ids()` (already defined in `supabase/rls_policies.sql`), `cohorts(id)`, `users(id)`.

This project applies schema/RLS changes by pasting the SQL files into the Supabase Dashboard SQL editor (see the existing header comment in `supabase/rls_policies.sql`) rather than via migrations — follow that same convention.

- [ ] **Step 1: Append the `chat_messages` table to `supabase/schema.sql`**

Add to the end of the file:

```sql

-- Chat messages: one row per cohort chat message
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references cohorts(id) on delete cascade,
  author_id uuid not null references users(id) on delete cascade,
  text text not null check (char_length(trim(text)) > 0),
  type text not null default 'normal' check (type in ('normal', 'help-alert')),
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_messages_cohort_created
  on chat_messages(cohort_id, created_at);
```

- [ ] **Step 2: Append RLS policies and realtime publication to `supabase/rls_policies.sql`**

Add to the end of the file:

```sql

-- ── chat_messages: cohort members can read/send within their cohort ──
alter table public.chat_messages enable row level security;

drop policy if exists "cohort members can read their cohort's messages" on public.chat_messages;
create policy "cohort members can read their cohort's messages"
  on public.chat_messages for select
  to authenticated
  using (cohort_id in (select get_my_cohort_ids()));

drop policy if exists "cohort members can send messages as themselves" on public.chat_messages;
create policy "cohort members can send messages as themselves"
  on public.chat_messages for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and cohort_id in (select get_my_cohort_ids())
  );

-- Enable Realtime broadcast for chat_messages inserts
alter publication supabase_realtime add table public.chat_messages;
```

- [ ] **Step 3: Apply both files against the live Supabase project**

This is a live-database change (shared infrastructure) — pause here and confirm with the user before applying, per the project's existing dashboard-based convention:

1. Open the SQL editor for the project (URL referenced at the top of `supabase/rls_policies.sql`).
2. Paste and run the new block from `supabase/schema.sql` (Step 1 above).
3. Paste and run the new block from `supabase/rls_policies.sql` (Step 2 above).

- [ ] **Step 4: Verify the table and RLS are live**

Run (from the worktree root, with `.env` present from Task 1):

```bash
node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
sb.from('chat_messages').select('id').limit(1).then(({ error }) => {
  console.log(error ? 'FAIL: ' + error.message : 'OK: chat_messages reachable');
});
"
```

Expected: `OK: chat_messages reachable`.

- [ ] **Step 5: Commit**

```bash
git add supabase/schema.sql supabase/rls_policies.sql
git commit -m "feat: add chat_messages table, RLS policies, and realtime publication"
```

---

### Task 3: Chat message mapping helper (TDD)

**Files:**
- Create: `src/lib/chatMessages.ts`
- Test: `tests/unit/chat-messages.test.ts`

**Interfaces:**
- Produces:
  - `type ChatMessageRow = { id: string; cohort_id: string; author_id: string; text: string; type: 'normal' | 'help-alert'; created_at: string }`
  - `type AuthorInfo = { id: string; username: string; profile_image_url: string | null }`
  - `type DisplayMessage = { id: string; authorId: string; from: string; text: string; time: string; isMe: boolean }`
  - `mapMessageRow(row: ChatMessageRow, author: AuthorInfo | undefined, currentUserId: string): DisplayMessage`
  - `shouldShowAuthorName(messages: DisplayMessage[], index: number): boolean`
- Consumed by: Task 4 (`ChatScreen` in `src/pages/Dashboard.tsx`).

- [ ] **Step 1: Write the failing test**

Create `tests/unit/chat-messages.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { mapMessageRow, shouldShowAuthorName, type ChatMessageRow, type AuthorInfo, type DisplayMessage } from '../../src/lib/chatMessages';

const author: AuthorInfo = { id: 'user-1', username: 'alex_quit', profile_image_url: null };

function makeRow(overrides: Partial<ChatMessageRow> = {}): ChatMessageRow {
  return {
    id: 'msg-1',
    cohort_id: 'cohort-1',
    author_id: 'user-1',
    text: 'hello',
    type: 'normal',
    created_at: '2026-07-03T08:12:00.000Z',
    ...overrides,
  };
}

describe('mapMessageRow', () => {
  it('maps a row from another author to the display shape', () => {
    const result = mapMessageRow(makeRow(), author, 'user-2');
    expect(result).toEqual({
      id: 'msg-1',
      authorId: 'user-1',
      from: 'alex_quit',
      text: 'hello',
      time: expect.any(String),
      isMe: false,
    });
  });

  it('marks isMe true when author_id matches currentUserId', () => {
    const result = mapMessageRow(makeRow(), author, 'user-1');
    expect(result.isMe).toBe(true);
  });

  it('falls back to "Member" when author info is unavailable', () => {
    const result = mapMessageRow(makeRow(), undefined, 'user-2');
    expect(result.from).toBe('Member');
  });
});

describe('shouldShowAuthorName', () => {
  const base: DisplayMessage = { id: 'a', authorId: 'user-1', from: 'alex_quit', text: 'hi', time: '8:00 AM', isMe: false };

  it('is true for the first message from another author', () => {
    expect(shouldShowAuthorName([base], 0)).toBe(true);
  });

  it('is false for consecutive messages from the same author', () => {
    const messages = [base, { ...base, id: 'b', text: 'again' }];
    expect(shouldShowAuthorName(messages, 1)).toBe(false);
  });

  it('is true when the author changes from the previous message', () => {
    const messages = [base, { ...base, id: 'c', authorId: 'user-2', from: 'jordan_clean' }];
    expect(shouldShowAuthorName(messages, 1)).toBe(true);
  });

  it("is false for the current user's own messages", () => {
    const mine: DisplayMessage = { ...base, id: 'd', isMe: true };
    expect(shouldShowAuthorName([mine], 0)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `tests/unit/chat-messages.test.ts` cannot resolve `../../src/lib/chatMessages` (module not found).

- [ ] **Step 3: Implement `src/lib/chatMessages.ts`**

```typescript
export type ChatMessageRow = {
  id: string;
  cohort_id: string;
  author_id: string;
  text: string;
  type: 'normal' | 'help-alert';
  created_at: string;
};

export type AuthorInfo = {
  id: string;
  username: string;
  profile_image_url: string | null;
};

export type DisplayMessage = {
  id: string;
  authorId: string;
  from: string;
  text: string;
  time: string;
  isMe: boolean;
};

export function mapMessageRow(row: ChatMessageRow, author: AuthorInfo | undefined, currentUserId: string): DisplayMessage {
  return {
    id: row.id,
    authorId: row.author_id,
    from: author?.username ?? 'Member',
    text: row.text,
    time: new Date(row.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    isMe: row.author_id === currentUserId,
  };
}

export function shouldShowAuthorName(messages: DisplayMessage[], index: number): boolean {
  const msg = messages[index];
  if (msg.isMe) return false;
  if (index === 0) return true;
  return messages[index - 1].authorId !== msg.authorId;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — 7 tests passing in `tests/unit/chat-messages.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/chatMessages.ts tests/unit/chat-messages.test.ts
git commit -m "feat: add chat message mapping helper with unit tests"
```

---

### Task 4: Wire `ChatScreen` to real Supabase data and realtime

**Files:**
- Modify: `src/pages/Dashboard.tsx`

**Interfaces:**
- Consumes: `mapMessageRow`, `shouldShowAuthorName`, `type ChatMessageRow`, `type DisplayMessage` from `src/lib/chatMessages.ts` (Task 3); `chat_messages` table and RLS (Task 2).
- Produces: `ChatScreen` renders live data; `Member` and `UserData` types gain an `id` field that Task 5's e2e test relies on indirectly (via the running app), not directly.

- [ ] **Step 1: Add the import for the chat helper**

Modify `src/pages/Dashboard.tsx` — after the existing `Toast` import (currently line 12):

```typescript
import { Toast } from '../components/ui/Toast';
import { mapMessageRow, shouldShowAuthorName, type ChatMessageRow, type DisplayMessage } from '../lib/chatMessages';
```

- [ ] **Step 2: Extend `UserData` and `Member` types with `id`, drop the old `Message` type**

Find (currently lines 39-43):

```typescript
type CohortData = { id: string; start_date: string; member_count: number; max_members: number; status: string; nix_date: { month: string; start_date: string } };
type UserData = { username: string; profile_image_url: string | null; active_cohort: CohortData | null };
type Member = { user: { username: string; profile_image_url: string | null } };
type UpcomingCohort = { id: string; member_count: number; max_members: number; status: string; start_date: string; nix_date: { month: string; start_date: string } };
type Message = { id: number; from: string; text: string; time: string; isMe: boolean };
```

Replace with:

```typescript
type CohortData = { id: string; start_date: string; member_count: number; max_members: number; status: string; nix_date: { month: string; start_date: string } };
type UserData = { id: string; username: string; profile_image_url: string | null; active_cohort: CohortData | null };
type Member = { user: { id: string; username: string; profile_image_url: string | null } };
type UpcomingCohort = { id: string; member_count: number; max_members: number; status: string; start_date: string; nix_date: { month: string; start_date: string } };
```

- [ ] **Step 3: Replace the `ChatScreen` component**

Find the entire `ChatScreen` function (currently lines 138-233, from the `/* ── Chat Screen ── */` comment through its closing `}`). Replace it with:

```typescript
/* ── Chat Screen ── */
function ChatScreen({ user, cohort, members }: { user: UserData; cohort: CohortData; members: Member[] }) {
  const cohortLabel = cohort.nix_date?.month ?? 'Your Cohort';
  const [msgs, setMsgs] = useState<DisplayMessage[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [toast, setToast] = useState<{ msg: string } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const membersRef = useRef(members);

  useEffect(() => { membersRef.current = members; }, [members]);

  const resolveAuthor = (authorId: string) =>
    membersRef.current.find(m => m.user.id === authorId)?.user;

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [msgs]);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);

    supabase
      .from('chat_messages')
      .select('id, cohort_id, author_id, text, type, created_at')
      .eq('cohort_id', cohort.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) { setLoadError(error.message); return; }
        const rows = ((data ?? []) as ChatMessageRow[]).slice().reverse();
        setMsgs(rows.map(row => mapMessageRow(row, resolveAuthor(row.author_id), user.id)));
      });

    return () => { cancelled = true; };
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
            if (prev.some(m => m.id === row.id)) return prev;
            return [...prev, mapMessageRow(row, resolveAuthor(row.author_id), user.id)];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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
      setToast({ msg: `Message failed to send: ${error.message}` });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {toast && (
        <div style={{ position: 'fixed', bottom: 88, left: '50%', transform: 'translateX(-50%)', zIndex: 100 }}>
          <Toast type="error" message={toast.msg} visible onClose={() => setToast(null)} />
        </div>
      )}

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
        {loadError && (
          <div style={{ textAlign: 'center', padding: 24, fontFamily: 'var(--font-body)', color: 'var(--color-text-muted)' }}>
            Couldn't load messages: {loadError}
          </div>
        )}
        {msgs.map((msg, i) => {
          const showName = shouldShowAuthorName(msgs, i);
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
```

- [ ] **Step 4: Update the members query to include `id`**

Find (in `Dashboard`'s `load()`, currently around line 343-347):

```typescript
      const { data: membersData } = await supabase
        .from('cohort_members')
        .select('user:user_id(username, profile_image_url)')
        .eq('cohort_id', cohort.id)
        .limit(20);
```

Replace with:

```typescript
      const { data: membersData } = await supabase
        .from('cohort_members')
        .select('user:user_id(id, username, profile_image_url)')
        .eq('cohort_id', cohort.id)
        .limit(20);
```

- [ ] **Step 5: Attach the current user's id to `userData`**

Find (currently line 340):

```typescript
      setUserData(data as unknown as UserData);
```

Replace with:

```typescript
      setUserData({ ...(data as object), id: user.id } as unknown as UserData);
```

- [ ] **Step 6: Type-check and build**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: wire ChatScreen to real-time Supabase chat_messages"
```

---

### Task 5: End-to-end test for live cross-user chat

**Files:**
- Test: `tests/e2e/cohort-chat.spec.ts`

**Interfaces:**
- Consumes: running app (`npm run dev`, via Playwright's `webServer` config from Task 1), `chat_messages` table + RLS (Task 2), the wired `ChatScreen` (Task 4).

This test creates two dedicated test users, enrolls both directly into the same cohort via the service-role client (bypassing the one-cohort-at-a-time `join_cohort` RPC restriction isn't relevant here — we're just seeding membership rows directly, matching the existing pattern in `tests/unit/auth-join.test.ts` and `tests/e2e/signup-join-dashboard.spec.ts`), then drives two browser contexts to prove a message sent by one appears live for the other.

- [ ] **Step 1: Write the e2e test**

Create `tests/e2e/cohort-chat.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const admin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const USER_A = { email: 'chat_test_a@nixit.dev', password: 'testpass123', username: 'chat_test_alex' };
const USER_B = { email: 'chat_test_b@nixit.dev', password: 'testpass123', username: 'chat_test_jordan' };

let cohortId: string;

async function resetUser(u: typeof USER_A): Promise<string> {
  const { data: { users } } = await admin.auth.admin.listUsers();
  const existing = users.find(x => x.email === u.email);
  if (existing) {
    await admin.from('chat_messages').delete().eq('author_id', existing.id);
    await admin.from('cohort_members').delete().eq('user_id', existing.id);
    await admin.from('users').delete().eq('id', existing.id);
    await admin.auth.admin.deleteUser(existing.id);
  }
  const { data } = await admin.auth.admin.createUser({ email: u.email, password: u.password, email_confirm: true });
  return data.user!.id;
}

test.beforeAll(async () => {
  const { data: cohort } = await admin.from('cohorts').select('id').eq('start_date', '2026-11-01').single();
  cohortId = cohort!.id;

  const idA = await resetUser(USER_A);
  const idB = await resetUser(USER_B);

  await admin.from('users').insert([
    { id: idA, email: USER_A.email, username: USER_A.username, active_cohort_id: cohortId },
    { id: idB, email: USER_B.email, username: USER_B.username, active_cohort_id: cohortId },
  ]);
  await admin.from('cohort_members').insert([
    { user_id: idA, cohort_id: cohortId },
    { user_id: idB, cohort_id: cohortId },
  ]);
});

test.afterAll(async () => {
  await admin.from('chat_messages').delete().eq('cohort_id', cohortId);
  for (const u of [USER_A, USER_B]) {
    const { data: { users } } = await admin.auth.admin.listUsers();
    const existing = users.find(x => x.email === u.email);
    if (existing) {
      await admin.from('cohort_members').delete().eq('user_id', existing.id);
      await admin.from('users').delete().eq('id', existing.id);
      await admin.auth.admin.deleteUser(existing.id);
    }
  }
});

test.describe('Cohort chat', () => {
  test('message sent by one member appears live for another member', async ({ browser }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    await test.step('both members log in and open chat', async () => {
      for (const [page, user] of [[pageA, USER_A], [pageB, USER_B]] as const) {
        await page.goto('/login');
        await page.getByLabel('Email').fill(user.email);
        await page.getByLabel('Password').fill(user.password);
        await page.getByRole('button', { name: 'Sign in' }).click();
        await page.waitForURL('**/dashboard');
        await page.getByRole('button', { name: 'Chat' }).click();
      }
    });

    const messageText = `hello from ${USER_A.username} ${Date.now()}`;

    await test.step('user A sends a message', async () => {
      await pageA.getByPlaceholder("Share how you're doing…").fill(messageText);
      await pageA.getByRole('button', { name: 'Send' }).click();
    });

    await test.step('user B sees the message live, attributed to user A', async () => {
      await expect(pageB.getByText(messageText)).toBeVisible();
      await expect(pageB.getByText(USER_A.username)).toBeVisible();
    });

    await contextA.close();
    await contextB.close();
  });
});
```

- [ ] **Step 2: Run the e2e test**

Run: `npm run test:e2e -- cohort-chat.spec.ts`
Expected: PASS — 1 test passing. (Requires Task 2's migration to already be live and Task 1's `.env`/Playwright browser install done.)

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/cohort-chat.spec.ts
git commit -m "test: add e2e coverage for live cohort chat between two members"
```
