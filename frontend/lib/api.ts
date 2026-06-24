import { Analytics, ParsedQuery } from "@/app/types";

const BASE_URL = "http://localhost:3001";

export async function fetchTransactions(filters?: Record<string, string>) {
  const params = new URLSearchParams(filters || {});
  const res = await fetch(`${BASE_URL}/api/transactions?${params}`);
  return res.json();
}

export async function fetchAnalytics(): Promise<Analytics> {
  const res = await fetch(`${BASE_URL}/api/analytics`);
  return res.json();
}

export async function createTransaction(data: {
  customerName: string;
  amount: string;
  currency: string;
  region: string;
  salesRep: string;
  date: string;
}) {
  const res = await fetch(`${BASE_URL}/api/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function queryAgent(query: string): Promise<ParsedQuery> {
  const res = await fetch(`${BASE_URL}/api/agent/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  return res.json();
}

export async function submitCorrection(
  originalTerm: string,
  resolvedTo: string,
  context: string
) {
  const res = await fetch(`${BASE_URL}/api/agent/correct`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ originalTerm, resolvedTo, context }),
  });
  return res.json();
}