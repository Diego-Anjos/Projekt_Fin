import { Dumbbell, ShoppingCart, Utensils, Wallet, type LucideIcon } from "lucide-react";
import type { Transaction } from "@/types/dashboard";

const categoryIcons: Record<string, LucideIcon> = {
  Cart: ShoppingCart,
  Fitness: Dumbbell,
  Food: Utensils,
};

export function RecentTransactions({
  transactions,
  formatCurrency,
}: {
  transactions: Transaction[];
  formatCurrency: (value: number) => string;
}) {
  const pendingCount = transactions.filter((transaction) => transaction.status === "Pending").length;
  const paidCount = transactions.filter((transaction) => transaction.status === "Paid").length;

  return (
    <article className="rounded-xl border border-zinc-700/50 bg-black p-4 xl:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-zinc-100">Recent Cash Flow Transactions</h3>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-md bg-emerald-950 px-2 py-1 text-xs font-medium text-emerald-400">
            Pending {pendingCount}
          </span>
          <span className="rounded-md bg-emerald-950 px-2 py-1 text-xs font-medium text-emerald-400">
            Paid {paidCount}
          </span>
        </div>
      </div>

      {transactions.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-400">Nenhuma transação recente.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="text-xs text-zinc-400">
                <th className="pr-4 pb-3 font-medium">ID</th>
                <th className="pr-4 pb-3 font-medium">Date</th>
                <th className="pr-4 pb-3 font-medium">Description</th>
                <th className="pr-4 pb-3 font-medium">Category</th>
                <th className="pr-4 pb-3 text-right font-medium">Amount</th>
                <th className="pb-3 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => {
                const CategoryIcon = categoryIcons[tx.category] ?? Wallet;

                return (
                  <tr key={tx.id} className="border-t border-zinc-800">
                    <td className="py-3 pr-4 text-zinc-400">{tx.id}</td>
                    <td className="py-3 pr-4 text-zinc-400">{tx.date}</td>
                    <td className="py-3 pr-4 text-zinc-100">{tx.description}</td>
                    <td className="py-3 pr-4">
                      <span className="inline-flex items-center gap-1.5 text-zinc-100">
                        <CategoryIcon className="size-3.5 text-zinc-400" aria-hidden="true" />
                        {tx.category}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right text-zinc-100">
                      {formatCurrency(tx.amount)}
                    </td>
                    <td
                      className={`py-3 text-right font-medium ${
                        tx.status === "Paid" ? "text-emerald-400" : "text-orange-400"
                      }`}
                    >
                      {tx.status}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}
