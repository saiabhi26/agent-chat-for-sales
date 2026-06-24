import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq, like, gte, lte } from "drizzle-orm";
import { transactions, corrections } from "./schema";

const sqlite = new Database("sales.db");
export const db = drizzle(sqlite);

// run migrations on startup
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    region TEXT NOT NULL,
    sales_rep TEXT NOT NULL,
    date TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS corrections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_term TEXT NOT NULL,
    resolved_to TEXT NOT NULL,
    context TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// transactions
export function getAllTransactions() {
  return db.select().from(transactions).all();
}

export function insertTransaction(tx: typeof transactions.$inferInsert) {
  return db.insert(transactions).values(tx).run();
}

export function getTransactionCount() {
  return sqlite.prepare("SELECT COUNT(*) as count FROM transactions").get() as { count: number };
}

export function filterTransactions(filters: {
  salesRep?: string;
  region?: string;
  customerName?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  let query = "SELECT * FROM transactions WHERE 1=1";
  const params: string[] = [];

  if (filters.salesRep) {
    query += " AND LOWER(sales_rep) LIKE ?";
    params.push(`${filters.salesRep.toLowerCase()}%`);
  }
  if (filters.region) {
    query += " AND LOWER(region) LIKE ?";
    params.push(`%${filters.region.toLowerCase()}%`);
  }
  if (filters.customerName) {
    query += " AND LOWER(customer_name) LIKE ?";
    params.push(`%${filters.customerName.toLowerCase()}%`);
  }
  if (filters.dateFrom) {
    query += " AND date >= ?";
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    query += " AND date <= ?";
    params.push(filters.dateTo);
  }

  const rows = sqlite.prepare(query).all(...params) as any[];
    return rows.map((row) => ({
      id: row.id,
      customerName: row.customer_name,
      amount: row.amount,
      currency: row.currency,
      region: row.region,
      salesRep: row.sales_rep,
      date: row.date,
      createdAt: row.created_at,
    }));
}

// corrections
export function getAllCorrections() {
  return db.select().from(corrections).all();
}

export function insertCorrection(correction: typeof corrections.$inferInsert) {
  return db.insert(corrections).values(correction).run();
}