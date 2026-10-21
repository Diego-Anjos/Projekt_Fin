"use client";

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
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <nav
      aria-label="Paginação"
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Página anterior"
        className={buttonClassName}
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Anterior
      </button>

      <span aria-live="polite" className="text-sm text-zinc-400">
        Página {currentPage} de {totalPages || 1}
        {totalItems > 0 ? (
          <span className="text-zinc-500"> · {totalItems} {totalItems === 1 ? "item" : "itens"}</span>
        ) : null}
      </span>

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages || totalItems === 0}
        aria-label="Próxima página"
        className={buttonClassName}
      >
        Próximo
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </nav>
  );
}
