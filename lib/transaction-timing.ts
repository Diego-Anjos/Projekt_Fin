import { endOfMonth, isAfter, isSameMonth, isSameYear } from "date-fns";
import { toLocalCalendarDate } from "@/lib/installments";

/** Interpreta a data da transação como calendário local (YYYY-MM-DD). */
export function transactionCalendarDate(value: string) {
  return toLocalCalendarDate(value);
}

export function isCurrentMonthTransaction(dateValue: string, now = new Date()) {
  const date = transactionCalendarDate(dateValue);
  return isSameMonth(date, now) && isSameYear(date, now);
}

/** Inclui o mês corrente inteiro; exclui meses posteriores. */
export function isOnOrBeforeCurrentMonthEnd(dateValue: string, now = new Date()) {
  const date = transactionCalendarDate(dateValue);
  return date.getTime() <= endOfMonth(now).getTime();
}

/**
 * Parcela (ou qualquer lançamento) ainda não vencido no calendário:
 * data depois do fim do mês atual e status Pendente.
 * Estes não devem reduzir o património de hoje.
 */
export function isFuturePendingTransaction(
  dateValue: string,
  status: string | null | undefined,
  now = new Date(),
) {
  if (status !== "Pending") return false;
  return isAfter(transactionCalendarDate(dateValue), endOfMonth(now));
}
