"use client";

import { X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

const categories = [
  "Alimentação",
  "Moradia",
  "Transporte",
  "Assinaturas",
  "Salário",
  "Lazer",
  "Saúde",
  "Outros",
];

export type TransactionType = "income" | "expense";
export type TransactionStatus = "Paid" | "Pending";

export type PurchaseTransaction = {
  id: string;
  type: TransactionType;
  description: string;
  category: string;
  date: string;
  amount: number;
  status: TransactionStatus;
};

const fieldClassName =
  "h-12 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none transition-colors duration-200 placeholder:text-zinc-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";

const amountFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function parseAmount(value: string) {
  const normalized = value.trim().replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : Number.NaN;
}

type TransactionModalProps = {
  open: boolean;
  transaction: PurchaseTransaction | null;
  onClose: () => void;
  onSave: (transaction: PurchaseTransaction) => void;
};

export function TransactionModal({ open, transaction, onClose, onSave }: TransactionModalProps) {
  if (!open) return null;

  return (
    <TransactionModalForm
      key={transaction?.id ?? "new"}
      transaction={transaction}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function TransactionModalForm({
  transaction,
  onClose,
  onSave,
}: Omit<TransactionModalProps, "open">) {
  const [type, setType] = useState<TransactionType>(transaction?.type ?? "expense");
  const [amount, setAmount] = useState(transaction ? amountFormatter.format(transaction.amount) : "");
  const [description, setDescription] = useState(transaction?.description ?? "");
  const [category, setCategory] = useState(transaction?.category ?? "");
  const [date, setDate] = useState(transaction?.date ?? "");
  const [status, setStatus] = useState<TransactionStatus>(transaction?.status ?? "Paid");
  const [amountError, setAmountError] = useState("");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = parseAmount(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setAmountError("Informe um valor maior que zero.");
      return;
    }

    onSave({
      id: transaction?.id ?? crypto.randomUUID(),
      type,
      amount: parsedAmount,
      description: description.trim(),
      category,
      date,
      status,
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaction-modal-title"
        className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-6 md:p-8"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 rounded-lg p-2 text-zinc-400 transition-colors duration-200 hover:bg-zinc-800 hover:text-zinc-100"
        >
          <X className="size-5" aria-hidden="true" />
        </button>

        <h2 id="transaction-modal-title" className="pr-10 text-xl font-semibold text-zinc-50">
          {transaction ? "Editar Transação" : "Registrar Nova Transação"}
        </h2>
        <p className="mt-1 mb-6 text-sm text-zinc-400">
          Adicione os detalhes da sua compra ou entrada
        </p>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <fieldset className="col-span-1 md:col-span-2">
            <legend className="mb-3 text-sm font-medium text-zinc-300">Tipo de Transação</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                aria-pressed={type === "income"}
                onClick={() => setType("income")}
                className={
                  type === "income"
                    ? "rounded-xl border border-emerald-500 bg-emerald-500/15 px-4 py-4 text-sm font-semibold text-emerald-400 transition-colors duration-200"
                    : "rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-4 text-sm font-semibold text-zinc-400 transition-colors duration-200 hover:border-emerald-800 hover:text-emerald-400"
                }
              >
                Entrada / Receita
              </button>
              <button
                type="button"
                aria-pressed={type === "expense"}
                onClick={() => setType("expense")}
                className={
                  type === "expense"
                    ? "rounded-xl border border-red-500 bg-red-500/15 px-4 py-4 text-sm font-semibold text-red-400 transition-colors duration-200"
                    : "rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-4 text-sm font-semibold text-zinc-400 transition-colors duration-200 hover:border-red-900 hover:text-red-400"
                }
              >
                Saída / Despesa
              </button>
            </div>
          </fieldset>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-300">Valor (R$)</span>
            <span className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-4 transition-colors duration-200 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500">
              <span className="text-xl font-medium text-zinc-500">R$</span>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value);
                  setAmountError("");
                }}
                placeholder="0,00"
                required
                aria-invalid={amountError ? true : undefined}
                className="w-full bg-transparent text-4xl font-semibold tracking-tight text-zinc-100 outline-none transition-colors duration-200 placeholder:text-zinc-600"
              />
            </span>
            {amountError ? <span className="text-sm text-red-400">{amountError}</span> : null}
          </label>

          <label className="flex h-full flex-col gap-2">
            <span className="text-sm font-medium text-zinc-300">Data da Transação</span>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
              className={`${fieldClassName} mt-auto [color-scheme:dark]`}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-300">Descrição</span>
            <input
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Mercado da semana"
              required
              className={fieldClassName}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-300">Categoria</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              required
              className={`${fieldClassName} [color-scheme:dark]`}
            >
              <option value="" disabled>
                Selecione uma categoria
              </option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="col-span-1 md:col-span-2">
            <legend className="mb-3 text-sm font-medium text-zinc-300">Status</legend>
            <div className="flex flex-wrap gap-3">
              {(
                [
                  ["Paid", "Pago"],
                  ["Pending", "Pendente"],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className={
                    status === value
                      ? "flex cursor-pointer items-center gap-2 rounded-lg border border-emerald-500 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-400 transition-colors duration-200"
                      : "flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-400 transition-colors duration-200 hover:border-emerald-800 hover:text-emerald-300"
                  }
                >
                  <input
                    type="radio"
                    name="status"
                    value={value}
                    checked={status === value}
                    onChange={() => setStatus(value)}
                    className="accent-emerald-500"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <button
            type="submit"
            className="col-span-1 h-14 w-full rounded-xl bg-emerald-600 text-base font-semibold tracking-wide text-white transition-colors duration-200 hover:bg-emerald-500 md:col-span-2"
          >
            Salvar Transação
          </button>
        </form>
      </div>
    </div>
  );
}
