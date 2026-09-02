# DRCR2

Typed token generation, usable from an exe.

```ts
generateToken('+')  // Token<'+'>  →  {"type":"op","value":"+"}
```

## APK

```bash
npm run apk
```

Writes `releases/drcr2.apk` (`com.skc45.drcr2`). Salmon swim at war with attached artillery. Tuna wear suicide nuke vests and detonate on the school; salmon in the blast die, then respawn from a river edge. Tap an op and tuna attack from that perimeter:

- `+` top
- `-` bottom
- `*` left
- `/` right

Each tap still generates `{"type":"op","value":"+"}`.

Install:

```bash
adb install -r releases/drcr2.apk
```

Direct download: https://github.com/skc45/drcr2/raw/cursor/expire-math-rebuild-0ace/releases/drcr2.apk

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
