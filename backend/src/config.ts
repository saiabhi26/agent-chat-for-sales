import "dotenv/config";

export const config = {
  /** Render injects PORT. Do not hardcode. */
  port: Number(process.env.PORT ?? 3001),
  /** The origin allowed by CORS. In production, the Vercel URL. */
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000",
  /** Ephemeral on Render's free tier; rebuilt from seed.json on every boot. */
  databasePath: process.env.DATABASE_PATH ?? "sales.db",
  /** Absent in production by design — the agent degrades gracefully. */
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,

  /**
   * Guardrails on the only endpoint that costs real money.
   *
   * Two independent ceilings, because they stop different things:
   *  - the per-IP limit stops ONE caller hammering the endpoint;
   *  - the daily budget stops the BILL, which a per-IP limit cannot do — a
   *    thousand well-behaved callers, or one caller rotating IPs, would each
   *    stay under the per-IP limit and still drain the credit balance.
   *
   * Env-tunable so the caps can be tightened on a live service without a code
   * deploy. Defaults are deliberately conservative; the demo is one query at a
   * time by one recruiter, not a load test.
   */
  agentRateLimit: Number(process.env.AGENT_RATE_LIMIT ?? 5),
  agentRateWindowMs: Number(process.env.AGENT_RATE_WINDOW_MS ?? 60_000),
  agentDailyBudget: Number(process.env.AGENT_DAILY_BUDGET ?? 100),

  /** Writes are free, but they mutate shared demo state that everyone sees. */
  writeRateLimit: Number(process.env.WRITE_RATE_LIMIT ?? 20),
  writeRateWindowMs: Number(process.env.WRITE_RATE_WINDOW_MS ?? 60_000),
  /**
   * The commit this instance was built from. Render injects RENDER_GIT_COMMIT.
   * Reported by the health endpoint so CI can tell whether the code it just
   * pushed is actually serving traffic — a 200 alone would also come back from
   * the *previous* container while the new one is still building.
   */
  commit: process.env.RENDER_GIT_COMMIT ?? "dev",
};
