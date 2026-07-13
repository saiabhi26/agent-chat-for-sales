import { insertTransaction, getTransactionCount } from "../db/queries";
import { loadSeedTransactions } from "../db/seedData";
import { v4 as uuidv4 } from "uuid";

/** Seeds from the committed fixture. Synchronous, offline, free. */
export function seedIfEmpty(): void {
  const { count } = getTransactionCount();
  if (count > 0) return;

  const seed = loadSeedTransactions();
  for (const tx of seed) {
    insertTransaction({ id: uuidv4(), ...tx });
  }

  console.log(`Seeded ${seed.length} transactions from fixture.`);
}
