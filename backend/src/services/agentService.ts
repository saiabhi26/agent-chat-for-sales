import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config";
import { getAllCorrections, insertCorrection } from "../db/queries";
import { applyCorrectionsToFilters } from "./corrections";
import { parseAgentResponse, AgentParseError, type ParsedQuery } from "./parseAgentResponse";

export { AgentParseError };
export type { ParsedQuery };

// The SDK throws at construction when it cannot resolve a key, so this must
// stay lazy — an eager `new Anthropic()` crashes the server on boot.
const client = config.anthropicApiKey
  ? new Anthropic({ apiKey: config.anthropicApiKey })
  : null;

/** False when no API key is configured. The agent route 503s in that case. */
export function isAgentEnabled(): boolean {
  return client !== null;
}

export type CorrectionInput = {
  originalTerm: string;
  resolvedTo: string;
  context: string;
};

/** Only 200 chars of query reach the prompt. Caps both cost and injection surface. */
const MAX_QUERY_LENGTH = 200;

export async function parseQuery(rawQuery: string): Promise<ParsedQuery> {
  if (!client) throw new Error("Agent is not configured");

  const query = rawQuery.slice(0, MAX_QUERY_LENGTH);

  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: `You are a sales dashboard query parser.

Parse this query into filters and return ONLY valid JSON. No explanation. No markdown.

Query: "${query}"

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

  const block = message.content[0];
  const raw = block?.type === "text" ? block.text : "";

  // Throws AgentParseError on prose, markdown, or a truncated response. The
  // route turns that into a 502 rather than an unhandled 500.
  const parsed = parseAgentResponse(raw);

  // Corrections are applied to what the model *resolved to*, not to the raw
  // query text. That is what makes the memory actually fire — see corrections.ts.
  return {
    ...parsed,
    filters: applyCorrectionsToFilters(parsed.filters, getAllCorrections()),
  };
}

export function storeCorrection(input: CorrectionInput) {
  insertCorrection({
    originalTerm: input.originalTerm,
    resolvedTo: input.resolvedTo,
    context: input.context,
  });
}
