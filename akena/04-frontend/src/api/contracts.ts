/**
 * @file /src/api/contracts.ts
 * @description Inventario canónico de endpoints y contratos de modelos — Akena · Accenture.
 *
 * Organización:
 *   §1  Tipos base / comunes
 *   §2  Servicios backend (uno por microservicio)
 *   §3  Modelos de dominio frontend (fuente de verdad de los stores)
 *   §4  Inventario de claves localStorage
 *   §5  Constantes de servicio
 *
 * Estado por endpoint: ✅ implementado · 🟡 mock actual · ❌ no implementado · ⚠️ gap confirmado
 *
 * @version 1.0.0 · 2026-03-02
 */

// ═══════════════════════════════════════════════════════════════════════════════
// §1  TIPOS BASE / COMUNES
// ═══════════════════════════════════════════════════════════════════════════════

/** Envelope de error estándar devuelto por todos los servicios. */
export interface ApiError {
  /** Código de error legible por máquina (snake_case). */
  code: string;
  /** Mensaje human-readable. */
  message: string;
  /** Detalles adicionales de validación (opcional). */
  details?: Record<string, string[]>;
}

/** Respuesta genérica paginada (para listados). */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

/** Estado de un job asíncrono (polling). */
export type JobStatus = "pending" | "running" | "done" | "error";

export interface JobStatusResponse {
  jobId: string;
  status: JobStatus;
  /** Progreso de 0 a 100. Presente sólo si status === "running". */
  progress?: number;
  /** Disponible cuando status === "error". */
  error?: ApiError;
}

/** Cabecera de autenticación esperada en todos los servicios. */
export interface AuthHeaders {
  /** Bearer token JWT de Accenture / Azure AD. */
  Authorization: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// §2  SERVICIOS BACKEND
// ═══════════════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────────────────
// §2.1  Document Collector  (document-collector:8000)
// ───────────────────────────────────────────────────────────────────────────────
// Prerequisito bloqueante de pantallas 02, 04, 08 y 09.
// Sin documentIds reales, ningún generador puede funcionar.
//
// Estado implementación frontend:  ❌ no implementado
//   - FileUploadWidget y DropZone leen nombre+tamaño pero no envían bytes.
//   - Pendiente: hook useDocumentUpload(oppId, type) con FormData + XHR progress.

/** Tipo de documento admitido por el colector. */
export type DocumentType =
  | "pliego_tecnico"      // PPT — Pliego de Prescripciones Técnicas
  | "pliego_administrativo" // PCAP
  | "anexo"
  | "oferta_word"
  | "oferta_pdf"
  | "plantilla_ppt"
  | "otro";

/**
 * POST document-collector:8000/collect
 *
 * Content-Type: multipart/form-data
 */
export interface CollectRequest {
  /** ID de la oportunidad a la que pertenece el documento. */
  oppId: string;
  /** Categoría del documento para indexación semántica. */
  type: DocumentType;
  /** El archivo binario bajo la clave "file". */
  file: File; // se envía como parte del FormData
}

/**
 * 200 OK — documento ingestado y listo para su uso en otros servicios.
 */
export interface CollectResponse {
  /** Identificador único del documento en el vector store. */
  documentId: string;
  /** Nombre original del archivo. */
  fileName: string;
  /** Número de páginas procesadas. */
  pages: number;
  /** Tamaño en bytes del archivo original. */
  sizeBytes: number;
  /** Marca temporal ISO-8601 de ingesta. */
  ingestedAt: string;
}

// ───────────────────────────────────────────────────────────────────────────────
// §2.2  Outline Creator  (outline-creator:8012)
// ───────────────────────────────────────────────────────────────────────────────
// Estado implementación frontend:  🟡 mock
//   - handleGenerate() llama buildMockIndice() + setTimeout(2000).
//   - Pendiente: reemplazar por POST /create_outline; si respuesta asíncrona,
//     polling GET /jobs/{jobId} cada 3 s hasta status=done.
//
// Fichero afectado: workspace/[id]/_components/indice-content.tsx

/**
 * POST outline-creator:8012/create_outline
 *
 * Genera el índice de la oferta técnica a partir de los documentos ingestados.
 */
export interface CreateOutlineRequest {
  oppId: string;
  /** IDs obtenidos de /collect para los pliegos de esta oportunidad. */
  documentIds: string[];
  /**
   * Nivel máximo de profundidad del índice.
   * @default 3
   */
  maxDepth?: 1 | 2 | 3;
}

/**
 * 200 OK — respuesta síncrona (si el backend lo soporta).
 * Si la respuesta es asíncrona, se devuelve un JobStatusResponse con jobId.
 */
export interface CreateOutlineResponse {
  /** Texto del índice en formato Markdown o texto plano estructurado. */
  outline: string;
  /** Número de secciones de nivel 1 detectadas. */
  l1Count: number;
  /** Marca temporal de generación. */
  generatedAt: string;
}

/**
 * GET outline-creator:8012/jobs/{jobId}
 *
 * Polling para respuestas asíncronas del generador de índice.
 * Retorna JobStatusResponse. Cuando status==="done", incluye el campo result.
 */
export interface CreateOutlineJobResult extends JobStatusResponse {
  /** Presente únicamente cuando status === "done". */
  result?: CreateOutlineResponse;
}

// ───────────────────────────────────────────────────────────────────────────────
// §2.3  Offers Searcher  (offers-searcher:8025)
// ───────────────────────────────────────────────────────────────────────────────
// Estado implementación frontend:  🟡 mock
//   - MOCK_OFFERS[] con 5 ofertas hardcodeadas.
//   - GAP CONFIRMADO: GET /offers/{id}/document no existe en backend.
//
// Fichero afectado: workspace/[id]/_components/referencia-content.tsx

/** Modo de búsqueda de referencias. */
export type SearchMode = "pliego" | "apartado";

/**
 * POST offers-searcher:8025/search_offers
 *
 * Busca ofertas de referencia similares a la oportunidad actual.
 */
export interface SearchOffersRequest {
  oppId: string;
  mode: SearchMode;
  /** IDs de pliegos ingestados para búsqueda semántica en modo "pliego". */
  documentIds: string[];
  /** ID del apartado L1 del índice (solo en modo "apartado"). */
  l1Id?: string;
  /** Texto libre de requisitos del apartado (solo en modo "apartado"). */
  requisitos?: string;
  /** Número máximo de resultados.
   * @default 5
   */
  limit?: number;
}

/** Una oferta de referencia encontrada. */
export interface ReferenceOffer {
  id: string;
  name: string;
  client: string;
  deliveryDate: string;
  /** Porcentaje de similitud semántica (0–100). */
  similarity: number;
  /** Justificación del sistema de por qué esta oferta es relevante. */
  justification: string;
  /** Indica si existe documento Word descargable. */
  hasDOCX: boolean;
  /** Indica si existe presentación PPT descargable. */
  hasPPT: boolean;
}

/** 200 OK */
export interface SearchOffersResponse {
  offers: ReferenceOffer[];
  /** Número total de candidatas antes de aplicar limit. */
  totalCandidates: number;
  searchedAt: string;
}

/**
 * GET offers-searcher:8025/offers/{offerId}/document?type=docx|ppt
 *
 * ⚠️ GAP CONFIRMADO — endpoint no existe en backend.
 * Los botones de descarga deben permanecer deshabilitados hasta que se cree.
 *
 * @param offerId  ID de la oferta de referencia.
 * @param type     Tipo de documento a descargar.
 * @returns        Blob binario del documento.
 */
export interface DownloadReferenceDocumentParams {
  offerId: string;
  type: "docx" | "ppt";
}
// Respuesta: Blob (application/octet-stream)

// ───────────────────────────────────────────────────────────────────────────────
// §2.4  Win Themes Extractor  (win-themes:8028)
// ───────────────────────────────────────────────────────────────────────────────
// Estado implementación frontend:  🟡 mock
//   - Generación por sección L1 con setTimeout + texto hardcodeado.
//   - El índice validado NO se incluye en ningún payload actual.
//
// Fichero afectado: workspace/[id]/_components/win-themes-content.tsx

/**
 * POST win-themes:8028/win-themes-extractor
 *
 * Extrae win themes diferenciadores por sección L1 del índice.
 */
export interface WinThemesExtractorRequest {
  oppId: string;
  /** Contenido del índice validado (readStoredIndice(oppId).content). */
  outline: string;
  /**
   * IDs de las secciones L1 para las que generar win themes.
   * Si se omite, el extractor los genera para todas las secciones del índice.
   */
  sections?: string[];
  /** IDs de documentos ingestados para contexto semántico. */
  documentIds: string[];
}

/** Win theme generado para una sección L1. */
export interface WinThemeItem {
  /** ID de la sección L1 (ej. "1", "2", …) */
  sectionId: string;
  /** Título limpio de la sección L1. */
  sectionTitle: string;
  /** Texto del win theme generado. */
  text: string;
}

/**
 * 200 OK — puede ser síncrona (todos los temas a la vez) o asíncrona (por sección).
 * ⚠️ A confirmar con backend: ¿devuelve todos juntos o jobId por sección?
 */
export interface WinThemesExtractorResponse {
  items: WinThemeItem[];
  generatedAt: string;
  /** Presente si el procesamiento es asíncrono. */
  jobId?: string;
}

// ───────────────────────────────────────────────────────────────────────────────
// §2.5  Licitation Management  (licitation-management:8021)
// ───────────────────────────────────────────────────────────────────────────────
// Estado implementación frontend:
//   GET /get_offers  → 🟡 mock (SEED[] hardcodeado)
//   POST create_offer → ❌ no implementado + ⚠️ endpoint no documentado en brief
//   PUT update_offer  → ❌ no implementado + ⚠️ supuesto (no confirmado)

/** Estado de una oferta/oportunidad en el ciclo de vida. */
export type OfferEstado =
  | "Borrador"
  | "En preparación"
  | "Revisión interna"
  | "Entregada"
  | "Adjudicada"
  | "Desierta"
  | "No adjudicada";

/** Tipología de proyecto. */
export type Tipologia =
  | "System Integration (SI)"
  | "Mantenimiento evolutivo"
  | "Mantenimiento correctivo"
  | "AMS (Application Management Services)"
  | "Soporte / Helpdesk"
  | "PMO"
  | "Consulting / Advisory"
  | "Desarrollo a medida"
  | "Servicios Cloud"
  | "Ciberseguridad"
  | "Data & AI"
  | "Automatización / RPA"
  | "Otros";

/** Colaborador asignado a una oportunidad o lote. */
export interface Collaborator {
  id: string;
  name: string;
  role: string;
}

/**
 * GET licitation-management:8021/get_offers
 *
 * Lista todas las ofertas. Filtros y paginación opcionales.
 */
export interface GetOffersParams {
  page?: number;
  limit?: number;
  estado?: OfferEstado;
  search?: string;
}

/** Una oferta del portal de ventas. */
export interface PortalOffer {
  id: string;
  nombre: string;
  codigo: string;
  cliente: string;
  anno: string;
  duracion: string;
  presupuesto: string;
  tipologias: Tipologia[];
  tieneLottes: "si" | "no";
  lotes: string[];
  pliegos: string[];
  colaboradores: Collaborator[];
  ownerId: string;
  ownerName: string;
  estado: OfferEstado;
  createdAt: string;
  updatedAt?: string;
}

/** 200 OK */
export type GetOffersResponse = PaginatedResponse<PortalOffer>;

/**
 * POST licitation-management:8021/create_offer
 *
 * ⚠️ ENDPOINT NO DOCUMENTADO — se asume en licitation-management:8021.
 * Requiere confirmación de backend antes de implementar.
 */
export type CreateOfferRequest = Omit<PortalOffer, "id" | "createdAt" | "updatedAt"> & {
  /** IDs de documentos (pliegos, anexos) obtenidos de /collect. */
  documentIds: string[];
};

/** 201 Created */
export interface CreateOfferResponse {
  id: string;
  createdAt: string;
}

/**
 * PUT licitation-management:8021/update_offer/{id}
 *
 * ⚠️ SUPUESTO — endpoint no confirmado. Puede que coincida con create_offer.
 */
export type UpdateOfferRequest = Partial<CreateOfferRequest>;

/** 200 OK */
export type UpdateOfferResponse = PortalOffer;

/**
 * GET licitation-management:8021/get_offers/{id}/zip
 *
 * ⚠️ GAP CONFIRMADO — endpoint no existe en backend.
 * El botón de descarga ZIP debe permanecer deshabilitado.
 *
 * @returns Blob ZIP con toda la documentación de la oferta.
 */
export interface DownloadOfferZipParams {
  offerId: string;
}
// Respuesta: Blob (application/zip)

// ───────────────────────────────────────────────────────────────────────────────
// §2.6  Roles Service  (172.205.199.243:8030)
// ───────────────────────────────────────────────────────────────────────────────
// Estado implementación frontend:  ❌ no implementado (UI pendiente de crear)
// ⚠️ IP directa HTTP — Mixed Content bloqueante si la app sirve en HTTPS.
//
// Fichero pendiente: portales/_components/portal-ventas.tsx → AppControlAcceso

/** Rol de usuario en Akena. */
export type UserRole = "Lectura" | "Editor" | "Admin";

/**
 * GET 172.205.199.243:8030/roles/{userId}
 *
 * Obtiene el rol actual de un usuario.
 */
export interface GetUserRoleParams {
  userId: string;
}

export interface GetUserRoleResponse {
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
  lastLoginAt: string;
}

/**
 * PUT 172.205.199.243:8030/roles/{userId}
 *
 * Actualiza el rol de un usuario. Solo accesible para Admin.
 */
export interface UpdateUserRoleRequest {
  role: UserRole;
}

/** 200 OK */
export type UpdateUserRoleResponse = GetUserRoleResponse;

/**
 * DELETE 172.205.199.243:8030/roles/{userId}
 *
 * Revoca el acceso de un usuario. Solo accesible para Admin.
 * @returns 204 No Content
 */
export interface RevokeUserAccessParams {
  userId: string;
}

/**
 * POST 172.205.199.243:8030/register
 *
 * Da de alta un usuario nuevo en el sistema de roles.
 */
export interface RegisterUserRequest {
  email: string;
  displayName: string;
  /** Rol inicial asignado al alta.
   * @default "Lectura"
   */
  role?: UserRole;
}

/** 201 Created */
export type RegisterUserResponse = GetUserRoleResponse;

// ───────────────────────────────────────────────────────────────────────────────
// §2.7  Context Enhancement / Chat  (context-enhancement:8017)
// ───────────────────────────────────────────────────────────────────────────────
// Estado implementación frontend:  🟡 mock
//   - generateBotResponse() devuelve texto hardcodeado + setTimeout(1200).
//   - Historial guardado en localStorage pero nunca sale al backend.
//
// Ficheros afectados:
//   (dashboard)/_components/chat-store.ts → generateBotResponse()
//   workspace/[id]/_components/asistente-content.tsx

/** Turno de conversación enviado al contexto del asistente. */
export interface ChatHistoryTurn {
  role: "user" | "assistant";
  content: string;
}

/**
 * POST context-enhancement:8017/retrieve_documents
 *
 * Realiza RAG sobre los documentos ingestados y devuelve la respuesta del LLM.
 * ⚠️ A confirmar: ¿SSE streaming o JSON completo?
 */
export interface RetrieveDocumentsRequest {
  oppId: string;
  /** Consulta del usuario en este turno. */
  query: string;
  /** Historial de la conversación (para contexto multi-turno). */
  history: ChatHistoryTurn[];
  /** IDs de documentos ingestados de esta oportunidad. */
  documentIds: string[];
  /** Número máximo de fragmentos de contexto a recuperar.
   * @default 5
   */
  topK?: number;
}

/**
 * 200 OK — respuesta JSON completa.
 * Si el backend soporta SSE, el streaming llega como text/event-stream
 * con el campo `delta` en cada event.
 */
export interface RetrieveDocumentsResponse {
  /** Respuesta completa del asistente. */
  answer: string;
  /** Fragmentos recuperados usados como contexto (para debug / trazabilidad). */
  sources: Array<{
    documentId: string;
    fileName: string;
    pageNumber: number;
    excerpt: string;
  }>;
  /** Número de tokens consumidos (para monitoring). */
  tokensUsed?: number;
}

/**
 * SSE event (si el backend soporta streaming).
 * Cada evento llega como: data: { "delta": "..." }
 */
export interface RetrieveDocumentsStreamEvent {
  /** Fragmento incremental del texto de respuesta. */
  delta: string;
  /** Presente solo en el último event ([DONE]). */
  done?: boolean;
}

// ───────────────────────────────────────────────────────────────────────────────
// §2.8  PPT NBM  (172.205.199.243:8026)
// ───────────────────────────────────────────────────────────────────────────────
// Estado implementación frontend:  ❌ no implementado (UI pendiente de crear)
// ⚠️ IP directa HTTP — Mixed Content bloqueante si la app sirve en HTTPS.
// GAP confirmado en brief: endpoint disponible en backend pero sin UI.
//
// Fichero pendiente: workspace/[id]/_components/ppt-nbm-content.tsx

/**
 * POST 172.205.199.243:8026/extract_entities_ppt
 *
 * Genera el PPT de Nota de Búsqueda de Mercado a partir del índice y win themes.
 * ⚠️ Payload exacto a confirmar con backend.
 */
export interface ExtractEntitiesPptRequest {
  oppId: string;
  /** Contenido del índice validado. */
  outline: string;
  /**
   * Win themes validados (texto plano por sección).
   * Clave: sectionId (L1). Valor: texto del win theme.
   */
  winThemes: Record<string, string>;
  /**
   * ID del documento de plantilla PPT corporativa (opcional).
   * Si se omite, el servicio usa la plantilla por defecto.
   */
  templateDocumentId?: string;
}

/**
 * 200 OK
 * ⚠️ A confirmar: ¿devuelve URL pública o blob binario (base64)?
 */
export interface ExtractEntitiesPptResponse {
  /** URL pública del PPT generado (si el servicio devuelve URL). */
  downloadUrl?: string;
  /**
   * Contenido base64 del PPT (si el servicio devuelve blob).
   * Solo uno de downloadUrl o fileBase64 estará presente.
   */
  fileBase64?: string;
  fileName: string;
  generatedAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// §3  MODELOS DE DOMINIO FRONTEND
// ═══════════════════════════════════════════════════════════════════════════════
// Estos tipos son la fuente de verdad de los stores en /src/app/_components/.
// Cuando se integre el backend, los modelos de §2 mapean a estos.

// ───────────────────────────────────────────────────────────────────────────────
// §3.1  Auth — auth-store.ts
// ───────────────────────────────────────────────────────────────────────────────

/** Usuario de sesión activa. Persistido en localStorage bajo "akena-session-user". */
export interface FrontendAuthUser {
  id: string;       // email part before "@"
  name: string;     // display name derivado del email
  email: string;
  role: UserRole;
}

/** Entrada del registro de usuarios (admin panel). */
export interface FrontendUserRegistryEntry {
  userId: string;
  displayName: string;
  email: string;
  role: UserRole;
  lastLoginAt: string; // ISO-8601
  createdAt: string;   // ISO-8601
}

// ───────────────────────────────────────────────────────────────────────────────
// §3.2  Oportunidades — opportunities-store.ts
// ───────────────────────────────────────────────────────────────────────────────

/**
 * Oportunidad persistida localmente.
 * Mapea 1:1 con PortalOffer (§2.5) cuando se integre el backend.
 */
export interface FrontendStoredOpportunity {
  id: string;
  nombre: string;
  codigo: string;
  cliente: string;
  anno: string;
  duracion: string;
  presupuesto: string;
  tipologia: string;
  tieneLottes: string;
  lotes: string[];
  pliegos: string[];
  colaboradores: Collaborator[];
  ownerId: string;
  ownerName: string;
  createdAt: string;
  estado: string;
}

// ───────────────────────────────────────────────────────────────────────────────
// §3.3  Notificaciones — notifications-store.ts
// ───────────────────────────────────────────────────────────────────────────────

export type FrontendNotificationType = "OPPORTUNITY_ADDED";

export interface FrontendNotification {
  id: string;
  userId: string;              // receptor
  tipo: FrontendNotificationType;
  oportunidadId: string;
  oportunidadNombre: string;
  createdAt: string;           // ISO-8601
  readAt: string | null;
  createdBy: string | null;    // userId del autor
}

// ───────────────────────────────────────────────────────────────────────────────
// §3.4  Chat — chat-store.ts
// ───────────────────────────────────────────────────────────────────────────────

export interface FrontendChatUser {
  id: string;
  name: string;
}

export interface FrontendChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number; // ms epoch
}

/** Conversación completa. Mapea con el historial enviado a RetrieveDocumentsRequest. */
export interface FrontendConversation {
  id: string;
  /** Primer mensaje del usuario (truncado). */
  title: string;
  oppId: string;
  userId: string;
  messages: FrontendChatMessage[];
  createdAt: number; // ms epoch
  updatedAt: number; // ms epoch
}

// ───────────────────────────────────────────────────────────────────────────────
// §3.5  Workspace tools — persistencia colectiva (por oppId)
// ───────────────────────────────────────────────────────────────────────────────

/** §3.5.1  Índice  (indice-content.tsx) — clave: "indice-oferta-{oppId}" */
export interface FrontendStoredIndice {
  content: string;
  validatedAt: string;  // dd/mm/yyyy
  validatedBy: string;  // displayName
}

/** §3.5.2  Win Themes  (win-themes-content.tsx) — clave: "win-themes-{oppId}" */
export interface FrontendWinThemeSection {
  text: string;
  validatedAt?: string;  // dd/mm/yyyy — ausente si no validado
  validatedBy?: string;
}

export interface FrontendWinThemeStore {
  generatedAt: string;   // dd/mm/yyyy
  generatedBy: string;
  sections: Record<string, FrontendWinThemeSection>; // keyed by L1 id
}

/** §3.5.3  Oferta v0  (oferta-v0-content.tsx) — clave: "oferta-v0-{oppId}" */
export interface FrontendOfertaV0Store {
  generatedAt: string;  // dd/mm/yyyy
  generatedBy: string;
}

/** §3.5.4  Espacio de descuento colectivo  (eco-espacio-content.tsx) — clave: "eco-espacio-{oppId}" */
export interface FrontendEspacioState {
  /** Mapa de partidaId → descuento acordado (como string, ej. "12.5"). */
  descuentos: Record<string, string>;
  updatedAt: string;  // dd/mm/yyyy
  updatedBy: string;
}

/**
 * §3.5.5  Referencia por apartado  (referencia-content.tsx)
 * Clave: "ref-sel-{oppId}-{l1Id}" (una entrada por sección L1 del índice)
 */
export interface FrontendL1Store {
  l1Id: string;
  selectedNodes: string[];      // IDs de nodos del árbol de índice seleccionados
  requisitos: string;
  reqValidatedAt?: string;
  reqValidatedBy?: string;
  results?: ReferenceOffer[];   // reutiliza el tipo de §2.3
  recomendacion?: string;
  timestamp: number;            // ms epoch de la última actualización
}

/** §3.5.6  Documentos generados  (documental-content.tsx) */
export type FrontendDocToolId =
  | "doc-ppt-nbm"
  | "doc-word"
  | "doc-excel"
  | "doc-ppt-edit"
  | "doc-carpeta";

/** Clave: "{toolId}-{oppId}" */
export interface FrontendDocCardState {
  generatedAt: string;
  generatedBy: string;
  /** Mensaje informativo (ej. "Generado sin Win Themes validados"). */
  notice?: string;
}

// ───────────────────────────────────────────────────────────────────────────────
// §3.6  Workspace tools — persistencia individual (por userId + oppId)
// ───────────────────────────────────────────────────────────────────────────────

/**
 * §3.6.1  Simulación económica  (eco-simulacion-content.tsx)
 * Clave: "eco-sim-{oppId}-{userId}"
 */
export interface FrontendPartida {
  id: string;
  nombre: string;
  /** Fórmula de valoración económica (texto libre del PPT). */
  formula: string;
  presupuesto: string;
  puntuacionMax: string;
  bajatemeraria: string;
  observaciones: string;
}

export interface FrontendTablaDatos {
  partidaId: string;
  partidaNombre: string;
  presupuesto: number;
  puntuacionMax: number;
  bajatemeraria: string;
  /** Array de descuentos de cada empresa competidora (strings de %). */
  descuentos: string[];
}

export interface FrontendSimMeta {
  at: string;  // dd/mm/yyyy
  by: string;
}

export interface FrontendEcoSimPersistedState {
  configPhase: "initial" | "ready";
  hasDesglose: "si" | "no" | "";
  partidas: FrontendPartida[];
  numEmpresas: number;
  simPhase: "none" | "done";
  tablaDatos: FrontendTablaDatos[];
  simMeta: FrontendSimMeta | null;
  simConfigSnapshot: string | null;
  configCollapsed: boolean;
  resultsExpanded: boolean;
  collapsedTables: string[];
}

// ───────────────────────────────────────────────────────────────────────────────
// §3.7  Workspace tools — sin persistencia (solo session state)
// ───────────────────────────────────────────────────────────────────────────────
// Los siguientes tipos describen el estado de la UI en memoria.
// En producción, estos datos vendrán del backend y no de localStorage.

/** §3.7.1  Evaluación técnica  (evaluacion-content.tsx) */
export type FrontendEvaluationStatus = "FAVORABLE" | "DESFAVORABLE" | null;

export interface FrontendPersistedEval {
  result: string;
  evaluatedAt: string;
  evaluatedBy: string;
  fileName: string;
  /** Contexto del cliente del Portal de Ventas usado como referencia. */
  clientContext: string;
  /** Veredicto — viene del backend en producción. */
  evaluationStatus?: FrontendEvaluationStatus;
}

/** §3.7.2  Control de sobres  (sobres-content.tsx) */
export type FrontendControlStatus = "FAVORABLE" | "NO_FAVORABLE" | null;

export type FrontendIncidenciaTipo =
  | "falta_doc"
  | "nomenclatura"
  | "contaminacion"
  | "estructura";

export interface FrontendIncidencia {
  tipo: FrontendIncidenciaTipo;
  titulo: string;
  sobre: string;
  descripcion: string;
  justificacion: string;
  recomendacion: string;
}

export interface FrontendSobreValidacion {
  id: string;
  nombre: string;
  descripcion: string;
  status: "ok" | "error";
  incidencias: FrontendIncidencia[];
}

export interface FrontendPersistedControl {
  controlStatus: FrontendControlStatus;
  sobres: FrontendSobreValidacion[];
  contaminaciones: FrontendIncidencia[];
  executedAt: string;
  executedBy: string;
  packageName: string;
  packageIsFolder: boolean;
}

/** §3.7.3  Resumen ejecutivo + Chatbot  (resumen-content.tsx) */
export interface FrontendPersistedResumen {
  content: string;
  pages: number;
  generatedAt: string;
  generatedBy: string;
  fileName: string;
}

export interface FrontendPersistedChatbot {
  url: string;
  createdAt: string;
  createdBy: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// §4  INVENTARIO DE CLAVES LOCALSTORAGE
// ═══════════════════════════════════════════════════════════════════════════════
// Estas constantes son la única fuente de verdad para las claves de persistencia.
// TODOS los stores deben importar estas constantes en lugar de hardcodear strings.

export const LS_KEYS = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  /** FrontendAuthUser */
  SESSION_USER: "akena-session-user",
  /** LoginHistoryEntry[] — solo auditoría interna */
  LOGIN_HISTORY: "akena-login-history",
  /** FrontendUserRegistryEntry[] */
  USERS_REGISTRY: "akena-users-registry",

  // ── Oportunidades ─────────────────────────────────────────────────────────
  /** FrontendStoredOpportunity[] */
  OPPORTUNITIES: "akena-opportunities",

  // ── Notificaciones ────────────────────────────────────────────────────────
  /** FrontendNotification[] — segmentado por userId */
  NOTIFICATIONS: (userId: string) => `akena-notifs-${userId}`,

  // ── Chat ──────────────────────────────────────────────────────────────────
  /** FrontendConversation[] — segmentado por userId + oppId */
  CHAT_CONVERSATIONS: (userId: string, oppId: string) =>
    `akena-chats-${userId}-${oppId}`,

  // ── Workspace tools — colectivo (por oppId) ───────────────────────────────
  /** FrontendStoredIndice */
  INDICE: (oppId: string) => `indice-oferta-${oppId}`,
  /** FrontendWinThemeStore */
  WIN_THEMES: (oppId: string) => `win-themes-${oppId}`,
  /** FrontendOfertaV0Store */
  OFERTA_V0: (oppId: string) => `oferta-v0-${oppId}`,
  /** FrontendEspacioState */
  ECO_ESPACIO: (oppId: string) => `eco-espacio-${oppId}`,
  /** FrontendL1Store — una entrada por sección L1 */
  REFERENCIA_L1: (oppId: string, l1Id: string) => `ref-sel-${oppId}-${l1Id}`,
  /** FrontendDocCardState — una entrada por herramienta documental */
  DOC_CARD: (toolId: FrontendDocToolId, oppId: string) => `${toolId}-${oppId}`,

  // ── Workspace tools — individual (por userId + oppId) ─────────────────────
  /** FrontendEcoSimPersistedState */
  ECO_SIMULACION: (oppId: string, userId: string) =>
    `eco-sim-${oppId}-${userId}`,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// §5  CONSTANTES DE SERVICIO
// ═══════════════════════════════════════════════════════════════════════════════
// En producción estas URLs deben venir de variables de entorno (Vite: import.meta.env).
// Aquí se documentan los valores de referencia del brief.

export const SERVICE_URLS = {
  /** Requiere proxy reverso — no resolvible directamente desde browser. */
  DOCUMENT_COLLECTOR:    "http://document-collector:8000",
  /** Requiere proxy reverso. */
  OUTLINE_CREATOR:       "http://outline-creator:8012",
  /** Requiere proxy reverso. */
  OFFERS_SEARCHER:       "http://offers-searcher:8025",
  /** Requiere proxy reverso. */
  WIN_THEMES_EXTRACTOR:  "http://win-themes:8028",
  /** Requiere proxy reverso. */
  LICITATION_MANAGEMENT: "http://licitation-management:8021",
  /** IP directa HTTP — bloqueante en HTTPS (Mixed Content). Requiere TLS o proxy. */
  ROLES_SERVICE:         "http://172.205.199.243:8030",
  /** Requiere proxy reverso. */
  CONTEXT_ENHANCEMENT:   "http://context-enhancement:8017",
  /** IP directa HTTP — bloqueante en HTTPS (Mixed Content). Requiere TLS o proxy. */
  PPT_NBM:               "http://172.205.199.243:8026",
} as const;

export const SERVICE_ENDPOINTS = {
  DOCUMENT_COLLECTOR: {
    COLLECT:            "/collect",
  },
  OUTLINE_CREATOR: {
    CREATE_OUTLINE:     "/create_outline",
    JOB_STATUS:         (jobId: string) => `/jobs/${jobId}`,
  },
  OFFERS_SEARCHER: {
    SEARCH_OFFERS:      "/search_offers",
    DOWNLOAD_DOCUMENT:  (offerId: string) => `/offers/${offerId}/document`, // ⚠️ GAP
  },
  WIN_THEMES_EXTRACTOR: {
    EXTRACT:            "/win-themes-extractor",
  },
  LICITATION_MANAGEMENT: {
    GET_OFFERS:         "/get_offers",
    CREATE_OFFER:       "/create_offer",         // ⚠️ no documentado
    UPDATE_OFFER:       (id: string) => `/update_offer/${id}`, // ⚠️ supuesto
    DOWNLOAD_ZIP:       (id: string) => `/get_offers/${id}/zip`, // ⚠️ GAP
  },
  ROLES_SERVICE: {
    GET_ROLE:           (userId: string) => `/roles/${userId}`,
    UPDATE_ROLE:        (userId: string) => `/roles/${userId}`,
    REVOKE_ACCESS:      (userId: string) => `/roles/${userId}`,
    REGISTER:           "/register",
  },
  CONTEXT_ENHANCEMENT: {
    RETRIEVE_DOCUMENTS: "/retrieve_documents",
  },
  PPT_NBM: {
    EXTRACT_ENTITIES:   "/extract_entities_ppt",
  },
} as const;

/**
 * Tabla de estado de integración por endpoint.
 * ✅ implementado · 🟡 mock · ❌ no implementado · ⚠️ gap/supuesto
 */
export const INTEGRATION_STATUS = [
  { endpoint: "POST /collect",                       service: "document-collector:8000",     status: "❌", prioridad: "CRÍTICA",  pantalla: "01 · 05 · 08" },
  { endpoint: "POST /create_outline",                service: "outline-creator:8012",         status: "🟡", prioridad: "CRÍTICA",  pantalla: "02" },
  { endpoint: "GET  /jobs/{jobId}",                  service: "outline-creator:8012",         status: "🟡", prioridad: "CRÍTICA",  pantalla: "02" },
  { endpoint: "POST /search_offers",                 service: "offers-searcher:8025",         status: "🟡", prioridad: "ALTA",     pantalla: "03" },
  { endpoint: "GET  /offers/{id}/document",          service: "offers-searcher:8025",         status: "⚠️", prioridad: "ALTA",     pantalla: "03" },
  { endpoint: "POST /win-themes-extractor",          service: "win-themes:8028",              status: "🟡", prioridad: "ALTA",     pantalla: "04" },
  { endpoint: "POST /create_offer",                  service: "licitation-management:8021",   status: "❌", prioridad: "ALTA",     pantalla: "05" },
  { endpoint: "GET  /roles/{userId}",                service: "172.205.199.243:8030",         status: "❌", prioridad: "MEDIA",    pantalla: "06" },
  { endpoint: "PUT  /roles/{userId}",                service: "172.205.199.243:8030",         status: "❌", prioridad: "MEDIA",    pantalla: "06" },
  { endpoint: "DELETE /roles/{userId}",              service: "172.205.199.243:8030",         status: "❌", prioridad: "MEDIA",    pantalla: "06" },
  { endpoint: "POST /register",                      service: "172.205.199.243:8030",         status: "❌", prioridad: "MEDIA",    pantalla: "06" },
  { endpoint: "GET  /get_offers",                    service: "licitation-management:8021",   status: "🟡", prioridad: "ALTA",     pantalla: "07" },
  { endpoint: "PUT  /update_offer/{id}",             service: "licitation-management:8021",   status: "❌", prioridad: "ALTA",     pantalla: "07" },
  { endpoint: "GET  /get_offers/{id}/zip",           service: "licitation-management:8021",   status: "⚠️", prioridad: "ALTA",     pantalla: "07" },
  { endpoint: "POST /collect (resumen)",             service: "document-collector:8000",      status: "❌", prioridad: "ALTA",     pantalla: "08" },
  { endpoint: "POST /retrieve_documents",            service: "context-enhancement:8017",     status: "🟡", prioridad: "ALTA",     pantalla: "09" },
  { endpoint: "POST /extract_entities_ppt",          service: "172.205.199.243:8026",         status: "❌", prioridad: "MEDIA",    pantalla: "10" },
] as const;
