"use client";

import {
  CandlestickChart,
  ChartColumn,
  Layers,
  LayoutGrid,
  Lightbulb,
  Newspaper,
  Settings,
  ShoppingBag,
  Target,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationBell } from "@/components/notification-bell";
import { useSession } from "@/components/require-session";
import { useTranslation } from "@/hooks/use-translation";

const navItems: { labelKey: string; href: string; icon: LucideIcon }[] = [
  { labelKey: "sidebar.marketHub", href: "/dashboard", icon: LayoutGrid },
  { labelKey: "sidebar.purchases", href: "/compras", icon: ShoppingBag },
  { labelKey: "sidebar.subscriptions", href: "/subscriptions", icon: Layers },
  { labelKey: "sidebar.cashFlow", href: "/cash-flow", icon: ChartColumn },
  { labelKey: "sidebar.goals", href: "/metas", icon: Target },
  { labelKey: "sidebar.investments", href: "/investimentos", icon: CandlestickChart },
  { labelKey: "sidebar.news", href: "/noticias", icon: Newspaper },
  { labelKey: "sidebar.settings", href: "/settings", icon: Settings },
];

function getInitials(name: string, email: string) {
  const source = name.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

export function Sidebar({
  open = false,
  onNavigate,
}: {
  open?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { user } = useSession();
  const displayName = user.name.trim() || user.email;
  const initials = getInitials(user.name, user.email);
  const avatarUrl = typeof user.prefs.avatarUrl === "string" ? user.prefs.avatarUrl : "";

  return (
    <aside
      aria-label={t("sidebar.sidebar")}
      className={`flex h-full w-[260px] shrink-0 flex-col border-r border-zinc-800 bg-[#041610] max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-40 max-md:transition-transform max-md:duration-300 ${
        open ? "max-md:translate-x-0" : "max-md:-translate-x-full"
      }`}
    >
      <div className="px-5 pt-6 pb-5">
        <Link href="/dashboard" onClick={onNavigate} className="block w-40">
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

      <div className="mx-4 mb-6 flex items-center gap-4 rounded-xl border border-[#113829] bg-[#0a241a] px-3 py-2.5">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-emerald-500/20 bg-emerald-600 text-sm font-semibold text-white"
          aria-hidden="true"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-100">{displayName}</p>
          <p className="text-xs text-zinc-400">{t("sidebar.active")}</p>
        </div>
        <NotificationBell />
      </div>

      <nav aria-label={t("sidebar.mainMenu")} className="min-h-0 flex-1 overflow-y-auto px-3">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isCurrent = pathname === item.href;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
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
          <p className="text-sm font-semibold text-zinc-100">{t("sidebar.dailyTip")}</p>
        </div>
        <p className="text-sm leading-5 text-zinc-400">{t("sidebar.dailyTipText")}</p>
      </div>
    </aside>
  );
}
