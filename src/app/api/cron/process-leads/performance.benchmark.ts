import { performance } from 'perf_hooks';
import assert from 'node:assert';
import test from 'node:test';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const DELAY = 50;

// Mock interfaces
interface LeadUpdateResult {
  leadId: string;
  shouldFail?: boolean;
}

interface MockPool {
  query: (sql: string, params: any[]) => Promise<void>;
  calls: { sql: string; params: any[] }[];
}

interface MockUpdateLead {
  (res: LeadUpdateResult): Promise<void>;
  calls: LeadUpdateResult[];
}

function createMocks() {
  const pool: MockPool = {
    calls: [],
    query: async (sql, params) => {
      await sleep(DELAY);
      pool.calls.push({ sql, params });
    }
  };

  const updateLead: MockUpdateLead = Object.assign(
    async (res: LeadUpdateResult) => {
      await sleep(DELAY);
      updateLead.calls.push(res);
      if (res.shouldFail) throw new Error('Update failed');
    },
    { calls: [] as LeadUpdateResult[] }
  );

  return { pool, updateLead };
}

const rows = [
  { id: '1' },
  { id: '2' },
  { id: '3' },
  { id: '4' },
  { id: '5' },
];

const results: any[] = [
  { status: 'fulfilled', value: { leadId: '1' } },
  { status: 'fulfilled', value: { leadId: '2', shouldFail: true } },
  { status: 'rejected', reason: { message: 'Processing failed' } },
  { status: 'fulfilled', value: { leadId: '4' } },
  { status: 'fulfilled', value: null }, // Should now record error
];

async function sequential(pool: MockPool, updateLead: MockUpdateLead) {
  const start = performance.now();

  const recordError = async (leadId: string, errorMsg: string) => {
    try {
      await pool.query(
        `UPDATE leads SET processing_status = $1 WHERE id = $2`,
        [errorMsg, leadId]
      );
    } catch (dbErr) {}
  };

  for (let i = 0; i < results.length; i++) {
    const settledResult = results[i];
    const leadId = rows[i].id;

    if (settledResult.status === 'fulfilled') {
      const res = settledResult.value;
      if (res) {
        try {
          await updateLead(res);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          await recordError(leadId, `error: update failed (${msg})`);
        }
      } else {
        await recordError(leadId, 'error: processing returned no result');
      }
    } else {
      const reason = settledResult.reason;
      const msg = (reason instanceof Error ? reason.message : reason?.message) || 'Unknown error';
      await recordError(leadId, `error: ${msg}`);
    }
  }
  return performance.now() - start;
}

async function concurrent(pool: MockPool, updateLead: MockUpdateLead) {
  const start = performance.now();

  const recordError = async (leadId: string, errorMsg: string) => {
    try {
      await pool.query(
        `UPDATE leads SET processing_status = $1 WHERE id = $2`,
        [errorMsg, leadId]
      );
    } catch (dbErr) {}
  };

  await Promise.all(results.map(async (settledResult, i) => {
    const leadId = rows[i].id;

    if (settledResult.status === 'fulfilled') {
      const res = settledResult.value;
      if (res) {
        try {
          await updateLead(res);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          await recordError(leadId, `error: update failed (${msg})`);
        }
      } else {
        await recordError(leadId, 'error: processing returned no result');
      }
    } else {
      const reason = settledResult.reason;
      const msg = (reason instanceof Error ? reason.message : reason?.message) || 'Unknown error';
      await recordError(leadId, `error: ${msg}`);
    }
  }));
  return performance.now() - start;
}

test('Benchmark and Verification', async () => {
  const mocksSeq = createMocks();
  const mocksCon = createMocks();

  console.log('Starting benchmark...');

  const seqTime = await sequential(mocksSeq.pool, mocksSeq.updateLead);
  console.log(`Sequential: ${seqTime.toFixed(2)}ms`);

  const conTime = await concurrent(mocksCon.pool, mocksCon.updateLead);
  console.log(`Concurrent: ${conTime.toFixed(2)}ms`);

  const improvement = ((seqTime - conTime) / seqTime) * 100;
  console.log(`Improvement: ${improvement.toFixed(2)}%`);

  // Assertions for correctness
  assert.deepStrictEqual(
    [...mocksSeq.updateLead.calls].sort((a, b) => a.leadId.localeCompare(b.leadId)),
    [...mocksCon.updateLead.calls].sort((a, b) => a.leadId.localeCompare(b.leadId)),
    'updateLead should be called with same arguments'
  );
  assert.deepStrictEqual(
    [...mocksSeq.pool.calls].sort((a, b) => (a.params[1] as string).localeCompare(b.params[1] as string)),
    [...mocksCon.pool.calls].sort((a, b) => (a.params[1] as string).localeCompare(b.params[1] as string)),
    'pool.query should be called with same arguments'
  );

  assert.strictEqual(mocksSeq.updateLead.calls.length, 3, 'Should have 3 successful processLead calls that trigger updateLead');
  assert.strictEqual(mocksSeq.pool.calls.length, 3, 'Should have 3 error recordings (1 update fail, 1 process fail, 1 null result)');

  assert.ok(conTime < seqTime, 'Concurrent should be significantly faster');
  console.log('Functional verification passed.');
});
