export type Correction = {
  originalTerm: string;
  resolvedTo: string;
  context: string;
};

export type Filters = Record<string, string>;

/**
 * Rewrites filter values the agent resolved incorrectly, using what the user
 * told us last time.
 *
 * Corrections are applied to the *parsed filter values*, not to the raw query
 * text. That is the whole point: storing "show me john's deals" -> "Mike Chen"
 * only ever re-fires on a verbatim repeat of that sentence, which is why the
 * feature never worked. Storing "John Smith" -> "Mike Chen" scoped to
 * `salesRep` fires on any phrasing that resolves to John Smith.
 *
 * Matching is whole-value and case-insensitive. Nothing is compiled as a
 * regex — the terms are user-supplied, and `new RegExp(term)` on user input is
 * both a crash (a stored "[" throws) and a ReDoS vector.
 */
export function applyCorrectionsToFilters(
  filters: Filters,
  corrections: Correction[]
): Filters {
  const corrected: Filters = { ...filters };

  for (const [field, value] of Object.entries(corrected)) {
    // Later corrections win: the user's most recent word on a term is the one
    // that counts.
    for (const c of corrections) {
      if (c.context !== field) continue;
      if (c.originalTerm.toLowerCase() !== value.toLowerCase()) continue;
      corrected[field] = c.resolvedTo;
    }
  }

  return corrected;
}
