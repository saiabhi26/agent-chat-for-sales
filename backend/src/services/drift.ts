/**
 * A region's average deal size must move by MORE than this for the dashboard to
 * raise a drift alert.
 *
 * The previous code fired at >= 10% while its own comment claimed "more than
 * 20%". 20% is the intent kept here: at 10% the alert fires on ordinary noise
 * and stops meaning anything.
 */
export const DRIFT_THRESHOLD = 0.2;

export type Drift = { region: string; before: number; after: number };

/**
 * Detects a meaningful shift in a region's average deal size.
 *
 * A region with no prior average is NOT drift — there is nothing for it to have
 * drifted from. The alert means "something changed", not "something appeared".
 * (The old code had the same behaviour, but by accident: `if (!before[region])
 * continue` also silently swallowed a genuine prior average of 0.)
 */
export function checkDrift(
  before: Record<string, number>,
  after: Record<string, number>
): Drift | null {
  for (const region in after) {
    const previous = before[region];

    // No prior average, or a prior average of zero (nothing to compare against,
    // and the ratio below would be Infinity).
    if (previous === undefined || previous === 0) continue;

    const change = Math.abs(after[region] - previous) / previous;

    if (change > DRIFT_THRESHOLD) {
      return {
        region,
        before: Math.round(previous),
        after: Math.round(after[region]),
      };
    }
  }

  return null;
}
