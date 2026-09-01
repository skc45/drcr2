export const OPS = ['+', '-', '*', '/'] as const;
export type Op = (typeof OPS)[number];

/** The only token. It is always an operator. */
export type Token = {
  readonly type: 'op';
  readonly value: Op;
};

const WORDS: Readonly<Record<string, Op>> = {
  plus: '+',
  minus: '-',
  times: '*',
  multiplied: '*',
  divided: '/',
};

export function isOp(value: string): value is Op {
  return (OPS as readonly string[]).includes(value);
}

export function opToken(value: Op): Token {
  return { type: 'op', value };
}

export function readOp(raw: unknown): Op | null {
  const s = String(raw ?? '').trim().toLowerCase();
  if (s === '') return null;
  if (isOp(s)) return s;
  if (s === 'x' || s === '×') return '*';
  if (s === '÷') return '/';
  const word = WORDS[s];
  return word ?? null;
}

/** Accepts exactly one operator token. Anything else is rejected. */
export function parseToken(raw: unknown): Token | null {
  const op = readOp(raw);
  if (op === null) return null;
  return opToken(op);
}

export function tokenAsOp(token: Token): Op {
  return token.value;
}
