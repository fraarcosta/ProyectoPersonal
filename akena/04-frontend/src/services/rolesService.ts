/**
 * @file /src/services/rolesService.ts
 * @description Servicio para el microservicio Roles Service (172.205.199.243:8030).
 *
 * Endpoints cubiertos:
 *   GET    /roles/{userId}  — Obtiene el rol de un usuario
 *   PUT    /roles/{userId}  — Actualiza el rol de un usuario (solo Admin)
 *   DELETE /roles/{userId}  — Revoca el acceso de un usuario (solo Admin)
 *   POST   /register        — Registra un nuevo usuario en el sistema de roles
 *
 * Estado de integración: ❌ → ✅
 * Pantalla afectada: 06 (portal-ventas.tsx → AppControlAcceso)
 *
 * ⚠️ IP directa HTTP — Mixed Content bloqueante si la app sirve en HTTPS.
 *    Requiere proxy inverso TLS antes de desplegar en producción.
 *    Variable de entorno VITE_ROLES_SERVICE_URL para sobreescribir la URL.
 */

import { SERVICE_URLS, SERVICE_ENDPOINTS } from "../api/contracts";
import { createApiClient, withSignal } from "./apiClient";
import type {
  GetUserRoleResponse,
  UpdateUserRoleRequest,
  RegisterUserRequest,
  RegisterUserResponse,
  RequestOptions,
} from "../types/api";

// ─── Cliente axios para este servicio ────────────────────────────────────────

const BASE_URL: string =
  (import.meta as unknown as { env: Record<string, string> }).env
    ?.VITE_ROLES_SERVICE_URL ?? SERVICE_URLS.ROLES_SERVICE;

const client = createApiClient(BASE_URL);

// ═══════════════════════════════════════════════════════════════════════════════
// Funciones de servicio
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Obtiene el rol y los metadatos de un usuario por su ID.
 *
 * @example
 * const { role, displayName } = await getUserRole("pol.masi.castillejo");
 */
export async function getUserRole(
  userId: string,
  options: RequestOptions = {},
): Promise<GetUserRoleResponse> {
  const endpoint = SERVICE_ENDPOINTS.ROLES_SERVICE.GET_ROLE(userId);
  const { data } = await client.get<GetUserRoleResponse>(
    endpoint,
    withSignal(options.signal),
  );
  return data;
}

/**
 * Actualiza el rol de un usuario existente. Solo accesible para Admin.
 * Los usuarios en `PREDEFINED_ADMIN_IDS` no pueden ser degradados.
 *
 * @example
 * await updateUserRole("user123", { role: "Editor" });
 */
export async function updateUserRole(
  userId: string,
  payload: UpdateUserRoleRequest,
  options: RequestOptions = {},
): Promise<GetUserRoleResponse> {
  const endpoint = SERVICE_ENDPOINTS.ROLES_SERVICE.UPDATE_ROLE(userId);
  const { data } = await client.put<GetUserRoleResponse>(
    endpoint,
    payload,
    withSignal(options.signal),
  );
  return data;
}

/**
 * Revoca el acceso de un usuario. Devuelve 204 No Content.
 * Solo accesible para Admin.
 *
 * @example
 * await revokeUserAccess("user123");
 */
export async function revokeUserAccess(
  userId: string,
  options: RequestOptions = {},
): Promise<void> {
  const endpoint = SERVICE_ENDPOINTS.ROLES_SERVICE.REVOKE_ACCESS(userId);
  await client.delete(endpoint, withSignal(options.signal));
}

/**
 * Da de alta un nuevo usuario en el sistema de roles.
 *
 * @example
 * const user = await registerUser({
 *   email: "nuevo.usuario@accenture.com",
 *   displayName: "Nuevo Usuario",
 *   role: "Lectura",
 * });
 */
export async function registerUser(
  payload: RegisterUserRequest,
  options: RequestOptions = {},
): Promise<RegisterUserResponse> {
  const { data } = await client.post<RegisterUserResponse>(
    SERVICE_ENDPOINTS.ROLES_SERVICE.REGISTER,
    payload,
    withSignal(options.signal),
  );
  return data;
}
