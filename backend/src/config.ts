import "dotenv/config";

export const config = {
  /** Fly injects PORT. Do not hardcode. */
  port: Number(process.env.PORT ?? 3001),
  /** The origin allowed by CORS. In production, the Vercel URL. */
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000",
  /** On Fly this points at the mounted volume, e.g. /data/sales.db */
  databasePath: process.env.DATABASE_PATH ?? "sales.db",
  /** Absent in Phase 1 by design — the agent degrades gracefully. */
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
};
