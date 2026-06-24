import { Analytics } from "@/app/types";

type Props = {
  analytics: Analytics | null;
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function AnalyticsCards({ analytics }: Props) {
  if (!analytics) return <div className="text-gray-400">Loading analytics...</div>;

  const topRep = Object.entries(analytics.revenueByRep).sort(
    (a, b) => b[1] - a[1]
  )[0];

  const topRegion = Object.entries(analytics.revenueByRegion).sort(
    (a, b) => b[1] - a[1]
  )[0];

  const cards = [
    { label: "Total revenue", value: fmt(analytics.totalRevenue) },
    { label: "Total transactions", value: analytics.totalTransactions.toString() },
    { label: "Avg deal size", value: fmt(analytics.avgDealSize) },
    { label: "Top sales rep", value: topRep ? `${topRep[0]}` : "—" },
    { label: "Top region", value: topRegion ? `${topRegion[0]}` : "—" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white border border-gray-200 rounded-lg p-4"
        >
          <p className="text-xs text-gray-500 mb-1">{card.label}</p>
          <p className="text-xl font-semibold text-gray-900">{card.value}</p>
        </div>
      ))}
    </div>
  );
}