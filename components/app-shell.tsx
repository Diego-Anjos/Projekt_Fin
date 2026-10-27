"use client";

import { AppHeader } from "@/components/app-header";
import { Sidebar } from "@/components/sidebar";
import { AiCommandBar } from "@/components/ui/ai-command-bar";
import { QuantumIaProvider } from "@/contexts/quantum-ia-context";
import { useTranslation } from "@/hooks/use-translation";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <QuantumIaProvider>
      <div className="flex h-dvh w-full min-w-0 overflow-x-hidden bg-transparent text-zinc-100">
        {menuOpen ? (
          <button
            type="button"
            aria-label={t("common.closeMenu")}
            className="fixed inset-0 z-30 bg-black/60 md:hidden"
            onClick={() => setMenuOpen(false)}
          />
        ) : null}
        <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader onOpenMenu={() => setMenuOpen(true)} />
          <AiCommandBar />
          <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pt-4 pb-28 md:px-8 md:pt-8 md:pb-8 lg:px-10 lg:pt-10">
            {children}
          </div>
        </div>
      </div>
    </QuantumIaProvider>
  );
}
