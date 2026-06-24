import { Transaction } from "@/app/types";

type Props = {
  transactions: Transaction[];
};

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function TransactionsTable({ transactions }: Props) {
  if (transactions.length === 0) {
    return (
      <div className="text-center text-gray-400 py-12">
        No transactions found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
          <tr>
            <th className="px-4 py-3 text-left">Date</th>
            <th className="px-4 py-3 text-left">Customer</th>
            <th className="px-4 py-3 text-left">Amount</th>
            <th className="px-4 py-3 text-left">Region</th>
            <th className="px-4 py-3 text-left">Sales rep</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {transactions.map((tx) => (
            <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-gray-600">{tx.date}</td>
              <td className="px-4 py-3 font-medium text-gray-900">
                {tx.customerName}
              </td>
              <td className="px-4 py-3 text-gray-900">
                {fmt(tx.amount, tx.currency)}
              </td>
              <td className="px-4 py-3">
                <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">
                  {tx.region}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-600">{tx.salesRep}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}