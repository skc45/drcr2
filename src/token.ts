export type Op = '+' | '-' | '*' | '/';

export type Token<V extends Op = Op> = {
  readonly type: 'op';
  readonly value: V;
};
