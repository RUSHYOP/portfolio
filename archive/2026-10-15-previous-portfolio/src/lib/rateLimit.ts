// Fixed-window in-memory rate limiter: one window per key, reset on expiry.
interface Entry {
  count: number;
  resetAt: number;
}

/** Fixed-window in-memory limiter (per server instance — fine for a single-owner site). */
export function createRateLimiter(opts: { max: number; windowMs: number; now?: () => number }) {
  const now = opts.now ?? (() => Date.now());
  const hits = new Map<string, Entry>();
  return {
    check(key: string): { allowed: boolean; retryAfterSec: number } {
      const t = now();
      const e = hits.get(key);
      // No entry, or the window has elapsed: start a fresh window.
      if (!e || t >= e.resetAt) {
        hits.set(key, { count: 1, resetAt: t + opts.windowMs });
        return { allowed: true, retryAfterSec: 0 };
      }
      // Within the window and at capacity: block, reporting seconds until reset.
      if (e.count >= opts.max) return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((e.resetAt - t) / 1000)) };
      e.count++;
      return { allowed: true, retryAfterSec: 0 };
    },
  };
}
