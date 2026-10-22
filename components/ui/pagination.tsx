"use client";

import { useTranslation } from "@/hooks/use-translation";
import { ChevronLeft, ChevronRight } from "lucide-react";

const buttonClassName =
  "inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-400 hover:text-emerald-400 hover:border-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-zinc-400 disabled:hover:border-zinc-800";

export function Pagination({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
}: {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}) {
  const { t } = useTranslation();
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <nav
      aria-label={t("common.pagination")}
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label={t("common.previous")}
        className={buttonClassName}
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        {t("common.previous")}
      </button>

      <span aria-live="polite" className="text-sm text-zinc-400">
        {t("common.pageOf", { current: currentPage, total: totalPages || 1 })}
        {totalItems > 0 ? (
          <span className="text-zinc-500">
            {" "}
            · {totalItems} {totalItems === 1 ? t("common.item") : t("common.items")}
          </span>
        ) : null}
      </span>

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages || totalItems === 0}
        aria-label={t("common.next")}
        className={buttonClassName}
      >
        {t("common.next")}
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </nav>
  );
}
