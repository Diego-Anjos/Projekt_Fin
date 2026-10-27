/**
 * Dicionários i18n — uma fonte de verdade por idioma em `locales/<código>.json`.
 *
 * Como traduzir gradualmente os restantes textos da aplicação:
 * 1. Substitua a string fixa por `t("seccao.chave")` (hook `useTranslation`).
 * 2. Adicione a chave a `pt.json` e, de seguida, aos restantes JSONs.
 * 3. Se uma chave faltar num idioma, `t()` faz fallback para português;
 *    se faltar também em português, devolve a própria chave (fácil de detetar).
 *
 * Já traduzido: sidebar, header, dashboard (+ widgets), `common` (paginação
 * e ações genéricas), `subscriptions` (página + modal), `goals` (página,
 * GoalCard + goalModal), `transactions` (página Compras + transactionModal),
 * `settings` (+ deleteAccount), `investments`, `news` (fixos + manchetes via
 * `useDynamicTranslation`), `cashFlow`, `widgets` e `notifications`.
 * Persistência do idioma: localStorage (imediato) + `account.prefs.language`
 * no Appwrite (cross-device) — ver `contexts/LanguageContext.tsx`.
 *
 * TODO(i18n): restantes textos fixos por migrar para `t()` —
 *  - login (`app/page.tsx`), `components/ui/ai-command-bar.tsx`,
 *    `market-hub-cards.tsx` e `category-bubble-chart.tsx` (fora das páginas
 *    principais auditadas). Ao migrar, reutilizar `common.*` quando a string
 *    já existir e criar a secção nos 6 JSONs em simultâneo.
 */
import en from "@/locales/en.json";
import es from "@/locales/es.json";
import fr from "@/locales/fr.json";
import it from "@/locales/it.json";
import ja from "@/locales/ja.json";
import pt from "@/locales/pt.json";

export const languageCodes = ["pt", "en", "es", "fr", "it", "ja"] as const;

export type LanguageCode = (typeof languageCodes)[number];

export const defaultLocale: LanguageCode = "pt";
export const fallbackLocale: LanguageCode = "pt";
export const LOCALE_STORAGE_KEY = "projekt-fin-locale";

/** Código BCP 47 para `<html lang>` e `Intl.DateTimeFormat`. */
export const localeToBcp47: Record<LanguageCode, string> = {
  pt: "pt-BR",
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  it: "it-IT",
  ja: "ja-JP",
};

export type Dictionary = {
  sidebar: {
    marketHub: string;
    dashboard: string;
    purchases: string;
    subscriptions: string;
    cashFlow: string;
    goals: string;
    investments: string;
    news: string;
    settings: string;
    sidebar: string;
    mainMenu: string;
    active: string;
    dailyTip: string;
    dailyTipText: string;
    dailyTipLoading: string;
    /** {category}, {amount}, {goal} */
    dailyTipGoalFocus: string;
    /** {name}, {days}, {amount} */
    dailyTipSubscriptionDue: string;
    /** {surplus} */
    dailyTipPositiveBalance: string;
    /** {percent} */
    dailyTipSpendingAlert: string;
  };
  header: {
    search: string;
    header: string;
    openMenu: string;
    showBalances: string;
    hideBalances: string;
  };
  dashboard: {
    title: string;
    welcome: string;
    signOut: string;
    signingOut: string;
    signOutError: string;
    portfolioKpis: string;
    totalWealth: string;
    monthlyCashFlow: string;
    currentMonthExpenses: string;
    renews: string;
  };
  common: {
    pagination: string;
    previous: string;
    next: string;
    pageOf: string;
    item: string;
    items: string;
    loading: string;
    save: string;
    cancel: string;
    delete: string;
    close: string;
    confirm: string;
    edit: string;
    saving: string;
    closeMenu: string;
    noOptions: string;
    selectPlaceholder: string;
    verifyingSession: string;
  };
  subscriptions: {
    title: string;
    subtitle: string;
    new: string;
    empty: string;
    active: string;
    edit: string;
    delete: string;
    editAria: string;
    deleteAria: string;
    nextDue: string;
    payment: string;
    cycleMonthly: string;
    cycleYearly: string;
    paymentCredit: string;
    paymentPix: string;
    paymentBoleto: string;
    loadError: string;
    deleteTitle: string;
    deleteDescription: string;
    deleteConfirm: string;
    deleted: string;
    deleteError: string;
    modalEditTitle: string;
    modalNewTitle: string;
    modalEditSubtitle: string;
    modalNewSubtitle: string;
    close: string;
    serviceName: string;
    amount: string;
    cycle: string;
    subscribedAt: string;
    firstDue: string;
    paymentMethod: string;
    cancel: string;
    saving: string;
    saveChanges: string;
    save: string;
    invalidField: string;
    amountError: string;
    subscribedAtError: string;
    nextDueError: string;
    sessionMissing: string;
    saveError: string;
  };
  goals: {
    title: string;
    subtitle: string;
    new: string;
    loading: string;
    emptyTitle: string;
    emptyText: string;
    createFirst: string;
    allCompleted: string;
    completed: string;
    loadError: string;
    deleteConfirm: string;
    deleted: string;
    deleteError: string;
    editGoal: string;
    deleteGoal: string;
    editGoalAria: string;
    deleteGoalAria: string;
    progressAria: string;
    of: string;
    target: string;
    completedLabel: string;
    overdue: string;
    dueToday: string;
    oneDay: string;
    days: string;
    oneMonth: string;
    months: string;
    categoryTravel: string;
    categoryEmergency: string;
    categoryTech: string;
    categoryHome: string;
    categoryEducation: string;
    categoryCar: string;
    categoryOther: string;
  };
  transactions: {
    title: string;
    subtitle: string;
    new: string;
    month: string;
    allMonths: string;
    status: string;
    allStatuses: string;
    paid: string;
    pending: string;
    search: string;
    searchPlaceholder: string;
    situation: string;
    description: string;
    category: string;
    date: string;
    amount: string;
    actions: string;
    emptyFiltered: string;
    empty: string;
    editAria: string;
    deleteAria: string;
    deleteTitle: string;
    deleteDescription: string;
    deleteConfirm: string;
    deleted: string;
    deleteError: string;
    allocateToGoals: string;
  };
  settings: {
    title: string;
    subtitle: string;
    navAria: string;
    tabProfile: string;
    tabPreferences: string;
    tabCategories: string;
    tabNotifications: string;
    tabData: string;
    profileTitle: string;
    profileSubtitle: string;
    changeAvatar: string;
    avatarHint: string;
    name: string;
    email: string;
    saveChanges: string;
    profileLoadError: string;
    selectImageError: string;
    saving: string;
    profileUpdated: string;
    profileUpdateError: string;
    preferencesTitle: string;
    preferencesSubtitle: string;
    mainCurrency: string;
    currencyBRL: string;
    currencyUSD: string;
    currencyEUR: string;
    currencyUpdated: string;
    privacyMode: string;
    privacyOn: string;
    privacyOff: string;
    privacyActivated: string;
    privacyDeactivated: string;
    categoriesTitle: string;
    categoriesSubtitle: string;
    categoriesLoadError: string;
    categoryExists: string;
    categoryCreated: string;
    categoryCreateError: string;
    defaultCategoriesCreated: string;
    defaultCategoriesError: string;
    categoryDeleted: string;
    categoryDeleteError: string;
    noCategories: string;
    createDefaultCategories: string;
    newCategoryName: string;
    categoryNamePlaceholder: string;
    newCategory: string;
    deleteCategoryAria: string;
    notificationsTitle: string;
    notificationsSubtitle: string;
    dueAlerts: string;
    dueAlertsDesc: string;
    dueAlertsOn: string;
    dueAlertsOff: string;
    emailSummary: string;
    emailSummaryDesc: string;
    emailSummaryOn: string;
    emailSummaryOff: string;
    dataTitle: string;
    dataSubtitle: string;
    preparingExport: string;
    noDataToExport: string;
    exportNoMatches: string;
    exportDoneOne: string;
    exportDoneMany: string;
    exportError: string;
    accountDeleted: string;
    exporting: string;
    exportCsv: string;
    exportModalTitle: string;
    exportModalSubtitle: string;
    exportPeriod: string;
    exportPeriod_this_month: string;
    exportPeriod_last_3_months: string;
    exportPeriod_last_year: string;
    exportPeriod_all: string;
    exportTypes: string;
    exportTypeIncome: string;
    exportTypeExpenses: string;
    exportTypeGoals: string;
    exportTypeSubscriptions: string;
    exportSelectType: string;
    exportFormat: string;
    generateReport: string;
    dangerZone: string;
    dangerZoneText: string;
    deleteAccount: string;
  };
  investments: {
    title: string;
    subtitle: string;
    searchAsset: string;
    searchPlaceholder: string;
    categoriesAria: string;
    tabs: {
      stocks: string;
      fii: string;
      etf: string;
    };
    badgeEtfs: string;
    explanationStocks: string;
    explanationFiis: string;
    explanationEtfs: string;
    loadError: string;
    loadingQuotes: string;
    noAssetsFound: string;
    currentPrice: string;
    change24h: string;
  };
  news: {
    title: string;
    subtitle: string;
    searchNews: string;
    searchPlaceholder: string;
    filterAria: string;
    headlinesAria: string;
    loadingAria: string;
    categoryGeneral: string;
    categoryCrypto: string;
    categoryStocks: string;
    categoryMacro: string;
    readFullArticle: string;
    noDescription: string;
    unknownSource: string;
    loadError: string;
    empty: string;
    now: string;
    minutesAgo: string;
    oneHourAgo: string;
    hoursAgo: string;
    oneDayAgo: string;
    daysAgo: string;
  };
  cashFlow: {
    title: string;
    subtitle: string;
    month: string;
    year: string;
    viewModeAria: string;
    viewMonthly: string;
    viewAnnual: string;
    summaryAria: string;
    income: string;
    incomeDesc: string;
    expenses: string;
    expensesDesc: string;
    netBalance: string;
    chartsAria: string;
    expensesByCategory: string;
    noExpensesMonth: string;
    noExpensesYear: string;
    expensesInMonth: string;
    expensesInYear: string;
    loadError: string;
    spendingInMonth: string;
    heatmapAria: string;
    dayLabel: string;
    xrayAria: string;
    xrayTitle: string;
    xraySubtitle: string;
    topCategories: string;
    topMovements: string;
    xrayEmptyCategories: string;
    xrayEmptyMovements: string;
  };
  widgets: {
    recentTransactions: string;
    pendingCount: string;
    paidCount: string;
    noRecentTransactions: string;
    recurringSubscriptions: string;
    viewAll: string;
    noRecurringSubscriptions: string;
  };
  notifications: {
    title: string;
    unreadAria: string;
    aria: string;
    newOne: string;
    newMany: string;
    markAllRead: string;
    emptyTitle: string;
    emptyText: string;
    dueToday: string;
    dueTomorrow: string;
    dueInDays: string;
    readSuffix: string;
    unreadSuffix: string;
  };
  goalModal: {
    editTitle: string;
    newTitle: string;
    editSubtitle: string;
    newSubtitle: string;
    name: string;
    namePlaceholder: string;
    description: string;
    optional: string;
    descriptionPlaceholder: string;
    targetAmount: string;
    currentAmount: string;
    initialAmount: string;
    targetDate: string;
    category: string;
    categoryAria: string;
    photo: string;
    photoPreviewAlt: string;
    removePhoto: string;
    addPhoto: string;
    savingEdit: string;
    creating: string;
    createGoal: string;
    titleError: string;
    targetError: string;
    initialNegativeError: string;
    initialExceedsError: string;
    targetDateError: string;
    sessionMissing: string;
    created: string;
    updated: string;
    createError: string;
    updateError: string;
  };
  transactionModal: {
    editTitle: string;
    newTitle: string;
    subtitle: string;
    type: string;
    income: string;
    expense: string;
    amount: string;
    amountTotal: string;
    amountInstallment: string;
    amountHint: string;
    amountTotalHint: string;
    amountInstallmentHint: string;
    installmentToggle: string;
    installmentCount: string;
    installmentCountHint: string;
    installmentCountError: string;
    installmentAmountError: string;
    installmentPreview: string;
    installmentPreviewAdjusted: string;
    installmentEditNote: string;
    installmentsCreated: string;
    date: string;
    description: string;
    descriptionPlaceholder: string;
    category: string;
    selectCategory: string;
    noCategories: string;
    loadingCategories: string;
    status: string;
    saving: string;
    save: string;
    invalidField: string;
    amountError: string;
    dateError: string;
    categoryError: string;
    sessionMissing: string;
    categoriesLoadError: string;
    created: string;
    updated: string;
    saveError: string;
  };
  allocateGoalModal: {
    title: string;
    subtitle: string;
    availableBalance: string;
    selectGoal: string;
    noGoals: string;
    remainingLabel: string;
    amount: string;
    useFullAmount: string;
    transfer: string;
    transferring: string;
    goalRequired: string;
    amountError: string;
    noBalance: string;
    exceedsBalance: string;
    exceedsRemaining: string;
    sessionMissing: string;
    loadError: string;
    submitError: string;
    success: string;
    transactionDescription: string;
    transactionCategory: string;
  };
  deleteAccount: {
    title: string;
    warning: string;
    confirmInstruction: string;
    deleting: string;
    confirm: string;
    errorFallback: string;
  };
};

export const translations: Record<LanguageCode, Dictionary> = {
  pt: pt as Dictionary,
  en: en as Dictionary,
  es: es as Dictionary,
  fr: fr as Dictionary,
  it: it as Dictionary,
  ja: ja as Dictionary,
};
