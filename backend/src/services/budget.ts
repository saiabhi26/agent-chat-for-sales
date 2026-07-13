/**
 * A global daily ceiling on paid Claude calls.
 *
 * The per-IP rate limiter stops one caller from hammering us. It does nothing
 * about a thousand callers behaving reasonably, or one caller rotating IPs.
 * This is the ceiling on the *bill*, and it is deliberately global: there is one
 * API key, so there is one budget.
 *
 * The clock is injected so "resets at midnight UTC" is a unit test, not a
 * question we find out the answer to overnight in production.
 */

import type { Clock } from "./rateLimiter";

/** UTC calendar day, e.g. "2026-07-13". Chosen over local time so the reset does
 *  not move when Render schedules the container in a different region. */
function dayKey(t: number): string {
  return new Date(t).toISOString().slice(0, 10);
}

type Options = {
  limit: number;
  now?: Clock;
};

export function createDailyBudget({ limit, now = Date.now }: Options) {
  let day = dayKey(now());
  let used = 0;

  /** Roll the counter over if the calendar day changed since the last call. */
  function sync() {
    const today = dayKey(now());
    if (today !== day) {
      day = today;
      used = 0;
    }
  }

  return {
    /** Spends one unit if there is room. Returns false when the day is exhausted. */
    tryConsume(): boolean {
      sync();
      if (used >= limit) return false;
      used += 1;
      return true;
    },

    remaining(): number {
      sync();
      return Math.max(0, limit - used);
    },

    /** Reported by the health endpoint so the budget is observable in production. */
    status(): { day: string; used: number; limit: number } {
      sync();
      return { day, used, limit };
    },
  };
}
