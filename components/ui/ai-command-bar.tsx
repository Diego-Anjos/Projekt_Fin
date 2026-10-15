"use client";

import { useSession } from "@/components/require-session";
import { ArrowRight, DollarSign } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const mockReply =
  "Recebi a sua mensagem. Em breve consigo consultar as suas finanças e registar movimentos por aqui.";

function getInitials(name: string, email: string) {
  const source = name.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

export function AiCommandBar() {
  const { user } = useSession();
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [iconFailed, setIconFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const avatarUrl = typeof user.prefs.avatarUrl === "string" ? user.prefs.avatarUrl : "";
  const initials = getInitials(user.name, user.email);
  const showChat = isExpanded && messages.length > 0;

  useEffect(() => {
    if (!isExpanded) {
      inputRef.current?.blur();
      return;
    }

    inputRef.current?.focus();
  }, [isExpanded]);

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
    const transcript = transcriptRef.current;
    if (!transcript) return;
    transcript.scrollTop = transcript.scrollHeight;
  }, [messages, showChat]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: value,
    };
    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: mockReply,
    };

    setMessages((current) => [...current, userMessage, assistantMessage]);
    setQuery("");
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
          isExpanded ? "w-[95%] max-w-lg md:max-w-2xl" : "w-14"
        }`}
      >
        {showChat ? (
          <div className="absolute inset-x-0 bottom-full z-30 mb-4 md:mb-12">
            <div
              ref={transcriptRef}
              role="log"
              aria-live="polite"
              aria-label="Conversa com o Projekt Fin"
              className="pf-chat-rise scrollbar-hide flex max-h-[60vh] w-full flex-col gap-4 overflow-y-auto rounded-2xl border border-emerald-500/20 bg-[#0a0f0d]/90 p-4 shadow-2xl backdrop-blur-xl"
            >
              {messages.map((message) =>
                message.role === "user" ? (
                  <div key={message.id} className="flex items-end justify-end gap-2">
                    <p className="max-w-[80%] rounded-2xl rounded-tr-sm bg-emerald-900/20 px-3.5 py-2.5 text-sm break-words text-zinc-100">
                      {message.content}
                    </p>
                    <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-emerald-500/20 bg-emerald-600 text-[10px] font-semibold text-white">
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarUrl} alt="" className="size-full object-cover" />
                      ) : (
                        initials
                      )}
                    </span>
                  </div>
                ) : (
                  <div key={message.id} className="flex items-start gap-2.5">
                    <span className="relative size-8 shrink-0 overflow-hidden rounded-full bg-black ring-1 ring-emerald-400/30">
                      <img
                        src="/projekt-fin-robo-aura-verde.gif"
                        alt=""
                        draggable={false}
                        className="absolute top-0 left-1/2 h-14 w-14 max-w-none -translate-x-1/2 object-cover object-[center_22%]"
                      />
                    </span>
                    <p className="max-w-[80%] pt-1 text-sm break-words text-emerald-50">
                      {message.content}
                    </p>
                  </div>
                ),
              )}
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
              ? "gap-2 pr-2 pl-24 shadow-[0_0_28px_rgba(16,185,129,0.22)] md:pl-28 lg:pl-32"
              : "cursor-pointer justify-center hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          }`}
        >
          {iconFailed ? (
            <DollarSign
              aria-label="AI Command"
              className="h-8 w-8 shrink-0 cursor-pointer text-emerald-400 transition-all hover:scale-110"
              onClick={(event) => {
                event.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            />
          ) : (
            <img
              src="/projekt-fin-robo-aura-verde.gif"
              alt="AI Command"
              draggable={false}
              className={`pointer-events-auto absolute z-10 h-20 w-20 max-w-none cursor-pointer object-contain mix-blend-screen transition-transform duration-300 hover:scale-105 md:h-28 md:w-28 lg:h-32 lg:w-32 ${
                isExpanded
                  ? "top-1/2 left-10 -translate-x-1/2 -translate-y-1/2 md:left-8 md:-translate-y-[55%]"
                  : "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 md:-translate-y-[55%]"
              }`}
              onClick={(event) => {
                event.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              onError={() => setIconFailed(true)}
            />
          )}

          <div
            className={`grid min-w-0 overflow-hidden transition-[grid-template-columns] duration-500 ease-in-out ${
              isExpanded ? "flex-1 grid-cols-[1fr]" : "w-0 grid-cols-[0fr]"
            }`}
          >
            <div
              className={`flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap transition-opacity ease-in-out ${
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
                placeholder="Pergunte ao Projekt Fin ou registre um gasto..."
                aria-label="Pergunte ao Projekt Fin ou registre um gasto"
                tabIndex={isExpanded ? 0 : -1}
                className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
              />
              <button
                type="submit"
                aria-label="Enviar"
                tabIndex={isExpanded ? 0 : -1}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition-colors hover:bg-emerald-500"
              >
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
