export const KM_PER_MILE = 1.609344;
const MILES_PER_KM = 1 / KM_PER_MILE;

export type DistanceUnit = 'km' | 'miles';
export type Op = '+' | '-' | '*' | '/';

export type NumToken = { readonly type: 'NUM'; readonly value: number };
export type OpToken = { readonly type: 'OP'; readonly value: Op };
export type LpToken = { readonly type: 'LP' };
export type RpToken = { readonly type: 'RP' };
export type Token = NumToken | OpToken | LpToken | RpToken;

export type ConvertHit = {
  readonly qty: number;
  readonly value: number;
  readonly from: DistanceUnit;
  readonly to: DistanceUnit;
};

export type MathOk = {
  readonly ok: true;
  readonly kind: 'convert' | 'words';
  readonly input: string;
  readonly result: string;
  readonly numeric: number;
  readonly steps: readonly string[];
};

export type MathErr = {
  readonly ok: false;
  readonly kind: 'error';
  readonly input: string;
  readonly error: string;
  readonly steps: readonly [];
};

export type MathResult = MathOk | MathErr;

const WORDS: readonly (readonly [RegExp, string])[] = [
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

const OPS = new Set<string>(['+', '-', '*', '/']);

function isOp(value: string): value is Op {
  return OPS.has(value);
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function rewriteWords(raw: unknown): string {
  let s = String(raw ?? '').trim();
  for (const [re, to] of WORDS) s = s.replace(re, to);
  return s.replace(/\s+/g, ' ').trim();
}

export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  const nearest = Math.round(n);
  if (Math.abs(n - nearest) < 1e-10) return String(nearest);
  return String(Number(n.toPrecision(12)));
}

export function parseDistanceUnit(raw: string): DistanceUnit | null {
  const s = raw.toLowerCase();
  if (s === 'km' || s === 'kilometer' || s === 'kilometers') return 'km';
  if (s === 'mi' || s === 'mile' || s === 'miles') return 'miles';
  return null;
}

export function convertKmMiles(text: string): ConvertHit | null {
  const m = text.match(
    /^\s*(-?[\d.]+)\s*(k(?:m|ilometers?)|mi(?:les?)?)\s+(?:in|to|into)\s*(k(?:m|ilometers?)|mi(?:les?)?)\s*$/i
  );
  if (!m) return null;
  const qtyRaw = m[1];
  const fromRaw = m[2];
  const toRaw = m[3];
  if (qtyRaw === undefined || fromRaw === undefined || toRaw === undefined) return null;
  const qty = Number(qtyRaw);
  if (!Number.isFinite(qty)) return null;
  const from = parseDistanceUnit(fromRaw);
  const to = parseDistanceUnit(toRaw);
  if (from === null || to === null) return null;
  const value = from === to ? qty : from === 'km' ? qty * MILES_PER_KM : qty * KM_PER_MILE;
  return { qty, value, from, to };
}

function tokenizeExpr(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === undefined) break;
    if (/\s/.test(c)) {
      i += 1;
      continue;
    }
    if (c === '(') {
      tokens.push({ type: 'LP' });
      i += 1;
      continue;
    }
    if (c === ')') {
      tokens.push({ type: 'RP' });
      i += 1;
      continue;
    }
    if (isOp(c)) {
      tokens.push({ type: 'OP', value: c });
      i += 1;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      const m = src.slice(i).match(/^\d*\.?\d+/);
      if (!m) throw new Error('bad number');
      const lexeme = m[0];
      tokens.push({ type: 'NUM', value: Number(lexeme) });
      i += lexeme.length;
      continue;
    }
    throw new Error(`unexpected "${c}"`);
  }
  return tokens;
}

function evaluateExpression(src: string): number {
  const tokens = tokenizeExpr(src);
  let i = 0;

  const peek = (): Token | undefined => tokens[i];

  function eat(type: 'NUM'): NumToken | null;
  function eat(type: 'OP', value: Op): OpToken | null;
  function eat(type: 'LP'): LpToken | null;
  function eat(type: 'RP'): RpToken | null;
  function eat(type: Token['type'], value?: Op): Token | null {
    const t = tokens[i];
    if (!t || t.type !== type) return null;
    if (type === 'OP' && value !== undefined && t.type === 'OP' && t.value !== value) return null;
    i += 1;
    return t;
  }

  function add(): number {
    let n = mul();
    for (;;) {
      if (eat('OP', '+')) n += mul();
      else if (eat('OP', '-')) n -= mul();
      else break;
    }
    return n;
  }

  function mul(): number {
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

  function unary(): number {
    if (eat('OP', '+')) return unary();
    if (eat('OP', '-')) return -unary();
    return primary();
  }

  function primary(): number {
    const num = eat('NUM');
    if (num) return num.value;
    if (eat('LP')) {
      const n = add();
      if (!eat('RP')) throw new Error('missing )');
      return n;
    }
    throw new Error('expected a number');
  }

  if (tokens.length === 0) throw new Error('empty');
  const value = add();
  if (peek() !== undefined) throw new Error('trailing input');
  return value;
}

function fail(input: string, error: string): MathErr {
  return { ok: false, kind: 'error', input, error, steps: [] };
}

export function looksLikeMath(text: unknown): boolean {
  const t = String(text ?? '').trim();
  if (t === '') return false;
  if (convertKmMiles(t) !== null || convertKmMiles(rewriteWords(t)) !== null) return true;
  return /\b(plus|minus|times|divided|multiplied)\b/i.test(t);
}

export function smartMath(input: unknown): MathResult {
  const original = String(input ?? '').trim();
  if (original === '') return fail(original, 'empty');

  try {
    const conv = convertKmMiles(original) ?? convertKmMiles(rewriteWords(original));
    if (conv) {
      return {
        ok: true,
        kind: 'convert',
        input: original,
        result: `${formatNumber(conv.value)} ${conv.to}`,
        numeric: conv.value,
        steps:
          conv.from === conv.to
            ? [`${formatNumber(conv.value)} ${conv.to}`]
            : [
                conv.from === 'km'
                  ? `${formatNumber(conv.qty)} km × (1 / ${KM_PER_MILE})`
                  : `${formatNumber(conv.qty)} miles × ${KM_PER_MILE}`,
                `= ${formatNumber(conv.value)} ${conv.to}`,
              ],
      };
    }

    if (!/\b(plus|minus|times|divided|multiplied|what)\b/i.test(original)) {
      return fail(original, 'Ask “5 km in miles” or “what is 2 plus 2”.');
    }

    const rewritten = rewriteWords(original);
    const numeric = evaluateExpression(rewritten);
    return {
      ok: true,
      kind: 'words',
      input: original,
      result: formatNumber(numeric),
      numeric,
      steps:
        rewritten !== original
          ? [`read as: ${rewritten}`, `= ${formatNumber(numeric)}`]
          : [`= ${formatNumber(numeric)}`],
    };
  } catch (err: unknown) {
    return fail(original, errorMessage(err));
  }
}
