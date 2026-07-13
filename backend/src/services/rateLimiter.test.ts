import { describe, it, expect } from "vitest";
import { createRateLimiter } from "./rateLimiter";

/**
 * A controllable clock. Every test here runs in a few microseconds and never
 * touches the network — the whole point of injecting time rather than reading it.
 */
function fakeClock(start = 0) {
  let t = start;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

describe("createRateLimiter", () => {
  it("allows requests up to the limit", () => {
    const clock = fakeClock();
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000, now: clock.now });

    expect(limiter.check("1.1.1.1").allowed).toBe(true);
    expect(limiter.check("1.1.1.1").allowed).toBe(true);
    expect(limiter.check("1.1.1.1").allowed).toBe(true);
  });

  it("rejects the request that exceeds the limit", () => {
    const clock = fakeClock();
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000, now: clock.now });

    limiter.check("1.1.1.1");
    limiter.check("1.1.1.1");
    limiter.check("1.1.1.1");

    expect(limiter.check("1.1.1.1").allowed).toBe(false);
  });

  it("tracks each key separately — one noisy IP cannot lock out everyone else", () => {
    const clock = fakeClock();
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: clock.now });

    expect(limiter.check("1.1.1.1").allowed).toBe(true);
    expect(limiter.check("1.1.1.1").allowed).toBe(false);

    expect(limiter.check("2.2.2.2").allowed).toBe(true);
  });

  it("allows again once the window has slid past the old requests", () => {
    const clock = fakeClock();
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000, now: clock.now });

    limiter.check("1.1.1.1");
    limiter.check("1.1.1.1");
    expect(limiter.check("1.1.1.1").allowed).toBe(false);

    clock.advance(60_001);

    expect(limiter.check("1.1.1.1").allowed).toBe(true);
  });

  it("expires requests individually, not the whole window at once", () => {
    const clock = fakeClock();
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000, now: clock.now });

    limiter.check("1.1.1.1"); // t=0
    clock.advance(30_000);
    limiter.check("1.1.1.1"); // t=30s
    expect(limiter.check("1.1.1.1").allowed).toBe(false);

    // At t=60,001 the first request has aged out but the second (t=30s) has not.
    // A fixed window would have reset both; a sliding window frees exactly one slot.
    clock.advance(30_001);

    expect(limiter.check("1.1.1.1").allowed).toBe(true);
    expect(limiter.check("1.1.1.1").allowed).toBe(false);
  });

  it("reports how long to wait, so the client can be told rather than guess", () => {
    const clock = fakeClock();
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: clock.now });

    limiter.check("1.1.1.1"); // t=0
    clock.advance(20_000);

    const result = limiter.check("1.1.1.1");

    expect(result.allowed).toBe(false);
    // The oldest request ages out at t=60s; we are at t=20s.
    expect(result.allowed === false && result.retryAfterSeconds).toBe(40);
  });

  it("always reports at least 1 second — never a retry-after of 0", () => {
    const clock = fakeClock();
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: clock.now });

    limiter.check("1.1.1.1");
    clock.advance(59_999); // 1ms left, which rounds down to 0 seconds

    const result = limiter.check("1.1.1.1");

    // A `Retry-After: 0` invites an instant retry that is guaranteed to fail again.
    expect(result.allowed === false && result.retryAfterSeconds).toBe(1);
  });

  it("does not count rejected requests against the limit", () => {
    const clock = fakeClock();
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: clock.now });

    limiter.check("1.1.1.1"); // t=0, allowed
    clock.advance(10_000);
    limiter.check("1.1.1.1"); // rejected — must NOT be recorded
    clock.advance(50_001); // t=60,001: the ONLY recorded request has aged out

    // If the rejected request had been recorded, it would still be inside the
    // window and this would fail — a hammering client would extend its own ban
    // forever and never recover.
    expect(limiter.check("1.1.1.1").allowed).toBe(true);
  });

  it("forgets keys that have gone quiet, so memory does not grow forever", () => {
    const clock = fakeClock();
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: clock.now });

    limiter.check("1.1.1.1");
    expect(limiter.size()).toBe(1);

    clock.advance(60_001);
    limiter.check("2.2.2.2");

    // 1.1.1.1 has no live requests left; its entry must be gone, not just empty.
    // This process is long-lived and every unique visitor IP would otherwise
    // leak an entry for the life of the container.
    expect(limiter.size()).toBe(1);
  });
});
