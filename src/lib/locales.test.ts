import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from './locales.ts';
import fs from 'node:fs';
import path from 'node:path';

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

  test('every supported locale has a corresponding JSON dictionary', () => {
    const localesDir = path.join(process.cwd(), 'src/locales');
    SUPPORTED_LOCALES.forEach(locale => {
      const filePath = path.join(localesDir, `${locale}.json`);
      assert.ok(fs.existsSync(filePath), `Dictionary for locale "${locale}" should exist at ${filePath}`);
    });
  });
});
