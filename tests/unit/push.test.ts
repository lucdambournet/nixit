import { describe, expect, it } from 'vitest';
import { isPushSupported, subscriptionToRow, urlBase64ToUint8Array } from '../../src/app/lib/push';

describe('urlBase64ToUint8Array', () => {
  it('decodes a URL-safe base64 VAPID key into bytes', () => {
    // 'AQID' is base64 for bytes [1, 2, 3]
    expect(Array.from(urlBase64ToUint8Array('AQID'))).toEqual([1, 2, 3]);
  });

  it('handles URL-safe characters (- and _) and missing padding', () => {
    // base64url of bytes [0xfb, 0xff, 0xbf] is "-_-_" style content; just
    // assert it round-trips without throwing and produces the right length.
    const key = 'BL6kgNYxP7H8WQYKfhJYGF4ENEh7LR9wiqpGLUiSqkULHcV-aNn6gmZMY5qd6-KJkVi3aKbqne3rVHx6RIW3nIw';
    const bytes = urlBase64ToUint8Array(key);
    expect(bytes.length).toBe(65); // uncompressed P-256 point
    expect(bytes[0]).toBe(4); // uncompressed point prefix
  });
});

describe('subscriptionToRow', () => {
  const base = { endpoint: 'https://push.example.com/abc', keys: { p256dh: 'p256dh-key', auth: 'auth-key' } };

  it('maps a valid PushSubscriptionJSON to a push_subscriptions row', () => {
    expect(subscriptionToRow('user-1', base)).toEqual({
      user_id: 'user-1',
      endpoint: 'https://push.example.com/abc',
      p256dh: 'p256dh-key',
      auth: 'auth-key',
    });
  });

  it('throws when endpoint is missing', () => {
    expect(() => subscriptionToRow('user-1', { keys: base.keys })).toThrow();
  });

  it('throws when keys are missing', () => {
    expect(() => subscriptionToRow('user-1', { endpoint: base.endpoint })).toThrow();
  });
});

describe('isPushSupported', () => {
  it('is false outside a browser environment (no window/navigator)', () => {
    expect(isPushSupported()).toBe(false);
  });
});
