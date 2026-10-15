"use client";

import { usePreferences } from "@/contexts/preferences-context";
import {
  createCategory,
  deleteCategory,
  getCategories,
  type CategoryDocument,
} from "@/lib/appwrite/database";
import { updateUserProfile } from "@/lib/appwrite/auth";
import { account } from "@/lib/appwrite/client";
import { useSession } from "@/components/require-session";
import { getCategoryIcon } from "@/lib/category-utils";
import { Bell, Download, Plus, Tag, Tags, Trash2, UserRound, Wallet } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

type SettingsTab = "perfil" | "preferencias" | "categorias" | "notificacoes" | "dados";

const tabs: { id: SettingsTab; label: string; icon: typeof UserRound }[] = [
  { id: "perfil", label: "Perfil", icon: UserRound },
  { id: "preferencias", label: "Preferências", icon: Wallet },
  { id: "categorias", label: "Categorias", icon: Tags },
  { id: "notificacoes", label: "Notificações", icon: Bell },
  { id: "dados", label: "Dados e Exportação", icon: Download },
];

const DEFAULT_CATEGORIES = ["Alimentação", "Transporte", "Moradia", "Saúde", "Lazer", "Assinaturas", "Salário"];

const fieldClassName =
  "h-11 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none transition-colors duration-200 placeholder:text-zinc-500 [color-scheme:dark] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("perfil");

  return (
    <div className="flex w-full flex-col gap-4 md:gap-6">
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
  const { syncUser } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  useEffect(() => {
    let active = true;

    account
      .get()
      .then((user) => {
        if (!active) return;
        const avatarUrl = user.prefs.avatarUrl;
        setName(user.name);
        setEmail(user.email);
        setAvatarPreview(typeof avatarUrl === "string" && avatarUrl.length > 0 ? avatarUrl : null);
      })
      .catch(() => {
        if (!active) return;
        toast.error("Não foi possível carregar o perfil.");
      });

    return () => {
      active = false;
    };
  }, []);

  function handleAvatarChange(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um ficheiro de imagem.");
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    setAvatarPreview((current) => {
      if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
      return nextUrl;
    });
    setAvatarFile(file);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;

    const toastId = toast.loading("A guardar alterações...");
    setIsLoading(true);

    try {
      const updated = await updateUserProfile(name, avatarFile ?? undefined);
      const avatarUrl = updated.prefs.avatarUrl;
      setName(updated.name);
      setAvatarPreview((current) => {
        if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
        return typeof avatarUrl === "string" && avatarUrl.length > 0 ? avatarUrl : null;
      });
      setAvatarFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      syncUser(updated);
      toast.success("Perfil atualizado com sucesso!", { id: toastId });
    } catch {
      toast.error("Não foi possível atualizar o perfil.", { id: toastId });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-50">Perfil</h2>
        <p className="mt-1 text-sm text-zinc-400">Atualize os dados visíveis da sua conta.</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-600 text-lg font-semibold text-white">
          {avatarPreview ? (
            // Blob previews and Appwrite file URLs stay outside the image optimizer.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarPreview} alt="" className="size-full object-cover" />
          ) : (
            <span aria-hidden="true">{initials || "EM"}</span>
          )}
        </div>
        <div>
          <input
            ref={fileInputRef}
            id="avatar-upload"
            type="file"
            accept="image/*"
            className="hidden"
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
          onChange={(event) => setName(event.target.value)}
          autoComplete="name"
          disabled={isLoading}
          className={fieldClassName}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm text-zinc-300">
        Email
        <input
          type="email"
          value={email}
          readOnly
          disabled
          autoComplete="email"
          className={`${fieldClassName} cursor-not-allowed opacity-60`}
        />
      </label>

      <div className="flex items-center justify-end border-t border-zinc-800 pt-6">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Guardar Alterações
        </button>
      </div>
    </form>
  );
}

function PreferencesPanel() {
  const { currency, setCurrency, privacyMode, setPrivacyMode } = usePreferences();

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
          onChange={(event) => {
            const value = event.target.value;
            if (value !== "BRL" && value !== "USD" && value !== "EUR") return;
            setCurrency(value);
            const label = event.target.selectedOptions[0]?.text ?? value;
            toast.success(`Moeda atualizada para ${label}`);
          }}
          className={fieldClassName}
        >
          <option value="BRL">BRL — Real brasileiro</option>
          <option value="USD">USD — Dólar americano</option>
          <option value="EUR">EUR — Euro</option>
        </select>
      </label>

      <div className="flex items-center justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-zinc-100">Modo de Privacidade (Ocultar saldos)</p>
          <p className="mt-1 text-xs text-zinc-500">
            {privacyMode ? "Os saldos estão ocultos." : "Os saldos estão visíveis."}
          </p>
        </div>
        <Toggle
          checked={privacyMode}
          onChange={(next) => {
            setPrivacyMode(next);
            if (next) {
              toast.success("Modo de privacidade ativado. Os saldos estão ocultos.");
            } else {
              toast.success("Modo de privacidade desativado. Os saldos estão visíveis.");
            }
          }}
          label="Modo de Privacidade (Ocultar saldos)"
        />
      </div>
    </div>
  );
}

function CategoriesPanel() {
  const { user } = useSession();
  const [categories, setCategories] = useState<CategoryDocument[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getCategories(user.$id)
      .then((documents) => {
        if (!active) return;
        setCategories(documents.length === 0 ? [] : documents);
      })
      .catch(() => {
        if (!active) return;
        toast.error("Não foi possível carregar as categorias.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user.$id]);

  async function addCategory() {
    const name = newCategoryName.trim();
    if (!name || isSubmitting) return;

    const alreadyExists = categories.some(
      (category) => category.name.localeCompare(name, "pt-BR", { sensitivity: "accent" }) === 0,
    );
    if (alreadyExists) {
      toast.error("Essa categoria já existe.");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createCategory(user.$id, name);
      setCategories((current) =>
        [...current, created].sort((left, right) => left.name.localeCompare(right.name, "pt-BR")),
      );
      setNewCategoryName("");
      toast.success("Categoria criada com sucesso!");
    } catch {
      toast.error("Não foi possível criar a categoria.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function createDefaultCategories() {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await Promise.all(DEFAULT_CATEGORIES.map((name) => createCategory(user.$id, name)));
      const documents = await getCategories(user.$id);
      setCategories(documents);
      toast.success("Categorias padrão criadas!");
    } catch {
      toast.error("Não foi possível criar as categorias padrão.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function removeCategory(category: CategoryDocument) {
    if (deletingId) return;
    setDeletingId(category.$id);

    try {
      await deleteCategory(category.$id);
      setCategories((current) => current.filter((item) => item.$id !== category.$id));
      toast.success("Categoria excluída.");
    } catch {
      toast.error("Não foi possível excluir a categoria.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-50">Categorias</h2>
        <p className="mt-1 text-sm text-zinc-400">Organize receitas e despesas por tipo.</p>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          <span className="h-12 animate-pulse rounded-lg bg-zinc-900" />
          <span className="h-12 animate-pulse rounded-lg bg-zinc-900" />
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-zinc-800 bg-zinc-950 px-6 py-10 text-center">
          <Tag className="size-8 text-zinc-400" aria-hidden="true" />
          <p className="max-w-sm text-sm text-zinc-400">
            Nenhuma categoria encontrada. Que tal começar com as essenciais?
          </p>
          <button
            type="button"
            onClick={() => void createDefaultCategories()}
            disabled={isSubmitting}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Criar Categorias Padrão
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {categories.map((category) => {
            const CategoryIcon = getCategoryIcon(category.name);

            return (
            <li
              key={category.$id}
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100"
            >
              <span className="flex min-w-0 items-center gap-3">
                <CategoryIcon className="size-4 shrink-0 text-emerald-400" aria-hidden="true" />
                <span className="truncate">{category.name}</span>
              </span>
              <button
                type="button"
                onClick={() => removeCategory(category)}
                disabled={deletingId === category.$id}
                aria-label={`Excluir ${category.name}`}
                className="rounded-lg p-2 text-zinc-500 transition-colors duration-200 hover:bg-rose-500/10 hover:text-rose-500 disabled:opacity-50"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="new-category">
          Nome da nova categoria
        </label>
        <input
          id="new-category"
          value={newCategoryName}
          onChange={(event) => setNewCategoryName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void addCategory();
            }
          }}
          placeholder="Nome da categoria"
          disabled={isSubmitting}
          className={fieldClassName}
        />
        <button
          type="button"
          onClick={() => void addCategory()}
          disabled={isSubmitting || !newCategoryName.trim()}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
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
