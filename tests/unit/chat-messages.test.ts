import { describe, expect, it } from 'vitest';
import { mapMessageRow, shouldShowAuthorName, type AuthorInfo, type ChatMessageRow, type DisplayMessage } from '../../src/lib/chatMessages';

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