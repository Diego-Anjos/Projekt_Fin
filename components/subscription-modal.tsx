"use client";

import { useSession } from "@/components/require-session";
import { AppSelect } from "@/components/ui/app-select";
import { CustomDatePicker, parseCalendarDate, toCalendarIso } from "@/components/ui/custom-date-picker";
import { usePreferences } from "@/contexts/preferences-context";
import { useTranslation } from "@/hooks/use-translation";
import { createSubscription, updateSubscription } from "@/lib/appwrite/database";
import { formatCurrencyInput, getCurrencySymbol, parseCurrencyToNumber } from "@/lib/utils";
import { X } from "lucide-react";
import { useEffect, useState, type FormEvent, type MouseEvent } from "react";

export type BillingCycle = "monthly" | "yearly";
export type PaymentMethod = "credit" | "pix" | "boleto";

export type ServiceSubscription = {
  id: string;
  name: string;
  amount: number;
  cycle: BillingCycle;
  subscribedAt: string;
  nextDue: string;
  payment: PaymentMethod;
  status: "active";
};

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

type SubscriptionModalProps = {
  open: boolean;
  subscription?: ServiceSubscription | null;
  onClose: () => void;
  onSave: (subscription: ServiceSubscription) => void;
};

export function SubscriptionModal({
  open,
  subscription = null,
  onClose,
  onSave,
}: SubscriptionModalProps) {
  if (!open) return null;

  return (
    <SubscriptionModalForm
      key={subscription?.id ?? "new"}
      subscription={subscription}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function SubscriptionModalForm({
  subscription,
  onClose,
  onSave,
}: Omit<SubscriptionModalProps, "open">) {
  const { currency } = usePreferences();
  const { t } = useTranslation();
  const [name, setName] = useState(subscription?.name ?? "");
  const [amount, setAmount] = useState(
    subscription ? formatCurrencyInput(Math.round(subscription.amount * 100), currency) : "",
  );
  const [cycle, setCycle] = useState<BillingCycle>(subscription?.cycle ?? "monthly");
  const [subscribedAt, setSubscribedAt] = useState<Date | null>(
    subscription ? parseCalendarDate(subscription.subscribedAt) : null,
  );
  const [nextDue, setNextDue] = useState<Date | null>(
    subscription ? parseCalendarDate(subscription.nextDue) : null,
  );
  const [payment, setPayment] = useState<PaymentMethod>(subscription?.payment ?? "credit");
  const [amountError, setAmountError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useSession();

  useEffect(() => {
    setAmount((current) => (current ? formatCurrencyInput(current, currency) : current));
  }, [currency]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && document.querySelector(".react-datepicker")) return;
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    console.log("--- SUBMIT DO FORMULÁRIO ---");

    const errors = collectValidationErrors(event.currentTarget, t("subscriptions.invalidField"));
    const parsedAmount = parseCurrencyToNumber(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      errors.amount = t("subscriptions.amountError");
    }

    if (!subscribedAt) {
      errors.subscribedAt = t("subscriptions.subscribedAtError");
    }

    if (!nextDue) {
      errors.nextDue = t("subscriptions.nextDueError");
    }

    if (Object.keys(errors).length > 0 || !subscribedAt || !nextDue) {
      console.log("Erros de validação:", errors);
      setAmountError(errors.amount ?? "");
      setSubmitError(Object.values(errors).join(" "));
      return;
    }

    setAmountError("");

    const formData = {
      name: name.trim(),
      amount: parsedAmount,
      cycle,
      subscribedAt: toCalendarIso(subscribedAt),
      nextDue: toCalendarIso(nextDue),
      payment,
      status: "active" as const,
    };

    try {
      setIsSubmitting(true);
      setSubmitError("");

      if (!user || !user.$id) {
        console.error("❌ ERRO: O utilizador não está logado no momento do clique!");
        setSubmitError(t("subscriptions.sessionMissing"));
        return;
      }

      const dataToSend = {
        ...formData,
        userId: user.$id,
      };

      console.log("A. Dados do formulário prontos:", dataToSend);
      const response = subscription
        ? await updateSubscription(subscription.id, dataToSend)
        : await createSubscription(dataToSend);
      console.log("B. Persistência da assinatura retornou com sucesso!");

      onSave({
        ...formData,
        id: response.$id,
      });
      onClose();
    } catch (error) {
      console.error("❌ C. ERRO CAPTURADO NO MODAL:", error);
      const message = error instanceof Error ? error.message : t("subscriptions.saveError");
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
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
        aria-labelledby="subscription-modal-title"
        className="relative max-h-[90vh] w-full max-w-[95vw] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-6 sm:max-w-xl md:max-w-3xl md:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t("subscriptions.close")}
          className="absolute top-4 right-4 rounded-lg p-2 text-zinc-400 transition-colors duration-200 hover:bg-zinc-800 hover:text-zinc-100"
        >
          <X className="size-5" aria-hidden="true" />
        </button>

        <h2 id="subscription-modal-title" className="pr-10 text-xl font-semibold text-zinc-50">
          {subscription ? t("subscriptions.modalEditTitle") : t("subscriptions.modalNewTitle")}
        </h2>
        <p className="mt-1 mb-6 text-sm text-zinc-400">
          {subscription
            ? t("subscriptions.modalEditSubtitle")
            : t("subscriptions.modalNewSubtitle")}
        </p>

        <form
          id="subscription-form"
          noValidate
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-6 md:grid-cols-2"
        >
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-300">{t("subscriptions.serviceName")}</span>
            <input
              type="text"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Netflix"
              required
              className={fieldClassName}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-300">
              {t("subscriptions.amount", { symbol: getCurrencySymbol(currency) })}
            </span>
            <span className="relative block">
              <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-medium text-emerald-400 select-none">
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
                className={`${fieldClassName} pl-12`}
              />
            </span>
            {amountError ? <span className="text-sm text-red-400">{amountError}</span> : null}
          </label>

          <div className="flex flex-col gap-2">
            <span id="subscription-cycle-label" className="text-sm font-medium text-zinc-300">
              {t("subscriptions.cycle")}
            </span>
            <AppSelect
              name="cycle"
              value={cycle}
              onChange={(next) => setCycle(next as BillingCycle)}
              ariaLabelledBy="subscription-cycle-label"
              options={[
                { value: "monthly", label: t("subscriptions.cycleMonthly") },
                { value: "yearly", label: t("subscriptions.cycleYearly") },
              ]}
              buttonClassName="flex h-12 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-left text-sm text-zinc-100 outline-none transition-colors duration-200 hover:border-zinc-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-300">{t("subscriptions.subscribedAt")}</span>
            <CustomDatePicker
              name="subscribedAt"
              selected={subscribedAt}
              onChange={setSubscribedAt}
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-300">
              {subscription ? t("subscriptions.nextDue") : t("subscriptions.firstDue")}
            </span>
            <CustomDatePicker
              name="nextDue"
              selected={nextDue}
              onChange={setNextDue}
              required
            />
          </label>

          <div className="flex flex-col gap-2">
            <span id="subscription-payment-label" className="text-sm font-medium text-zinc-300">
              {t("subscriptions.paymentMethod")}
            </span>
            <AppSelect
              name="payment"
              value={payment}
              onChange={(next) => setPayment(next as PaymentMethod)}
              ariaLabelledBy="subscription-payment-label"
              options={[
                { value: "credit", label: t("subscriptions.paymentCredit") },
                { value: "pix", label: t("subscriptions.paymentPix") },
                { value: "boleto", label: t("subscriptions.paymentBoleto") },
              ]}
              buttonClassName="flex h-12 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-left text-sm text-zinc-100 outline-none transition-colors duration-200 hover:border-zinc-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {submitError ? (
            <p className="col-span-1 text-sm text-red-400 md:col-span-2" role="alert">
              {submitError}
            </p>
          ) : null}

          <div className="col-span-1 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end md:col-span-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-12 rounded-xl border border-zinc-800 px-5 text-sm font-semibold text-zinc-300 transition-colors duration-200 hover:bg-zinc-900 disabled:opacity-60"
            >
              {t("subscriptions.cancel")}
            </button>
            <button
              type="submit"
              form="subscription-form"
              onClick={handleSaveClick}
              disabled={isSubmitting}
              className="h-12 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-emerald-500 disabled:opacity-60"
            >
              {isSubmitting
                ? t("subscriptions.saving")
                : subscription
                  ? t("subscriptions.saveChanges")
                  : t("subscriptions.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

