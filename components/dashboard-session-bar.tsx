"use client";

import { useState } from "react";
import { useSession } from "@/components/require-session";

export function DashboardSessionBar() {
  const { user, logout } = useSession();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    setError("");
    setSigningOut(true);

    try {
      await logout();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Não foi possível terminar a sessão.";
      setError(message);
      setSigningOut(false);
    }
  }

  const displayName = user.name.trim() || user.email;

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-emerald-900/70 bg-[#041610] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-emerald-100/80">
          Bem-vindo de volta, {displayName}!
        </p>
      </div>
      <div className="flex flex-col items-start gap-2 sm:items-end">
        <button
          type="button"
          onClick={handleLogout}
          disabled={signingOut}
          className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {signingOut ? "A terminar..." : "Terminar Sessão"}
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </section>
  );
}
