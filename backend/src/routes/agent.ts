import { Hono } from "hono";
import {
  parseQuery,
  storeCorrection,
  isAgentEnabled,
  AgentParseError,
} from "../services/agentService";
import { filterTransactions } from "../db/queries";

const app = new Hono();

// parse a natural language query and return filters + results
app.post("/query", async (c) => {
  if (!isAgentEnabled()) {
    return c.json(
      {
        error: "agent_unavailable",
        message:
          "The AI agent is not configured in this environment. The dashboard, filters, and live updates all still work.",
      },
      503
    );
  }

  const { query } = await c.req.json();

  if (typeof query !== "string" || query.trim() === "") {
    return c.json({ error: "Query is required" }, 400);
  }

  let parsed;
  try {
    parsed = await parseQuery(query);
  } catch (err) {
    // The model returned prose, markdown, or a truncated object. Previously an
    // unhandled 500; now the user is told, and can rephrase.
    if (err instanceof AgentParseError) {
      return c.json(
        {
          error: "agent_unparseable",
          message: "I couldn't understand that one. Try rephrasing it?",
        },
        502
      );
    }
    throw err;
  }

  const results = filterTransactions(parsed.filters);

  return c.json({
    interpretation: parsed.interpretation,
    confidence: parsed.confidence,
    filters: parsed.filters,
    results,
  });
});

// A correction is scoped to the filter field the agent got wrong. A context
// that isn't a filter field could never match anything, so reject it rather
// than store a correction that silently never fires.
const CORRECTABLE_FIELDS = ["salesRep", "region", "customerName"];
const MAX_TERM_LENGTH = 100;

// store a correction when the user says "no, I meant X, not Y"
app.post("/correct", async (c) => {
  const { originalTerm, resolvedTo, context } = await c.req.json();

  if (typeof originalTerm !== "string" || originalTerm.trim() === "") {
    return c.json({ error: "originalTerm is required" }, 400);
  }
  if (typeof resolvedTo !== "string" || resolvedTo.trim() === "") {
    return c.json({ error: "resolvedTo is required" }, 400);
  }
  if (
    originalTerm.length > MAX_TERM_LENGTH ||
    resolvedTo.length > MAX_TERM_LENGTH
  ) {
    return c.json(
      { error: `terms must be ${MAX_TERM_LENGTH} characters or fewer` },
      400
    );
  }
  if (!CORRECTABLE_FIELDS.includes(context)) {
    return c.json(
      { error: `context must be one of ${CORRECTABLE_FIELDS.join(", ")}` },
      400
    );
  }

  storeCorrection({
    originalTerm: originalTerm.trim(),
    resolvedTo: resolvedTo.trim(),
    context,
  });

  return c.json({ success: true });
});

export default app;