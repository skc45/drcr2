import { useState } from 'react';
import { createPost, getUsername } from '../api';

export default function ComposeModal({ method, boards, onClose, onCreated, defaults = {} }) {
  const [author, setAuthor] = useState(defaults.author || getUsername());
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [board_slug, setBoardSlug] = useState(defaults.board_slug || boards[0]?.slug || '');
  const [recipient, setRecipient] = useState('');
  const [ttl_hours, setTtlHours] = useState(24);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const post = await createPost(method, {
        author: author || undefined,
        title,
        content,
        board_slug: board_slug || undefined,
        recipient: recipient || undefined,
        ttl_hours: method === 'trash' ? ttl_hours : undefined,
      });
      onCreated(post);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const showBoard = ['board', 'catalog', 'overboard'].includes(method);
  const showTitle = ['board', 'catalog', 'article', 'hall_of_fame'].includes(method);
  const showRecipient = method === 'mail';
  const showTtl = method === 'trash';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>New {method.replace('_', ' ')} post</h3>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Anonymous" />
          </div>
          {showBoard && (
            <div className="form-group">
              <label>Board</label>
              <select value={board_slug} onChange={(e) => setBoardSlug(e.target.value)}>
                {boards.map((b) => (
                  <option key={b.id} value={b.slug}>
                    /{b.slug}/ — {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {showRecipient && (
            <div className="form-group">
              <label>To</label>
              <input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Recipient username" required />
            </div>
          )}
          {showTitle && (
            <div className="form-group">
              <label>Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Thread title" />
            </div>
          )}
          {showTtl && (
            <div className="form-group">
              <label>Expires in (hours)</label>
              <input type="number" min={1} max={168} value={ttl_hours} onChange={(e) => setTtlHours(Number(e.target.value))} />
            </div>
          )}
          <div className="form-group">
            <label>{method === 'mail' ? 'Message' : 'Content'}</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} required placeholder="What's on your mind?" />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Posting…' : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
