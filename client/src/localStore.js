const STORAGE_KEY = 'drcr2_data';

const METHODS = ['trash', 'board', 'catalog', 'feed', 'mail', 'article', 'overboard', 'hall_of_fame'];

function uuidv4() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function now() {
  return new Date().toISOString();
}

function seedBoards() {
  const defaults = [
    { slug: 'general', name: 'General', description: 'Open discussion' },
    { slug: 'tech', name: 'Tech', description: 'Technology and programming' },
    { slug: 'creative', name: 'Creative', description: 'Art, music, and writing' },
    { slug: 'random', name: 'Random', description: 'Off-topic fun' },
  ];
  return defaults.map((b) => ({ id: uuidv4(), ...b }));
}

function emptyData() {
  return { boards: seedBoards(), posts: [] };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const data = emptyData();
      save(data);
      return data;
    }
    const data = JSON.parse(raw);
    if (!Array.isArray(data.boards) || data.boards.length === 0) {
      data.boards = seedBoards();
      save(data);
    }
    if (!Array.isArray(data.posts)) data.posts = [];
    return data;
  } catch {
    const data = emptyData();
    save(data);
    return data;
  }
}

function save(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function persist(mutator) {
  const data = load();
  const result = mutator(data);
  save(data);
  return result;
}

function getBoardBySlug(data, slug) {
  return data.boards.find((b) => b.slug === slug);
}

function getBoardById(data, id) {
  return data.boards.find((b) => b.id === id);
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

function enrichPost(data, post) {
  if (!post) return null;
  const board = post.board_id ? getBoardById(data, post.board_id) : null;
  return {
    ...post,
    board_slug: board?.slug,
    board_name: board?.name,
  };
}

function queryPosts(data, filterFn, sortFn, limit = 50) {
  return data.posts
    .filter(filterFn)
    .sort(sortFn)
    .slice(0, limit)
    .map((p) => enrichPost(data, p));
}

export function getBoards() {
  const data = load();
  return [...data.boards].sort((a, b) => a.name.localeCompare(b.name));
}

export function listPosts(method, params = {}) {
  if (!METHODS.includes(method)) {
    throw new Error('Invalid posting method');
  }

  const data = load();
  const { board, q, user } = params;
  let posts = [];

  switch (method) {
    case 'trash':
      posts = queryPosts(
        data,
        (p) => isDeleted(p) || isExpired(p),
        (a, b) => new Date(b.deleted_at || b.expires_at) - new Date(a.deleted_at || a.expires_at),
        50
      );
      break;

    case 'board': {
      const boardId = board ? getBoardBySlug(data, board)?.id : null;
      if (board && !boardId) throw new Error('Board not found');
      posts = queryPosts(
        data,
        (p) => p.method === 'board' && !p.parent_id && isActive(p) && (!boardId || p.board_id === boardId),
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      break;
    }

    case 'catalog': {
      const boardId = board ? getBoardBySlug(data, board)?.id : null;
      posts = queryPosts(
        data,
        (p) => ['board', 'catalog'].includes(p.method) && !p.parent_id && isActive(p) && (!boardId || p.board_id === boardId),
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
        100
      );
      break;
    }

    case 'feed':
      posts = queryPosts(
        data,
        (p) => ['feed', 'board', 'article'].includes(p.method) && isActive(p),
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
        80
      );
      break;

    case 'mail': {
      if (!user) throw new Error('user query param required for mail');
      posts = queryPosts(
        data,
        (p) => p.method === 'mail' && isActive(p) && (p.author === user || p.recipient === user),
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      break;
    }

    case 'article':
      posts = queryPosts(
        data,
        (p) => p.method === 'article' && !p.parent_id && isActive(p),
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      break;

    case 'overboard':
      posts = queryPosts(
        data,
        (p) => p.method === 'board' && !p.parent_id && isActive(p),
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
        100
      );
      break;

    case 'hall_of_fame':
      posts = queryPosts(
        data,
        (p) => isActive(p) && (p.featured || p.method === 'hall_of_fame' || p.score >= 10),
        (a, b) => b.score - a.score || new Date(b.created_at) - new Date(a.created_at)
      );
      break;

    default:
      posts = queryPosts(
        data,
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

  return posts;
}

export function getThread(id) {
  return persist((data) => {
    const post = data.posts.find((p) => p.id === id);
    if (!post) throw new Error('Post not found');
    post.view_count = (post.view_count || 0) + 1;
    const replies = queryPosts(
      data,
      (p) => p.parent_id === id && isActive(p),
      (a, b) => new Date(a.created_at) - new Date(b.created_at),
      500
    );
    return { ...enrichPost(data, post), replies };
  });
}

export function createPost(method, body) {
  if (!METHODS.includes(method)) {
    throw new Error('Invalid posting method');
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
  } = body;

  if (!content?.trim()) {
    throw new Error('Content is required');
  }

  return persist((data) => {
    let board_id = null;
    if (board_slug) {
      const b = getBoardBySlug(data, board_slug);
      if (!b) throw new Error('Board not found');
      board_id = b.id;
    }

    if (method === 'mail' && !recipient?.trim()) {
      throw new Error('Recipient required for mail');
    }

    if ((method === 'board' || method === 'catalog') && !board_id && !parent_id) {
      throw new Error('Board required for new threads');
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
      if (!board_id) board_id = data.boards[0]?.id;
    }
    if (method === 'hall_of_fame') storedMethod = 'hall_of_fame';

    const post = {
      id,
      method: storedMethod,
      board_id,
      parent_id: parent_id || null,
      author: String(author).trim() || 'Anonymous',
      title: String(title).trim(),
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

    data.posts.unshift(post);

    if (parent_id) {
      const parent = data.posts.find((p) => p.id === parent_id);
      if (parent) parent.reply_count = (parent.reply_count || 0) + 1;
    }

    return enrichPost(data, post);
  });
}

export function replyToPost(id, body) {
  const { author = 'Anonymous', content } = body;
  if (!content?.trim()) throw new Error('Content is required');

  return persist((data) => {
    const parent = data.posts.find((p) => p.id === id);
    if (!parent) throw new Error('Parent post not found');

    const reply = {
      id: uuidv4(),
      method: parent.method,
      board_id: parent.board_id,
      parent_id: parent.id,
      author: String(author).trim() || 'Anonymous',
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

    data.posts.unshift(reply);
    parent.reply_count = (parent.reply_count || 0) + 1;
    return enrichPost(data, reply);
  });
}

export function upvotePost(id) {
  return persist((data) => {
    const post = data.posts.find((p) => p.id === id);
    if (!post || !isActive(post)) throw new Error('Post not found');
    post.score = (post.score || 0) + 1;
    if (post.score >= 10 && !post.featured) post.featured = 1;
    return { score: post.score };
  });
}

export function featurePost(id) {
  return persist((data) => {
    const post = data.posts.find((p) => p.id === id);
    if (!post) throw new Error('Post not found');
    post.featured = 1;
    return { featured: true };
  });
}

export function deletePost(id) {
  return persist((data) => {
    const post = data.posts.find((p) => p.id === id);
    if (!post || isDeleted(post)) throw new Error('Post not found');
    post.deleted_at = now();
    return { deleted: true };
  });
}
