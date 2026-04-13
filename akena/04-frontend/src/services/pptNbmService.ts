/**
 * @file /src/services/pptNbmService.ts
 * @description Servicio para el microservicio PPT NBM (172.205.199.243:8026).
 *
 * Endpoints cubiertos:
 *   POST /extract_entities_ppt  — Genera el PPT de Nota de Búsqueda de Mercado
 *
 * Estado de integración: ❌ → ✅ (UI todavía pendiente de crear)
 * Pantalla afectada: 10 (ppt-nbm-content.tsx — pendiente)
 *
 * ⚠️ IP directa HTTP — Mixed Content bloqueante si la app sirve en HTTPS.
 *    Variable de entorno VITE_PPT_NBM_URL para sobreescribir la URL.
 *
 * Payload exacto pendiente de confirmación con backend:
 *   el tipo `ExtractEntitiesPptRequest` recoge los campos conocidos del brief.
 */

import { SERVICE_URLS, SERVICE_ENDPOINTS } from "../api/contracts";
import { createApiClient, withSignal } from "./apiClient";
import type {
  ExtractEntitiesPptRequest,
  ExtractEntitiesPptResponse,
  RequestOptions,
} from "../types/api";

// ─── Cliente axios para este servicio ────────────────────────────────────────

const BASE_URL: string =
  (import.meta as unknown as { env: Record<string, string> }).env
    ?.VITE_PPT_NBM_URL ?? SERVICE_URLS.PPT_NBM;

const client = createApiClient(BASE_URL);

// ═══════════════════════════════════════════════════════════════════════════════
// Funciones de servicio
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Genera el PPT de Nota de Búsqueda de Mercado a partir del índice y win themes.
 *
 * La respuesta puede contener:
 *  - `downloadUrl`  → URL pública para descargar el PPT.
 *  - `fileBase64`   → Contenido base64 del fichero (si el servicio devuelve blob).
 * Solo uno de los dos campos estará presente (pendiente de confirmar con backend).
 *
 * @example
 * const { downloadUrl, fileName } = await extractEntitiesPpt({
 *   oppId: "opp-001",
 *   outline: storedIndice.content,
 *   winThemes: { "1": "Win theme sección 1...", "2": "Win theme sección 2..." },
 * });
 * if (downloadUrl) window.open(downloadUrl, "_blank");
 */
export async function extractEntitiesPpt(
  payload: ExtractEntitiesPptRequest,
  options: RequestOptions = {},
): Promise<ExtractEntitiesPptResponse> {
  const { data } = await client.post<ExtractEntitiesPptResponse>(
    SERVICE_ENDPOINTS.PPT_NBM.EXTRACT_ENTITIES,
    payload,
    withSignal(options.signal),
  );
  return data;
}

/**
 * Descarga el PPT NBM como Blob directamente (alternativa si el servidor
 * devuelve el binario en el body en lugar de una URL).
 *
 * @example
 * const blob = await downloadPptNbmBlob({ oppId: "opp-001", outline: "...", winThemes: {} });
 * const url = URL.createObjectURL(blob);
 * const a = document.createElement("a");
 * a.href = url; a.download = "NBM.pptx"; a.click();
 * URL.revokeObjectURL(url);
 */
export async function downloadPptNbmBlob(
  payload: ExtractEntitiesPptRequest,
  options: RequestOptions = {},
): Promise<Blob> {
  const { data } = await client.post<Blob>(
    SERVICE_ENDPOINTS.PPT_NBM.EXTRACT_ENTITIES,
    payload,
    {
      responseType: "blob",
      ...withSignal(options.signal),
    },
  );
  return data;
}
