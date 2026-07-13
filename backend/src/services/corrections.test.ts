import { describe, it, expect } from "vitest";
import { applyCorrectionsToFilters } from "./corrections";

describe("applyCorrectionsToFilters", () => {
  it("rewrites a filter value the agent got wrong", () => {
    const corrected = applyCorrectionsToFilters(
      { salesRep: "John Smith" },
      [{ originalTerm: "John Smith", resolvedTo: "Mike Chen", context: "salesRep" }]
    );

    expect(corrected).toEqual({ salesRep: "Mike Chen" });
  });

  it("only applies a correction within its own context", () => {
    // "West" as a rep name must not rewrite the West *region*.
    const corrected = applyCorrectionsToFilters(
      { region: "West" },
      [{ originalTerm: "West", resolvedTo: "Mike Chen", context: "salesRep" }]
    );

    expect(corrected).toEqual({ region: "West" });
  });

  it("matches case-insensitively", () => {
    const corrected = applyCorrectionsToFilters(
      { salesRep: "john smith" },
      [{ originalTerm: "John Smith", resolvedTo: "Mike Chen", context: "salesRep" }]
    );

    expect(corrected).toEqual({ salesRep: "Mike Chen" });
  });

  it("leaves filters untouched when nothing matches", () => {
    const filters = { salesRep: "Emily Davis", region: "North" };

    const corrected = applyCorrectionsToFilters(filters, [
      { originalTerm: "John Smith", resolvedTo: "Mike Chen", context: "salesRep" },
    ]);

    expect(corrected).toEqual(filters);
  });

  it("treats a term with regex metacharacters literally", () => {
    // B2: the old implementation did new RegExp(originalTerm), so a stored term
    // of "[" threw on every subsequent query and "(a+)+$" hung the event loop.
    const corrections = [
      { originalTerm: "[", resolvedTo: "Mike Chen", context: "salesRep" },
      { originalTerm: "(a+)+$", resolvedTo: "Mike Chen", context: "salesRep" },
    ];

    expect(() =>
      applyCorrectionsToFilters({ salesRep: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!" }, corrections)
    ).not.toThrow();

    // And it still matches the literal string, rather than as a pattern.
    expect(applyCorrectionsToFilters({ salesRep: "[" }, corrections)).toEqual({
      salesRep: "Mike Chen",
    });
  });

  it("applies the most recent correction when a term was corrected twice", () => {
    const corrected = applyCorrectionsToFilters(
      { salesRep: "Chen" },
      [
        { originalTerm: "Chen", resolvedTo: "Sarah Chen", context: "salesRep" },
        { originalTerm: "Chen", resolvedTo: "Mike Chen", context: "salesRep" },
      ]
    );

    expect(corrected).toEqual({ salesRep: "Mike Chen" });
  });

  it("does not rewrite a value that merely contains the term", () => {
    // "Chen" -> "Mike Chen" must not turn "Chen Industries" (a customer) into
    // "Mike Chen Industries". Whole-value match only.
    const corrected = applyCorrectionsToFilters(
      { customerName: "Chen Industries" },
      [{ originalTerm: "Chen", resolvedTo: "Mike Chen", context: "customerName" }]
    );

    expect(corrected).toEqual({ customerName: "Chen Industries" });
  });
});
