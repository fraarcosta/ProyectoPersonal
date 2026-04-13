// chat-store.ts
// Módulo compartido de conversaciones del Asistente de Soporte.
// Fuente de verdad: localStorage. Sincronización entre vistas: custom event.
// Todos los valores de estado son inmutables (siempre se reemplaza el array).
// 🔄 NEXT.JS: este módulo usa localStorage → sólo puede ejecutarse en el cliente.
"use client";

import { getAuthUser } from "../../_components/auth-store";
import { sendChatMessage } from "../../../services/orchestratorService";
import { getOpportunities } from "../../_components/opportunities-store";

// ─── Constants ────────────────────────────────────────────────────────────────

export const CHAT_UPDATE_EVENT = "akena-chat-updated";

// getMockUser replaced by getAuthUser — Bug C fix: always return the logged-in user.
export function getMockUser(): ChatUser {
  const u = getAuthUser();
  return { id: u.id, name: u.name };
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatUser {
  id: string;
  name: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  /** Título automático: primer mensaje del usuario, truncado */
  title: string;
  oppId: string;
  userId: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

function storageKey(userId: string, oppId: string): string {
  return `akena-chats-${userId}-${oppId}`;
}

export function getConversations(oppId: string): Conversation[] {
  try {
    const userId = getAuthUser().id;
    const raw = localStorage.getItem(storageKey(userId, oppId));
    if (raw) {
      const parsed = JSON.parse(raw) as Conversation[];
      return parsed.sort((a, b) => b.updatedAt - a.updatedAt);
    }
  } catch {}
  return [];
}

function saveConversations(oppId: string, conversations: Conversation[]): void {
  try {
    const userId = getAuthUser().id;
    localStorage.setItem(storageKey(userId, oppId), JSON.stringify(conversations));
  } catch {}
}

// ─── Dispatch update signal ───────────────────────────────────────────────────

export function dispatchChatUpdate(oppId: string): void {
  window.dispatchEvent(
    new CustomEvent(CHAT_UPDATE_EVENT, { detail: { oppId } })
  );
}

// ─── CRUD operations ──────────────────────────────────────────────────────────

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hola, soy el asistente de Akena. Puedo ayudarte con análisis del pliego, estrategia de oferta, definición de equipo y consultas sobre esta licitación. ¿En qué puedo ayudarte?",
  timestamp: Date.now(),
};

export function createConversation(oppId: string): Conversation {
  const userId = getAuthUser().id;
  const conv: Conversation = {
    id: `conv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: "Nueva conversación",
    oppId,
    userId,
    messages: [{ ...WELCOME_MESSAGE, id: `welcome-${Date.now()}`, timestamp: Date.now() }],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const existing = getConversations(oppId);
  saveConversations(oppId, [conv, ...existing]);
  dispatchChatUpdate(oppId);
  return conv;
}

export function updateConversation(oppId: string, conv: Conversation): void {
  const existing = getConversations(oppId);
  const idx = existing.findIndex((c) => c.id === conv.id);
  const updated = { ...conv, updatedAt: Date.now() };
  if (idx >= 0) {
    existing[idx] = updated;
  } else {
    existing.unshift(updated);
  }
  saveConversations(oppId, existing);
  dispatchChatUpdate(oppId);
}

export function getConversationById(oppId: string, convId: string): Conversation | null {
  return getConversations(oppId).find((c) => c.id === convId) ?? null;
}

// ─── Bot response generator ───────────────────────────────────────────────────

const USE_MOCK =
  (import.meta as unknown as { env: Record<string, string> }).env
    ?.VITE_USE_MOCK_CHAT === "true";

/**
 * Genera la respuesta del asistente llamando al Akena Orchestrator.
 * Si VITE_USE_MOCK_CHAT=true, usa respuestas locales (sin red).
 *
 * @param userMsg   Mensaje del usuario.
 * @param oppName   Nombre de la oportunidad (para contexto).
 * @param sessionId ID de sesión multi-turno.
 * @param signal    AbortSignal para cancelar si el usuario cierra el chat.
 */
/** Recupera el contexto disponible de la oportunidad (metadatos + resumen del pliego + índice + incoherencias). */
function _buildOppContext(oppId: string, oppName: string): string {
  const parts: string[] = [];

  // 1. Metadatos de la oportunidad desde el store
  try {
    const opps = getOpportunities();
    const opp = opps.find((o) => o.id === oppId);
    if (opp) {
      const meta = [
        `Oportunidad: ${opp.nombre} (${opp.codigo})`,
        `Cliente: ${opp.cliente}`,
        opp.presupuesto ? `Presupuesto: ${opp.presupuesto}` : null,
        opp.duracion ? `Duración: ${opp.duracion}` : null,
        opp.tipologia ? `Tipología: ${opp.tipologia}` : null,
        opp.estado ? `Estado: ${opp.estado}` : null,
      ].filter(Boolean).join("\n");
      parts.push(`--- DATOS DE LA OPORTUNIDAD ---\n${meta}`);
    } else {
      parts.push(`Oportunidad: ${oppName} (ID: ${oppId})`);
    }
  } catch {
    parts.push(`Oportunidad: ${oppName} (ID: ${oppId})`);
  }

  // 2. Resumen del pliego generado por agent-pliego
  try {
    const resumen = localStorage.getItem(`resumen-pliego-${oppId}`);
    if (resumen) {
      const r = JSON.parse(resumen) as { content?: string };
      if (r.content) parts.push(`--- ANÁLISIS DEL PLIEGO (generado por IA) ---\n${r.content.slice(0, 8000)}`);
    }
  } catch { /* ignore */ }

  // 3. Índice de la oferta
  try {
    const indice = localStorage.getItem(`indice-oferta-${oppId}`);
    if (indice) {
      const i = JSON.parse(indice) as { content?: string };
      if (i.content) parts.push(`--- ÍNDICE DE LA OFERTA TÉCNICA ---\n${i.content.slice(0, 3000)}`);
    }
  } catch { /* ignore */ }

  // 4. Incoherencias detectadas
  try {
    const incoherencias = localStorage.getItem(`incoherencias-${oppId}`);
    if (incoherencias) {
      const inc = JSON.parse(incoherencias) as { items?: Array<{ id: string; titulo: string; tipo: string; descripcion: string; recomendacion: string }> };
      if (inc.items && inc.items.length > 0) {
        const summary = inc.items.map(it =>
          `  [${it.id}] (${it.tipo}) ${it.titulo}: ${it.descripcion.slice(0, 250)}\n  → Recomendación: ${it.recomendacion.slice(0, 150)}`
        ).join("\n\n");
        parts.push(`--- INCOHERENCIAS DETECTADAS (${inc.items.length}) ---\n${summary}`);
      }
    }
  } catch { /* ignore */ }

  return parts.join("\n\n");
}

export async function generateBotResponseAsync(
  userMsg: string,
  oppName: string,
  sessionId: string,
  signal?: AbortSignal,
  oppId?: string,
): Promise<string> {
  if (USE_MOCK) {
    return _mockResponse(userMsg, oppName);
  }

  try {
    const context = oppId ? _buildOppContext(oppId, oppName) : `Oportunidad: ${oppName}`;
    const contextualMessage = `[CONTEXTO DE LA OPORTUNIDAD]\n${context}\n\n[PREGUNTA DEL USUARIO]\n${userMsg}`;

    const result = await sendChatMessage(contextualMessage, sessionId, signal);
    return result.response;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    console.error("[chat-store] Error calling orchestrator:", err);
    return "Lo siento, no he podido conectar con el asistente en este momento. Por favor, inténtalo de nuevo.";
  }
}

/** Respuestas locales de fallback (legacy mock). Solo activo si VITE_USE_MOCK_CHAT=true. */
function _mockResponse(userMsg: string, oppName: string): string {
  const lower = userMsg.toLowerCase();
  if (lower.includes("pliego") || lower.includes("clausula") || lower.includes("requisito")) {
    return `Analizando el pliego de «${oppName}»: criterios automáticos (60 pts) y juicio de valor (40 pts). Requiere clasificación Grupo V, Subgrupo 3, Categoría D e ISO 27001. ¿Profundizo en algún criterio?`;
  }
  if (lower.includes("estrategia") || lower.includes("win theme") || lower.includes("diferencial")) {
    return `Para «${oppName}» recomiendo tres Win Themes: (1) experiencia acreditada, (2) metodología ágil, (3) soporte SLA garantizado. ¿Desarrollo alguno?`;
  }
  if (lower.includes("equipo") || lower.includes("perfil") || lower.includes("recurso")) {
    return `Equipo mínimo para «${oppName}»: Director de Proyecto (≥8 años), Arquitecto de Solución (≥5 años), 2 consultores senior, 3 desarrolladores certificados.`;
  }
  if (lower.includes("precio") || lower.includes("descuento") || lower.includes("margen")) {
    return `Para maximizar puntuación económica en «${oppName}»: descuento recomendado entre 8%-14%. ¿Simulamos escenarios?`;
  }
  return `He recibido tu consulta sobre «${oppName}». Puedo ayudarte con pliego, estrategia, equipo o cálculo económico. ¿Qué aspecto te interesa?`;
}

/** @deprecated Usar generateBotResponseAsync — se mantiene solo para compatibilidad temporal. */
export function generateBotResponse(userMsg: string, oppName: string): string {
  return _mockResponse(userMsg, oppName);
}