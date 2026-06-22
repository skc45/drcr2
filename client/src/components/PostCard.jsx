import { Link } from 'react-router-dom';
import { upvotePost, deletePost } from '../api';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso.includes('T') ? iso : iso + 'Z');
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function PostCard({ post, variant = 'default', onRefresh }) {
  async function handleUpvote(e) {
    e.preventDefault();
    e.stopPropagation();
    await upvotePost(post.id);
    onRefresh?.();
  }

  async function handleDelete(e) {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Move this post to trash?')) {
      await deletePost(post.id);
      onRefresh?.();
    }
  }

  const cardClass = ['post-card', variant === 'hof' ? 'hof-card' : '', variant === 'article' ? 'article-card' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <article className={cardClass}>
      <div className="post-card-header">
        <div className="post-meta">
          <span>{post.author}</span>
          {post.board_slug && <span>/{post.board_slug}/</span>}
          <span>{formatDate(post.created_at)}</span>
          {post.expires_at && <span>expires {formatDate(post.expires_at)}</span>}
        </div>
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {post.featured ? <span className="badge badge-hof">Featured</span> : null}
          {post.method && <span className={`badge badge-${post.method === 'hall_of_fame' ? 'hof' : post.method}`}>{post.method}</span>}
        </div>
      </div>
      {post.title && (
        <h3 className="post-title">
          <Link to={`/post/${post.id}`}>{post.title || '(untitled)'}</Link>
        </h3>
      )}
      <div className="post-body">{post.content}</div>
      {post.recipient && (
        <div className="post-meta" style={{ marginTop: '0.5rem' }}>
          To: {post.recipient}
        </div>
      )}
      <div className="post-footer">
        {variant === 'hof' && <span className="hof-score">★ {post.score}</span>}
        <span>{post.reply_count || 0} replies</span>
        <span>{post.view_count || 0} views</span>
        {post.score > 0 && variant !== 'hof' && <span>★ {post.score}</span>}
        <button onClick={handleUpvote}>▲ upvote</button>
        {!post.deleted_at && <button onClick={handleDelete}>delete</button>}
        <Link to={`/post/${post.id}`}>open</Link>
      </div>
    </article>
  );
}

export function CatalogCard({ post }) {
  return (
    <Link to={`/post/${post.id}`} className="catalog-card">
      <div className="catalog-thumb">{post.image_url ? '🖼' : '💬'}</div>
      <div className="catalog-body">
        <h3>{post.title || post.content.slice(0, 40)}</h3>
        <div className="post-meta">
          <span>/{post.board_slug}/</span>
          <span>{post.reply_count} replies</span>
        </div>
      </div>
    </Link>
  );
}

export function FeedItem({ post }) {
  return (
    <div className="feed-item">
      <PostCard post={post} />
    </div>
  );
}
