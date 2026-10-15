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
    <article className="min-w-0 rounded-xl border border-zinc-700/50 bg-black p-4 lg:col-span-2">
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
          <table className="w-full table-fixed border-collapse text-left text-xs sm:text-sm">
            <thead>
              <tr className="text-xs text-zinc-400">
                <th className="hidden w-[12%] pr-4 pb-3 font-medium md:table-cell">ID</th>
                <th className="hidden w-[14%] pr-4 pb-3 font-medium md:table-cell">Date</th>
                <th className="w-[42%] pr-3 pb-3 font-medium sm:pr-4">Description</th>
                <th className="hidden w-[16%] pr-4 pb-3 font-medium sm:table-cell">Category</th>
                <th className="w-[32%] pr-3 pb-3 text-right font-medium sm:pr-4">Amount</th>
                <th className="w-[26%] pb-3 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => {
                const CategoryIcon = categoryIcons[tx.category] ?? Wallet;

                return (
                  <tr key={tx.id} className="border-t border-zinc-800">
                    <td className="hidden max-w-0 truncate py-3 pr-4 text-zinc-400 md:table-cell">{tx.id}</td>
                    <td className="hidden py-3 pr-4 whitespace-nowrap text-zinc-400 md:table-cell">{tx.date}</td>
                    <td className="max-w-0 truncate py-3 pr-4 text-zinc-100">{tx.description}</td>
                    <td className="hidden py-3 pr-4 sm:table-cell">
                      <span className="inline-flex max-w-full items-center gap-1.5 text-zinc-100">
                        <CategoryIcon className="size-3.5 shrink-0 text-zinc-400" aria-hidden="true" />
                        <span className="truncate">{tx.category}</span>
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right whitespace-nowrap text-zinc-100">
                      {formatCurrency(tx.amount)}
                    </td>
                    <td
                      className={`py-3 text-right font-medium whitespace-nowrap ${
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
