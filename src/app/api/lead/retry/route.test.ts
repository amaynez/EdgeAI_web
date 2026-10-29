import { describe, test, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { POST } from './route';
import { pool } from '@/lib/db';


describe('POST /api/lead/retry', () => {

  afterEach(() => {
    mock.restoreAll();
  });

  test('returns 400 if leadId is missing', async () => {
    // Arrange
    const req = new Request('http://localhost/api/lead/retry', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'x-forwarded-for': '127.0.0.1' },
    });

    // Act
    const res = await POST(req);
    const data = await res.json();

    // Assert
    assert.strictEqual(res.status, 400);
    assert.deepEqual(data, { error: 'Invalid or missing leadId' });
  });

  test('returns 400 if leadId is an empty string', async () => {
    // Arrange
    const req = new Request('http://localhost/api/lead/retry', {
      method: 'POST',
      body: JSON.stringify({ leadId: '' }),
      headers: { 'x-forwarded-for': '127.0.0.2' },
    });

    // Act
    const res = await POST(req);
    const data = await res.json();

    // Assert
    assert.strictEqual(res.status, 400);
    assert.deepEqual(data, { error: 'Invalid or missing leadId' });
  });

  test('returns 400 if leadId is null', async () => {
    // Arrange
    const req = new Request('http://localhost/api/lead/retry', {
      method: 'POST',
      body: JSON.stringify({ leadId: null }),
      headers: { 'x-forwarded-for': '127.0.0.3' },
    });

    // Act
    const res = await POST(req);
    const data = await res.json();

    // Assert
    assert.strictEqual(res.status, 400);
    assert.deepEqual(data, { error: 'Invalid or missing leadId' });
  });

  test('returns 400 if leadId is a number', async () => {
    // Arrange
    const req = new Request('http://localhost/api/lead/retry', {
      method: 'POST',
      body: JSON.stringify({ leadId: 12345 }),
      headers: { 'x-forwarded-for': '127.0.0.4' },
    });

    // Act
    const res = await POST(req);
    const data = await res.json();

    // Assert
    assert.strictEqual(res.status, 400);
    assert.deepEqual(data, { error: 'Invalid or missing leadId' });
  });

  test('returns 400 if leadId is a boolean', async () => {
    // Arrange
    const req = new Request('http://localhost/api/lead/retry', {
      method: 'POST',
      body: JSON.stringify({ leadId: true }),
      headers: { 'x-forwarded-for': '127.0.0.5' },
    });

    // Act
    const res = await POST(req);
    const data = await res.json();

    // Assert
    assert.strictEqual(res.status, 400);
    assert.deepEqual(data, { error: 'Invalid or missing leadId' });
  });

  test('returns 400 if leadId is an array', async () => {
    // Arrange
    const req = new Request('http://localhost/api/lead/retry', {
      method: 'POST',
      body: JSON.stringify({ leadId: [] }),
      headers: { 'x-forwarded-for': '127.0.0.6' },
    });

    // Act
    const res = await POST(req);
    const data = await res.json();

    // Assert
    assert.strictEqual(res.status, 400);
    assert.deepEqual(data, { error: 'Invalid or missing leadId' });
  });

  test('returns 400 if leadId is an object', async () => {
    // Arrange
    const req = new Request('http://localhost/api/lead/retry', {
      method: 'POST',
      body: JSON.stringify({ leadId: {} }),
      headers: { 'x-forwarded-for': '127.0.0.7' },
    });

    // Act
    const res = await POST(req);
    const data = await res.json();

    // Assert
    assert.strictEqual(res.status, 400);
    assert.deepEqual(data, { error: 'Invalid or missing leadId' });
  });

  test('returns 400 if leadId contains only whitespace', async () => {
    // Arrange
    const req = new Request('http://localhost/api/lead/retry', {
      method: 'POST',
      body: JSON.stringify({ leadId: '   ' }),
      headers: { 'x-forwarded-for': '127.0.0.8' },
    });

    // Act
    const res = await POST(req);
    const data = await res.json();

    // Assert
    assert.strictEqual(res.status, 400);
    assert.deepEqual(data, { error: 'Invalid or missing leadId' });
  });

  test('returns 404 if lead is not found', async () => {
    // Arrange
    const req = new Request('http://localhost/api/lead/retry', {
      method: 'POST',
      body: JSON.stringify({ leadId: 'missing-id' }),
      headers: { 'x-forwarded-for': '127.0.0.9' },
    });

    mock.method(pool, 'query', async () => {
      return { rows: [] };
    });

    // Act
    const res = await POST(req);
    const data = await res.json();

    // Assert
    assert.strictEqual(res.status, 404);
    assert.deepEqual(data, { error: 'Lead not found' });
  });

  test('returns 409 if lead is already being processed', async () => {
    // Arrange
    const req = new Request('http://localhost/api/lead/retry', {
      method: 'POST',
      body: JSON.stringify({ leadId: 'existing-id' }),
      headers: { 'x-forwarded-for': '127.0.0.10' },
    });

    let queryCallCount = 0;
    mock.method(pool, 'query', async () => {
      queryCallCount++;
      if (queryCallCount === 1) {
        return { rows: [{ id: 'existing-id', name: 'Test' }] };
      }
      if (queryCallCount === 2) {
        return { rowCount: 0 };
      }
      return { rows: [] };
    });

    // Act
    const res = await POST(req);
    const data = await res.json();

    // Assert
    assert.strictEqual(res.status, 409);
    assert.deepEqual(data, { error: 'Lead is already being processed' });
  });

  test('successfully initiates retry and returns 200', async () => {
    // Arrange
    const req = new Request('http://localhost/api/lead/retry', {
      method: 'POST',
      body: JSON.stringify({ leadId: 'valid-id' }),
      headers: { 'x-forwarded-for': '127.0.0.11' },
    });

    let queryCallCount = 0;
    mock.method(pool, 'query', async () => {
      queryCallCount++;
      if (queryCallCount === 1) {
        return { rows: [{ id: 'valid-id', name: 'Test Lead', email: 'test@example.com' }] };
      }
      if (queryCallCount === 2) {
        return { rowCount: 1 };
      }
      return { rows: [] };
    });

    // Mock global fetch to prevent processLeadBackground from making any real HTTP calls
    mock.method(globalThis, 'fetch', async () => {
      return new Response(JSON.stringify({}), { status: 200 });
    });

    // Act
    const res = await POST(req);
    const data = await res.json();

    // Assert
    assert.strictEqual(res.status, 200);
    assert.deepEqual(data, { success: true, message: 'Retry initiated' });
  });

  test('returns 500 on database or internal error', async () => {
    // Arrange
    const req = new Request('http://localhost/api/lead/retry', {
      method: 'POST',
      body: JSON.stringify({ leadId: 'valid-id' }),
      headers: { 'x-forwarded-for': '127.0.0.12' },
    });

    const consoleErrorMock = mock.method(console, 'error', () => {});
    mock.method(pool, 'query', async () => {
      throw new Error('DB Error');
    });

    // Act
    const res = await POST(req);
    const data = await res.json();

    // Assert
    assert.strictEqual(res.status, 500);
    assert.deepEqual(data, { error: 'Failed to initiate retry' });
    assert.strictEqual(consoleErrorMock.mock.callCount(), 1);
  });

  test('returns 400 if request body is invalid JSON', async () => {
    // Arrange
    const req = new Request('http://localhost/api/lead/retry', {
      method: 'POST',
      body: 'invalid-json',
      headers: { 'x-forwarded-for': '127.0.0.13' },
    });

    // Act
    const res = await POST(req);
    const data = await res.json();

    // Assert
    assert.strictEqual(res.status, 400);
    assert.deepEqual(data, { error: 'Invalid request body' });
  });

  test('returns 400 if request body is null', async () => {
    // Arrange
    const req = new Request('http://localhost/api/lead/retry', {
      method: 'POST',
      body: JSON.stringify(null),
      headers: { 'x-forwarded-for': '127.0.0.14' },
    });

    // Act
    const res = await POST(req);
    const data = await res.json();

    // Assert
    assert.strictEqual(res.status, 400);
    assert.deepEqual(data, { error: 'Invalid request body' });
  });

  test('returns 400 if request body is an array', async () => {
    // Arrange
    const req = new Request('http://localhost/api/lead/retry', {
      method: 'POST',
      body: JSON.stringify([]),
      headers: { 'x-forwarded-for': '127.0.0.15' },
    });

    // Act
    const res = await POST(req);
    const data = await res.json();

    // Assert
    assert.strictEqual(res.status, 400);
    assert.deepEqual(data, { error: 'Invalid request body' });
  });

  test('returns 400 if request body is a string', async () => {
    // Arrange
    const req = new Request('http://localhost/api/lead/retry', {
      method: 'POST',
      body: JSON.stringify("string-body"),
      headers: { 'x-forwarded-for': '127.0.0.16' },
    });

    // Act
    const res = await POST(req);
    const data = await res.json();

    // Assert
    assert.strictEqual(res.status, 400);
    assert.deepEqual(data, { error: 'Invalid request body' });
  });
  test('blocks the 11th request from the same IP with 429', async () => {
    const ip = '127.0.0.17';
    const createRequest = () => new Request('http://localhost/api/lead/retry', {
      method: 'POST',
      body: JSON.stringify({ leadId: 'valid-id' }),
      headers: { 'x-forwarded-for': ip },
    });

    let queryCallCount = 0;
    mock.method(pool, 'query', async () => {
      queryCallCount++;
      if (queryCallCount % 2 === 1) {
        return { rows: [{ id: 'valid-id', name: 'Test Lead', email: 'test@example.com' }] };
      }
      return { rowCount: 1 };
    });

    mock.method(globalThis, 'fetch', async () => {
      return new Response(JSON.stringify({}), { status: 200 });
    });

    for (let i = 0; i < 10; i++) {
      const res = await POST(createRequest());
      assert.strictEqual(res.status, 200, `Request ${i + 1} should be 200`);
    }

    const res11 = await POST(createRequest());
    assert.strictEqual(res11.status, 429, '11th request should be 429 Rate Limited');
    const data = await res11.json();
    assert.deepEqual(data, { error: 'Too many requests. Please try again later.' });
  });
});
