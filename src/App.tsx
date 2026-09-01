import { useMemo, useState } from 'react';
import { OPS, parseToken, type Op, type Token } from './token';

const START: Token = { type: 'op', value: '+' };

export default function App() {
  const [raw, setRaw] = useState<string>('+');

  const token: Token | null = useMemo(() => parseToken(raw), [raw]);

  function setOp(op: Op) {
    setRaw(op);
  }

  return (
    <div className="shell">
      <header className="hero">
        <p className="kicker">DRCR2</p>
        <h1>op</h1>
        <p className="lede">One token. It is an op.</p>
      </header>

      <div className="examples">
        {OPS.map((op) => (
          <button
            key={op}
            type="button"
            className={token?.value === op ? 'pill on' : 'pill'}
            onClick={() => setOp(op)}
          >
            {op}
          </button>
        ))}
      </div>

      <form className="composer" onSubmit={(e) => e.preventDefault()}>
        <label className="sr-only" htmlFor="token">Token</label>
        <input
          id="token"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="+"
          spellCheck={false}
          autoComplete="off"
        />
        {token !== null ? (
          <div className="math-preview ok">
            <div className="math-result">
              type: {token.type}
              <span className="sep">·</span>
              value: {token.value}
            </div>
            <p className="hint">Token is {START.type}. Value is Op.</p>
          </div>
        ) : (
          <div className="math-preview err">Not an op. Use + − * / or plus, minus, times, divided.</div>
        )}
      </form>
    </div>
  );
}
