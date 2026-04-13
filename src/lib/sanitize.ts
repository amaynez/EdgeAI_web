/**
 * Server-safe HTML sanitizer for AI-generated content.
 *
 * Strategy: allow-list of tags and attributes only; strip everything else.
 * This runs in the Next.js API route (Node.js) before data is persisted,
 * making dangerouslySetInnerHTML safe on the client side.
 *
 * No external dependencies required.
 */

// Tags that are safe for email-style rich text.
const ALLOWED_TAGS = new Set([
  'a', 'b', 'br', 'div', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'hr', 'i', 'li', 'ol', 'p', 'span', 'strong', 'table', 'tbody',
  'td', 'th', 'thead', 'tr', 'u', 'ul',
]);

// Attributes that are safe per tag.
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  '*':  new Set(['class', 'style']),         // allowed everywhere
  'a':  new Set(['href', 'class', 'style']), // href gets extra validation below
  'td': new Set(['colspan', 'rowspan', 'class', 'style']),
  'th': new Set(['colspan', 'rowspan', 'class', 'style']),
};

// Attribute values that must NOT contain javascript: or data: URIs.
// Kept as a secondary fallback after canonicalization.
const UNSAFE_HREF_RE = /^\s*(?:javascript|data|vbscript):/i;

// Strict allowlist of URL schemes that are safe in href attributes.
const ALLOWED_HREF_SCHEMES = new Set(['http', 'https', 'mailto', 'tel']);

/**
 * Canonicalize an href attribute value to expose obfuscated dangerous schemes.
 * Steps: decode HTML entities → strip control chars/nulls → URL-decode → lowercase.
 * Returns the scheme (e.g. "javascript") or an empty string for relative URLs.
 */
function canonicalizeHref(raw: string): { safe: boolean; canonical: string } {
  // 1. Decode common HTML entities
  let s = raw
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));

  // 2. Strip null bytes and ASCII control characters (\x00-\x1F, \x7F)
  // eslint-disable-next-line no-control-regex
  s = s.replace(/[\x00-\x1F\x7F]/g, '');

  // 3. Collapse repeated whitespace/control sequences and trim
  s = s.trim();

  // 4. URL-decode percent-encodings (best-effort; ignore malformed)
  try { s = decodeURIComponent(s); } catch { /* leave as-is */ }

  // 5. Lowercase for scheme comparison
  const canonical = s.toLowerCase();

  // 6. Extract scheme
  const schemeMatch = canonical.match(/^([a-z][a-z0-9+\-.]*):/);
  if (!schemeMatch) {
    // Relative URL or anchor — safe if it also passes the regex fallback
    return { safe: !UNSAFE_HREF_RE.test(canonical), canonical };
  }

  const scheme = schemeMatch[1];
  const safe = ALLOWED_HREF_SCHEMES.has(scheme) && !UNSAFE_HREF_RE.test(canonical);
  return { safe, canonical };
}

/**
 * Strip a single tag to its safe form, or drop it entirely.
 * Returns the sanitized tag string, or '' to remove the tag.
 */
function sanitizeTag(tagStr: string): string {
  // Extract tag name (handles closing tags like </p>)
  const isClosing = tagStr.startsWith('</');
  const inner = tagStr.slice(isClosing ? 2 : 1, -1).trim();
  const nameMatch = inner.match(/^[\w-]+/);
  if (!nameMatch) return '';

  const tagName = nameMatch[0].toLowerCase();

  if (!ALLOWED_TAGS.has(tagName)) {
    return ''; // drop unknown tags entirely
  }

  if (isClosing) {
    return `</${tagName}>`;
  }

  const isSelfClosing = tagStr.endsWith('/>');
  const allowedForTag = new Set([
    ...(ALLOWED_ATTRS['*'] || []),
    ...(ALLOWED_ATTRS[tagName] || []),
  ]);

  // Parse attributes with a simple regex
  const attrStr = inner.slice(tagName.length);
  const attrRe = /([\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;
  const safeAttrs: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = attrRe.exec(attrStr)) !== null) {
    const attrName = match[1].toLowerCase();
    const attrValue = match[2] ?? match[3] ?? match[4] ?? '';

    if (!allowedForTag.has(attrName)) continue;

    // Extra check: href must pass canonicalization + scheme allowlist
    if (attrName === 'href') {
      const { safe } = canonicalizeHref(attrValue);
      if (!safe) continue;
    }

    // Reject values that contain event-handler-like patterns in inline styles
    if (attrName === 'style' && /expression\s*\(/i.test(attrValue)) continue;

    safeAttrs.push(`${attrName}="${attrValue.replace(/"/g, '&quot;')}"`);
  }

  const attrOutput = safeAttrs.length > 0 ? ' ' + safeAttrs.join(' ') : '';
  return `<${tagName}${attrOutput}${isSelfClosing ? ' /' : ''}>`;
}

/**
 * Sanitize an HTML string to an allow-list of tags and attributes.
 * Strips event handlers, javascript: URLs, and all disallowed markup.
 *
 * Safe to call in Node.js (no DOM required).
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';

  // 1. Remove HTML comments (<!-- ... -->)
  let output = html.replace(/<!--[\s\S]*?-->/g, '');

  // 2. Remove <script>, <style>, <object>, <iframe>, <embed> blocks and their content
  output = output.replace(
    /<(script|style|object|iframe|embed|link|meta|base|form|input|button|textarea|select)[\s\S]*?<\/\1>/gi,
    ''
  );
  // Also strip self-closing dangerous tags
  output = output.replace(
    /<(script|style|object|iframe|embed|link|meta|base|form|input|button|textarea|select)[^>]*\/?>/gi,
    ''
  );

  // 3. Strip on* event handler attributes globally (belt-and-suspenders)
  output = output.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');

  // 4. Process remaining tags through the allow-list sanitizer
  output = output.replace(/<\/?[\w][\s\S]*?>/g, (tag) => sanitizeTag(tag));

  return output;
}
