/**
 * Entry selector — keeps production and legacy dev entries working.
 *
 * server.mjs is the combined REST + WebSocket server: it serves every API
 * route (/api/auth, /api/settings, /api/assistant, …) AND the /signal
 * WebSocket on a single port. This file previously started a
 * signaling-only server, so any platform that launched `node index.mjs`
 * (e.g. Render) answered 404 for every API route.
 *
 *   - SIGNAL_PORT set  → legacy standalone signaler (_standalone-signal.mjs, :8081)
 *   - otherwise        → combined REST + signaling server (server.mjs)
 */
if (process.env.SIGNAL_PORT) {
  await import("./_standalone-signal.mjs");
} else {
  await import("./server.mjs");
}
