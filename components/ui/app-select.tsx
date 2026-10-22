"use client";

import { useTranslation } from "@/hooks/use-translation";
import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

export type AppSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

/**
 * Seletor customizado (listbox) partilhado por toda a aplicação —
 * filtros ("Todos os meses", "Todos os status", …), formulários e o
 * seletor de modelo de IA (`AiModelSelect` é um wrapper deste componente).
 *
 * Um <select> nativo renderiza a lista de opções através do sistema
 * operativo/browser, ignorando as classes dos <option> no Chromium/Windows
 * (daí o destaque azul padrão). Esta listbox é HTML nosso, por isso o
 * tema é sempre o mesmo:
 * - Menu: `bg-zinc-900` (sobre `bg-[#09090b]`), `border-zinc-800`, sombra.
 * - Item em hover/focus (highlight): `bg-zinc-800` — nunca azul nativo.
 * - Item selecionado: `text-emerald-400` com ícone Check.
 *
 * Como segurança extra, `app/globals.css` também estiliza qualquer
 * <select>/<option> nativo remanescente (Firefox respeita `option`,
 * Chromium/Windows não — daí preferirmos sempre este componente).
 */
export function AppSelect({
  options,
  value,
  onChange,
  disabled = false,
  placeholder,
  ariaLabel,
  ariaLabelledBy,
  id,
  name,
  className = "",
  buttonClassName,
  menuClassName,
}: {
  options: readonly AppSelectOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  id?: string;
  /** Se presente, renderiza um input hidden para integração com <form>. */
  name?: string;
  /** Classes do contentor (largura/posição). */
  className?: string;
  /** Substitui o tema por omissão do botão (mantém a estrutura base). */
  buttonClassName?: string;
  /** Classes extra do menu (largura/alinhamento). Por omissão: `left-0 w-full`. */
  menuClassName?: string;
} ) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;
  const highlightedOption = options[highlightedIndex];

  // Fecha ao clicar fora do seletor.
  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open ]);

  function firstEnabledIndex() {
    return Math.max(
      0,
      options.findIndex((option) => !option.disabled),
    );
  }

  function openMenu() {
    if (disabled) return;
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : firstEnabledIndex());
    setOpen(true);
  }

  function selectOption(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function moveHighlight(direction: 1 | -1) {
    if (options.length === 0) return;
    setHighlightedIndex((current) => {
      let next = current;
      for (let step = 0; step < options.length; step += 1) {
        next = (next + direction + options.length) % options.length;
        if (!options[next]?.disabled) break;
      }
      return next;
    });
  }

  function highlightEdge(edge: "first" | "last") {
    if (options.length === 0) return;
    if (edge === "first") {
      setHighlightedIndex(firstEnabledIndex());
      return;
    }
    for (let index = options.length - 1; index >= 0; index -= 1) {
      if (!options[index]?.disabled) {
        setHighlightedIndex(index);
        return;
      }
    }
  }

  /** Typeahead: salta para a próxima opção que começa pela tecla premida. */
  function typeahead(key: string) {
    const typed = key.toLowerCase();
    for (let step = 1; step <= options.length; step += 1) {
      const index = (highlightedIndex + step) % options.length;
      const option = options[index];
      if (option && !option.disabled && option.label.toLowerCase().startsWith(typed)) {
        setHighlightedIndex(index);
        return;
      }
    }
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
      }
      return;
    }

    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openMenu();
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveHighlight(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveHighlight(-1);
        break;
      case "Home":
        event.preventDefault();
        highlightEdge("first");
        break;
      case "End":
        event.preventDefault();
        highlightEdge("last");
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        selectOption(highlightedIndex);
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          typeahead(event.key);
        }
        break;
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`} onKeyDown={handleKeyDown}>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <button
        ref={buttonRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={(event) => {
          // Não borbulhar: painéis ancestrais com click-outside não devem
          // interpretar abrir o menu como interação externa.
          event.stopPropagation();
          if (open) setOpen(false);
          else openMenu();
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className={
          buttonClassName ??
          "flex h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-left text-sm text-zinc-100 outline-none transition-colors duration-200 hover:border-zinc-700 hover:bg-zinc-800/60 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        }
      >
        <span className={`min-w-0 truncate ${selected ? "" : "text-zinc-500"}`}>
          {selected?.label ?? placeholder ?? t("common.selectPlaceholder")}
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-zinc-500 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-activedescendant={
            highlightedOption ? `${listboxId}-${highlightedIndex}` : undefined
          }
          className={`absolute top-full z-50 mt-2 max-h-60 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900 p-1 shadow-2xl shadow-black/60 outline-none ${
            menuClassName ?? "left-0 w-full min-w-40"
          }`}
        >
          {options.length === 0 ? (
            <li className="px-3 py-2 text-sm text-zinc-500">{t("common.noOptions")}</li>
          ) : (
            options.map((option, index) => {
              const isSelected = option.value === value;
              const isHighlighted = index === highlightedIndex;

              return (
                <li
                  key={option.value}
                  id={`${listboxId}-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled || undefined}
                  onMouseEnter={() => {
                    if (!option.disabled) setHighlightedIndex(index);
                  }}
                  onClick={(event) => {
                    // Crítico: selectOption fecha o menu e desmonta este
                    // <li>; sem stopPropagation, o click continua até ao
                    // document com o alvo já destacado e listeners de
                    // click-outside de painéis ancestrais (ex.: chat de IA)
                    // fechavam o painel inteiro a seguir à seleção.
                    event.stopPropagation();
                    selectOption(index);
                  }}
                  className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isHighlighted ? "bg-zinc-800" : "bg-transparent"
                  } ${
                    isSelected
                      ? "font-medium text-emerald-400"
                      : isHighlighted
                        ? "text-zinc-100"
                        : "text-zinc-300"
                  } ${option.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                >
                  <span className="min-w-0 truncate">{option.label}</span>
                  {isSelected ? (
                    <Check className="size-4 shrink-0 text-emerald-400" aria-hidden="true" />
                  ) : null}
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
