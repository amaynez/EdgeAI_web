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
    });

    // Act
    const res = await POST(req);
    const data = await res.json();

    // Assert
    assert.strictEqual(res.status, 400);
    assert.deepEqual(data, { error: 'Missing leadId' });
  });

  test('returns 400 if leadId is an empty string', async () => {
    // Arrange
    const req = new Request('http://localhost/api/lead/retry', {
      method: 'POST',
      body: JSON.stringify({ leadId: '' }),
    });

    // Act
    const res = await POST(req);
    const data = await res.json();

    // Assert
    assert.strictEqual(res.status, 400);
    assert.deepEqual(data, { error: 'Missing leadId' });
  });

  test('returns 400 if leadId is null', async () => {
    // Arrange
    const req = new Request('http://localhost/api/lead/retry', {
      method: 'POST',
      body: JSON.stringify({ leadId: null }),
    });

    // Act
    const res = await POST(req);
    const data = await res.json();

    // Assert
    assert.strictEqual(res.status, 400);
    assert.deepEqual(data, { error: 'Missing leadId' });
  });

  test('returns 404 if lead is not found', async () => {
    // Arrange
    const req = new Request('http://localhost/api/lead/retry', {
      method: 'POST',
      body: JSON.stringify({ leadId: 'missing-id' }),
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
});
