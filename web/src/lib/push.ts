// Client side of the coursework push reminders.
//
// Server counterpart: /api/push/key (VAPID public key; 404 = feature not
// configured → hide the UI), /api/push/subscribe, /api/push/unsubscribe.
// Pushes are payload-less; sw.js supplies the notification text.
//
// iOS supports Web Push from 16.4, but ONLY inside a home-screen-installed
// PWA — in Safari-the-browser the Push API is absent, which `support()`
// reports as 'needs-install' so the UI can point at the install flow instead
// of showing a dead button.

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS masquerades as macOS
}

export function support(): 'ok' | 'needs-install' | 'unsupported' {
  if ('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) return 'ok';
  if (isIOS()) return 'needs-install';
  return 'unsupported';
}

// The VAPID public key, or null when the feature is unconfigured/unreachable.
export async function serverKey(): Promise<string | null> {
  try {
    const r = await fetch('/api/push/key');
    if (!r.ok) return null;
    const d = await r.json();
    return typeof d.key === 'string' && d.key ? d.key : null;
  } catch { return null; }
}

function keyBytes(b64url: string): Uint8Array {
  const b64 = (b64url + '='.repeat((4 - (b64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function isSubscribed(): Promise<boolean> {
  if (support() !== 'ok') return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    return !!(await reg.pushManager.getSubscription());
  } catch { return false; }
}

// Full opt-in flow. Returns 'on' on success; 'denied' when the permission
// prompt was refused; 'unavailable' for everything else (no key, no SW, …).
export async function enable(): Promise<'on' | 'denied' | 'unavailable'> {
  if (support() !== 'ok') return 'unavailable';
  const key = await serverKey();
  if (!key) return 'unavailable';
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return 'denied';
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(key).buffer as ArrayBuffer,
    });
    const r = await fetch('/api/push/subscribe', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(sub.toJSON()),
    });
    if (!r.ok) { await sub.unsubscribe().catch(() => {}); return 'unavailable'; }
    return 'on';
  } catch { return 'unavailable'; }
}

// One-tap opt-out: drop the browser subscription and the server row.
export async function disable(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    const endpoint = sub.endpoint;
    await sub.unsubscribe().catch(() => {});
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    }).catch(() => {});
  } catch { /* nothing to disable */ }
}
