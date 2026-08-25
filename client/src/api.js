import { useLocalApi } from './platform';
import * as local from './localStore';

function apiUrl(path) {
  const origin = import.meta.env.VITE_API_URL || '';
  return `${origin}/api${path}`;
}

async function readError(res, fallback) {
  const err = await res.json().catch(() => ({}));
  return err.error || fallback;
}

export async function fetchBoards() {
  if (useLocalApi()) return local.getBoards();
  const res = await fetch(apiUrl('/boards'));
  if (!res.ok) throw new Error('Failed to load boards');
  return res.json();
}

export async function fetchPosts(method, params = {}) {
  if (useLocalApi()) return local.listPosts(method, params);
  const qs = new URLSearchParams(params).toString();
  const url = apiUrl(`/posts/${method}${qs ? `?${qs}` : ''}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(await readError(res, 'Failed to load posts'));
  return res.json();
}

export async function fetchPost(id) {
  if (useLocalApi()) return local.getThread(id);
  const res = await fetch(apiUrl(`/post/${id}`));
  if (!res.ok) throw new Error('Post not found');
  return res.json();
}

export async function createPost(method, body) {
  if (useLocalApi()) return local.createPost(method, body);
  const res = await fetch(apiUrl(`/posts/${method}`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create post');
  return data;
}

export async function replyToPost(id, body) {
  if (useLocalApi()) return local.replyToPost(id, body);
  const res = await fetch(apiUrl(`/post/${id}/reply`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to reply');
  return data;
}

export async function upvotePost(id) {
  if (useLocalApi()) return local.upvotePost(id);
  const res = await fetch(apiUrl(`/post/${id}/upvote`), { method: 'POST' });
  if (!res.ok) throw new Error('Failed to upvote');
  return res.json();
}

export async function featurePost(id) {
  if (useLocalApi()) return local.featurePost(id);
  const res = await fetch(apiUrl(`/post/${id}/feature`), { method: 'POST' });
  if (!res.ok) throw new Error('Failed to feature');
  return res.json();
}

export async function deletePost(id) {
  if (useLocalApi()) return local.deletePost(id);
  const res = await fetch(apiUrl(`/post/${id}`), { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete');
  return res.json();
}

export function getUsername() {
  return localStorage.getItem('drcr2_user') || 'Anonymous';
}

export function setUsername(name) {
  localStorage.setItem('drcr2_user', name || 'Anonymous');
}
