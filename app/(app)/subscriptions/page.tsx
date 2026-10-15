"use client";

import { CompanyLogo } from "@/components/company-logo";
import { useSession } from "@/components/require-session";
import { SubscriptionModal, type ServiceSubscription } from "@/components/subscription-modal";
import { useConfirm } from "@/contexts/confirm-dialog-context";
import { usePreferences } from "@/contexts/preferences-context";
import { deleteSubscription, getSubscriptions, type SubscriptionDocument } from "@/lib/appwrite/database";
import { formatCurrency } from "@/lib/utils";
import { Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
  const { confirm } = useConfirm();
  const { currency, privacyMode } = usePreferences();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<ServiceSubscription | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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
        if (active) {
          setSubscriptions([]);
          toast.error("Falha ao carregar as assinaturas. Tente novamente.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSubscriptions();

    return () => {
      active = false;
    };
  }, [user.$id]);

  function openCreateModal() {
    setEditingSubscription(null);
    setIsModalOpen(true);
  }

  function handleEditSubscription(subscription: ServiceSubscription) {
    setEditingSubscription(subscription);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingSubscription(null);
  }

  async function handleDeleteSubscription(subscription: ServiceSubscription) {
    const isConfirmed = await confirm({
      title: "Excluir Assinatura",
      description: `Tem certeza que deseja excluir a assinatura "${subscription.name}"? Esta ação não pode ser desfeita.`,
      confirmText: "Excluir",
      variant: "danger",
    });

    if (!isConfirmed) return;

    try {
      setDeletingId(subscription.id);
      await deleteSubscription(subscription.id);
      setSubscriptions((current) => current.filter((item) => item.id !== subscription.id));
      if (editingSubscription?.id === subscription.id) {
        closeModal();
      }
      toast.success(`Assinatura "${subscription.name}" excluída com sucesso!`);
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast.error("Falha ao excluir a assinatura. Tente novamente.");
    } finally {
      setDeletingId(null);
    }
  }

  function handleSave(subscription: ServiceSubscription) {
    setSubscriptions((current) => {
      const exists = current.some((item) => item.id === subscription.id);
      if (!exists) return [subscription, ...current];
      return current.map((item) => (item.id === subscription.id ? subscription : item));
    });
  }

  return (
    <div className="flex w-full flex-col gap-4 md:gap-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-emerald-950/80 bg-gradient-to-r from-[#041610] to-[#0a241a] p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6 lg:p-8">
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
          onClick={openCreateModal}
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
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3 xl:grid-cols-4">
          {subscriptions.map((subscription) => (
            <li
              key={subscription.id}
              className="group flex flex-col rounded-xl border border-zinc-700/50 bg-black p-5 transition-colors duration-200 hover:border-emerald-500/50"
            >
              <div className="flex items-start justify-between gap-3">
                <CompanyLogo name={subscription.name} />
                <div className="flex items-center gap-2">
                  <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                    Ativa
                  </span>
                  <button
                    type="button"
                    onClick={() => handleEditSubscription(subscription)}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                    title="Editar assinatura"
                    aria-label={`Editar ${subscription.name}`}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSubscription(subscription)}
                    disabled={deletingId === subscription.id}
                    className="rounded-lg p-1.5 text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                    title="Excluir assinatura"
                    aria-label={`Excluir ${subscription.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <h2 className="mt-4 truncate text-base font-semibold text-zinc-50">{subscription.name}</h2>

              <p className="mt-4">
                <span className="text-2xl font-semibold tracking-tight text-zinc-50">
                  {formatCurrency(subscription.amount, currency, privacyMode)}
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
                  <p className="mt-1 truncate text-sm font-medium text-zinc-200">
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
        subscription={editingSubscription}
        onClose={closeModal}
        onSave={handleSave}
      />
    </div>
  );
}
