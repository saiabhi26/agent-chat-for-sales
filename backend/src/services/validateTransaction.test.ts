import { describe, it, expect } from "vitest";
import { validateTransaction } from "./validateTransaction";

const valid = {
  customerName: "Acme Corp",
  amount: 50_000,
  currency: "USD",
  region: "West",
  salesRep: "Sarah Johnson",
  date: "2024-11-01",
};

describe("validateTransaction", () => {
  it("accepts a well-formed transaction", () => {
    const result = validateTransaction(valid);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual(valid);
  });

  it("accepts a numeric amount sent as a string", () => {
    const result = validateTransaction({ ...valid, amount: "50000" });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.amount).toBe(50_000);
  });

  // B1: this is the bug. parseFloat("abc") is NaN, NaN is stored, and every
  // analytics figure is NaN forever after — one request bricks the dashboard.
  it("rejects a non-numeric amount", () => {
    const result = validateTransaction({ ...valid, amount: "abc" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(" ")).toMatch(/amount/i);
  });

  it("rejects NaN and Infinity", () => {
    expect(validateTransaction({ ...valid, amount: NaN }).ok).toBe(false);
    expect(validateTransaction({ ...valid, amount: Infinity }).ok).toBe(false);
  });

  it("rejects zero and negative amounts", () => {
    expect(validateTransaction({ ...valid, amount: 0 }).ok).toBe(false);
    expect(validateTransaction({ ...valid, amount: -1 }).ok).toBe(false);
  });

  it("rejects an implausibly large amount", () => {
    expect(validateTransaction({ ...valid, amount: 10_000_001 }).ok).toBe(false);
  });

  it("rejects an unknown region", () => {
    const result = validateTransaction({ ...valid, region: "Atlantis" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(" ")).toMatch(/region/i);
  });

  it("rejects an unknown currency", () => {
    // Analytics sums amounts without converting, so an unknown currency would
    // silently corrupt every total.
    expect(validateTransaction({ ...valid, currency: "XYZ" }).ok).toBe(false);
  });

  it("rejects a malformed date", () => {
    expect(validateTransaction({ ...valid, date: "01-11-2024" }).ok).toBe(false);
    expect(validateTransaction({ ...valid, date: "2024-13-01" }).ok).toBe(false);
    expect(validateTransaction({ ...valid, date: "not a date" }).ok).toBe(false);
  });

  it("rejects an empty or over-long customer name", () => {
    expect(validateTransaction({ ...valid, customerName: "" }).ok).toBe(false);
    expect(validateTransaction({ ...valid, customerName: "x".repeat(201) }).ok).toBe(false);
  });

  it("rejects an empty or over-long sales rep", () => {
    expect(validateTransaction({ ...valid, salesRep: "" }).ok).toBe(false);
    expect(validateTransaction({ ...valid, salesRep: "x".repeat(201) }).ok).toBe(false);
  });

  it("rejects a missing field", () => {
    const { amount, ...withoutAmount } = valid;

    expect(validateTransaction(withoutAmount).ok).toBe(false);
  });

  it("rejects a non-object body", () => {
    expect(validateTransaction(null).ok).toBe(false);
    expect(validateTransaction("nope").ok).toBe(false);
    expect(validateTransaction([]).ok).toBe(false);
  });

  it("reports every problem at once, not just the first", () => {
    const result = validateTransaction({ ...valid, amount: "abc", region: "Atlantis" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  it("trims whitespace from text fields", () => {
    const result = validateTransaction({ ...valid, customerName: "  Acme Corp  " });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.customerName).toBe("Acme Corp");
  });
});
