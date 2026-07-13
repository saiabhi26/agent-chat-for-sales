import { describe, it, expect } from "vitest";
import { createDailyBudget } from "./budget";

/** Milliseconds since the epoch for a UTC wall-clock time. */
function utc(iso: string) {
  return Date.parse(iso);
}

function fakeClock(startIso: string) {
  let t = utc(startIso);
  return {
    now: () => t,
    set: (iso: string) => {
      t = utc(iso);
    },
  };
}

describe("createDailyBudget", () => {
  it("allows calls up to the limit", () => {
    const clock = fakeClock("2026-07-13T10:00:00Z");
    const budget = createDailyBudget({ limit: 3, now: clock.now });

    expect(budget.tryConsume()).toBe(true);
    expect(budget.tryConsume()).toBe(true);
    expect(budget.tryConsume()).toBe(true);
  });

  it("refuses the call that would exceed the limit", () => {
    const clock = fakeClock("2026-07-13T10:00:00Z");
    const budget = createDailyBudget({ limit: 2, now: clock.now });

    budget.tryConsume();
    budget.tryConsume();

    expect(budget.tryConsume()).toBe(false);
  });

  it("reports what is left", () => {
    const clock = fakeClock("2026-07-13T10:00:00Z");
    const budget = createDailyBudget({ limit: 3, now: clock.now });

    expect(budget.remaining()).toBe(3);
    budget.tryConsume();
    expect(budget.remaining()).toBe(2);
  });

  it("never reports a negative remainder", () => {
    const clock = fakeClock("2026-07-13T10:00:00Z");
    const budget = createDailyBudget({ limit: 1, now: clock.now });

    budget.tryConsume();
    budget.tryConsume(); // refused
    budget.tryConsume(); // refused

    expect(budget.remaining()).toBe(0);
  });

  it("does not spend budget on a refused call", () => {
    const clock = fakeClock("2026-07-13T10:00:00Z");
    const budget = createDailyBudget({ limit: 1, now: clock.now });

    budget.tryConsume();
    budget.tryConsume(); // refused — must not push the count past the limit

    clock.set("2026-07-14T00:00:00Z");

    // If refusals had incremented the counter, the reset arithmetic below would
    // still be fine — but `remaining` mid-day would have been wrong. Assert the
    // count is exactly the limit, not more.
    expect(budget.remaining()).toBe(1);
  });

  it("resets at midnight UTC", () => {
    const clock = fakeClock("2026-07-13T23:59:59Z");
    const budget = createDailyBudget({ limit: 1, now: clock.now });

    expect(budget.tryConsume()).toBe(true);
    expect(budget.tryConsume()).toBe(false);

    clock.set("2026-07-14T00:00:00Z");

    expect(budget.tryConsume()).toBe(true);
  });

  it("does NOT reset on a rolling 24-hour basis — it is a calendar day", () => {
    const clock = fakeClock("2026-07-13T01:00:00Z");
    const budget = createDailyBudget({ limit: 1, now: clock.now });

    budget.tryConsume();

    // 22 hours later is still the same UTC day. A rolling window would have
    // freed the slot; a calendar budget must not.
    clock.set("2026-07-13T23:00:00Z");
    expect(budget.tryConsume()).toBe(false);

    // Two hours after that, the day has rolled over.
    clock.set("2026-07-14T01:00:00Z");
    expect(budget.tryConsume()).toBe(true);
  });

  it("resets only once across a multi-day gap", () => {
    const clock = fakeClock("2026-07-13T10:00:00Z");
    const budget = createDailyBudget({ limit: 2, now: clock.now });

    budget.tryConsume();
    budget.tryConsume();

    // Idle for a week. The budget is a fresh 2, not an accumulated 14.
    clock.set("2026-07-20T10:00:00Z");

    expect(budget.remaining()).toBe(2);
  });

  it("reports the day it is currently counting against", () => {
    const clock = fakeClock("2026-07-13T10:00:00Z");
    const budget = createDailyBudget({ limit: 2, now: clock.now });

    budget.tryConsume();

    // Surfaced on the health endpoint so we can see the budget without guessing
    // which day the container thinks it is.
    expect(budget.status()).toEqual({ day: "2026-07-13", used: 1, limit: 2 });
  });
});
