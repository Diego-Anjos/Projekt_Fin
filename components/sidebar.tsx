"use client";

import {
  Bell,
  CandlestickChart,
  ChartColumn,
  Layers,
  LayoutGrid,
  Lightbulb,
  Newspaper,
  Settings,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

const navItems: { labelKey: string; href: string; icon: LucideIcon }[] = [
  { labelKey: "sidebar.marketHub", href: "/", icon: LayoutGrid },
  { labelKey: "sidebar.purchases", href: "/compras", icon: ShoppingBag },
  { labelKey: "sidebar.subscriptions", href: "/subscriptions", icon: Layers },
  { labelKey: "sidebar.cashFlow", href: "/cash-flow", icon: ChartColumn },
  { labelKey: "sidebar.investments", href: "/investimentos", icon: CandlestickChart },
  { labelKey: "sidebar.news", href: "/noticias", icon: Newspaper },
  { labelKey: "sidebar.settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <aside
      aria-label="Barra lateral"
      className="flex h-full w-[260px] shrink-0 flex-col border-r border-zinc-800 bg-[#041610]"
    >
      <div className="px-5 pt-6 pb-5">
        <Link href="/" className="block w-40">
          <Image
            src="/Logotipo Projekt Fin em fundo transparente.png"
            alt="Logo Projekt Fin"
            width={1774}
            height={887}
            className="h-auto w-full object-contain"
            style={{ width: "100%", height: "auto" }}
            priority
          />
        </Link>
      </div>

      <div className="mx-4 mb-6 flex items-center gap-3 rounded-xl border border-[#113829] bg-[#0a241a] px-3 py-2.5">
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white"
          aria-hidden="true"
        >
          EM
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-100">Ethan Miller</p>
          <p className="text-xs text-zinc-400">Active</p>
        </div>
        <button
          type="button"
          aria-label="Notificações"
          className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
        >
          <Bell className="size-4" aria-hidden="true" />
        </button>
      </div>

      <nav aria-label="Menu principal" className="min-h-0 flex-1 overflow-y-auto px-3">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isCurrent = pathname === item.href;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isCurrent ? "page" : undefined}
                  className={
                    isCurrent
                      ? "flex items-center gap-3 rounded-lg bg-[#0d2d20] px-3 py-2.5 text-sm text-zinc-100"
                      : "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-400 transition-colors hover:bg-[#071c14] hover:text-emerald-400"
                  }
                >
                  <item.icon className="size-4 shrink-0" aria-hidden="true" />
                  {t(item.labelKey)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="m-4 rounded-xl border border-[#113829] bg-[#0a241a] p-4">
        <div className="mb-2 flex items-center gap-2">
          <Lightbulb className="size-4 text-emerald-500" aria-hidden="true" />
          <p className="text-sm font-semibold text-zinc-100">Daily Tip:</p>
        </div>
        <p className="text-sm leading-5 text-zinc-400">
          Consolidate your subscriptions to save money this month.
        </p>
      </div>
    </aside>
  );
}
