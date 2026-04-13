/**
 * @file /src/services/cualificacionService.ts
 * @description Cliente para el Agent Cualificación (FastAPI · port 8084).
 *
 * Rutas disponibles:
 *   GET  /health                  → estado del servicio
 *   POST /qualify                 → analiza pliegos subidos, devuelve GO/NO-GO estructurado
 *
 * El Vite dev server proxea /api/cualificacion/* → http://localhost:8084/*
 * En producción, VITE_CUALIFICACION_URL apuntará al ingress/gateway real.
 */

// ─── Configuración ────────────────────────────────────────────────────────────

const BASE_URL: string =
  (import.meta as unknown as { env: Record<string, string> }).env
    ?.VITE_CUALIFICACION_URL ?? "/api/cualificacion";

/** Categorías no reconocidas del LLM se agrupan aquí para que no se pierdan en la UI. */
export const EXTRA_CATEGORY = "Otros datos extraídos";

/** Categorías canónicas (deben coincidir con CATEGORIES_ORDER en cualificacion/page.tsx). */
export const CANONICAL_CATEGORIES = [
  "Identificación y alcance",
  "Plazos y calendario",
  "Económico",
  "Tarifas y facturación",
  "Solvencia",
  "Perfiles requeridos",
  "Restricciones operativas",
  "Criterios de adjudicación",
  "Riesgos detectados",
  EXTRA_CATEGORY,
] as const;

/** Mapeo de variantes que devuelve el LLM → categoría canónica (trim + case-insensitive). */
const CATEGORY_ALIASES: Record<string, string> = {
  "identificación y alcance": "Identificación y alcance",
  "identificacion y alcance": "Identificación y alcance",
  "identificación": "Identificación y alcance",
  "plazos y calendario": "Plazos y calendario",
  "plazos": "Plazos y calendario",
  "calendario": "Plazos y calendario",
  económico: "Económico",
  economico: "Económico",
  "tarifas y facturación": "Tarifas y facturación",
  "tarifas y facturacion": "Tarifas y facturación",
  tarifas: "Tarifas y facturación",
  facturación: "Tarifas y facturación",
  solvencia: "Solvencia",
  "perfiles requeridos": "Perfiles requeridos",
  perfiles: "Perfiles requeridos",
  "restricciones operativas": "Restricciones operativas",
  "criterios de adjudicación": "Criterios de adjudicación",
  "criterios de adjudicacion": "Criterios de adjudicación",
  "riesgos detectados": "Riesgos detectados",
  riesgos: "Riesgos detectados",
};

function normalizeCategory(raw: string): string {
  const t = String(raw ?? "").trim();
  if (!t) return EXTRA_CATEGORY;
  const key = t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if ((CANONICAL_CATEGORIES as readonly string[]).includes(t)) return t;
  const mapped = CATEGORY_ALIASES[key];
  if (mapped) return mapped;
  for (const canon of CANONICAL_CATEGORIES) {
    if (canon === EXTRA_CATEGORY) continue;
    if (canon.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === key) {
      return canon;
    }
  }
  return EXTRA_CATEGORY;
}

function normalizeDecision(v: unknown): "GO" | "NO_GO" {
  const s = String(v ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
  if (s === "GO" || s === "G_O") return "GO";
  if (
    s === "NO_GO" ||
    s === "NOGO" ||
    s === "NO-GO" ||
    s.includes("NO_GO") ||
    (s.includes("NO") && s.includes("GO"))
  ) {
    return "NO_GO";
  }
  if (s.startsWith("NO")) return "NO_GO";
  return "GO";
}

function normalizeConfidence(v: unknown): "HIGH" | "MEDIUM" | "LOW" {
  const s = String(v ?? "").trim().toUpperCase();
  if (s === "HIGH" || s === "ALTA" || s === "H") return "HIGH";
  if (s === "LOW" || s === "BAJA" || s === "L") return "LOW";
  return "MEDIUM";
}

const COMMERCIAL_ORIGIN_IDS: readonly CommercialOriginId[] = [
  "accenture_led",
  "relationship_momentum",
  "reactive_untracked",
];

function normalizeCommercialOriginId(v: unknown): CommercialOriginId | undefined {
  const s = String(v ?? "").trim().toLowerCase().replace(/-/g, "_");
  if (COMMERCIAL_ORIGIN_IDS.includes(s as CommercialOriginId)) return s as CommercialOriginId;
  return undefined;
}

function asString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return "";
  }
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

/** Debe coincidir con los valores del Form en agent-cualificacion /qualify */
export type CommercialOriginId =
  | "accenture_led"
  | "relationship_momentum"
  | "reactive_untracked";

export interface QualifyFile {
  file: File;
  docType: "administrativo" | "tecnico" | "anexo";
}

export interface QualifyOptions {
  /** Origen comercial (~50% del criterio GO/NO-GO en el agente) */
  commercialOrigin?: CommercialOriginId;
  signal?: AbortSignal;
}

/** Matches shared.ExtractedField from prequalification-store.ts */
export interface QualifyExtractedField {
  id: string;
  category: string;
  label: string;
  value: string;
  source?: string;
  needsReview: boolean;
  multiline?: boolean;
}

/** Full response from POST /qualify — matches PrequalResult + extras expected by the frontend. */
export interface QualifyResponse {
  decision: "GO" | "NO_GO";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  reasons: string[];
  /** Eco del origen comercial enviado por el usuario */
  commercialOriginId?: CommercialOriginId;
  /** Desglose explícito 50% comercial / 50% pliego en la decisión */
  decisionBlend?: {
    commercialHalf: string;
    pliegoHalf: string;
  };
  justification: {
    encaje: string;
    riesgosOperativos: string;
    riesgosEconomicos: string;
    complejidadDocumental: string;
    recomendacion: string;
  };
  extractedFields: QualifyExtractedField[];
  clientName: string;
  objectSummary: string;
}

const EMPTY_JUSTIFICATION: QualifyResponse["justification"] = {
  encaje: "",
  riesgosOperativos: "",
  riesgosEconomicos: "",
  complejidadDocumental: "",
  recomendacion: "",
};

/**
 * Normaliza la respuesta cruda del backend (LLM puede variar claves, categorías o tipos).
 * Garantiza que la UI reciba strings y categorías alineadas con las secciones del informe.
 */
export function normalizeQualifyResponse(data: unknown): QualifyResponse {
  if (!data || typeof data !== "object") {
    throw new Error("Respuesta de cualificación vacía o inválida");
  }
  const o = data as Record<string, unknown>;

  const rawJust = o.justification;
  let justification = { ...EMPTY_JUSTIFICATION };
  if (rawJust && typeof rawJust === "object") {
    const j = rawJust as Record<string, unknown>;
    justification = {
      encaje: asString(j.encaje ?? j.encaje_con_capacidades),
      riesgosOperativos: asString(j.riesgosOperativos ?? j.riesgos_operativos),
      riesgosEconomicos: asString(j.riesgosEconomicos ?? j.riesgos_economicos),
      complejidadDocumental: asString(
        j.complejidadDocumental ?? j.complejidad_documental,
      ),
      recomendacion: asString(j.recomendacion ?? j.recomendación),
    };
  }

  let reasons: string[] = [];
  if (Array.isArray(o.reasons)) {
    reasons = o.reasons.map(r => asString(r)).filter(Boolean);
  } else if (typeof o.reasons === "string") {
    reasons = [o.reasons];
  }
  if (reasons.length === 0) {
    reasons = ["Análisis completado según documentación aportada."];
  }

  let extractedFields: QualifyExtractedField[] = [];
  const rawFields = o.extractedFields;
  if (Array.isArray(rawFields)) {
    extractedFields = rawFields.map((item, idx) => {
      const f = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
      const id = asString(f.id).trim() || `field_${idx}`;
      const category = normalizeCategory(asString(f.category));
      const label = asString(f.label).trim() || id;
      const value = asString(f.value);
      const source = f.source != null ? asString(f.source) : undefined;
      const needsReview = Boolean(f.needsReview ?? f.needs_review);
      const multiline = Boolean(f.multiline ?? (value.length > 120));
      return { id, category, label, value, source, needsReview, multiline };
    });
  }

  let decisionBlend: QualifyResponse["decisionBlend"];
  const rawBlend = o.decisionBlend ?? o.decision_blend;
  if (rawBlend && typeof rawBlend === "object") {
    const b = rawBlend as Record<string, unknown>;
    decisionBlend = {
      commercialHalf: asString(b.commercialHalf ?? b.commercial_half),
      pliegoHalf: asString(b.pliegoHalf ?? b.pliego_half),
    };
  }

  return {
    decision: normalizeDecision(o.decision),
    confidence: normalizeConfidence(o.confidence),
    reasons,
    commercialOriginId: normalizeCommercialOriginId(
      o.commercialOriginId ?? o.commercial_origin_id,
    ),
    decisionBlend,
    justification,
    extractedFields,
    clientName: asString(o.clientName ?? o.client_name ?? o.organismo).trim(),
    objectSummary: asString(o.objectSummary ?? o.object_summary ?? o.objeto).trim(),
  };
}

// ─── Funciones de servicio ────────────────────────────────────────────────────

/**
 * Sube los pliegos al agent-cualificacion y obtiene el análisis GO/NO-GO.
 *
 * El agente extrae el texto de cada PDF/DOCX, lo procesa con Claude y devuelve
 * un JSON estructurado con la decisión, campos extraídos y justificación.
 *
 * @param localFiles  Archivos + tipo de documento seleccionados por el usuario.
 * @param signal      AbortSignal para cancelar si el usuario cierra la pantalla.
 */
export async function analyzeDocuments(
  localFiles: QualifyFile[],
  options?: QualifyOptions,
): Promise<QualifyResponse> {
  const commercialOrigin: CommercialOriginId =
    options?.commercialOrigin ?? "relationship_momentum";
  const signal = options?.signal;

  const formData = new FormData();

  for (const lf of localFiles) {
    formData.append("files", lf.file, lf.file.name);
    formData.append("doc_types", lf.docType);
  }
  formData.append("commercial_origin", commercialOrigin);

  const response = await fetch(`${BASE_URL}/qualify`, {
    method: "POST",
    body: formData,
    ...(signal ? { signal } : {}),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`qualify failed (${response.status}): ${text}`);
  }

  const json: unknown = await response.json();
  return normalizeQualifyResponse(json);
}
