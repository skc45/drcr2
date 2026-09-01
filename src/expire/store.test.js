import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createNote,
  listNotes,
  sweep,
  isExpired,
  remainingMs,
  deleteNote,
  clearAll,
  formatRemaining,
} from './store.js';

test('notes vanish when ttl elapses', () => {
  clearAll();
  const t0 = 1_000_000;
  const note = createNote({ body: 'flash', ttlMs: 5000, now: t0 });
  assert.equal(listNotes(t0).length, 1);
  assert.equal(isExpired(note, t0 + 4999), false);
  assert.equal(remainingMs(note, t0 + 2000), 3000);
  const { live, gone } = sweep(t0 + 5000);
  assert.equal(live.length, 0);
  assert.equal(gone.length, 1);
  assert.equal(gone[0].id, note.id);
  assert.equal(listNotes(t0 + 5000).length, 0);
});

test('rejects empty body and tiny ttl', () => {
  clearAll();
  assert.throws(() => createNote({ body: '   ', ttlMs: 5000 }), /Write something/);
  assert.throws(() => createNote({ body: 'ok', ttlMs: 10 }), /TTL/);
});

test('delete and remaining formatter', () => {
  clearAll();
  const n = createNote({ body: 'x', ttlMs: 60_000, now: 0 });
  deleteNote(n.id);
  assert.equal(listNotes(0).length, 0);
  assert.equal(formatRemaining(1500), '2s');
  assert.equal(formatRemaining(0), 'expired');
});
