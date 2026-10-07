"use client";

import { TransactionModal, type PurchaseTransaction } from "@/components/transaction-modal";
import { Pencil, Plus, Receipt, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const controlClassName =
  "h-11 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none transition-colors duration-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";

const initialTransactions: PurchaseTransaction[] = [
  {
    id: "1",
    type: "income",
    description: "Salário mensal",
    category: "Salário",
    date: "2026-10-05",
    amount: 8500,
    status: "Paid",
  },
  {
    id: "2",
    type: "expense",
    description: "Mercado da semana",
    category: "Alimentação",
    date: "2026-10-02",
    amount: 486.9,
    status: "Paid",
  },
  {
    id: "3",
    type: "expense",
    description: "Aluguel",
    category: "Moradia",
    date: "2026-10-01",
    amount: 2200,
    status: "Pending",
  },
  {
    id: "4",
    type: "expense",
    description: "Farmácia",
    category: "Saúde",
    date: "2026-10-04",
    amount: 89.9,
    status: "Paid",
  },
  {
    id: "5",
    type: "expense",
    description: "Netflix",
    category: "Assinaturas",
    date: "2026-09-18",
    amount: 55.9,
    status: "Paid",
  },
  {
    id: "6",
    type: "expense",
    description: "Uber",
    category: "Transporte",
    date: "2026-09-22",
    amount: 34.5,
    status: "Pending",
  },
  {
    id: "7",
    type: "income",
    description: "Freelance design",
    category: "Outros",
    date: "2026-09-28",
    amount: 1200,
    status: "Paid",
  },
  {
    id: "8",
    type: "expense",
    description: "Cinema",
    category: "Lazer",
    date: "2026-08-15",
    amount: 64,
    status: "Pending",
  },
];

function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR").format(new Date(year, month - 1, day));
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [editing, setEditing] = useState<PurchaseTransaction | null>(null);
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("all");
  const [status, setStatus] = useState("all");

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
              {filteredTransactions.length === 0 ? (
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
