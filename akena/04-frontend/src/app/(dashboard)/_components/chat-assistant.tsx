// Next.js equivalent: app/(dashboard)/_components/chat-assistant.tsx
// Chatbot flotante redimensionable. Siempre abre una nueva conversación.
// Comparte backend de conversaciones con AppAsistenteContent via chat-store.
// NOTE: All colours use inline CSS vars — Tailwind colour utilities are NOT used
//       here because the design-system vars are rgba() values that Tailwind v4
"use client";
import { useState, useRef, useEffect, useCallback, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import {
  X, Send, Bot, User, Sparkles,
  Maximize2, Minimize2,
} from "lucide-react";
import {
  createConversation,
  updateConversation,
  generateBotResponseAsync,
  getMockUser,
  type Conversation,
} from "./chat-store";

// ─── Resize constants ──────────────────────────────────────────────────────────

const MIN_W = 360;
const MIN_H = 480;

function clampSize(w: number, h: number) {
  const maxW = Math.floor(window.innerWidth * 0.68);
  const maxH = Math.floor(window.innerHeight * 0.68);
  return {
    w: Math.max(MIN_W, Math.min(maxW, w)),
    h: Math.max(MIN_H, Math.min(maxH, h)),
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface AppChatAssistantProps {
  oppId?: string;
  oppName?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AppChatAssistant({
  oppId = "GLOBAL",
  oppName = "esta oportunidad",
}: AppChatAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [conv, setConv] = useState<Conversation | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [size, setSize] = useState({ w: MIN_W, h: MIN_H });
  const [isExpanded, setIsExpanded] = useState(false);
  const prevSize = useRef({ w: MIN_W, h: MIN_H });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const _user = getMockUser();

  // ── Scroll to bottom on new messages ──
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [conv?.messages, isOpen]);

  // ── Open: always create new conversation ──
  const handleOpen = useCallback(() => {
    const newConv = createConversation(oppId);
    setConv(newConv);
    setIsOpen(true);
  }, [oppId]);

  const handleClose = useCallback(() => {
    abortRef.current?.abort();
    setIsOpen(false);
    setConv(null);
    setInput("");
    setIsLoading(false);
  }, []);

  // ── Send message ──
  const handleSend = useCallback(async () => {
    if (!input.trim() || !conv || isLoading) return;

    const userMsg = {
      id: `msg-${Date.now()}`,
      role: "user" as const,
      content: input.trim(),
      timestamp: Date.now(),
    };

    const updatedConv: Conversation = {
      ...conv,
      title:
        conv.title === "Nueva conversación"
          ? input.trim().slice(0, 48)
          : conv.title,
      messages: [...conv.messages, userMsg],
    };
    setConv(updatedConv);
    updateConversation(oppId, updatedConv);
    setInput("");
    setIsLoading(true);

    // Build session ID: userId:oppId:convId for multi-turn context in the backend
    const sessionId = `${_user.id}:${oppId}:${conv.id}`;
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
      setConv(withBot);
      updateConversation(oppId, withBot);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      const errMsg = {
        id: `msg-err-${Date.now()}`,
        role: "assistant" as const,
        content: "No he podido obtener respuesta. Por favor, inténtalo de nuevo.",
        timestamp: Date.now(),
      };
      const withErr: Conversation = {
        ...updatedConv,
        messages: [...updatedConv.messages, errMsg],
      };
      setConv(withErr);
      updateConversation(oppId, withErr);
    } finally {
      setIsLoading(false);
    }
  }, [input, conv, oppId, oppName, isLoading, _user.id]);

  // ── Expand toggle ──
  const handleExpandToggle = useCallback(() => {
    if (!isExpanded) {
      prevSize.current = size;
      const maxW = Math.floor(window.innerWidth * 0.68);
      const maxH = Math.floor(window.innerHeight * 0.68);
      setSize({ w: maxW, h: maxH });
      setIsExpanded(true);
    } else {
      setSize(prevSize.current);
      setIsExpanded(false);
    }
  }, [isExpanded, size]);

  // ── Resize drag from bottom-right corner ──
  const handleResizeMouseDown = useCallback(
    (e: ReactMouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isResizing.current) return;
      isResizing.current = true;

      const startX = e.clientX;
      const startY = e.clientY;
      const startW = size.w;
      const startH = size.h;

      const onMouseMove = (ev: MouseEvent) => {
        const dx = startX - ev.clientX;
        const dy = startY - ev.clientY;
        const clamped = clampSize(startW + dx, startH + dy);
        setSize(clamped);
        setIsExpanded(false);
      };

      const onMouseUp = () => {
        isResizing.current = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [size]
  );

  const messages = conv?.messages ?? [];

  return (
    <>
      {/* ── Chat panel ── */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            width: `${size.w}px`,
            height: `${size.h}px`,
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
            background: "var(--card)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)",
            transition: isResizing.current ? "none" : "width 0.15s, height 0.15s",
            userSelect: isResizing.current ? "none" : "auto",
            overflow: "hidden",
          }}
        >
          {/* ── Header ── */}
          <div
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
              padding: "var(--space-3) var(--space-4)",
              borderRadius: "var(--radius) var(--radius) 0 0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            {/* Left: expand + avatar + title */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {/* Expand/collapse */}
              <button
                onClick={handleExpandToggle}
                title={isExpanded ? "Reducir" : "Expandir"}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--primary-foreground)",
                  padding: "4px",
                  borderRadius: "var(--radius-sm)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "24px",
                  height: "24px",
                  flexShrink: 0,
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                {isExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              </button>

              {/* Bot avatar */}
              <div
                style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Bot size={13} />
              </div>

              {/* Title */}
              <div>
                <div
                  style={{
                    fontSize: "var(--text-sm)",
                    fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                    fontFamily: "inherit",
                    color: "var(--primary-foreground)",
                  }}
                >
                  Asistente Akena
                </div>
                <div
                  style={{
                    fontSize: "var(--text-3xs)",
                    opacity: 0.85,
                    fontFamily: "inherit",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: "5px",
                      height: "5px",
                      borderRadius: "50%",
                      background: "#4ade80",
                      flexShrink: 0,
                    }}
                  />
                  En línea · Chat rápido
                </div>
              </div>
            </div>

            {/* Right: close X */}
            <button
              onClick={handleClose}
              title="Cerrar"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--primary-foreground)",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "var(--radius-sm)",
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              <X size={15} />
            </button>
          </div>

          {/* ── Messages ── */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "var(--space-4)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              background: "var(--card)",
            }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  gap: "10px",
                  flexDirection: msg.role === "user" ? "row-reverse" : "row",
                  alignItems: "flex-start",
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "50%",
                    background: msg.role === "assistant" ? "var(--primary)" : "var(--muted)",
                    border: msg.role === "user" ? "1px solid var(--border)" : "none",
                    color: msg.role === "assistant" ? "var(--primary-foreground)" : "var(--muted-foreground)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {msg.role === "assistant" ? <Bot size={12} /> : <User size={12} />}
                </div>

                {/* Bubble */}
                <div
                  style={{
                    maxWidth: "78%",
                    padding: "9px 11px",
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
                    fontSize: "var(--text-xs)",
                    lineHeight: "1.55",
                    fontFamily: "inherit",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Typing indicator while waiting for the backend */}
            {isLoading && (
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <div
                  style={{
                    width: "26px", height: "26px", borderRadius: "50%",
                    background: "var(--primary)", color: "var(--primary-foreground)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}
                >
                  <Bot size={12} />
                </div>
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "0 var(--radius) var(--radius) var(--radius)",
                    background: "var(--muted)",
                    display: "flex", gap: "5px", alignItems: "center",
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      style={{
                        width: "6px", height: "6px", borderRadius: "50%",
                        background: "var(--muted-foreground)", opacity: 0.6,
                        display: "inline-block",
                        animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Quick chips ── */}
          <div
            style={{
              borderTop: "1px solid var(--border)",
              padding: "8px 12px",
              display: "flex",
              gap: "8px",
              overflowX: "auto",
              flexShrink: 0,
              scrollbarWidth: "none" as CSSProperties["scrollbarWidth"],
              background: "var(--card)",
            }}
          >
            {["Analizar pliego", "Estrategia oferta", "Win Themes"].map((s) => (
              <button
                key={s}
                onClick={() => setInput(s)}
                style={{
                  padding: "3px 9px",
                  borderRadius: "var(--radius-chip)",
                  fontSize: "var(--text-3xs)",
                  fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                  background: "transparent",
                  border: "1px solid var(--primary)",
                  color: "var(--primary)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  transition: "background 0.15s, color 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--primary)";
                  e.currentTarget.style.color = "var(--primary-foreground)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--primary)";
                }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* ── Input ── */}
          <div
            style={{
              borderTop: "1px solid var(--border)",
              padding: "9px 11px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexShrink: 0,
              background: "var(--card)",
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isLoading && handleSend()}
              placeholder={isLoading ? "El asistente está respondiendo..." : "Escribe tu consulta..."}
              disabled={isLoading}
              style={{
                flex: 1,
                background: "var(--muted)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-input)",
                padding: "7px 11px",
                fontSize: "var(--text-xs)",
                fontFamily: "inherit",
                color: "var(--foreground)",
                outline: "none",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "var(--radius-button)",
                border: "none",
                cursor: input.trim() && !isLoading ? "pointer" : "default",
                background: "var(--primary)",
                color: "var(--primary-foreground)",
                opacity: input.trim() && !isLoading ? 1 : 0.45,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "opacity 0.15s",
              }}
            >
              <Send size={13} />
            </button>
          </div>

          {/* ── Resize handle — bottom-right corner ── */}
          <div
            onMouseDown={handleResizeMouseDown}
            title="Arrastrar para redimensionar"
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: "18px",
              height: "18px",
              cursor: "nwse-resize",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "flex-end",
              padding: "3px",
              borderRadius: "0 0 var(--radius) 0",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <circle cx="8" cy="8" r="1.2" fill="var(--muted-foreground)" opacity="0.5" />
              <circle cx="4.5" cy="8" r="1.2" fill="var(--muted-foreground)" opacity="0.35" />
              <circle cx="8" cy="4.5" r="1.2" fill="var(--muted-foreground)" opacity="0.35" />
            </svg>
          </div>
        </div>
      )}

      {/* ── Floating trigger button — only visible when panel is closed ── */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          title="Abrir asistente"
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "var(--space-3) var(--space-4)",
            borderRadius: "var(--radius-chip)",
            border: "none",
            cursor: "pointer",
            background: "var(--primary)",
            color: "var(--primary-foreground)",
            boxShadow: "0 4px 16px rgba(161,0,255,0.30), 0 2px 6px rgba(0,0,0,0.12)",
            fontFamily: "inherit",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <Sparkles size={15} />
          <span
            style={{
              fontSize: "var(--text-sm)",
              fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
              fontFamily: "inherit",
            }}
          >
            Asistente
          </span>
        </button>
      )}
    </>
  );
}