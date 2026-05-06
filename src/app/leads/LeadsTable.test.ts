import { describe, it } from 'node:test';
import assert from 'node:assert';
import { sanitizeHtml } from '../../lib/sanitize.ts';

describe('LeadsTable handleCopy flow regression', () => {
  it('should strip dangerous payloads from the draft email before clipboard HTML and plain text creation', () => {
    // Simulate the handleCopy and parsing flow used in LeadsTable.tsx
    const dangerousDraftEmail = `<a href="javascript:alert(1)">Click Me</a><img src="x" onerror="alert(2)" /><p>Safe text <b>with bold</b></p>`;

    // 1. LeadsTable sanitizes the HTML
    const sanitizedHTML = sanitizeHtml(dangerousDraftEmail);

    // 2. LeadsTable extracts plain text via a plainTextDiv simulation
    // We can't use document.createElement in Node.js environment without JSDOM,
    // but we can verify the sanitized HTML is safe to inject into the DOM.

    // Assert the sanitized HTML contains no dangerous components
    assert.ok(!sanitizedHTML.includes('javascript:alert'), 'javascript: href stripped');
    assert.ok(!sanitizedHTML.includes('onerror'), 'onerror stripped');
    assert.ok(!sanitizedHTML.includes('<img'), 'img tags stripped');

    // Assert safe HTML is preserved
    assert.ok(sanitizedHTML.includes('<p>Safe text <b>with bold</b></p>'), 'safe html preserved');
  });
});
