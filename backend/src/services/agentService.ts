import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config";
import { getAllCorrections, insertCorrection } from "../db/queries";

// The SDK throws at construction when it cannot resolve a key, so this must
// stay lazy — an eager `new Anthropic()` crashes the server on boot.
const client = config.anthropicApiKey
  ? new Anthropic({ apiKey: config.anthropicApiKey })
  : null;

/** False when no API key is configured. The agent route 503s in that case. */
export function isAgentEnabled(): boolean {
  return client !== null;
}

export type ParsedQuery = {
  filters: {
    salesRep?: string;
    region?: string;
    customerName?: string;
    dateFrom?: string;
    dateTo?: string;
  };
  interpretation: string;
  confidence: "high" | "low";
};

export type CorrectionInput = {
  originalTerm: string;
  resolvedTo: string;
  context: string;
};

// apply stored corrections to raw query before sending to Claude
function applyCorrections(query: string): string {
  const corrections = getAllCorrections();
  let corrected = query;

  for (const c of corrections) {
    const regex = new RegExp(c.originalTerm, "gi");
    corrected = corrected.replace(regex, c.resolvedTo);
  }

  return corrected;
}

export async function parseQuery(rawQuery: string): Promise<ParsedQuery> {
  if (!client) throw new Error("Agent is not configured");

  const correctedQuery = applyCorrections(rawQuery);

  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: `You are a sales dashboard query parser.

Parse this query into filters and return ONLY valid JSON. No explanation. No markdown.

Query: "${correctedQuery}"

Available filters:
- salesRep: string (partial name ok)
- region: one of North, South, East, West, Central
- customerName: string (partial ok)
- dateFrom: YYYY-MM-DD
- dateTo: YYYY-MM-DD

Confidence rules:
- "high" if query is clear and unambiguous
- "low" if query is vague, has multiple interpretations, or you're guessing

Return this exact structure:
{
  "filters": {
    "salesRep": "John Smith",
    "region": "West",
    "customerName": null,
    "dateFrom": null,
    "dateTo": null
  },
  "interpretation": "Showing transactions by John Smith in the West region",
  "confidence": "high"
}

Only include filters that are clearly mentioned. Null means not filtered.`,
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "{}";
  const clean = raw.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean);

  // clean out null values from filters
  const filters: ParsedQuery["filters"] = {};
  for (const [key, value] of Object.entries(parsed.filters)) {
    if (value !== null && value !== undefined) {
      filters[key as keyof ParsedQuery["filters"]] = value as string;
    }
  }

  return {
    filters,
    interpretation: parsed.interpretation,
    confidence: parsed.confidence,
  };
}

export function storeCorrection(input: CorrectionInput) {
  insertCorrection({
    originalTerm: input.originalTerm,
    resolvedTo: input.resolvedTo,
    context: input.context,
  });
}