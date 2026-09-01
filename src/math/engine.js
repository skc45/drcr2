/**
 * Smart math engine: word-aware rewrite, recursive-descent parser,
 * exact rationals when possible, linear/quadratic solver, percent & units.
 */

const FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh',
  'log', 'ln', 'log10', 'log2', 'exp', 'sqrt', 'cbrt', 'abs', 'floor',
  'ceil', 'round', 'sign', 'min', 'max', 'hypot', 'fact', 'factorial',
  'ncr', 'npr', 'gcd', 'lcm', 'mod', 'pow',
]);

const CONSTANTS = {
  pi: Math.PI,
  π: Math.PI,
  e: Math.E,
  tau: Math.PI * 2,
  φ: (1 + Math.sqrt(5)) / 2,
  phi: (1 + Math.sqrt(5)) / 2,
};

const LENGTH_M = {
  m: 1, meter: 1, meters: 1, metre: 1, metres: 1,
  km: 1000, kilometer: 1000, kilometers: 1000,
  cm: 0.01, mm: 0.001,
  mi: 1609.344, mile: 1609.344, miles: 1609.344,
  yd: 0.9144, yard: 0.9144, yards: 0.9144,
  ft: 0.3048, foot: 0.3048, feet: 0.3048,
  in: 0.0254, inch: 0.0254, inches: 0.0254,
};

const MASS_G = {
  g: 1, gram: 1, grams: 1,
  kg: 1000, kilogram: 1000, kilograms: 1000,
  mg: 0.001,
  lb: 453.59237, lbs: 453.59237, pound: 453.59237, pounds: 453.59237,
  oz: 28.349523125, ounce: 28.349523125, ounces: 28.349523125,
};

const TIME_S = {
  s: 1, sec: 1, secs: 1, second: 1, seconds: 1,
  ms: 0.001,
  min: 60, mins: 60, minute: 60, minutes: 60,
  h: 3600, hr: 3600, hrs: 3600, hour: 3600, hours: 3600,
  day: 86400, days: 86400,
};

const TEMP = new Set(['c', 'f', 'k', 'celsius', 'fahrenheit', 'kelvin']);

export function gcd(a, b) {
  a = Math.abs(Math.trunc(a));
  b = Math.abs(Math.trunc(b));
  while (b) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a || 1;
}

export class Rat {
  constructor(n, d = 1) {
    if (d === 0) throw new Error('Division by zero');
    if (!Number.isFinite(n) || !Number.isFinite(d)) {
      this.n = n;
      this.d = 1;
      return;
    }
    if (d < 0) {
      n = -n;
      d = -d;
    }
    const g = gcd(Math.round(n), Math.round(d));
    this.n = Math.round(n) / g;
    this.d = Math.round(d) / g;
  }

  static from(x) {
    if (x instanceof Rat) return x;
    if (typeof x === 'number') {
      if (!Number.isFinite(x)) return new Rat(x, 1);
      if (Number.isInteger(x)) return new Rat(x, 1);
      const snapped = snapRatio(x);
      if (snapped) return snapped;
      return null;
    }
    return null;
  }

  add(o) { return new Rat(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o) { return new Rat(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o) { return new Rat(this.n * o.n, this.d * o.d); }
  div(o) { return new Rat(this.n * o.d, this.d * o.n); }
  neg() { return new Rat(-this.n, this.d); }
  value() { return this.n / this.d; }
  isInt() { return this.d === 1; }

  toString() {
    if (this.d === 1) return String(this.n);
    return `${this.n}/${this.d}`;
  }
}

function snapRatio(x, maxDen = 1000) {
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  let bestN = 1;
  let bestD = 1;
  let bestErr = Math.abs(x - 1);
  for (let d = 1; d <= maxDen; d += 1) {
    const n = Math.round(x * d);
    const err = Math.abs(x - n / d);
    if (err < bestErr) {
      bestErr = err;
      bestN = n;
      bestD = d;
      if (err < 1e-12) break;
    }
  }
  if (bestErr < 1e-10) return new Rat(sign * bestN, bestD);
  return null;
}

export function formatNumber(n) {
  if (n == null || Number.isNaN(n)) return 'undefined';
  if (n === Infinity) return '∞';
  if (n === -Infinity) return '-∞';
  if (!Number.isFinite(n)) return String(n);
  if (Math.abs(n) < 1e-15) return '0';
  const nearest = Math.round(n);
  if (Math.abs(n - nearest) < 1e-10) return String(nearest);
  const rat = snapRatio(n, 200);
  if (rat && rat.d <= 200 && rat.d !== 1) {
    const dec = trimFloat(n);
    return `${rat.toString()}  (${dec})`;
  }
  return trimFloat(n);
}

function trimFloat(n) {
  if (Math.abs(n) >= 1e12 || (Math.abs(n) > 0 && Math.abs(n) < 1e-6)) {
    return n.toExponential(8).replace(/\.?0+e/, 'e');
  }
  let s = n.toPrecision(12);
  if (s.includes('e')) return s.replace(/\.?0+e/, 'e');
  s = String(Number(s));
  return s;
}

function factorial(n) {
  if (!Number.isInteger(n) || n < 0) throw new Error('factorial needs a non-negative integer');
  if (n > 170) throw new Error('factorial overflow');
  let r = 1;
  for (let i = 2; i <= n; i += 1) r *= i;
  return r;
}

function nCr(n, k) {
  if (!Number.isInteger(n) || !Number.isInteger(k) || n < 0 || k < 0 || k > n) {
    throw new Error('nCr needs 0 ≤ k ≤ n integers');
  }
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 1; i <= k; i += 1) r = (r * (n - k + i)) / i;
  return r;
}

function nPr(n, k) {
  if (!Number.isInteger(n) || !Number.isInteger(k) || n < 0 || k < 0 || k > n) {
    throw new Error('nPr needs 0 ≤ k ≤ n integers');
  }
  let r = 1;
  for (let i = 0; i < k; i += 1) r *= n - i;
  return r;
}

function lcm(a, b) {
  return Math.abs(a * b) / gcd(a, b);
}

const FN_IMPL = {
  sin: (x) => Math.sin(x),
  cos: (x) => Math.cos(x),
  tan: (x) => Math.tan(x),
  asin: (x) => Math.asin(x),
  acos: (x) => Math.acos(x),
  atan: (x) => Math.atan(x),
  sinh: (x) => Math.sinh(x),
  cosh: (x) => Math.cosh(x),
  tanh: (x) => Math.tanh(x),
  log: (x, b) => (b == null ? Math.log10(x) : Math.log(x) / Math.log(b)),
  ln: (x) => Math.log(x),
  log10: (x) => Math.log10(x),
  log2: (x) => Math.log2(x),
  exp: (x) => Math.exp(x),
  sqrt: (x) => {
    if (x < 0) throw new Error('sqrt of negative');
    return Math.sqrt(x);
  },
  cbrt: (x) => Math.cbrt(x),
  abs: (x) => Math.abs(x),
  floor: (x) => Math.floor(x),
  ceil: (x) => Math.ceil(x),
  round: (x) => Math.round(x),
  sign: (x) => Math.sign(x),
  min: (...xs) => Math.min(...xs),
  max: (...xs) => Math.max(...xs),
  hypot: (...xs) => Math.hypot(...xs),
  fact: factorial,
  factorial,
  ncr: nCr,
  npr: nPr,
  gcd: (a, b) => gcd(a, b),
  lcm: (a, b) => lcm(a, b),
  mod: (a, b) => ((a % b) + b) % b,
  pow: (a, b) => a ** b,
};

export function tokenize(src) {
  const s = src.replace(/[×∙⋅]/g, '*').replace(/[÷]/g, '/').replace(/√/g, 'sqrt').replace(/π/g, 'pi').replace(/φ/g, 'phi');
  const tokens = [];
  let i = 0;
  const push = (type, value) => tokens.push({ type, value });

  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) {
      i += 1;
      continue;
    }
    if (c === ',' ) {
      push('COMMA', ',');
      i += 1;
      continue;
    }
    if ('+-*/^!=(),'.includes(c)) {
      if (c === '*' && s[i + 1] === '*') {
        push('OP', '^');
        i += 2;
        continue;
      }
      push(c === '(' ? 'LP' : c === ')' ? 'RP' : c === ',' ? 'COMMA' : c === '=' ? 'EQ' : 'OP', c === '**' ? '^' : c);
      i += 1;
      continue;
    }
    if (c === '%') {
      push('OP', '%');
      i += 1;
      continue;
    }
    if (c === '°') {
      push('IDENT', 'deg');
      i += 1;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      const m = s.slice(i).match(/^\d*\.?\d+(?:[eE][+-]?\d+)?/);
      if (!m) throw new Error(`bad number near "${s.slice(i, i + 8)}"`);
      push('NUM', Number(m[0]));
      i += m[0].length;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const m = s.slice(i).match(/^[A-Za-z_]+/);
      push('IDENT', m[0]);
      i += m[0].length;
      continue;
    }
    throw new Error(`unexpected "${c}"`);
  }
  return insertImplicitMul(tokens);
}

function insertImplicitMul(tokens) {
  const out = [];
  const valueEnd = (t) => t && (t.type === 'NUM' || t.type === 'IDENT' || t.type === 'RP' || (t.type === 'OP' && (t.value === '!' || t.value === '%')));
  const valueStart = (t) => t && (t.type === 'NUM' || t.type === 'IDENT' || t.type === 'LP');
  for (let i = 0; i < tokens.length; i += 1) {
    const prev = out[out.length - 1];
    const cur = tokens[i];
    if (prev && valueEnd(prev) && valueStart(cur)) {
      const fnCall = prev.type === 'IDENT' && FUNCTIONS.has(prev.value.toLowerCase()) && cur.type === 'LP';
      const unitSuffix = cur.type === 'IDENT' && cur.value.toLowerCase() === 'deg';
      if (!fnCall && !unitSuffix) out.push({ type: 'OP', value: '*' });
    }
    out.push(cur);
  }
  return out;
}

function parseExpr(tokens) {
  let i = 0;
  const peek = () => tokens[i];
  const eat = (type, value) => {
    const t = tokens[i];
    if (!t || t.type !== type || (value != null && t.value !== value)) return null;
    i += 1;
    return t;
  };

  function parseEq() {
    let node = parseAdd();
    if (eat('EQ', '=')) {
      node = { type: 'eq', left: node, right: parseAdd() };
    }
    return node;
  }

  function parseAdd() {
    let node = parseMul();
    for (;;) {
      if (eat('OP', '+')) node = { type: 'bin', op: '+', left: node, right: parseMul() };
      else if (eat('OP', '-')) node = { type: 'bin', op: '-', left: node, right: parseMul() };
      else break;
    }
    return node;
  }

  function parseMul() {
    let node = parsePow();
    for (;;) {
      if (eat('OP', '*')) node = { type: 'bin', op: '*', left: node, right: parsePow() };
      else if (eat('OP', '/')) node = { type: 'bin', op: '/', left: node, right: parsePow() };
      else break;
    }
    return node;
  }

  function parsePow() {
    const node = parseUnary();
    if (eat('OP', '^')) return { type: 'bin', op: '^', left: node, right: parsePow() };
    return node;
  }

  function parseUnary() {
    if (eat('OP', '+')) return parseUnary();
    if (eat('OP', '-')) return { type: 'neg', inner: parseUnary() };
    return parsePostfix();
  }

  function parsePostfix() {
    let node = parsePrimary();
    for (;;) {
      if (eat('OP', '!')) node = { type: 'fact', inner: node };
      else if (eat('OP', '%')) node = { type: 'percent', inner: node };
      else if (peek()?.type === 'IDENT' && peek().value.toLowerCase() === 'deg') {
        i += 1;
        node = { type: 'deg', inner: node };
      }
      else break;
    }
    return node;
  }

  function parsePrimary() {
    const num = eat('NUM');
    if (num) return { type: 'num', value: num.value };
    const id = eat('IDENT');
    if (id) {
      const name = id.value;
      if (eat('LP', '(')) {
        const args = [];
        if (!eat('RP', ')')) {
          args.push(parseAdd());
          while (eat('COMMA', ',')) args.push(parseAdd());
          if (!eat('RP', ')')) throw new Error('missing )');
        }
        return { type: 'call', name, args };
      }
      return { type: 'id', name };
    }
    if (eat('LP', '(')) {
      const inner = parseEq();
      if (!eat('RP', ')')) throw new Error('missing )');
      return inner;
    }
    throw new Error('expected a number or name');
  }

  if (tokens.length === 0) throw new Error('empty expression');
  const ast = parseEq();
  if (i < tokens.length) throw new Error('trailing input');
  return ast;
}

function evalAst(ast, env) {
  switch (ast.type) {
    case 'num':
      return ast.value;
    case 'id': {
      const key = ast.name.toLowerCase();
      if (Object.prototype.hasOwnProperty.call(env, key)) return env[key];
      if (Object.prototype.hasOwnProperty.call(CONSTANTS, key)) return CONSTANTS[key];
      throw new Error(`unknown name "${ast.name}"`);
    }
    case 'neg':
      return -evalAst(ast.inner, env);
    case 'percent':
      return evalAst(ast.inner, env) / 100;
    case 'deg':
      return evalAst(ast.inner, env) * (Math.PI / 180);
    case 'fact':
      return factorial(evalAst(ast.inner, env));
    case 'bin': {
      const a = evalAst(ast.left, env);
      const b = evalAst(ast.right, env);
      switch (ast.op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/':
          if (b === 0) throw new Error('Division by zero');
          return a / b;
        case '^': return a ** b;
        default: throw new Error(`bad op ${ast.op}`);
      }
    }
    case 'call': {
      const fn = FN_IMPL[ast.name.toLowerCase()];
      if (!fn) throw new Error(`unknown function ${ast.name}`);
      const args = ast.args.map((x) => evalAst(x, env));
      return fn(...args);
    }
    case 'eq':
      throw new Error('equation needs solving, not evaluating');
    default:
      throw new Error('bad ast');
  }
}

function freeVars(ast, into = new Set()) {
  if (!ast || typeof ast !== 'object') return into;
  if (ast.type === 'id') {
    const k = ast.name.toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(CONSTANTS, k) && !FUNCTIONS.has(k)) into.add(k);
  }
  for (const v of Object.values(ast)) {
    if (Array.isArray(v)) v.forEach((x) => freeVars(x, into));
    else if (v && typeof v === 'object') freeVars(v, into);
  }
  return into;
}

function solvePolynomial(f, steps) {
  const y = (x) => f(x);
  const y0 = y(0);
  const y1 = y(1);
  const y2 = y(2);
  const y3 = y(3);
  const a = (y0 - 2 * y1 + y2) / 2;
  const b = y1 - y0 - a;
  const c = y0;
  const predict3 = a * 9 + b * 3 + c;
  if (Math.abs(predict3 - y3) > 1e-6) {
    throw new Error('only linear and quadratic equations are solved');
  }

  if (Math.abs(a) < 1e-10 && Math.abs(b) < 1e-10) {
    if (Math.abs(c) < 1e-8) {
      steps.push('0 = 0 — true for every value');
      return { kind: 'identity', roots: [] };
    }
    throw new Error('no solution (contradiction)');
  }

  if (Math.abs(a) < 1e-10) {
    const root = -c / b;
    steps.push(`linear: ${trimFloat(b)}x + ${trimFloat(c)} = 0`);
    steps.push(`x = ${formatNumber(root)}`);
    return { kind: 'linear', roots: [root], coeffs: { a: 0, b, c } };
  }

  const disc = b * b - 4 * a * c;
  steps.push(`quadratic: ${trimFloat(a)}x² + ${trimFloat(b)}x + ${trimFloat(c)} = 0`);
  steps.push(`discriminant Δ = b² − 4ac = ${formatNumber(disc)}`);
  if (disc < -1e-10) {
    const re = -b / (2 * a);
    const im = Math.sqrt(-disc) / (2 * a);
    steps.push('Δ < 0 — complex pair');
    return {
      kind: 'quadratic',
      roots: [],
      complex: [
        `${formatNumber(re)} + ${formatNumber(im)}i`,
        `${formatNumber(re)} − ${formatNumber(im)}i`,
      ],
      coeffs: { a, b, c, disc },
    };
  }
  if (Math.abs(disc) < 1e-10) {
    const root = -b / (2 * a);
    steps.push('Δ = 0 — repeated root');
    steps.push(`x = ${formatNumber(root)}`);
    return { kind: 'quadratic', roots: [root], coeffs: { a, b, c, disc } };
  }
  const sqrtD = Math.sqrt(disc);
  const r1 = (-b + sqrtD) / (2 * a);
  const r2 = (-b - sqrtD) / (2 * a);
  steps.push(`x = (−b ± √Δ) / 2a`);
  steps.push(`x = ${formatNumber(r1)}  or  ${formatNumber(r2)}`);
  return { kind: 'quadratic', roots: [r1, r2], coeffs: { a, b, c, disc } };
}

export function rewriteWords(raw) {
  let s = raw.trim();
  s = s.replace(/[“”]/g, '"').replace(/[’]/g, "'");
  const replacements = [
    [/what(?:'s| is)/gi, ''],
    [/please\s+/gi, ''],
    [/calculate\s+/gi, ''],
    [/compute\s+/gi, ''],
    [/solve\s+(?:for\s+\w+\s*:?\s*)?/gi, ''],
    [/square\s+root\s+of\s+/gi, 'sqrt('],
    [/cube\s+root\s+of\s+/gi, 'cbrt('],
    [/multiplied\s+by/gi, '*'],
    [/times/gi, '*'],
    [/divided\s+by/gi, '/'],
    [/plus/gi, '+'],
    [/minus/gi, '-'],
    [/to the power of/gi, '^'],
    [/squared/gi, '^2'],
    [/cubed/gi, '^3'],
    [/percent of/gi, '% of'],
    [/percentage of/gi, '% of'],
  ];
  for (const [re, to] of replacements) s = s.replace(re, to);

  // Close sqrt(N  → sqrt(N) when rewrite injected an opener
  s = s.replace(/sqrt\(([\d.]+)(?!\))/g, 'sqrt($1)');
  s = s.replace(/cbrt\(([\d.]+)(?!\))/g, 'cbrt($1)');
  return s.replace(/\s+/g, ' ').trim();
}

function percentOf(text) {
  const m = text.match(/(-?[\d.]+)\s*%\s*of\s*(-?[\d.]+(?:\s*[+\-*/^]\s*-?[\d.]+)*)/i)
    || text.match(/(-?[\d.]+)\s*percent\s*of\s*(-?[\d.]+)/i);
  if (!m) return null;
  const pct = Number(m[1]);
  let base;
  try {
    base = evaluateExpression(m[2]);
  } catch {
    base = Number(m[2]);
  }
  if (!Number.isFinite(pct) || !Number.isFinite(base)) return null;
  const value = (pct / 100) * base;
  return {
    kind: 'percent',
    value,
    steps: [`${pct}% of ${formatNumber(base)} = (${formatNumber(pct)}/100)×${formatNumber(base)}`, `= ${formatNumber(value)}`],
  };
}

function convertUnits(text) {
  const m = text.match(/^\s*(-?[\d.]+)\s*([A-Za-z°]+)\s+(?:in|to|into)\s+([A-Za-z°]+)\s*$/i);
  if (!m) return null;
  const qty = Number(m[1]);
  const from = m[2].toLowerCase().replace('°', '');
  const to = m[3].toLowerCase().replace('°', '');
  if (!Number.isFinite(qty)) return null;

  if (TEMP.has(from) && TEMP.has(to)) {
    const toK = (u, x) => {
      if (u === 'k' || u === 'kelvin') return x;
      if (u === 'c' || u === 'celsius') return x + 273.15;
      return (x - 32) * (5 / 9) + 273.15;
    };
    const fromK = (u, k) => {
      if (u === 'k' || u === 'kelvin') return k;
      if (u === 'c' || u === 'celsius') return k - 273.15;
      return (k - 273.15) * (9 / 5) + 32;
    };
    const value = fromK(to, toK(from, qty));
    return {
      kind: 'convert',
      value,
      steps: [`${qty} ${m[2]} → ${formatNumber(value)} ${m[3]}`],
    };
  }

  const tables = [LENGTH_M, MASS_G, TIME_S];
  for (const table of tables) {
    if (table[from] != null && table[to] != null) {
      const value = (qty * table[from]) / table[to];
      return {
        kind: 'convert',
        value,
        steps: [`${qty} ${m[2]} × ${table[from]} / ${table[to]} = ${formatNumber(value)} ${m[3]}`],
      };
    }
  }
  return null;
}

export function evaluateExpression(src, env = {}) {
  const ast = parseExpr(tokenize(src));
  return evalAst(ast, env);
}

export function looksLikeMath(text) {
  const t = text.trim();
  if (!t) return false;
  if (/(percent of|% of|square root|solve|plus|minus|times|divided)/i.test(t)) return true;
  if (/[0-9]/.test(t) && /[=+\-*/^%!()√π]/.test(t)) return true;
  if (/^\s*[\d.]+\s*[A-Za-z°]+\s+(in|to|into)\s+[A-Za-z°]+\s*$/i.test(t)) return true;
  if (/^[0-9eE+\-*/^().\s%!,xX=sqrtcosinlga]+$/i.test(t) && /[0-9]/.test(t)) return true;
  return false;
}

export function smartMath(input) {
  const original = String(input ?? '').trim();
  if (!original) {
    return { ok: false, error: 'empty', input: original, steps: [] };
  }

  try {
    const rewritten = rewriteWords(original);

    const conv = convertUnits(rewritten) || convertUnits(original);
    if (conv) {
      return {
        ok: true,
        kind: 'convert',
        input: original,
        result: formatNumber(conv.value),
        numeric: conv.value,
        steps: conv.steps,
      };
    }

    const pct = percentOf(rewritten) || percentOf(original);
    if (pct) {
      return {
        ok: true,
        kind: 'percent',
        input: original,
        result: formatNumber(pct.value),
        numeric: pct.value,
        steps: pct.steps,
      };
    }

    const ast = parseExpr(tokenize(rewritten));
    const steps = [];
    if (rewritten !== original) steps.push(`read as: ${rewritten}`);

    if (ast.type === 'eq') {
      const vars = [...freeVars(ast)];
      const name = vars[0] || 'x';
      if (vars.length > 1) throw new Error(`too many unknowns: ${vars.join(', ')}`);
      const f = (x) => evalAst(ast.left, { [name]: x }) - evalAst(ast.right, { [name]: x });
      const solved = solvePolynomial(f, steps);
      const shown = solved.complex
        ? solved.complex.join(', ')
        : solved.roots.map(formatNumber).join(', ');
      return {
        ok: true,
        kind: 'solve',
        input: original,
        unknown: name,
        result: solved.kind === 'identity' ? 'all real numbers' : shown || 'no real roots',
        roots: solved.roots,
        steps,
      };
    }

    const vars = [...freeVars(ast)];
    if (vars.length) throw new Error(`unknown name "${vars[0]}"`);

    const numeric = evalAst(ast, {});
    const rat = Rat.from(numeric);
    if (rat && Math.abs(rat.value() - numeric) < 1e-10) {
      steps.push(rat.isInt() ? `= ${rat.toString()}` : `= ${rat.toString()} = ${trimFloat(numeric)}`);
      return {
        ok: true,
        kind: 'eval',
        input: original,
        result: rat.isInt() ? rat.toString() : `${rat.toString()}  (${trimFloat(numeric)})`,
        exact: rat.toString(),
        numeric,
        steps: steps.length ? steps : [`= ${formatNumber(numeric)}`],
      };
    }
    steps.push(`= ${formatNumber(numeric)}`);
    return {
      ok: true,
      kind: 'eval',
      input: original,
      result: formatNumber(numeric),
      numeric,
      steps,
    };
  } catch (err) {
    return {
      ok: false,
      kind: 'error',
      input: original,
      error: err.message || String(err),
      steps: [],
    };
  }
}
