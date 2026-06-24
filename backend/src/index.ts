import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { seedIfEmpty } from "./services/seedService";
import transactionsRoute from "./routes/transactions";
import analyticsRoute from "./routes/analytics";
import agentRoute from "./routes/agent";
import sseRoute from "./routes/sse";

const app = new Hono();

// cors so frontend can talk to backend
app.use("*", cors({ origin: "http://localhost:3000" }));

// routes
app.route("/api/transactions", transactionsRoute);
app.route("/api/analytics", analyticsRoute);
app.route("/api/agent", agentRoute);
app.route("/api/sse", sseRoute);

app.get("/", (c) => c.json({ status: "ok" }));

const PORT = 3001;

// seed DB on startup then start server
seedIfEmpty().then(() => {
  serve({ fetch: app.fetch, port: PORT }, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
});