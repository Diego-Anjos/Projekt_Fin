# 🚀 Projekt Fin

> Uma plataforma de gestão financeira inteligente, focada em UX responsiva, gamificação de metas e integração de indicadores de mercado em tempo real — com a assistente **Quantum.IA**.

![Preview do Projeto](https://via.placeholder.com/1200x600/070C09/10B981?text=Projekt+Fin+-+Dashboard)

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Appwrite-FD366E?style=for-the-badge&logo=appwrite&logoColor=white" alt="Appwrite" />
  <img src="https://img.shields.io/badge/Gemini-4285F4?style=for-the-badge&logo=googlegemini&logoColor=white" alt="Google Gemini" />
</p>

---

## ✨ Como funciona o sistema?

O **Projekt Fin** foi desenhado para oferecer uma experiência premium e *mobile-first* no controlo das finanças pessoais. O sistema divide-se em módulos principais:

| Módulo | Descrição |
| :--- | :--- |
| 📊 **Fluxo de Caixa (Raio-X)** | Análise de entradas e saídas (mensal e anual) com gráficos interativos e detalhamento visual. |
| 🎯 **Metas Gamificadas** | Objetivos financeiros com imagens, progresso e **Acelerar Metas** (redirecionar saldo positivo num clique). |
| 📈 **Market Hub & Investimentos** | KPIs de mercado, ações, FIIs e criptomoedas via **Brapi** / **HG Brasil**, mais feed de notícias económicas. |
| 🛒 **Compras & Subscrições** | Gestão de despesas recorrentes e histórico de compras com paginação e filtros. |
| 🤖 **Quantum.IA** | Assistente virtual (Google Gemini) com contexto financeiro do utilizador, dicas diárias e chat na app. |
| 📁 **Exportação de Dados** | Relatórios personalizados (CSV/JSON) com filtros de período e tipo de transação. |
| 🌐 **Multi-idioma** | Tradução dinâmica da interface (Gemini e/ou DeepL, conforme configuração). |

---

## 🛠️ Tecnologias Utilizadas

| Camada | Stack |
| :--- | :--- |
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript 5 |
| **Estilização** | Tailwind CSS 4, componentes UI próprios (API próxima do shadcn/ui), Lucide Icons, Framer Motion |
| **Gráficos / 3D** | Recharts, D3 Hierarchy, React Three Fiber |
| **Autenticação / Backend** | [Appwrite](https://appwrite.io) (`appwrite` + `node-appwrite`) — Auth, Database, Storage |
| **IA (Quantum.IA)** | Google Gemini (`@google/generative-ai`) |
| **APIs externas** | Brapi (ações/FIIs), HG Brasil (indicadores), NewsAPI (notícias), DeepL (tradução opcional) |
| **Validação** | Zod, React Hook Form |

---

## ⚙️ Instalação e Configuração

Siga os passos abaixo para rodar o projeto localmente.

### Pré-requisitos

- **Node.js** 18.x ou superior (recomendado: 20.x LTS)
- **npm** (o repositório inclui `package-lock.json`)

> Yarn, pnpm ou bun também funcionam, mas o lockfile oficial é o do npm.

### 1. Clonar o repositório

```bash
git clone https://github.com/Diego-Anjos/Projekt_Fin.git
cd Projekt_Fin
```

### 2. Instalar as dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

Crie um ficheiro `.env.local` na raiz do projeto com as chaves necessárias:

```env
# .env.local (exemplo — substitua pelos seus valores)

# ── Appwrite (Auth + Database + Storage) ──────────────────────────
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=seu_project_id
APPWRITE_API_KEY=sua_api_key_server
NEXT_PUBLIC_APPWRITE_DATABASE_ID=seu_database_id
NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID=...
NEXT_PUBLIC_APPWRITE_SUBSCRIPTIONS_COLLECTION_ID=...
NEXT_PUBLIC_APPWRITE_CATEGORIES_COLLECTION_ID=...
NEXT_PUBLIC_APPWRITE_GOALS_COLLECTION_ID=...
NEXT_PUBLIC_APPWRITE_CHAT_COLLECTION_ID=...
NEXT_PUBLIC_APPWRITE_AVATARS_BUCKET_ID=...
NEXT_PUBLIC_APPWRITE_GOALS_BUCKET_ID=...

# ── Mercado & notícias ────────────────────────────────────────────
BRAPI_TOKEN=seu_token_brapi
HG_BRASIL_API_KEY=sua_chave_hg_brasil
NEWS_API_KEY=sua_chave_newsapi

# ── Quantum.IA (Gemini) ───────────────────────────────────────────
GEMINI_API_KEY=sua_chave_gemini

# ── Tradução (opcional) ───────────────────────────────────────────
# TRANSLATION_PROVIDER=gemini   # ou deepl
# DEEPL_API_KEY=sua_chave_deepl
# GEMINI_TRANSLATE_MODEL=gemini-3.8-flash
```

<details>
<summary><strong>📋 Notas sobre as variáveis</strong></summary>

<br />

| Variável | Obrigatória | Uso |
| :--- | :---: | :--- |
| `NEXT_PUBLIC_APPWRITE_*` | ✅ | Cliente e sessão (endpoint, project, collections, buckets) |
| `APPWRITE_API_KEY` | ✅* | Operações server-side no Appwrite |
| `GEMINI_API_KEY` | ✅* | Chat Quantum.IA, dicas diárias e títulos de conversa |
| `BRAPI_TOKEN` | ✅* | Screener / cotações (Brapi) |
| `HG_BRASIL_API_KEY` | ✅* | Indicadores de mercado (HG Finance) |
| `NEWS_API_KEY` | ✅* | Feed de notícias |
| `DEEPL_API_KEY` | ❌ | Provider alternativo de tradução |

\*Necessárias para as funcionalidades correspondentes; sem elas, essas rotas/API falham ou degradam gracefully.

</details>

### 4. Rodar o servidor de desenvolvimento

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador.

### Scripts disponíveis

| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Serve o build de produção |
| `npm run lint` | ESLint |

---

## 📁 Estrutura (visão geral)

```text
projekt-fin/
├── app/                  # App Router (páginas + API routes)
│   ├── (app)/            # Área autenticada (dashboard, cash-flow, metas, …)
│   ├── api/              # chat, market, news, screener, translate, daily-tip
│   └── login/
├── components/           # UI da aplicação e shell
├── contexts/             # Idioma, preferências, diálogos
├── lib/                  # Appwrite, validação, export, chat context
├── services/             # Clientes HG Finance / NewsAPI
├── locales/              # Dicionários i18n
└── types/                # Tipos partilhados
```

---

## 🔐 Autenticação

A autenticação e a persistência de dados de utilizador são feitas com **Appwrite**:

- Sessão no cliente via SDK `appwrite`
- Proteção de rotas com `middleware.ts`
- Collections para transações, subscrições, categorias, metas e histórico da Quantum.IA
- Storage para avatares e imagens de metas

---

<p align="center">
  Feito com 💚 para revolucionar a gestão financeira.
</p>
