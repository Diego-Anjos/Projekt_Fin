"use client";

import { CompanyLogo } from "@/components/company-logo";
import { SubscriptionModal, type ServiceSubscription } from "@/components/subscription-modal";
import { Layers, Plus } from "lucide-react";
import { useState } from "react";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const cycleLabel = {
  monthly: "Mensal",
  yearly: "Anual",
} as const;

const paymentLabel = {
  credit: "Cartão de Crédito",
  pix: "PIX",
  boleto: "Boleto",
} as const;

const initialSubscriptions: ServiceSubscription[] = [
  {
    id: "netflix",
    name: "Netflix",
    amount: 55.9,
    cycle: "monthly",
    subscribedAt: "2024-10-12",
    nextDue: "2026-10-12",
    payment: "credit",
    status: "active",
  },
  {
    id: "spotify",
    name: "Spotify",
    amount: 21.9,
    cycle: "monthly",
    subscribedAt: "2025-03-18",
    nextDue: "2026-10-18",
    payment: "pix",
    status: "active",
  },
  {
    id: "prime",
    name: "Amazon Prime",
    amount: 178.8,
    cycle: "yearly",
    subscribedAt: "2025-11-02",
    nextDue: "2026-11-02",
    payment: "credit",
    status: "active",
  },
];

function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR").format(new Date(year, month - 1, day));
}

export default function SubscriptionsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions);

  function handleSave(subscription: ServiceSubscription) {
    setSubscriptions((current) => [subscription, ...current]);
  }

  return (
    <div className="flex w-full flex-col gap-6 px-6 py-8">
      <header className="flex flex-col gap-6 rounded-2xl border border-emerald-950/80 bg-gradient-to-r from-[#041610] to-[#0a241a] p-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-6">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl border border-emerald-800/40 bg-emerald-500/10 text-emerald-400">
            <Layers className="size-8" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
              Minhas Assinaturas
            </h1>
            <p className="mt-2 text-sm text-emerald-100/70 sm:text-base">
              Gerencie seus serviços recorrentes
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-emerald-500"
        >
          <Plus className="size-4" aria-hidden="true" />
          Nova Assinatura
        </button>
      </header>

      {subscriptions.length === 0 ? (
        <p className="rounded-xl border border-zinc-700/50 bg-black px-5 py-10 text-center text-sm text-zinc-400">
          Nenhuma assinatura cadastrada.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {subscriptions.map((subscription) => (
            <li
              key={subscription.id}
              className="flex flex-col rounded-xl border border-zinc-700/50 bg-black p-5 transition-colors duration-200 hover:border-emerald-500/50"
            >
              <div className="flex items-start justify-between gap-3">
                <CompanyLogo name={subscription.name} />
                <span className="inline-flex rounded-md border border-emerald-800 bg-emerald-950 px-2.5 py-1 text-xs font-medium text-emerald-300">
                  Ativa
                </span>
              </div>

              <h2 className="mt-4 text-base font-semibold text-zinc-50">{subscription.name}</h2>

              <p className="mt-4">
                <span className="text-2xl font-semibold tracking-tight text-zinc-50">
                  {currencyFormatter.format(subscription.amount)}
                </span>
                <span className="text-sm text-zinc-400"> / {cycleLabel[subscription.cycle]}</span>
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-zinc-800 pt-4">
                <div>
                  <p className="text-xs text-zinc-500">Próximo Vencimento</p>
                  <p className="mt-1 text-sm font-medium text-zinc-200">
                    {formatDate(subscription.nextDue)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Pagamento</p>
                  <p className="mt-1 text-sm font-medium text-zinc-200">
                    {paymentLabel[subscription.payment]}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <SubscriptionModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
