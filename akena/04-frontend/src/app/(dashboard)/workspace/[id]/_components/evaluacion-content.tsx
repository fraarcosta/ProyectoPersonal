// Next.js equivalent: app/(dashboard)/workspace/[id]/_components/evaluacion-content.tsx
// RFT15 — Evaluación oferta técnica. Dashboard expandido — sin maxWidth estricto.
"use client";

import {
  useState, useRef, useCallback, useEffect,
  type CSSProperties, type ReactNode, type DragEvent, type ChangeEvent,
} from "react";
import {
  ShieldCheck, UploadCloud, FileText, X, Sparkles, Loader2,
  RefreshCw, FileDown, AlertCircle, AlertTriangle,
  User, CheckCheck, XCircle, Lock,
  TrendingUp, AlertOctagon, Copy,
  ChevronRight, Target, BarChart2, Zap, Award,
  Clock, Lightbulb, Star, Activity, Layers, Flag,
  BookOpen, ArrowUpRight,
} from "lucide-react";
import { AppButton } from "../../../../_components/ui";
import { getAuthUser } from "../../../../_components/auth-store";
import { getOpportunities } from "../../../../_components/opportunities-store";
import { useWorkspaceReadonly } from "./workspace-readonly-context";

// ─── Types ─────────────────────────────────────────────────────────────────────

type EvalPhase = "idle" | "loading" | "done";
type ViewTab   = "visual" | "text";

export type EvaluationStatus = "FAVORABLE" | "DESFAVORABLE" | null;

interface UploadedFile { name: string; size: number; ext: string; }

interface ScoreCard {
  key: string; title: string; score: number;
  description: string; evidences: string[];
  delta?: string; // e.g. "+12 vs. media sector"
  unavailable?: boolean; unavailableReason?: string;
}
interface Strength { what: string; where: string; impact: "Alto" | "Medio" | "Bajo"; points?: string; }
interface Risk {
  description: string; source: string; evidence?: string;
  consequence: string; level: "Crítico" | "Medio" | "Bajo";
  pointsAtRisk?: string;
}
interface Recommendation {
  action: string; where: string; priority: "Alta" | "Media" | "Baja";
  benefit: string; effort: "Bajo" | "Medio" | "Alto"; timeEstimate?: string;
}
interface WinThemeEntry {
  title: string; status: "Cubierto" | "Parcial" | "No identificado";
  evidence: string; recommendation?: string; weight?: string;
}

export interface StructuredEvalResult {
  overall_status: "FAVORABLE" | "DESFAVORABLE";
  confidence:     "HIGH" | "MEDIUM" | "LOW";
  main_reason:    string;
  executive_summary: string;
  scores:          ScoreCard[];
  strengths:       Strength[];
  risks:           Risk[];
  recommendations: Recommendation[];
  winThemes:       WinThemeEntry[];
  next_steps:      string[];
  potential_gain:  string; // e.g. "Hasta +12 puntos recuperables"
}

interface PersistedEval {
  textResult:       string;
  structuredResult: StructuredEvalResult;
  evaluatedAt:      string;
  evaluatedBy:      string;
  fileName:         string;
  fileSize:         number;
  clientContext:    string;
  evaluationStatus: EvaluationStatus;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hasProcessedDocs(oppId: string): boolean {
  try {
    const opp = getOpportunities().find((o) => o.id === oppId);
    if (!opp) return true;
    return Array.isArray(opp.pliegos) && opp.pliegos.length > 0;
  } catch { return true; }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function today(): string {
  return new Date().toLocaleString("es-ES", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const s = (obj: CSSProperties): CSSProperties => obj;

// ─── Mock data ────────────────────────────────────────────────────────────────

function buildMockTextResult(
  oppName: string, oppId: string, fileName: string,
  clientContext: string, status: "FAVORABLE" | "DESFAVORABLE",
): string {
  const hasCtx = clientContext.trim().length > 0;
  return `EVALUACIÓN OFERTA TÉCNICA — ${oppName}
RFT15 · Referencia: ${oppId}
Documento evaluado: ${fileName}
Fecha de evaluación: ${today()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

★  VEREDICTO GLOBAL: ${status}

${status === "FAVORABLE"
  ? "La oferta técnica supera los criterios de admisión y se posiciona favorablemente. Las fortalezas en metodología y equipo compensan las carencias detectadas en el plan de riesgos y la acreditación de experiencia sectorial."
  : "La oferta presenta deficiencias bloqueantes que requieren corrección antes de la entrega definitiva. Se recomienda revisar los riesgos críticos identificados."
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. RESUMEN EJECUTIVO

La oferta presenta una estructura sólida y coherente con los requisitos del pliego.
Puntuación técnica estimada: 78/100. Confianza del análisis: Media.

Se detectan 3 riesgos críticos que requieren atención inmediata antes de la entrega:
un plan de gestión de riesgos insuficiente (solo 4 de 8 requeridos), ausencia de
certificados de buena ejecución acreditables, y secciones con contenido placeholder
sin completar (pp. 47 y 63). La corrección de estos 3 puntos podría recuperar
hasta 12 puntos adicionales en la puntuación técnica.

Puntuación por dimensión:
  Alineamiento con Pliego:  78/100
  Alineamiento con Cliente: 65/100
  Cobertura de Win Themes:  55/100
  Puntuación ponderada:     68/100

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2. FORTALEZAS

▸  Metodología ágil bien estructurada con sprints quincenales y comités de seguimiento.
   Dónde: Apartado B1 — Metodología (pp. 12–28). Impacto: Alto. Puntuación est.: 16/20.

▸  Equipo técnico completo con todos los perfiles obligatorios y CVs verificables.
   Dónde: Apartado B2 — Equipo propuesto (pp. 29–41). Impacto: Alto.

▸  Tres propuestas de mejora sobre el PPT concretas y justificadas.
   Dónde: Apartado B3 — Mejoras (pp. 52–58). Impacto: Medio. Puntuación est.: 6/7.

▸  Cumplimiento administrativo completo: todos los documentos del Sobre A.
   Dónde: Sobre A — Documentación administrativa. Impacto: Medio.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

3. RIESGOS / DEBILIDADES

⚠ [CRÍTICO] Plan de gestión de riesgos insuficiente — solo 4 de 8 requeridos.
  Origen: Pliego (criterio B2). Ubicación: pp. 44–46. Puntos en riesgo: 4 pts.
  Consecuencia: Pérdida directa de hasta 4 puntos en criterio B2.

⚠ [CRÍTICO] Ausencia de certificados de buena ejecución para contratos de referencia.
  Origen: Pliego + Patrón cliente. Ubicación: Anexo referencias (p. 71).
  Consecuencia: El tribunal puede penalizar la falta de acreditación documental.

⚠ [CRÍTICO] Secciones con contenido placeholder en páginas 47 y 63.
  Origen: Oferta técnica. Puntos en riesgo: exclusión directa.
  Consecuencia: Entrega de documento incompleto — exclusión o penalización grave.

⚠ [MEDIO] Diagrama de arquitectura sin conectores SAP S/4HANA y GESINV.
  Origen: Pliego técnico. Ubicación: p. 33.
  Consecuencia: Propuesta puede ser interpretada como incompleta.

⚠ [BAJO] Falta capítulo de "Impacto en procesos de negocio".
  Origen: Patrón cliente. Consecuencia: Menor diferenciación competitiva.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

4. RECOMENDACIONES DE MEJORA

→ [Alta · Esfuerzo Medio · 3–4 días]
  Ampliar plan de riesgos a mínimo 8 riesgos con análisis cuantificado.
  Dónde: Apartado B2 — Gestión de Riesgos.
  Beneficio: Recupera hasta 4 puntos directos en criterio B2.

→ [Alta · Esfuerzo Bajo · 1–2 días]
  Incluir certificados de buena ejecución para los 2 contratos de referencia.
  Dónde: Anexo de referencias (p. 71).
  Beneficio: Elimina el principal vector de penalización del cliente.

→ [Alta · Esfuerzo Bajo · < 1 día]
  Completar secciones con contenido placeholder (pp. 47 y 63).
  Dónde: pp. 47 y 63 de la oferta técnica.
  Beneficio: Evita penalización directa o exclusión.

→ [Media · Esfuerzo Medio · 2–3 días]
  Detallar diagrama de arquitectura con conectores SAP S/4HANA y GESINV.
  Dónde: Diagrama de arquitectura (p. 33).
  Beneficio: Elimina ambigüedad técnica ante la mesa técnica.

→ [Media · Esfuerzo Alto · 4–5 días]
  Añadir capítulo de "Impacto en procesos de negocio" (2–3 páginas).
  Dónde: Nueva sección en la propuesta ejecutiva.
  Beneficio: Alineamiento con patrón de ofertas adjudicadas del cliente.

→ [Baja · Esfuerzo Bajo · 1 día]
  Añadir apartado "Valor diferencial de Accenture" con métricas cuantificadas.
  Dónde: Introducción / sección ejecutiva.
  Beneficio: Refuerza win themes con evidencia medible.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

5. CUMPLIMIENTO DE WIN THEMES

✓ [Cubierto]        Capacidad de entrega AMS a gran escala
  Peso: Alta. Evidencia: Equipo con perfiles verificables (pp. 29–41).

~ [Parcial]         Conocimiento del ecosistema AEAT (SAP, GESINV)
  Peso: Alta. Evidencia: Mencionado sin desarrollo técnico suficiente.
  Recomendación: Ampliar descripción de integración en el diagrama.

~ [Parcial]         Experiencia en transformación digital AAPP
  Peso: Media. Evidencia: Proyectos genéricos sin certificados.
  Recomendación: Aportar certificados y proyectos específicos del sector.

✗ [No identificado] Modelo de gobernanza y seguimiento ejecutivo
  Peso: Media. Evidencia: No se detecta sección específica.
  Recomendación: Incluir capítulo de gobernanza con comités y cadencia.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

6. PRÓXIMOS PASOS RECOMENDADOS

1. Completar las secciones placeholder (pp. 47 y 63) — inmediato, < 1 día.
2. Ampliar el plan de riesgos a 8 entradas con análisis cuantificado — 3–4 días.
3. Solicitar y adjuntar certificados de buena ejecución — paralelo, 1–2 días.
4. Detallar el diagrama de arquitectura con conectores legacy — 2–3 días.
5. Coordinar con el equipo la revisión final del documento antes de la entrega.
${hasCtx ? `\n7. SIMULACIÓN DE CLIENTE\n\nInput manual: "${clientContext.trim()}"\n\nConsiderando el input aportado: atender prioritariamente el plan de riesgos\ny los certificados de experiencia — vectores de penalización más recurrentes.\n\n` : ""}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Evaluación generada automáticamente por Akena · Accenture
`;
}

function buildMockStructuredResult(clientContext: string): StructuredEvalResult {
  const hasCtx = clientContext.trim().length > 0;
  return {
    overall_status: "FAVORABLE",
    confidence:     "MEDIUM",
    main_reason: "La oferta supera el umbral técnico con una puntuación estimada de 78/100. Las fortalezas en metodología y equipo compensan las carencias detectadas.",
    executive_summary: `La oferta presenta una estructura técnica sólida que supera el umbral de admisión con una puntuación estimada de 78 sobre 100 puntos. La metodología ágil propuesta y la composición del equipo son los dos pilares más fuertes de la propuesta, con puntuaciones estimadas que rozan el máximo en sus respectivos criterios. Sin embargo, se detectan tres riesgos críticos que, si no se corrigen antes de la entrega, podrían costar hasta 12 puntos adicionales: el plan de gestión de riesgos es insuficiente en número y profundidad, faltan certificados de buena ejecución para los proyectos de referencia, y existen secciones con contenido placeholder sin completar. ${hasCtx ? "El contexto de cliente proporcionado refuerza la prioridad de subsanar las debilidades documentales, ya que este organismo ha penalizado sistemáticamente la falta de evidencias verificables en sus últimas tres licitaciones." : "El perfil histórico del cliente indica que la falta de evidencias documentales acreditables es el principal vector de penalización a tener en cuenta."}`,
    potential_gain: "Hasta +12 pts recuperables",
    scores: [
      {
        key: "pliego", title: "Alineamiento con Pliego", score: 78,
        description: "La oferta cubre satisfactoriamente los criterios técnicos del pliego. Puntuación estimada 78/100 sobre los criterios de juicio de valor (B1–B3). El déficit principal está en el plan de riesgos (B2).",
        evidences: ["Metodología ágil con sprints quincenales — 16/20 pts (B1)", "Equipo técnico con perfiles obligatorios verificables", "Plan de riesgos insuficiente — est. 4/8 pts (B2)"],
        delta: "+3 vs. media licitaciones similares",
      },
      {
        key: "cliente", title: "Alineamiento con Cliente", score: 65,
        description: "Encaje moderado con el perfil histórico del organismo. El cliente penaliza sistemáticamente la falta de evidencias sectoriales verificables y la ausencia de capítulos de impacto operativo.",
        evidences: ["Cliente penaliza falta de evidencias sectoriales (3/3 concursos históricos)", "Falta capítulo 'Impacto en procesos' — presente en 2/3 adjudicadas", hasCtx ? "Input de cliente analizado e integrado" : "Sin input manual de contexto adicional"],
        delta: "-8 vs. ofertas adjudicadas",
      },
      {
        key: "winthemes", title: "Cobertura de Win Themes", score: 55,
        description: "Cobertura parcial de los win themes validados. Solo 1 de 4 completamente cubierto, 2 parciales y 1 no identificado en la oferta actual.",
        evidences: ["Capacidad AMS cubierta con evidencia verificable", "Conocimiento ecosistema AEAT solo mencionado, sin desarrollo", "Gobernanza ejecutiva no identificada en la propuesta"],
        delta: "-15 vs. objetivo mínimo recomendado",
      },
    ],
    strengths: [
      { what: "Metodología ágil bien estructurada con sprints quincenales, comités de seguimiento y cuadro de mando de avance.", where: "Apartado B1 — Metodología (pp. 12–28)", impact: "Alto", points: "16/20 pts" },
      { what: "Equipo técnico al completo: Director de Proyecto senior (PMP), Arquitecto de Solución y 4 FTEs certificados con CVs verificables.", where: "Apartado B2 — Equipo propuesto (pp. 29–41)", impact: "Alto", points: "Criterio mandatorio ✓" },
      { what: "Tres propuestas de mejora sobre el PPT concretas, justificadas y con estimación de impacto cuantificada.", where: "Apartado B3 — Mejoras (pp. 52–58)", impact: "Medio", points: "6/7 pts" },
      { what: "Cumplimiento administrativo completo: presencia de todos los documentos del Sobre A sin omisiones ni excesos.", where: "Sobre A — Documentación administrativa", impact: "Medio", points: "Requisito mínimo ✓" },
      { what: "Plan de formación y transferencia de conocimiento detallado, alineado con las exigencias del PPT.", where: "Apartado B4 — Formación (pp. 60–65)", impact: "Bajo", points: "Diferencial positivo" },
    ],
    risks: [
      { description: "Plan de gestión de riesgos insuficiente: solo 4 riesgos genéricos sin análisis cuantificado de probabilidad/impacto ni planes de contingencia. El pliego exige mínimo 8.", source: "Pliego (criterio B2)", evidence: "pp. 44–46", consequence: "Pérdida de hasta 4 puntos en criterio B2 (8 pts máx.). Impacto directo en la clasificación técnica.", level: "Crítico", pointsAtRisk: "4 pts" },
      { description: "Ausencia de certificados de buena ejecución para los contratos de referencia mencionados. Se citan proyectos pero no se aporta acreditación documental verificable.", source: "Pliego + Patrón cliente", evidence: "Anexo referencias (p. 71)", consequence: "El tribunal puede penalizar o excluir propuestas sin evidencias verificables, especialmente en este organismo.", level: "Crítico", pointsAtRisk: "3–5 pts" },
      { description: "Secciones con contenido placeholder detectadas en páginas 47 y 63 del documento. Deben completarse antes de la entrega definitiva.", source: "Oferta técnica", evidence: "pp. 47 y 63", consequence: "Entrega de documento incompleto — penalización directa o posible exclusión de la licitación.", level: "Crítico", pointsAtRisk: "Exclusión" },
      { description: "Diagrama de arquitectura no especifica los conectores de integración con los sistemas legacy del organismo (SAP S/4HANA, GESINV).", source: "Pliego técnico", evidence: "Diagrama de arquitectura, p. 33", consequence: "Puede ser interpretado como propuesta técnica incompleta. Riesgo de penalización por la mesa técnica.", level: "Medio", pointsAtRisk: "2–3 pts" },
      { description: "Falta capítulo específico de 'Impacto en procesos de negocio', presente en 2 de las 3 últimas ofertas adjudicadas en el histórico del cliente.", source: "Patrón cliente (histórico)", consequence: "Menor diferenciación competitiva. La oferta puede quedar relegada frente a competidores que sí incluyan este capítulo.", level: "Bajo" },
    ],
    recommendations: [
      { action: "Ampliar el plan de gestión de riesgos a mínimo 8 riesgos con análisis cuantificado", where: "Apartado B2 — Gestión de Riesgos", priority: "Alta", benefit: "Recupera hasta 4 puntos directos en criterio B2. Es la mejora de mayor retorno en puntuación.", effort: "Medio", timeEstimate: "3–4 días" },
      { action: "Incluir certificados de buena ejecución para los 2 contratos de referencia más relevantes", where: "Anexo de referencias (p. 71)", priority: "Alta", benefit: "Elimina el principal vector de penalización identificado en el histórico de este cliente.", effort: "Bajo", timeEstimate: "1–2 días" },
      { action: "Completar secciones con contenido placeholder antes de la entrega definitiva", where: "pp. 47 y 63 de la oferta técnica", priority: "Alta", benefit: "Evita penalización directa o exclusión de la licitación. Acción bloqueante.", effort: "Bajo", timeEstimate: "< 1 día" },
      { action: "Detallar el diagrama de arquitectura con conectores SAP S/4HANA y GESINV (protocolos REST/SOAP, modelo de seguridad de API)", where: "Diagrama de arquitectura (p. 33)", priority: "Media", benefit: "Elimina la ambigüedad técnica ante la mesa evaluadora y refuerza la solidez de la propuesta.", effort: "Medio", timeEstimate: "2–3 días" },
      { action: "Añadir capítulo de 'Impacto en procesos de negocio' con métricas operativas medibles (2–3 páginas)", where: "Nueva sección en la propuesta ejecutiva", priority: "Media", benefit: "Alineamiento con el patrón de las ofertas adjudicadas. Diferenciación frente a competidores.", effort: "Alto", timeEstimate: "4–5 días" },
      { action: "Incorporar sección 'Valor diferencial de Accenture' con métricas cuantificadas de proyectos similares adjudicados", where: "Introducción / sección ejecutiva", priority: "Baja", benefit: "Refuerza los win themes con evidencia verificable de ejecución pasada en el sector.", effort: "Bajo", timeEstimate: "1 día" },
    ],
    winThemes: [
      { title: "Capacidad de entrega AMS a gran escala", status: "Cubierto", evidence: "Equipo propuesto con perfiles verificables y referencias de contratos AMS similares (pp. 29–41). Director de Proyecto con experiencia acreditada en contratos >5M€.", weight: "Alta" },
      { title: "Conocimiento del ecosistema AEAT (SAP, GESINV)", status: "Parcial", evidence: "Mencionado en la introducción y el diagrama de arquitectura, pero sin desarrollo técnico suficiente ni especificación de conectores.", recommendation: "Ampliar la descripción de la integración con SAP S/4HANA y GESINV en el diagrama de arquitectura, especificando protocolos y modelo de seguridad.", weight: "Alta" },
      { title: "Experiencia en transformación digital AAPP", status: "Parcial", evidence: "Se citan proyectos de referencia genéricos en el sector público pero sin certificados de buena ejecución ni fichas técnicas verificables.", recommendation: "Aportar certificados de buena ejecución y referenciar proyectos específicos del sector (administración tributaria o similar).", weight: "Media" },
      { title: "Modelo de gobernanza y seguimiento ejecutivo", status: "No identificado", evidence: "No se detecta sección específica de gobernanza ejecutiva en la propuesta. El pliego no lo exige expresamente pero es un diferenciador clave.", recommendation: "Incluir capítulo de modelo de gobernanza con comités, cadencia de reporting y mecanismos de escalado ejecutivo.", weight: "Media" },
    ],
    next_steps: [
      "Completar las secciones placeholder (pp. 47 y 63) — acción bloqueante, < 1 día.",
      "Ampliar el plan de riesgos a 8 entradas con análisis cuantificado — 3–4 días.",
      "Solicitar y adjuntar certificados de buena ejecución para los 2 contratos de referencia — paralelo, 1–2 días.",
      "Detallar el diagrama de arquitectura con conectores SAP S/4HANA y GESINV — 2–3 días.",
      "Revisión final del documento completo antes de la entrega con checklist de admisión.",
      "Valorar si es viable añadir el capítulo de impacto en procesos de negocio antes del plazo.",
    ],
  };
}

// ─── Design helpers ───────────────────────────────────────────────────────────

type ImpactLevel = "Alto" | "Medio" | "Bajo";
type RiskLevel   = "Crítico" | "Medio" | "Bajo";
type PrioLevel   = "Alta" | "Media" | "Baja";
type EffortLevel = "Bajo" | "Medio" | "Alto";

function Chip({ text, bg, color }: { text: string; bg: string; color: string }) {
  return (
    <span style={s({ display: "inline-flex", alignItems: "center", padding: "2px 9px", borderRadius: "var(--radius-chip)", fontSize: "var(--text-3xs)", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], letterSpacing: "0.04em", background: bg, color, fontFamily: "inherit", whiteSpace: "nowrap" })}>
      {text}
    </span>
  );
}

function impactChip(l: ImpactLevel) {
  const m: Record<ImpactLevel, [string, string]> = {
    Alto:  ["var(--success-subtle)",  "var(--success)"],
    Medio: ["var(--warning-subtle)",  "var(--warning-foreground)"],
    Bajo:  ["var(--neutral-subtle)",  "var(--muted-foreground)"],
  };
  const [bg, color] = m[l] ?? ["var(--neutral-subtle)", "var(--muted-foreground)"];
  return <Chip text={l} bg={bg} color={color} />;
}

function riskChip(l: RiskLevel) {
  const m: Record<RiskLevel, [string, string]> = {
    Crítico: ["var(--destructive-subtle)", "var(--destructive)"],
    Medio:   ["var(--warning-subtle)",     "var(--warning-foreground)"],
    Bajo:    ["var(--neutral-subtle)",     "var(--muted-foreground)"],
  };
  const [bg, color] = m[l] ?? ["var(--neutral-subtle)", "var(--muted-foreground)"];
  return <Chip text={l} bg={bg} color={color} />;
}

function prioChip(l: PrioLevel) {
  const m: Record<PrioLevel, [string, string]> = {
    Alta:  ["var(--destructive-subtle)", "var(--destructive)"],
    Media: ["var(--warning-subtle)",     "var(--warning-foreground)"],
    Baja:  ["var(--neutral-subtle)",     "var(--muted-foreground)"],
  };
  const [bg, color] = m[l] ?? ["var(--neutral-subtle)", "var(--muted-foreground)"];
  return <Chip text={l} bg={bg} color={color} />;
}

function effortChip(l: EffortLevel) {
  const m: Record<EffortLevel, [string, string]> = {
    Bajo:  ["var(--success-subtle)",  "var(--success)"],
    Medio: ["var(--warning-subtle)",  "var(--warning-foreground)"],
    Alto:  ["var(--neutral-subtle)",  "var(--muted-foreground)"],
  };
  const [bg, color] = m[l] ?? ["var(--neutral-subtle)", "var(--muted-foreground)"];
  return <Chip text={`Esfuerzo ${l}`} bg={bg} color={color} />;
}

function winChip(st: WinThemeEntry["status"]) {
  const m: Record<WinThemeEntry["status"], [string, string]> = {
    "Cubierto":        ["var(--success-subtle)",     "var(--success)"],
    "Parcial":         ["var(--warning-subtle)",     "var(--warning-foreground)"],
    "No identificado": ["var(--destructive-subtle)", "var(--destructive)"],
  };
  const [bg, color] = m[st] ?? ["var(--neutral-subtle)", "var(--muted-foreground)"];
  return <Chip text={st} bg={bg} color={color} />;
}

function confidenceLabel(c: "HIGH"|"MEDIUM"|"LOW") { return c === "HIGH" ? "Alta" : c === "MEDIUM" ? "Media" : "Baja"; }

function scoreColor(v: number) { return v >= 70 ? "var(--success)" : v >= 45 ? "var(--warning-foreground)" : "var(--destructive)"; }

function ScoreBar({ score, color, height = 5 }: { score: number; color: string; height?: number }) {
  return (
    <div style={s({ height, borderRadius: 99, background: "var(--border)", overflow: "hidden", marginTop: 6 })}>
      <div style={s({ height: "100%", borderRadius: 99, background: color, width: `${score}%`, transition: "width 0.7s cubic-bezier(0.4,0,0.2,1)" })} />
    </div>
  );
}

function SectionHeader({ icon, title, accent, count, countLabel }: {
  icon: ReactNode; title: string; accent: string; count?: number; countLabel?: string;
}) {
  return (
    <div style={s({ display: "flex", alignItems: "center", gap: 8, padding: "11px 16px", borderBottom: "1px solid var(--border)", background: "var(--muted)", borderLeft: `3px solid ${accent}` })}>
      <span style={{ color: accent, display: "flex", alignItems: "center" }}>{icon}</span>
      <p style={s({ fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], color: "var(--foreground)", fontFamily: "inherit", flex: 1 })}>{title}</p>
      {count !== undefined && (
        <span style={s({ padding: "1px 8px", borderRadius: "var(--radius-chip)", background: accent + "22", color: accent, fontSize: "var(--text-2xs)", fontWeight: "var(--font-weight-bold)" as CSSProperties["fontWeight"], fontFamily: "inherit" })}>{count}{countLabel ?? ""}</span>
      )}
    </div>
  );
}

function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={s({ border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--card)", overflow: "hidden", ...style })}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  VISUAL DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

function VisualDashboard({ result, onReevaluate, onDownload, isReadOnly }: {
  result: PersistedEval; onReevaluate: () => void; onDownload: () => void; isReadOnly: boolean;
}) {
  const sr    = result.structuredResult;
  const isFav = sr.overall_status === "FAVORABLE";
  const VIcon = isFav ? CheckCheck : XCircle;
  const verdictBg = isFav ? "var(--success)" : "var(--destructive)";

  // Derived metrics
  const avgScore       = Math.round(sr.scores.reduce((a, b) => a + b.score, 0) / sr.scores.length);
  const weightedScore  = Math.round(sr.scores[0].score * 0.5 + sr.scores[1].score * 0.3 + sr.scores[2].score * 0.2);
  const riskCritical   = sr.risks.filter(r => r.level === "Crítico").length;
  const riskMedium     = sr.risks.filter(r => r.level === "Medio").length;
  const riskLow        = sr.risks.filter(r => r.level === "Bajo").length;
  const ptsAtRisk      = "≤ 12 pts";
  const strengthCount  = sr.strengths.length;
  const recHighCount   = sr.recommendations.filter(r => r.priority === "Alta").length;
  const winCovered     = sr.winThemes.filter(w => w.status === "Cubierto").length;
  const winPartial     = sr.winThemes.filter(w => w.status === "Parcial").length;
  const winMissing     = sr.winThemes.filter(w => w.status === "No identificado").length;
  const effortEst      = "6–8 días";

  // KPI definitions — 10 KPIs
  const kpis = [
    { icon: <BarChart2 size={14} />, label: "Puntuación estimada",  value: `${sr.scores[0].score}`, unit: "/100",              color: scoreColor(sr.scores[0].score),  sub: "Alin. Pliego" },
    { icon: <Activity  size={14} />, label: "Score ponderado",      value: `${weightedScore}`,       unit: "/100",              color: scoreColor(weightedScore),        sub: "50/30/20 pesos" },
    { icon: <Target    size={14} />, label: "Alineamiento cliente",  value: `${sr.scores[1].score}`, unit: "/100",              color: scoreColor(sr.scores[1].score),  sub: "vs. histórico" },
    { icon: <Award     size={14} />, label: "Win Themes cubiertos",  value: `${winCovered}/${sr.winThemes.length}`, unit: "",   color: winCovered >= 3 ? "var(--success)" : winCovered >= 2 ? "var(--warning-foreground)" : "var(--destructive)", sub: `${winPartial} parciales` },
    { icon: <AlertOctagon size={14} />, label: "Riesgos críticos",  value: `${riskCritical}`,       unit: "",                  color: riskCritical > 0 ? "var(--destructive)" : "var(--success)", sub: `${riskMedium} medios, ${riskLow} bajos` },
    { icon: <Zap       size={14} />, label: "Puntos en riesgo",      value: ptsAtRisk,               unit: "",                  color: "var(--destructive)",              sub: "Recuperables con mejoras" },
    { icon: <TrendingUp size={14} />, label: "Fortalezas detectadas", value: `${strengthCount}`,     unit: "",                  color: "var(--success)",                  sub: `${sr.strengths.filter(s=>s.impact==="Alto").length} de alto impacto` },
    { icon: <Flag      size={14} />, label: "Acciones prioritarias",  value: `${recHighCount}`,      unit: "",                  color: "var(--destructive)",              sub: "Prioridad Alta" },
    { icon: <Clock     size={14} />, label: "Esfuerzo estimado",      value: effortEst,               unit: "",                  color: "var(--warning-foreground)",       sub: "Para subsanar críticos" },
    { icon: <ArrowUpRight size={14} />, label: "Ganancia potencial",  value: "+12",                   unit: " pts",              color: "var(--success)",                  sub: "Si se aplican mejoras" },
  ];

  return (
    <div style={s({ display: "flex", flexDirection: "column", gap: 16 })}>

      {/* ── 1. VERDICT HEADER (full width) ── */}
      <Card>
        <div style={s({ background: verdictBg, padding: "22px 28px", display: "flex", alignItems: "center", gap: 20 })}>
          <div style={s({ width: 56, height: 56, borderRadius: "var(--radius)", background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 })}>
            <VIcon size={28} style={{ color: "#fff" }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={s({ fontSize: "var(--text-4xl)", fontWeight: "var(--font-weight-bold)" as CSSProperties["fontWeight"], color: "#fff", lineHeight: 1, letterSpacing: "-1px", fontFamily: "inherit", marginBottom: 6 })}>
              {sr.overall_status}
            </p>
            <p style={s({ fontSize: "var(--text-xs)", color: "#fff", opacity: 0.9, fontFamily: "inherit", lineHeight: 1.55, maxWidth: 680 })}>
              {sr.main_reason}
            </p>
          </div>
          <div style={s({ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 })}>
            <div style={s({ textAlign: "right" })}>
              <p style={s({ fontSize: "var(--text-2xs)", color: "#fff", opacity: 0.7, fontFamily: "inherit", marginBottom: 4 })}>Confianza del análisis</p>
              <span style={s({ padding: "4px 14px", borderRadius: "var(--radius-chip)", background: "rgba(255,255,255,0.2)", border: "1.5px solid rgba(255,255,255,0.4)", fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-bold)" as CSSProperties["fontWeight"], color: "#fff", fontFamily: "inherit" })}>
                {confidenceLabel(sr.confidence)}
              </span>
            </div>
            <div style={s({ textAlign: "right" })}>
              <p style={s({ fontSize: "var(--text-2xs)", color: "#fff", opacity: 0.7, fontFamily: "inherit", marginBottom: 4 })}>Ganancia potencial</p>
              <span style={s({ padding: "4px 14px", borderRadius: "var(--radius-chip)", background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.3)", fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-bold)" as CSSProperties["fontWeight"], color: "#fff", fontFamily: "inherit" })}>
                {sr.potential_gain}
              </span>
            </div>
          </div>
        </div>
        {/* Meta + actions row */}
        <div style={s({ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, padding: "10px 22px", borderTop: "1px solid var(--border)" })}>
          <div style={s({ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" })}>
            <span style={s({ display: "flex", alignItems: "center", gap: 5, fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" })}><User size={11} /> {result.evaluatedBy}</span>
            <span style={s({ display: "flex", alignItems: "center", gap: 5, fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" })}><FileText size={11} /> {result.fileName}</span>
            <span style={s({ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" })}>{result.evaluatedAt}</span>
          </div>
          <div style={s({ display: "flex", gap: 8 })}>
            <AppButton variant="secondary" size="sm" icon={<FileDown size={12} />} onClick={onDownload}>Descargar informe</AppButton>
            {!isReadOnly && <AppButton variant="secondary" size="sm" icon={<RefreshCw size={12} />} onClick={onReevaluate}>Reevaluar</AppButton>}
          </div>
        </div>
      </Card>

      {/* ── 2. KPI GRID — 5 × 2 ── */}
      <div style={s({ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 })}>
        {kpis.map((kpi, i) => (
          <div key={i} style={s({ border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--card)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 2 })}>
            <div style={s({ display: "flex", alignItems: "center", gap: 6, color: "var(--muted-foreground)", marginBottom: 6 })}>
              {kpi.icon}
              <p style={s({ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit", lineHeight: 1.3 })}>{kpi.label}</p>
            </div>
            <p style={{ lineHeight: 1, fontFamily: "inherit" }}>
              <span style={s({ fontSize: "var(--text-2xl)", fontWeight: "var(--font-weight-bold)" as CSSProperties["fontWeight"], color: kpi.color, fontFamily: "inherit" })}>{kpi.value}</span>
              {kpi.unit && <span style={s({ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit" })}>{kpi.unit}</span>}
            </p>
            <p style={s({ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit", marginTop: 2 })}>{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ── 3. EXECUTIVE SUMMARY (full width) ── */}
      <Card>
        <SectionHeader icon={<BookOpen size={14} />} title="Análisis ejecutivo" accent="var(--primary)" />
        <div style={s({ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "start" })}>
          <p style={s({ fontSize: "var(--text-xs)", color: "var(--foreground)", fontFamily: "inherit", lineHeight: 1.7 })}>
            {sr.executive_summary}
          </p>
          {/* Quick stats */}
          <div style={s({ display: "flex", flexDirection: "column", gap: 10, minWidth: 200, borderLeft: "1px solid var(--border)", paddingLeft: 24 })}>
            {sr.scores.map(sc => (
              <div key={sc.key}>
                <div style={s({ display: "flex", justifyContent: "space-between", marginBottom: 3 })}>
                  <p style={s({ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" })}>{sc.title}</p>
                  <p style={s({ fontSize: "var(--text-2xs)", fontWeight: "var(--font-weight-bold)" as CSSProperties["fontWeight"], color: scoreColor(sc.score), fontFamily: "inherit" })}>{sc.score}</p>
                </div>
                <ScoreBar score={sc.score} color={scoreColor(sc.score)} height={4} />
                {sc.delta && <p style={s({ fontSize: "var(--text-3xs)", color: "var(--muted-foreground)", fontFamily: "inherit", marginTop: 2 })}>{sc.delta}</p>}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ── 4. SCORE CARDS + RECOMENDACIONES (3 + recom stacked) ── */}
      <div style={s({ display: "grid", gridTemplateColumns: "repeat(3, 1fr) 1.4fr", gap: 10 })}>
        {/* 3 Score cards */}
        {sr.scores.map(sc => {
          const color = scoreColor(sc.score);
          return (
            <Card key={sc.key}>
              <SectionHeader icon={<BarChart2 size={13} />} title={sc.title} accent={color} />
              <div style={s({ padding: "14px 16px" })}>
                <div style={s({ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8, marginBottom: 6 })}>
                  <p style={s({ fontSize: "var(--text-4xl)", fontWeight: "var(--font-weight-bold)" as CSSProperties["fontWeight"], color, lineHeight: 1, fontFamily: "inherit" })}>{sc.score}</p>
                  <p style={s({ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit", marginBottom: 4 })}>/100</p>
                </div>
                <ScoreBar score={sc.score} color={color} height={6} />
                {sc.delta && (
                  <p style={s({ fontSize: "var(--text-2xs)", color: sc.delta.startsWith("+") ? "var(--success)" : "var(--destructive)", fontFamily: "inherit", marginTop: 4 })}>
                    {sc.delta}
                  </p>
                )}
                <p style={s({ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit", lineHeight: 1.55, marginTop: 10, marginBottom: 10 })}>
                  {sc.description}
                </p>
                <div style={s({ display: "flex", flexDirection: "column", gap: 4 })}>
                  {sc.evidences.map((ev, i) => (
                    <div key={i} style={s({ display: "flex", alignItems: "flex-start", gap: 5 })}>
                      <ChevronRight size={10} style={{ color: "var(--muted-foreground)", flexShrink: 0, marginTop: 2 }} />
                      <p style={s({ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit", lineHeight: 1.5 })}>{ev}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          );
        })}

        {/* Recommendations (right column, taller) */}
        <Card>
          <SectionHeader icon={<Sparkles size={13} />} title="Recomendaciones" accent="var(--accent)" count={sr.recommendations.length} countLabel=" acciones" />
          <div style={s({ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 })}>
            {sr.recommendations.map((rec, i) => (
              <div key={i} style={s({ padding: "10px 12px", borderRadius: "var(--radius-banner)", background: "var(--accent-subtle)", border: "1px solid var(--accent)", display: "flex", alignItems: "flex-start", gap: 10 })}>
                <div style={s({ width: 20, height: 20, borderRadius: "50%", background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "var(--text-3xs)", fontWeight: "var(--font-weight-bold)" as CSSProperties["fontWeight"], fontFamily: "inherit" })}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <p style={s({ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], color: "var(--foreground)", fontFamily: "inherit", lineHeight: 1.4, marginBottom: 4 })}>{rec.action}</p>
                  <div style={s({ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", marginBottom: 4 })}>
                    {prioChip(rec.priority)}
                    {effortChip(rec.effort)}
                    {rec.timeEstimate && <span style={s({ fontSize: "var(--text-3xs)", color: "var(--muted-foreground)", fontFamily: "inherit" })}>{rec.timeEstimate}</span>}
                  </div>
                  <p style={s({ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit", lineHeight: 1.45 })}>
                    <strong style={{ fontFamily: "inherit", color: "var(--foreground)" }}>Beneficio:</strong> {rec.benefit}
                  </p>
                  <p style={s({ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit", marginTop: 2 })}>
                    <strong style={{ fontFamily: "inherit" }}>Dónde:</strong> {rec.where}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── 5. FORTALEZAS + RIESGOS (side by side, equal) ── */}
      <div style={s({ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 })}>
        {/* Strengths */}
        <Card>
          <SectionHeader icon={<TrendingUp size={14} />} title="Fortalezas identificadas" accent="var(--success)" count={sr.strengths.length} />
          <div style={s({ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 })}>
            {sr.strengths.map((st, i) => (
              <div key={i} style={s({ padding: "11px 13px", borderRadius: "var(--radius-banner)", background: "var(--success-subtle)", border: "1px solid var(--success)", display: "flex", alignItems: "flex-start", gap: 10 })}>
                <CheckCheck size={13} style={{ color: "var(--success)", flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <p style={s({ fontSize: "var(--text-xs)", color: "var(--foreground)", fontFamily: "inherit", lineHeight: 1.5, marginBottom: 5 })}>{st.what}</p>
                  <div style={s({ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" })}>
                    <p style={s({ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" })}>{st.where}</p>
                    {impactChip(st.impact)}
                    {st.points && <span style={s({ fontSize: "var(--text-2xs)", color: "var(--success)", fontFamily: "inherit", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"] })}>{st.points}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Risks */}
        <Card>
          <SectionHeader icon={<AlertTriangle size={14} />} title="Riesgos y debilidades" accent="var(--destructive)" count={riskCritical} countLabel=" críticos" />
          <div style={s({ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 })}>
            {[...sr.risks].sort((a,b) => (["Crítico","Medio","Bajo"].indexOf(a.level)) - (["Crítico","Medio","Bajo"].indexOf(b.level))).map((r, i) => {
              const bgM: Record<RiskLevel,string>     = { Crítico: "var(--destructive-subtle)", Medio: "var(--warning-subtle)", Bajo: "var(--neutral-subtle)" };
              const brM: Record<RiskLevel,string>     = { Crítico: "var(--destructive)", Medio: "var(--warning)", Bajo: "var(--border)" };
              const IM: Record<RiskLevel, ReactNode>  = {
                Crítico: <AlertOctagon size={13} style={{ color: "var(--destructive)", flexShrink: 0, marginTop: 2 }} />,
                Medio:   <AlertTriangle size={13} style={{ color: "var(--warning-foreground)", flexShrink: 0, marginTop: 2 }} />,
                Bajo:    <AlertCircle  size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0, marginTop: 2 }} />,
              };
              return (
                <div key={i} style={s({ padding: "11px 13px", borderRadius: "var(--radius-banner)", background: bgM[r.level], border: `1px solid ${brM[r.level]}`, display: "flex", alignItems: "flex-start", gap: 10 })}>
                  {IM[r.level]}
                  <div style={{ flex: 1 }}>
                    <div style={s({ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6, marginBottom: 4 })}>
                      <p style={s({ fontSize: "var(--text-xs)", color: "var(--foreground)", fontFamily: "inherit", lineHeight: 1.4 })}>{r.description}</p>
                      <div style={s({ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 })}>
                        {riskChip(r.level)}
                        {r.pointsAtRisk && <span style={s({ padding: "2px 7px", borderRadius: "var(--radius-chip)", background: "var(--destructive-subtle)", color: "var(--destructive)", fontSize: "var(--text-3xs)", fontWeight: "var(--font-weight-bold)" as CSSProperties["fontWeight"], fontFamily: "inherit" })}>{r.pointsAtRisk}</span>}
                      </div>
                    </div>
                    <p style={s({ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit", lineHeight: 1.45 })}>
                      <strong style={{ fontFamily: "inherit" }}>Origen:</strong> {r.source}
                      {r.evidence && <> · <strong style={{ fontFamily: "inherit" }}>Ubicación:</strong> {r.evidence}</>}
                    </p>
                    <p style={s({ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit", marginTop: 2, lineHeight: 1.45 })}>
                      <strong style={{ fontFamily: "inherit" }}>Consecuencia:</strong> {r.consequence}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ── 6. WIN THEMES (2×2 grid) + PRÓXIMOS PASOS (right column) ── */}
      <div style={s({ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 10 })}>
        {/* Win Themes */}
        <Card>
          <SectionHeader icon={<ShieldCheck size={14} />} title="Cumplimiento de Win Themes" accent="var(--primary)" />
          <div style={s({ padding: "12px 14px" })}>
            {/* Summary row */}
            <div style={s({ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "8px 12px", borderRadius: "var(--radius-banner)", background: "var(--muted)", border: "1px solid var(--border)" })}>
              <p style={s({ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit", flex: 1 })}>
                Cobertura global: <strong style={{ fontFamily: "inherit", color: "var(--foreground)" }}>{winCovered} cubiertos · {winPartial} parciales · {winMissing} no identificados</strong> de {sr.winThemes.length} win themes
              </p>
              <div style={s({ display: "flex", gap: 4 })}>
                <Chip text={`${winCovered} ✓`}  bg="var(--success-subtle)"    color="var(--success)" />
                <Chip text={`${winPartial} ~`}   bg="var(--warning-subtle)"    color="var(--warning-foreground)" />
                <Chip text={`${winMissing} ✗`}  bg="var(--destructive-subtle)" color="var(--destructive)" />
              </div>
            </div>
            <div style={s({ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 })}>
              {sr.winThemes.map((wt, i) => (
                <div key={i} style={s({ padding: "12px 14px", borderRadius: "var(--radius-banner)", border: "1px solid var(--border)", background: "var(--card)" })}>
                  <div style={s({ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 })}>
                    <p style={s({ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], color: "var(--foreground)", fontFamily: "inherit", lineHeight: 1.3 })}>{wt.title}</p>
                    <div style={s({ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 })}>
                      {winChip(wt.status)}
                      {wt.weight && <span style={s({ fontSize: "var(--text-3xs)", color: "var(--muted-foreground)", fontFamily: "inherit" })}>Peso: {wt.weight}</span>}
                    </div>
                  </div>
                  <p style={s({ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit", lineHeight: 1.5 })}>{wt.evidence}</p>
                  {wt.recommendation && (
                    <p style={s({ fontSize: "var(--text-2xs)", color: "var(--accent)", fontFamily: "inherit", marginTop: 5, lineHeight: 1.5 })}>→ {wt.recommendation}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Próximos pasos */}
        <Card>
          <SectionHeader icon={<Lightbulb size={14} />} title="Próximos pasos" accent="var(--warning-foreground)" count={sr.next_steps.length} countLabel=" acciones" />
          <div style={s({ padding: "14px" })}>
            <div style={s({ padding: "10px 12px", borderRadius: "var(--radius-banner)", background: "var(--warning-subtle)", border: "1px solid var(--warning)", marginBottom: 12 })}>
              <p style={s({ fontSize: "var(--text-xs)", color: "var(--warning-foreground)", fontFamily: "inherit", lineHeight: 1.5 })}>
                Para maximizar la puntuación técnica, prioriza las acciones de Alta prioridad. La corrección de los 3 riesgos críticos puede suponer hasta <strong style={{ fontFamily: "inherit" }}>+12 puntos</strong> en la evaluación final.
              </p>
            </div>
            <div style={s({ display: "flex", flexDirection: "column", gap: 8 })}>
              {sr.next_steps.map((step, i) => (
                <div key={i} style={s({ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 11px", borderRadius: "var(--radius-banner)", border: "1px solid var(--border)", background: "var(--muted)" })}>
                  <div style={s({ width: 20, height: 20, borderRadius: "50%", background: i < 3 ? "var(--destructive)" : i < 5 ? "var(--warning-foreground)" : "var(--muted-foreground)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "var(--text-3xs)", fontWeight: "var(--font-weight-bold)" as CSSProperties["fontWeight"], fontFamily: "inherit" })}>{i + 1}</div>
                  <p style={s({ fontSize: "var(--text-xs)", color: "var(--foreground)", fontFamily: "inherit", lineHeight: 1.5 })}>{step}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  TEXT REPORT
// ─────────────────────────────────────────────────────────────────────────────

function TextReport({ result, onDownload }: { result: PersistedEval; onDownload: () => void }) {
  const [copied, setCopied] = useState(false);
  const isFav = result.structuredResult.overall_status === "FAVORABLE";
  const verdictBg = isFav ? "var(--success)" : "var(--destructive)";
  const VIcon = isFav ? CheckCheck : XCircle;

  return (
    <div style={s({ display: "flex", flexDirection: "column", gap: 12 })}>
      {/* Verdict band */}
      <div style={s({ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", borderRadius: "var(--radius-banner)", background: verdictBg })}>
        <div style={s({ width: 36, height: 36, borderRadius: "var(--radius)", background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 })}>
          <VIcon size={18} style={{ color: "#fff" }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={s({ fontSize: "var(--text-lg)", fontWeight: "var(--font-weight-bold)" as CSSProperties["fontWeight"], color: "#fff", fontFamily: "inherit", letterSpacing: "0.02em", lineHeight: 1 })}>
            {result.structuredResult.overall_status}
          </p>
          <p style={s({ fontSize: "var(--text-xs)", color: "#fff", opacity: 0.88, fontFamily: "inherit", marginTop: 3 })}>
            {isFav ? "La oferta técnica supera los criterios de admisión y se posiciona favorablemente." : "La oferta presenta deficiencias bloqueantes que requieren corrección antes de la entrega."}
          </p>
        </div>
        <div style={s({ display: "flex", gap: 8, flexShrink: 0 })}>
          {[
            { label: copied ? "Copiado" : "Copiar", icon: <Copy size={12} />, onClick: () => { navigator.clipboard.writeText(result.textResult).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); } },
            { label: "Descargar Word", icon: <FileDown size={12} />, onClick: onDownload },
          ].map(({ label, icon, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              style={s({
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px",
                borderRadius: "var(--radius-chip)",
                background: "#fff",
                color: isFav ? "var(--success)" : "var(--destructive)",
                border: "none",
                cursor: "pointer",
                fontSize: "var(--text-xs)",
                fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                fontFamily: "inherit",
                flexShrink: 0,
                boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
              })}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </div>
      <textarea
        readOnly value={result.textResult}
        style={s({ width: "100%", minHeight: "600px", padding: "18px", borderRadius: "var(--radius-input)", border: "1px solid var(--border)", background: "var(--muted)", color: "var(--foreground)", fontSize: "var(--text-xs)", fontFamily: "inherit", lineHeight: 1.75, resize: "vertical", outline: "none", cursor: "default" })}
      />
    </div>
  );
}

// ─── View Tabs ────────────────────────────────────────────────────────────────

function ViewTabs({ active, onChange }: { active: ViewTab; onChange: (v: ViewTab) => void }) {
  return (
    <div style={s({ display: "flex", borderRadius: "var(--radius-chip)", border: "1px solid var(--border)", overflow: "hidden", alignSelf: "flex-start", background: "var(--muted)" })}>
      {([["visual","Resumen visual"],["text","Informe en texto"]] as [ViewTab,string][]).map(([key, label], i) => (
        <button key={key} onClick={() => onChange(key)} style={s({
          padding: "7px 20px", border: "none", cursor: "pointer", fontFamily: "inherit",
          fontSize: "var(--text-xs)",
          fontWeight: (active === key ? "var(--font-weight-semibold)" : "var(--font-weight-normal)") as CSSProperties["fontWeight"],
          background: active === key ? "var(--card)" : "transparent",
          color: active === key ? "var(--foreground)" : "var(--muted-foreground)",
          transition: "all 0.15s",
          borderRight: i === 0 ? "1px solid var(--border)" : "none",
        })}>{label}</button>
      ))}
    </div>
  );
}

// ─── Form blocks (shown when idle/loading) ────────────────────────────────────

function CardWrap({ children }: { children: ReactNode }) {
  return <div className="bg-card border border-border" style={{ borderRadius: "var(--radius)" }}>{children}</div>;
}

function BlockHeader({ title, subtitle }: { title: ReactNode; subtitle?: string }) {
  return (
    <div style={s({ padding: "13px 18px", borderBottom: "1px solid var(--border)" })}>
      <p style={s({ fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], color: "var(--foreground)", fontFamily: "inherit", marginBottom: subtitle ? "2px" : 0 })}>{title}</p>
      {subtitle && <p style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>{subtitle}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN
// ─────────────────────────────────────────────────────────────────────────────

export function AppEvaluacionContent({ oppId, oppName }: { oppId: string; oppName: string }) {
  const [phase,         setPhase]         = useState<EvalPhase>("idle");
  const [uploadedFile,  setUploadedFile]  = useState<UploadedFile | null>(null);
  const [clientContext, setClientContext] = useState("");
  const [errorMsg,      setErrorMsg]      = useState("");
  const [result,        setResult]        = useState<PersistedEval | null>(null);
  const [isDragOver,    setIsDragOver]    = useState(false);
  const [activeTab,     setActiveTab]     = useState<ViewTab>("visual");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef   = useRef<HTMLDivElement>(null);
  const { isReadOnly } = useWorkspaceReadonly();

  const processFile = useCallback((file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["docx","pdf"].includes(ext)) { setErrorMsg("Solo se aceptan archivos .docx y .pdf."); return; }
    if (file.size > 50 * 1024 * 1024) { setErrorMsg("El archivo no puede superar los 50 MB."); return; }
    setErrorMsg(""); setUploadedFile({ name: file.name, size: file.size, ext });
  }, []);

  const handleDrop = (e: DragEvent) => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) processFile(f); };
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ""; };
  const handleRemove = () => { setUploadedFile(null); setErrorMsg(""); };

  const handleEvaluate = () => {
    if (!uploadedFile) { setErrorMsg("Para evaluar, debes adjuntar al menos un documento (.docx o .pdf)."); return; }
    setErrorMsg(""); setPhase("loading");
    setTimeout(() => {
      const structured = buildMockStructuredResult(clientContext);
      setResult({
        textResult: buildMockTextResult(oppName, oppId, uploadedFile.name, clientContext, structured.overall_status),
        structuredResult: structured,
        evaluatedAt: today(), evaluatedBy: getAuthUser().name,
        fileName: uploadedFile.name, fileSize: uploadedFile.size,
        clientContext, evaluationStatus: structured.overall_status,
      });
      setActiveTab("visual"); setPhase("done");
    }, 3400);
  };

  useEffect(() => {
    if (phase === "done" && resultsRef.current) {
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }, [phase]);

  const handleReevaluate = () => {
    if (result?.fileName) setUploadedFile({ name: result.fileName, size: result.fileSize ?? 0, ext: result.fileName.split(".").pop()?.toLowerCase() ?? "docx" });
    setClientContext(result?.clientContext ?? ""); setErrorMsg(""); setResult(null); setPhase("idle");
  };

  const handleDownload = () => {
    const safe = oppName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
    const blob = new Blob([result?.textResult ?? ""], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `Evaluacion_Oferta_${safe}_${oppId}.docx`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const isDone    = phase === "done";
  const isLoading = phase === "loading";
  const isIdle    = phase === "idle";
  const canEval   = !!uploadedFile && !isLoading && !isReadOnly;

  return (
    <div style={{ padding: "28px 36px" }}>

      {/* ── Tool header ── */}
      <div className="flex items-start gap-4 mb-7">
        <div className="bg-muted text-primary flex items-center justify-center flex-shrink-0" style={{ width: "44px", height: "44px", borderRadius: "var(--radius)" }}>
          <ShieldCheck size={22} />
        </div>
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 style={{ fontSize: "var(--text-xl)" }}>Evaluación oferta técnica</h3>
            <Chip text="Calidad" bg="var(--success-subtle)"  color="var(--success)" />
            <Chip text="RFT15"   bg="var(--neutral-subtle)"  color="var(--muted-foreground)" />
          </div>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--muted-foreground)", fontFamily: "inherit", lineHeight: "1.55" }}>
            Sube la oferta técnica final o casi final para obtener una evaluación automática contra los pliegos de la oportunidad y el histórico del cliente.
          </p>
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--border)", marginBottom: "24px" }} />

      {/* Warnings */}
      {!hasProcessedDocs(oppId) && (
        <div className="flex items-start gap-3 mb-5" style={s({ padding: "11px 14px", borderRadius: "var(--radius-banner)", background: "var(--warning-subtle)", border: "1px solid var(--warning)" })}>
          <AlertTriangle size={14} style={{ color: "var(--warning-foreground)", flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: "var(--text-xs)", color: "var(--warning-foreground)", fontFamily: "inherit", lineHeight: 1.5 }}>No es posible evaluar: la documentación base de la oportunidad aún no está procesada.</p>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-start gap-3 mb-5" style={s({ padding: "11px 14px", borderRadius: "var(--radius-banner)", background: "var(--warning-subtle)", border: "1px solid var(--warning)" })}>
          <AlertCircle size={14} style={{ color: "var(--warning-foreground)", flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: "var(--text-xs)", color: "var(--warning-foreground)", fontFamily: "inherit", lineHeight: 1.5, flex: 1 }}>{errorMsg}</p>
          <button onClick={() => setErrorMsg("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}><X size={13} style={{ color: "var(--muted-foreground)" }} /></button>
        </div>
      )}

      {/* ── FORM (oculto cuando isDone) ── */}
      {!isDone && (
        <div className="flex flex-col gap-4" style={{ marginBottom: 8 }}>
          {/* Upload */}
          <CardWrap>
            <BlockHeader title="Cargar oferta técnica" subtitle="Sube el documento final o casi final para evaluar." />
            <div style={{ padding: "16px" }}>
              {!uploadedFile ? (
                <>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }} onDragLeave={() => setIsDragOver(false)} onDrop={handleDrop}
                    onClick={() => !isLoading && fileInputRef.current?.click()}
                    style={s({ border: `2px dashed ${isDragOver ? "var(--primary)" : "var(--border)"}`, borderRadius: "var(--radius-input)", background: isDragOver ? "var(--primary-subtle)" : "var(--muted)", padding: "30px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: isLoading ? "not-allowed" : "pointer", transition: "all 0.15s", marginBottom: 10 })}
                  >
                    <UploadCloud size={24} style={{ color: isDragOver ? "var(--primary)" : "var(--muted-foreground)" }} />
                    <p style={{ fontSize: "var(--text-sm)", color: "var(--foreground)", fontFamily: "inherit" }}>
                      Arrastra aquí tu documento o <span style={s({ color: "var(--primary)", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], fontFamily: "inherit" })}>selecciona un archivo</span>
                    </p>
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>Word o PDF · Máximo 50 MB</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>Formatos aceptados:</span>
                    {["docx","pdf"].map(ext => <span key={ext} style={s({ fontSize: "var(--text-2xs)", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], padding: "2px 8px", borderRadius: "var(--radius-chip)", background: "var(--neutral-subtle)", color: "var(--muted-foreground)", fontFamily: "inherit" })}>.{ext}</span>)}
                  </div>
                  <input ref={fileInputRef} type="file" accept=".docx,.pdf" style={{ display: "none" }} onChange={handleInputChange} />
                </>
              ) : (
                <div className="flex items-center gap-3" style={s({ padding: "10px 14px", borderRadius: "var(--radius-input)", border: "1px solid var(--border)", background: "var(--card)" })}>
                  <div style={s({ width: 32, height: 32, borderRadius: "var(--radius)", background: uploadedFile.ext === "pdf" ? "var(--warning-subtle)" : "var(--accent-subtle)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 })}>
                    <FileText size={14} style={{ color: uploadedFile.ext === "pdf" ? "var(--warning-foreground)" : "var(--accent)" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={s({ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], color: "var(--foreground)", fontFamily: "inherit", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" })}>{uploadedFile.name}</p>
                    <p style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>{uploadedFile.ext.toUpperCase()} · {formatBytes(uploadedFile.size)}</p>
                  </div>
                  <button onClick={handleRemove} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}><X size={14} style={{ color: "var(--muted-foreground)" }} /></button>
                </div>
              )}
            </div>
          </CardWrap>

          {/* Client context */}
          <CardWrap>
            <BlockHeader title={<>Contexto del cliente <span style={s({ color: "var(--muted-foreground)", fontWeight: "var(--font-weight-normal)" as CSSProperties["fontWeight"], fontFamily: "inherit" })}>(opcional)</span></>} subtitle="Complementa la simulación con tu conocimiento del cliente." />
            <div style={{ padding: "16px" }}>
              <textarea value={clientContext} onChange={(e) => setClientContext(e.target.value)} disabled={isLoading}
                placeholder="Ej.: el cliente prioriza claridad ejecutiva, penaliza falta de evidencias, valora experiencia sectorial…"
                style={s({ width: "100%", minHeight: "80px", padding: "12px 14px", borderRadius: "var(--radius-input)", border: "1px solid var(--border)", background: isLoading ? "var(--muted)" : "var(--card)", color: "var(--foreground)", fontSize: "var(--text-sm)", fontFamily: "inherit", lineHeight: 1.6, resize: "vertical", outline: "none" })}
                onFocus={(e) => { e.target.style.borderColor = "var(--primary)"; }} onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }} />
            </div>
          </CardWrap>

          {/* Action */}
          <CardWrap>
            <div style={{ padding: "16px 20px" }}>
              {isLoading ? (
                <div className="flex items-center gap-4">
                  <Loader2 size={17} className="animate-spin" style={{ color: "var(--primary)", flexShrink: 0 }} />
                  <div>
                    <p style={s({ fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], color: "var(--foreground)", fontFamily: "inherit", marginBottom: 2 })}>Evaluando oferta técnica…</p>
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>Procesando oferta y evaluando contra pliegos + histórico del cliente…</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  {isReadOnly && isIdle
                    ? <div style={s({ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: "var(--radius-banner)" })}><Lock size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} /><span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>No ejecutado antes de marcar como Entregada.</span></div>
                    : <AppButton variant="primary" icon={<Sparkles size={14} />} disabled={!canEval} onClick={handleEvaluate}>Evaluar oferta técnica</AppButton>
                  }
                  {!uploadedFile && !isReadOnly && <p style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>Adjunta un documento para activar la evaluación.</p>}
                </div>
              )}
            </div>
          </CardWrap>
        </div>
      )}

      {/* ── RESULTS (oculto cuando no isDone) ── */}
      {isDone && result && (
        <div ref={resultsRef}>
          <div style={s({ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 })}>
            <ViewTabs active={activeTab} onChange={setActiveTab} />
          </div>
          {activeTab === "visual"
            ? <VisualDashboard result={result} onReevaluate={handleReevaluate} onDownload={handleDownload} isReadOnly={isReadOnly} />
            : <TextReport result={result} onDownload={handleDownload} />
          }
        </div>
      )}
    </div>
  );
}
