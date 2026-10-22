"use client";

import { useState } from "react";
import { useSession } from "@/components/require-session";
import { useTranslation } from "@/hooks/use-translation";

export function DashboardSessionBar() {
  const { user, logout } = useSession();
  const { t } = useTranslation();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    setError("");
    setSigningOut(true);

    try {
      await logout();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("dashboard.signOutError");
      setError(message);
      setSigningOut(false);
    }
  }

  const displayName = user.name.trim() || user.email;

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-emerald-900/70 bg-[#041610] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
          {t("dashboard.title")}
        </h1>
        <p className="mt-1 truncate text-sm text-emerald-100/80">
          {t("dashboard.welcome", { name: displayName })}
        </p>
      </div>
      <div className="flex flex-col items-start gap-2 sm:items-end">
        <button
          type="button"
          onClick={handleLogout}
          disabled={signingOut}
          className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {signingOut ? t("dashboard.signingOut") : t("dashboard.signOut")}
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </section>
  );
}
