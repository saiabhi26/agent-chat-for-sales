import { describe, it, expect } from "vitest";
import { checkDrift, DRIFT_THRESHOLD } from "./drift";

describe("checkDrift", () => {
  it("fires when a region's average deal size moves more than the threshold", () => {
    const drift = checkDrift({ West: 50_000 }, { West: 70_000 }); // +40%

    expect(drift).toEqual({ region: "West", before: 50_000, after: 70_000 });
  });

  it("fires on a drop, not just a rise", () => {
    const drift = checkDrift({ West: 100_000 }, { West: 50_000 }); // -50%

    expect(drift?.region).toBe("West");
  });

  it("does not fire below the threshold", () => {
    const drift = checkDrift({ West: 100_000 }, { West: 110_000 }); // +10%

    expect(drift).toBeNull();
  });

  it("does not fire exactly at the threshold — it must be *more than*", () => {
    // The comment said "more than 20%" while the code fired at >= 10%. Now they agree.
    const after = 100_000 * (1 + DRIFT_THRESHOLD);

    expect(checkDrift({ West: 100_000 }, { West: after })).toBeNull();
  });

  it("fires just above the threshold", () => {
    const after = 100_000 * (1 + DRIFT_THRESHOLD) + 1;

    expect(checkDrift({ West: 100_000 }, { West: after })?.region).toBe("West");
  });

  it("does not treat a brand-new region as drift", () => {
    // A region with no prior average hasn't *drifted* — there is nothing to
    // drift from. Deliberate: the alert means "something changed", not
    // "something appeared".
    const drift = checkDrift({ West: 50_000 }, { West: 50_000, South: 900_000 });

    expect(drift).toBeNull();
  });

  it("ignores a region that disappeared", () => {
    expect(checkDrift({ West: 50_000, South: 40_000 }, { West: 50_000 })).toBeNull();
  });

  it("does not divide by zero when a prior average was zero", () => {
    expect(() => checkDrift({ West: 0 }, { West: 50_000 })).not.toThrow();
    expect(checkDrift({ West: 0 }, { West: 50_000 })).toBeNull();
  });

  it("rounds the reported figures", () => {
    const drift = checkDrift({ West: 50_000.4 }, { West: 70_000.6 });

    expect(drift).toEqual({ region: "West", before: 50_000, after: 70_001 });
  });
});
