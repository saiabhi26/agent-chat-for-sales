import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { config } from "./config";
import { seedIfEmpty } from "./services/seedService";
import transactionsRoute from "./routes/transactions";
import analyticsRoute from "./routes/analytics";
import agentRoute from "./routes/agent";
import sseRoute from "./routes/sse";

const app = new Hono();

// cors so frontend can talk to backend
app.use("*", cors({ origin: config.frontendOrigin }));

// routes
app.route("/api/transactions", transactionsRoute);
app.route("/api/analytics", analyticsRoute);
app.route("/api/agent", agentRoute);
app.route("/api/sse", sseRoute);

app.get("/", (c) => c.json({ status: "ok" }));

seedIfEmpty();

// A container that binds to localhost is unreachable from outside itself.
serve({ fetch: app.fetch, port: config.port, hostname: "0.0.0.0" }, () => {
  console.log(`Backend running on port ${config.port}`);
});
