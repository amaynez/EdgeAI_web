import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { getErrorMessage } from './errorHelper';

describe('getErrorMessage', () => {
  it('returns the error message if err is an Error instance', () => {
    const error = new Error('This is a test error');
    const result = getErrorMessage(error, 'Fallback message');
    assert.strictEqual(result, 'This is a test error');
  });

  it('returns the fallback message if err is a string', () => {
    const result = getErrorMessage('Just a string error', 'Fallback message');
    assert.strictEqual(result, 'Fallback message');
  });

  it('returns the fallback message if err is a plain object', () => {
    const result = getErrorMessage({ message: 'Object error' }, 'Fallback message');
    assert.strictEqual(result, 'Fallback message');
  });

  it('returns the fallback message if err is null', () => {
    const result = getErrorMessage(null, 'Fallback message');
    assert.strictEqual(result, 'Fallback message');
  });

  it('returns the fallback message if err is undefined', () => {
    const result = getErrorMessage(undefined, 'Fallback message');
    assert.strictEqual(result, 'Fallback message');
  });
});
