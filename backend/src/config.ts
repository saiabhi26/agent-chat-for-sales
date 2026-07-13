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
   * The commit this instance was built from. Render injects RENDER_GIT_COMMIT.
   * Reported by the health endpoint so CI can tell whether the code it just
   * pushed is actually serving traffic — a 200 alone would also come back from
   * the *previous* container while the new one is still building.
   */
  commit: process.env.RENDER_GIT_COMMIT ?? "dev",
};
