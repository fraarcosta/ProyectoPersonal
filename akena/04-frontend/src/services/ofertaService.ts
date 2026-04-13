/**
 * Servicio de conexión con agent-oferta (puerto 8087).
 * Rutas proxiadas por Vite: /api/oferta → http://localhost:8087
 */
import axios from "axios";

const client = axios.create({
  baseURL: "/api/oferta",
  timeout: 180_000,
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type IncoherenciaTipo = "contradiccion" | "inconsistencia" | "ambiguedad" | "duplicado";

export interface IncoherenciaItem {
  id: string;
  tipo: IncoherenciaTipo;
  titulo: string;
  descripcion: string;
  secciones: string[];
  paginas: string;
  recomendacion: string;
}

export interface IncoherenciasResponse {
  items: IncoherenciaItem[];
  agent: string;
}

export interface IndexResponse {
  index: string;
  agent: string;
}

// ─── API calls ────────────────────────────────────────────────────────────────

/**
 * Detecta incoherencias entre los documentos del pliego (PCAP, PPT, Anexos).
 */
export async function detectIncoherencias(
  files: File[],
  sessionId: string,
  signal?: AbortSignal,
): Promise<IncoherenciasResponse> {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  form.append("session_id", sessionId);
  const { data } = await client.post<IncoherenciasResponse>("/detect-incoherencias", form, {
    ...(signal ? { signal } : {}),
  });
  return data;
}

/**
 * Genera el índice estructurado de la oferta técnica a partir del pliego.
 */
export async function generateIndex(
  files: File[],
  sessionId: string,
  signal?: AbortSignal,
): Promise<IndexResponse> {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  form.append("session_id", sessionId);
  const { data } = await client.post<IndexResponse>("/generate-index", form, {
    ...(signal ? { signal } : {}),
  });
  return data;
}

export async function checkOfertaHealth(): Promise<boolean> {
  try {
    const { data } = await client.get("/health", { timeout: 5000 });
    return data?.status === "ok";
  } catch {
    return false;
  }
}
