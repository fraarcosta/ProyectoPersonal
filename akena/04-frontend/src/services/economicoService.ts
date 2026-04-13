/**
 * Servicio de conexión con agent-economico (puerto 8088).
 * Rutas proxiadas por Vite: /api/economico → http://localhost:8088
 */
import axios from "axios";

const client = axios.create({
  baseURL: "/api/economico",
  timeout: 180_000,
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PartidaEconomica {
  nombre: string;
  puntuacion_max: string;
  presupuesto: string;
  formula: string;
  baja_temeraria: string;
  observaciones: string;
}

export interface FormulaResponse {
  presupuesto_global: string;
  tiene_desglose: boolean;
  partidas: PartidaEconomica[];
  resumen: string;
  agent: string;
}

export interface SimulateResponse {
  resultado: string;
  agent: string;
}

// ─── API calls ────────────────────────────────────────────────────────────────

/**
 * Extrae la fórmula de valoración económica del PCAP.
 */
export async function extractFormula(
  files: File[],
  sessionId: string,
  signal?: AbortSignal,
): Promise<FormulaResponse> {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  form.append("session_id", sessionId);
  const { data } = await client.post<FormulaResponse>("/extract-formula", form, {
    ...(signal ? { signal } : {}),
  });
  return data;
}

/**
 * Simula escenarios económicos con los descuentos y partidas dados.
 */
export async function simulate(
  partidas: PartidaEconomica[],
  descuentos: string[],
  numEmpresas: number,
  sessionId: string,
  signal?: AbortSignal,
): Promise<SimulateResponse> {
  const { data } = await client.post<SimulateResponse>(
    "/simulate",
    { partidas, descuentos, num_empresas: numEmpresas, session_id: sessionId },
    { ...(signal ? { signal } : {}) },
  );
  return data;
}

export async function checkEconomicoHealth(): Promise<boolean> {
  try {
    const { data } = await client.get("/health", { timeout: 5000 });
    return data?.status === "ok";
  } catch {
    return false;
  }
}
