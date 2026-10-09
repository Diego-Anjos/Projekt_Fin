"use client";

import { useSession } from "@/components/require-session";
import { TransactionModal, type PurchaseTransaction } from "@/components/transaction-modal";
import { getTransactions, type TransactionDocument } from "@/lib/appwrite/database";
import { Pencil, Plus, Receipt, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const controlClassName =
  "h-11 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none transition-colors duration-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";

function toPurchaseTransaction(document: TransactionDocument): PurchaseTransaction {
  return {
    id: document.$id,
    type: document.type === "income" ? "income" : "expense",
    description: document.description,
    category: document.category,
    date: document.date,
    amount: Number(document.amount),
    status: document.status === "Pending" ? "Pending" : "Paid",
  };
}

function formatDate(isoDate: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) return isoDate;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const formatted = new Intl.DateTimeFormat("pt-BR").format(new Date(year, month - 1, day));
  return formatted;
}

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));

  return label.charAt(0).toUpperCase() + label.slice(1);
}

const statusLabel = {
  Paid: "Pago",
  Pending: "Pendente",
} as const;

export default function ComprasPage() {
  const { user } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactions, setTransactions] = useState<PurchaseTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PurchaseTransaction | null>(null);
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("all");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    let active = true;

    async function loadTransactions() {
      try {
        const response = await getTransactions(user.$id);
        if (!active) return;
        setTransactions(response.documents.map(toPurchaseTransaction));
      } catch (error) {
        console.error("Falha ao carregar transações.", error);
        if (active) setTransactions([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadTransactions();

    return () => {
      active = false;
    };
  }, [user.$id]);

  const monthOptions = useMemo(() => {
    const keys = [...new Set(transactions.map((item) => item.date.slice(0, 7)))];
    return keys.sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return transactions
      .filter((item) => {
        const matchesSearch =
          query.length === 0 ||
          item.description.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query);
        const matchesMonth = month === "all" || item.date.startsWith(month);
        const matchesStatus = status === "all" || item.status === status;
        return matchesSearch && matchesMonth && matchesStatus;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, search, month, status]);

  function openCreateModal() {
    setEditing(null);
    setIsModalOpen(true);
  }

  function openEditModal(transaction: PurchaseTransaction) {
    setEditing(transaction);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditing(null);
  }

  function handleSave(transaction: PurchaseTransaction) {
    setTransactions((current) => {
      const exists = current.some((item) => item.id === transaction.id);
      if (!exists) return [transaction, ...current];
      return current.map((item) => (item.id === transaction.id ? transaction : item));
    });
  }

  function handleDelete(id: string) {
    setTransactions((current) => current.filter((item) => item.id !== id));
  }

  return (
    <div className="flex w-full flex-col gap-6 px-6 py-8">
      <header className="flex flex-col gap-6 rounded-2xl border border-emerald-950/80 bg-gradient-to-r from-[#041610] to-[#0a241a] p-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-6">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl border border-emerald-800/40 bg-emerald-500/10 text-emerald-400">
            <Receipt className="size-8" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
              Minhas Transações
            </h1>
            <p className="mt-2 text-sm text-emerald-100/70 sm:text-base">
              Faça a gestão das suas receitas e despesas
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-emerald-500"
        >
          <Plus className="size-4" aria-hidden="true" />
          Nova Transação
        </button>
      </header>

      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-700/50 bg-black px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 text-sm text-zinc-400">
            <span className="sr-only">Mês</span>
            <select
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className={`${controlClassName} [color-scheme:dark]`}
              aria-label="Mês"
            >
              <option value="all">Todos os meses</option>
              {monthOptions.map((option) => (
                <option key={option} value={option}>
                  {formatMonthLabel(option)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-400">
            <span className="sr-only">Status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className={`${controlClassName} [color-scheme:dark]`}
              aria-label="Status"
            >
              <option value="all">Todos os status</option>
              <option value="Paid">Pago</option>
              <option value="Pending">Pendente</option>
            </select>
          </label>
        </div>

        <label className="relative block w-full lg:ml-auto lg:w-72">
          <span className="sr-only">Buscar</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-500"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar..."
            className={`${controlClassName} w-full pr-3 pl-10`}
          />
        </label>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-700/50 bg-black">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-xs tracking-wide text-zinc-400 uppercase">
                <th className="px-5 py-4 font-medium">Situação</th>
                <th className="px-5 py-4 font-medium">Descrição</th>
                <th className="px-5 py-4 font-medium">Categoria</th>
                <th className="px-5 py-4 font-medium">Data</th>
                <th className="px-5 py-4 text-right font-medium">Valor</th>
                <th className="px-5 py-4 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-zinc-400">
                    A carregar dados...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    Nenhuma transação encontrada. Clique em &apos;Nova Transação&apos; para começar.
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-zinc-400">
                    Nenhuma transação encontrada.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="border-b border-zinc-800 transition-colors duration-200 last:border-b-0 hover:bg-zinc-800/40"
                  >
                    <td className="px-5 py-4">
                      <span
                        className={
                          transaction.status === "Paid"
                            ? "inline-flex rounded-md border border-emerald-800 bg-emerald-950 px-2.5 py-1 text-xs font-medium text-emerald-300"
                            : "inline-flex rounded-md border border-amber-800 bg-amber-950 px-2.5 py-1 text-xs font-medium text-amber-300"
                        }
                      >
                        {statusLabel[transaction.status]}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-medium text-zinc-100">{transaction.description}</td>
                    <td className="px-5 py-4 text-zinc-300">{transaction.category}</td>
                    <td className="px-5 py-4 text-zinc-400">{formatDate(transaction.date)}</td>
                    <td
                      className={`px-5 py-4 text-right font-semibold tabular-nums ${
                        transaction.type === "income" ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {transaction.type === "income" ? "+" : "−"}{" "}
                      {currencyFormatter.format(transaction.amount)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(transaction)}
                          aria-label={`Editar ${transaction.description}`}
                          className="rounded-lg p-2 text-zinc-400 transition-colors duration-200 hover:bg-zinc-800 hover:text-zinc-100"
                        >
                          <Pencil className="size-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(transaction.id)}
                          aria-label={`Apagar ${transaction.description}`}
                          className="rounded-lg p-2 text-zinc-400 transition-colors duration-200 hover:bg-red-950 hover:text-red-400"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TransactionModal
        open={isModalOpen}
        transaction={editing}
        onClose={closeModal}
        onSave={handleSave}
      />
    </div>
  );
}
