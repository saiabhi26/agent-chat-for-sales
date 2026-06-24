import { Hono } from "hono";
import { parseQuery, storeCorrection } from "../services/agentService";
import { filterTransactions } from "../db/queries";

const app = new Hono();

// parse a natural language query and return filters + results
app.post("/query", async (c) => {
  const { query } = await c.req.json();

  if (!query) {
    return c.json({ error: "Query is required" }, 400);
  }

  const parsed = await parseQuery(query);

  const results = filterTransactions(parsed.filters);

  return c.json({
    interpretation: parsed.interpretation,
    confidence: parsed.confidence,
    filters: parsed.filters,
    results,
  });
});

// store a correction when user says "no i meant X not Y"
app.post("/correct", async (c) => {
  const { originalTerm, resolvedTo, context } = await c.req.json();

  if (!originalTerm || !resolvedTo) {
    return c.json({ error: "originalTerm and resolvedTo are required" }, 400);
  }

  storeCorrection({
    originalTerm,
    resolvedTo,
    context: context || "general",
  });

  return c.json({ success: true });
});

export default app;