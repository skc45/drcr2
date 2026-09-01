# DRCR2

Typed token generation. That is the whole project.

```ts
type Token<V extends Op> = { readonly type: 'op'; readonly value: V };

generateToken('+')  // Token<'+'>
generateTokens()    // { '+': Token<'+'>, '-': Token<'-'>, '*': Token<'*'>, '/': Token<'/'> }
```

```bash
npm install
npm run typecheck
npm test
```
