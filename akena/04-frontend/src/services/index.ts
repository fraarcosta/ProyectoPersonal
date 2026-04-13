/**
 * @file /src/services/index.ts
 * @description Barrel de exportaciones de la capa de servicios Akena.
 *
 * Importar siempre desde aquí en los componentes para mantener
 * las rutas de importación estables aunque cambie la estructura interna.
 *
 * @example
 * import { collectDocuments, searchOffers, getOffers } from "../../services";
 */

// ── HTTP client ───────────────────────────────────────────────────────────────
export { createApiClient, buildServiceUrl, withSignal } from "./apiClient";

// ── Tipos de error (re-export desde types/api para evitar imports dobles) ─────
export { ApiValidationError, ApiHttpError } from "../types/api";

// ── Document Collector ────────────────────────────────────────────────────────
export { collectDocuments } from "./collectService";

// ── Outline Creator ───────────────────────────────────────────────────────────
export { createOutline, pollOutlineJob } from "./outlineService";
export type { OutlineJobStatus, OutlineJobResponse } from "./outlineService";

// ── Licitation Management ─────────────────────────────────────────────────────
export {
  getLicitations,
  deleteLicitation,
  getOffers,
  createOffer,
  updateOffer,
} from "./licitationService";

// ── Context Enhancement / Chat ────────────────────────────────────────────────
export { retrieveDocuments, retrieveDocumentsStream } from "./retrieveDocumentsService";
export type { StreamDelta } from "./retrieveDocumentsService";

// ── Offers Searcher ───────────────────────────────────────────────────────────
export { searchOffers, downloadReferenceDocument } from "./searchOffersService";

// ── Win Themes Extractor ──────────────────────────────────────────────────────
export { extractWinThemes, extractWinThemesByArgs } from "./winThemesService";

// ── Roles Service ─────────────────────────────────────────────────────────────
export { getUserRole, updateUserRole, revokeUserAccess, registerUser } from "./rolesService";

// ── PPT NBM ────────────────────────��──────────────────────────────────────────
export { extractEntitiesPpt, downloadPptNbmBlob } from "./pptNbmService";
