import { generateToken, generateTokens, type Op, type Token } from './token';

function write(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

function usage(): void {
  process.stderr.write(`Generate an op token as JSON.

Usage:
  drcr2           emit all tokens
  drcr2 +         emit {"type":"op","value":"+"}
`);
}

const arg = process.argv[2];
if (arg === '-h' || arg === '--help') {
  usage();
  process.exit(0);
}

if (arg === undefined) {
  write(generateTokens());
  process.exit(0);
}

const ops = ['+', '-', '*', '/'] as const satisfies readonly Op[];
const op = ops.find((item) => item === arg);
if (op === undefined) {
  process.stderr.write(`not an op: ${JSON.stringify(arg)} (use + - * /)\n`);
  process.exit(2);
}

const token: Token<typeof op> = generateToken(op);
write(token);
