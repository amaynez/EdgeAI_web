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
  if (realIp?.trim()) return realIp.trim();

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded?.trim()) {
    // When behind a single trusted proxy like Vercel, the last IP in the chain
    // is the one that connected to the proxy. We take the last one to avoid
    // trusting spoofed IPs prepended by the client.
    const ips = forwarded.split(',').map(ip => ip.trim()).filter(Boolean);
    if (ips.length > 0) {
      return ips[ips.length - 1];
    }
  }

  return 'unknown';
}

export function isRateLimited(ip: string): boolean {
  const now = Date.now();

  // Prune stale entries to prevent unbounded Map growth.
  // Map maintains insertion order. Stale entries will always be at the front.
  for (const [key, rec] of rateLimitStore) {
    if (now - rec.windowStart > RATE_LIMIT_WINDOW_MS) {
      rateLimitStore.delete(key);
    } else {
      // Optimization: Once we hit a non-stale entry, we can stop because
      // following entries are guaranteed to be newer.
      break;
    }
  }

  const entry = rateLimitStore.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    // New entry or expired window: add to end of insertion order
    if (entry) rateLimitStore.delete(ip);
    rateLimitStore.set(ip, { count: 1, windowStart: now });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX) return true;

  // Update in-memory count.
  // Note: We DO NOT delete/re-set here because that would move the entry
  // to the end of the Map, breaking the time-based ordering required for
  // the amortized O(1) pruning optimization above.
  entry.count += 1;
  return false;
}
