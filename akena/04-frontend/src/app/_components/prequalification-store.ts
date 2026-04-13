// ─── Prequalification Store ───────────────────────────────────────────────────
// Persistent (localStorage) store for GO/NO GO pre-qualifications.

const LS_KEY = "akena:prequalifications";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PrequalFile {
  name:    string;
  size:    number;
  docType: "administrativo" | "tecnico" | "anexo";
}

export interface ExtractedField {
  id:          string;
  category:    string;
  label:       string;
  value:       string;
  source?:     string;
  needsReview: boolean;
  multiline?:  boolean;
}

export interface PrequalResult {
  decision:   "GO" | "NO_GO";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  reasons:    string[];
  justification: {
    encaje:                string;
    riesgosOperativos:     string;
    riesgosEconomicos:     string;
    complejidadDocumental: string;
    recomendacion:         string;
  };
}

export type CommercialOriginId =
  | "accenture_led"
  | "relationship_momentum"
  | "reactive_untracked";

export interface Prequalification {
  id:              string;
  createdAt:       string;
  updatedAt:       string;
  files:           PrequalFile[];
  result:          PrequalResult | null;
  extractedFields: ExtractedField[];
  clientName:      string;
  objectSummary:   string;
  /** Origen comercial declarado antes del análisis */
  commercialOriginId?: CommercialOriginId;
  /** Cómo el agente combinó 50% comercial + 50% pliego */
  decisionBlend?: {
    commercialHalf: string;
    pliegoHalf: string;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readAll(): Prequalification[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Prequalification[]) : [];
  } catch {
    return [];
  }
}

function writeAll(list: Prequalification[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch {}
}

function uid(): string {
  return `PQ-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 5)
    .toUpperCase()}`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getPrequalifications(): Prequalification[] {
  return readAll().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function getPrequalification(id: string): Prequalification | null {
  return readAll().find(p => p.id === id) ?? null;
}

export function createPrequalification(
  partial: Pick<Prequalification, "files">,
): Prequalification {
  const now = new Date().toISOString();
  const pq: Prequalification = {
    id:              uid(),
    createdAt:       now,
    updatedAt:       now,
    files:           partial.files,
    result:          null,
    extractedFields: [],
    clientName:      "",
    objectSummary:   "",
  };
  writeAll([pq, ...readAll()]);
  return pq;
}

export function savePrequalification(pq: Prequalification): void {
  const list = readAll();
  const idx  = list.findIndex(p => p.id === pq.id);
  const updated = { ...pq, updatedAt: new Date().toISOString() };
  if (idx >= 0) list[idx] = updated;
  else list.unshift(updated);
  writeAll(list);
}

// ─── Mock analysis ────────────────────────────────────────────────────────────
// In a real integration, this would be replaced by an API call to the backend.

export function mockAnalyze(pq: Prequalification): Promise<{
  result:          PrequalResult;
  extractedFields: ExtractedField[];
  clientName:      string;
  objectSummary:   string;
}> {
  return new Promise(resolve => {
    setTimeout(() => {
      const clientName    = "Agencia Estatal de Administración Tributaria (AEAT)";
      const objectSummary = "Servicios de mantenimiento evolutivo y soporte de la plataforma de gestión tributaria SARA Next";

      const result: PrequalResult = {
        decision:   "GO",
        confidence: "MEDIUM",
        reasons: [
          "El presupuesto base (4,2 M€) se encuentra en el rango óptimo de rentabilidad de Accenture para contratos de mantenimiento.",
          "Tipología AMS + mantenimiento evolutivo alineada con capacidades core del área de Public Service.",
          "Criterio técnico de mayor peso (65 pts sobre 100) favorece la diferenciación por metodología y equipo.",
          "Duración de 24 meses + 2 prórrogas de 12 meses ofrece visibilidad de ingresos a medio plazo.",
          "Requisito de presencialidad mixta (<40%) y sin SLA 24x7 es asumible operativamente.",
        ],
        justification: {
          encaje:
            "La licitación encaja con el perfil de capacidades del área de Public Service Technology. La tipología AMS + evolutivo está soportada por los centros de entrega actuales. El equipo técnico requerido (perfiles Java, arquitectura, PMO) está disponible en el pool interno.",
          riesgosOperativos:
            "Existe cláusula de subrogación de 3 personas con condiciones pendientes de confirmar en el pliego técnico. La presencialidad mixta exige al menos 2 días/semana en las instalaciones del cliente en Madrid. Se recomienda validar disponibilidad de perfil senior antes de presentar oferta.",
          riesgosEconomicos:
            "La fórmula económica usa puntuación lineal sobre la baja respecto al presupuesto máximo, con umbral de baja temeraria en el 30%. Si el peso económico (35 pts) se cubre con una baja agresiva, el margen puede comprometerse. Se recomienda simular escenarios de descuento antes de fijar precio.",
          complejidadDocumental:
            "El pliego exige sobre A (administrativo) y sobre B (técnico). Se detecta requisito de certificación ENS (Esquema Nacional de Seguridad) nivel Medio, que Accenture ya posee. La documentación de solvencia técnica requiere 2 contratos de referencia similares en los últimos 5 años.",
          recomendacion:
            "Recomendación GO condicionada. Antes de validar definitivamente: (1) Confirmar disponibilidad de equipo senior y resolver subrogación, (2) Preparar estrategia de precio con margen mínimo del 18%, (3) Validar las referencias técnicas requeridas en el sobre B.",
        },
      };

      const extractedFields: ExtractedField[] = [
        // ── Identificación y alcance ──────────────────────────────────────────
        { id: "cliente",           category: "Identificación y alcance", label: "Cliente / Organismo convocante",       value: clientName,                                                                source: "Pliego administrativo – Carátula",       needsReview: false },
        { id: "objeto",            category: "Identificación y alcance", label: "Objeto de la licitación",              value: objectSummary,                                                             source: "Pliego administrativo – Cláusula 1",     needsReview: false, multiline: true },
        { id: "codigo_expediente", category: "Identificación y alcance", label: "Código de expediente / referencia",    value: "EXP-AEAT-2026-0047",                                                      source: "Pliego administrativo – Carátula",       needsReview: false },
        { id: "anno",              category: "Identificación y alcance", label: "Año de la licitación",                 value: "2026",                                                                    source: "Pliego administrativo – Carátula",       needsReview: false },
        { id: "tipologia",         category: "Identificación y alcance", label: "Tipología de contrato",                value: "AMS (Application Management Services), Mantenimiento evolutivo",          source: "Pliego técnico – Objeto del contrato",  needsReview: false },
        { id: "ambito",            category: "Identificación y alcance", label: "Ámbito geográfico",                    value: "Madrid (sede central AEAT, Calle Infanta Mercedes 37)",                   source: "Pliego administrativo – Cláusula 5",    needsReview: false },
        { id: "duracion",          category: "Identificación y alcance", label: "Duración del contrato (+ prórrogas)",  value: "24 meses + 2 prórrogas de 12 meses cada una",                             source: "Pliego administrativo – Cláusula 7",    needsReview: false },
        { id: "lotes",             category: "Identificación y alcance", label: "Lotes",                                value: "Sin lotes. Contrato único.",                                              source: "Pliego administrativo – Cláusula 2",    needsReview: false },

        // ── Plazos y calendario ───────────────────────────────────────────────
        { id: "plazo_presentacion", category: "Plazos y calendario", label: "Fecha límite de presentación de ofertas", value: "15 de mayo de 2026 a las 14:00h",                                         source: "Pliego administrativo – Cláusula 8",    needsReview: false },
        { id: "plazo_aclaraciones", category: "Plazos y calendario", label: "Plazo de consultas / aclaraciones",       value: "Hasta el 1 de mayo de 2026 (15 días antes de la apertura)",               source: "Pliego administrativo – Cláusula 8",    needsReview: false },
        { id: "plazo_adjudicacion", category: "Plazos y calendario", label: "Fecha estimada de adjudicación",          value: "Julio 2026 (estimado 2 meses tras apertura)",                             source: "Pliego administrativo – Cláusula 10",   needsReview: false },
        { id: "plazo_inicio",       category: "Plazos y calendario", label: "Plazo de inicio de la prestación",        value: "30 días desde la firma del contrato",                                     source: "Pliego técnico – Cláusula 3",           needsReview: false },
        { id: "plazo_garantia",     category: "Plazos y calendario", label: "Plazo de garantía post-contrato",         value: "12 meses tras la recepción definitiva",                                   source: "Pliego administrativo – Cláusula 14",   needsReview: false },

        // ── Económico ─────────────────────────────────────────────────────────
        { id: "presupuesto",    category: "Económico", label: "Presupuesto base sin IVA (€)",           value: "4.200.000 €",                                                                             source: "Pliego administrativo – Cláusula 4",    needsReview: false },
        { id: "formula",        category: "Económico", label: "Fórmula de valoración económica",        value: "Puntuación lineal sobre la baja. Baja temeraria: 30% sobre presupuesto base.",           source: "Pliego administrativo – Cláusula 11.2", needsReview: false, multiline: true },
        { id: "penalizaciones", category: "Económico", label: "Penalizaciones económicas relevantes",   value: "Hasta 2% del presupuesto anual por incumplimiento de SLA crítico.",                      source: "Pliego técnico – Cláusula 9.3",         needsReview: false },
        { id: "garantias",      category: "Económico", label: "Garantías / fianzas exigidas",           value: "Fianza definitiva: 5% del importe de adjudicación (≈ 210.000 € estimados).",            source: "Pliego administrativo – Cláusula 14",   needsReview: false },
        { id: "forma_pago",     category: "Económico", label: "Forma y plazo de pago",                  value: "Facturación mensual. Pago a 30 días desde conformidad.",                                 source: "Pliego administrativo – Cláusula 16",   needsReview: false },
        { id: "revision_precios", category: "Económico", label: "Revisión / indexación de precios",     value: "Revisión anual según IPC. Máximo +2% anual.",                                            source: "Pliego administrativo – Cláusula 17",   needsReview: false },

        // ── Tarifas y facturación ─────────────────────────────────────────────
        { id: "modelo_facturacion", category: "Tarifas y facturación", label: "Modelo de facturación",                       value: "Mixto: bolsa de horas mensual (T&M) para evolutivo + precio fijo por entregables de transición.", source: "Pliego administrativo – Cláusula 4.2", needsReview: false },
        { id: "tarifas_perfiles",   category: "Tarifas y facturación", label: "Tarifas unitarias por perfil (€/hora)",        value: "Director de proyecto: 120 €/h\nArquitecto senior: 105 €/h\nDesarrollador senior (Java): 90 €/h\nDesarrollador junior: 65 €/h\nTécnico de pruebas: 60 €/h", source: "Pliego administrativo – Anexo I", needsReview: true, multiline: true },
        { id: "hitos_facturacion",  category: "Tarifas y facturación", label: "Hitos / entregables vinculados a facturación", value: "Hito 1 (mes 1): Plan de transición aprobado – 15% del total.\nHito 2 (mes 3): Traspaso completo de conocimiento – 10% del total.\nResto: mensualidades según servicio prestado.", source: "Pliego administrativo – Cláusula 16", needsReview: false, multiline: true },
        { id: "bolsas_horas",       category: "Tarifas y facturación", label: "Bolsas de horas / unidades funcionales",       value: "Bolsa de 500 UF/mes para evolutivo. Excedente a precio unitario de anexo I.",                   source: "Pliego técnico – Cláusula 6",         needsReview: false },

        // ── Solvencia ─────────────────────────────────────────────────────────
        { id: "solvencia_economica", category: "Solvencia", label: "Solvencia económica exigida",                       value: "Volumen de negocio anual ≥ 2 veces el presupuesto base (≥ 8.400.000 €/año) en los últimos 3 ejercicios.", source: "Pliego administrativo – Cláusula 6.1", needsReview: false },
        { id: "solvencia_tecnica",   category: "Solvencia", label: "Solvencia técnica exigida",                         value: "Mínimo 2 contratos de objeto similar (AMS / mantenimiento evolutivo) en los últimos 5 años con importe ≥ 1.000.000 € c/u.", source: "Pliego administrativo – Cláusula 6.2", needsReview: false, multiline: true },
        { id: "clasificacion",       category: "Solvencia", label: "Clasificación empresarial / grupo / subgrupo",      value: "Grupo V, Subgrupo 1 y 2 (Servicios informáticos). Categoría D.",                                    source: "Pliego administrativo – Cláusula 6",  needsReview: false },
        { id: "certificaciones_req", category: "Solvencia", label: "Certificaciones obligatorias",                      value: "ENS nivel Medio vigente. Deseable ISO 27001 e ISO 9001.",                                            source: "Pliego técnico – Cláusula 15",        needsReview: false },
        { id: "ute",                 category: "Solvencia", label: "Admisión de UTE / subcontratación",                 value: "Se admite UTE. Subcontratación máxima del 60% del contrato.",                                       source: "Pliego administrativo – Cláusula 6.4", needsReview: false },

        // ── Perfiles requeridos ───────────────────────────────────────────────
        { id: "perfiles_lista",  category: "Perfiles requeridos", label: "Perfiles profesionales requeridos",          value: "Director/Jefe de proyecto · Arquitecto senior · Desarrolladores Java senior (3) · Desarrolladores junior (4) · Técnico de calidad y pruebas · Técnico de sistemas / devops", source: "Pliego técnico – Cláusula 7", needsReview: false, multiline: true },
        { id: "perfil_director", category: "Perfiles requeridos", label: "Director / Jefe de proyecto",                value: "Titulación superior. ≥10 años experiencia TI, ≥5 años gestión proyectos sector público. Certificación PMP o equivalente. Jornada completa.", source: "Pliego técnico – Cláusula 7.1", needsReview: false },
        { id: "perfil_tecnico",  category: "Perfiles requeridos", label: "Perfil técnico principal (Arquitecto/Sr.)",  value: "Titulación superior o media. ≥7 años experiencia Java EE, microservicios, Oracle. Deseable AWS o Azure certified. Jornada completa.", source: "Pliego técnico – Cláusula 7.2", needsReview: false },
        { id: "perfil_otros",    category: "Perfiles requeridos", label: "Otros perfiles relevantes",                  value: "Técnico de pruebas: ≥3 años, ISTQB Foundation. DevOps: ≥3 años Jenkins/GitLab CI. Todos con nivel B2 inglés.", source: "Pliego técnico – Cláusula 7.3", needsReview: false, multiline: true },
        { id: "num_personas",    category: "Perfiles requeridos", label: "Número estimado de personas / FTEs",         value: "≈ 10 FTEs (8 dedicación completa + 2 parcial)",                                                       source: "Pliego técnico – Cláusula 7",   needsReview: false },

        // ── Restricciones operativas ──────────────────────────────────────────
        { id: "presencialidad", category: "Restricciones operativas", label: "Presencialidad requerida",            value: "Mixta – mínimo 2 días/semana en instalaciones cliente (aprox. 40%)",                              source: "Pliego técnico – Cláusula 12",          needsReview: false },
        { id: "idioma",         category: "Restricciones operativas", label: "Idioma requerido",                    value: "Español (castellano). Documentación técnica en español.",                                         source: "Pliego administrativo – Cláusula 19",   needsReview: false },
        { id: "sla",            category: "Restricciones operativas", label: "SLA críticos / disponibilidad 24×7", value: "No. Horario de atención L-V 8:00-20:00. Sin guardia nocturna.",                                   source: "Pliego técnico – Cláusula 8",           needsReview: false },
        { id: "subrogacion",    category: "Restricciones operativas", label: "Subrogación de personal",             value: "Sí – 3 personas (perfiles a confirmar). Condiciones en anexo III.",                              source: "Pliego administrativo – Anexo III",     needsReview: true  },
        { id: "seguridad",      category: "Restricciones operativas", label: "Requisitos de seguridad / ENS",       value: "ENS nivel Medio obligatorio. Deseable ISO 27001.",                                                source: "Pliego técnico – Cláusula 15",          needsReview: false },

        // ── Criterios de adjudicación ─────────────────────────────────────────
        { id: "reparto",      category: "Criterios de adjudicación", label: "Reparto puntos técnicos / económicos",  value: "65 puntos técnicos / 35 puntos económicos",                                                     source: "Pliego administrativo – Cláusula 11",   needsReview: false },
        { id: "criterios_tec", category: "Criterios de adjudicación", label: "Principales criterios técnicos",      value: "Metodología de mantenimiento (20 pts), Equipo propuesto y CVs (20 pts), Plan de transición (15 pts), Mejoras ofertadas (10 pts)", source: "Pliego administrativo – Cláusula 11.1", needsReview: false, multiline: true },
        { id: "sobres",       category: "Criterios de adjudicación", label: "Documentación obligatoria por sobres",  value: "Sobre A: documentación administrativa (DEUC, declaraciones, solvencia). Sobre B: propuesta técnica y económica.", source: "Pliego administrativo – Cláusula 9", needsReview: false, multiline: true },
        { id: "mejoras",      category: "Criterios de adjudicación", label: "Mejoras / criterios de desempate",      value: "Mejoras ofertadas sobre los requisitos mínimos del PPT (hasta 10 pts adicionales).",             source: "Pliego administrativo – Cláusula 11.3", needsReview: false },

        // ── Riesgos detectados ────────────────────────────────────────────────
        { id: "riesgos",      category: "Riesgos detectados", label: "Riesgos clave identificados",      value: "1. Subrogación de 3 perfiles con condiciones no especificadas en el pliego principal.\n2. Fórmula económica agresiva si competidor presenta baja elevada.\n3. Requisito ENS Medio vigente (verificar fecha de renovación del certificado).", source: "Análisis IA", needsReview: true, multiline: true },
        { id: "supuestos",    category: "Riesgos detectados", label: "Supuestos / lagunas en el pliego", value: "1. Perfiles de subrogación no listados en el pliego principal (pendiente anexo III completo).\n2. Número de peticiones de cambio mensual no especificado (supuesto: ~50/mes).\n3. Entorno tecnológico detallado no incluido (supuesto: stack Java EE + Oracle).", source: "Análisis IA", needsReview: true, multiline: true },
        { id: "go_conditions", category: "Riesgos detectados", label: "Condiciones previas para el GO",  value: "1. Confirmar disponibilidad de equipo senior (director + arquitecto).\n2. Resolver situación de subrogación antes de presentar oferta.\n3. Validar vigencia del certificado ENS Medio.", source: "Análisis IA", needsReview: true, multiline: true },
      ];

      resolve({ result, extractedFields, clientName, objectSummary });
    }, 2800);
  });
}