# DRCR2

Typed token generation, usable from an exe.

```ts
generateToken('+')  // Token<'+'>  →  {"type":"op","value":"+"}
```

## Exe

```bash
npm run exe
```

Writes:

- `releases/drcr2` — Linux
- `releases/drcr2.exe` — Windows

Call it from another program (stdout is one JSON line):

```bat
drcr2.exe +
```

```
{"type":"op","value":"+"}
```

No args prints every op. Exit `2` if the argument is not `+ - * /`.

## Source

```bash
npm install
npm run typecheck
npm test
npm run cli -- +
```
