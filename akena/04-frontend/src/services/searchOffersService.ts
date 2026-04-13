/**
 * @file /src/services/searchOffersService.ts
 * @description Servicio para el microservicio Offers Searcher (port 8025).
 *
 * Endpoints cubiertos:
 *   POST /search_offers          — Busca ofertas de referencia similares
 *   GET  /offers/{id}/document   — ⚠️ GAP CONFIRMADO — no existe en backend
 *
 * Estado de integración: 🟡 → ✅ (MOCK_OFFERS[] reemplazado por llamada real)
 * Pantalla afectada: 03 (referencia-content.tsx)
 *
 * GAP: `downloadReferenceDocument` lanza ApiHttpError(501) mientras el
 * endpoint no exista en el backend. Los botones de descarga deben permanecer
 * deshabilitados (`hasDOCX` / `hasPPT` de la oferta).
 */

import { SERVICE_URLS, SERVICE_ENDPOINTS } from "../api/contracts";
import { createApiClient, withSignal } from "./apiClient";
import { ApiHttpError } from "../types/api";
import type {
  SearchOffersRequest,
  SearchOffersResponse,
  RequestOptions,
} from "../types/api";

// ─── Cliente axios para este servicio ────────────────────────────────────────

const BASE_URL: string =
  (import.meta as unknown as { env: Record<string, string> }).env
    ?.VITE_OFFERS_SEARCHER_URL ?? SERVICE_URLS.OFFERS_SEARCHER;

const client = createApiClient(BASE_URL);

// ═══════════════════════════════════════════════════════════════════════════════
// Funciones de servicio
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Busca ofertas de referencia similares a la licitación dada.
 *
 * @example
 * const { result } = await searchOffers({
 *   licitation_id: "opp-001",
 *   top_k: 5,
 *   query: "sistema de gestión documental sector salud",
 *   only_context: false,
 *   only_index: false,
 *   same_client: false,
 * });
 */
export async function searchOffers(
  params: SearchOffersRequest,
  options: RequestOptions = {},
): Promise<SearchOffersResponse> {
  const { data } = await client.post<SearchOffersResponse>(
    SERVICE_ENDPOINTS.OFFERS_SEARCHER.SEARCH_OFFERS,
    params,
    withSignal(options.signal),
  );
  return data;
}

/**
 * Descarga el documento (DOCX o PPT) de una oferta de referencia.
 *
 * ⚠️ GAP CONFIRMADO — Este endpoint NO existe en el backend actual.
 * La función lanza ApiHttpError(501) para que los componentes UI puedan
 * detectar la indisponibilidad y deshabilitar los botones de descarga.
 *
 * Cuando el backend lo implemente, reemplazar el cuerpo de la función por:
 *   const endpoint = SERVICE_ENDPOINTS.OFFERS_SEARCHER.DOWNLOAD_DOCUMENT(offerId);
 *   const { data } = await client.get<Blob>(endpoint, {
 *     params: { type },
 *     responseType: "blob",
 *     ...withSignal(options.signal),
 *   });
 *   return data;
 *
 * @param offerId  ID de la oferta de referencia.
 * @param type     Tipo de documento: "docx" | "ppt".
 * @returns        Blob binario del documento.
 */
export async function downloadReferenceDocument(
  offerId: string,
  type: "docx" | "ppt",
  _options: RequestOptions = {},
): Promise<Blob> {
  // ⚠️ GAP — reemplazar cuando el endpoint exista en backend
  throw new ApiHttpError(
    501,
    "Not Implemented",
    `GET /offers/${offerId}/document?type=${type} — endpoint no implementado en backend`,
  );
}