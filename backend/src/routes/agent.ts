import { Hono } from "hono";
import {
  parseQuery,
  storeCorrection,
  isAgentEnabled,
  AgentParseError,
} from "../services/agentService";
import { filterTransactions } from "../db/queries";
import { clientIpFromForwardedFor } from "../services/clientIp";
import { agentLimiter, writeLimiter, dailyBudget } from "../services/guardrails";

const app = new Hono();

const callerOf = (c: { req: { header: (name: string) => string | undefined } }) =>
  clientIpFromForwardedFor(c.req.header("x-forwarded-for"));

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

  // Checks run cheapest-first, and nothing is spent until the last possible
  // moment: reject the caller, then reject the input, and only then consume
  // budget for the call we are actually about to pay for.
  const caller = callerOf(c);
  const limit = agentLimiter.check(caller);
  if (!limit.allowed) {
    return c.json(
      {
        error: "rate_limited",
        message: `That's a lot of questions at once. Try again in ${limit.retryAfterSeconds}s.`,
      },
      429,
      { "Retry-After": String(limit.retryAfterSeconds) }
    );
  }

  const { query } = await c.req.json();

  if (typeof query !== "string" || query.trim() === "") {
    return c.json({ error: "Query is required" }, 400);
  }

  // The bill's ceiling. Consumed here, immediately before the paid call — not
  // earlier, or a malformed request would burn budget it never spent.
  if (!dailyBudget.tryConsume()) {
    return c.json(
      {
        error: "budget_exhausted",
        message:
          "The agent has hit its daily query budget for this demo. It resets at midnight UTC — everything else on the dashboard still works.",
      },
      503
    );
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
  // Corrections cost nothing to store, but they permanently change how the agent
  // reads every future query — for every visitor. Worth a limit.
  const limit = writeLimiter.check(callerOf(c));
  if (!limit.allowed) {
    return c.json(
      { error: "rate_limited", message: "Too many corrections at once." },
      429,
      { "Retry-After": String(limit.retryAfterSeconds) }
    );
  }

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