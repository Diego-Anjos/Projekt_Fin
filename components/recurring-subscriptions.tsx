import { CompanyLogo } from "@/components/company-logo";
import type { Subscription } from "@/types/dashboard";
import Link from "next/link";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function RecurringSubscriptions({ subscriptions }: { subscriptions: Subscription[] }) {
  return (
    <article id="subscriptions" className="rounded-xl border border-zinc-700/50 bg-black p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-zinc-100">Assinaturas Recorrentes</h3>
        <Link href="/subscriptions" className="text-xs font-medium text-emerald-500">
          View all
        </Link>
      </div>

      {subscriptions.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-400">Nenhuma assinatura recorrente.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-4">
          {subscriptions.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <CompanyLogo name={item.name} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-100">{item.name}</p>
                  <p className="text-xs text-zinc-400">{item.date}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-zinc-100">
                  {currencyFormatter.format(item.amount)}
                </p>
                <p className="text-xs text-zinc-400">{item.renewalDate}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
