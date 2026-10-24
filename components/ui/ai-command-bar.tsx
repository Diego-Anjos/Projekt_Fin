"use client";

import { AiModelSelect } from "@/components/ui/ai-model-select";
import {
  CHAT_SESSIONS_UPDATED_EVENT,
  createChatSession,
  deleteChatSession,
  fallbackChatTitle,
  generateChatTitle,
  listChatSessions,
  notifyChatSessionsUpdated,
  parseStoredMessages,
  updateChatSession,
  type ChatSessionDocument,
  type StoredChatMessage,
} from "@/lib/appwrite/chat-sessions";
import { useSession } from "@/components/require-session";
import { usePreferences } from "@/contexts/preferences-context";
import type { FinancialContextPayload } from "@/lib/chat/financial-context";
import { loadFinancialContext } from "@/lib/chat/load-financial-context";
import { cn } from "@/lib/utils";
import { MAX_CHAT_MESSAGE_CHARS, sanitizeChatInput } from "@/lib/validation/chat";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  AudioLines,
  DollarSign,
  History,
  MessageSquare,
  Minus,
  Settings2,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";

type Emotion = "happy" | "warning" | "neutral" | "error" | "thinking";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  emotion?: Emotion;
};

const AI_MODELS = [
  { id: "gemini-3.6-flash", label: "3.6 Flash" },
  { id: "gemini-3.8-flash", label: "3.8 Flash" },
  { id: "gemini-3.1-pro", label: "3.1 Pro" },
] as const;

const ROBOT_MAIN = "/projekt-fin-robo-aura-verde.gif";
const ROBOT_HAPPY = "/Robô retrô com rosto feliz em LED.png";
const ROBOT_THINKING = "/Robô dourado pensando em pixels verdes.png";
const ROBOT_WARNING = "/Robô monitor com expressão de alerta.png";
const ROBOT_NEUTRAL = "/projekt-fin-robo-aura-verde.gif";

const EMOTION_AVATARS: Record<Emotion, string> = {
  happy: ROBOT_HAPPY,
  thinking: ROBOT_THINKING,
  warning: ROBOT_WARNING,
  error: ROBOT_WARNING,
  neutral: ROBOT_NEUTRAL,
};

function resolveEmotionAvatar(emotion?: Emotion) {
  return EMOTION_AVATARS[emotion ?? "happy"];
}

const QUANTUM_WELCOME: ChatMessage = {
  id: "quantum-welcome",
  role: "assistant",
  content:
    "Sincronização concluída. Sou a Quantum.IA. Que anomalias financeiras vamos corrigir hoje?",
  emotion: "happy",
};

const loadingPhrases = [
  "A contornar firewalls de inflação...",
  "A compilar algoritmos de lucro...",
  "A descriptografar histórico de transações...",
  "A calcular probabilidades quânticas...",
  "A procurar anomalias no orçamento...",
  "A hackear a matriz de gastos...",
  "A sincronizar com o mainframe...",
] as const;

const EMOTE_TAG_REGEX =
  /^\s*\[EMOTE:\s*(happy|warning|neutral|thinking|error)\s*\]\s*/i;

function parseStreamingEmotion(raw: string): { content: string; emotion: Emotion } {
  const match = raw.match(EMOTE_TAG_REGEX);
  if (!match) {
    return { content: raw, emotion: "thinking" };
  }
  const emotion = match[1].toLowerCase() as Emotion;
  return {
    content: raw.slice(match[0].length),
    emotion: emotion in EMOTION_AVATARS ? emotion : "neutral",
  };
}

function toStoredMessages(conversation: ChatMessage[]): StoredChatMessage[] {
  return conversation
    .filter((message) => message.id !== QUANTUM_WELCOME.id)
    .map(({ id, role, content, emotion }) => ({ id, role, content, emotion }));
}

function getInitials(name: string, email: string) {
  const source = name.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

function AssistantAvatar({ emotion }: { emotion?: Emotion }) {
  const src = resolveEmotionAvatar(emotion);

  return (
    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-transparent md:h-14 md:w-14">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        draggable={false}
        className="absolute top-2 left-1/2 w-[150%] max-w-none -translate-x-1/2 object-top mix-blend-screen"
      />
    </div>
  );
}

function MessageMarkdown({ content }: { content: string }) {
  return (
    <div className="flex flex-col gap-2 break-words whitespace-pre-wrap leading-relaxed">
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-bold text-emerald-400">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-emerald-200/80">{children}</em>
          ),
          ul: ({ children }) => (
            <ul className="mb-2 list-disc space-y-1 pl-4">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2 list-decimal space-y-1 pl-4">{children}</ol>
          ),
          li: ({ children }) => <li>{children}</li>,
          code: ({ children, className }) =>
            className ? (
              <code className="my-1 block overflow-x-auto rounded-lg bg-black/50 p-2 text-xs text-emerald-100">
                {children}
              </code>
            ) : (
              <code className="rounded bg-black/40 px-1 py-0.5 text-emerald-300">
                {children}
              </code>
            ),
          pre: ({ children }) => (
            <pre className="mb-2 overflow-x-auto rounded-lg bg-black/50 p-2 text-xs">
              {children}
            </pre>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export function AiCommandBar() {
  const { user } = useSession();
  const { currency } = usePreferences();
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([QUANTUM_WELCOME]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  // Sessões persistidas (collection ChatSessions), $createdAt descendente.
  const [recentConversations, setRecentConversations] = useState<ChatSessionDocument[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  // Fila de persistência: serializa create/update p/ nunca criar duplicados.
  const persistChainRef = useRef<Promise<void>>(Promise.resolve());
  // Incrementado ao fechar/carregar outra conversa: saves antigos são ignorados.
  const conversationEpochRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>(AI_MODELS[0].id);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAiAvailable, setIsAiAvailable] = useState(true);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [iconFailed, setIconFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const avatarUrl = typeof user.prefs.avatarUrl === "string" ? user.prefs.avatarUrl : "";
  const initials = getInitials(user.name, user.email);
  const showChat = isExpanded && messages.length > 0 && isChatVisible;
  /** Snapshot financeiro para a Quantum.IA (saldo / assinaturas / metas). */
  const financialContextRef = useRef<FinancialContextPayload | null>(null);

  useEffect(() => {
    if (!isExpanded) {
      inputRef.current?.blur();
      return;
    }

    if (!isLoading) {
      inputRef.current?.focus();
    }

    if (messages.length > 0) {
      setIsChatVisible(true);
    }
  }, [isExpanded, messages.length, isLoading]);

  useEffect(() => {
    if (!isExpanded) return;

    // mousedown (não click!): ao selecionar um modelo, o onClick da opção
    // fecha o menu do AppSelect e desmonta o <li> clicado; quando esse
    // mesmo click chegava ao document, event.target já estava destacado
    // da árvore, `contains(target)` devolvia false e o chat inteiro
    // fechava como se fosse um clique fora. No mousedown o alvo ainda
    // está montado, por isso a verificação é fiável. composedPath() é a
    // segunda linha de defesa (inclui o caminho capturado no dispatch).
    function handleClickOutside(event: MouseEvent) {
      const container = containerRef.current;
      if (!container) return;
      if (
        event.composedPath().includes(container) ||
        container.contains(event.target as Node)
      ) {
        return;
      }
      setIsExpanded(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isExpanded]);

  useEffect(() => {
    if (!showChat) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, showChat, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      setPhraseIndex(0);
      return;
    }

    const intervalId = window.setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % loadingPhrases.length);
    }, 1800);

    return () => window.clearInterval(intervalId);
  }, [isLoading]);

  function setActiveSessionId(next: string | null) {
    sessionIdRef.current = next;
    setSessionId(next);
  }

  /** Insere/atualiza uma sessão na sidebar de imediato (otimista). */
  function upsertSessionInSidebar(session: ChatSessionDocument) {
    setRecentConversations((current) => {
      const without = current.filter((item) => item.$id !== session.$id);
      return [session, ...without];
    });
    setIsLoadingSessions(false);
  }

  /**
   * Refetch da lista. Se o Appwrite falhar (`null`), mantém o estado atual
   * para não apagar itens já mostrados via upsert otimista.
   */
  async function refreshChatSessions() {
    try {
      const documents = await listChatSessions(user.$id);
      if (documents === null) {
        console.warn(
          "[chat] listChatSessions falhou — a manter a lista local da sidebar.",
        );
        return null;
      }
      setRecentConversations(documents);
      return documents;
    } catch (error) {
      console.error("Falha ao listar sessões de chat:", error);
      return null;
    } finally {
      setIsLoadingSessions(false);
    }
  }

  // Fetch inicial + listener do custom event (sincroniza Chat → Sidebar).
  useEffect(() => {
    let active = true;
    setIsLoadingSessions(true);

    void listChatSessions(user.$id).then((documents) => {
      if (!active) return;
      if (documents !== null) setRecentConversations(documents);
      setIsLoadingSessions(false);
    });

    function onChatSessionsUpdated() {
      void refreshChatSessions();
    }

    window.addEventListener(CHAT_SESSIONS_UPDATED_EVENT, onChatSessionsUpdated);
    return () => {
      active = false;
      window.removeEventListener(
        CHAT_SESSIONS_UPDATED_EVENT,
        onChatSessionsUpdated,
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh fecha sobre user.$id
  }, [user.$id]);

  // Pré-carrega contexto financeiro; refresca ao expandir o chat.
  useEffect(() => {
    let active = true;
    void loadFinancialContext(user.$id).then((context) => {
      if (active) financialContextRef.current = context;
    });
    return () => {
      active = false;
    };
  }, [user.$id, isExpanded]);

  // Ao abrir o histórico, força refetch (sem limpar se falhar).
  useEffect(() => {
    if (!showHistory) return;
    void refreshChatSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHistory, user.$id]);

  /**
   * Persiste a conversa após o stream terminar (equivalente a onFinish).
   * Sem sessionId → createDocument + título automático.
   * Com sessionId → updateDocument com o array completo de mensagens.
   * Após sucesso: upsert otimista + evento para a sidebar refetch.
   */
  function persistConversation(conversation: StoredChatMessage[], epoch: number) {
    const run = persistChainRef.current
      .catch(() => {})
      .then(async () => {
        if (epoch !== conversationEpochRef.current) return;
        if (conversation.length === 0) return;

        console.log("Tentando salvar no Appwrite...", { messages: conversation });

        try {
          const currentSessionId = sessionIdRef.current;
          if (!currentSessionId) {
            const localTitle = fallbackChatTitle(conversation);
            const titlePromise = generateChatTitle(conversation);
            const created = await createChatSession({
              userId: user.$id,
              title: localTitle,
              messages: conversation,
            });
            if (epoch !== conversationEpochRef.current) return;

            // 1) Estado local imediato  2) marcar ativo  3) evento (histórico só abre no clique)
            upsertSessionInSidebar(created);
            setActiveSessionId(created.$id);
            notifyChatSessionsUpdated({ sessionId: created.$id });

            void titlePromise.then(async (aiTitle) => {
              if (
                !aiTitle ||
                aiTitle === localTitle ||
                sessionIdRef.current !== created.$id
              ) {
                return;
              }
              try {
                const updated = await updateChatSession(
                  created.$id,
                  conversation,
                  aiTitle,
                );
                upsertSessionInSidebar(updated);
                notifyChatSessionsUpdated({ sessionId: updated.$id });
              } catch (titleError) {
                console.error(
                  "Falha ao atualizar o título da sessão de chat:",
                  titleError,
                );
              }
            });
          } else {
            const updated = await updateChatSession(
              currentSessionId,
              conversation,
            );
            if (epoch !== conversationEpochRef.current) return;
            upsertSessionInSidebar(updated);
            notifyChatSessionsUpdated({ sessionId: updated.$id });
          }
        } catch (error) {
          console.error("Falha ao guardar a sessão de chat:", error);
          const details =
            error && typeof error === "object"
              ? {
                  message: (error as Error).message,
                  code: (error as { code?: number }).code,
                  type: (error as { type?: string }).type,
                }
              : { message: String(error) };
          console.error("[chat] detalhes do erro Appwrite:", details);
        }
      });
    persistChainRef.current = run;
    return run;
  }

  function stopGeneration() {
    abortControllerRef.current?.abort();
  }

  function handleLoadSession(session: ChatSessionDocument) {
    abortControllerRef.current?.abort();
    const stored = parseStoredMessages(session.messages) as ChatMessage[];
    conversationEpochRef.current += 1;
    setActiveSessionId(session.$id);
    setMessages([QUANTUM_WELCOME, ...stored]);
    setIsChatVisible(true);
    setIsExpanded(true);
    setShowHistory(false);
    setIsLoading(false);
  }

  function handleClose() {
    abortControllerRef.current?.abort();
    conversationEpochRef.current += 1;
    setActiveSessionId(null);
    setMessages([QUANTUM_WELCOME]);
    setIsChatVisible(true);
    setShowHistory(false);
    setIsRecording(false);
    setIsLoading(false);
    setIsExpanded(false);
    setQuery("");
  }

  function handleMinimize() {
    setIsChatVisible(false);
  }

  function handleDeleteHistoryItem(id: string) {
    setRecentConversations((current) => current.filter((item) => item.$id !== id));
    if (sessionIdRef.current === id) {
      conversationEpochRef.current += 1;
      setActiveSessionId(null);
    }
    void deleteChatSession(id).catch((error) => {
      console.error("Falha ao apagar a sessão de chat:", error);
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = sanitizeChatInput(query, MAX_CHAT_MESSAGE_CHARS);
    if (!value || isLoading) return;

    const epoch = conversationEpochRef.current;
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: value,
    };
    const assistantId = crypto.randomUUID();
    const nextMessages = [...messages, userMessage];
    const assistantPlaceholder: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      emotion: "thinking",
    };

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Fecha o histórico no mobile para a área de chat ficar visível.
    setShowHistory(false);
    setIsChatVisible(true);
    setMessages([...nextMessages, assistantPlaceholder]);
    setQuery("");
    setIsLoading(true);

    let rawStream = "";
    let finalAssistant: ChatMessage = assistantPlaceholder;

    try {
      // Dados reais do utilizador: refresca antes de cada pedido para respostas exactas.
      const financialContext =
        (await loadFinancialContext(user.$id).catch(() => null)) ??
        financialContextRef.current ?? {
          saldo: 0,
          assinaturas: [] as string[],
          metas: [] as string[],
        };
      financialContextRef.current = financialContext;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: toStoredMessages(nextMessages).map(({ role, content }) => ({
            role,
            content,
          })),
          model: selectedModel,
          currency: currency || "BRL",
          financialContext,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setIsAiAvailable(false);
        throw new Error(data?.error || "Não foi possível obter resposta da IA.");
      }

      if (!response.body) {
        throw new Error("Resposta sem corpo (stream indisponível).");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          let event: {
            type?: string;
            text?: string;
            response?: string;
            emotion?: Emotion;
            error?: string;
            raw?: string;
          };
          try {
            event = JSON.parse(trimmed) as typeof event;
          } catch {
            continue;
          }

          if (event.type === "delta" && typeof event.text === "string") {
            rawStream += event.text;
            const parsed = parseStreamingEmotion(rawStream);
            finalAssistant = {
              id: assistantId,
              role: "assistant",
              content: parsed.content,
              emotion: parsed.emotion,
            };
            setMessages([...nextMessages, finalAssistant]);
          } else if (event.type === "done") {
            const content =
              typeof event.response === "string"
                ? event.response
                : parseStreamingEmotion(rawStream).content;
            const emotion: Emotion =
              event.emotion && event.emotion in EMOTION_AVATARS
                ? event.emotion
                : parseStreamingEmotion(rawStream).emotion;
            finalAssistant = {
              id: assistantId,
              role: "assistant",
              content,
              emotion: emotion === "thinking" ? "neutral" : emotion,
            };
            setMessages([...nextMessages, finalAssistant]);
          } else if (event.type === "aborted") {
            if (typeof event.raw === "string" && event.raw) {
              rawStream = event.raw;
              const parsed = parseStreamingEmotion(rawStream);
              finalAssistant = {
                id: assistantId,
                role: "assistant",
                content: parsed.content || rawStream,
                emotion: parsed.emotion === "thinking" ? "neutral" : parsed.emotion,
              };
              setMessages([...nextMessages, finalAssistant]);
            }
          } else if (event.type === "error") {
            setIsAiAvailable(false);
            throw new Error(event.error || "Falha ao gerar resposta.");
          }
        }
      }

      setIsAiAvailable(true);

      const conversationForSave = finalAssistant.content.trim()
        ? [...nextMessages, finalAssistant]
        : nextMessages;

      await persistConversation(toStoredMessages(conversationForSave), epoch);
    } catch (error) {
      if (
        (error instanceof DOMException && error.name === "AbortError") ||
        (error instanceof Error && error.name === "AbortError")
      ) {
        if (finalAssistant.content.trim()) {
          setMessages([...nextMessages, finalAssistant]);
          await persistConversation(
            toStoredMessages([...nextMessages, finalAssistant]),
            epoch,
          );
        } else {
          setMessages(nextMessages);
          await persistConversation(toStoredMessages(nextMessages), epoch);
        }
      } else {
        setIsAiAvailable(false);
        const message =
          error instanceof Error
            ? error.message
            : "Ocorreu um erro ao contactar o assistente.";
        const errorMessage: ChatMessage = {
          id: assistantId,
          role: "assistant",
          content: `Desculpa, algo falhou: ${message}`,
          emotion: "error",
        };
        setMessages([...nextMessages, errorMessage]);
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setIsLoading(false);
    }
  }

  return (
    <div
      ref={containerRef}
      aria-expanded={isExpanded}
      className={cn(
        "fixed bottom-6 z-50 flex flex-col transition-all duration-300",
        isExpanded
          ? "left-1/2 -translate-x-1/2 items-center"
          : "right-6 items-end justify-end",
      )}
    >
      {/* ESTADO FECHADO: Apenas o Avatar flutuante */}
      {!isExpanded && (
        <button
          type="button"
          aria-label="Abrir Quantum.IA"
          onClick={() => setIsExpanded(true)}
          className="relative flex h-24 w-24 shrink-0 items-center justify-center transition-transform hover:scale-105 md:h-32 md:w-32"
        >
          <div
            aria-hidden="true"
            className="absolute top-1/2 left-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#064E3B]/60 blur-xl md:h-24 md:w-24"
          />
          {iconFailed ? (
            <DollarSign className="relative z-10 h-8 w-8 text-green-500" aria-hidden="true" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ROBOT_MAIN}
              alt="IA"
              draggable={false}
              className="relative z-10 h-full w-full object-contain mix-blend-screen"
              onError={() => setIconFailed(true)}
            />
          )}
        </button>
      )}

      {/* ESTADO ABERTO: Painel de mensagens + barra de input */}
      {isExpanded && (
        <div className="flex w-max max-w-[95vw] flex-col gap-2">
          {/* PAINEL DE MENSAGENS (Histórico) — empilhado acima da barra, sem absolute */}
          {showChat ? (
            <div className="pf-chat-rise flex max-h-[60vh] w-max max-w-[95vw] flex-col overflow-hidden rounded-2xl border border-[#0F291E] bg-[#070C09]">
            <div className="relative flex min-h-0 w-max max-w-[95vw] flex-1 flex-col overflow-hidden md:flex-row md:gap-4">
              <AnimatePresence initial={false}>
                {showHistory ? (
                  <motion.aside
                    key="history-panel"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="absolute inset-0 z-20 flex w-full shrink-0 flex-col overflow-hidden border-[#0F291E] bg-[#070C09] md:relative md:inset-auto md:z-auto md:w-[250px] lg:w-[300px] md:border-r md:bg-transparent"
                  >
                    <div className="flex h-full w-full flex-col gap-3 p-4">
                      <div className="flex items-center justify-between gap-2 md:block">
                        <p className="text-xs font-medium tracking-wide text-emerald-400/80 uppercase">
                          Conversas Recentes
                        </p>
                        <button
                          type="button"
                          aria-label="Fechar histórico"
                          onClick={() => setShowHistory(false)}
                          className="flex size-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-emerald-500/10 hover:text-emerald-300 md:hidden"
                        >
                          <X className="size-4" aria-hidden="true" />
                        </button>
                      </div>
                      <ul className="flex flex-col gap-1 overflow-y-auto">
                        {isLoadingSessions ? (
                          <li className="px-2.5 py-2 text-xs text-zinc-500">
                            A carregar conversas…
                          </li>
                        ) : recentConversations.length === 0 ? (
                          <li className="px-2.5 py-2 text-xs text-zinc-500">
                            Nenhuma conversa encontrada
                          </li>
                        ) : (
                          recentConversations.map((item) => {
                            const isActive = sessionId === item.$id;
                            return (
                              <li key={item.$id}>
                                <div
                                  className={`group flex w-full items-center justify-between rounded-lg p-2 text-sm transition-colors ${
                                    isActive
                                      ? "bg-emerald-500/15 text-emerald-50 ring-1 ring-emerald-500/40"
                                      : "text-zinc-300 hover:bg-emerald-500/10 hover:text-emerald-50"
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleLoadSession(item)}
                                    aria-current={isActive || undefined}
                                    className="flex min-w-0 flex-1 items-center gap-2 truncate text-left"
                                  >
                                    <MessageSquare
                                      className={`size-3.5 shrink-0 ${
                                        isActive
                                          ? "text-emerald-400"
                                          : "text-emerald-500/70"
                                      }`}
                                      aria-hidden="true"
                                    />
                                    <span className="truncate font-medium">
                                      {item.title}
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleDeleteHistoryItem(item.$id);
                                    }}
                                    className="ml-2 flex shrink-0 rounded p-1 text-zinc-400 opacity-100 transition-all md:opacity-0 md:group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400"
                                    title="Apagar conversa"
                                    aria-label={`Apagar conversa ${item.title}`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </li>
                            );
                          })
                        )}
                      </ul>
                    </div>
                  </motion.aside>
                ) : null}
              </AnimatePresence>

              <div className="flex min-h-0 w-[95vw] shrink-0 flex-col p-4 md:w-[600px] md:p-5">
                <header className="mb-4 flex shrink-0 items-center justify-between gap-2 border-b border-emerald-500/20 pb-3">
                  <button
                    type="button"
                    aria-label={showHistory ? "Ocultar histórico" : "Mostrar histórico"}
                    aria-pressed={showHistory}
                    onClick={() => setShowHistory((current) => !current)}
                    className={`flex size-8 items-center justify-center rounded-full transition-colors ${
                      showHistory
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "text-zinc-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                    }`}
                  >
                    <History className="size-4" aria-hidden="true" />
                  </button>

                  <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 sm:flex-row sm:justify-center sm:gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        title={
                          isAiAvailable
                            ? "Quantum.IA Online"
                            : "Quantum.IA Indisponível"
                        }
                        className={`size-2 shrink-0 rounded-full ${
                          isAiAvailable
                            ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                            : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                        }`}
                      />
                      <span className="text-sm font-semibold tracking-wide text-emerald-100">
                        Quantum.IA
                      </span>
                      <span className="sr-only">
                        {isAiAvailable ? "online" : "indisponível"}
                      </span>
                    </div>
                    <div className="relative flex items-center gap-1.5">
                      <Settings2
                        className="pointer-events-none size-3.5 text-emerald-500/50"
                        aria-hidden="true"
                      />
                      <AiModelSelect
                        models={AI_MODELS}
                        value={selectedModel}
                        disabled={isLoading}
                        onChange={setSelectedModel}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Minimizar chat"
                      onClick={handleMinimize}
                      className="flex size-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-emerald-500/10 hover:text-emerald-300"
                    >
                      <Minus className="size-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label="Fechar chat"
                      onClick={handleClose}
                      className="flex size-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-emerald-500/10 hover:text-emerald-300"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </header>

                <div
                  ref={transcriptRef}
                  role="log"
                  aria-live="polite"
                  aria-label="Conversa com a Quantum.IA"
                  className="scrollbar-hide flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4"
                >
                  <AnimatePresence initial={false}>
                    {messages.map((message) => {
                      const isUser = message.role === "user";
                      // Placeholder vazio enquanto espera o 1.º token — o bubble "thinking" cobre.
                      if (
                        !isUser &&
                        !message.content.trim() &&
                        isLoading &&
                        message.id === messages[messages.length - 1]?.id
                      ) {
                        return null;
                      }

                      return (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 15, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.96 }}
                          transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
                          className={`flex items-end gap-3 ${
                            isUser ? "flex-row-reverse" : "flex-row"
                          }`}
                        >
                          {isUser ? (
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-emerald-500/25 bg-emerald-600 text-xs font-semibold text-white md:h-12 md:w-12 md:text-sm">
                              {avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={avatarUrl}
                                  alt=""
                                  className="h-full w-full rounded-full object-cover"
                                />
                              ) : (
                                initials
                              )}
                            </span>
                          ) : (
                            <AssistantAvatar emotion={message.emotion} />
                          )}

                          <div
                            className={`text-sm md:text-base ${
                              isUser
                                ? "max-w-[85%] rounded-2xl rounded-br-none bg-emerald-500/10 px-4 py-3 text-right whitespace-pre-wrap break-words leading-relaxed text-zinc-100"
                                : "max-w-[85%] rounded-2xl rounded-bl-none border border-emerald-500/10 bg-black/40 px-4 py-3 text-left text-emerald-50"
                            }`}
                          >
                            {isUser ? (
                              message.content
                            ) : (
                              <>
                                <MessageMarkdown content={message.content} />
                                {isLoading &&
                                message.id === messages[messages.length - 1]?.id ? (
                                  <span
                                    className="ml-0.5 inline-block animate-pulse text-emerald-400"
                                    aria-hidden="true"
                                  >
                                    _
                                  </span>
                                ) : null}
                              </>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}

                    {isLoading &&
                    !(
                      messages[messages.length - 1]?.role === "assistant" &&
                      messages[messages.length - 1]?.content.trim()
                    ) ? (
                      <motion.div
                        key="thinking"
                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
                        className="flex items-end gap-3"
                      >
                        <AssistantAvatar emotion="thinking" />
                        <div className="max-w-[85%] rounded-2xl rounded-bl-none border border-emerald-500/10 bg-black/40 px-4 py-3 font-mono text-left text-sm text-emerald-100/90 md:text-base">
                          {loadingPhrases[phraseIndex]}
                          <span
                            className="ml-0.5 inline-block animate-pulse text-emerald-400"
                            aria-hidden="true"
                          >
                            _
                          </span>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                  <div ref={messagesEndRef} aria-hidden="true" className="h-px w-full shrink-0" />
                </div>
              </div>
            </div>
          </div>
          ) : null}

          {/* Avatar e Input lado a lado (Flexbox real) */}
          <form
            onSubmit={handleSubmit}
            className={cn(
              "flex items-center gap-3 md:gap-4",
              showChat ? "w-full" : "w-[95vw] md:w-[600px]",
            )}
          >
            {/* Avatar Lado a Lado (Atua como botão de fechar) */}
            <button
              type="button"
              aria-label="Recolher Quantum.IA"
              onClick={() => setIsExpanded(false)}
              className="relative flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center md:h-32 md:w-32"
            >
              <div
                aria-hidden="true"
                className="absolute top-1/2 left-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#064E3B]/60 blur-xl md:h-24 md:w-24"
              />
              {iconFailed ? (
                <DollarSign className="relative z-10 h-8 w-8 text-green-500" aria-hidden="true" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ROBOT_MAIN}
                  alt="IA"
                  draggable={false}
                  className="relative z-10 h-full w-full object-contain mix-blend-screen"
                  onError={() => setIconFailed(true)}
                />
              )}
            </button>

            {/* Input Field e Botões */}
            <div className="relative flex h-14 flex-1 items-center rounded-full md:h-16">
              <input
                ref={inputRef}
                value={query}
                onChange={(event) =>
                  setQuery(event.target.value.slice(0, MAX_CHAT_MESSAGE_CHARS))
                }
                type="text"
                maxLength={MAX_CHAT_MESSAGE_CHARS}
                aria-label="Hackeie as suas finanças com a Quantum.IA"
                disabled={isLoading}
                placeholder="Hackeie as suas finanças com a Quantum.IA..."
                className="h-full w-full rounded-full border border-[#0F291E] bg-[#070C09] pr-[88px] pl-5 text-white placeholder:text-gray-500 transition-colors focus:border-[#0F291E] focus:outline-none"
              />

              <div className="absolute right-2 flex items-center gap-2">
                <button
                  type="button"
                  aria-label={isRecording ? "Parar gravação" : "Gravar áudio"}
                  aria-pressed={isRecording}
                  disabled={isLoading}
                  onClick={() => setIsRecording((current) => !current)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-transparent text-green-500 transition-colors hover:bg-green-500/10"
                >
                  <AudioLines className="size-4 shrink-0" aria-hidden="true" />
                </button>

                {isLoading ? (
                  <button
                    type="button"
                    aria-label="Parar geração"
                    onClick={stopGeneration}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-none bg-[#10B981] text-black transition-colors hover:bg-[#059669]"
                  >
                    <Square className="size-3.5 shrink-0 fill-current" aria-hidden="true" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    aria-label="Enviar"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-none bg-[#10B981] text-black transition-colors hover:bg-[#059669]"
                  >
                    <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
