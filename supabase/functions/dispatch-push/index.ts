// Dispatches a Web Push notification to a set of users' stored subscriptions.
// Called by the client after inserting a help-alert (#48) or tap-out-request
// (#50) event. Requires the `VAPID_PRIVATE_KEY` and `VAPID_PUBLIC_KEY`
// secrets to be set on this Supabase project (`supabase secrets set ...`) —
// until then this no-ops with a 200 so callers' best-effort dispatch never
// surfaces an error to the end user.
//
// Deploy manually: `supabase functions deploy dispatch-push`
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3';

type NotificationCategory = 'help_alerts' | 'tap_out_updates';

interface DispatchPayload {
  userIds: string[];
  title: string;
  body: string;
  url?: string;
  category: NotificationCategory;
}

Deno.serve(async req => {
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('dispatch-push: VAPID keys not configured, skipping send.');
    return new Response(JSON.stringify({ skipped: true, reason: 'not-configured' }), { status: 200 });
  }

  const payload: DispatchPayload = await req.json();
  if (!payload.userIds?.length || !payload.title || !payload.body || !payload.category) {
    return new Response(JSON.stringify({ error: 'userIds, title, body, and category are required' }), { status: 400 });
  }

  webpush.setVapidDetails('mailto:support@nixit.app', vapidPublicKey, vapidPrivateKey);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Recipients default to enabled (no row = opted in); only exclude users
  // who explicitly disabled this category (#49).
  const prefColumn = payload.category === 'help_alerts' ? 'help_alerts_enabled' : 'tap_out_updates_enabled';
  const { data: disabledPrefs, error: prefsError } = await supabase
    .from('notification_preferences')
    .select('user_id')
    .in('user_id', payload.userIds)
    .eq(prefColumn, false);

  if (prefsError) {
    return new Response(JSON.stringify({ error: prefsError.message }), { status: 500 });
  }

  const disabledUserIds = new Set((disabledPrefs ?? []).map(p => p.user_id));
  const targetUserIds = payload.userIds.filter(id => !disabledUserIds.has(id));

  if (targetUserIds.length === 0) {
    return new Response(JSON.stringify({ sent: 0, failed: 0, skippedByPreference: disabledUserIds.size }), { status: 200 });
  }

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .in('user_id', targetUserIds);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const results = await Promise.allSettled(
    (subscriptions ?? []).map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title: payload.title, body: payload.body, url: payload.url }),
      )
    )
  );

  const sent = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.length - sent;
  return new Response(JSON.stringify({ sent, failed }), { status: 200 });
});
