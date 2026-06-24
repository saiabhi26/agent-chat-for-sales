import { Hono } from "hono";
import { computeAnalytics } from "../services/analyticsService";

const app = new Hono();

app.get("/", (c) => {
  const analytics = computeAnalytics();
  return c.json(analytics);
});

export default app;