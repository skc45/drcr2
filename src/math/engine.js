const KM_IN_MILES = 1 / 1.609344;

const WORDS = [
  [/what(?:'s| is)/gi, ''],
  [/please\s+/gi, ''],
  [/calculate\s+/gi, ''],
  [/compute\s+/gi, ''],
  [/multiplied\s+by/gi, '*'],
  [/divided\s+by/gi, '/'],
  [/times/gi, '*'],
  [/plus/gi, '+'],
  [/minus/gi, '-'],
];

export function rewriteWords(raw) {
  let s = String(raw ?? '').trim();
  for (const [re, to] of WORDS) s = s.replace(re, to);
  return s.replace(/\s+/g, ' ').trim();
}

export function formatNumber(n) {
  if (!Number.isFinite(n)) return String(n);
  const nearest = Math.round(n);
  if (Math.abs(n - nearest) < 1e-10) return String(nearest);
  return String(Number(n.toPrecision(12)));
}

function convertKmMiles(text) {
  const m = text.match(
    /^\s*(-?[\d.]+)\s*(k(?:m|ilometers?)|mi(?:les?)?)\s+(?:in|to|into)\s*(k(?:m|ilometers?)|mi(?:les?)?)\s*$/i
  );
  if (!m) return null;
  const qty = Number(m[1]);
  if (!Number.isFinite(qty)) return null;
  const fromKm = /^k/i.test(m[2]);
  const toKm = /^k/i.test(m[3]);
  if (fromKm === toKm) {
    return { value: qty, from: m[2], to: m[3], identity: true };
  }
  const value = fromKm ? qty * KM_IN_MILES : qty / KM_IN_MILES;
  return { value, from: m[2], to: m[3], fromKm };
}

function tokenizeExpr(src) {
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i += 1;
      continue;
    }
    if ('+-*/()'.includes(c)) {
      tokens.push({ type: c === '(' ? 'LP' : c === ')' ? 'RP' : 'OP', value: c });
      i += 1;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      const m = src.slice(i).match(/^\d*\.?\d+/);
      if (!m) throw new Error('bad number');
      tokens.push({ type: 'NUM', value: Number(m[0]) });
      i += m[0].length;
      continue;
    }
    throw new Error(`unexpected "${c}"`);
  }
  return tokens;
}

function evaluateExpression(src) {
  const tokens = tokenizeExpr(src);
  let i = 0;
  const peek = () => tokens[i];
  const eat = (type, value) => {
    const t = tokens[i];
    if (!t || t.type !== type || (value != null && t.value !== value)) return null;
    i += 1;
    return t;
  };

  function add() {
    let n = mul();
    for (;;) {
      if (eat('OP', '+')) n += mul();
      else if (eat('OP', '-')) n -= mul();
      else break;
    }
    return n;
  }

  function mul() {
    let n = unary();
    for (;;) {
      if (eat('OP', '*')) n *= unary();
      else if (eat('OP', '/')) {
        const d = unary();
        if (d === 0) throw new Error('Division by zero');
        n /= d;
      } else break;
    }
    return n;
  }

  function unary() {
    if (eat('OP', '+')) return unary();
    if (eat('OP', '-')) return -unary();
    return primary();
  }

  function primary() {
    const num = eat('NUM');
    if (num) return num.value;
    if (eat('LP', '(')) {
      const n = add();
      if (!eat('RP', ')')) throw new Error('missing )');
      return n;
    }
    throw new Error('expected a number');
  }

  if (!tokens.length) throw new Error('empty');
  const value = add();
  if (i < tokens.length) throw new Error('trailing input');
  return value;
}

export function looksLikeMath(text) {
  const t = String(text ?? '').trim();
  if (!t) return false;
  if (convertKmMiles(t) || convertKmMiles(rewriteWords(t))) return true;
  if (/\b(plus|minus|times|divided|multiplied)\b/i.test(t)) return true;
  return false;
}

export function smartMath(input) {
  const original = String(input ?? '').trim();
  if (!original) return { ok: false, error: 'empty', input: original, steps: [] };

  try {
    const conv = convertKmMiles(original) || convertKmMiles(rewriteWords(original));
    if (conv) {
      const toName = /^k/i.test(conv.to) ? 'km' : 'miles';
      return {
        ok: true,
        kind: 'convert',
        input: original,
        result: `${formatNumber(conv.value)} ${toName}`,
        numeric: conv.value,
        steps: conv.identity
          ? [`${formatNumber(conv.value)} ${toName}`]
          : [
              conv.fromKm
                ? `${formatNumber(Number(original.match(/-?[\d.]+/)[0]))} km × (1 / 1.609344)`
                : `${formatNumber(Number(original.match(/-?[\d.]+/)[0]))} miles × 1.609344`,
              `= ${formatNumber(conv.value)} ${toName}`,
            ],
      };
    }

    if (!/\b(plus|minus|times|divided|multiplied|what)\b/i.test(original)) {
      return { ok: false, error: 'Ask “5 km in miles” or “what is 2 plus 2”.', input: original, steps: [] };
    }

    const rewritten = rewriteWords(original);
    const numeric = evaluateExpression(rewritten);
    return {
      ok: true,
      kind: 'words',
      input: original,
      result: formatNumber(numeric),
      numeric,
      steps: rewritten !== original ? [`read as: ${rewritten}`, `= ${formatNumber(numeric)}`] : [`= ${formatNumber(numeric)}`],
    };
  } catch (err) {
    return { ok: false, kind: 'error', input: original, error: err.message || String(err), steps: [] };
  }
}
