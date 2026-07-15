import { supabase } from './supabase';

/** Converts a URL-safe base64 VAPID public key into the Uint8Array PushManager expects. */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/** Extracts the row shape stored in `push_subscriptions` from a browser PushSubscription. */
export function subscriptionToRow(userId: string, subscription: PushSubscriptionJSON): {
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
} {
  if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    throw new Error('Push subscription is missing required fields.');
  }
  return {
    user_id: userId,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
  };
}

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
}

/** Registers the service worker; safe to call multiple times (browser dedupes by scope). */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  return navigator.serviceWorker.register('/sw.js');
}

export type SubscribeResult =
  | { ok: true }
  | { ok: false; reason: 'unsupported' | 'permission-denied' | 'not-configured' | 'error'; message: string };

/** Requests notification permission, subscribes to push, and stores the subscription. */
export async function subscribeToPush(userId: string): Promise<SubscribeResult> {
  if (!isPushSupported()) {
    return { ok: false, reason: 'unsupported', message: 'Push notifications are not supported in this browser.' };
  }

  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!publicKey) {
    return { ok: false, reason: 'not-configured', message: 'Push notifications are not configured for this deployment yet.' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, reason: 'permission-denied', message: 'Notification permission was not granted.' };
  }

  try {
    const registration = await registerServiceWorker();
    if (!registration) {
      return { ok: false, reason: 'unsupported', message: 'Could not register the service worker.' };
    }
    // pushManager.subscribe() requires an *active* service worker; a fresh
    // registration can still be installing/waiting at this point.
    await navigator.serviceWorker.ready;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });

    const row = subscriptionToRow(userId, subscription.toJSON());
    const { error } = await supabase.from('push_subscriptions').upsert(row, { onConflict: 'endpoint' });
    if (error) {
      return { ok: false, reason: 'error', message: error.message };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, reason: 'error', message: err instanceof Error ? err.message : 'Failed to subscribe to push notifications.' };
  }
}

/** Unsubscribes the current device from push and removes its stored subscription. */
export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration('/sw.js');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
}
