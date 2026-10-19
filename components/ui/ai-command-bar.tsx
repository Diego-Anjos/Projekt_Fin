"use client";

import { useSession } from "@/components/require-session";
import { usePreferences } from "@/contexts/preferences-context";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  AudioLines,
  DollarSign,
  History,
  Loader2,
  MessageSquare,
  Minus,
  Settings2,
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
  { id: "gemini-3.8-flash", label: "3.8 Flash" },
  { id: "gemini-3.6-flash", label: "3.6 Flash" },
  { id: "gemini-3.1-pro", label: "3.1 Pro" },
] as const;

type HistoryItem = {
  id: string;
  title: string;
};

const INITIAL_HISTORY: HistoryItem[] = [
  { id: "h1", title: "Análise de Gastos" },
  { id: "h2", title: "Novo Salário" },
  { id: "h3", title: "Poupança Mensal" },
];

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
  const [recentConversations, setRecentConversations] =
    useState<HistoryItem[]>(INITIAL_HISTORY);
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

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsExpanded(false);
      }
    }

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
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

  function handleClose() {
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
    setRecentConversations((current) => current.filter((item) => item.id !== id));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    if (!value || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: value,
    };
    const nextMessages = [...messages, userMessage];

    setIsChatVisible(true);
    setMessages(nextMessages);
    setQuery("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages
            .filter((message) => message.id !== QUANTUM_WELCOME.id)
            .map(({ role, content }) => ({ role, content })),
          model: selectedModel,
          currency: currency || "BRL",
        }),
      });

      const data = (await response.json()) as {
        response?: string;
        emotion?: Emotion;
        error?: string;
      };

      if (!response.ok || !data.response) {
        setIsAiAvailable(false);
        throw new Error(data.error || "Não foi possível obter resposta da IA.");
      }

      const emotion: Emotion =
        data.emotion && data.emotion in EMOTION_AVATARS
          ? data.emotion
          : "neutral";

      setIsAiAvailable(true);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.response as string,
          emotion,
        },
      ]);
    } catch (error) {
      setIsAiAvailable(false);
      const message =
        error instanceof Error
          ? error.message
          : "Ocorreu um erro ao contactar o assistente.";
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Desculpa, algo falhou: ${message}`,
          emotion: "error",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      className={`pointer-events-none fixed z-20 flex ${
        isExpanded
          ? "inset-x-0 bottom-4 justify-center md:bottom-8"
          : "right-4 bottom-4 justify-end md:right-8 md:bottom-8"
      }`}
    >
      <div
        ref={containerRef}
        aria-expanded={isExpanded}
        className={`pointer-events-auto relative transition-all duration-500 ease-in-out ${
          isExpanded
            ? showHistory
              ? "w-[95%] max-w-lg md:max-w-4xl"
              : "w-[95%] max-w-lg md:max-w-2xl"
            : "w-14"
        }`}
      >
        {showChat ? (
          <div className="absolute inset-x-0 bottom-full z-30 mb-4 md:mb-12">
            <div className="pf-chat-rise flex max-h-[60vh] w-full overflow-hidden rounded-2xl border border-emerald-500/20 bg-[#0a0f0d]/90 shadow-2xl backdrop-blur-xl">
              <AnimatePresence initial={false}>
                {showHistory ? (
                  <motion.aside
                    key="history-panel"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "auto", opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="hidden shrink-0 overflow-hidden border-r border-emerald-500/20 md:block"
                  >
                    <div className="flex h-full w-48 flex-col gap-3 p-4 md:w-56 lg:w-64">
                      <p className="text-xs font-medium tracking-wide text-emerald-400/80 uppercase">
                        Conversas Recentes
                      </p>
                      <ul className="flex flex-col gap-1">
                        {recentConversations.length === 0 ? (
                          <li className="px-2.5 py-2 text-xs text-zinc-500">
                            Nenhuma conversa recente.
                          </li>
                        ) : (
                          recentConversations.map((item) => (
                            <li key={item.id}>
                              <div className="group flex w-full items-center justify-between rounded-lg p-2 text-sm text-zinc-300 transition-colors hover:bg-emerald-500/10 hover:text-emerald-50">
                                <button
                                  type="button"
                                  className="flex min-w-0 flex-1 items-center gap-2 truncate text-left"
                                >
                                  <MessageSquare
                                    className="size-3.5 shrink-0 text-emerald-500/70"
                                    aria-hidden="true"
                                  />
                                  <span className="truncate">{item.title}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleDeleteHistoryItem(item.id);
                                  }}
                                  className="ml-2 flex shrink-0 rounded p-1 text-zinc-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400"
                                  title="Apagar conversa"
                                  aria-label={`Apagar conversa ${item.title}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  </motion.aside>
                ) : null}
              </AnimatePresence>

              <div className="flex min-w-0 flex-1 flex-col p-4 md:p-5">
                <header className="mb-4 flex items-center justify-between gap-2 border-b border-emerald-500/20 pb-3">
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
                      <label htmlFor="ai-model-select" className="sr-only">
                        Modelo de IA
                      </label>
                      <select
                        id="ai-model-select"
                        value={selectedModel}
                        disabled={isLoading}
                        onChange={(event) => setSelectedModel(event.target.value)}
                        className="cursor-pointer appearance-none rounded-full border border-emerald-500/20 bg-white/5 py-1.5 pr-7 pl-3 text-xs font-medium text-emerald-100 outline-none backdrop-blur-sm transition-colors hover:border-emerald-500/40 hover:bg-white/10 focus:border-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                      >
                        {AI_MODELS.map((model) => (
                          <option
                            key={model.id}
                            value={model.id}
                            className="bg-[#0a0f0d] text-zinc-100"
                          >
                            {model.label}
                          </option>
                        ))}
                      </select>
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
                  className="scrollbar-hide flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto"
                >
                  <AnimatePresence initial={false}>
                    {messages.map((message) => {
                      const isUser = message.role === "user";

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
                              <MessageMarkdown content={message.content} />
                            )}
                          </div>
                        </motion.div>
                      );
                    })}

                    {isLoading ? (
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
        <form
          onSubmit={handleSubmit}
          onClick={() => {
            if (!isExpanded) setIsExpanded(true);
          }}
          className={`relative flex h-14 w-full items-center rounded-full border border-emerald-500/40 bg-[#0a0f0d]/90 backdrop-blur-xl transition-all duration-500 ease-in-out ${
            isExpanded
              ? "gap-2 pr-2 pl-1 shadow-[0_0_28px_rgba(16,185,129,0.22)]"
              : "cursor-pointer justify-center hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          }`}
        >
          <div
            role="button"
            tabIndex={0}
            aria-label="AI Command"
            className="group relative flex h-14 w-14 flex-shrink-0 cursor-pointer items-center justify-center"
            onClick={(event) => {
              event.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                setIsExpanded((current) => !current);
              }
            }}
          >
            {iconFailed ? (
              <DollarSign
                className="h-8 w-8 text-emerald-400 transition-transform group-hover:scale-110"
                aria-hidden="true"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ROBOT_MAIN}
                alt=""
                draggable={false}
                className="pointer-events-none absolute top-1/2 left-1/2 h-32 w-32 max-w-none -translate-x-1/2 -translate-y-[55%] object-contain mix-blend-screen transition-transform duration-300 group-hover:scale-110"
                onError={() => setIconFailed(true)}
              />
            )}
          </div>

          <div
            className={`grid min-w-0 overflow-hidden transition-[grid-template-columns] duration-500 ease-in-out ${
              isExpanded ? "flex-1 grid-cols-[1fr]" : "w-0 grid-cols-[0fr]"
            }`}
          >
            <div
              className={`flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap transition-opacity ease-in-out ${
                isExpanded
                  ? "opacity-100 delay-200 duration-300"
                  : "pointer-events-none opacity-0 duration-150"
              }`}
            >
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                type="text"
                placeholder="Hackeie as suas finanças com a Quantum.IA..."
                aria-label="Hackeie as suas finanças com a Quantum.IA"
                disabled={isLoading}
                tabIndex={isExpanded ? 0 : -1}
                className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-500 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <button
                type="button"
                aria-label={isRecording ? "Parar gravação" : "Gravar áudio"}
                aria-pressed={isRecording}
                disabled={isLoading}
                tabIndex={isExpanded ? 0 : -1}
                onClick={(event) => {
                  event.stopPropagation();
                  setIsRecording((current) => !current);
                }}
                className={`flex size-8 shrink-0 items-center justify-center rounded-full p-2 transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                  isRecording
                    ? "bg-emerald-500/25 text-emerald-300 ring-1 ring-emerald-400/50"
                    : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                }`}
              >
                <AudioLines className="size-4" aria-hidden="true" />
              </button>
              <button
                type="submit"
                aria-label={isLoading ? "A processar" : "Enviar"}
                disabled={isLoading}
                tabIndex={isExpanded ? 0 : -1}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ArrowRight className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
