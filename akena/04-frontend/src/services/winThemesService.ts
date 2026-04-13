/**
 * @file /src/services/winThemesService.ts
 * @description Servicio para el microservicio Win Themes Extractor (port 8028).
 *
 * Endpoints cubiertos:
 *   POST /win-themes-extractor  — Extrae win themes por sección L1 del índice
 *
 * Estado de integración: 🟡 → ✅ (mock setTimeout reemplazado)
 * Pantalla afectada: 04 (win-themes-content.tsx)
 *
 * Nota de encoding:
 *   El Content-Type es application/x-www-form-urlencoded.
 *   Los arrays deben enviarse repitiendo la clave:
 *     licitation_ids=a&licitation_ids=b&licitation_ids=c
 *   URLSearchParams gestiona esto automáticamente con `append`.
 */

import { SERVICE_URLS, SERVICE_ENDPOINTS } from "../api/contracts";
import { createApiClient, withSignal } from "./apiClient";
import type {
  WinThemesExtractorRequest,
  WinThemesExtractorResponse,
  RequestOptions,
} from "../types/api";

// ─── Cliente axios para este servicio ────────────────────────────────────────

const BASE_URL: string =
  (import.meta as unknown as { env: Record<string, string> }).env
    ?.VITE_WIN_THEMES_URL ?? SERVICE_URLS.WIN_THEMES_EXTRACTOR;

const client = createApiClient(BASE_URL);

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers de encoding
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Serializa el payload a application/x-www-form-urlencoded.
 * Los arrays se repiten con la misma clave: licitation_ids=a&licitation_ids=b
 */
function toFormUrlEncoded(params: WinThemesExtractorRequest): URLSearchParams {
  const body = new URLSearchParams();
  body.append("index_point", params.index_point);
  for (const id of params.licitation_ids) {
    body.append("licitation_ids", id);
  }
  return body;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Funciones de servicio
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extrae win themes diferenciadores para un punto del índice dado.
 *
 * @param params   Punto del índice + IDs de licitaciones de referencia.
 * @param options  AbortSignal opcional.
 *
 * @example
 * const { result } = await extractWinThemes({
 *   index_point: "1. Arquitectura técnica",
 *   licitation_ids: ["ref-001", "ref-002", "ref-003"],
 * });
 */
export async function extractWinThemes(
  params: WinThemesExtractorRequest,
  options: RequestOptions = {},
): Promise<WinThemesExtractorResponse> {
  const { data } = await client.post<WinThemesExtractorResponse>(
    SERVICE_ENDPOINTS.WIN_THEMES_EXTRACTOR.EXTRACT,
    toFormUrlEncoded(params),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      ...withSignal(options.signal),
    },
  );
  return data;
}

/**
 * Sobrecarga de conveniencia que acepta `index_point` y `licitation_ids`
 * como parámetros posicionales (compatibilidad con el contrato del prompt).
 *
 * @example
 * const { result } = await extractWinThemesByArgs(
 *   "1. Arquitectura técnica",
 *   ["ref-001", "ref-002"],
 * );
 */
export async function extractWinThemesByArgs(
  indexPoint: string,
  licitationIds: string[],
  options: RequestOptions = {},
): Promise<WinThemesExtractorResponse> {
  return extractWinThemes({ index_point: indexPoint, licitation_ids: licitationIds }, options);
}
