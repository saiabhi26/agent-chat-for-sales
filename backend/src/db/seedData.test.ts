import { describe, it, expect } from "vitest";
import { loadSeedTransactions, validateSeed } from "./seedData";

describe("loadSeedTransactions", () => {
  it("returns a non-empty list", () => {
    expect(loadSeedTransactions().length).toBeGreaterThan(0);
  });

  it("returns only well-formed transactions", () => {
    const allowedRegions = ["North", "South", "East", "West", "Central"];
    const allowedCurrencies = ["USD", "EUR", "GBP"];

    for (const tx of loadSeedTransactions()) {
      expect(typeof tx.customerName).toBe("string");
      expect(tx.customerName.length).toBeGreaterThan(0);
      expect(Number.isFinite(tx.amount)).toBe(true);
      expect(tx.amount).toBeGreaterThan(0);
      expect(allowedCurrencies).toContain(tx.currency);
      expect(allowedRegions).toContain(tx.region);
      expect(typeof tx.salesRep).toBe("string");
      expect(tx.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("throws a clear error on a malformed record", () => {
    expect(() => validateSeed([{ customerName: "X", amount: "abc" }])).toThrow(
      /amount/
    );
  });
});
