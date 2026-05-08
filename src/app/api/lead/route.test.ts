import { describe, test, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { POST } from './route';

describe('POST /api/lead - Rate Limiting', () => {

  afterEach(() => {
    mock.restoreAll();
  });

  const createRequest = (ip: string) => {
    return new Request('http://localhost/api/lead', {
      method: 'POST',
      headers: {
        'x-forwarded-for': ip,
      },
      // Use an invalid payload to quickly fail after the rate limit check
      // and avoid running heavy validation/DB logic.
      body: 'invalid-json',
    });
  };

  test('allows up to 10 requests and blocks the 11th request from the same IP', async () => {
    const ip = '192.168.1.100';

    // Send 10 requests - all should fail with 400 Bad Request (invalid JSON)
    // but NOT 429 Too Many Requests.
    for (let i = 0; i < 10; i++) {
      const res = await POST(createRequest(ip));
      assert.strictEqual(res.status, 400, `Request ${i + 1} should be 400`);
    }

    // The 11th request should be rate limited
    const res11 = await POST(createRequest(ip));
    assert.strictEqual(res11.status, 429, '11th request should be 429 Rate Limited');
    const data = await res11.json();
    assert.deepEqual(data, { error: 'Too many requests. Please try again later.' });
  });

  test('rate limits are isolated by IP address', async () => {
    const ip1 = '10.0.0.1';
    const ip2 = '10.0.0.2';

    // Exhaust rate limit for ip1
    for (let i = 0; i < 10; i++) {
      await POST(createRequest(ip1));
    }
    const resIp1 = await POST(createRequest(ip1));
    assert.strictEqual(resIp1.status, 429, 'ip1 should be rate limited');

    // ip2 should still be allowed
    const resIp2 = await POST(createRequest(ip2));
    assert.strictEqual(resIp2.status, 400, 'ip2 should NOT be rate limited');
  });

  test('resets the rate limit window after 15 minutes', async () => {
    const ip = '172.16.0.1';

    // We will control time by overriding Date.now
    let currentTime = Date.now();
    mock.method(Date, 'now', () => currentTime);

    // Exhaust rate limit for ip
    for (let i = 0; i < 10; i++) {
      await POST(createRequest(ip));
    }
    const resLimited = await POST(createRequest(ip));
    assert.strictEqual(resLimited.status, 429, 'ip should be rate limited');

    // Advance time by 15 minutes and 1 millisecond
    currentTime += 15 * 60 * 1000 + 1;

    // The rate limit should be reset, allowing the request again
    const resReset = await POST(createRequest(ip));
    assert.strictEqual(resReset.status, 400, 'ip should be allowed after 15 minutes');
  });
});
