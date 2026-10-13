export const formatCurrencyInput = (value: string | number): string => {
  const cleanDigits = String(value).replace(/\D/g, "");
  if (!cleanDigits) return "0,00";
  const numberValue = Number(cleanDigits) / 100;
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numberValue);
};

export const parseCurrencyToNumber = (formattedValue: string): number => {
  const cleanDigits = String(formattedValue).replace(/\D/g, "");
  return Number(cleanDigits) / 100 || 0;
};
