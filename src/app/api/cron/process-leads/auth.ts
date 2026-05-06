import { timingSafeEqual, createHash } from 'node:crypto';

/**
 * Performs a constant-time comparison of two strings using SHA-256 hashing.
 * This prevents timing attacks that could reveal information about the strings.
 */
export function secureCompare(a: string, b: string): boolean {
  const hashA = createHash('sha256').update(a).digest();
  const hashB = createHash('sha256').update(b).digest();
  return timingSafeEqual(hashA, hashB);
}
