"use client";

import { Bell, Download, Plus, Tags, Trash2, UserRound, Wallet } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";

type SettingsTab = "perfil" | "preferencias" | "categorias" | "notificacoes" | "dados";

const tabs: { id: SettingsTab; label: string; icon: typeof UserRound }[] = [
  { id: "perfil", label: "Perfil", icon: UserRound },
  { id: "preferencias", label: "Preferências", icon: Wallet },
  { id: "categorias", label: "Categorias", icon: Tags },
  { id: "notificacoes", label: "Notificações", icon: Bell },
  { id: "dados", label: "Dados e Exportação", icon: Download },
];

const fieldClassName =
  "h-11 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none transition-colors duration-200 placeholder:text-zinc-500 [color-scheme:dark] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";

const initialCategories = ["Alimentação", "Transporte"];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("perfil");

  return (
    <div className="flex w-full flex-col gap-6 px-6 py-8">
      <header className="rounded-2xl border border-emerald-950/80 bg-gradient-to-r from-[#041610] to-[#0a241a] px-6 py-5">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-50 sm:text-2xl">
          Configurações
        </h1>
        <p className="mt-1.5 text-sm text-emerald-100/70">
          Faça a gestão da sua conta e preferências do sistema
        </p>
      </header>

      <div className="flex flex-col gap-8 md:flex-row">
        <nav aria-label="Secções de configurações" className="w-full shrink-0 md:w-[250px]">
          <ul className="flex flex-col gap-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;

              return (
                <li key={tab.id}>
                  <button
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    aria-current={isActive ? "page" : undefined}
                    className={
                      isActive
                        ? "flex w-full items-center gap-3 rounded-lg bg-zinc-800/50 px-3 py-2.5 text-left text-sm font-medium text-emerald-500 transition-colors duration-200"
                        : "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-zinc-400 transition-colors duration-200 hover:text-zinc-200"
                    }
                  >
                    <tab.icon className="size-4 shrink-0" aria-hidden="true" />
                    {tab.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <section className="min-w-0 flex-1 rounded-xl border border-zinc-700/50 bg-black p-6">
          <div className={activeTab === "perfil" ? undefined : "hidden"}>
            <ProfilePanel />
          </div>
          <div className={activeTab === "preferencias" ? undefined : "hidden"}>
            <PreferencesPanel />
          </div>
          <div className={activeTab === "categorias" ? undefined : "hidden"}>
            <CategoriesPanel />
          </div>
          <div className={activeTab === "notificacoes" ? undefined : "hidden"}>
            <NotificationsPanel />
          </div>
          <div className={activeTab === "dados" ? undefined : "hidden"}>
            <DataPanel />
          </div>
        </section>
      </div>
    </div>
  );
}

function ProfilePanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("Ethan Miller");
  const [email, setEmail] = useState("ethan.miller@projektfin.com");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  function handleAvatarChange(file: File | undefined) {
    if (!file) return;
    const nextUrl = URL.createObjectURL(file);
    setAvatarUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return nextUrl;
    });
    setSaved(false);
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(true);
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-50">Perfil</h2>
        <p className="mt-1 text-sm text-zinc-400">Atualize os dados visíveis da sua conta.</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-600 text-lg font-semibold text-white">
          {avatarUrl ? (
            // Blob previews cannot go through the Next image optimizer.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="size-full object-cover" />
          ) : (
            <span aria-hidden="true">{initials || "EM"}</span>
          )}
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => handleAvatarChange(event.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 px-4 text-sm font-medium text-zinc-100 transition-colors duration-200 hover:border-zinc-600 hover:bg-zinc-800"
          >
            Alterar avatar
          </button>
          <p className="mt-2 text-xs text-zinc-500">PNG ou JPG, até alguns MB.</p>
        </div>
      </div>

      <label className="flex flex-col gap-1.5 text-sm text-zinc-300">
        Nome
        <input
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setSaved(false);
          }}
          autoComplete="name"
          className={fieldClassName}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm text-zinc-300">
        Email
        <input
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setSaved(false);
          }}
          autoComplete="email"
          className={fieldClassName}
        />
      </label>

      <div className="flex flex-col items-start gap-3 border-t border-zinc-800 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-emerald-400" role="status">
          {saved ? "Alterações guardadas." : ""}
        </p>
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-emerald-500"
        >
          Guardar Alterações
        </button>
      </div>
    </form>
  );
}

function PreferencesPanel() {
  const [currency, setCurrency] = useState("BRL");
  const [hideBalances, setHideBalances] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-50">Preferências</h2>
        <p className="mt-1 text-sm text-zinc-400">Defina como os valores aparecem no gestor.</p>
      </div>

      <label className="flex flex-col gap-1.5 text-sm text-zinc-300">
        Moeda Principal
        <select
          value={currency}
          onChange={(event) => setCurrency(event.target.value)}
          className={fieldClassName}
        >
          <option value="BRL">BRL — Real brasileiro</option>
          <option value="EUR">EUR — Euro</option>
          <option value="USD">USD — Dólar americano</option>
        </select>
      </label>

      <div className="flex items-center justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-zinc-100">Modo de Privacidade (Ocultar saldos)</p>
          <p className="mt-1 text-xs text-zinc-500">
            {hideBalances ? "Os saldos estão ocultos." : "Os saldos estão visíveis."}
          </p>
        </div>
        <Toggle
          checked={hideBalances}
          onChange={setHideBalances}
          label="Modo de Privacidade (Ocultar saldos)"
        />
      </div>
    </div>
  );
}

function CategoriesPanel() {
  const [categories, setCategories] = useState(initialCategories);
  const [draft, setDraft] = useState("");

  function addCategory() {
    const name = draft.trim();
    if (!name) return;
    setCategories((current) => [...current, name]);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-50">Categorias</h2>
        <p className="mt-1 text-sm text-zinc-400">Organize receitas e despesas por tipo.</p>
      </div>

      <ul className="flex flex-col gap-2">
        {categories.map((category) => (
          <li
            key={category}
            className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100"
          >
            {category}
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="new-category">
          Nome da nova categoria
        </label>
        <input
          id="new-category"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addCategory();
            }
          }}
          placeholder="Nome da categoria"
          className={fieldClassName}
        />
        <button
          type="button"
          onClick={addCategory}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-emerald-500"
        >
          <Plus className="size-4" aria-hidden="true" />
          Nova Categoria
        </button>
      </div>
    </div>
  );
}

function NotificationsPanel() {
  const [dueAlerts, setDueAlerts] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-50">Notificações</h2>
        <p className="mt-1 text-sm text-zinc-400">Escolha quais alertas quer receber.</p>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-zinc-100">Alertas de vencimento</p>
          <p className="mt-1 text-xs text-zinc-500">Avisos antes de contas e assinaturas vencerem.</p>
        </div>
        <Toggle checked={dueAlerts} onChange={setDueAlerts} label="Alertas de vencimento" />
      </div>

      <div className="flex items-center justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-zinc-100">Resumo semanal</p>
          <p className="mt-1 text-xs text-zinc-500">Um email com o fluxo de caixa da semana.</p>
        </div>
        <Toggle checked={weeklySummary} onChange={setWeeklySummary} label="Resumo semanal" />
      </div>
    </div>
  );
}

function DataPanel() {
  function exportCsv() {
    const rows = [
      ["tipo", "descricao", "valor"],
      ["receita", "Salário", "8500.00"],
      ["despesa", "Alimentação", "1550.00"],
      ["despesa", "Transporte", "930.00"],
    ];
    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "projekt-fin-export.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-50">Dados e Exportação</h2>
        <p className="mt-1 text-sm text-zinc-400">Exporte um resumo ou encerre a conta.</p>
      </div>

      <button
        type="button"
        onClick={exportCsv}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 text-sm font-semibold text-zinc-100 transition-colors duration-200 hover:border-zinc-600 hover:bg-zinc-800"
      >
        <Download className="size-4" aria-hidden="true" />
        Exportar dados (CSV)
      </button>

      <div className="rounded-xl border border-red-900/50 p-5">
        <h3 className="text-sm font-semibold text-red-300">Zona de risco</h3>
        <p className="mt-1 text-sm text-zinc-400">
          Apagar a conta remove os dados deste gestor. Esta ação não pode ser desfeita.
        </p>
        <button
          type="button"
          className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-red-600 text-sm font-semibold text-white transition-colors duration-200 hover:bg-red-500"
        >
          <Trash2 className="size-4" aria-hidden="true" />
          Apagar Conta
        </button>
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={
        checked
          ? "relative h-6 w-11 shrink-0 rounded-full bg-emerald-600 transition-colors duration-200"
          : "relative h-6 w-11 shrink-0 rounded-full bg-zinc-700 transition-colors duration-200"
      }
    >
      <span
        aria-hidden="true"
        className={
          checked
            ? "absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition-transform duration-200 translate-x-5"
            : "absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition-transform duration-200"
        }
      />
    </button>
  );
}
