/**
 * @file /src/types/api.ts
 * @description Tipos TypeScript canónicos para todos los requests y responses
 *              de las APIs Akena / Accenture.
 *
 * Complementa (sin duplicar) los tipos de /src/api/contracts.ts:
 *   • contracts.ts  →  modelos de dominio frontend + constantes de servicio
 *   • este archivo  →  shapes de wire (petición / respuesta HTTP) usados por
 *                       la capa de servicios en /src/services/
 *
 * @version 1.0.0 · 2026-03-06
 */

// ═══════════════════════════════════════════════════════════════════════════════
// §1  ERROR ENVELOPE — 422 Validation Error (común a todos los endpoints)
// ═══════════════════════════════════════════════════════════════════════════════

/** Detalle de un error de validación FastAPI/Pydantic. */
export interface ValidationErrorDetail {
  /** Ruta del campo inválido (p.ej. ["body", "licitation_id"]). */
  loc: (string | number)[];
  /** Mensaje de error human-readable. */
  msg: string;
  /** Código de tipo del error (p.ej. "missing", "value_error"). */
  type: string;
}

/** Envelope de error 422 devuelto por todos los servicios. */
export interface ValidationErrorResponse {
  detail: ValidationErrorDetail[];
}

/** Error lanzado por el cliente HTTP cuando el servidor responde 422. */
export class ApiValidationError extends Error {
  readonly status = 422;
  readonly detail: ValidationErrorDetail[];

  constructor(detail: ValidationErrorDetail[]) {
    const summary = detail.map((d) => `${d.loc.join(".")}: ${d.msg}`).join("; ");
    super(`Validation error: ${summary}`);
    this.name = "ApiValidationError";
    this.detail = detail;
  }
}

/** Error genérico de API (4xx / 5xx no-422). */
export class ApiHttpError extends Error {
  constructor(
    readonly status: number,
    readonly statusText: string,
    message?: string,
  ) {
    super(message ?? `HTTP ${status} ${statusText}`);
    this.name = "ApiHttpError";
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// §2  DOCUMENT COLLECTOR — POST /collect
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Payload wire de /collect.
 * Se envía como multipart/form-data; el cliente HTTP lo convierte a FormData.
 */
export interface CollectDocumentsRequest {
  /** Título / etiqueta de la colección de documentos. */
  title: string;
  /** Uno o más archivos binarios (ZIP, PDF, DOCX). */
  files: File[];
}

/** Metadatos de un fichero ingestado. */
export interface CollectFileInfo {
  /** Mensaje de confirmación del servidor. */
  message: string;
  /** Ruta interna donde se almacenó el fichero. */
  file_path: string;
  /** ID de la petición (usado para correlación con otros servicios). */
  request_id: string;
  /** Título enviado en la petición. */
  title: string;
}

/** 200 OK — respuesta del endpoint /collect. */
export interface CollectDocumentsResponse {
  file_info: CollectFileInfo[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// §3  OUTLINE CREATOR — POST /create_outline
// ═══════════════════════════════════════════════════════════════════════════════

/** Payload de /create_outline. */
export interface CreateOutlineRequest {
  /** ID de la licitación. Null si todavía no está asignado. */
  licitation_id: string | null;
}

/** 200 OK — respuesta de /create_outline. */
export interface CreateOutlineResponse {
  result: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// §4  LICITATION MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

// ─── POST /get_licitations ────────────────────────────────────────────────────

export interface GetLicitationsRequest {
  licitation_id: string | null;
}

export interface GetLicitationsResponse {
  result: Record<string, unknown>;
}

// ─── POST /delete_licitation ──────────────────────────────────────────────────

export interface DeleteLicitationRequest {
  licitation_id: string | null;
}

export interface DeleteLicitationResponse {
  result: Record<string, unknown>;
}

// ─── POST /get_offers ─────────────────────────────────────────────────────────

export interface GetOffersRequest {
  /** ID del usuario cuyas ofertas se desean obtener. */
  user_id: string | null;
}

export interface GetOffersResponse {
  result: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// §5  CONTEXT ENHANCEMENT — POST /retrieve_documents
// ═══════════════════════════════════════════════════════════════════════════════

export interface RetrieveDocumentsRequest {
  query: string | null;
  licitation_id: string | null;
  /** Número de fragmentos a recuperar por búsqueda semántica (integer). */
  k: number | null;
  /** Número de fragmentos a recuperar por búsqueda léxica (integer). */
  n: number | null;
  search_type: string | null;
  algorithm: string | null;
  /** Campo específico del documento a priorizar en la búsqueda (opcional). */
  field?: string | null;
  /** 1 = usar índice principal; 0 = usar índice secundario (opcional, 0–1). */
  index_main?: 0 | 1 | null;
}

export interface RetrieveDocumentsResponse {
  result: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// §6  OFFERS SEARCHER — POST /search_offers
// ═══════════════════════════════════════════════════════════════════════════════

export interface SearchOffersRequest {
  licitation_id: string | null;
  /** Número máximo de resultados a devolver (integer). */
  top_k: number | null;
  query: string | null;
  /** Si true, limita la búsqueda al contexto pre-cargado del servicio. */
  only_context: boolean | null;
  /** Si true, limita la búsqueda al índice vectorial. */
  only_index: boolean | null;
  /** Si true, restringe los resultados al mismo cliente de la licitación. */
  same_client: boolean | null;
}

export interface SearchOffersResponse {
  result: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// §7  WIN THEMES EXTRACTOR — POST /win-themes-extractor
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Payload de /win-themes-extractor.
 * Se envía como application/x-www-form-urlencoded.
 * Para arrays, la clave se repite: licitation_ids=a&licitation_ids=b
 */
export interface WinThemesExtractorRequest {
  /** Punto del índice (sección L1) para el que se extraen win themes. */
  index_point: string;
  /** IDs de las licitaciones de referencia a analizar. */
  licitation_ids: string[];
}

export interface WinThemesExtractorResponse {
  result: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// §8  ROLES SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export type UserRoleWire = "Lectura" | "Editor" | "Admin";

/** GET /roles/{userId} → 200 OK */
export interface GetUserRoleResponse {
  userId: string;
  email: string;
  displayName: string;
  role: UserRoleWire;
  createdAt: string;
  lastLoginAt: string;
}

/** PUT /roles/{userId} */
export interface UpdateUserRoleRequest {
  role: UserRoleWire;
}

/** POST /register */
export interface RegisterUserRequest {
  email: string;
  displayName: string;
  /** @default "Lectura" */
  role?: UserRoleWire;
}

/** 201 Created */
export type RegisterUserResponse = GetUserRoleResponse;

// ═══════════════════════════════════════════════════════════════════════════════
// §9  PPT NBM — POST /extract_entities_ppt
// ═══════════════════════════════════════════════════════════════════════════════

export interface ExtractEntitiesPptRequest {
  oppId: string;
  outline: string;
  winThemes: Record<string, string>;
  templateDocumentId?: string;
}

export interface ExtractEntitiesPptResponse {
  downloadUrl?: string;
  fileBase64?: string;
  fileName: string;
  generatedAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// §10  OPCIONES COMUNES — AbortSignal
// ═══════════════════════════════════════════════════════════════════════════════

/** Opciones comunes que admiten todas las funciones de servicio. */
export interface RequestOptions {
  /** Señal de cancelación de la petición. */
  signal?: AbortSignal;
}
