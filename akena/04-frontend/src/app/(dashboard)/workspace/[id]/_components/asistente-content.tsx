// Next.js equivalent: app/(dashboard)/workspace/[id]/_components/asistente-content.tsx
// Pantalla completa tipo ChatGPT — historial de conversaciones + chat activo.
// Comparte el backend de conversaciones con el chatbot flotante (chat-store).
"use client";


import { useState, useEffect, useRef, useCallback, type CSSProperties } from "react";
import {
  MessageSquarePlus, Bot, User, Send, Sparkles,
  MessageSquare, Trash2, Clock, Lock, Loader2,
} from "lucide-react";
import {
  getConversations,
  createConversation,
  updateConversation,
  generateBotResponseAsync,
  getMockUser,
  CHAT_UPDATE_EVENT,
  type Conversation,
} from "../../../_components/chat-store";
import { useWorkspaceReadonly } from "./workspace-readonly-context";

// ─── Props ─────────────────────────────────────────────────────────────────────

interface AsistenteContentProps {
  oppId: string;
  oppName: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function EmptyChat({ onNewChat }: { onNewChat: () => void }) {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center"
      style={{ gap: "var(--space-4)", padding: "var(--space-10)" }}
    >
      <div
        className="bg-muted flex items-center justify-center"
        style={{ width: "56px", height: "56px", borderRadius: "50%", border: "1px solid var(--border)" }}
      >
        <Sparkles size={24} style={{ color: "var(--primary)" }} />
      </div>
      <div style={{ textAlign: "center", maxWidth: "360px" }}>
        <p
          style={{
            fontSize: "var(--text-base)",
            fontFamily: "inherit",
            marginBottom: "6px",
          }}
        >
          Asistente de Soporte
        </p>
        <p
          className="text-muted-foreground"
          style={{ fontSize: "var(--text-sm)", fontFamily: "inherit", lineHeight: "1.6" }}
        >
          Realiza consultas sobre el pliego, la estrategia de oferta, el equipo
          y cualquier aspecto de la licitación. Las respuestas se basan en la
          documentación de la oportunidad.
        </p>
      </div>
      <button
        onClick={onNewChat}
        className="bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center gap-2"
        style={{
          padding: "9px 18px",
          borderRadius: "var(--radius-button)",
          border: "none",
          cursor: "pointer",
          fontSize: "var(--text-sm)",
          fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
          fontFamily: "inherit",
          marginTop: "4px",
        }}
      >
        <MessageSquarePlus size={15} />
        Iniciar nueva conversación
      </button>
    </div>
  );
}

// ─── Conversation list item ────────────────────────────────────────────────────

function ConvItem({
  conv,
  isActive,
  onSelect,
}: {
  conv: Conversation;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="w-full text-left transition-colors"
      style={{
        padding: "10px 14px",
        background: isActive ? "var(--sidebar-primary)" : "none",
        color: isActive ? "var(--sidebar-primary-foreground)" : "var(--sidebar-foreground)",
        border: "none",
        borderBottom: "1px solid var(--sidebar-border)",
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      <div className="flex items-start gap-2.5">
        <MessageSquare
          size={12}
          style={{
            flexShrink: 0,
            marginTop: "2px",
            color: isActive ? "var(--sidebar-primary-foreground)" : "var(--muted-foreground)",
            opacity: isActive ? 1 : 0.7,
          }}
        />
        <div style={{ minWidth: 0, flex: 1 }}>
          <p
            style={{
              fontSize: "var(--text-xs)",
              fontWeight: isActive
                ? ("var(--font-weight-semibold)" as CSSProperties["fontWeight"])
                : ("var(--font-weight-normal)" as CSSProperties["fontWeight"]),
              fontFamily: "inherit",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              marginBottom: "2px",
            }}
          >
            {conv.title || "Nueva conversación"}
          </p>
          <p
            style={{
              fontSize: "var(--text-3xs)",
              fontFamily: "inherit",
              color: isActive ? "var(--sidebar-primary-foreground)" : "var(--muted-foreground)",
              opacity: isActive ? 0.8 : 1,
              display: "flex",
              alignItems: "center",
              gap: "3px",
            }}
          >
            <Clock size={9} />
            {formatDate(conv.updatedAt)}
          </p>
        </div>
      </div>
    </button>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function AppAsistenteContent({ oppId, oppName }: AsistenteContentProps) {
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    getConversations(oppId)
  );
  const [activeId, setActiveId] = useState<string | null>(
    () => getConversations(oppId)[0]?.id ?? null
  );
  const { isReadOnly } = useWorkspaceReadonly();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const user = getMockUser();

  const activeConv = conversations.find((c) => c.id === activeId) ?? null;

  // ── Sync from store (floating chat updates) ──
  const refreshConversations = useCallback(() => {
    const latest = getConversations(oppId);
    setConversations(latest);
    // If no active conversation, select the first
    setActiveId((prev) => {
      if (!prev) return latest[0]?.id ?? null;
      // If the current active still exists keep it; otherwise pick first
      const stillExists = latest.some((c) => c.id === prev);
      return stillExists ? prev : (latest[0]?.id ?? null);
    });
  }, [oppId]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ oppId: string }>).detail;
      if (detail.oppId === oppId) refreshConversations();
    };
    window.addEventListener(CHAT_UPDATE_EVENT, handler);
    return () => window.removeEventListener(CHAT_UPDATE_EVENT, handler);
  }, [oppId, refreshConversations]);

  // ── Scroll to bottom ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv?.messages]);

  // ── New conversation ──
  const handleNewChat = useCallback(() => {
    const newConv = createConversation(oppId);
    setConversations(getConversations(oppId));
    setActiveId(newConv.id);
  }, [oppId]);

  // ── Send message ──
  const handleSend = useCallback(async () => {
    const currentConv = activeConv ?? (() => {
      const c = createConversation(oppId);
      setConversations(getConversations(oppId));
      setActiveId(c.id);
      return c;
    })();
    if (!input.trim() || isLoading) return;

    const userMsg = {
      id: `msg-${Date.now()}`,
      role: "user" as const,
      content: input.trim(),
      timestamp: Date.now(),
    };

    const updatedConv: Conversation = {
      ...currentConv,
      title: currentConv.title === "Nueva conversación" ? input.trim().slice(0, 48) : currentConv.title,
      messages: [...currentConv.messages, userMsg],
    };

    updateConversation(oppId, updatedConv);
    setConversations(getConversations(oppId));
    setInput("");
    setIsLoading(true);

    const sessionId = `${user.id}:${oppId}:${currentConv.id}`;
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const responseText = await generateBotResponseAsync(
        userMsg.content,
        oppName,
        sessionId,
        abortRef.current.signal,
        oppId,
      );
      const botMsg = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant" as const,
        content: responseText,
        timestamp: Date.now(),
      };
      const withBot: Conversation = {
        ...updatedConv,
        messages: [...updatedConv.messages, botMsg],
      };
      updateConversation(oppId, withBot);
      setConversations(getConversations(oppId));
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      const errMsg = {
        id: `msg-err-${Date.now()}`,
        role: "assistant" as const,
        content: "No he podido obtener respuesta del asistente. Por favor, inténtalo de nuevo.",
        timestamp: Date.now(),
      };
      const withErr: Conversation = { ...updatedConv, messages: [...updatedConv.messages, errMsg] };
      updateConversation(oppId, withErr);
      setConversations(getConversations(oppId));
    } finally {
      setIsLoading(false);
    }
  }, [input, activeConv, isLoading, oppId, oppName, user.id]);

  // ─── Layout height: 100vh − header − subheader ────────────────────────────────
  const CONTENT_H = "calc(100vh - var(--header-height) - var(--subheader-height))";

  return (
    <div
      className="flex"
      style={{
        height: CONTENT_H,
        overflow: "hidden",
        fontFamily: "inherit",
      }}
    >
      {/* ── Left column: conversation list ── */}
      <div
        className="bg-sidebar border-r border-sidebar-border flex flex-col flex-shrink-0"
        style={{ width: "236px", overflow: "hidden" }}
      >
        {/* List header */}
        <div
          className="border-b border-sidebar-border flex-shrink-0"
          style={{ padding: "14px 14px 10px" }}
        >
          <p
            style={{
              fontSize: "var(--text-2xs)",
              fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
              letterSpacing: "0.05em",
              color: "var(--muted-foreground)",
              fontFamily: "inherit",
              marginBottom: "10px",
            }}
          >
            CONVERSACIONES
          </p>
          <button
            onClick={handleNewChat}
            disabled={isReadOnly}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            style={{
              padding: "7px 12px",
              borderRadius: "var(--radius-button)",
              border: "none",
              cursor: isReadOnly ? "not-allowed" : "pointer",
              fontSize: "var(--text-xs)",
              fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
              fontFamily: "inherit",
              opacity: isReadOnly ? 0.5 : 1,
            }}
          >
            <MessageSquarePlus size={13} />
            Nuevo chat
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center"
              style={{ padding: "32px 16px", gap: "8px" }}
            >
              <MessageSquare size={20} style={{ color: "var(--muted-foreground)", opacity: 0.5 }} />
              <p
                className="text-muted-foreground"
                style={{
                  fontSize: "var(--text-xs)",
                  textAlign: "center",
                  fontFamily: "inherit",
                  lineHeight: "1.5",
                }}
              >
                Aún no hay conversaciones.
                <br />
                Crea un nuevo chat para empezar.
              </p>
            </div>
          ) : (
            conversations.map((c) => (
              <ConvItem
                key={c.id}
                conv={c}
                isActive={activeId === c.id}
                onSelect={() => setActiveId(c.id)}
              />
            ))
          )}
        </div>

        {/* User badge */}
        <div
          className="border-t border-sidebar-border flex items-center gap-2 flex-shrink-0"
          style={{ padding: "10px 14px" }}
        >
          <div
            className="bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0"
            style={{ width: "24px", height: "24px", borderRadius: "50%", fontSize: "10px" }}
          >
            {user.name.charAt(0)}
          </div>
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                fontSize: "var(--text-xs)",
                fontFamily: "inherit",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user.name}
            </p>
            <p
              className="text-muted-foreground"
              style={{ fontSize: "var(--text-3xs)", fontFamily: "inherit" }}
            >
              Solo tú ves estas conversaciones
            </p>
          </div>
        </div>
      </div>

      {/* ── Right column: active chat ── */}
      <div className="flex-1 flex flex-col bg-background overflow-hidden">
        {!activeConv ? (
          <EmptyChat onNewChat={handleNewChat} />
        ) : (
          <>
            {/* Chat header */}
            <div
              className="bg-card border-b border-border flex items-center justify-between flex-shrink-0"
              style={{ padding: "12px 20px" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0"
                  style={{ width: "30px", height: "30px", borderRadius: "50%" }}
                >
                  <Bot size={14} />
                </div>
                <div>
                  <p
                    style={{
                      fontSize: "var(--text-sm)",
                      fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                      fontFamily: "inherit",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: "480px",
                    }}
                  >
                    {activeConv.title === "Nueva conversación"
                      ? "Asistente Akena"
                      : activeConv.title}
                  </p>
                  <p
                    className="text-muted-foreground"
                    style={{ fontSize: "var(--text-3xs)", fontFamily: "inherit" }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        width: "5px",
                        height: "5px",
                        borderRadius: "50%",
                        background: "var(--online-indicator)",
                        marginRight: "4px",
                        verticalAlign: "middle",
                      }}
                    />
                    En línea · Contexto: {oppName}
                  </p>
                </div>
              </div>
              <p
                className="text-muted-foreground"
                style={{ fontSize: "var(--text-2xs)", fontFamily: "inherit" }}
              >
                Creado el {formatDate(activeConv.createdAt)}
              </p>
            </div>

            {/* Messages area */}
            <div
              className="flex-1 overflow-y-auto"
              style={{ padding: "20px 24px", background: "var(--background)" }}
            >
              <div className="flex flex-col gap-5" style={{ maxWidth: "720px", margin: "0 auto" }}>
                {activeConv.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`flex-shrink-0 flex items-center justify-center ${
                        msg.role === "assistant"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted border border-border"
                      }`}
                      style={{ width: "30px", height: "30px", borderRadius: "50%", marginTop: "2px" }}
                    >
                      {msg.role === "assistant" ? (
                        <Bot size={13} />
                      ) : (
                        <User size={13} className="text-muted-foreground" />
                      )}
                    </div>

                    {/* Bubble + timestamp */}
                    <div
                      className="flex flex-col"
                      style={{
                        maxWidth: "78%",
                        alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                        gap: "4px",
                      }}
                    >
                      <div
                        style={{
                          padding: "11px 14px",
                          borderRadius:
                            msg.role === "assistant"
                              ? "0 var(--radius) var(--radius) var(--radius)"
                              : "var(--radius) 0 var(--radius) var(--radius)",
                          background:
                            msg.role === "assistant" ? "var(--muted)" : "var(--primary)",
                          color:
                            msg.role === "assistant"
                              ? "var(--foreground)"
                              : "var(--primary-foreground)",
                          fontSize: "var(--text-sm)",
                          lineHeight: "1.6",
                          fontFamily: "inherit",
                        }}
                      >
                        {msg.content}
                      </div>
                      <span
                        style={{
                          fontSize: "var(--text-3xs)",
                          color: "var(--muted-foreground)",
                          fontFamily: "inherit",
                        }}
                      >
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Quick chips */}
            <div
              className="border-t border-border bg-card flex items-center gap-2 flex-shrink-0"
              style={{ padding: "8px 20px", overflowX: "auto", scrollbarWidth: "none" }}
            >
              {[
                "Analizar pliego",
                "Estrategia oferta",
                "Win Themes",
                "Equipo propuesto",
                "Oferta económica",
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="text-primary border border-primary whitespace-nowrap hover:bg-primary hover:text-primary-foreground transition-all flex-shrink-0"
                  style={{
                    padding: "3px 10px",
                    borderRadius: "var(--radius-chip)",
                    fontSize: "var(--text-3xs)",
                    fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                    background: "transparent",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Input area */}
            <div
              className="border-t border-border bg-card flex items-end gap-3 flex-shrink-0"
              style={{ padding: "12px 20px" }}
            >
              {isReadOnly ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", background: "var(--muted)", borderRadius: "var(--radius-banner)", border: "1px solid var(--border)" }}>
                  <Lock size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
                    El asistente está deshabilitado en modo histórico.
                  </span>
                </div>
              ) : (
                <>
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Escribe tu consulta... (Intro para enviar, Shift+Intro para nueva línea)"
                    rows={2}
                    className="flex-1 bg-muted border border-border focus:outline-none focus:border-primary resize-none"
                    style={{
                      padding: "10px 13px",
                      borderRadius: "var(--radius-input)",
                      fontSize: "var(--text-sm)",
                      fontFamily: "inherit",
                      lineHeight: "1.5",
                    }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center justify-center flex-shrink-0"
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "var(--radius-button)",
                      border: "none",
                      cursor: input.trim() && !isLoading ? "pointer" : "default",
                      opacity: input.trim() && !isLoading ? 1 : 0.45,
                      marginBottom: "2px",
                    }}
                  >
                    {isLoading
                      ? <Loader2 size={15} className="animate-spin" />
                      : <Send size={15} />}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}