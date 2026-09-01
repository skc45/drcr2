const KEY = 'drcr2_expire_v2';

function uuid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

const storage = typeof localStorage === 'undefined' ? memoryStorage() : localStorage;

function loadAll() {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAll(notes) {
  storage.setItem(KEY, JSON.stringify(notes));
}

export const TTL_PRESETS = [
  { label: '15s', ms: 15_000 },
  { label: '1m', ms: 60_000 },
  { label: '5m', ms: 5 * 60_000 },
  { label: '1h', ms: 60 * 60_000 },
  { label: '1d', ms: 24 * 60 * 60_000 },
];

export function remainingMs(note, now = Date.now()) {
  return Math.max(0, note.expiresAt - now);
}

export function isExpired(note, now = Date.now()) {
  return note.expiresAt <= now;
}

export function progress(note, now = Date.now()) {
  const total = Math.max(1, note.expiresAt - note.createdAt);
  return Math.min(1, Math.max(0, remainingMs(note, now) / total));
}

export function listNotes(now = Date.now()) {
  const all = loadAll();
  const live = all.filter((n) => !isExpired(n, now));
  if (live.length !== all.length) saveAll(live);
  return live.sort((a, b) => a.expiresAt - b.expiresAt);
}

export function sweep(now = Date.now()) {
  const before = loadAll();
  const gone = before.filter((n) => isExpired(n, now));
  const live = before.filter((n) => !isExpired(n, now));
  if (gone.length) saveAll(live);
  return { live, gone };
}

export function createNote({ body, ttlMs, math = null, now = Date.now() }) {
  const text = String(body ?? '').trim();
  if (!text) throw new Error('Write something first');
  const ttl = Number(ttlMs);
  if (!Number.isFinite(ttl) || ttl < 1000) throw new Error('TTL must be at least 1 second');
  const note = {
    id: uuid(),
    body: text,
    createdAt: now,
    expiresAt: now + ttl,
    ttlMs: ttl,
    math,
  };
  const notes = loadAll().filter((n) => !isExpired(n, now));
  notes.unshift(note);
  saveAll(notes);
  return note;
}

export function deleteNote(id) {
  saveAll(loadAll().filter((n) => n.id !== id));
}

export function clearAll() {
  saveAll([]);
}

export function formatRemaining(ms) {
  if (ms <= 0) return 'expired';
  if (ms < 1000) return `${ms}ms`;
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return rs ? `${m}m ${rs}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  if (h < 48) return rm ? `${h}h ${rm}m` : `${h}h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh ? `${d}d ${rh}h` : `${d}d`;
}
