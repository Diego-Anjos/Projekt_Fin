export const languageCodes = ["PT", "EN", "ES", "IT", "JA", "FR"] as const;

export type LanguageCode = (typeof languageCodes)[number];

type Dictionary = {
  sidebar: {
    marketHub: string;
    purchases: string;
    subscriptions: string;
    cashFlow: string;
    investments: string;
    news: string;
    settings: string;
  };
  header: {
    search: string;
  };
};

export const translations: Record<LanguageCode, Dictionary> = {
  PT: {
    sidebar: {
      marketHub: "Market Hub",
      purchases: "Compras",
      subscriptions: "Assinaturas",
      cashFlow: "Fluxo de Caixa",
      investments: "Investimentos",
      news: "Notícias",
      settings: "Configurações",
    },
    header: {
      search: "Pesquisar...",
    },
  },
  EN: {
    sidebar: {
      marketHub: "Market Hub",
      purchases: "Purchases",
      subscriptions: "Subscriptions",
      cashFlow: "Cash Flow",
      investments: "Investments",
      news: "News",
      settings: "Settings",
    },
    header: {
      search: "Search...",
    },
  },
  ES: {
    sidebar: {
      marketHub: "Market Hub",
      purchases: "Compras",
      subscriptions: "Suscripciones",
      cashFlow: "Flujo de caja",
      investments: "Inversiones",
      news: "Noticias",
      settings: "Ajustes",
    },
    header: {
      search: "Buscar...",
    },
  },
  IT: {
    sidebar: {
      marketHub: "Market Hub",
      purchases: "Acquisti",
      subscriptions: "Abbonamenti",
      cashFlow: "Flusso di cassa",
      investments: "Investimenti",
      news: "Notizie",
      settings: "Impostazioni",
    },
    header: {
      search: "Cerca...",
    },
  },
  JA: {
    sidebar: {
      marketHub: "マーケットハブ",
      purchases: "購入",
      subscriptions: "サブスクリプション",
      cashFlow: "キャッシュフロー",
      investments: "投資",
      news: "ニュース",
      settings: "設定",
    },
    header: {
      search: "検索...",
    },
  },
  FR: {
    sidebar: {
      marketHub: "Market Hub",
      purchases: "Achats",
      subscriptions: "Abonnements",
      cashFlow: "Flux de trésorerie",
      investments: "Investissements",
      news: "Actualités",
      settings: "Paramètres",
    },
    header: {
      search: "Rechercher...",
    },
  },
};
