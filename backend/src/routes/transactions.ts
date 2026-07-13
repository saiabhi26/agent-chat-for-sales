import { Hono } from "hono";
import { v4 as uuidv4 } from "uuid";
import { insertTransaction, getAllTransactions, filterTransactions } from "../db/queries";
import { computeAnalytics } from "../services/analyticsService";
import { checkDrift } from "../services/drift";
import { validateTransaction } from "../services/validateTransaction";
import { broadcast } from "./sse";

const app = new Hono();

// get all transactions (with optional filters)
app.get("/", (c) => {
  const { salesRep, region, customerName, dateFrom, dateTo } = c.req.query();

  const hasFilters = salesRep || region || customerName || dateFrom || dateTo;

  const result = hasFilters
    ? filterTransactions({ salesRep, region, customerName, dateFrom, dateTo })
    : getAllTransactions();

  return c.json(result);
});

// create a new transaction
app.post("/", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Body must be valid JSON" }, 400);
  }

  // Analytics sums `amount` across every row, so a single NaN would poison the
  // whole dashboard permanently, for every visitor. Nothing unvalidated is stored.
  const validated = validateTransaction(body);
  if (!validated.ok) {
    return c.json({ error: "Invalid transaction", details: validated.errors }, 400);
  }

  // snapshot analytics before insert for drift detection
  const before = computeAnalytics().avgDealSizeByRegion;

  const tx = { id: uuidv4(), ...validated.value };

  insertTransaction(tx);

  // compute analytics after insert
  const analyticsAfter = computeAnalytics();
  const drift = checkDrift(before, analyticsAfter.avgDealSizeByRegion);

  // broadcast new transaction to all SSE clients
  broadcast("transaction", tx);

  // broadcast updated analytics
  broadcast("analytics", analyticsAfter);

  // broadcast drift alert if detected
  if (drift) {
    broadcast("drift", {
      message: `📊 Heads up — avg deal size in ${drift.region} shifted from $${drift.before.toLocaleString()} to $${drift.after.toLocaleString()}`,
      region: drift.region,
      before: drift.before,
      after: drift.after,
    });
  }

  return c.json(tx, 201);
});

export default app;