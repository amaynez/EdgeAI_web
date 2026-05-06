import { test } from 'node:test';
import assert from 'node:assert';
import { timingSafeEqual, createHash } from 'node:crypto';

function secureCompare(a: string, b: string): boolean {
  const hashA = createHash('sha256').update(a).digest();
  const hashB = createHash('sha256').update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

test('secureCompare correctly identifies matching strings', () => {
  assert.strictEqual(secureCompare('same', 'same'), true);
  assert.strictEqual(secureCompare('', ''), true);
  assert.strictEqual(secureCompare('verylongstring123', 'verylongstring123'), true);
});

test('secureCompare correctly identifies non-matching strings', () => {
  assert.strictEqual(secureCompare('a', 'b'), false);
  assert.strictEqual(secureCompare('abc', 'abcd'), false);
  assert.strictEqual(secureCompare('abcd', 'abc'), false);
  assert.strictEqual(secureCompare('password', 'passVVord'), false);
});
