export const REGIONS = ["North", "South", "East", "West", "Central"] as const;
export const CURRENCIES = ["USD", "EUR", "GBP"] as const;

/** Above this, the figure is a typo or an attack, not a deal. */
const MAX_AMOUNT = 10_000_000;
const MAX_TEXT_LENGTH = 200;

export type ValidTransaction = {
  customerName: string;
  amount: number;
  currency: string;
  region: string;
  salesRep: string;
  date: string;
};

export type ValidationResult =
  | { ok: true; value: ValidTransaction }
  | { ok: false; errors: string[] };

function validText(value: unknown, field: string, errors: string[]): string {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`${field} is required`);
    return "";
  }
  const trimmed = value.trim();
  if (trimmed.length > MAX_TEXT_LENGTH) {
    errors.push(`${field} must be ${MAX_TEXT_LENGTH} characters or fewer`);
    return "";
  }
  return trimmed;
}

/**
 * The dashboard sums `amount` across every row, so a single NaN poisons every
 * figure on the page — permanently, for every visitor. `parseFloat("abc")` is
 * NaN and the old code stored it without a murmur. Hence: validate here, not
 * hopefully-later.
 */
export function validateTransaction(body: unknown): ValidationResult {
  const errors: string[] = [];

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, errors: ["Request body must be an object"] };
  }

  const input = body as Record<string, unknown>;

  const customerName = validText(input.customerName, "customerName", errors);
  const salesRep = validText(input.salesRep, "salesRep", errors);

  // Accept a numeric string (the form sends one) but never a non-numeric one.
  const amount =
    typeof input.amount === "number" ? input.amount : Number(input.amount);

  if (
    input.amount === null ||
    input.amount === undefined ||
    input.amount === "" ||
    !Number.isFinite(amount)
  ) {
    errors.push("amount must be a number");
  } else if (amount <= 0) {
    errors.push("amount must be greater than 0");
  } else if (amount > MAX_AMOUNT) {
    errors.push(`amount must be ${MAX_AMOUNT} or less`);
  }

  const currency = String(input.currency ?? "");
  if (!CURRENCIES.includes(currency as (typeof CURRENCIES)[number])) {
    errors.push(`currency must be one of ${CURRENCIES.join(", ")}`);
  }

  const region = String(input.region ?? "");
  if (!REGIONS.includes(region as (typeof REGIONS)[number])) {
    errors.push(`region must be one of ${REGIONS.join(", ")}`);
  }

  const date = String(input.date ?? "");
  if (!isValidDate(date)) {
    errors.push("date must be a real date in YYYY-MM-DD format");
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: { customerName, amount, currency, region, salesRep, date },
  };
}

/** YYYY-MM-DD, and a date that actually exists (rejects 2024-13-01, 2024-02-31). */
function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;

  return parsed.toISOString().slice(0, 10) === value;
}
