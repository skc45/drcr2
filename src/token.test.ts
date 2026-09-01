import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateToken, generateTokens, type Token } from './token';

test('generateToken produces an op token with a literal value type', () => {
  const token = generateToken('+');
  const check: Token<'+'> = token;
  assert.equal(check.type, 'op');
  assert.equal(check.value, '+');
});

test('generateTokens emits one op token per operator', () => {
  const tokens = generateTokens();
  assert.deepEqual(Object.keys(tokens), ['+', '-', '*', '/']);
  assert.deepEqual(tokens['+'], { type: 'op', value: '+' });
  assert.deepEqual(tokens['-'], { type: 'op', value: '-' });
  assert.deepEqual(tokens['*'], { type: 'op', value: '*' });
  assert.deepEqual(tokens['/'], { type: 'op', value: '/' });
});
