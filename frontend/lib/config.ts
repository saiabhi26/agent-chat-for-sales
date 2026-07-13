/**
 * Base URL of the backend API. Set NEXT_PUBLIC_API_URL in Vercel to the
 * Fly app URL. NEXT_PUBLIC_ vars are inlined at build time, so changing
 * this in Vercel requires a redeploy.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
