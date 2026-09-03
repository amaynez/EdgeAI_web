import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { getClientIp, isRateLimited } from './rate-limit.ts';

describe('rate-limit', () => {
  test('getClientIp parses headers correctly', () => {
    const req1 = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }
    });
    assert.strictEqual(getClientIp(req1), 'unknown', 'Should ignore x-forwarded-for due to spoofing risks');

    const req2 = new Request('http://localhost', {
      headers: { 'x-real-ip': '2.3.4.5' }
    });
    assert.strictEqual(getClientIp(req2), '2.3.4.5');

    const req3 = new Request('http://localhost', {
      headers: {
        'x-forwarded-for': '1.2.3.4, 5.6.7.8',
        'x-real-ip': '9.9.9.9'
      }
    });
    assert.strictEqual(getClientIp(req3), '9.9.9.9', 'Should prioritize x-real-ip over x-forwarded-for');

    const req4 = new Request('http://localhost');
    assert.strictEqual(getClientIp(req4), 'unknown');

    const req5 = new Request('http://localhost', {
      headers: { 'x-real-ip': '   ' }
    });
    assert.strictEqual(getClientIp(req5), 'unknown');

    const req6 = new Request('http://localhost', {
      headers: { 'x-forwarded-for': ' ,  ' }
    });
    assert.strictEqual(getClientIp(req6), 'unknown');

    const req7 = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '1.2.3.4,  ' }
    });
    assert.strictEqual(getClientIp(req7), '1.2.3.4', 'Should return the first IP if the last is empty but others exist');
  });

  test('isRateLimited allows up to 10 requests', () => {
    const ip = 'test-ip-1';
    for (let i = 0; i < 10; i++) {
      assert.strictEqual(isRateLimited(ip), false);
    }
    assert.strictEqual(isRateLimited(ip), true);
  });

  test('isRateLimited handles out-of-order expired entries', () => {
    const ip = 'test-ip-out-of-order';
    let now = 1000;
    const originalDateNow = Date.now;
    Date.now = () => now;

    try {
      // Insert first IP at t=1000
      isRateLimited(ip);

      // Insert second IP at t=0 (time went backwards)
      now = 0;
      isRateLimited('other-ip');

      // Now move time to where the second IP is expired (0 + 15min + 1)
      // but the first IP is NOT expired (1000 + 15min + 1 is still > now)
      now = 15 * 60 * 1000 + 1;

      // When we query 'other-ip', the pruning loop stops at 'test-ip-out-of-order'
      // because it is not expired.
      // So 'other-ip' bypasses the pruning loop.
      // The direct lookup for 'other-ip' then finds it expired and hits the delete branch.
      assert.strictEqual(isRateLimited('other-ip'), false);
    } finally {
      Date.now = originalDateNow;
    }
  });

  test('isRateLimited resets after window expires', () => {
    // Note: Due to lack of global fake timers in node:test, this test uses a hack to verify map pruning
    // by mocking Date.now
    const ip = 'test-ip-2';

    let now = Date.now();
    const originalDateNow = Date.now;
    Date.now = () => now;

    try {
      for (let i = 0; i < 10; i++) {
        assert.strictEqual(isRateLimited(ip), false);
      }
      assert.strictEqual(isRateLimited(ip), true);

      // Advance time beyond RATE_LIMIT_WINDOW_MS (15 minutes)
      now += 15 * 60 * 1000 + 1;

      // Should be allowed again
      assert.strictEqual(isRateLimited(ip), false);
    } finally {
      Date.now = originalDateNow;
    }
  });
});
