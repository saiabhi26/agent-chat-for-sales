import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  amount: real("amount").notNull(),
  currency: text("currency").notNull().default("USD"),
  region: text("region").notNull(),
  salesRep: text("sales_rep").notNull(),
  date: text("date").notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const corrections = sqliteTable("corrections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  originalTerm: text("original_term").notNull(),
  resolvedTo: text("resolved_to").notNull(),
  context: text("context").notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});