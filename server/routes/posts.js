const express = require('express');
const {
  uuidv4,
  getBoards,
  getBoardBySlug,
  enrichPost,
  insertPost,
  updatePost,
  getPost,
  getPosts,
  now,
  isExpired,
  isDeleted,
  isActive,
} = require('../db');

const router = express.Router();

const METHODS = ['trash', 'board', 'catalog', 'feed', 'mail', 'article', 'overboard', 'hall_of_fame'];

router.get('/methods', (_req, res) => {
  res.json(METHODS);
});

router.get('/boards', (_req, res) => {
  res.json(getBoards());
});

router.get('/posts/:method', (req, res) => {
  const { method } = req.params;
  if (!METHODS.includes(method)) {
    return res.status(400).json({ error: 'Invalid posting method' });
  }

  const { board, q } = req.query;
  let posts = [];

  switch (method) {
    case 'trash':
      posts = getPosts(
        (p) => isDeleted(p) || isExpired(p),
        (a, b) => new Date(b.deleted_at || b.expires_at) - new Date(a.deleted_at || a.expires_at),
        50
      );
      break;

    case 'board': {
      const boardId = board ? getBoardBySlug(board)?.id : null;
      if (board && !boardId) return res.status(404).json({ error: 'Board not found' });
      posts = getPosts(
        (p) => p.method === 'board' && !p.parent_id && isActive(p) && (!boardId || p.board_id === boardId),
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      break;
    }

    case 'catalog': {
      const boardId = board ? getBoardBySlug(board)?.id : null;
      posts = getPosts(
        (p) => ['board', 'catalog'].includes(p.method) && !p.parent_id && isActive(p) && (!boardId || p.board_id === boardId),
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
        100
      );
      break;
    }

    case 'feed':
      posts = getPosts(
        (p) => ['feed', 'board', 'article'].includes(p.method) && isActive(p),
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
        80
      );
      break;

    case 'mail': {
      const { user } = req.query;
      if (!user) return res.status(400).json({ error: 'user query param required for mail' });
      posts = getPosts(
        (p) => p.method === 'mail' && isActive(p) && (p.author === user || p.recipient === user),
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      break;
    }

    case 'article':
      posts = getPosts(
        (p) => p.method === 'article' && !p.parent_id && isActive(p),
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      break;

    case 'overboard':
      posts = getPosts(
        (p) => p.method === 'board' && !p.parent_id && isActive(p),
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
        100
      );
      break;

    case 'hall_of_fame':
      posts = getPosts(
        (p) => isActive(p) && (p.featured || p.method === 'hall_of_fame' || p.score >= 10),
        (a, b) => b.score - a.score || new Date(b.created_at) - new Date(a.created_at)
      );
      break;

    default:
      posts = getPosts(
        (p) => p.method === method && isActive(p),
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
  }

  if (q) {
    const needle = q.toLowerCase();
    posts = posts.filter(
      (p) =>
        p.title?.toLowerCase().includes(needle) ||
        p.content?.toLowerCase().includes(needle) ||
        p.author?.toLowerCase().includes(needle)
    );
  }

  res.json(posts);
});

router.get('/post/:id', (req, res) => {
  const post = getPost(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  updatePost(req.params.id, { view_count: (post.view_count || 0) + 1 });

  const replies = getPosts(
    (p) => p.parent_id === req.params.id && isActive(p),
    (a, b) => new Date(a.created_at) - new Date(b.created_at),
    500
  );

  res.json({ ...enrichPost(getPost(req.params.id)), replies });
});

router.post('/posts/:method', (req, res) => {
  const { method } = req.params;
  if (!METHODS.includes(method)) {
    return res.status(400).json({ error: 'Invalid posting method' });
  }

  const {
    author = 'Anonymous',
    title = '',
    content,
    board_slug,
    parent_id,
    recipient,
    image_url,
    ttl_hours,
    featured,
  } = req.body;

  if (!content?.trim()) {
    return res.status(400).json({ error: 'Content is required' });
  }

  let board_id = null;
  if (board_slug) {
    const b = getBoardBySlug(board_slug);
    if (!b) return res.status(404).json({ error: 'Board not found' });
    board_id = b.id;
  }

  if (method === 'mail' && !recipient?.trim()) {
    return res.status(400).json({ error: 'Recipient required for mail' });
  }

  if ((method === 'board' || method === 'catalog') && !board_id && !parent_id) {
    return res.status(400).json({ error: 'Board required for new threads' });
  }

  const id = uuidv4();
  let storedMethod = method;
  let expires_at = null;

  if (method === 'trash') {
    const hours = ttl_hours || 24;
    expires_at = new Date(Date.now() + hours * 3600000).toISOString();
  }

  if (method === 'catalog') storedMethod = 'board';
  if (method === 'overboard') {
    storedMethod = 'board';
    if (!board_id) board_id = getBoards()[0]?.id;
  }
  if (method === 'hall_of_fame') storedMethod = 'hall_of_fame';

  const post = {
    id,
    method: storedMethod,
    board_id,
    parent_id: parent_id || null,
    author: author.trim(),
    title: title.trim(),
    content: content.trim(),
    recipient: recipient?.trim() || null,
    image_url: image_url || null,
    reply_count: 0,
    view_count: 0,
    score: 0,
    featured: featured ? 1 : 0,
    expires_at,
    created_at: now(),
    deleted_at: null,
  };

  insertPost(post);

  if (parent_id) {
    const parent = getPost(parent_id);
    if (parent) updatePost(parent_id, { reply_count: (parent.reply_count || 0) + 1 });
  }

  res.status(201).json(enrichPost(post));
});

router.post('/post/:id/reply', (req, res) => {
  const parent = getPost(req.params.id);
  if (!parent) return res.status(404).json({ error: 'Parent post not found' });

  const { author = 'Anonymous', content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Content is required' });

  const id = uuidv4();
  const reply = {
    id,
    method: parent.method,
    board_id: parent.board_id,
    parent_id: parent.id,
    author: author.trim(),
    title: '',
    content: content.trim(),
    recipient: null,
    image_url: null,
    reply_count: 0,
    view_count: 0,
    score: 0,
    featured: 0,
    expires_at: null,
    created_at: now(),
    deleted_at: null,
  };

  insertPost(reply);
  updatePost(parent.id, { reply_count: (parent.reply_count || 0) + 1 });

  res.status(201).json(enrichPost(reply));
});

router.post('/post/:id/upvote', (req, res) => {
  const post = getPost(req.params.id);
  if (!post || !isActive(post)) return res.status(404).json({ error: 'Post not found' });

  const score = (post.score || 0) + 1;
  const updates = { score };
  if (score >= 10 && !post.featured) updates.featured = 1;
  updatePost(req.params.id, updates);

  res.json({ score });
});

router.post('/post/:id/feature', (req, res) => {
  const post = getPost(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  updatePost(req.params.id, { featured: 1 });
  res.json({ featured: true });
});

router.delete('/post/:id', (req, res) => {
  const post = getPost(req.params.id);
  if (!post || isDeleted(post)) return res.status(404).json({ error: 'Post not found' });
  updatePost(req.params.id, { deleted_at: now() });
  res.json({ deleted: true });
});

module.exports = router;
