/**
 * A sliding-window rate limiter, keyed by caller (in practice, client IP).
 *
 * The clock is injected rather than read from `Date.now()` so that "the 4th
 * request in a minute is rejected, and allowed again 60s later" is a unit test
 * that runs in microseconds instead of one that sleeps.
 */

export type Clock = () => number;

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

type Options = {
  limit: number;
  windowMs: number;
  now?: Clock;
};

export function createRateLimiter({ limit, windowMs, now = Date.now }: Options) {
  /** Per key, the timestamps of the requests that were *allowed*. */
  const hits = new Map<string, number[]>();

  function check(key: string): RateLimitResult {
    const t = now();
    const cutoff = t - windowMs;

    const recent = (hits.get(key) ?? []).filter((ts) => ts > cutoff);

    if (recent.length >= limit) {
      // The rejected request is deliberately NOT recorded. Recording it would
      // let a client hammering in a loop keep pushing its own window forward
      // and never recover.
      hits.set(key, recent);

      const waitMs = recent[0] + windowMs - t;
      return {
        allowed: false,
        // Round up: a `Retry-After: 0` invites an instant retry that is
        // guaranteed to fail again.
        retryAfterSeconds: Math.max(1, Math.ceil(waitMs / 1000)),
      };
    }

    recent.push(t);
    hits.set(key, recent);

    // A long-lived process would otherwise hold one entry per unique visitor IP
    // for the life of the container. Sweeping on write keeps the map
    // proportional to *active* callers rather than to everyone who ever visited.
    for (const [k, timestamps] of hits) {
      if (timestamps.every((ts) => ts <= cutoff)) hits.delete(k);
    }

    return { allowed: true };
  }

  return {
    check,
    /** Keys currently tracked. Exposed so the eviction sweep above is testable. */
    size: () => hits.size,
  };
}
