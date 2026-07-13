import rawSeed from "./seed.json";

export type SeedTransaction = {
  customerName: string;
  amount: number;
  currency: string;
  region: string;
  salesRep: string;
  date: string;
};

const REGIONS = ["North", "South", "East", "West", "Central"];
const CURRENCIES = ["USD", "EUR", "GBP"];

export function validateSeed(raw: unknown): SeedTransaction[] {
  if (!Array.isArray(raw)) throw new Error("seed.json must be an array");

  return raw.map((entry, i) => {
    const tx = entry as Record<string, unknown>;
    const at = `seed.json[${i}]`;

    if (typeof tx.customerName !== "string" || !tx.customerName)
      throw new Error(`${at}: customerName must be a non-empty string`);
    if (typeof tx.amount !== "number" || !Number.isFinite(tx.amount) || tx.amount <= 0)
      throw new Error(`${at}: amount must be a positive finite number`);
    if (typeof tx.currency !== "string" || !CURRENCIES.includes(tx.currency))
      throw new Error(`${at}: currency must be one of ${CURRENCIES.join(", ")}`);
    if (typeof tx.region !== "string" || !REGIONS.includes(tx.region))
      throw new Error(`${at}: region must be one of ${REGIONS.join(", ")}`);
    if (typeof tx.salesRep !== "string" || !tx.salesRep)
      throw new Error(`${at}: salesRep must be a non-empty string`);
    if (typeof tx.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(tx.date))
      throw new Error(`${at}: date must be YYYY-MM-DD`);

    return {
      customerName: tx.customerName,
      amount: tx.amount,
      currency: tx.currency,
      region: tx.region,
      salesRep: tx.salesRep,
      date: tx.date,
    };
  });
}

export function loadSeedTransactions(): SeedTransaction[] {
  return validateSeed(rawSeed);
}
