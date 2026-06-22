const API = '/api';

export async function fetchBoards() {
  const res = await fetch(`${API}/boards`);
  if (!res.ok) throw new Error('Failed to load boards');
  return res.json();
}

export async function fetchPosts(method, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `${API}/posts/${method}${qs ? `?${qs}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load posts');
  }
  return res.json();
}

export async function fetchPost(id) {
  const res = await fetch(`${API}/post/${id}`);
  if (!res.ok) throw new Error('Post not found');
  return res.json();
}

export async function createPost(method, body) {
  const res = await fetch(`${API}/posts/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create post');
  return data;
}

export async function replyToPost(id, body) {
  const res = await fetch(`${API}/post/${id}/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to reply');
  return data;
}

export async function upvotePost(id) {
  const res = await fetch(`${API}/post/${id}/upvote`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to upvote');
  return res.json();
}

export async function featurePost(id) {
  const res = await fetch(`${API}/post/${id}/feature`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to feature');
  return res.json();
}

export async function deletePost(id) {
  const res = await fetch(`${API}/post/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete');
  return res.json();
}

export function getUsername() {
  return localStorage.getItem('drcr2_user') || 'Anonymous';
}

export function setUsername(name) {
  localStorage.setItem('drcr2_user', name || 'Anonymous');
}
