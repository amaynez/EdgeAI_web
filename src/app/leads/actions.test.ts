import { describe, test, mock, afterEach, before } from 'node:test';
import assert from 'node:assert/strict';
import { fetchLeads, toggleContacted } from './actions';
import { pool } from '@/lib/db';
import { ADMIN_EMAIL } from '@/lib/config';

describe('Leads Actions', () => {
  let nextAuth: any;

  before(async () => {
    nextAuth = await import('next-auth/next');
  });

  afterEach(() => {
    mock.restoreAll();
  });

  describe('fetchLeads', () => {
    test('successfully fetches leads', async () => {
      mock.method(nextAuth, 'getServerSession', async () => ({
        user: { email: ADMIN_EMAIL }
      }));

      const mockRows = [{ id: '1', name: 'Lead 1' }];
      mock.method(pool, 'query', async (queryStr: string) => {
        if (queryStr.includes('CREATE TABLE') || queryStr.includes('ALTER TABLE')) {
          return { rowCount: 0 };
        }
        return { rows: mockRows };
      });

      const result = await fetchLeads();
      assert.deepEqual(result, { success: true, leads: mockRows });

      const queryMock = pool.query as any;
      const selectCall = queryMock.mock.calls.find((call: any) =>
        typeof call.arguments[0] === 'string' && call.arguments[0].includes('SELECT * FROM leads')
      );
      assert.ok(selectCall, 'Should have called pool.query with SELECT statement');
    });

    test('returns empty leads array when no leads exist', async () => {
      mock.method(nextAuth, 'getServerSession', async () => ({
        user: { email: ADMIN_EMAIL }
      }));

      mock.method(pool, 'query', async (queryStr: string) => {
        if (queryStr.includes('CREATE TABLE') || queryStr.includes('ALTER TABLE')) {
          return { rowCount: 0 };
        }
        return { rows: [] };
      });

      const result = await fetchLeads();
      assert.deepEqual(result, { success: true, leads: [] });
    });

    test('returns error when database query fails', async () => {
      mock.method(nextAuth, 'getServerSession', async () => ({
        user: { email: ADMIN_EMAIL }
      }));

      const consoleErrorMock = mock.method(console, 'error', () => {});

      mock.method(pool, 'query', async (queryStr: string) => {
        if (queryStr.includes('CREATE TABLE') || queryStr.includes('ALTER TABLE')) {
          return { rowCount: 0 };
        }
        throw new Error('Database Error');
      });

      const result = await fetchLeads();
      assert.deepEqual(result, { success: false, error: 'Failed to fetch leads' });
      assert.strictEqual(consoleErrorMock.mock.callCount(), 1);
    });

    test('returns unauthorized when session is missing', async () => {
      mock.method(nextAuth, 'getServerSession', async () => null);

      const result = await fetchLeads();
      assert.deepEqual(result, { success: false, error: 'Unauthorized' });
    });

    test('returns unauthorized when user email does not match ADMIN_EMAIL', async () => {
      mock.method(nextAuth, 'getServerSession', async () => ({
        user: { email: 'not_admin@example.com' }
      }));

      const result = await fetchLeads();
      assert.deepEqual(result, { success: false, error: 'Unauthorized' });
    });
  });

  describe('toggleContacted', () => {
    test('successfully updates contacted status', async () => {
      mock.method(nextAuth, 'getServerSession', async () => ({
        user: { email: ADMIN_EMAIL }
      }));

      const queryMock = mock.method(pool, 'query', async (queryStr: string) => {
        if (queryStr.includes('CREATE TABLE') || queryStr.includes('ALTER TABLE')) {
          return { rowCount: 0 };
        }
        return { rowCount: 1 };
      });

      const result = await toggleContacted('123', true);
      assert.deepEqual(result, { success: true });

      // Find the specific UPDATE call among potential ensureLeadsTable calls
      const updateCall = queryMock.mock.calls.find(call =>
        typeof call.arguments[0] === 'string' && call.arguments[0].includes('UPDATE leads SET contacted = $1 WHERE id = $2')
      );
      assert.ok(updateCall, 'Should have called pool.query with UPDATE statement');
      assert.deepEqual(updateCall.arguments[1], [true, '123'], 'Should pass correct parameters to query');
    });

    test('returns error when lead is not found (rowCount is 0)', async () => {
      mock.method(nextAuth, 'getServerSession', async () => ({
        user: { email: ADMIN_EMAIL }
      }));

      const queryMock = mock.method(pool, 'query', async (queryStr: string) => {
        if (queryStr.includes('CREATE TABLE') || queryStr.includes('ALTER TABLE')) {
          return { rowCount: 0 };
        }
        return { rowCount: 0 }; // Simulates UPDATE finding 0 rows
      });

      const result = await toggleContacted('invalid-id', true);
      assert.deepEqual(result, { success: false, error: 'Lead not found' });

      const updateCall = queryMock.mock.calls.find(call =>
        typeof call.arguments[0] === 'string' && call.arguments[0].includes('UPDATE leads SET contacted = $1 WHERE id = $2')
      );
      assert.ok(updateCall, 'Should have called pool.query with UPDATE statement even if not found');
      assert.deepEqual(updateCall.arguments[1], [true, 'invalid-id']);
    });



    test('returns error when database query fails', async () => {
      mock.method(nextAuth, 'getServerSession', async () => ({
        user: { email: ADMIN_EMAIL }
      }));

      const consoleErrorMock = mock.method(console, 'error', () => {});

      mock.method(pool, 'query', async (queryStr: string) => {
        if (queryStr.includes('CREATE TABLE') || queryStr.includes('ALTER TABLE')) {
          return { rowCount: 0 };
        }
        throw new Error('Database Error');
      });

      const result = await toggleContacted('123', true);
      assert.deepEqual(result, { success: false, error: 'Internal Server Error' });
      assert.strictEqual(consoleErrorMock.mock.callCount(), 1);
    });

    test('returns unauthorized when session is missing', async () => {
      mock.method(nextAuth, 'getServerSession', async () => null);

      const result = await toggleContacted('123', true);
      assert.deepEqual(result, { success: false, error: 'Unauthorized' });
    });

    test('returns unauthorized when user email does not match ADMIN_EMAIL', async () => {
      mock.method(nextAuth, 'getServerSession', async () => ({
        user: { email: 'not_admin@example.com' }
      }));

      const result = await toggleContacted('123', true);
      assert.deepEqual(result, { success: false, error: 'Unauthorized' });
    });
  });
});
