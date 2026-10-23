"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "@/components/require-session";
import { CustomDatePicker, parseCalendarDate, toCalendarIso } from "@/components/ui/custom-date-picker";
import { usePreferences } from "@/contexts/preferences-context";
import { useTranslation } from "@/hooks/use-translation";
import {
  createInstallmentTransactions,
  createTransaction,
  getCategories,
  updateTransaction,
  type CategoryDocument,
} from "@/lib/appwrite/database";
import { getCategoryIcon } from "@/lib/category-utils";
import {
  MAX_INSTALLMENTS,
  MIN_INSTALLMENTS,
  splitInstallmentAmounts,
} from "@/lib/installments";
import { formatCurrency, formatCurrencyInput, getCurrencySymbol, parseCurrencyToNumber } from "@/lib/utils";
import {
  transactionFormSchema,
  type TransactionFormValues,
} from "@/lib/validation/transaction";
import { ChevronDown, X } from "lucide-react";
import { toast } from "sonner";
import { createElement, useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { useForm } from "react-hook-form";

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
  groupId?: string | null;
  installmentNumber?: number | null;
  totalInstallments?: number | null;
};

function CategoryGlyph({ name, className }: { name: string; className?: string }) {
  return createElement(getCategoryIcon(name), {
    className,
    "aria-hidden": true,
  });
}

const fieldClassName =
  "h-12 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none transition-colors duration-200 placeholder:text-zinc-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";

function collectValidationErrors(form: HTMLFormElement, invalidField: string) {
  const errors: Record<string, string> = {};

  for (const element of form.elements) {
    if (
      !(element instanceof HTMLInputElement) &&
      !(element instanceof HTMLSelectElement) &&
      !(element instanceof HTMLTextAreaElement)
    ) {
      continue;
    }

    if (!element.name || element.disabled || element.validity.valid) continue;
    errors[element.name] = element.validationMessage || invalidField;
  }

  return errors;
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
  const { currency } = usePreferences();
  const { t } = useTranslation();
  const [type, setType] = useState<TransactionType>(transaction?.type ?? "expense");
  const [amount, setAmount] = useState(
    transaction ? formatCurrencyInput(Math.round(transaction.amount * 100), currency) : "",
  );
  const [description, setDescription] = useState(transaction?.description ?? "");
  const [category, setCategory] = useState(transaction?.category ?? "");
  const [categoryOptions, setCategoryOptions] = useState<CategoryDocument[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const categoryMenuRef = useRef<HTMLDivElement>(null);
  const [date, setDate] = useState<Date | null>(
    transaction ? parseCalendarDate(transaction.date) : null,
  );
  const [status, setStatus] = useState<TransactionStatus>(transaction?.status ?? "Paid");
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentCount, setInstallmentCount] = useState(String(MIN_INSTALLMENTS));
  const [amountError, setAmountError] = useState("");
  const [installmentError, setInstallmentError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const editingInstallment = (transaction?.totalInstallments ?? 0) > 1;
  const parsedInstallmentCount = Number(installmentCount);
  const parsedPreviewAmount = parseCurrencyToNumber(amount);
  const previewAmounts =
    isInstallment &&
    Number.isInteger(parsedInstallmentCount) &&
    parsedInstallmentCount >= MIN_INSTALLMENTS &&
    parsedInstallmentCount <= MAX_INSTALLMENTS &&
    parsedPreviewAmount > 0
      ? splitInstallmentAmounts(parsedPreviewAmount, parsedInstallmentCount)
      : [];
  const { user } = useSession();
  const categoriesUnavailable = !categoriesLoading && categoryOptions.length === 0;
  const categoryNames = categoryOptions.map((item) => item.name);
  const visibleCategories =
    category && !categoryNames.some((name) => name.localeCompare(category, "pt-BR", { sensitivity: "accent" }) === 0)
      ? [category, ...categoryNames]
      : categoryNames;

  /** RHF + Zod: validação canónica no submit (UI controlada mantém formatadores de moeda). */
  const { setError: setFormError, clearErrors: clearFormErrors } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: transaction?.type ?? "expense",
      description: transaction?.description ?? "",
      category: transaction?.category ?? "",
      date: transaction ? (parseCalendarDate(transaction.date) ?? new Date()) : new Date(),
      amount: transaction?.amount && transaction.amount > 0 ? transaction.amount : 0.01,
      status: transaction?.status ?? "Paid",
      isInstallment: false,
      installmentCount: MIN_INSTALLMENTS,
    },
    mode: "onSubmit",
  });

  useEffect(() => {
    setAmount((current) => (current ? formatCurrencyInput(current, currency) : current));
  }, [currency]);

  useEffect(() => {
    let active = true;

    async function fetchCategories() {
      try {
        const documents = await getCategories(user.$id);
        if (!active) return;

        if (documents.length === 0) {
          setCategoryOptions([]);
          return;
        }

        setCategoryOptions(documents);
      } catch (error) {
        if (!active) return;
        console.error("Falha ao carregar as categorias.", error);
        toast.error(t("transactionModal.categoriesLoadError"));
      } finally {
        if (active) setCategoriesLoading(false);
      }
    }

    void fetchCategories();

    return () => {
      active = false;
    };
  }, [user.$id, t]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!categoryMenuRef.current?.contains(event.target as Node)) {
        setIsCategoryOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && document.querySelector(".react-datepicker")) return;
      if (event.key === "Escape" && isCategoryOpen) {
        setIsCategoryOpen(false);
        return;
      }
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isCategoryOpen, onClose]);

  function handleSaveClick(event: MouseEvent<HTMLButtonElement>) {
    console.log("--- CLIQUE NO BOTÃO SALVAR ---");
    event.preventDefault();

    const form = event.currentTarget.form;
    if (!form) {
      console.error("O botão Salvar não está associado ao formulário.");
      return;
    }

    form.requestSubmit();
  }

  async function persistTransaction(values: TransactionFormValues) {
    if (!user?.$id) {
      setSubmitError(t("transactionModal.sessionMissing"));
      return;
    }

    const installmentAmounts =
      !transaction && values.isInstallment
        ? splitInstallmentAmounts(values.amount, values.installmentCount ?? 0)
        : [];

    if (
      !transaction &&
      values.isInstallment &&
      installmentAmounts.some((value) => value <= 0)
    ) {
      setInstallmentError(t("transactionModal.installmentAmountError"));
      setSubmitError(t("transactionModal.installmentAmountError"));
      return;
    }

    const dataToSend = {
      userId: user.$id,
      type: values.type,
      description: values.description,
      category: values.category,
      date: toCalendarIso(values.date),
      amount: values.amount,
      status: values.status,
    };

    try {
      setIsSubmitting(true);
      setSubmitError("");

      const count = values.installmentCount ?? parsedInstallmentCount;
      const response = transaction
        ? await updateTransaction(transaction.id, dataToSend)
        : values.isInstallment
          ? (await createInstallmentTransactions(dataToSend, count))[0]
          : await createTransaction(dataToSend);

      if (!response) {
        throw new Error(t("transactionModal.saveError"));
      }

      onSave({
        id: response.$id,
        type: response.type === "income" ? "income" : "expense",
        amount: Number(response.amount),
        description: response.description,
        category: response.category,
        date: response.date,
        status: response.status === "Pending" ? "Pending" : "Paid",
        groupId: response.groupId ?? transaction?.groupId,
        installmentNumber: response.installmentNumber ?? transaction?.installmentNumber,
        totalInstallments: response.totalInstallments ?? transaction?.totalInstallments,
      });
      toast.success(
        transaction
          ? t("transactionModal.updated")
          : values.isInstallment
            ? t("transactionModal.installmentsCreated", { count })
            : t("transactionModal.created"),
      );
      onClose();
    } catch (error) {
      console.error("Falha ao salvar a transação.", error);
      const message = error instanceof Error ? error.message : t("transactionModal.saveError");
      setSubmitError(message);
      toast.error(t("transactionModal.saveError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearFormErrors();

    const htmlErrors = collectValidationErrors(
      event.currentTarget,
      t("transactionModal.invalidField"),
    );
    const parsedAmount = parseCurrencyToNumber(amount);

    const candidate: TransactionFormValues = {
      type,
      description: description.trim(),
      category,
      date: date ?? (undefined as unknown as Date),
      amount: parsedAmount,
      status,
      isInstallment: Boolean(!transaction && isInstallment),
      installmentCount: isInstallment ? parsedInstallmentCount : undefined,
    };

    const parsed = transactionFormSchema.safeParse(candidate);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = { ...htmlErrors };
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
        setFormError(key as keyof TransactionFormValues, { message: issue.message });
      }
      if (!date) fieldErrors.date = fieldErrors.date ?? t("transactionModal.dateError");
      if (!category) fieldErrors.category = fieldErrors.category ?? t("transactionModal.categoryError");
      if (!(parsedAmount > 0)) {
        fieldErrors.amount = fieldErrors.amount ?? t("transactionModal.amountError");
      }
      setAmountError(fieldErrors.amount ?? "");
      setInstallmentError(
        fieldErrors.installmentCount ?? fieldErrors.isInstallment ?? fieldErrors.installments ?? "",
      );
      setSubmitError(Object.values(fieldErrors).filter(Boolean).join(" "));
      return;
    }

    setAmountError("");
    setInstallmentError("");
    await persistTransaction(parsed.data);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaction-modal-title"
        className="relative max-h-[90vh] w-full max-w-[95vw] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-6 sm:max-w-2xl md:max-w-3xl md:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="absolute top-4 right-4 rounded-lg p-2 text-zinc-400 transition-colors duration-200 hover:bg-zinc-800 hover:text-zinc-100"
        >
          <X className="size-5" aria-hidden="true" />
        </button>

        <h2 id="transaction-modal-title" className="pr-10 text-xl font-semibold text-zinc-50">
          {transaction ? t("transactionModal.editTitle") : t("transactionModal.newTitle")}
        </h2>
        <p className="mt-1 mb-6 text-sm text-zinc-400">
          {t("transactionModal.subtitle")}
        </p>

        <form
          id="transaction-form"
          noValidate
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-6 md:grid-cols-2"
        >
          <fieldset className="col-span-1 md:col-span-2">
            <legend className="mb-3 text-sm font-medium text-zinc-300">{t("transactionModal.type")}</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                aria-pressed={type === "income"}
                onClick={() => {
                  setType("income");
                  setIsInstallment(false);
                  setInstallmentError("");
                }}
                className={
                  type === "income"
                    ? "rounded-xl border border-emerald-500 bg-emerald-500/15 px-4 py-4 text-sm font-semibold text-emerald-400 transition-colors duration-200"
                    : "rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-4 text-sm font-semibold text-zinc-400 transition-colors duration-200 hover:border-emerald-800 hover:text-emerald-400"
                }
              >
                {t("transactionModal.income")}
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
                {t("transactionModal.expense")}
              </button>
            </div>
          </fieldset>

          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-zinc-300">
                {isInstallment
                  ? t("transactionModal.amountTotal", { symbol: getCurrencySymbol(currency) })
                  : editingInstallment
                    ? t("transactionModal.amountInstallment", { symbol: getCurrencySymbol(currency) })
                    : t("transactionModal.amount", { symbol: getCurrencySymbol(currency) })}
              </span>
              <span className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-4 transition-colors duration-200 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500">
                <span className="text-xl font-medium text-emerald-400 select-none">
                  {getCurrencySymbol(currency)}
                </span>
                <input
                  type="text"
                  name="amount"
                  inputMode="numeric"
                  value={amount}
                  onChange={(event) => {
                    const formatted = formatCurrencyInput(event.target.value, currency);
                    event.target.value = formatted;
                    const end = formatted.length;
                    event.target.setSelectionRange(end, end);
                    setAmount(formatted);
                    setAmountError("");
                  }}
                  placeholder={currency === "USD" ? "0.00" : "0,00"}
                  required
                  aria-invalid={amountError ? true : undefined}
                  className="w-full bg-transparent text-4xl font-semibold tracking-tight text-zinc-100 outline-none transition-colors duration-200 placeholder:text-zinc-600"
                />
              </span>
              <span className="text-sm text-zinc-500">
                {isInstallment
                  ? t("transactionModal.amountTotalHint")
                  : editingInstallment
                    ? t("transactionModal.amountInstallmentHint")
                    : t("transactionModal.amountHint")}
              </span>
              {amountError ? <span className="text-sm text-red-400">{amountError}</span> : null}
            </label>

            {!transaction && type === "expense" ? (
              <div className="flex flex-col gap-4">
                <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-zinc-300">
                  <input
                    type="checkbox"
                    checked={isInstallment}
                    onChange={(event) => {
                      setIsInstallment(event.target.checked);
                      setInstallmentError("");
                    }}
                    className="size-4 accent-emerald-500"
                  />
                  {t("transactionModal.installmentToggle")}
                </label>

                {isInstallment ? (
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-zinc-300">
                      {t("transactionModal.installmentCount")}
                    </span>
                    <input
                      type="number"
                      name="installments"
                      inputMode="numeric"
                      min={MIN_INSTALLMENTS}
                      max={MAX_INSTALLMENTS}
                      step={1}
                      value={installmentCount}
                      onChange={(event) => {
                        setInstallmentCount(event.target.value);
                        setInstallmentError("");
                      }}
                      required
                      aria-invalid={installmentError ? true : undefined}
                      className={fieldClassName}
                    />
                    <span className="text-sm text-zinc-500">{t("transactionModal.installmentCountHint")}</span>
                    {previewAmounts.length > 0 ? (
                      <span className="text-sm text-emerald-400">
                        {previewAmounts[0] === previewAmounts[previewAmounts.length - 1]
                          ? t("transactionModal.installmentPreview", {
                              amount: formatCurrency(previewAmounts[0], currency),
                              count: previewAmounts.length,
                            })
                          : t("transactionModal.installmentPreviewAdjusted", {
                              amount: formatCurrency(previewAmounts[0], currency),
                              last: formatCurrency(previewAmounts[previewAmounts.length - 1], currency),
                              count: previewAmounts.length,
                            })}
                      </span>
                    ) : null}
                    {installmentError ? (
                      <span className="text-sm text-red-400">{installmentError}</span>
                    ) : null}
                  </label>
                ) : null}
              </div>
            ) : null}
          </div>

          <label className="flex h-full flex-col gap-2">
            <span className="text-sm font-medium text-zinc-300">{t("transactionModal.date")}</span>
            <CustomDatePicker
              name="date"
              selected={date}
              onChange={setDate}
              required
            />
          </label>

          {editingInstallment ? (
            <p className="col-span-1 rounded-xl border border-emerald-900/60 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300 md:col-span-2">
              {t("transactionModal.installmentEditNote", {
                current: transaction?.installmentNumber ?? 1,
                total: transaction?.totalInstallments ?? 1,
              })}
            </p>
          ) : null}

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-300">{t("transactionModal.description")}</span>
            <input
              type="text"
              name="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("transactionModal.descriptionPlaceholder")}
              required
              className={fieldClassName}
            />
          </label>

          <div className="flex flex-col gap-2">
            <span id="transaction-category-label" className="text-sm font-medium text-zinc-300">
              {t("transactionModal.category")}
            </span>
            <div ref={categoryMenuRef} className="relative">
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={isCategoryOpen}
                aria-labelledby="transaction-category-label"
                disabled={categoriesUnavailable}
                onClick={() => setIsCategoryOpen((open) => !open)}
                className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-emerald-500/30 bg-black/40 px-4 py-3 text-left text-slate-300 transition-colors focus:border-emerald-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              >
                {categoriesUnavailable ? (
                  <span>{t("transactionModal.noCategories")}</span>
                ) : category ? (
                  <span className="flex items-center gap-3">
                    <CategoryGlyph name={category} className="size-4 shrink-0 text-emerald-400" />
                    {category}
                  </span>
                ) : (
                  <span>{t("transactionModal.selectCategory")}</span>
                )}
                <ChevronDown
                  className={`size-4 shrink-0 transition-transform ${isCategoryOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
              {isCategoryOpen ? (
                <div
                  role="listbox"
                  aria-labelledby="transaction-category-label"
                  className="absolute top-full z-50 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900 p-1 shadow-2xl shadow-black/60"
                >
                  {categoriesLoading ? (
                    <p className="px-4 py-3 text-sm text-zinc-500">{t("transactionModal.loadingCategories")}</p>
                  ) : visibleCategories.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-zinc-500">
                      {t("transactionModal.noCategories")}
                    </p>
                  ) : (
                    visibleCategories.map((name) => {
                      const isSelected = name === category;

                      return (
                        <button
                          key={name}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => {
                            setCategory(name);
                            setIsCategoryOpen(false);
                          }}
                          className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-zinc-800 ${
                            isSelected ? "font-medium text-emerald-400" : "text-zinc-300"
                          }`}
                        >
                          <CategoryGlyph name={name} className="size-4 shrink-0" />
                          {name}
                        </button>
                      );
                    })
                  )}
                </div>
              ) : null}
            </div>
          </div>

          <fieldset className="col-span-1 md:col-span-2">
            <legend className="mb-3 text-sm font-medium text-zinc-300">{t("transactionModal.status")}</legend>
            <div className="flex flex-wrap gap-3">
              {(
                [
                  ["Paid", t("transactions.paid")],
                  ["Pending", t("transactions.pending")],
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

          {submitError ? (
            <p className="col-span-1 text-sm text-red-400 md:col-span-2" role="alert">
              {submitError}
            </p>
          ) : null}

          <button
            type="submit"
            form="transaction-form"
            onClick={handleSaveClick}
            disabled={isSubmitting}
            className="col-span-1 h-14 w-full rounded-xl bg-emerald-600 text-base font-semibold tracking-wide text-white transition-colors duration-200 hover:bg-emerald-500 disabled:opacity-60 md:col-span-2"
          >
            {isSubmitting ? t("transactionModal.saving") : t("transactionModal.save")}
          </button>
        </form>
      </div>
    </div>
  );
}
