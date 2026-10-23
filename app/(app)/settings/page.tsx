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
import { DeleteAccountModal } from "@/components/delete-account-modal";
import {
  countUserData,
  deleteAllUserData,
  fetchAllUserData,
} from "@/lib/appwrite/user-data";
import { clearAppSessionArtifacts, signOutCurrentSession } from "@/lib/appwrite/session";
import { buildUserDataCsv, downloadCsv } from "@/lib/export-csv";
import { useTranslation } from "@/hooks/use-translation";
import { useRouter } from "next/navigation";
import { AppSelect } from "@/components/ui/app-select";
import { useSession } from "@/components/require-session";
import { getCategoryIcon } from "@/lib/category-utils";
import { Bell, Download, Loader2, Plus, Tag, Tags, Trash2, UserRound, Wallet } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

type SettingsTab = "perfil" | "preferencias" | "categorias" | "notificacoes" | "dados";

/** Abas por id estável — o rótulo visível vem sempre de `t()`. */
const tabs: { id: SettingsTab; labelKey: string; icon: typeof UserRound }[] = [
  { id: "perfil", labelKey: "settings.tabProfile", icon: UserRound },
  { id: "preferencias", labelKey: "settings.tabPreferences", icon: Wallet },
  { id: "categorias", labelKey: "settings.tabCategories", icon: Tags },
  { id: "notificacoes", labelKey: "settings.tabNotifications", icon: Bell },
  { id: "dados", labelKey: "settings.tabData", icon: Download },
];

// Nomes gravados na BD (conteúdo do utilizador, como títulos de metas):
// não são texto de UI, por isso não passam por `t()` — traduzir aqui
// criaria categorias gravadas noutro idioma na conta do utilizador.
const DEFAULT_CATEGORIES = ["Alimentação", "Transporte", "Moradia", "Saúde", "Lazer", "Assinaturas", "Salário"];

const fieldClassName =
  "h-11 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none transition-colors duration-200 placeholder:text-zinc-500 [color-scheme:dark] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";

export default function SettingsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<SettingsTab>("perfil");

  return (
    <div className="flex w-full flex-col gap-4 md:gap-6">
      <header className="rounded-2xl border border-emerald-950/80 bg-gradient-to-r from-[#041610] to-[#0a241a] px-4 py-5 md:px-6">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-50 sm:text-2xl">
          {t("settings.title")}
        </h1>
        <p className="mt-1.5 text-sm text-emerald-100/70">
          {t("settings.subtitle")}
        </p>
      </header>

      <div className="flex flex-col gap-6 md:flex-row md:gap-8">
        <nav aria-label={t("settings.navAria")} className="w-full shrink-0 md:w-[250px]">
          {/* Mobile: scroll horizontal; desktop: coluna estática */}
          <div className="flex overflow-x-auto whitespace-nowrap scrollbar-hide pb-2 md:overflow-visible md:whitespace-normal md:pb-0">
            <ul className="flex flex-row gap-1 md:w-full md:flex-col">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;

                return (
                  <li key={tab.id} className="shrink-0 md:shrink md:w-full">
                    <button
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      aria-current={isActive ? "page" : undefined}
                      className={
                        isActive
                          ? "flex w-full items-center gap-2 rounded-lg bg-zinc-800/50 px-3 py-2.5 text-left text-sm font-medium text-emerald-500 transition-colors duration-200 md:gap-3"
                          : "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-zinc-400 transition-colors duration-200 hover:text-zinc-200 md:gap-3"
                      }
                    >
                      <tab.icon className="size-4 shrink-0" aria-hidden="true" />
                      <span className="whitespace-nowrap">{t(tab.labelKey)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        {/* Semi-transparente + blur: um bg opaco aqui tapava o fundo
            estilizado (partículas/blobs) do layout pai em quase todo
            o ecrã de Configurações. */}
        <section className="min-w-0 flex-1 rounded-xl border border-zinc-700/50 bg-zinc-950/50 p-4 backdrop-blur-sm md:p-8">
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
  const { t } = useTranslation();
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
        toast.error(t("settings.profileLoadError"));
      });

    return () => {
      active = false;
    };
    // `t` muda com o idioma; recarregar o perfil por troca de idioma seria
    // um fetch desnecessário — o toast só é usado em caso de erro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleAvatarChange(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("settings.selectImageError"));
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

    const toastId = toast.loading(t("settings.saving"));
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
      toast.success(t("settings.profileUpdated"), { id: toastId });
    } catch {
      toast.error(t("settings.profileUpdateError"), { id: toastId });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-50">{t("settings.profileTitle")}</h2>
        <p className="mt-1 text-sm text-zinc-400">{t("settings.profileSubtitle")}</p>
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
            {t("settings.changeAvatar")}
          </button>
          <p className="mt-2 text-xs text-zinc-500">{t("settings.avatarHint")}</p>
        </div>
      </div>

      <label className="flex flex-col gap-1.5 text-sm text-zinc-300">
        {t("settings.name")}
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="name"
          disabled={isLoading}
          className={fieldClassName}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm text-zinc-300">
        {t("settings.email")}
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
          {t("settings.saveChanges")}
        </button>
      </div>
    </form>
  );
}

function PreferencesPanel() {
  const { t } = useTranslation();
  const { currency, setCurrency, privacyMode, togglePrivacyMode } = usePreferences();

  const currencyOptions = [
    { value: "BRL", label: t("settings.currencyBRL") },
    { value: "USD", label: t("settings.currencyUSD") },
    { value: "EUR", label: t("settings.currencyEUR") },
  ] as const;

  function handleTogglePrivacy() {
    const next = !privacyMode;
    togglePrivacyMode();
    toast.success(next ? t("settings.privacyActivated") : t("settings.privacyDeactivated"));
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-50">{t("settings.preferencesTitle")}</h2>
        <p className="mt-1 text-sm text-zinc-400">{t("settings.preferencesSubtitle")}</p>
      </div>

      <div className="flex flex-col gap-1.5 text-sm text-zinc-300">
        <span id="settings-currency-label">{t("settings.mainCurrency")}</span>
        <AppSelect
          value={currency}
          onChange={(value) => {
            if (value !== "BRL" && value !== "USD" && value !== "EUR") return;
            setCurrency(value);
            const label =
              currencyOptions.find((option) => option.value === value)?.label ?? value;
            toast.success(t("settings.currencyUpdated", { label }));
          }}
          ariaLabelledBy="settings-currency-label"
          options={currencyOptions}
          buttonClassName="flex h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-left text-sm text-zinc-100 outline-none transition-colors duration-200 hover:border-zinc-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>

      <div className="flex items-center justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-zinc-100">{t("settings.privacyMode")}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {privacyMode ? t("settings.privacyOn") : t("settings.privacyOff")}
          </p>
        </div>
        <Toggle
          checked={privacyMode}
          onChange={handleTogglePrivacy}
          label={t("settings.privacyMode")}
        />
      </div>
    </div>
  );
}

function CategoriesPanel() {
  const { t } = useTranslation();
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
        toast.error(t("settings.categoriesLoadError"));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.$id]);

  async function addCategory() {
    const name = newCategoryName.trim();
    if (!name || isSubmitting) return;

    const alreadyExists = categories.some(
      (category) => category.name.localeCompare(name, "pt-BR", { sensitivity: "accent" }) === 0,
    );
    if (alreadyExists) {
      toast.error(t("settings.categoryExists"));
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createCategory(user.$id, name);
      setCategories((current) =>
        [...current, created].sort((left, right) => left.name.localeCompare(right.name, "pt-BR")),
      );
      setNewCategoryName("");
      toast.success(t("settings.categoryCreated"));
    } catch {
      toast.error(t("settings.categoryCreateError"));
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
      toast.success(t("settings.defaultCategoriesCreated"));
    } catch {
      toast.error(t("settings.defaultCategoriesError"));
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
      toast.success(t("settings.categoryDeleted"));
    } catch {
      toast.error(t("settings.categoryDeleteError"));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-50">{t("settings.categoriesTitle")}</h2>
        <p className="mt-1 text-sm text-zinc-400">{t("settings.categoriesSubtitle")}</p>
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
            {t("settings.noCategories")}
          </p>
          <button
            type="button"
            onClick={() => void createDefaultCategories()}
            disabled={isSubmitting}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t("settings.createDefaultCategories")}
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
                aria-label={t("settings.deleteCategoryAria", { name: category.name })}
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
          {t("settings.newCategoryName")}
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
          placeholder={t("settings.categoryNamePlaceholder")}
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
          {t("settings.newCategory")}
        </button>
      </div>
    </div>
  );
}

function NotificationsPanel() {
  const { t } = useTranslation();
  const { alertsEnabled, setAlertsEnabled, emailSummaryEnabled, setEmailSummaryEnabled } =
    usePreferences();

  // Guardar imediatamente (optimista): o PreferencesProvider persiste em
  // localStorage e sincroniza para `account.prefs` do Appwrite.
  function handleAlertsChange(next: boolean) {
    setAlertsEnabled(next);
    toast.success(next ? t("settings.dueAlertsOn") : t("settings.dueAlertsOff"));
  }

  function handleEmailSummaryChange(next: boolean) {
    setEmailSummaryEnabled(next);
    toast.success(next ? t("settings.emailSummaryOn") : t("settings.emailSummaryOff"));
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-50">{t("settings.notificationsTitle")}</h2>
        <p className="mt-1 text-sm text-zinc-400">{t("settings.notificationsSubtitle")}</p>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-zinc-100">{t("settings.dueAlerts")}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {t("settings.dueAlertsDesc")}
          </p>
        </div>
        <Toggle checked={alertsEnabled} onChange={handleAlertsChange} label={t("settings.dueAlerts")} />
      </div>

      <div className="flex items-center justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-zinc-100">{t("settings.emailSummary")}</p>
          <p className="mt-1 text-xs text-zinc-500">{t("settings.emailSummaryDesc")}</p>
        </div>
        <Toggle
          checked={emailSummaryEnabled}
          onChange={handleEmailSummaryChange}
          label={t("settings.emailSummary")}
        />
      </div>
    </div>
  );
}

function DataPanel() {
  const { t } = useTranslation();
  const { user } = useSession();
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  async function handleExportCSV() {
    if (isExporting) return;

    setIsExporting(true);
    const toastId = toast.loading(t("settings.preparingExport"));

    try {
      const data = await fetchAllUserData(user.$id);
      const total = countUserData(data);

      if (total === 0) {
        toast.info(t("settings.noDataToExport"), { id: toastId });
        return;
      }

      downloadCsv("projekt-fin-export.csv", buildUserDataCsv(data));
      toast.success(
        t(total === 1 ? "settings.exportDoneOne" : "settings.exportDoneMany", { count: total }),
        { id: toastId },
      );
    } catch (error) {
      console.error("Falha ao exportar dados:", error);
      toast.error(t("settings.exportError"), { id: toastId });
    } finally {
      setIsExporting(false);
    }
  }

  async function handleDeleteAccount() {
    // 1) Apaga transações, metas (+ imagens), assinaturas e categorias.
    //    Se falhar, lança e a sessão é mantida para poder tentar de novo.
    await deleteAllUserData(user.$id);

    // 2) Encerra a sessão atual e limpa cache local (mesmo se a sessão já tiver expirado).
    try {
      await signOutCurrentSession();
    } catch (error) {
      console.error("Falha ao encerrar a sessão após apagar a conta:", error);
      clearAppSessionArtifacts();
    }

    toast.success(t("settings.accountDeleted"));
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-50">{t("settings.dataTitle")}</h2>
        <p className="mt-1 text-sm text-zinc-400">{t("settings.dataSubtitle")}</p>
      </div>

      <button
        type="button"
        onClick={() => void handleExportCSV()}
        disabled={isExporting}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 text-sm font-semibold text-zinc-100 transition-colors duration-200 hover:border-zinc-600 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isExporting ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="size-4" aria-hidden="true" />
        )}
        {isExporting ? t("settings.exporting") : t("settings.exportCsv")}
      </button>

      <div className="rounded-xl border border-red-900/50 p-5">
        <h3 className="text-sm font-semibold text-red-300">{t("settings.dangerZone")}</h3>
        <p className="mt-1 text-sm text-zinc-400">
          {t("settings.dangerZoneText")}
        </p>
        <button
          type="button"
          onClick={() => setIsDeleteModalOpen(true)}
          className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-red-600 text-sm font-semibold text-white transition-colors duration-200 hover:bg-red-500"
        >
          <Trash2 className="size-4" aria-hidden="true" />
          {t("settings.deleteAccount")}
        </button>
      </div>

      <DeleteAccountModal
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteAccount}
      />
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
