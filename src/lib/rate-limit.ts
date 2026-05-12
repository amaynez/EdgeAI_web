// ---------------------------------------------------------------------------
// In-memory rate limiter (10 requests per IP per 15-minute window).
// NOTE: In a multi-instance/serverless environment each cold-start gets its
// own Map. For stricter limits use a shared store such as Upstash Redis.
// ---------------------------------------------------------------------------
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface RateEntry { count: number; windowStart: number }
const rateLimitStore = new Map<string, RateEntry>();

export function getClientIp(request: Request): string {
  // Prioritize x-real-ip as it is provided by Vercel's edge and is more resistant to spoofing
  // than x-forwarded-for which can be manipulated by the client.
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // When behind a single trusted proxy like Vercel, the last IP in the chain
    // is the one that connected to the proxy. We take the last one to avoid
    // trusting spoofed IPs prepended by the client.
    const ips = forwarded.split(',');
    return ips[ips.length - 1].trim();
  }

  return 'unknown';
}

export function isRateLimited(ip: string): boolean {
  const now = Date.now();

  // Prune stale entries to prevent unbounded Map growth.
  for (const [key, rec] of rateLimitStore) {
    if (now - rec.windowStart > RATE_LIMIT_WINDOW_MS) {
      rateLimitStore.delete(key);
    }
  }

  const entry = rateLimitStore.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, { count: 1, windowStart: now });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX) return true;

  // Update in-memory count and move entry to end of insertion order for O(1) prune logic
  const updatedEntry = { count: entry.count + 1, windowStart: entry.windowStart };
  rateLimitStore.delete(ip);
  rateLimitStore.set(ip, updatedEntry);
  return false;
}
