# DRCR2

The type.

```ts
type Token<V extends Op = Op> = {
  readonly type: 'op';
  readonly value: V;
};
```

```bash
npm install
npm run typecheck
```
