export function getCurrencyLocale(currency: string) {
  if (currency === "USD") return "en-US";
  if (currency === "EUR") return "de-DE";
  return "pt-BR";
}

export const formatCurrency = (
  value: number,
  currency: string = "BRL",
  privacyMode: boolean = false,
) => {
  if (privacyMode) return "••••••";
  return new Intl.NumberFormat(getCurrencyLocale(currency), {
    style: "currency",
    currency,
  }).format(value);
};

export const getCurrencySymbol = (currency: string) => {
  if (currency === "USD") return "$";
  if (currency === "EUR") return "€";
  return "R$";
};

export const formatCurrencyInput = (value: string | number, currency: string = "BRL"): string => {
  const cleanDigits = String(value).replace(/\D/g, "");
  if (!cleanDigits) return currency === "USD" ? "0.00" : "0,00";
  const numberValue = Number(cleanDigits) / 100;
  return new Intl.NumberFormat(getCurrencyLocale(currency), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numberValue);
};

export const parseCurrencyToNumber = (formattedValue: string): number => {
  const cleanDigits = String(formattedValue).replace(/\D/g, "");
  return Number(cleanDigits) / 100 || 0;
};
