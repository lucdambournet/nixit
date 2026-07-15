import { supabase } from './supabase';

export interface PushDispatchPayload {
  userIds: string[];
  title: string;
  body: string;
  url?: string;
}

/**
 * Best-effort push dispatch, invoked after inserting a help-alert or
 * tap-out-request event (#48, #50). Failures never block the caller — the
 * chat message / DB row is the source of truth, push is a notification on
 * top of it.
 */
export async function dispatchPushNotification(payload: PushDispatchPayload): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('dispatch-push', { body: payload });
    if (error) {
      console.warn('Failed to dispatch push notification:', error.message);
    }
  } catch (err) {
    console.warn('Failed to dispatch push notification:', err);
  }
}
