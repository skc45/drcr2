# DRCR2 Expire

A from-scratch rebuild. The old eight-method board is gone.

This is an **auto-expiring notebook** with a **smart math engine**. Drop a note, pick a lifetime, and it deletes itself. If the text looks like math, the engine parses it (no `eval`), evaluates or solves it, and keeps the steps with the note until the timer hits zero.

## Math it can do

- Arithmetic, powers, factorial, percents (`15% of 80`, `20% * 50`)
- Functions: `sin`, `cos`, `sqrt`, `log`, `ncr`, …
- Degrees: `sin(30deg)`
- Implicit multiply: `2(3+4)`, `2pi`
- Linear & quadratic solve: `2x+5=17`, `x^2-5x+6=0`
- Units: `5 km in miles`, `32 f to c`
- Worded input: `what is 2 plus 2`

## Run

```bash
npm install
npm test
npm run dev
```

Open http://localhost:5173

Notes live in `localStorage` and are swept out the moment they expire. Add to your Android home screen from the browser for an app-like install (PWA).
