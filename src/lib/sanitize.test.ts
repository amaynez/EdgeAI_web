import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeHtml } from './sanitize.ts';

test('sanitizeHtml: basic permitted tags and attributes', () => {
  const input = '<p class="test" style="color: red;"><b>Bold</b> <i>Italic</i> <a href="https://example.com">Link</a></p>';
  const expected = '<p class="test" style="color: red;"><b>Bold</b> <i>Italic</i> <a href="https://example.com">Link</a></p>';
  assert.strictEqual(sanitizeHtml(input), expected);
});

test('sanitizeHtml: stripping prohibited tags and dangerous content blocks', () => {
  const input = '<div>Safe</div><script>alert("xss")</script><style>body { color: red; }</style><iframe></iframe>';
  const expected = '<div>Safe</div>';
  assert.strictEqual(sanitizeHtml(input), expected);

  const unknown = '<marquee>Scrolling text</marquee>';
  assert.strictEqual(sanitizeHtml(unknown), 'Scrolling text');
});

test('sanitizeHtml: global event handler stripping', () => {
  const input = '<div onclick="alert(1)" onmouseover="evil()">Content</div>';
  const expected = '<div>Content</div>';
  assert.strictEqual(sanitizeHtml(input), expected);
});

test('sanitizeHtml: href attribute sanitization and canonicalization', () => {
  // Allowed schemes
  assert.strictEqual(sanitizeHtml('<a href="http://example.com">HTTP</a>'), '<a href="http://example.com">HTTP</a>');
  assert.strictEqual(sanitizeHtml('<a href="https://example.com">HTTPS</a>'), '<a href="https://example.com">HTTPS</a>');
  assert.strictEqual(sanitizeHtml('<a href="mailto:test@example.com">Mailto</a>'), '<a href="mailto:test@example.com">Mailto</a>');
  assert.strictEqual(sanitizeHtml('<a href="tel:+123456789">Tel</a>'), '<a href="tel:+123456789">Tel</a>');

  // Disallowed schemes
  assert.strictEqual(sanitizeHtml('<a href="javascript:alert(1)">JS</a>'), '<a>JS</a>');
  assert.strictEqual(sanitizeHtml('<a href="data:text/html,base64,xxx">Data</a>'), '<a>Data</a>');
  assert.strictEqual(sanitizeHtml('<a href="vbscript:msgbox(1)">VBS</a>'), '<a>VBS</a>');

  // Obfuscated schemes
  assert.strictEqual(sanitizeHtml('<a href="&#106;avascript:alert(1)">Encoded</a>'), '<a>Encoded</a>');
  assert.strictEqual(sanitizeHtml('<a href="j&#x61;vascript:alert(1)">Encoded Hex</a>'), '<a>Encoded Hex</a>');
});

test('sanitizeHtml: edge cases and specific security checks', () => {
  // Null/Empty/Non-string
  assert.strictEqual(sanitizeHtml(null as any), '');
  assert.strictEqual(sanitizeHtml(''), '');
  assert.strictEqual(sanitizeHtml(123 as any), '');

  // Malformed HTML
  assert.strictEqual(sanitizeHtml('<p>Unclosed'), '<p>Unclosed');

  // style attribute expression
  assert.strictEqual(sanitizeHtml('<div style="width: expression(alert(1))">Expression</div>'), '<div>Expression</div>');
});
