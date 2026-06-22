const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, 'data.json');

const DEFAULT_DATA = {
  boards: [],
  posts: [],
};

function load() {
  if (!fs.existsSync(dbPath)) {
    const data = { ...DEFAULT_DATA };
    seedBoards(data);
    save(data);
    return data;
  }
  const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  if (data.boards.length === 0) seedBoards(data);
  return data;
}

function save(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function seedBoards(data) {
  const defaults = [
    { slug: 'general', name: 'General', description: 'Open discussion' },
    { slug: 'tech', name: 'Tech', description: 'Technology and programming' },
    { slug: 'creative', name: 'Creative', description: 'Art, music, and writing' },
    { slug: 'random', name: 'Random', description: 'Off-topic fun' },
  ];
  for (const b of defaults) {
    data.boards.push({ id: uuidv4(), ...b });
  }
}

let data = load();

function persist() {
  save(data);
}

function getBoards() {
  return [...data.boards].sort((a, b) => a.name.localeCompare(b.name));
}

function getBoardBySlug(slug) {
  return data.boards.find((b) => b.slug === slug);
}

function getBoardById(id) {
  return data.boards.find((b) => b.id === id);
}

function enrichPost(post) {
  if (!post) return null;
  const board = post.board_id ? getBoardById(post.board_id) : null;
  return {
    ...post,
    board_slug: board?.slug,
    board_name: board?.name,
  };
}

function insertPost(post) {
  data.posts.unshift(post);
  persist();
  return post;
}

function updatePost(id, updates) {
  const idx = data.posts.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  data.posts[idx] = { ...data.posts[idx], ...updates };
  persist();
  return data.posts[idx];
}

function getPost(id) {
  return data.posts.find((p) => p.id === id);
}

function getPosts(filterFn, sortFn, limit = 50) {
  return data.posts
    .filter(filterFn)
    .sort(sortFn)
    .slice(0, limit)
    .map(enrichPost);
}

function now() {
  return new Date().toISOString();
}

function isExpired(post) {
  return post.expires_at && new Date(post.expires_at) <= new Date();
}

function isDeleted(post) {
  return !!post.deleted_at;
}

function isActive(post) {
  return !isDeleted(post) && !isExpired(post);
}

module.exports = {
  uuidv4,
  getBoards,
  getBoardBySlug,
  getBoardById,
  enrichPost,
  insertPost,
  updatePost,
  getPost,
  getPosts,
  now,
  isExpired,
  isDeleted,
  isActive,
};
