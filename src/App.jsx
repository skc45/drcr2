import { useEffect, useMemo, useState } from 'react';
import { smartMath, looksLikeMath } from './math/engine.js';
import {
  TTL_PRESETS,
  createNote,
  listNotes,
  sweep,
  deleteNote,
  remainingMs,
  progress,
  formatRemaining,
} from './expire/store.js';

function useTicker(ms = 100) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export default function App() {
  const now = useTicker(120);
  const [body, setBody] = useState('');
  const [ttlMs, setTtlMs] = useState(TTL_PRESETS[2].ms);
  const [notes, setNotes] = useState(() => listNotes());
  const [error, setError] = useState('');
  const [vanishing, setVanishing] = useState(() => new Set());

  const preview = useMemo(() => {
    if (!looksLikeMath(body)) return null;
    return smartMath(body);
  }, [body]);

  useEffect(() => {
    const { live, gone } = sweep(now);
    if (gone.length) {
      setVanishing((prev) => {
        const next = new Set(prev);
        gone.forEach((g) => next.add(g.id));
        return next;
      });
      window.setTimeout(() => {
        setVanishing((prev) => {
          const next = new Set(prev);
          gone.forEach((g) => next.delete(g.id));
          return next;
        });
      }, 650);
    }
    setNotes(live);
  }, [now]);

  function publish(e) {
    e.preventDefault();
    setError('');
    try {
      const math = looksLikeMath(body) ? smartMath(body) : null;
      createNote({
        body,
        ttlMs,
        math: math?.ok ? math : math?.error ? { ok: false, error: math.error } : null,
      });
      setNotes(listNotes());
      setBody('');
    } catch (err) {
      setError(err.message);
    }
  }

  function burn(id) {
    deleteNote(id);
    setNotes(listNotes());
  }

  return (
    <div className="shell">
      <header className="hero">
        <p className="kicker">DRCR2</p>
        <h1>Expire</h1>
        <p className="lede">
          Notes that auto-delete on a timer. If you write math, the engine parses it, evaluates it,
          and shows the steps — then the whole thing vanishes.
        </p>
      </header>

      <form className="composer" onSubmit={publish}>
        <label className="sr-only" htmlFor="note">Note</label>
        <textarea
          id="note"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="2x + 5 = 17   ·   15% of 80   ·   sin(30deg)   ·   a disappearing thought"
          rows={4}
        />
        {preview?.ok && (
          <div className="math-preview ok">
            <div className="math-result">{preview.result}</div>
            {preview.steps?.length > 0 && (
              <ol>
                {preview.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            )}
          </div>
        )}
        {preview && !preview.ok && looksLikeMath(body) && (
          <div className="math-preview err">{preview.error}</div>
        )}

        <div className="composer-row">
          <div className="ttl-pills" role="group" aria-label="Time to live">
            {TTL_PRESETS.map((p) => (
              <button
                key={p.ms}
                type="button"
                className={ttlMs === p.ms ? 'pill on' : 'pill'}
                onClick={() => setTtlMs(p.ms)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button type="submit" className="go" disabled={!body.trim()}>
            Drop · auto-expire
          </button>
        </div>
        {error && <p className="form-error">{error}</p>}
      </form>

      <section className="feed">
        {notes.length === 0 && vanishing.size === 0 ? (
          <p className="empty">Nothing live. Drop a note — it will burn when the timer hits zero.</p>
        ) : (
          notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              now={now}
              fading={vanishing.has(note.id)}
              onBurn={() => burn(note.id)}
            />
          ))
        )}
      </section>
    </div>
  );
}

function NoteCard({ note, now, fading, onBurn }) {
  const left = remainingMs(note, now);
  const pct = progress(note, now);
  return (
    <article className={`card${fading ? ' fade' : ''}${left < 4000 ? ' urgent' : ''}`}>
      <div className="card-top">
        <span className="timer" style={{ '--p': String(pct) }}>
          <span className="timer-label">{formatRemaining(left)}</span>
        </span>
        <button type="button" className="burn" onClick={onBurn}>
          burn now
        </button>
      </div>
      <p className="body">{note.body}</p>
      {note.math?.ok && (
        <div className="math-block">
          <div className="math-result">{note.math.result}</div>
          {note.math.steps?.length > 0 && (
            <ol>
              {note.math.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          )}
        </div>
      )}
      {note.math && !note.math.ok && note.math.error && (
        <p className="math-miss">Math engine: {note.math.error}</p>
      )}
    </article>
  );
}
