/**
 * @file /src/services/winThemesService.ts
 * @description Servicio para agent-win-themes (port 8028).
 *
 * Endpoints cubiertos:
 *   POST /generate-win-themes  — Genera win themes por sección L1 a partir del pliego e índice
 */

import axios from "axios";

// ─── Cliente dedicado (sin Content-Type por defecto para que axios auto-detecte multipart) ──

const client = axios.create({
  baseURL: "/api/win-themes",
  timeout: 180_000,
});

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface WinThemesGenerateResponse {
  /** Mapa sección L1 (id string) → texto de Win Themes */
  sections: Record<string, string>;
  agent: string;
}

// ─── API calls ────────────────────────────────────────────────────────────────

/**
 * Llama a POST /generate-win-themes con los ficheros del pliego y el índice validado.
 * El agente analiza el pliego, extrae los criterios de valoración del PPT y genera
 * Win Themes específicos para cada sección L1 del índice.
 *
 * @param files     Ficheros del pliego (PCAP, PPT, Anexos) en PDF o DOCX.
 * @param index     Texto completo del índice validado (numeración decimal).
 * @param sessionId ID de sesión para memoria conversacional.
 * @param signal    AbortSignal opcional para cancelación.
 */
export async function generateWinThemes(
  files: File[],
  index: string,
  sessionId: string,
  signal?: AbortSignal,
): Promise<WinThemesGenerateResponse> {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  form.append("index", index);
  form.append("session_id", sessionId);

  const { data } = await client.post<WinThemesGenerateResponse>(
    "/generate-win-themes",
    form,
    { ...(signal ? { signal } : {}) },
  );
  return data;
}

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
