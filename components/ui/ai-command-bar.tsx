"use client";

import { ArrowRight, DollarSign } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

export function AiCommandBar() {
  const [query, setQuery] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [iconFailed, setIconFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isExpanded) {
      inputRef.current?.blur();
      return;
    }

    inputRef.current?.focus();
  }, [isExpanded]);

  useEffect(() => {
    if (!isExpanded) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsExpanded(false);
      }
    }

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isExpanded]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    setQuery("");
  }

  return (
    <div
      className={`pointer-events-none fixed z-20 flex ${
        isExpanded
          ? "inset-x-0 bottom-4 justify-center md:bottom-8"
          : "right-4 bottom-4 justify-end md:right-8 md:bottom-8"
      }`}
    >
      <div
        ref={containerRef}
        aria-expanded={isExpanded}
        className={`pointer-events-auto relative transition-all duration-500 ease-in-out ${
          isExpanded ? "w-[95%] max-w-lg md:max-w-2xl" : "w-14"
        }`}
      >
        <form
          onSubmit={handleSubmit}
          onClick={() => {
            if (!isExpanded) setIsExpanded(true);
          }}
          className={`relative flex h-14 w-full items-center rounded-full border border-emerald-500/40 bg-[#0a0f0d]/90 backdrop-blur-xl transition-all duration-500 ease-in-out ${
            isExpanded
              ? "gap-2 pr-2 pl-24 shadow-[0_0_28px_rgba(16,185,129,0.22)] md:pl-28 lg:pl-32"
              : "cursor-pointer justify-center hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          }`}
        >
          {iconFailed ? (
            <DollarSign
              aria-label="AI Command"
              className="h-8 w-8 shrink-0 cursor-pointer text-emerald-400 transition-all hover:scale-110"
              onClick={(event) => {
                event.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            />
          ) : (
            <img
              src="/projekt-fin-robo-aura-verde.gif"
              alt="AI Command"
              draggable={false}
              className={`pointer-events-auto absolute z-10 h-20 w-20 max-w-none cursor-pointer object-contain mix-blend-screen transition-transform duration-300 hover:scale-105 md:h-28 md:w-28 lg:h-32 lg:w-32 ${
                isExpanded
                  ? "top-1/2 left-10 -translate-x-1/2 -translate-y-1/2 md:left-8 md:-translate-y-[55%]"
                  : "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 md:-translate-y-[55%]"
              }`}
              onClick={(event) => {
                event.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              onError={() => setIconFailed(true)}
            />
          )}

          <div
            className={`grid min-w-0 overflow-hidden transition-[grid-template-columns] duration-500 ease-in-out ${
              isExpanded ? "flex-1 grid-cols-[1fr]" : "w-0 grid-cols-[0fr]"
            }`}
          >
            <div
              className={`flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap transition-opacity ease-in-out ${
                isExpanded
                  ? "opacity-100 delay-200 duration-300"
                  : "pointer-events-none opacity-0 duration-150"
              }`}
            >
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                type="text"
                placeholder="Pergunte ao Projekt Fin ou registre um gasto..."
                aria-label="Pergunte ao Projekt Fin ou registre um gasto"
                tabIndex={isExpanded ? 0 : -1}
                className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
              />
              <button
                type="submit"
                aria-label="Enviar"
                tabIndex={isExpanded ? 0 : -1}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition-colors hover:bg-emerald-500"
              >
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
