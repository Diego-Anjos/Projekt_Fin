"use client";

import { useSession } from "@/components/require-session";
import { TransactionModal, type PurchaseTransaction } from "@/components/transaction-modal";
import { useConfirm } from "@/contexts/confirm-dialog-context";
import { usePreferences } from "@/contexts/preferences-context";
import { AppSelect } from "@/components/ui/app-select";
import { Pagination } from "@/components/ui/pagination";
import {
  deleteTransaction,
  getAllTransactions,
  getTransactions,
  type TransactionDocument,
} from "@/lib/appwrite/database";
import { useTranslation } from "@/hooks/use-translation";
import { localeToBcp47 } from "@/locales/dictionaries";
import { formatInstallmentDescription } from "@/lib/installments";
import { formatCurrency } from "@/lib/utils";
import { Pencil, Plus, Receipt, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 10;

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
    groupId: document.groupId,
    installmentNumber: document.installmentNumber,
    totalInstallments: document.totalInstallments,
  };
}

function formatDate(isoDate: string, bcp47: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) return isoDate;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Intl.DateTimeFormat(bcp47).format(new Date(year, month - 1, day));
}

function formatMonthLabel(monthKey: string, bcp47: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const label = new Intl.DateTimeFormat(bcp47, {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));

  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function ComprasPage() {
  const { user } = useSession();
  const { confirm } = useConfirm();
  const { currency, privacyMode } = usePreferences();
  const { t, locale } = useTranslation();
  const bcp47 = localeToBcp47[locale];

  const statusLabel = {
    Paid: t("transactions.paid"),
    Pending: t("transactions.pending"),
  } as const;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactions, setTransactions] = useState<PurchaseTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<PurchaseTransaction | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [month, setMonth] = useState("all");
  const [status, setStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const isFiltered = debouncedSearch.trim() !== "" || month !== "all" || status !== "all";

  // Evita um fetch por tecla: a pesquisa só dispara 300ms depois de parar de escrever.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  function handlePageChange(page: number) {
    setLoading(true);
    setCurrentPage(page);
  }

  useEffect(() => {
    let active = true;

    async function loadTransactions() {
      try {
        const query = debouncedSearch.trim().toLowerCase();

        // A pesquisa por substring não tem query equivalente no Appwrite sem
        // índice full-text, por isso nesse caso (raro) filtramos no cliente e
        // paginamos o resultado filtrado. Sem pesquisa, a paginação é feita
        // no servidor com Query.limit/Query.offset e response.total.
        if (query) {
          const documents = await getAllTransactions(user.$id);
          if (!active) return;

          const filtered = documents
            .map(toPurchaseTransaction)
            .filter((item) => {
              const descriptionLabel = formatInstallmentDescription(
                item.description,
                item.installmentNumber,
                item.totalInstallments,
              );
              const matchesSearch =
                item.description.toLowerCase().includes(query) ||
                descriptionLabel.toLowerCase().includes(query) ||
                item.category.toLowerCase().includes(query);
              const matchesMonth = month === "all" || item.date.startsWith(month);
              const matchesStatus = status === "all" || item.status === status;
              return matchesSearch && matchesMonth && matchesStatus;
            })
            .sort((a, b) => b.date.localeCompare(a.date));

          const page = Math.min(currentPage, Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE)));
          setTotalItems(filtered.length);
          setTransactions(filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE));
          if (page !== currentPage) setCurrentPage(page);
          return;
        }

        const response = await getTransactions(
          user.$id,
          ITEMS_PER_PAGE,
          (currentPage - 1) * ITEMS_PER_PAGE,
          {
            ...(status === "Paid" || status === "Pending" ? { status } : {}),
            ...(month !== "all" ? { month } : {}),
          },
        );
        if (!active) return;

        setTotalItems(response.total);

        // A página pode ter deixado de existir (ex: última transação apagada).
        const lastPage = Math.max(1, Math.ceil(response.total / ITEMS_PER_PAGE));
        if (response.total > 0 && currentPage > lastPage) {
          setCurrentPage(lastPage);
          return;
        }

        setTransactions(response.documents.map(toPurchaseTransaction));
      } catch (error) {
        console.error("Falha ao carregar transações.", error);
        if (active) {
          setTransactions([]);
          setTotalItems(0);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadTransactions();

    return () => {
      active = false;
    };
  }, [user.$id, currentPage, debouncedSearch, month, status, refreshKey]);

  // Com paginação no servidor já não dá para derivar os meses da página atual
  // (ficariam só os meses dos 10 itens visíveis), por isso oferecemos os
  // últimos 24 meses.
  const monthOptions = useMemo(() => {
    const options: string[] = [];
    const now = new Date();
    for (let index = 0; index < 24; index += 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
      options.push(
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      );
    }
    return options;
  }, []);

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
    if (editing) {
      // Edição: substitui no lugar; o refetch reconcilia ordem/total se a data mudou.
      setTransactions((current) =>
        current.map((item) => (item.id === transaction.id ? transaction : item)),
      );
      setRefreshKey((key) => key + 1);
      return;
    }
    // Criação: volta à primeira página, onde a nova transação é listada.
    if (currentPage !== 1) setCurrentPage(1);
    setRefreshKey((key) => key + 1);
  }

  async function handleDelete(transaction: PurchaseTransaction) {
    const isConfirmed = await confirm({
      title: t("transactions.deleteTitle"),
      description: t("transactions.deleteDescription", { description: transaction.description }),
      confirmText: t("transactions.deleteConfirm"),
      variant: "danger",
    });

    if (!isConfirmed) return;

    try {
      setDeletingId(transaction.id);
      await deleteTransaction(transaction.id);
      setTransactions((current) => current.filter((item) => item.id !== transaction.id));
      // Se a página ficou vazia, volta uma página; senão refetch para
      // preencher a vaga com o primeiro item da página seguinte.
      if (transactions.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        setRefreshKey((key) => key + 1);
      }
      if (editing?.id === transaction.id) closeModal();
      toast.success(t("transactions.deleted", { description: transaction.description }));
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast.error(t("transactions.deleteError"));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex w-full flex-col gap-4 md:gap-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-emerald-950/80 bg-gradient-to-r from-[#041610] to-[#0a241a] p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6 lg:p-8">
        <div className="flex items-center gap-6">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl border border-emerald-800/40 bg-emerald-500/10 text-emerald-400">
            <Receipt className="size-8" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
              {t("transactions.title")}
            </h1>
            <p className="mt-2 text-sm text-emerald-100/70 sm:text-base">
              {t("transactions.subtitle")}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-emerald-500"
        >
          <Plus className="size-4" aria-hidden="true" />
          {t("transactions.new")}
        </button>
      </header>

      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-700/50 bg-black px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <span className="sr-only">{t("transactions.month")}</span>
            <AppSelect
              value={month}
              onChange={(next) => {
                setMonth(next);
                setCurrentPage(1);
              }}
              ariaLabel={t("transactions.month")}
              options={[
                { value: "all", label: t("transactions.allMonths") },
                ...monthOptions.map((option) => ({
                  value: option,
                  label: formatMonthLabel(option, bcp47),
                })),
              ]}
              className="min-w-44"
              menuClassName="left-0 max-h-72 w-52"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <span className="sr-only">{t("transactions.status")}</span>
            <AppSelect
              value={status}
              onChange={(next) => {
                setStatus(next);
                setCurrentPage(1);
              }}
              ariaLabel={t("transactions.status")}
              options={[
                { value: "all", label: t("transactions.allStatuses") },
                { value: "Paid", label: t("transactions.paid") },
                { value: "Pending", label: t("transactions.pending") },
              ]}
              className="min-w-40"
              menuClassName="left-0 w-44"
            />
          </div>
        </div>

        <label className="relative block w-full lg:ml-auto lg:w-72">
          <span className="sr-only">{t("transactions.search")}</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-500"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setCurrentPage(1);
            }}
            placeholder={t("transactions.searchPlaceholder")}
            className={`${controlClassName} w-full pr-3 pl-10`}
          />
        </label>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-700/50 bg-black">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-xs tracking-wide text-zinc-400 uppercase">
                <th className="w-[22%] px-3 py-3 font-medium md:px-5 md:py-4">{t("transactions.situation")}</th>
                <th className="w-[34%] px-3 py-3 font-medium md:px-5 md:py-4">{t("transactions.description")}</th>
                <th className="hidden w-[16%] px-3 py-3 font-medium sm:table-cell md:px-5 md:py-4">{t("transactions.category")}</th>
                <th className="hidden w-[14%] px-3 py-3 font-medium md:table-cell md:px-5 md:py-4">{t("transactions.date")}</th>
                <th className="w-[24%] px-3 py-3 text-right font-medium md:px-5 md:py-4">{t("transactions.amount")}</th>
                <th className="w-[20%] px-3 py-3 text-right font-medium md:px-5 md:py-4">{t("transactions.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-zinc-400">
                    {t("common.loading")}
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    {isFiltered ? t("transactions.emptyFiltered") : t("transactions.empty")}
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => {
                  const descriptionLabel = formatInstallmentDescription(
                    transaction.description,
                    transaction.installmentNumber,
                    transaction.totalInstallments,
                  );

                  return (
                  <tr
                    key={transaction.id}
                    className="border-b border-zinc-800 transition-colors duration-200 last:border-b-0 hover:bg-zinc-800/40"
                  >
                    <td className="px-3 py-3 md:px-5 md:py-4">
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
                    <td className="max-w-0 truncate px-3 py-3 font-medium text-zinc-100 md:px-5 md:py-4" title={descriptionLabel}>
                      {descriptionLabel}
                    </td>
                    <td className="hidden max-w-0 truncate px-3 py-3 text-zinc-300 sm:table-cell md:px-5 md:py-4">{transaction.category}</td>
                    <td className="hidden px-3 py-3 whitespace-nowrap text-zinc-400 md:table-cell md:px-5 md:py-4">{formatDate(transaction.date, bcp47)}</td>
                    <td
                      className={`px-3 py-3 text-right font-semibold whitespace-nowrap tabular-nums md:px-5 md:py-4 ${
                        privacyMode
                          ? "text-zinc-300"
                          : transaction.type === "income"
                            ? "text-emerald-400"
                            : "text-red-400"
                      }`}
                    >
                      {privacyMode
                        ? formatCurrency(transaction.amount, currency, true)
                        : `${transaction.type === "income" ? "+" : "−"} ${formatCurrency(transaction.amount, currency, false)}`}
                    </td>
                    <td className="px-3 py-3 md:px-5 md:py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(transaction)}
                          aria-label={t("transactions.editAria", { description: descriptionLabel })}
                          className="rounded-lg p-2 text-zinc-400 transition-colors duration-200 hover:bg-zinc-800 hover:text-zinc-100"
                        >
                          <Pencil className="size-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(transaction)}
                          disabled={deletingId === transaction.id}
                          aria-label={t("transactions.deleteAria", { description: descriptionLabel })}
                          className="rounded-lg p-2 text-zinc-400 transition-colors duration-200 hover:bg-red-950 hover:text-red-400 disabled:opacity-50"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!loading && totalItems > 0 ? (
          <div className="border-t border-zinc-800 px-4 py-3 md:px-5">
            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={handlePageChange}
            />
          </div>
        ) : null}
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
