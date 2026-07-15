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

interface DispatchPayload {
  userIds: string[];
  title: string;
  body: string;
  url?: string;
}

Deno.serve(async req => {
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('dispatch-push: VAPID keys not configured, skipping send.');
    return new Response(JSON.stringify({ skipped: true, reason: 'not-configured' }), { status: 200 });
  }

  const payload: DispatchPayload = await req.json();
  if (!payload.userIds?.length || !payload.title || !payload.body) {
    return new Response(JSON.stringify({ error: 'userIds, title, and body are required' }), { status: 400 });
  }

  webpush.setVapidDetails('mailto:support@nixit.app', vapidPublicKey, vapidPrivateKey);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .in('user_id', payload.userIds);

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
