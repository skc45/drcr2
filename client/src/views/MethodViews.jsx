import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { fetchPosts, fetchBoards } from '../api';
import PostCard, { CatalogCard, FeedItem } from '../components/PostCard';
import ComposeModal from '../components/ComposeModal';
import { METHODS } from '../constants';

function useMethodPage(method) {
  const [searchParams] = useSearchParams();
  const [posts, setPosts] = useState([]);
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCompose, setShowCompose] = useState(false);

  const board = searchParams.get('board') || '';
  const q = searchParams.get('q') || '';
  const user = localStorage.getItem('drcr2_user') || 'Anonymous';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (board) params.board = board;
      if (q) params.q = q;
      if (method === 'mail') params.user = user;

      const [postData, boardData] = await Promise.all([
        fetchPosts(method, params),
        fetchBoards(),
      ]);
      setPosts(postData);
      setBoards(boardData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [method, board, q, user]);

  useEffect(() => {
    load();
  }, [load]);

  return { posts, boards, loading, error, showCompose, setShowCompose, load, board, q, user };
}

function TopBar({ method, onCompose, children }) {
  const meta = METHODS[method];
  return (
    <header className="topbar">
      <div>
        <h2>{meta.icon} {meta.label}</h2>
        <p className="topbar-desc">{meta.description}</p>
      </div>
      <div className="topbar-actions">
        {children}
        <button className="btn btn-primary" onClick={onCompose}>+ New Post</button>
      </div>
    </header>
  );
}

export function TrashView() {
  const { posts, boards, loading, error, showCompose, setShowCompose, load } = useMethodPage('trash');

  return (
    <>
      <TopBar method="trash" onCompose={() => setShowCompose(true)} />
      <div className="content">
        {error && <div className="error-banner">{error}</div>}
        {loading ? <p className="empty-state">Loading…</p> : posts.length === 0 ? (
          <div className="empty-state"><h3>Trash is empty</h3><p>Ephemeral posts and deleted content appear here.</p></div>
        ) : (
          <div className="post-list">{posts.map((p) => <PostCard key={p.id} post={p} onRefresh={load} />)}</div>
        )}
      </div>
      {showCompose && <ComposeModal method="trash" boards={boards} onClose={() => setShowCompose(false)} onCreated={load} />}
    </>
  );
}

export function BoardView() {
  const { posts, boards, loading, error, showCompose, setShowCompose, load, board } = useMethodPage('board');
  const [, setSearchParams] = useSearchParams();

  return (
    <>
      <TopBar method="board" onCompose={() => setShowCompose(true)}>
        <select className="filter-select" value={board} onChange={(e) => setSearchParams(e.target.value ? { board: e.target.value } : {})}>
          <option value="">All boards</option>
          {boards.map((b) => <option key={b.id} value={b.slug}>/{b.slug}/</option>)}
        </select>
      </TopBar>
      <div className="content">
        {error && <div className="error-banner">{error}</div>}
        {loading ? <p className="empty-state">Loading…</p> : posts.length === 0 ? (
          <div className="empty-state"><h3>No threads yet</h3><p>Start a discussion on a board.</p></div>
        ) : (
          <div className="post-list">{posts.map((p) => <PostCard key={p.id} post={p} onRefresh={load} />)}</div>
        )}
      </div>
      {showCompose && <ComposeModal method="board" boards={boards} defaults={{ board_slug: board || boards[0]?.slug }} onClose={() => setShowCompose(false)} onCreated={load} />}
    </>
  );
}

export function CatalogView() {
  const { posts, boards, loading, error, showCompose, setShowCompose, load, board } = useMethodPage('catalog');
  const [, setSearchParams] = useSearchParams();

  return (
    <>
      <TopBar method="catalog" onCompose={() => setShowCompose(true)}>
        <select className="filter-select" value={board} onChange={(e) => setSearchParams(e.target.value ? { board: e.target.value } : {})}>
          <option value="">All boards</option>
          {boards.map((b) => <option key={b.id} value={b.slug}>/{b.slug}/</option>)}
        </select>
      </TopBar>
      <div className="content">
        {error && <div className="error-banner">{error}</div>}
        {loading ? <p className="empty-state">Loading…</p> : posts.length === 0 ? (
          <div className="empty-state"><h3>Catalog empty</h3><p>No threads to display.</p></div>
        ) : (
          <div className="catalog-grid">{posts.map((p) => <CatalogCard key={p.id} post={p} />)}</div>
        )}
      </div>
      {showCompose && <ComposeModal method="catalog" boards={boards} defaults={{ board_slug: board || boards[0]?.slug }} onClose={() => setShowCompose(false)} onCreated={load} />}
    </>
  );
}

export function FeedView() {
  const { posts, boards, loading, error, showCompose, setShowCompose, load } = useMethodPage('feed');

  return (
    <>
      <TopBar method="feed" onCompose={() => setShowCompose(true)} />
      <div className="content">
        {error && <div className="error-banner">{error}</div>}
        {loading ? <p className="empty-state">Loading…</p> : posts.length === 0 ? (
          <div className="empty-state"><h3>Feed is quiet</h3><p>Activity from boards and articles will show here.</p></div>
        ) : (
          <div className="feed-timeline">{posts.map((p) => <FeedItem key={p.id} post={p} />)}</div>
        )}
      </div>
      {showCompose && <ComposeModal method="feed" boards={boards} onClose={() => setShowCompose(false)} onCreated={load} />}
    </>
  );
}

export function MailView() {
  const { posts, boards, loading, error, showCompose, setShowCompose, load, user } = useMethodPage('mail');

  return (
    <>
      <TopBar method="mail" onCompose={() => setShowCompose(true)} />
      <div className="content">
        {error && <div className="error-banner">{error}</div>}
        <div className="mail-layout">
          <div className="mail-compose">
            <h3 style={{ marginBottom: '0.75rem' }}>Compose</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Sending as <strong>{user}</strong>. Set your name in the sidebar.
            </p>
            <button className="btn btn-primary" onClick={() => setShowCompose(true)}>Write Mail</button>
          </div>
          <div className="mail-inbox">
            <h3 style={{ marginBottom: '0.75rem' }}>Inbox & Sent</h3>
            {loading ? <p className="empty-state">Loading…</p> : posts.length === 0 ? (
              <div className="empty-state"><p>No mail yet.</p></div>
            ) : (
              <div className="post-list">{posts.map((p) => <PostCard key={p.id} post={p} onRefresh={load} />)}</div>
            )}
          </div>
        </div>
      </div>
      {showCompose && <ComposeModal method="mail" boards={boards} defaults={{ author: user }} onClose={() => setShowCompose(false)} onCreated={load} />}
    </>
  );
}

export function ArticleView() {
  const { posts, boards, loading, error, showCompose, setShowCompose, load } = useMethodPage('article');

  return (
    <>
      <TopBar method="article" onCompose={() => setShowCompose(true)} />
      <div className="content">
        {error && <div className="error-banner">{error}</div>}
        {loading ? <p className="empty-state">Loading…</p> : posts.length === 0 ? (
          <div className="empty-state"><h3>No articles yet</h3><p>Publish long-form content here.</p></div>
        ) : (
          <div className="post-list">{posts.map((p) => <PostCard key={p.id} post={p} variant="article" onRefresh={load} />)}</div>
        )}
      </div>
      {showCompose && <ComposeModal method="article" boards={boards} onClose={() => setShowCompose(false)} onCreated={load} />}
    </>
  );
}

export function OverboardView() {
  const { posts, boards, loading, error, showCompose, setShowCompose, load } = useMethodPage('overboard');

  return (
    <>
      <TopBar method="overboard" onCompose={() => setShowCompose(true)} />
      <div className="content">
        {error && <div className="error-banner">{error}</div>}
        {loading ? <p className="empty-state">Loading…</p> : posts.length === 0 ? (
          <div className="empty-state"><h3>Overboard is empty</h3><p>Recent posts from all boards appear here.</p></div>
        ) : (
          <div className="post-list">{posts.map((p) => <PostCard key={p.id} post={p} onRefresh={load} />)}</div>
        )}
      </div>
      {showCompose && <ComposeModal method="overboard" boards={boards} onClose={() => setShowCompose(false)} onCreated={load} />}
    </>
  );
}

export function HallOfFameView() {
  const { posts, boards, loading, error, showCompose, setShowCompose, load } = useMethodPage('hall_of_fame');

  return (
    <>
      <TopBar method="hall_of_fame" onCompose={() => setShowCompose(true)} />
      <div className="content">
        {error && <div className="error-banner">{error}</div>}
        {loading ? <p className="empty-state">Loading…</p> : posts.length === 0 ? (
          <div className="empty-state"><h3>Hall of Fame is empty</h3><p>Upvote posts to 10+ or feature them to earn a spot.</p></div>
        ) : (
          <div className="post-list">{posts.map((p) => <PostCard key={p.id} post={p} variant="hof" onRefresh={load} />)}</div>
        )}
      </div>
      {showCompose && <ComposeModal method="hall_of_fame" boards={boards} onClose={() => setShowCompose(false)} onCreated={load} />}
    </>
  );
}

export function ThreadView() {
  const { id } = useParams();
  const [thread, setThread] = useState(null);
  const [reply, setReply] = useState('');
  const [author, setAuthor] = useState(localStorage.getItem('drcr2_user') || 'Anonymous');
  const [error, setError] = useState('');

  async function load() {
    try {
      const { fetchPost } = await import('../api');
      setThread(await fetchPost(id));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function handleReply(e) {
    e.preventDefault();
    const { replyToPost } = await import('../api');
    await replyToPost(id, { author, content: reply });
    setReply('');
    load();
  }

  if (error) return <div className="content"><div className="error-banner">{error}</div></div>;
  if (!thread) return <div className="content"><p className="empty-state">Loading thread…</p></div>;

  return (
    <div className="content thread-view">
      <Link to={`/${thread.method === 'board' ? 'board' : thread.method}`} style={{ fontSize: '0.85rem' }}>← Back</Link>
      <div className="thread-op" style={{ marginTop: '1rem' }}>
        <PostCard post={thread} onRefresh={load} />
      </div>
      <h3 style={{ marginBottom: '0.75rem' }}>{thread.replies?.length || 0} Replies</h3>
      <div className="reply-list">
        {thread.replies?.map((r) => (
          <div key={r.id} className="reply-card">
            <div className="post-meta"><span>{r.author}</span></div>
            <div className="post-body">{r.content}</div>
          </div>
        ))}
      </div>
      <form className="reply-form" onSubmit={handleReply}>
        <div className="form-group">
          <label>Reply as</label>
          <input value={author} onChange={(e) => setAuthor(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Your reply</label>
          <textarea value={reply} onChange={(e) => setReply(e.target.value)} required />
        </div>
        <button type="submit" className="btn btn-primary">Reply</button>
      </form>
    </div>
  );
}

export function HomeView() {
  return (
    <div className="content">
      <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Welcome to DRCR2</h2>
      <p style={{ color: 'var(--muted)', marginBottom: '2rem', maxWidth: '540px' }}>
        A messaging platform with eight distinct posting methods. Choose a channel from the sidebar to get started.
      </p>
      <div className="catalog-grid">
        {Object.entries(METHODS).map(([key, m]) => (
          <Link key={key} to={`/${key}`} className="catalog-card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="catalog-thumb">{m.icon}</div>
            <div className="catalog-body">
              <h3>{m.label}</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{m.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
