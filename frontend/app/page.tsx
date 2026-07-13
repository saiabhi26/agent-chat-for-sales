"use client";

import { useEffect, useRef, useState } from "react";
import { Analytics, DriftAlert, Transaction } from "@/app/types";
import { fetchAnalytics, fetchTransactions } from "@/lib/api";
import { useSSE } from "@/app/hooks/useSSE";
import AnalyticsCards from "@/app/components/AnalyticsCards";
import TransactionsTable from "@/app/components/TransactionsTable";
import ChatAgent from "@/app/components/ChatAgent";
import TransactionModal from "@/app/components/TransactionModal";

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [driftAlert, setDriftAlert] = useState<DriftAlert | null>(null);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [showModal, setShowModal] = useState(false);
  
  async function loadData(filters?: Record<string, string>) {
    const [txs, analytics] = await Promise.all([
      fetchTransactions(filters),
      fetchAnalytics(),
    ]);
    setTransactions(txs);
    setAnalytics(analytics);
  }

  useEffect(() => {
    // loadData is async, so its setState calls land after an await rather than
    // synchronously in the effect body — the rule can't see through the call.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  const activeFiltersRef = useRef(activeFilters);

  // Lets the SSE handler below read the current filters without re-subscribing.
  useEffect(() => {
    activeFiltersRef.current = activeFilters;
  }, [activeFilters]);

  useSSE({
    onTransaction: () => loadData(activeFiltersRef.current),
    onAnalytics: (data) => setAnalytics(data as Analytics),
    onDrift: (data) => setDriftAlert(data as DriftAlert),
  });

  function handleAgentResults(filters: Record<string, string>) {
    setActiveFilters(filters);
    loadData(filters);
  }

  function clearFilters() {
    setActiveFilters({});
    loadData();
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Sales dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Real-time analytics and transactions</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm"
          >
            + New transaction
          </button>
        </div>

        <AnalyticsCards analytics={analytics} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-gray-700">
                Transactions
                {Object.keys(activeFilters).length > 0 && (
                  <span className="ml-2 text-xs text-gray-400">(filtered)</span>
                )}
              </h2>
              {Object.keys(activeFilters).length > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-gray-500 underline"
                >
                  Clear filters
                </button>
              )}
            </div>
            <TransactionsTable transactions={transactions} />
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col">
            <h2 className="text-sm font-medium text-gray-700 mb-4">Chat agent</h2>
            <ChatAgent onResults={handleAgentResults} driftAlert={driftAlert} />
          </div>
        </div>

      </div>
      {showModal && (
        <TransactionModal
          onClose={() => setShowModal(false)}
          onSuccess={() => loadData(activeFiltersRef.current)}
        />
      )}
    </main>
  );
}