import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeHtml } from './sanitize.ts';

describe('sanitizeHtml', () => {
  test('returns empty string for non-string or empty input', () => {
    // @ts-ignore
    assert.strictEqual(sanitizeHtml(null), '');
    // @ts-ignore
    assert.strictEqual(sanitizeHtml(undefined), '');
    // @ts-ignore
    assert.strictEqual(sanitizeHtml(123), '');
    assert.strictEqual(sanitizeHtml(''), '');
  });

  test('preserves allowed tags and attributes', () => {
    const input = '<p class="text-large" style="color: red;">Hello <strong>World</strong></p>';
    const expected = '<p class="text-large" style="color: red;">Hello <strong>World</strong></p>';
    assert.strictEqual(sanitizeHtml(input), expected);
  });

  test('removes disallowed tags but keeps content where appropriate', () => {
    const input = '<div>Safe</div><section>Unsafe</section><footer>Also Unsafe</footer>';
    // <div> is allowed, <section> and <footer> are not.
    // The current implementation of sanitizeTag returns '' for unknown tags,
    // which effectively removes the tag but keeps the inner content because
    // only the tag itself is replaced by the regex in step 4.
    const result = sanitizeHtml(input);
    assert.ok(result.includes('<div>Safe</div>'));
    assert.ok(result.includes('Unsafe'));
    assert.ok(result.includes('Also Unsafe'));
    assert.ok(!result.includes('<section>'));
    assert.ok(!result.includes('<footer>'));
  });

  test('removes dangerous blocks and their content', () => {
    const input = '<div>Safe</div><script>alert("xss")</script><style>body { color: red; }</style><iframe></iframe>';
    const result = sanitizeHtml(input);
    assert.strictEqual(result, '<div>Safe</div>');
  });

  test('strips HTML comments', () => {
    const input = '<div>Safe</div><!-- <script>alert("xss")</script> -->';
    assert.strictEqual(sanitizeHtml(input), '<div>Safe</div>');
  });

  test('removes global event handlers', () => {
    const input = '<div onclick="alert(\'xss\')" onmouseover="evil()">Content</div>';
    const result = sanitizeHtml(input);
    assert.strictEqual(result, '<div>Content</div>');
  });

  test('sanitizes href attributes', () => {
    const cases = [
      { input: '<a href="https://example.com">Link</a>', expected: '<a href="https://example.com">Link</a>' },
      { input: '<a href="http://example.com">Link</a>', expected: '<a href="http://example.com">Link</a>' },
      { input: '<a href="mailto:test@example.com">Email</a>', expected: '<a href="mailto:test@example.com">Email</a>' },
      { input: '<a href="tel:+123456789">Tel</a>', expected: '<a href="tel:+123456789">Tel</a>' },
      { input: '<a href="javascript:alert(\'xss\')">XSS</a>', expected: '<a>XSS</a>' },
      { input: '<a href="  java\nscript:alert(\'xss\')">XSS</a>', expected: '<a>XSS</a>' },
      { input: '<a href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==">XSS</a>', expected: '<a>XSS</a>' },
      { input: '<a href="&amp;#x6A;&amp;#x61;&amp;#x76;&amp;#x61;&amp;#x73;&amp;#x63;&amp;#x72;&amp;#x69;&amp;#x70;&amp;#x74;&amp;#x3A;alert(1)">Obfuscated</a>', expected: '<a>Obfuscated</a>' },
    ];

    for (const { input, expected } of cases) {
      assert.strictEqual(sanitizeHtml(input), expected);
    }
  });

  test('handles malformed tags', () => {
    const input = '<div class="test" >Malformed <p';
    const result = sanitizeHtml(input);
    assert.ok(result.includes('<div class="test">'));
    // Unclosed tags at end of input are now stripped for safety
    assert.strictEqual(result, '<div class="test">Malformed ');
  });

  test('blocks unsafe style expressions', () => {
    const input = '<div style="width: expression(alert(\'xss\')); color: red;">Test</div>';
    const result = sanitizeHtml(input);
    // The current implementation skips the entire style attribute if it matches /expression\s*\(/i
    assert.strictEqual(result, '<div>Test</div>');
  });

  test('preserves nested allowed tags', () => {
    const input = '<ul><li>Item 1</li><li>Item 2 <em>nested</em></li></ul>';
    assert.strictEqual(sanitizeHtml(input), input);
  });

  test('handles self-closing tags', () => {
    const input = 'Line 1<br />Line 2<hr/>';
    // Note: sanitizeTag might normalize <br /> to <br /> or <br> depending on implementation.
    // Looking at sanitizeTag: return `<${tagName}${attrOutput}${isSelfClosing ? ' /' : ''}>`;
    const result = sanitizeHtml(input);
    assert.strictEqual(result, 'Line 1<br />Line 2<hr />');
  });

  test('sanitizes attributes and escapes quotes', () => {
    const input = '<div class=\'foo " bar\'>Content</div>';
    const result = sanitizeHtml(input);
    assert.strictEqual(result, '<div class="foo &quot; bar">Content</div>');
  });

  test('handles tags with > in attribute values', () => {
    const input = '<a href="https://example.com/?q=>">Link</a>';
    const result = sanitizeHtml(input);
    assert.strictEqual(result, '<a href="https://example.com/?q=>">Link</a>');
  });

  test('removes unclosed dangerous tags', () => {
    const input = 'Dangerous <script src="http://evil.com/xss.js"';
    const result = sanitizeHtml(input);
    assert.strictEqual(result, 'Dangerous ');
  });

  test('removes unclosed HTML comments', () => {
    const input = 'Safe<!-- <script>alert("xss")</script>';
    const result = sanitizeHtml(input);
    assert.strictEqual(result, 'Safe');
  });
});

import { escapeHtml } from './sanitize.ts';

describe('escapeHtml', () => {
  test('escapes special characters', () => {
    assert.strictEqual(escapeHtml('<script>alert("XSS & fun\'s")</script>'), '&lt;script&gt;alert(&quot;XSS &amp; fun&#x27;s&quot;)&lt;/script&gt;');
  });

  test('handles null and undefined', () => {
    assert.strictEqual(escapeHtml(null), '');
    assert.strictEqual(escapeHtml(undefined), '');
  });

  test('handles non-strings by stringifying', () => {
    // @ts-ignore
    assert.strictEqual(escapeHtml(123), '123');
  });
});
