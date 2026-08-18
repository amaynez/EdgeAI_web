import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { getErrorMessage } from './errorHelper.ts';

describe('getErrorMessage', () => {
  it('returns the error message when err is an instance of Error', () => {
    const err = new Error('Test error message');
    const result = getErrorMessage(err, 'Fallback message');
    assert.strictEqual(result, 'Test error message');
  });

  it('returns the fallback message when err is a string', () => {
    const result = getErrorMessage('Some string error', 'Fallback message');
    assert.strictEqual(result, 'Fallback message');
  });

  it('returns the fallback message when err is null', () => {
    const result = getErrorMessage(null, 'Fallback message');
    assert.strictEqual(result, 'Fallback message');
  });

  it('returns the fallback message when err is undefined', () => {
    const result = getErrorMessage(undefined, 'Fallback message');
    assert.strictEqual(result, 'Fallback message');
  });

  it('returns the fallback message when err is a plain object with a message property', () => {
    const err = { message: 'Plain object error message' };
    const result = getErrorMessage(err, 'Fallback message');
    assert.strictEqual(result, 'Fallback message');
  });

  it('returns the fallback message when err is a number', () => {
    const result = getErrorMessage(404, 'Fallback message');
    assert.strictEqual(result, 'Fallback message');
  });
});
