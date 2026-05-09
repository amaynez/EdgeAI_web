import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { getClientIp, isRateLimited } from './rate-limit.ts';

describe('rate-limit', () => {
  test('getClientIp parses headers correctly', () => {
    const req1 = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }
    });
    assert.strictEqual(getClientIp(req1), '1.2.3.4');

    const req2 = new Request('http://localhost', {
      headers: { 'x-real-ip': '2.3.4.5' }
    });
    assert.strictEqual(getClientIp(req2), '2.3.4.5');

    const req3 = new Request('http://localhost');
    assert.strictEqual(getClientIp(req3), 'unknown');
  });

  test('isRateLimited allows up to 10 requests', () => {
    const ip = 'test-ip-1';
    for (let i = 0; i < 10; i++) {
      assert.strictEqual(isRateLimited(ip), false);
    }
    assert.strictEqual(isRateLimited(ip), true);
  });
});
