## 2025-02-27 - [DOM XSS in clipboard fallback logic]
**Vulnerability:** A DOM XSS vulnerability existed in `src/app/leads/LeadsTable.tsx` within a fallback function `handleCopy` because `draftEmailHTML` (which might contain maliciously crafted payloads) was directly assigned to an unattached `div`'s `innerHTML` (`plainTextDiv.innerHTML = draftEmailHTML;`).
**Learning:** Even though `draftEmailHTML` might be sanitized server-side, it is still unsafe practice to use `innerHTML` anywhere on the frontend when handling potentially unsanitized properties, especially as `innerHTML` runs inline scripts or invokes remote resources. Use `DOMParser` instead and extract its `.body.textContent` if you strictly need text extraction without relying on `innerHTML`.
**Prevention:** To safely extract plain text from untrusted HTML on the client-side, prefer using `new DOMParser().parseFromString(html, 'text/html').body.textContent` to prevent DOM XSS vulnerabilities associated with direct `innerHTML` assignment.

## 2025-02-27 - [Missing Rate Limiting on API Endpoints]
**Vulnerability:** The `/api/lead/retry` endpoint was missing rate limiting, making it vulnerable to abuse and resource exhaustion (DoS) through repeated requests.
**Learning:** API routes built with Next.js App Router may lack default rate limiting. Endpoints that trigger database queries, external API calls, or background processing functions need explicit rate limiting to prevent abuse.
**Prevention:** Always apply the shared `isRateLimited` and `getClientIp` utilities to sensitive or resource-intensive API routes, and include rate-limit tests in the corresponding route tests.

## 2025-02-27 - [Fix timing attack vulnerability in cron authentication]
**Vulnerability:** In `/api/cron/process-leads/route.ts`, the cron endpoint checked the authorization header against the secret using a standard string inequality operator (`!==`). This makes the endpoint susceptible to a timing attack where an attacker could repeatedly query the endpoint and use the microscopic response time differences to guess the secret byte-by-byte.
**Learning:** Checking secure tokens or passwords with standard equality operations causes the check to fail fast (early exit) on the first non-matching character, thus leaking information about the matched length via timing variations.
**Prevention:** Always use `crypto.timingSafeEqual` for cryptographic authentication token comparisons to ensure the comparison time is constant, regardless of match length. Ensure lengths are identical before calling to prevent throwing a `TypeError`.

## 2024-05-30 - Fix HTML Sanitizer XSS Bypass via Obfuscated Entities
**Vulnerability:** The custom HTML sanitizer's `canonicalizeHref` did not decode HTML5 named references (`&colon;`, `&Tab;`, `&NewLine;`) or numeric references without a trailing semicolon (`&#58`, `&#x3a`) before validating the URL scheme, so payloads like `<a href="javascript&colon;alert(1)">` slipped past the `javascript:` check.
**Learning:** Browsers decode far more entity forms than a hand-written sanitizer; numeric references are decoded even without `;`.
**Prevention:** Prefer an established sanitizer (DOMPurify). If custom, decode every entity form browsers accept before scheme validation, and test each form.
