import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseToken, readOp, tokenAsOp, opToken, isOp, type Token } from './token';

test('the only token is op', () => {
  const token: Token = parseToken('+') ?? opToken('+');
  assert.equal(token.type, 'op');
  assert.equal(tokenAsOp(token), '+');
});

test('reads symbol and word as the same op token', () => {
  assert.deepEqual(parseToken('-'), { type: 'op', value: '-' });
  assert.deepEqual(parseToken('plus'), { type: 'op', value: '+' });
  assert.deepEqual(parseToken('TIMES'), { type: 'op', value: '*' });
  assert.deepEqual(parseToken('divided'), { type: 'op', value: '/' });
});

test('rejects everything that is not a single op', () => {
  assert.equal(parseToken('2 plus 2'), null);
  assert.equal(parseToken('5 km in miles'), null);
  assert.equal(parseToken('++'), null);
  assert.equal(parseToken(''), null);
  assert.equal(readOp('hello'), null);
  assert.equal(isOp('2'), false);
});
