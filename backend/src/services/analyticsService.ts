import { getAllTransactions } from "../db/queries";

export type Analytics = {
  totalRevenue: number;
  totalTransactions: number;
  avgDealSize: number;
  revenueByRegion: Record<string, number>;
  revenueByRep: Record<string, number>;
  avgDealSizeByRegion: Record<string, number>;
};

export function computeAnalytics(): Analytics {
  const txs = getAllTransactions();

  const totalRevenue = txs.reduce((sum, tx) => sum + tx.amount, 0);
  const totalTransactions = txs.length;
  const avgDealSize = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  const revenueByRegion: Record<string, number> = {};
  const revenueByRep: Record<string, number> = {};
  const countByRegion: Record<string, number> = {};

  for (const tx of txs) {
    revenueByRegion[tx.region] = (revenueByRegion[tx.region] || 0) + tx.amount;
    revenueByRep[tx.salesRep] = (revenueByRep[tx.salesRep] || 0) + tx.amount;
    countByRegion[tx.region] = (countByRegion[tx.region] || 0) + 1;
  }

  const avgDealSizeByRegion: Record<string, number> = {};
  for (const region in revenueByRegion) {
    avgDealSizeByRegion[region] = revenueByRegion[region] / countByRegion[region];
  }

  return {
    totalRevenue,
    totalTransactions,
    avgDealSize,
    revenueByRegion,
    revenueByRep,
    avgDealSizeByRegion,
  };
}

// drift detection — monitors avg deal size by region
// alerts when a new transaction moves a region's average by more than 20%
export function checkDrift(
  before: Record<string, number>,
  after: Record<string, number>
): { region: string; before: number; after: number } | null {
  for (const region in after) {
    if (!before[region]) continue;

    const change = Math.abs(after[region] - before[region]) / before[region];

    if (change >= 0.1) {
      return {
        region,
        before: Math.round(before[region]),
        after: Math.round(after[region]),
      };
    }
  }

  return null;
}