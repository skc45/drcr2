import { test } from 'node:test';
import assert from 'node:assert/strict';
import { smartMath, rewriteWords, formatNumber, looksLikeMath, type MathOk, type MathResult } from './engine';

function expectOk(result: MathResult): MathOk {
  if (!result.ok) throw new Error(result.error);
  return result;
}

test('5 km in miles', () => {
  const r = expectOk(smartMath('5 km in miles'));
  assert.equal(r.kind, 'convert');
  assert.ok(Math.abs(r.numeric - 5 / 1.609344) < 1e-10);
});

test('5km in miles without space', () => {
  const r = expectOk(smartMath('5km in miles'));
  assert.ok(Math.abs(r.numeric - 5 / 1.609344) < 1e-10);
});

test('what is 2 plus 2', () => {
  assert.match(rewriteWords('what is 2 plus 2'), /2 \+ 2/);
  const r = expectOk(smartMath('what is 2 plus 2'));
  assert.equal(r.kind, 'words');
  assert.equal(r.numeric, 4);
});

test('worded minus times divide', () => {
  assert.equal(expectOk(smartMath('what is 10 minus 3')).numeric, 7);
  assert.equal(expectOk(smartMath('6 times 7')).numeric, 42);
  assert.equal(expectOk(smartMath('20 divided by 4')).numeric, 5);
});

test('rejects everything else', () => {
  assert.equal(smartMath('2x+5=17').ok, false);
  assert.equal(smartMath('15% of 80').ok, false);
  assert.equal(smartMath('sin(30deg)').ok, false);
  assert.equal(smartMath('hello').ok, false);
  assert.equal(looksLikeMath('2+2'), false);
});

test('format snaps near-integers', () => {
  assert.equal(formatNumber(4.00000000001), '4');
});
