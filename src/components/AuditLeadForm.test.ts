import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { getErrorMessage } from '../lib/errorHelper.ts';

describe('AuditLeadForm Error Handling Logic', () => {
  test('Error block safely processes an Error instance', () => {
    let caughtErr: unknown;
    try {
      throw new Error('Failed to submit form');
    } catch (err: unknown) {
      caughtErr = err;
    }

    const fallbackMessage = 'Something went wrong';
    const errMsg = getErrorMessage(caughtErr, fallbackMessage);

    assert.strictEqual(errMsg, 'Failed to submit form');
  });

  test('Error block safely falls back when error is not an Error instance', () => {
    let caughtErr: unknown;
    try {
      throw 'A string error';
    } catch (err: unknown) {
      caughtErr = err;
    }

    const fallbackMessage = 'Something went wrong';
    const errMsg = getErrorMessage(caughtErr, fallbackMessage);

    assert.strictEqual(errMsg, 'Something went wrong');
  });
});
