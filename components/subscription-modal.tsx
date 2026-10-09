"use client";

import { useSession } from "@/components/require-session";
import { createSubscription } from "@/lib/appwrite/database";
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

function parseAmount(value: string) {
  const normalized = value.trim().replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : Number.NaN;
}

function collectValidationErrors(form: HTMLFormElement) {
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
    errors[element.name] = element.validationMessage || "Campo inválido.";
  }

  return errors;
}

type SubscriptionModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (subscription: ServiceSubscription) => void;
};

export function SubscriptionModal({ open, onClose, onSave }: SubscriptionModalProps) {
  if (!open) return null;

  return <SubscriptionModalForm onClose={onClose} onSave={onSave} />;
}

function SubscriptionModalForm({ onClose, onSave }: Omit<SubscriptionModalProps, "open">) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [subscribedAt, setSubscribedAt] = useState("");
  const [nextDue, setNextDue] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("credit");
  const [amountError, setAmountError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useSession();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
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

    const errors = collectValidationErrors(event.currentTarget);
    const parsedAmount = parseAmount(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      errors.amount = "Informe um valor maior que zero.";
    }

    if (Object.keys(errors).length > 0) {
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
      subscribedAt,
      nextDue,
      payment,
      status: "active" as const,
    };

    try {
      setIsSubmitting(true);
      setSubmitError("");

      if (!user || !user.$id) {
        console.error("❌ ERRO: O utilizador não está logado no momento do clique!");
        setSubmitError("Sessão em falta. Entre novamente e tente salvar.");
        return;
      }

      const dataToSend = {
        ...formData,
        userId: user.$id,
      };

      console.log("A. Dados do formulário prontos:", dataToSend);
      const response = await createSubscription(dataToSend);
      console.log("B. Função createSubscription retornou com sucesso!");

      onSave({
        ...formData,
        id: response.$id,
      });
      onClose();
    } catch (error) {
      console.error("❌ C. ERRO CAPTURADO NO MODAL:", error);
      const message = error instanceof Error ? error.message : "Falha ao salvar a assinatura.";
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
        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-6 md:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 rounded-lg p-2 text-zinc-400 transition-colors duration-200 hover:bg-zinc-800 hover:text-zinc-100"
        >
          <X className="size-5" aria-hidden="true" />
        </button>

        <h2 id="subscription-modal-title" className="pr-10 text-xl font-semibold text-zinc-50">
          Nova Assinatura
        </h2>
        <p className="mt-1 mb-6 text-sm text-zinc-400">Cadastre um serviço recorrente</p>

        <form
          id="subscription-form"
          noValidate
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-6 md:grid-cols-2"
        >
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-300">Nome do Serviço</span>
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
            <span className="text-sm font-medium text-zinc-300">Valor (R$)</span>
            <input
              type="text"
              name="amount"
              inputMode="decimal"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setAmountError("");
              }}
              placeholder="0,00"
              required
              aria-invalid={amountError ? true : undefined}
              className={fieldClassName}
            />
            {amountError ? <span className="text-sm text-red-400">{amountError}</span> : null}
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-300">Ciclo de Cobrança</span>
            <select
              name="cycle"
              value={cycle}
              onChange={(event) => setCycle(event.target.value as BillingCycle)}
              required
              className={`${fieldClassName} [color-scheme:dark]`}
            >
              <option value="monthly">Mensal</option>
              <option value="yearly">Anual</option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-300">Data da Inscrição</span>
            <input
              type="date"
              name="subscribedAt"
              value={subscribedAt}
              onChange={(event) => setSubscribedAt(event.target.value)}
              required
              className={`${fieldClassName} [color-scheme:dark]`}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-300">Primeiro Vencimento</span>
            <input
              type="date"
              name="nextDue"
              value={nextDue}
              onChange={(event) => setNextDue(event.target.value)}
              required
              className={`${fieldClassName} [color-scheme:dark]`}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-300">Forma de Pagamento</span>
            <select
              name="payment"
              value={payment}
              onChange={(event) => setPayment(event.target.value as PaymentMethod)}
              required
              className={`${fieldClassName} [color-scheme:dark]`}
            >
              <option value="credit">Cartão de Crédito</option>
              <option value="pix">PIX</option>
              <option value="boleto">Boleto</option>
            </select>
          </label>

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
              Cancelar
            </button>
            <button
              type="submit"
              form="subscription-form"
              onClick={handleSaveClick}
              disabled={isSubmitting}
              className="h-12 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-emerald-500 disabled:opacity-60"
            >
              {isSubmitting ? "A guardar..." : "Salvar Assinatura"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

