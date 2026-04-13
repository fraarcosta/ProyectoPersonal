/**
 * @file /src/services/collectService.ts
 * @description Servicio para el microservicio Document Collector (port 8000).
 *
 * Endpoint cubierto:
 *   POST /collect  — Ingestión de documentos (ZIP, PDF, DOCX)
 *
 * Estado de integración: ❌ → ✅ (implementado en esta capa de servicios)
 * Pantallas afectadas: 01 · 05 · 08
 *
 * Nota de implementación UI pendiente:
 *   FileUploadWidget y DropZone leen nombre+tamaño pero no envían bytes.
 *   El hook useDocumentUpload (ver abajo) debe conectarse a esos componentes.
 *   Progreso de subida disponible mediante `onUploadProgress`.
 */

import { SERVICE_URLS, SERVICE_ENDPOINTS } from "../api/contracts";
import { createApiClient, withSignal } from "./apiClient";
import type {
  CollectDocumentsRequest,
  CollectDocumentsResponse,
  RequestOptions,
} from "../types/api";

// ─── Cliente axios para este servicio ────────────────────────────────────────

const BASE_URL: string =
  (import.meta as unknown as { env: Record<string, string> }).env
    ?.VITE_DOCUMENT_COLLECTOR_URL ?? SERVICE_URLS.DOCUMENT_COLLECTOR;

const client = createApiClient(BASE_URL);

// ═══════════════════════════════════════════════════════════════════════════════
// Funciones de servicio
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Ingestiona uno o más documentos en el vector store.
 *
 * El payload se construye automáticamente como `multipart/form-data`
 * adjuntando cada File con la misma clave `"files"`.
 *
 * @param params   Título descriptivo + array de archivos.
 * @param options  AbortSignal opcional para cancelación, callback de progreso.
 *
 * @throws {ApiValidationError}  Si el servidor devuelve 422.
 * @throws {ApiHttpError}        Para cualquier otro error HTTP.
 *
 * @example
 * const { file_info } = await collectDocuments(
 *   { title: "Pliego técnico - Opp001", files: selectedFiles },
 *   { signal: controller.signal, onUploadProgress: (pct) => setProgress(pct) },
 * );
 * const documentIds = file_info.map((f) => f.request_id);
 */
export async function collectDocuments(
  params: CollectDocumentsRequest,
  options: RequestOptions & {
    /** Callback invocado con el porcentaje completado (0–100). */
    onUploadProgress?: (percentage: number) => void;
  } = {},
): Promise<CollectDocumentsResponse> {
  const { signal, onUploadProgress } = options;

  const formData = new FormData();
  formData.append("title", params.title);
  for (const file of params.files) {
    formData.append("files", file);
  }

  const { data } = await client.post<CollectDocumentsResponse>(
    SERVICE_ENDPOINTS.DOCUMENT_COLLECTOR.COLLECT,
    formData,
    {
      headers: {
        // Axios gestiona automáticamente el boundary cuando el body es FormData.
        "Content-Type": "multipart/form-data",
      },
      ...withSignal(signal),
      ...(onUploadProgress && {
        onUploadProgress: (ev) => {
          if (ev.total && ev.total > 0) {
            onUploadProgress(Math.round((ev.loaded / ev.total) * 100));
          }
        },
      }),
    },
  );

  return data;
}
