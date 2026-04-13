/**
 * @file /src/services/apiClient.ts
 * @description Cliente HTTP base (axios) para todos los microservicios Akena.
 *
 * Responsabilidades:
 *   1. Factory `createApiClient(baseURL)` — instancia axios configurada.
 *   2. Interceptor de request  → inyecta Bearer token (VITE_API_TOKEN o sesión).
 *   3. Interceptor de response → transforma errores 422 en ApiValidationError
 *                                y errores HTTP en ApiHttpError.
 *   4. Helper `buildServiceUrl(serviceUrl, endpoint)` para construir URLs
 *      a partir de las constantes SERVICE_URLS / SERVICE_ENDPOINTS.
 *
 * Variables de entorno reconocidas:
 *   VITE_API_URL       → URL base por defecto (cuando el cliente no especifica)
 *   VITE_API_TOKEN     → Bearer JWT estático (CI/CD, e2e). Opcional.
 *
 * En producción sin VITE_API_TOKEN, el token se leerá de una clave de
 * localStorage gestionada por el futuro flujo OAuth/Azure AD.
 */

import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { ApiValidationError, ApiHttpError, type ValidationErrorResponse } from "../types/api";

// ─── Constantes de entorno ────────────────────────────────────────────────────

/** URL base por defecto, configurable por variable de entorno. */
const DEFAULT_BASE_URL: string =
  (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_URL ?? "";

/**
 * Bearer token estático (optional, para CI/CD o desarrollo local).
 * En producción, el flujo OAuth/Azure AD debe sobrescribir `getAuthToken`.
 */
const STATIC_TOKEN: string =
  (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_TOKEN ?? "";

/** Clave de localStorage donde el futuro módulo OAuth guardará el JWT. */
const AUTH_TOKEN_KEY = "akena-api-token";

// ─── Token resolver ───────────────────────────────────────────────────────────

/**
 * Resuelve el token de autenticación en orden de prioridad:
 *   1. Variable de entorno VITE_API_TOKEN (para CI/CD)
 *   2. localStorage["akena-api-token"] (futuro OAuth / Azure AD)
 *   3. Vacío (sin autenticación — el servidor decidirá)
 */
function getAuthToken(): string {
  if (STATIC_TOKEN) return STATIC_TOKEN;
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Crea y devuelve una instancia axios pre-configurada para el servicio dado.
 *
 * @param baseURL  URL base del microservicio. Por defecto usa VITE_API_URL.
 * @returns        Instancia axios lista para usar.
 *
 * @example
 * // En cada módulo de servicio:
 * const client = createApiClient(SERVICE_URLS.OUTLINE_CREATOR);
 */
export function createApiClient(baseURL: string = DEFAULT_BASE_URL): AxiosInstance {
  const instance = axios.create({
    baseURL,
    headers: {
      "Content-Type": "application/json",
    },
    // Tiempo máximo por defecto de 30 s — servicios LLM pueden tardar más;
    // pueden sobreescribirse por llamada con AxiosRequestConfig.timeout.
    timeout: 30_000,
  });

  // ── Request interceptor — inyectar Authorization ──────────────────────────
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
      const token = getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error: unknown) => Promise.reject(error),
  );

  // ── Response interceptor — normalizar errores ─────────────────────────────
  instance.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      if (axios.isAxiosError(error) && error.response) {
        const { status, statusText, data } = error.response;

        // 422 Validation Error — FastAPI/Pydantic
        if (status === 422) {
          const body = data as ValidationErrorResponse;
          const detail = Array.isArray(body?.detail) ? body.detail : [];
          return Promise.reject(new ApiValidationError(detail));
        }

        // Otros errores HTTP (400, 401, 403, 404, 500…)
        return Promise.reject(
          new ApiHttpError(
            status,
            statusText,
            typeof data === "string"
              ? data
              : (data as { message?: string })?.message ?? `HTTP ${status}`,
          ),
        );
      }

      // Error de red / timeout / cancelación
      return Promise.reject(error);
    },
  );

  return instance;
}

// ─── Helpers de URL ───────────────────────────────────────────────────────────

/**
 * Construye la URL completa combinando base de servicio + endpoint.
 * Útil cuando necesitas pasar la URL completa (p.ej. a fetch manual).
 *
 * @example
 * buildServiceUrl(SERVICE_URLS.OUTLINE_CREATOR, SERVICE_ENDPOINTS.OUTLINE_CREATOR.CREATE_OUTLINE)
 * // → "http://outline-creator:8012/create_outline"
 */
export function buildServiceUrl(serviceUrl: string, endpoint: string): string {
  return `${serviceUrl.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}`;
}

/**
 * Extrae la configuración de señal de cancelación como AxiosRequestConfig.
 * Pasarlo a cada llamada axios permite cancelar mediante AbortController.
 *
 * @example
 * const controller = new AbortController();
 * await collectDocuments(req, { signal: controller.signal });
 * // ... para cancelar: controller.abort();
 */
export function withSignal(signal?: AbortSignal): Pick<AxiosRequestConfig, "signal"> {
  return signal ? { signal } : {};
}
