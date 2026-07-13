import { Analytics, ParsedQuery } from "@/app/types";
import { API_BASE_URL as BASE_URL } from "@/lib/config";

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

  // This used to return res.json() unconditionally, so it never threw — the
  // modal's catch could not fire, and a REJECTED transaction (a validation 400,
  // and now a rate-limit 429) closed the modal as if it had worked.
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const details = Array.isArray(body.details) ? body.details.join(", ") : null;
    throw new Error(
      body.message ?? details ?? body.error ?? "Couldn't create that transaction."
    );
  }

  return res.json();
}

export async function queryAgent(query: string): Promise<ParsedQuery> {
  const res = await fetch(`${BASE_URL}/api/agent/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? "The agent is unavailable right now.");
  }

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

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // Prefer `message` — it is the human-readable one. `error` is a machine code
    // like "rate_limited", which is not something to show a user.
    throw new Error(
      body.message ?? body.error ?? "Couldn't save that correction."
    );
  }

  return res.json();
}