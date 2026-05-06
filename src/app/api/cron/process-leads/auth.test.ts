import { test } from 'node:test';
import assert from 'node:assert';
import { secureCompare } from './auth.ts';

test('secureCompare correctly identifies matching strings', () => {
  assert.strictEqual(secureCompare('same', 'same'), true);
  assert.strictEqual(secureCompare('', ''), true);
  assert.strictEqual(secureCompare('very-long-dummy-string-123', 'very-long-dummy-string-123'), true);
});

test('secureCompare correctly identifies non-matching strings', () => {
  assert.strictEqual(secureCompare('left-string', 'right-string'), false);
  assert.strictEqual(secureCompare('abc', 'abcd'), false);
  assert.strictEqual(secureCompare('abcd', 'abc'), false);
  assert.strictEqual(secureCompare('dummy-comparison-a', 'dummy-comparison-b'), false);
});
