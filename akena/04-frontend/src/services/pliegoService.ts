/**
 * Servicio de conexión con agent-pliego.
 * Rutas proxiadas por Vite: /api/pliego → http://localhost:8085
 */
import axios from "axios";

const BASE_URL = "/api/pliego";

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 180_000, // 3 min — los pliegos extensos tardan
});

export type AnalysisDepth = "breve" | "medio" | "extenso";

export interface PliegoAnalysisResponse {
  analysis: string;
  depth: AnalysisDepth;
  agent: string;
}

export interface PliegoChatResponse {
  response: string;
  agent: string;
}

/**
 * Envía el fichero (PDF o DOCX) directamente al backend para extracción de
 * texto y análisis. Es el flujo recomendado.
 */
export async function analyzeFile(
  file: File,
  depth: AnalysisDepth,
  sessionId: string,
  signal?: AbortSignal,
): Promise<PliegoAnalysisResponse> {
  const form = new FormData();
  form.append("file", file);
  form.append("depth", depth);
  form.append("session_id", sessionId);

  // No pongas Content-Type manualmente — axios lo genera con el boundary correcto
  const { data } = await client.post<PliegoAnalysisResponse>("/analyze-file", form, {
    ...(signal ? { signal } : {}),
  });
  return data;
}

/**
 * Envía varios ficheros (PDF o DOCX) al backend para extracción y análisis combinado.
 * Es el flujo recomendado cuando hay más de un documento (PCAP + PPT + Anexos).
 */
export async function analyzeFiles(
  files: File[],
  depth: AnalysisDepth,
  sessionId: string,
  signal?: AbortSignal,
): Promise<PliegoAnalysisResponse> {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  form.append("depth", depth);
  form.append("session_id", sessionId);

  const { data } = await client.post<PliegoAnalysisResponse>("/analyze-files", form, {
    ...(signal ? { signal } : {}),
  });
  return data;
}

/**
 * Envía el texto extraído manualmente (útil si el browser ya tiene el texto).
 */
export async function analyzeText(
  text: string,
  depth: AnalysisDepth,
  sessionId: string,
  fileName = "",
  signal?: AbortSignal,
): Promise<PliegoAnalysisResponse> {
  const { data } = await client.post<PliegoAnalysisResponse>(
    "/analyze",
    { text, depth, session_id: sessionId, file_name: fileName },
    { ...(signal ? { signal } : {}) },
  );
  return data;
}

/**
 * Continuación conversacional — preguntas de seguimiento sobre el análisis.
 */
export async function chatWithPliego(
  message: string,
  sessionId: string,
  signal?: AbortSignal,
): Promise<PliegoChatResponse> {
  const { data } = await client.post<PliegoChatResponse>(
    "/chat",
    { message, session_id: sessionId },
    { ...(signal ? { signal } : {}) },
  );
  return data;
}

export async function checkPliegoHealth(): Promise<boolean> {
  try {
    const { data } = await client.get("/health", { timeout: 5000 });
    return data?.status === "ok";
  } catch {
    return false;
  }
}
