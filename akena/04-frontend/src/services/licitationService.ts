/**
 * @file /src/services/licitationService.ts
 * @description Servicio para el microservicio Licitation Management (port 8021).
 *
 * Endpoints cubiertos:
 *   POST /get_licitations   — Obtiene licitaciones (por ID o todas)
 *   POST /delete_licitation — Elimina una licitación
 *   POST /get_offers        — Lista ofertas de un usuario
 *   POST /create_offer      — Crea una nueva oferta  ⚠️ endpoint no documentado
 *   PUT  /update_offer/{id} — Actualiza una oferta   ⚠️ supuesto
 *
 * Estado de integración:
 *   GET /get_offers  → 🟡 → ✅
 *   create / update  → ❌ → ✅ (implementado, pendiente de confirmar con backend)
 * Pantallas afectadas: 05 · 07 (portal-ventas.tsx)
 */

import { SERVICE_URLS, SERVICE_ENDPOINTS } from "../api/contracts";
import { createApiClient, withSignal } from "./apiClient";
import type {
  GetLicitationsRequest,
  GetLicitationsResponse,
  DeleteLicitationRequest,
  DeleteLicitationResponse,
  GetOffersRequest,
  GetOffersResponse,
  RequestOptions,
} from "../types/api";
import type {
  CreateOfferRequest,
  CreateOfferResponse,
  UpdateOfferRequest,
  UpdateOfferResponse,
} from "../api/contracts";

// ─── Cliente axios para este servicio ────────────────────────────────────────

const BASE_URL: string =
  (import.meta as unknown as { env: Record<string, string> }).env
    ?.VITE_LICITATION_MANAGEMENT_URL ?? SERVICE_URLS.LICITATION_MANAGEMENT;

const client = createApiClient(BASE_URL);

// ═══════════════════════════════════════════════════════════════════════════════
// Funciones de servicio
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Obtiene licitaciones. Pasar `licitation_id: null` para obtener todas.
 *
 * @example
 * const { result } = await getLicitations({ licitation_id: "lic-001" });
 */
export async function getLicitations(
  params: GetLicitationsRequest,
  options: RequestOptions = {},
): Promise<GetLicitationsResponse> {
  const { data } = await client.post<GetLicitationsResponse>(
    "/get_licitations",
    params,
    withSignal(options.signal),
  );
  return data;
}

/**
 * Elimina una licitación por ID.
 *
 * @example
 * await deleteLicitation({ licitation_id: "lic-001" });
 */
export async function deleteLicitation(
  params: DeleteLicitationRequest,
  options: RequestOptions = {},
): Promise<DeleteLicitationResponse> {
  const { data } = await client.post<DeleteLicitationResponse>(
    "/delete_licitation",
    params,
    withSignal(options.signal),
  );
  return data;
}

/**
 * Obtiene las ofertas asociadas a un usuario.
 * Pasar `user_id: null` para obtener todas las ofertas del sistema.
 *
 * @example
 * const { result } = await getOffers({ user_id: "pol.masi.castillejo" });
 */
export async function getOffers(
  params: GetOffersRequest,
  options: RequestOptions = {},
): Promise<GetOffersResponse> {
  const { data } = await client.post<GetOffersResponse>(
    SERVICE_ENDPOINTS.LICITATION_MANAGEMENT.GET_OFFERS,
    params,
    withSignal(options.signal),
  );
  return data;
}

/**
 * Crea una nueva oferta en el sistema.
 * ⚠️ ENDPOINT NO DOCUMENTADO — requiere confirmación de backend.
 *
 * @example
 * const { id } = await createOffer({ nombre: "Oferta ABC", ... });
 */
export async function createOffer(
  payload: CreateOfferRequest,
  options: RequestOptions = {},
): Promise<CreateOfferResponse> {
  const { data } = await client.post<CreateOfferResponse>(
    SERVICE_ENDPOINTS.LICITATION_MANAGEMENT.CREATE_OFFER,
    payload,
    withSignal(options.signal),
  );
  return data;
}

/**
 * Actualiza una oferta existente.
 * ⚠️ SUPUESTO — endpoint y método HTTP pendientes de confirmación.
 *
 * @example
 * const updated = await updateOffer("opp-001", { estado: "Revisión interna" });
 */
export async function updateOffer(
  id: string,
  patch: UpdateOfferRequest,
  options: RequestOptions = {},
): Promise<UpdateOfferResponse> {
  const endpoint = SERVICE_ENDPOINTS.LICITATION_MANAGEMENT.UPDATE_OFFER(id);
  const { data } = await client.put<UpdateOfferResponse>(
    endpoint,
    patch,
    withSignal(options.signal),
  );
  return data;
}