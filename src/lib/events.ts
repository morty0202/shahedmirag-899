type Listener = () => void;
const listeners = new Set<Listener>();

export function onNotificationsRefresh(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function emitNotificationsRefresh(): void {
  listeners.forEach(fn => fn());
}
