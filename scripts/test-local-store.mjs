import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const memory = new Map();
globalThis.localStorage = {
  getItem(key) {
    return memory.has(key) ? memory.get(key) : null;
  },
  setItem(key, value) {
    memory.set(key, String(value));
  },
  removeItem(key) {
    memory.delete(key);
  },
  clear() {
    memory.clear();
  },
};

const storeUrl = pathToFileURL(path.resolve('client/src/localStore.js')).href;
const store = await import(storeUrl);

test('seeds default boards', () => {
  const boards = store.getBoards();
  assert.ok(boards.length >= 4);
  assert.ok(boards.some((b) => b.slug === 'general'));
});

test('creates board threads and lists them', () => {
  const post = store.createPost('board', {
    author: 'zeb',
    title: 'Hello',
    content: 'First thread',
    board_slug: 'tech',
  });
  assert.equal(post.board_slug, 'tech');
  const listed = store.listPosts('board', { board: 'tech' });
  assert.equal(listed[0].id, post.id);
});

test('mail requires a recipient and filters by user', () => {
  assert.throws(() => store.createPost('mail', { content: 'hi' }), /Recipient/);
  store.createPost('mail', {
    author: 'alice',
    recipient: 'bob',
    content: 'secret',
  });
  const inbox = store.listPosts('mail', { user: 'bob' });
  assert.equal(inbox.length, 1);
  assert.equal(store.listPosts('mail', { user: 'carol' }).length, 0);
});

test('upvote, hall of fame, delete, and trash', () => {
  const post = store.createPost('feed', { author: 'zeb', content: 'climb' });
  for (let i = 0; i < 10; i += 1) store.upvotePost(post.id);
  const hof = store.listPosts('hall_of_fame');
  assert.ok(hof.some((p) => p.id === post.id));
  store.deletePost(post.id);
  const trash = store.listPosts('trash');
  assert.ok(trash.some((p) => p.id === post.id));
});
