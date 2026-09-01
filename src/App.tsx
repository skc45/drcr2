import { useMemo, useState, type FormEvent } from 'react';
import { smartMath, type MathResult } from './math/engine';

const EXAMPLES = ['5 km in miles', 'what is 2 plus 2'] as const;
type Example = (typeof EXAMPLES)[number];

export default function App() {
  const [body, setBody] = useState<string>('');

  const preview: MathResult | null = useMemo(() => {
    if (body.trim() === '') return null;
    return smartMath(body);
  }, [body]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
  }

  return (
    <div className="shell">
      <header className="hero">
        <p className="kicker">DRCR2</p>
        <h1>Ask</h1>
        <p className="lede">Two things only: convert kilometres to miles, or say a sum in words.</p>
      </header>

      <div className="examples">
        {EXAMPLES.map((ex: Example) => (
          <button key={ex} type="button" className="pill" onClick={() => setBody(ex)}>
            {ex}
          </button>
        ))}
      </div>

      <form className="composer" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="ask">Question</label>
        <textarea
          id="ask"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="5 km in miles   ·   what is 2 plus 2"
          rows={3}
        />
        {preview?.ok === true && (
          <div className="math-preview ok">
            <div className="math-result">{preview.result}</div>
            {preview.steps.length > 0 && (
              <ol>
                {preview.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            )}
          </div>
        )}
        {preview?.ok === false && body.trim() !== '' && (
          <div className="math-preview err">{preview.error}</div>
        )}
      </form>
    </div>
  );
}
