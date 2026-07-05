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
  const message = messages[index];

  if (message.isMe) {
    return false;
  }

  if (index === 0) {
    return true;
  }

  return messages[index - 1].authorId !== message.authorId;
}