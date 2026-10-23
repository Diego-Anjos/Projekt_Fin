import { addMonths } from "date-fns";

export const MIN_INSTALLMENTS = 2;
export const MAX_INSTALLMENTS = 60;

/** Data de calendário local, sem deslocar o dia por causa do fuso. */
export function toLocalCalendarDate(value: string | null | undefined) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? "");
  if (!match) return new Date();

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return new Date();
  }

  return date;
}

export function toUtcCalendarIso(date: Date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString();
}

/** Soma `monthOffset` meses à data inicial e devolve o ISO de calendário. */
export function addInstallmentMonths(start: string | null | undefined, monthOffset: number) {
  return toUtcCalendarIso(addMonths(toLocalCalendarDate(start), monthOffset));
}

/**
 * Divide o valor total em centavos. A última parcela absorve o resto
 * para a soma fechar exatamente o total.
 */
export function splitInstallmentAmounts(total: number, count: number) {
  if (!Number.isInteger(count) || count < 1) return [];

  const totalCents = Math.round(Number(total) * 100);
  if (!Number.isFinite(totalCents)) return [];

  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;

  return Array.from({ length: count }, (_, index) => {
    const cents = base + (index === count - 1 ? remainder : 0);
    return cents / 100;
  });
}

export function formatInstallmentDescription(
  description: string,
  installmentNumber?: number | null,
  totalInstallments?: number | null,
) {
  const total = Number(totalInstallments);
  const current = Number(installmentNumber);

  if (!Number.isInteger(total) || total <= 1 || !Number.isInteger(current) || current < 1) {
    return description;
  }

  return `${description} (${current}/${total})`;
}
