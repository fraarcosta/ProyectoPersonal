/**
 * @file /src/services/retrieveDocumentsService.ts
 * @description Servicio para el microservicio Context Enhancement (port 8017).
 *
 * Endpoints cubiertos:
 *   POST /retrieve_documents  — RAG sobre documentos ingestados (LLM response)
 *
 * Estado de integración: 🟡 → ✅ (generateBotResponse() mock reemplazable)
 * Ficheros afectados:
 *   (dashboard)/_components/chat-store.ts → generateBotResponse()
 *   workspace/[id]/_components/asistente-content.tsx
 *
 * Soporte de streaming (SSE):
 *   Si el backend sirve text/event-stream, usar `retrieveDocumentsStream`
 *   en lugar de `retrieveDocuments`. Cada evento entrega un delta de texto
 *   hasta que `done === true`.
 */

import { SERVICE_URLS, SERVICE_ENDPOINTS } from "../api/contracts";
import { createApiClient, withSignal } from "./apiClient";
import { ApiHttpError } from "../types/api";
import type {
  RetrieveDocumentsRequest,
  RetrieveDocumentsResponse,
  RequestOptions,
} from "../types/api";

// ─── Cliente axios para este servicio ────────────────────────────────────────

const BASE_URL: string =
  (import.meta as unknown as { env: Record<string, string> }).env
    ?.VITE_CONTEXT_ENHANCEMENT_URL ?? SERVICE_URLS.CONTEXT_ENHANCEMENT;

const client = createApiClient(BASE_URL);

// ═══════════════════════════════════════════════════════════════════════════════
// Funciones de servicio — JSON (respuesta síncrona)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Realiza RAG sobre los documentos ingestados y devuelve la respuesta completa.
 *
 * ⚠️ Si el backend responde con SSE (text/event-stream), usar
 * `retrieveDocumentsStream` para obtener el texto de forma incremental.
 *
 * @example
 * const { result } = await retrieveDocuments({
 *   query: "¿Cuáles son los criterios de adjudicación?",
 *   licitation_id: "opp-001",
 *   k: 5,
 *   n: 3,
 *   search_type: "hybrid",
 *   algorithm: "bm25",
 * });
 */
export async function retrieveDocuments(
  params: RetrieveDocumentsRequest,
  options: RequestOptions = {},
): Promise<RetrieveDocumentsResponse> {
  const { data } = await client.post<RetrieveDocumentsResponse>(
    SERVICE_ENDPOINTS.CONTEXT_ENHANCEMENT.RETRIEVE_DOCUMENTS,
    params,
    withSignal(options.signal),
  );
  return data;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Streaming SSE — texto incremental
// ═══════════════════════════════════════════════════════════════════════════════

export interface StreamDelta {
  /** Fragmento de texto incremental. */
  delta: string;
  /** true en el último evento ([DONE]). */
  done?: boolean;
}

/**
 * Streaming SSE: recibe la respuesta del LLM de forma incremental.
 *
 * Usa `fetch` en lugar de axios porque axios no soporta ReadableStream
 * de forma nativa en navegadores modernos. Requiere que el servidor
 * devuelva Content-Type: text/event-stream.
 *
 * @param params    Mismos parámetros que `retrieveDocuments`.
 * @param onDelta   Callback invocado con cada fragmento de texto.
 * @param options   AbortSignal opcional.
 *
 * @example
 * let fullText = "";
 * await retrieveDocumentsStream(
 *   { query: "...", licitation_id: "opp-001", k: 5, n: 3,
 *     search_type: "hybrid", algorithm: "bm25" },
 *   (delta) => { fullText += delta.delta; setDraft(fullText); },
 *   { signal: controller.signal },
 * );
 */
export async function retrieveDocumentsStream(
  params: RetrieveDocumentsRequest,
  onDelta: (delta: StreamDelta) => void,
  options: RequestOptions = {},
): Promise<void> {
  const url = `${BASE_URL.replace(/\/$/, "")}${SERVICE_ENDPOINTS.CONTEXT_ENHANCEMENT.RETRIEVE_DOCUMENTS}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(params),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new ApiHttpError(response.status, response.statusText);
  }

  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      // SSE lines: "data: {...}\n\n"
      for (const line of chunk.split("\n")) {
        const trimmed = line.replace(/^data:\s*/, "").trim();
        if (!trimmed || trimmed === "[DONE]") continue;
        try {
          const event = JSON.parse(trimmed) as StreamDelta;
          onDelta(event);
          if (event.done) return;
        } catch {
          // Línea no parseable — ignorar
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
