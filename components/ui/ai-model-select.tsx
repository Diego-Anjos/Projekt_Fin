"use client";

import { AppSelect } from "@/components/ui/app-select";

export type AiModelOption = {
  id: string;
  label: string;
};

/**
 * Seletor de modelo de IA — wrapper de `AppSelect` com a variante "pill"
 * (arredondada/translúcida) do cabeçalho do chat.
 *
 * A listbox é a mesma de todos os filtros da aplicação (ver `AppSelect`):
 * menu `bg-zinc-900`/`border-zinc-800`, item em hover/focus `bg-zinc-800`
 * e item selecionado `text-emerald-400` — sem o destaque azul nativo
 * que um <select> teria no Chromium/Windows.
 */
export function AiModelSelect({
  models,
  value,
  onChange,
  disabled = false,
}: {
  models: readonly AiModelOption[];
  value: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
}) {
  const selected = models.find((model) => model.id === value);

  return (
    // stopPropagation: os cliques de abrir/selecionar modelo nunca devem
    // borbulhar para listeners de "fechar ao clicar fora" de painéis
    // ancestrais (o painel do chat fecha nesses handlers). Sem
    // preventDefault, por isso abrir/escolher continua a funcionar.
    <div
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
    <AppSelect
      options={models.map((model) => ({ value: model.id, label: model.label }))}
      value={value}
      onChange={onChange}
      disabled={disabled}
      ariaLabel={`Modelo de IA: ${selected?.label ?? ""}`}
      buttonClassName="flex cursor-pointer items-center gap-1.5 rounded-full border border-emerald-500/20 bg-white/5 py-1.5 pr-3 pl-3 text-xs font-medium whitespace-nowrap text-emerald-100 outline-none backdrop-blur-sm transition-colors hover:border-emerald-500/40 hover:bg-white/10 focus:border-emerald-500/50 focus-visible:border-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
      menuClassName="left-1/2 w-44 -translate-x-1/2 sm:left-0 sm:translate-x-0"
    />
    </div>
  );
}
