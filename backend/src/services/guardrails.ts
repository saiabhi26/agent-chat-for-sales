/**
 * The live guardrail instances, wired to the real clock and the real config.
 *
 * The modules themselves (rateLimiter, budget) take an injected clock and know
 * nothing about config — that is what makes them testable. This file is the one
 * place where they meet production values, and it holds no logic of its own.
 *
 * State is in-memory, so it dies with the container. On Render's free tier the
 * container sleeps after 15 minutes idle, which means a determined attacker
 * could reset the daily budget by waiting out a spin-down. The backstop for that
 * is the spend cap on the Anthropic account, not this file — code cannot defend
 * its own budget across a process restart.
 */

import { config } from "../config";
import { createRateLimiter } from "./rateLimiter";
import { createDailyBudget } from "./budget";

/** Per-IP limit on the endpoint that spends money. */
export const agentLimiter = createRateLimiter({
  limit: config.agentRateLimit,
  windowMs: config.agentRateWindowMs,
});

/** Global ceiling on paid calls per UTC day. One API key, one budget. */
export const dailyBudget = createDailyBudget({
  limit: config.agentDailyBudget,
});

/** Per-IP limit on the endpoints that mutate the shared demo state. */
export const writeLimiter = createRateLimiter({
  limit: config.writeRateLimit,
  windowMs: config.writeRateWindowMs,
});
