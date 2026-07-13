import type { Filters } from "./corrections";

/** The model returned something we can't use. The route turns this into a 502. */
export class AgentParseError extends Error {
  constructor(reason: string) {
    super(`Could not parse the model's response: ${reason}`);
    this.name = "AgentParseError";
  }
}

export type ParsedQuery = {
  filters: Filters;
  interpretation: string;
  confidence: "high" | "low";
};

/**
 * The model is *asked* for bare JSON, but it is not obliged to comply — it can
 * wrap the JSON in markdown, prepend prose, or get truncated mid-object. The
 * previous code called JSON.parse on it directly, so any of those was an
 * unhandled 500.
 */
const ALLOWED_FILTERS = [
  "salesRep",
  "region",
  "customerName",
  "dateFrom",
  "dateTo",
] as const;

export function parseAgentResponse(raw: string): ParsedQuery {
  const cleaned = raw.replace(/```json|```/g, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new AgentParseError("not valid JSON");
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new AgentParseError("not an object");
  }

  const body = parsed as Record<string, unknown>;

  if (typeof body.filters !== "object" || body.filters === null || Array.isArray(body.filters)) {
    throw new AgentParseError("`filters` is missing or not an object");
  }

  // Only known filter keys reach the query layer. The model invents fields
  // occasionally, and a filter we don't recognise has no business being passed on.
  const rawFilters = body.filters as Record<string, unknown>;
  const filters: Filters = {};
  for (const key of ALLOWED_FILTERS) {
    const value = rawFilters[key];
    if (typeof value === "string" && value.trim() !== "") {
      filters[key] = value;
    }
  }

  return {
    filters,
    interpretation:
      typeof body.interpretation === "string" ? body.interpretation : "",
    // Anything other than an explicit "high" is treated as low. Guessing
    // "high" on a mangled response is the dangerous direction to err in.
    confidence: body.confidence === "high" ? "high" : "low",
  };
}
