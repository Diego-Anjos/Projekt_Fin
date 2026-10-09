"use client";

import { CompanyLogo } from "@/components/company-logo";
import { useSession } from "@/components/require-session";
import { SubscriptionModal, type ServiceSubscription } from "@/components/subscription-modal";
import { getSubscriptions, type SubscriptionDocument } from "@/lib/appwrite/database";
import { Layers, Plus } from "lucide-react";
import { useEffect, useState } from "react";

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

function toServiceSubscription(document: SubscriptionDocument): ServiceSubscription {
  return {
    id: document.$id,
    name: document.name,
    amount: Number(document.amount),
    cycle: document.cycle === "yearly" ? "yearly" : "monthly",
    subscribedAt: document.subscribedAt,
    nextDue: document.nextDue,
    payment:
      document.payment === "pix" || document.payment === "boleto" ? document.payment : "credit",
    status: "active",
  };
}

function formatDate(isoDate: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) return isoDate;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Intl.DateTimeFormat("pt-BR").format(new Date(year, month - 1, day));
}

export default function SubscriptionsPage() {
  const { user } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subscriptions, setSubscriptions] = useState<ServiceSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadSubscriptions() {
      try {
        const response = await getSubscriptions(user.$id);
        if (!active) return;
        setSubscriptions(response.documents.map(toServiceSubscription));
      } catch (error) {
        console.error("Falha ao carregar assinaturas.", error);
        if (active) setSubscriptions([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSubscriptions();

    return () => {
      active = false;
    };
  }, [user.$id]);

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

      {loading ? (
        <p className="w-full py-12 text-center text-zinc-400">A carregar dados...</p>
      ) : subscriptions.length === 0 ? (
        <div className="w-full py-12 text-center text-gray-400">
          Nenhuma assinatura recorrente encontrada. Clique em &apos;Nova Assinatura&apos; para
          registar os seus serviços.
        </div>
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
