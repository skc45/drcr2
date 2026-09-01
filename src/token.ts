export const OPS = ['+', '-', '*', '/'] as const;
export type Op = (typeof OPS)[number];

/** Generated token. `type` is always `'op'`; `value` is inferred from the input. */
export type Token<V extends Op = Op> = {
  readonly type: 'op';
  readonly value: V;
};

export function generateToken<V extends Op>(value: V): Token<V> {
  return { type: 'op', value };
}

export type TokenMap = { readonly [K in Op]: Token<K> };

export function generateTokens(): TokenMap {
  return {
    '+': generateToken('+'),
    '-': generateToken('-'),
    '*': generateToken('*'),
    '/': generateToken('/'),
  };
}
