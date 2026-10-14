"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";

export function AiCommandBar() {
  const [query, setQuery] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    setQuery("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="fixed bottom-8 left-1/2 z-50 flex w-[90%] max-w-lg -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/60 py-2 pr-2 pl-4 shadow-[0_0_40px_-10px_rgba(16,185,129,0.15)] backdrop-blur-xl"
    >
      <Sparkles className="size-4 shrink-0 text-emerald-400" aria-hidden="true" />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        type="text"
        placeholder="Pergunte ao Projekt Fin ou registre um gasto..."
        aria-label="Pergunte ao Projekt Fin ou registre um gasto"
        className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
      />
      <button
        type="submit"
        aria-label="Enviar"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition-colors hover:bg-emerald-500"
      >
        <ArrowRight className="size-4" aria-hidden="true" />
      </button>
    </form>
  );
}
