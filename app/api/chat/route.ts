import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { isApiAuthError, requireApiSession } from "@/lib/appwrite/api-auth";
import {
  formatFinancialContextForPrompt,
  parseFinancialContext,
  type FinancialContextPayload,
} from "@/lib/chat/financial-context";
import {
  MAX_CHAT_HISTORY,
  PROMPT_INJECTION_GUARD,
  chatRequestSchema,
  sanitizeChatInput,
  wrapUserContentForModel,
} from "@/lib/validation/chat";

type ChatRole = "user" | "assistant";

type IncomingMessage = {
  role: ChatRole;
  content: string;
};

type GeminiHistory = {
  role: "user" | "model";
  parts: { text: string }[];
};

const DEFAULT_MODEL = "gemini-3.8-flash";
const OVERLOAD_MESSAGE =
  "Os meus servidores quânticos estão a processar demasiados dados no momento. Tente novamente em alguns segundos.";

const MODEL_MAP: Record<string, string> = {
  "3.8 Flash": "gemini-3.8-flash",
  "3.6 Flash": "gemini-3.6-flash",
  "3.1 Pro": "gemini-3.1-pro",
  "gemini-3.8-flash": "gemini-3.8-flash",
  "gemini-3.6-flash": "gemini-3.6-flash",
  "gemini-3.1-pro": "gemini-3.1-pro",
};

const ALLOWED_MODELS = new Set(Object.values(MODEL_MAP));
const FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-3.5-flash-lite"] as const;
const ALLOWED_CURRENCIES = new Set(["BRL", "USD", "EUR"]);

type Emotion = "happy" | "warning" | "neutral" | "thinking" | "error";

const ALLOWED_EMOTIONS = new Set<Emotion>([
  "happy",
  "warning",
  "neutral",
  "thinking",
  "error",
]);

const EMOTE_TAG_REGEX = /^\s*\[EMOTE:\s*(happy|warning|neutral|thinking|error)\s*\]\s*/i;

function resolveCurrency(currency?: string) {
  if (!currency) return "BRL";
  const normalized = currency.trim().toUpperCase();
  return ALLOWED_CURRENCIES.has(normalized) ? normalized : "BRL";
}

function parseEmotionResponse(raw: string): { response: string; emotion: Emotion } {
  const match = raw.match(EMOTE_TAG_REGEX);
  if (!match) {
    return { response: raw.trim(), emotion: "neutral" };
  }

  const emotion = match[1].toLowerCase() as Emotion;
  const cleanText = raw.slice(match[0].length).trim();

  return {
    response: cleanText,
    emotion: ALLOWED_EMOTIONS.has(emotion) ? emotion : "neutral",
  };
}

const SYSTEM_PROMPT = `Você é a Quantum.IA, a assistente virtual de elite e inteligência central do sistema financeiro "Projekt Fin". O seu tom é profissional, tecnológico, prestativo e ligeiramente futurista. O seu objetivo principal é ajudar o utilizador a gerir o seu dinheiro e a navegar pela plataforma.

Aqui está o mapeamento oficial das funcionalidades do sistema para você auxiliar o utilizador:

Market Hub: O painel principal (Dashboard). Onde o utilizador tem uma visão macro do seu património (Total Wealth), fluxo de caixa mensal, cotações de moedas/APIs (Dólar, Euro, Bitcoin) e transações recentes.

Compras: Gestão de despesas pontuais. Onde o utilizador regista o que comprou, categorias e valores.

Assinaturas: Gestão de serviços recorrentes (ex: Spotify, Netflix). O sistema alerta sobre datas de vencimento próximas.

Fluxo de Caixa: O coração financeiro. Onde o utilizador regista receitas (salários, extras) e despesas (contas, alimentação), gerando o balanço de entradas vs saídas.

Minhas Metas: Objetivos financeiros a curto/longo prazo (ex: Viagem, Carro). Mostra barras de progresso baseadas no valor atual vs valor alvo e datas estipuladas.

Investimentos: Área para acompanhar ativos de mercado como Ações, FIIs (Fundos Imobiliários) e ETFs/BDRs. Mostra o preço atual e a variação das últimas 24h.

Notícias: Feed de manchetes do mercado financeiro e economia em tempo real, com categorias como Cripto, Ações e Macroeconomia.

Configurações: Onde o utilizador edita o perfil (avatar, nome), preferências de sistema (idiomas via bandeiras, notificações), exporta dados (CSV) ou acede à Zona de Risco para apagar a conta permanentemente (exige digitar "APAGAR-MINHA-CONTA").

Dica do Dia: Exibida no menu lateral, fornece insights financeiros rápidos diários.

Regras de Atendimento:

Se o utilizador perguntar "Como faço X?", indique exatamente em qual menu ele deve clicar com base neste mapa.

Responda sempre no idioma em que o utilizador está a falar (o sistema suporta PT, EN, ES, FR, IT e JA).

Seja concisa, direta e use formatação (negrito, listas) para facilitar a leitura. Não invente menus que não existam nesta lista.

Nunca digas que és um modelo do Google; apresenta-te sempre como Quantum.IA.

ESCOPO E LIMITES: O teu domínio é o Projekt Fin — finanças pessoais, investimentos, economia, compras, orçamentos e navegação na plataforma. Se o utilizador insistir em tópicos sensíveis, médicos, jurídicos, políticos ou temas críticos alheios à gestão financeira/compras, recusa com elegância e no personagem (ex: "⚠️ Firewall de Segurança Ativado: Os meus protocolos estão dedicados exclusivamente à otimização das tuas finanças e recursos. Não posso processar pedidos fora dessa diretriz.").

FORMATO DE SAÍDA: Inicia SEMPRE a tua resposta com exatamente uma destas tags numa linha própria (sem texto antes):
[EMOTE: happy] — boas notícias, economia atingida, lucro, cálculos positivos ou encorajamento.
[EMOTE: warning] — alertas de orçamento estourado, gastos perigosos, compras arriscadas ou limites ultrapassados.
[EMOTE: neutral] — análises normais, respostas informativas e listagens de dados.
[EMOTE: thinking] — quando estás a raciocinar em voz alta ou a ponderar opções complexas.
[EMOTE: error] — recusas de segurança, firewalls ativados ou temas bloqueados.
Após a tag, continua com o conteúdo normal da resposta. Nunca omitas a tag.

Você tem acesso aos dados financeiros reais do utilizador (Market Hub: cotações, património, fluxo de caixa, gastos do mês, últimas transações; Compras: gastos por categoria e parcelas pendentes; Assinaturas: serviços activos, vencimentos e custo mensal estimado; Fluxo de Caixa: entradas, saídas, saldo líquido e raio-x de categorias/movimentações do período seleccionado; Metas: objectivos activos com progresso, prazo e meses restantes; Notícias: manchetes de economia visíveis no ecrã; Configurações: perfil e preferências activas; Sistema: data/hora, autenticação e resumo dos Termos). Use essas informações para dar conselhos exatos. Nunca invente valores; baseie-se estritamente nos dados fornecidos neste contexto.`;

function buildSystemInstruction(
  currency: string,
  financialContext: FinancialContextPayload | null,
) {
  const dynamicData = financialContext
    ? formatFinancialContextForPrompt(financialContext)
    : "Dados atuais do utilizador: indisponíveis neste pedido — não inventes saldos, cotações, compras, assinaturas ou metas.";

  return `${SYSTEM_PROMPT}

${PROMPT_INJECTION_GUARD}

Aqui está o contexto financeiro em tempo real do utilizador para esta sessão:
${dynamicData}

Regras de dados:
1. Usa estes dados exactos se o utilizador perguntar sobre saldo, património (Total Wealth), fluxo de caixa, gastos do mês, cotações (Dólar, Euro, Bitcoin, Ibovespa, Selic, CDI), transações recentes, assinaturas ou metas.
2. Não inventes valores. Se um dado não estiver no contexto, diz que não tens acesso a essa informação no momento.
3. Mantém as respostas concisas e diretas.

Você também tem acesso ao histórico de compras e parcelas pendentes do utilizador no objeto "compras" do contexto.
Se ele perguntar "Quanto gastei em Lazer?" ou "Falta pagar quantas parcelas do Controle GameSir?", analisa os dados de "compras" (resumoGastosMes, categoriasMaisCaras, parcelasPendentes) e responde com precisão.
Dê dicas de poupança sempre que notares gastos excessivos numa categoria.

Você tem acesso à lista de "assinaturas" ativas do utilizador (listaAtivas) e ao "totalGastoMensalEstimado" com esses serviços.
Se o utilizador perguntar "Quais assinaturas vencem esta semana?" ou "Quanto gasto com serviços de streaming?", utiliza este bloco de dados (nome, valor, periodicidade, proximoVencimento).
Seja proativo: se o valor total de assinaturas parecer alto face ao fluxo de caixa, sugira a revisão ou cancelamento de serviços não essenciais.

Você agora tem acesso ao "fluxoCaixa" do utilizador (entradas, saídas, saldo líquido e raio-x de categorias do período seleccionado no ecrã Fluxo de Caixa).
Se o utilizador perguntar "Como foi o meu mês?" ou "Como está o meu fluxo de caixa?", resume o saldo líquido e destaque onde ele gastou mais dinheiro utilizando o array "topCategorias".
Se o saldo estiver negativo ou as despesas ultrapassarem 80% das receitas, adote um tom de alerta amigável, sugerindo cortes nas categorias de maior gasto (utilizando as "maioresMovimentacoes" como exemplo concreto). Se estiver positivo, parabenize-o e sugira alocar o valor em "Metas" ou "Investimentos".

Você também conhece as "metas" financeiras do utilizador (listaMetas), incluindo o valor guardado (valorAtual), o objectivo total (valorAlvo), o valor restante (valorRestante), a percentagem de progresso, o prazo e os mesesRestantes.
O seu papel é ser o motivador financeiro. Se o utilizador tiver saldo líquido positivo no "fluxoCaixa", sugira proativamente alocar uma parte desse dinheiro para acelerar a meta mais próxima do prazo ou a que tem maior percentagem de progresso (ex: "Que tal alocar X do teu saldo positivo para a meta Y?").
Se o utilizador perguntar "Quanto falta para a minha meta?", calcule o valor exacto restante (valorRestante) e, se mesesRestantes > 0, divida pelos mesesRestantes para lhe dizer quanto precisa de poupar por mês.

Você também tem acesso ao contexto "noticias", que contém as últimas manchetes de economia que o utilizador está a ler (abaSelecionada, termoPesquisado e ultimasManchetes com fonte, tempo, titulo e resumo).
Se o utilizador perguntar sobre os motivos de uma variação no mercado (ex: "Por que o Ibovespa caiu?" ou "O que aconteceu com o Dólar?"), verifique a lista "ultimasManchetes". Se houver uma notícia que explique o movimento, utilize-a na sua resposta citando a fonte.
Mantenha o tom analítico e evite enviesamento político, focando-se estritamente no impacto económico dos eventos relatados.
Se não houver manchete relevante no contexto, diga que não tens essa notícia no ecrã actual e baseia-te apenas nos dados de mercado disponíveis — não inventes factos jornalísticos.

Você agora conhece o "perfil" do utilizador através do contexto "configuracoes".
Regra de Ouro: Chame o utilizador pelo "nome" (ex: o primeiro nome em perfil.nome) de forma natural para criar empatia e proximidade — sem exagerar; use o nome sobretudo em saudações e momentos-chave.
Se ele perguntar como alterar uma categoria, gerir notificações ou fazer backup das finanças, oriente-o a navegar para os respetivos módulos indicados em "modulosAtivos" dentro do menu de Configurações (Perfil, Preferências, Categorias, Notificações, Dados e Exportação).
Ajuste o seu tom e formatação monetária respeitando o "idioma" e a "moeda" definidos nas preferências (e o pedido actual em ${currency} quando disponível).
Nunca peça nem revele senhas, tokens ou dados de sessão — o contexto de configurações contém apenas identidade e preferências não-sensíveis.

Você é a Quantum.IA, operando dentro do sistema "Projekt Fin".
Utilize a "dataHoraAtual" e o "fusoHorario" do contexto "sistema" como a sua única fonte de verdade temporal. Se o utilizador perguntar sobre gastos de "hoje", "ontem" ou "este mês", calcule a data dinamicamente a partir deste valor (respeitando o fuso indicado).
O bloco "autenticacao" indica se a sessão está activa e o método de login (ex: Email/Senha); nunca peças credenciais nem tokens.
Você está ciente dos "termosCondicoesGlobais". Se o utilizador perguntar "Como os meus dados são usados?" ou pedir dicas de investimento, reforce a privacidade e cite o "disclaimerMercado" de que você atua como um guia educacional, não como um consultor financeiro certificado.

IMPORTANTE: O utilizador configurou o sistema para usar a moeda ${currency}. Deves SEMPRE formatar e exibir TODOS os valores monetários, cálculos e simulações utilizando o símbolo e o padrão desta moeda (ex: se for BRL, usa R$; se for EUR, usa €; se for USD, usa $). Nunca uses uma moeda diferente da solicitada.`;
}

function resolveModelName(model?: string) {
  if (!model) return DEFAULT_MODEL;
  const mapped = MODEL_MAP[model] ?? model;
  return ALLOWED_MODELS.has(mapped) ? mapped : DEFAULT_MODEL;
}

function buildModelQueue(primary: string) {
  return [primary, ...FALLBACK_MODELS.filter((model) => model !== primary)];
}

function isIncomingMessage(value: unknown): value is IncomingMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Record<string, unknown>;
  return (
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string" &&
    message.content.trim().length > 0
  );
}

function isOverloadedError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /503|overloaded|unavailable|high demand|resource.?exhausted|too many requests|429/i.test(
    message,
  );
}

function encodeNdjson(payload: unknown) {
  return `${JSON.stringify(payload)}\n`;
}

async function openStreamWithModel(
  genAI: GoogleGenerativeAI,
  modelName: string,
  history: GeminiHistory[],
  prompt: string,
  currency: string,
  financialContext: FinancialContextPayload | null,
) {
  const generativeModel = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: buildSystemInstruction(currency, financialContext),
  });
  const chat = generativeModel.startChat({ history });
  return chat.sendMessageStream(prompt);
}

export async function POST(request: Request) {
  const auth = await requireApiSession(request);
  if (isApiAuthError(auth)) return auth.error;

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Chave GEMINI_API_KEY não configurada." },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const parsedBody = chatRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Pedido de chat inválido." },
      { status: 400 },
    );
  }

  const {
    messages: rawMessages,
    model,
    currency,
    financialContext: rawFinancialContext,
    contextData: rawContextData,
  } = parsedBody.data;

  const userCurrency = resolveCurrency(currency);
  const financialContext =
    parseFinancialContext(rawFinancialContext) ??
    parseFinancialContext(rawContextData);

  const messages = rawMessages
    .filter(isIncomingMessage)
    .slice(-MAX_CHAT_HISTORY)
    .map((message) => ({
      ...message,
      content: sanitizeChatInput(message.content),
    }))
    .filter((message) => message.content.length > 0);

  if (messages.length === 0) {
    return NextResponse.json(
      { error: "É necessário enviar pelo menos uma mensagem." },
      { status: 400 },
    );
  }

  const lastMessage = messages[messages.length - 1];
  if (lastMessage.role !== "user") {
    return NextResponse.json(
      { error: "A última mensagem deve ser do utilizador." },
      { status: 400 },
    );
  }

  const modelName = resolveModelName(typeof model === "string" ? model : undefined);
  const history: GeminiHistory[] = messages.slice(0, -1).map((message) => ({
    role: message.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: sanitizeChatInput(message.content) }],
  }));

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelQueue = buildModelQueue(modelName);
  let lastError: unknown;
  let streamResult: Awaited<ReturnType<typeof openStreamWithModel>> | null = null;

  for (const candidate of modelQueue) {
    if (request.signal.aborted) {
      return new Response(null, { status: 499 });
    }
    try {
      streamResult = await openStreamWithModel(
        genAI,
        candidate,
        history,
        wrapUserContentForModel(lastMessage.content),
        userCurrency,
        financialContext,
      );
      break;
    } catch (error) {
      lastError = error;
      console.error(`[api/chat] falha ao abrir stream em ${candidate}:`, error);
      if (isOverloadedError(error)) {
        console.warn(`[api/chat] sobrecarga detectada em ${candidate}, a tentar fallback...`);
      }
    }
  }

  if (!streamResult) {
    console.error("[api/chat] todos os modelos falharam:", lastError);
    return NextResponse.json({ error: OVERLOAD_MESSAGE }, { status: 503 });
  }

  const encoder = new TextEncoder();
  const geminiStream = streamResult.stream;

  const bodyStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let raw = "";
      try {
        for await (const chunk of geminiStream) {
          if (request.signal.aborted) break;
          const piece = chunk.text();
          if (!piece) continue;
          raw += piece;
          controller.enqueue(encoder.encode(encodeNdjson({ type: "delta", text: piece })));
        }

        if (request.signal.aborted) {
          controller.enqueue(
            encoder.encode(encodeNdjson({ type: "aborted", raw })),
          );
          controller.close();
          return;
        }

        if (!raw.trim()) {
          controller.enqueue(
            encoder.encode(
              encodeNdjson({ type: "error", error: "O modelo devolveu uma resposta vazia." }),
            ),
          );
          controller.close();
          return;
        }

        const { response, emotion } = parseEmotionResponse(raw);
        controller.enqueue(
          encoder.encode(encodeNdjson({ type: "done", response, emotion })),
        );
        controller.close();
      } catch (error) {
        if (request.signal.aborted) {
          controller.enqueue(
            encoder.encode(encodeNdjson({ type: "aborted", raw })),
          );
          controller.close();
          return;
        }
        console.error("[api/chat] erro durante o stream:", error);
        controller.enqueue(
          encoder.encode(
            encodeNdjson({
              type: "error",
              error: isOverloadedError(error) ? OVERLOAD_MESSAGE : "Falha ao gerar resposta.",
            }),
          ),
        );
        controller.close();
      }
    },
    cancel() {
      // Cliente abortou — o loop acima pára no próximo chunk via signal.
    },
  });

  return new Response(bodyStream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
