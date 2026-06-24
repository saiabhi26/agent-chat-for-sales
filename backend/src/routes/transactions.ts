import { Hono } from "hono";
import { v4 as uuidv4 } from "uuid";
import { insertTransaction, getAllTransactions, filterTransactions } from "../db/queries";
import { computeAnalytics, checkDrift } from "../services/analyticsService";
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
  const body = await c.req.json();

  const { customerName, amount, currency, region, salesRep, date } = body;

  if (!customerName || !amount || !currency || !region || !salesRep || !date) {
    return c.json({ error: "All fields are required" }, 400);
  }

  // snapshot analytics before insert for drift detection
  const before = computeAnalytics().avgDealSizeByRegion;

  const tx = {
    id: uuidv4(),
    customerName,
    amount: parseFloat(amount),
    currency,
    region,
    salesRep,
    date,
  };

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