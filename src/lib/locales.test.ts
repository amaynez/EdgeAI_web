import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from './locales.ts';

describe('locales', () => {
  test('SUPPORTED_LOCALES contains expected locales', () => {
    assert.deepEqual(SUPPORTED_LOCALES, ['en', 'es']);
  });

  test('DEFAULT_LOCALE is en', () => {
    assert.strictEqual(DEFAULT_LOCALE, 'en');
  });

  test('DEFAULT_LOCALE is one of the SUPPORTED_LOCALES', () => {
    assert.ok((SUPPORTED_LOCALES as readonly string[]).includes(DEFAULT_LOCALE));
  });
});
