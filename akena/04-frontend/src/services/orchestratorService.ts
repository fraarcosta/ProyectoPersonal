/**
 * @file /src/services/orchestratorService.ts
 * @description Cliente para el Akena Orchestrator (FastAPI · port 8080).
 *
 * Rutas disponibles:
 *   GET  /health                    → estado del servicio
 *   POST /chat                      → envía un mensaje, recibe respuesta del agente
 *
 * El Vite dev server proxea /api/orchestrator/* → http://localhost:8080/*
 * En producción, VITE_ORCHESTRATOR_URL apuntará al ingress/gateway real.
 */

import { createApiClient } from "./apiClient";

// ─── Configuración ────────────────────────────────────────────────────────────

const BASE_URL: string =
  (import.meta as unknown as { env: Record<string, string> }).env
    ?.VITE_ORCHESTRATOR_URL ?? "/api/orchestrator";

const client = createApiClient(BASE_URL);

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface OrchestratorChatRequest {
  /** Mensaje del usuario en este turno. */
  message: string;
  /**
   * ID de sesión para mantener contexto multi-turno.
   * Formato recomendado: "{userId}:{oppId}:{convId}"
   */
  session_id: string;
  /** Si true, la respuesta se devuelve como SSE stream. */
  stream?: boolean;
}

export interface OrchestratorChatResponse {
  session_id: string;
  /** Respuesta completa del agente (texto markdown). */
  response: string;
  /**
   * Nombre del agente especializado que procesó la petición.
   * null si el orquestador respondió directamente.
   */
  agent_used: string | null;
}

export interface OrchestratorHealthResponse {
  status: "ok" | "error";
  agent: string;
  version: string;
}

// ─── Funciones de servicio ────────────────────────────────────────────────────

/**
 * Comprueba que el orquestador está activo.
 */
export async function checkOrchestratorHealth(): Promise<OrchestratorHealthResponse> {
  const { data } = await client.get<OrchestratorHealthResponse>("/health");
  return data;
}

/**
 * Envía un mensaje al orquestador y recibe la respuesta del agente apropiado.
 *
 * El orquestador decide automáticamente si delega a:
 *   - agent-cualificacion  (GO/NO-GO, BANT, scoring)
 *   - agent-diagnostico    (análisis competidores, riesgos, requisitos)
 *   - agent-workspace      (propuestas, win-themes, eco-simulación, resumen)
 *   - sí mismo             (preguntas generales)
 *
 * @param message    Mensaje del usuario.
 * @param sessionId  ID de sesión para multi-turno.
 * @param signal     AbortSignal para cancelar la petición.
 *
 * @example
 * const resp = await sendChatMessage(
 *   "Dame un GO/NO-GO para esta oportunidad con BBVA",
 *   "user123:opp456:conv789"
 * );
 * console.log(resp.response);       // texto del agente
 * console.log(resp.agent_used);     // "agent-cualificacion"
 */
export async function sendChatMessage(
  message: string,
  sessionId: string,
  signal?: AbortSignal,
): Promise<OrchestratorChatResponse> {
  const payload: OrchestratorChatRequest = {
    message,
    session_id: sessionId,
    stream: false,
  };

  const { data } = await client.post<OrchestratorChatResponse>("/chat", payload, {
    timeout: 60_000,
    ...(signal ? { signal } : {}),
  });

  return data;
}
