import { useMemo, useState } from 'react';
import { smartMath } from './math/engine.js';

const EXAMPLES = ['5 km in miles', 'what is 2 plus 2'];

export default function App() {
  const [body, setBody] = useState('');

  const preview = useMemo(() => {
    if (!body.trim()) return null;
    return smartMath(body);
  }, [body]);

  return (
    <div className="shell">
      <header className="hero">
        <p className="kicker">DRCR2</p>
        <h1>Ask</h1>
        <p className="lede">Two things only: convert kilometres to miles, or say a sum in words.</p>
      </header>

      <div className="examples">
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" className="pill" onClick={() => setBody(ex)}>
            {ex}
          </button>
        ))}
      </div>

      <form className="composer" onSubmit={(e) => e.preventDefault()}>
        <label className="sr-only" htmlFor="ask">Question</label>
        <textarea
          id="ask"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="5 km in miles   ·   what is 2 plus 2"
          rows={3}
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
        {preview && !preview.ok && body.trim() && (
          <div className="math-preview err">{preview.error}</div>
        )}
      </form>
    </div>
  );
}
