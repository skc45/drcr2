import { test } from 'node:test';
import assert from 'node:assert/strict';
import { smartMath, evaluateExpression, rewriteWords, formatNumber } from './engine.js';

test('arithmetic and order of operations', () => {
  assert.equal(evaluateExpression('2+3*4'), 14);
  assert.equal(evaluateExpression('(2+3)*4'), 20);
  assert.equal(evaluateExpression('2^3^2'), 512);
  assert.equal(evaluateExpression('10-3-2'), 5);
});

test('implicit multiplication', () => {
  assert.equal(evaluateExpression('2(3+4)'), 14);
  assert.equal(evaluateExpression('2pi / pi'), 2);
});

test('functions, percent postfix, factorial', () => {
  assert.equal(evaluateExpression('sqrt(81)'), 9);
  assert.ok(Math.abs(evaluateExpression('sin(pi/2)') - 1) < 1e-10);
  assert.equal(evaluateExpression('20% * 50'), 10);
  assert.equal(evaluateExpression('5!'), 120);
  assert.equal(evaluateExpression('ncr(10,3)'), 120);
});

test('degrees postfix', () => {
  assert.ok(Math.abs(evaluateExpression('sin(30deg)') - 0.5) < 1e-10);
});

test('word rewrite and percent of', () => {
  assert.match(rewriteWords('what is 2 plus 2'), /2 \+ 2/);
  const r = smartMath('15% of 80');
  assert.equal(r.ok, true);
  assert.equal(r.numeric, 12);
});

test('linear and quadratic solve', () => {
  const lin = smartMath('2x+5=17');
  assert.equal(lin.ok, true);
  assert.equal(lin.kind, 'solve');
  assert.ok(Math.abs(lin.roots[0] - 6) < 1e-8);

  const q = smartMath('x^2 - 5x + 6 = 0');
  assert.equal(q.ok, true);
  const roots = [...q.roots].sort((a, b) => a - b);
  assert.ok(Math.abs(roots[0] - 2) < 1e-8);
  assert.ok(Math.abs(roots[1] - 3) < 1e-8);
});

test('unit conversion', () => {
  const r = smartMath('5 km in miles');
  assert.equal(r.ok, true);
  assert.ok(Math.abs(r.numeric - 3.106855) < 0.01);
});

test('rejects garbage', () => {
  const r = smartMath('hello world');
  assert.equal(r.ok, false);
});

test('format snaps near-integers', () => {
  assert.equal(formatNumber(4.00000000001), '4');
});
