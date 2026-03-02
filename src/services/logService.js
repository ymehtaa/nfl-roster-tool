/**
 * Structured logging helper.
 *
 * Writes to browser console AND fires a non-blocking POST to /api/log so
 * every event appears in Vercel function logs — searchable and filterable.
 *
 * Rules:
 *  - Never throws — logging must never break calling code.
 *  - Never awaited — fire-and-forget only.
 *  - keepalive: true so the request survives navigation/page-unload.
 */
export function log(event, data = {}) {
  // Always visible in browser devtools
  console.log(`[nfl:${event}]`, data);

  // Forward to backend stdout → Vercel logs
  fetch('/api/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, ...data, ts: new Date().toISOString() }),
    keepalive: true,
  }).catch(() => {}); // swallow — a logging failure must never surface to the user
}
