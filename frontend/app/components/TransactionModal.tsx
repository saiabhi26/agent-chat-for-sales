"use client";

import { useState } from "react";
import { createTransaction } from "@/lib/api";

const REGIONS = ["North", "South", "East", "West", "Central"];
const CURRENCIES = ["USD", "EUR", "GBP"];
const SALES_REPS = [
  "Sarah Johnson",
  "John Smith",
  "Mike Chen",
  "Emily Davis",
  "Carlos Rivera",
];

type Props = {
  onClose: () => void;
  onSuccess: () => void;
};

export default function TransactionModal({ onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    customerName: "",
    amount: "",
    currency: "USD",
    region: "North",
    salesRep: "Sarah Johnson",
    date: new Date().toISOString().split("T")[0],
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit() {
    if (!form.customerName || !form.amount) {
      setError("Customer name and amount are required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await createTransaction(form);
      onSuccess();
      onClose();
    } catch (err) {
      // Show what the server actually said — which field was invalid, or how
      // long to wait — rather than a generic failure the user can't act on.
      setError(
        err instanceof Error ? err.message : "Failed to create transaction."
      );
    }

    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">New transaction</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Customer name</label>
            <input
              name="customerName"
              value={form.customerName}
              onChange={handleChange}
              placeholder="Acme Corp"
              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Amount</label>
              <input
                name="amount"
                type="number"
                value={form.amount}
                onChange={handleChange}
                placeholder="25000"
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Currency</label>
              <select
                name="currency"
                value={form.currency}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                {CURRENCIES.map((c) => (<option key={c}>{c}</option>))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Region</label>
            <select
              name="region"
              value={form.region}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              {REGIONS.map((r) => (<option key={r}>{r}</option>))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Sales rep</label>
            <select
              name="salesRep"
              value={form.salesRep}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              {SALES_REPS.map((r) => (<option key={r}>{r}</option>))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Date</label>
            <input
              name="date"
              type="date"
              value={form.date}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>

          {error && <p className="text-red-500 text-xs">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-gray-900 text-white py-2 rounded-lg text-sm disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create transaction"}
          </button>
        </div>
      </div>
    </div>
  );
}