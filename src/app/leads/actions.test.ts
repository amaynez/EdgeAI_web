import { describe, test, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fetchLeads, toggleContacted } from './actions';
import { pool } from '@/lib/db';

describe('Leads Actions', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  describe('fetchLeads', () => {
    test('successfully fetches leads', async () => {
      const mockRows = [{ id: '1', name: 'Lead 1' }];
      mock.method(pool, 'query', async (queryStr: string) => {
        if (queryStr.includes('CREATE TABLE') || queryStr.includes('ALTER TABLE')) {
          return { rowCount: 0 };
        }
        return { rows: mockRows };
      });

      const result = await fetchLeads();
      assert.deepEqual(result, { success: true, leads: mockRows });
    });

    test('returns error when database query fails', async () => {
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
  });

  describe('toggleContacted', () => {
    test('successfully updates contacted status', async () => {
      mock.method(pool, 'query', async (queryStr: string) => {
        if (queryStr.includes('CREATE TABLE') || queryStr.includes('ALTER TABLE')) {
          return { rowCount: 0 };
        }
        return { rowCount: 1 };
      });

      const result = await toggleContacted('123', true);
      assert.deepEqual(result, { success: true });
    });

    test('returns error when lead is not found (rowCount is 0)', async () => {
      mock.method(pool, 'query', async () => {
        return { rowCount: 0 };
      });

      const result = await toggleContacted('invalid-id', true);
      assert.deepEqual(result, { success: false, error: 'Lead not found' });
    });

    test('returns error when database query fails', async () => {
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
  });
});
