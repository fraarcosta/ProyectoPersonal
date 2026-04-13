/**
 * @file /src/services/outlineService.ts
 * @description Servicio para el microservicio Outline Creator (port 8012).
 *
 * Endpoints cubiertos:
 *   POST /create_outline  — Genera el índice de la oferta técnica
 *   GET  /jobs/{jobId}    — Polling de estado para respuestas asíncronas
 *
 * Estado de integración: 🟡 → ✅ (mock reemplazado por llamada real)
 * Pantalla afectada: 02 (indice-content.tsx)
 *
 * Patrón de uso asíncrono:
 *   Si `createOutline` devuelve un resultado con `jobId`, el consumidor debe
 *   iniciar polling con `pollOutlineJob` cada 3 s hasta status === "done".
 */

import { SERVICE_URLS, SERVICE_ENDPOINTS } from "../api/contracts";
import { createApiClient, withSignal } from "./apiClient";
import type {
  CreateOutlineRequest,
  CreateOutlineResponse,
  RequestOptions,
} from "../types/api";

// ─── Cliente axios para este servicio ────────────────────────────────────────

const BASE_URL: string =
  (import.meta as unknown as { env: Record<string, string> }).env
    ?.VITE_OUTLINE_CREATOR_URL ?? SERVICE_URLS.OUTLINE_CREATOR;

const client = createApiClient(BASE_URL);

// ═══════════════════════════════════════════════════════════════════════════════
// Tipos internos de job polling
// ═══════════════════════════════════════════════════════════════════════════════

export type OutlineJobStatus = "pending" | "running" | "done" | "error";

export interface OutlineJobResponse {
  jobId: string;
  status: OutlineJobStatus;
  /** Progreso 0–100 cuando status === "running". */
  progress?: number;
  /** Presente cuando status === "done". */
  result?: CreateOutlineResponse;
  /** Presente cuando status === "error". */
  error?: { code: string; message: string };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Funciones de servicio
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Solicita la generación del índice de oferta técnica.
 *
 * Puede responder:
 *  - De forma síncrona → `result.result` contiene el índice generado.
 *  - De forma asíncrona → respuesta vacía o con jobId; usar `pollOutlineJob`.
 *
 * @example
 * const outline = await createOutline({ licitation_id: "opp-001" });
 */
export async function createOutline(
  params: CreateOutlineRequest,
  options: RequestOptions = {},
): Promise<CreateOutlineResponse> {
  const { data } = await client.post<CreateOutlineResponse>(
    SERVICE_ENDPOINTS.OUTLINE_CREATOR.CREATE_OUTLINE,
    params,
    withSignal(options.signal),
  );
  return data;
}

/**
 * Consulta el estado de un job asíncrono de creación de índice.
 * Devuelve `status === "done"` con `result` cuando ha terminado.
 *
 * @example
 * let job: OutlineJobResponse;
 * do {
 *   await new Promise((r) => setTimeout(r, 3_000));
 *   job = await pollOutlineJob(jobId);
 * } while (job.status === "pending" || job.status === "running");
 * if (job.status === "done") { … }
 */
export async function pollOutlineJob(
  jobId: string,
  options: RequestOptions = {},
): Promise<OutlineJobResponse> {
  const endpoint = SERVICE_ENDPOINTS.OUTLINE_CREATOR.JOB_STATUS(jobId);
  const { data } = await client.get<OutlineJobResponse>(
    endpoint,
    withSignal(options.signal),
  );
  return data;
}
