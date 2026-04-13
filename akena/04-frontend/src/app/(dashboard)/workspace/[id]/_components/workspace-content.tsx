// Next.js equivalent: app/(dashboard)/workspace/[id]/_components/workspace-content.tsx
// Todos los valores usan exclusivamente CSS variables del design system.
"use client";

import { useState, useRef, useCallback, useEffect, type ChangeEvent, type CSSProperties, type ReactNode } from "react";
import {
  FileSearch, AlertTriangle, List, Trophy, FileOutput,
  Presentation, FileText, Table, FolderOpen, ShieldCheck, CheckSquare,
  Eye, Calculator, Settings, Percent, Users, Sparkles,
  FileDown, Loader2, CheckCircle2, RefreshCw, AlertCircle, Lock,
} from "lucide-react";
import { AppButton } from "../../../../_components/ui";
import Box        from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import { AppAsistenteContent } from "./asistente-content";
import { getAuthUser } from "../../../../_components/auth-store";
import { getOpportunities } from "../../../../_components/opportunities-store";
import {
  AppIndiceContent,
  AppBlockedByIndice,
  isIndiceValidated,
} from "./indice-content";
import { AppReferenciaContent } from "./referencia-content";
import { analyzeFiles } from "../../../../../services/pliegoService";
import { getFiles, storeFiles } from "../../../../../services/pliegoFileStore";
import { detectIncoherencias } from "../../../../../services/ofertaService";
import { AppWinThemesContent } from "./win-themes-content";
import { AppOfertaV0Content } from "./oferta-v0-content";
import { AppDocumentalContent } from "./documental-content";
import { AppEvaluacionContent } from "./evaluacion-content";
import { AppSobresContent } from "./sobres-content";
import { AppResumenContent } from "./resumen-content";
import { AppEcoSimulacionContent } from "./eco-simulacion-content";
import { AppEcoDescuentoContent } from "./eco-descuento-content";
import { AppEcoEspacioContent } from "./eco-espacio-content";
import { useWorkspaceReadonly, READONLY_TOOLTIP } from "./workspace-readonly-context";

// ─── Shared read-only helpers ─────────────────────────────────────────────────

/** Shown in place of action buttons when the opp is in Modo Histórico and the
 *  tool was never executed before delivery. */
function ReadonlyNotExecuted() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 14px",
        background: "var(--muted)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-banner)",
      }}
    >
      <Lock size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
      <span
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--muted-foreground)",
          fontFamily: "inherit",
        }}
      >
        No ejecutado antes de marcar como Entregada.
      </span>
    </div>
  );
}

// ─── Content map (herramienta genérica) ───────────────────────────────────────

interface ToolConfig {
  title: string;
  description: string;
  icon: ReactNode;
  badge?: string;
  actions: string[];
}

const CONTENT_MAP: Record<string, ToolConfig> = {
  // tec-resumen-pliego  → AppResumenPliegoContent (componente dedicado)
  // tec-incoherencias   → AppIncoherenciasContent (componente dedicado)
  // tec-indice          → AppIndiceContent        (componente dedicado)
  // tec-referencia      → AppReferenciaContent    (componente dedicado)
  "tec-win-themes":    { title: "Generar Win Themes",                        badge: "IA",             icon: <Trophy size={24} />,       description: "Define los mensajes clave y argumentos diferenciales que maximizan las posibilidades de adjudicación. Basado en el análisis del cliente, la competencia y los criterios del pliego.",                                                                                         actions: ["Generar Win Themes", "Validar con equipo", "Incorporar a oferta"] },
  "tec-oferta-v0":     { title: "Generar Oferta v0",                         badge: "Generación",     icon: <FileOutput size={24} />,   description: "Genera la primera versión completa de la oferta técnica combinando el índice definido, los win themes, los contenidos de referencia y la estrategia propuesta.",                                                                                                             actions: ["Generar Oferta v0", "Configurar parámetros", "Revisar borrador"] },
  "doc-ppt-nbm":       { title: "Generar PPT NBM",                           badge: "Documental",     icon: <Presentation size={24} />, description: "Genera la presentación de New Business Meeting (NBM) siguiendo la plantilla corporativa de Accenture, adaptada al contexto de esta oportunidad.",                                                                                                                           actions: ["Generar presentación", "Seleccionar plantilla", "Exportar PPTX"] },
  "doc-word":          { title: "Generar Word plantilla",                    badge: "Documental",     icon: <FileText size={24} />,     description: "Crea el documento Word de la oferta técnica con la estructura, cabeceras, píes de página y estilos corporativos definidos para licitaciones del sector público.",                                                                                                           actions: ["Generar documento", "Aplicar estilos", "Exportar DOCX"] },
  "doc-excel":         { title: "Generar Excel seguimiento",                 badge: "Documental",     icon: <Table size={24} />,        description: "Genera el libro Excel de seguimiento del proceso de elaboración de la oferta, con hojas de control de tareas, fechas clave, responsables y estado de avance.",                                                                                                              actions: ["Generar tracking", "Configurar hitos", "Exportar XLSX"] },
  "doc-ppt-edit":      { title: "Generar PPT editables",                     badge: "Documental",     icon: <Presentation size={24} />, description: "Produce presentaciones PowerPoint editables con diagramas, arquitecturas de solución y material gráfico de apoyo para la oferta técnica.",                                                                                                                                  actions: ["Generar slides", "Seleccionar diagramas", "Exportar PPTX"] },
  "doc-carpeta":       { title: "Generar carpeta oferta",                    badge: "Documental",     icon: <FolderOpen size={24} />,   description: "Crea la estructura de carpetas completa y estandarizada para organizar todos los documentos de la oferta, con las convenciones de nomenclatura de Accenture.",                                                                                                             actions: ["Crear estructura", "Organizar documentos", "Exportar ZIP"] },
  "val-evaluacion":    { title: "Evaluación oferta técnica",                 badge: "Calidad",        icon: <ShieldCheck size={24} />,  description: "Evalúa automáticamente el contenido de la oferta técnica frente a los criterios de adjudicación del pliego, estimando la puntuación esperada y los puntos de mejora.",                                                                                                    actions: ["Evaluar oferta", "Ver scoring", "Generar informe de gaps"] },
  "val-sobres":        { title: "Control contenido sobres",                  badge: "Control",        icon: <CheckSquare size={24} />,  description: "Verifica que cada sobre de la oferta (técnico, económico, administrativo) contiene exactamente los documentos requeridos por el pliego, sin omisiones ni excesos.",                                                                                                       actions: ["Verificar sobres", "Checklist de documentos", "Informe de conformidad"] },
  "val-resumen":       { title: "Resumen ejecutivo",                         badge: "Calidad",        icon: <Eye size={24} />,          description: "Genera el resumen ejecutivo de la oferta, sintetizando los puntos clave de la propuesta técnica, la experiencia aportada y los elementos diferenciales frente a la competencia.",                                                                                          actions: ["Generar resumen", "Revisar contenido", "Exportar PDF"] },
  "eco-simulacion":    { title: "Simulación económica",                      badge: "Económico",      icon: <Calculator size={24} />,   description: "Modela distintos escenarios de pricing para la oferta económica, calculando márgenes, costes directos e indirectos y el impacto de los criterios de adjudicación económica.",                                                                                             actions: ["Nueva simulación", "Ver escenarios", "Exportar modelo"] },
  "eco-formula":       { title: "Configuración fórmula",                     badge: "Económico",      icon: <Settings size={24} />,     description: "Configura y parametriza la fórmula de valoración económica definida en el pliego, permitiendo calcular automáticamente la puntuación obtenida según el precio ofertado.",                                                                                                   actions: ["Configurar fórmula", "Validar parámetros", "Simular puntuaciones"] },
  "eco-descuento":     { title: "Recomendación descuento",                   badge: "IA · Económico", icon: <Percent size={24} />,      description: "El sistema analiza el histórico de adjudicaciones similares y la fórmula de valoración para recomendar el rango óptimo de descuento que maximiza la puntuación sin comprometer el margen.",                                                                                  actions: ["Calcular descuento óptimo", "Ver análisis histórico", "Aplicar recomendación"] },
};

// ─── Blocked-by-indice tool IDs ───────────────────────────────────────────────

// tec-win-themes is excluded here — its index guard is handled inside the component
// with a custom message as specified in the UX requirements.
// tec-oferta-v0 is excluded here — it has its own prerequisite validation inside the component.
const BLOCKED_UNTIL_INDICE = new Set(["tec-referencia"]);

// ─── Badge colors ──────────────────────────────────────────────────────────────

const BADGE_COLORS: Record<string, { bg: string; color: string }> = {
  Administrativo:    { bg: "var(--neutral-subtle)",  color: "var(--muted-foreground)" },
  Análisis:          { bg: "var(--accent-subtle)",   color: "var(--accent)" },
  Control:           { bg: "var(--warning-subtle)",  color: "var(--warning-foreground)" },
  IA:                { bg: "var(--primary-subtle)",  color: "var(--primary)" },
  Generación:        { bg: "var(--primary-subtle)",  color: "var(--primary)" },
  Referencia:        { bg: "var(--accent-subtle)",   color: "var(--accent)" },
  Documental:        { bg: "var(--neutral-subtle)",  color: "var(--muted-foreground)" },
  Calidad:           { bg: "var(--success-subtle)",  color: "var(--success)" },
  Económico:         { bg: "var(--success-subtle)",  color: "var(--success)" },
  "IA · Económico":  { bg: "var(--primary-subtle)",  color: "var(--primary)" },
};

// ─── Mock user ─────────────────────────────────────────────────────────────────

// ELIMINADO: const MOCK_USER = "Ana García";
// Se usa getAuthUser().name para firma dinámica con el usuario autenticado.

// ─── Mock "has docs" — IDs de oportunidades con documentación procesada ─────
// También reconoce oportunidades dinámicas del store que tengan pliegos adjuntos.

const MOCK_OPP_WITH_DOCS = new Set(["OPP-2025-001", "OPP-2025-002", "OPP-2024-018"]);

function hasProcessedDocs(oppId: string): boolean {
  if (MOCK_OPP_WITH_DOCS.has(oppId)) return true;
  // Oportunidades creadas dinámicamente: el wizard obliga a subir ≥1 pliego.
  const stored = getOpportunities().find(o => o.id === oppId);
  return !!stored && Array.isArray(stored.pliegos) && stored.pliegos.length > 0;
}

// ─── Mock resumen content ─────────────────────────────────────────────────────

function buildMockResumen(oppName: string, oppId: string): string {
  return `RESUMEN DEL PLIEGO — ${oppName}
Referencia: ${oppId}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. OBJETO DEL CONTRATO
El presente contrato tiene por objeto la prestación de servicios de consultoría y desarrollo tecnológico para ${oppName}, incluyendo el diseño, implantación y mantenimiento de los sistemas de información asociados a los procesos core del organismo contratante.

2. ÓRGANO DE CONTRATACIÓN
Entidad licitadora del sector público sujeta al ámbito de aplicación de la Ley 9/2017, de 8 de noviembre, de Contratos del Sector Público (LCSP). El expediente se tramita por procedimiento abierto simplificado reforzado.

3. PRESUPUESTO BASE DE LICITACIÓN
El presupuesto base de licitación asciende a 2.400.000 € (IVA excluido), distribuido en anualidades según el plan de trabajo aprobado. El valor estimado del contrato, incluyendo posibles prórrogas y modificaciones, se sitúa en 3.200.000 €.

4. PLAZO DE EJECUCIÓN
La duración inicial del contrato es de 24 meses desde la fecha de formalización, con posibilidad de dos prórrogas anuales de hasta 12 meses cada una, condicionadas al crédito presupuestario disponible.

5. CRITERIOS DE ADJUDICACIÓN

  A) Criterios evaluables mediante fórmulas (60 puntos):
     · Oferta económica                          30 puntos
     · Plan de trabajo y metodología             20 puntos
     · Recursos técnicos y medios materiales     10 puntos

  B) Criterios sujetos a juicio de valor (40 puntos):
     · Memoria técnica de la solución propuesta  25 puntos
     · Plan de gestión de riesgos                 8 puntos
     · Propuesta de mejoras sobre el PPT          7 puntos

6. SOLVENCIA Y REQUISITOS MÍNIMOS
Los licitadores deberán acreditar:
  · Clasificación empresarial: Grupo V, Subgrupo 3, Categoría D, o equivalente.
  · Volumen de negocio anual ≥ 1.200.000 € en los últimos tres ejercicios.
  · Experiencia en al menos 2 contratos similares en los últimos 5 años.
  · Certificación ISO 27001 vigente o equivalente.

7. GARANTÍAS
  · Garantía provisional: no se exige.
  · Garantía definitiva: 5% del precio de adjudicación (IVA excluido).

8. SUBDIVISIÓN EN LOTES
El contrato no se divide en lotes. Justificación: la naturaleza integradora de los servicios hace inviable la separación sin comprometer la cohesión técnica del proyecto.

9. DOCUMENTACIÓN A PRESENTAR
  Sobre A — Documentación administrativa
  Sobre B — Documentación evaluable por juicio de valor
  Sobre C — Documentación evaluable mediante fórmulas y oferta económica

10. OBSERVACIONES RELEVANTES
  · Obligación de adscripción de medios personales: el equipo mínimo debe incluir Director de Proyecto (perfil senior, ≥8 años), Arquitecto de Solución (≥5 años) y equipo de desarrollo (mínimo 4 FTEs certificados).
  · El pliego exige sesiones de seguimiento quincenales con el comité técnico del organismo.
  · La propiedad intelectual de los desarrollos entregados corresponde íntegramente al organismo contratante.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Resumen generado automáticamente por Akena · Accenture
`;
}

// ─── Resumen persistence helpers ─────────────────────────────────────────────

type ResumenState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "done"; content: string; generatedAt: string; generatedBy: string };

function readPersistedResumen(oppId: string): ResumenState {
  try {
    const raw = localStorage.getItem(`resumen-pliego-${oppId}`);
    if (raw) {
      const p = JSON.parse(raw) as { content: string; generatedAt: string; generatedBy: string };
      if (p.content && p.generatedAt && p.generatedBy) {
        return { phase: "done", content: p.content, generatedAt: p.generatedAt, generatedBy: p.generatedBy };
      }
    }
  } catch {}
  return { phase: "idle" };
}

function persistResumen(oppId: string, content: string, generatedAt: string, generatedBy: string) {
  try {
    localStorage.setItem(`resumen-pliego-${oppId}`, JSON.stringify({ content, generatedAt, generatedBy }));
  } catch {}
}

// ─── AppResumenPliegoContent ──────────────────────────────────────────────────

function AppResumenPliegoContent({ oppId, oppName }: { oppId: string; oppName: string }) {
  const [state, setState] = useState<ResumenState>(() => readPersistedResumen(oppId));
  const [justGenerated, setJustGenerated] = useState(false);
  const [docs, setDocs] = useState<File[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [depth, setDepth] = useState<"breve" | "medio" | "extenso">("medio");
  const abortRef = useRef<AbortController | null>(null);
  const { isReadOnly } = useWorkspaceReadonly();

  // Precarga los ficheros guardados en el wizard al montar
  useEffect(() => {
    const stored = getFiles(oppId);
    if (stored && stored.length > 0) setDocs(stored);
  }, [oppId]);

  const handleAddFiles = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length === 0) return;
    const invalid = selected.filter(f => {
      const ext = f.name.split(".").pop()?.toLowerCase();
      return ext !== "pdf" && ext !== "docx";
    });
    if (invalid.length > 0) {
      setBanner(`Archivos no admitidos: ${invalid.map(f => f.name).join(", ")}. Solo .pdf y .docx.`);
      return;
    }
    setBanner(null);
    setDocs(prev => {
      const existingNames = new Set(prev.map(f => f.name));
      const next = [...prev, ...selected.filter(f => !existingNames.has(f.name))];
      storeFiles(oppId, next);
      return next;
    });
    e.target.value = "";
  }, [oppId]);

  const handleRemoveDoc = useCallback((name: string) => {
    setDocs(prev => {
      const next = prev.filter(f => f.name !== name);
      storeFiles(oppId, next);
      return next;
    });
  }, [oppId]);

  const handleGenerate = useCallback(async () => {
    if (docs.length === 0) {
      setBanner("Adjunta al menos un pliego (.pdf o .docx) antes de generar el análisis.");
      return;
    }
    setBanner(null);
    setJustGenerated(false);
    setState({ phase: "loading" });
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      const result = await analyzeFiles(
        docs,
        depth,
        `pliego:${oppId}:${Date.now()}`,
        abortRef.current.signal,
      );
      const date = new Date().toLocaleDateString("es-ES", {
        day: "2-digit", month: "2-digit", year: "numeric",
      });
      const userName = getAuthUser().name;
      const content = result.analysis ?? JSON.stringify(result);
      persistResumen(oppId, content, date, userName);
      setState({ phase: "done", content, generatedAt: date, generatedBy: userName });
      setJustGenerated(true);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Error desconocido.";
      setBanner(`Error al generar el análisis: ${msg}`);
      setState({ phase: "idle" });
    }
  }, [docs, depth, oppId]);

  const downloadTxt = (content: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Resumen_Pliego_${oppId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadDocx = (content: string) => {
    const blob = new Blob([content], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Resumen_Pliego_${oppId}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isDone    = state.phase === "done";
  const isLoading = state.phase === "loading";
  const isIdle    = state.phase === "idle";

  return (
    <div style={{ padding: "var(--content-py) var(--content-px)" }}>

      {/* ── Tool header ── */}
      <div className="flex items-start gap-4 mb-10">
        <div
          className="bg-muted text-primary flex items-center justify-center flex-shrink-0"
          style={{ width: "48px", height: "48px", borderRadius: "var(--radius)" }}
        >
          <FileSearch size={24} />
        </div>
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 style={{ fontSize: "var(--text-xl)" }}>Resumen del pliego</h3>
            <span
              style={{
                padding: "2px 10px",
                borderRadius: "var(--radius-chip)",
                fontSize: "var(--text-3xs)",
                fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                letterSpacing: "0.04em",
                background: "var(--accent-subtle)",
                color: "var(--accent)",
                fontFamily: "inherit",
              }}
            >
              Análisis
            </span>
          </div>
          <p
            className="text-muted-foreground"
            style={{ fontSize: "var(--text-sm)", maxWidth: "560px", fontFamily: "inherit" }}
          >
            Análisis automático del Pliego de Cláusulas Administrativas Particulares (PCAP) y el
            Pliego de Prescripciones Técnicas (PPT). Extrae los puntos clave, criterios de
            adjudicación y requisitos obligatorios.
          </p>
        </div>
      </div>

      {/* ── Divider ── */}
      <div style={{ borderTop: "1px solid var(--border)", marginBottom: "var(--space-7)" }} />

      {/* ── Error / warning banner ── */}
      {banner && (
        <div
          className="flex items-start gap-3 mb-6"
          style={{
            padding: "var(--banner-py) var(--banner-px)",
            borderRadius: "var(--radius-banner)",
            background: "var(--warning-subtle)",
            border: "1px solid var(--warning)",
            maxWidth: "680px",
          }}
        >
          <AlertCircle size={15} style={{ color: "var(--warning-foreground)", flexShrink: 0, marginTop: "1px" }} />
          <p style={{ fontSize: "var(--text-sm)", color: "var(--warning-foreground)", fontFamily: "inherit", lineHeight: 1.5 }}>
            {banner}
          </p>
        </div>
      )}

      {/* ── Success flash banner (solo tras generar en sesión) ── */}
      {justGenerated && isDone && (
        <div
          className="flex items-center gap-3 mb-6"
          style={{
            padding: "var(--banner-py) var(--banner-px)",
            borderRadius: "var(--radius-banner)",
            background: "var(--success-subtle)",
            border: "1px solid var(--success)",
            maxWidth: "680px",
          }}
        >
          <CheckCircle2 size={15} style={{ color: "var(--success)", flexShrink: 0 }} />
          <span style={{ fontSize: "var(--text-sm)", color: "var(--success)", fontFamily: "inherit" }}>
            Resumen generado correctamente.
          </span>
        </div>
      )}

      {/* ── Documentos cargados + añadir más ── */}
      {!isReadOnly && !isLoading && (
        <div className="flex flex-col gap-3 mb-6" style={{ maxWidth: "680px" }}>

          {/* Lista de ficheros */}
          {docs.length > 0 ? (
            <div>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", marginBottom: "6px", fontFamily: "inherit" }}>
                Documentos para analizar ({docs.length}):
              </p>
              <div className="flex flex-col gap-1">
                {docs.map((f) => (
                  <div
                    key={f.name}
                    className="flex items-center gap-2"
                    style={{
                      padding: "5px 10px",
                      borderRadius: "var(--radius-input)",
                      border: "1px solid var(--border)",
                      background: "var(--muted)",
                      maxWidth: "480px",
                    }}
                  >
                    <FileText size={12} style={{ color: "var(--primary)", flexShrink: 0 }} />
                    <span style={{ fontSize: "var(--text-2xs)", fontFamily: "inherit", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {f.name}
                    </span>
                    <span style={{ fontSize: "var(--text-3xs)", color: "var(--muted-foreground)", fontFamily: "inherit", flexShrink: 0 }}>
                      {(f.size / 1024).toFixed(0)} KB
                    </span>
                    <button
                      onClick={() => handleRemoveDoc(f.name)}
                      title="Quitar documento"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: "0 2px", fontSize: "14px", lineHeight: 1, flexShrink: 0 }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ fontSize: "var(--text-xs)", color: "var(--warning-foreground)", fontFamily: "inherit" }}>
              No hay documentos cargados. Súbelos desde el wizard de "Nueva Oportunidad" o añádelos aquí.
            </p>
          )}

          {/* Añadir ficheros */}
          <div className="flex items-center gap-3">
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "5px 12px",
                borderRadius: "var(--radius-button)",
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--foreground)",
                fontSize: "var(--text-xs)",
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              <FileText size={13} />
              Añadir documentos
              <input
                type="file"
                accept=".pdf,.docx"
                multiple
                onChange={handleAddFiles}
                style={{ display: "none" }}
              />
            </label>
            <span style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
              PCAP, PPT, Anexos (.pdf / .docx)
            </span>
          </div>

          {/* Nivel de análisis */}
          <div className="flex items-center gap-2">
            <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>Nivel de análisis:</span>
            {(["breve", "medio", "extenso"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDepth(d)}
                style={{
                  padding: "3px 10px",
                  borderRadius: "var(--radius-chip)",
                  border: "1px solid",
                  borderColor: depth === d ? "var(--primary)" : "var(--border)",
                  background: depth === d ? "var(--primary-subtle)" : "var(--card)",
                  color: depth === d ? "var(--primary)" : "var(--muted-foreground)",
                  fontSize: "var(--text-2xs)",
                  fontFamily: "inherit",
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Generate / Regenerate button + metadata ── */}
      <div className="flex items-center gap-4 mb-6" style={{ flexWrap: "wrap" }}>
        {isLoading ? (
          <div className="flex items-center gap-3">
            <Loader2 size={16} className="animate-spin" style={{ color: "var(--primary)" }} />
            <span style={{ fontSize: "var(--text-sm)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
              Analizando pliego con IA… esto puede tardar hasta un minuto.
            </span>
          </div>
        ) : isReadOnly && isIdle ? (
          <ReadonlyNotExecuted />
        ) : (
          <>
            {!isReadOnly && (
              <AppButton
                variant="primary"
                icon={isDone ? <RefreshCw size={13} /> : <Sparkles size={14} />}
                disabled={docs.length === 0}
                onClick={handleGenerate}
              >
                {isDone
                  ? `Regenerar análisis (${docs.length} doc${docs.length !== 1 ? "s" : ""})`
                  : `Analizar pliego con IA (${docs.length} doc${docs.length !== 1 ? "s" : ""})`}
              </AppButton>
            )}
            {isDone && state.phase === "done" && (
              <p style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
                Generado el {state.generatedAt} por {state.generatedBy}.
              </p>
            )}
          </>
        )}
      </div>

      {/* ── Textarea ── */}
      <div style={{ maxWidth: "760px" }}>
        <textarea
          readOnly
          value={isDone && state.phase === "done" ? state.content : ""}
          placeholder="El resumen del pliego se mostrará aquí tras generarlo."
          style={{
            width: "100%",
            minHeight: "360px",
            padding: "var(--space-4)",
            borderRadius: "var(--radius-input)",
            border: "1px solid var(--border)",
            background: isIdle ? "var(--muted)" : "var(--input-background)",
            color: "var(--foreground)",
            fontSize: "var(--text-xs)",
            fontFamily: "inherit",
            lineHeight: "1.7",
            resize: "vertical",
            outline: "none",
            cursor: "default",
          }}
        />

        {/* ── Download buttons ── */}
        {isDone && state.phase === "done" && (
          <div className="flex items-center gap-3 mt-4">
            <AppButton
              variant="secondary"
              size="sm"
              icon={<FileDown size={13} />}
              onClick={() => downloadTxt(state.content)}
            >
              Descargar en TXT
            </AppButton>
            <AppButton
              variant="secondary"
              size="sm"
              icon={<FileDown size={13} />}
              onClick={() => downloadDocx(state.content)}
            >
              Descargar en Word (.docx)
            </AppButton>
          </div>
        )}
      </div>

    </div>
  );
}

// ─── KickOff state types ───────────────────────────────────────────────────────

type KickOffStatus =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "done"; generatedAt: string; generatedBy: string };

function readPersistedKickOff(oppId: string): KickOffStatus {
  try {
    const raw = localStorage.getItem(`kickoff-admin-${oppId}`);
    if (raw) {
      const parsed = JSON.parse(raw) as { generatedAt: string; generatedBy: string };
      if (parsed.generatedAt && parsed.generatedBy) {
        return { phase: "done", generatedAt: parsed.generatedAt, generatedBy: parsed.generatedBy };
      }
    }
  } catch {}
  return { phase: "idle" };
}

function persistKickOff(oppId: string, generatedAt: string, generatedBy: string) {
  try {
    localStorage.setItem(`kickoff-admin-${oppId}`, JSON.stringify({ generatedAt, generatedBy }));
  } catch {}
}

// ─── AppKickOffAdminContent ────────────────────────────────────────────────────

function AppKickOffAdminContent({ oppId, oppName }: { oppId: string; oppName: string }) {
  const [status, setStatus] = useState<KickOffStatus>(() => readPersistedKickOff(oppId));
  const { isReadOnly } = useWorkspaceReadonly();

  const handleGenerate = () => {
    setStatus({ phase: "loading" });
    setTimeout(() => {
      const date = new Date().toLocaleDateString("es-ES", {
        day: "2-digit", month: "2-digit", year: "numeric",
      });
      const userName = getAuthUser().name;
      persistKickOff(oppId, date, userName);
      setStatus({ phase: "done", generatedAt: date, generatedBy: userName });
    }, 1000);
  };

  const handleDownload = () => {
    const safeName = oppName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_\-]/g, "");
    const filename = `KickOff_Administrativo_${safeName}.docx`;
    const content = `Kick-Off Administrativo\nOportunidad: ${oppName}\nID: ${oppId}\nGenerado por: ${getAuthUser().name}`;
    const blob = new Blob([content], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isDone    = status.phase === "done";
  const isLoading = status.phase === "loading";

  return (
    <div style={{ padding: "var(--content-py) var(--content-px)" }}>
      {/* ── Tool header ── */}
      <div className="flex items-start gap-4 mb-10">
        <div
          className="bg-muted text-primary flex items-center justify-center flex-shrink-0"
          style={{ width: "48px", height: "48px", borderRadius: "var(--radius)" }}
        >
          <Users size={24} />
        </div>
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 style={{ fontSize: "var(--text-xl)" }}>Generación Kick-Off Administrativo</h3>
            <span
              style={{
                padding: "2px 10px",
                borderRadius: "var(--radius-chip)",
                fontSize: "var(--text-3xs)",
                fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                letterSpacing: "0.04em",
                background: "var(--neutral-subtle)",
                color: "var(--muted-foreground)",
                fontFamily: "inherit",
              }}
            >
              Administrativo
            </span>
          </div>
          <p
            className="text-muted-foreground"
            style={{ fontSize: "var(--text-sm)", maxWidth: "520px", fontFamily: "inherit" }}
          >
            Genera automáticamente el documento de Kick-Off Administrativo en formato Word a
            partir de los datos de la oportunidad.
          </p>
        </div>
      </div>

      {/* ── Divider ── */}
      <div style={{ borderTop: "1px solid var(--border)", marginBottom: "var(--space-8)" }} />

      {/* ── Action area ── */}
      <div
        className="bg-card border border-border"
        style={{ borderRadius: "var(--radius)", padding: "var(--content-py) var(--content-px)", maxWidth: "560px" }}
      >
        {/* LOADING */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-4" style={{ padding: "var(--section-gap) 0" }}>
            <Loader2 size={32} className="animate-spin" style={{ color: "var(--primary)" }} />
            <p style={{ fontSize: "var(--text-sm)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
              Generando documento…
            </p>
          </div>
        )}

        {/* IDLE */}
        {status.phase === "idle" && (
          <div className="flex flex-col gap-3">
            <p style={{ fontSize: "var(--text-sm)", color: "var(--muted-foreground)", fontFamily: "inherit", marginBottom: "8px" }}>
              {isReadOnly ? "No ejecutado antes de marcar como Entregada." : "El documento aún no ha sido generado para esta oportunidad."}
            </p>
            {!isReadOnly && (
              <div>
                <AppButton variant="primary" icon={<Sparkles size={14} />} onClick={handleGenerate}>
                  Generar Kick-Off Administrativo
                </AppButton>
              </div>
            )}
          </div>
        )}

        {/* DONE */}
        {isDone && status.phase === "done" && (
          <div className="flex flex-col gap-5">
            <div
              className="flex items-center gap-3"
              style={{
                padding: "var(--banner-py) var(--banner-px)",
                borderRadius: "var(--radius-banner)",
                background: "var(--success-subtle)",
                border: "1px solid var(--success)",
              }}
            >
              <CheckCircle2 size={15} style={{ color: "var(--success)", flexShrink: 0 }} />
              <span style={{ fontSize: "var(--text-sm)", color: "var(--success)", fontFamily: "inherit" }}>
                Documento generado correctamente.
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <div>
                <AppButton variant="primary" icon={<FileDown size={14} />} onClick={handleDownload}>
                  Descargar Kick-Off Administrativo
                </AppButton>
              </div>
              <p style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit", paddingLeft: "2px" }}>
                Generado el {status.generatedAt} por {status.generatedBy}.
              </p>
            </div>

            {!isReadOnly && (
              <>
                <div style={{ borderTop: "1px solid var(--border)" }} />
                <div className="flex items-center gap-3">
                  <AppButton variant="secondary" icon={<RefreshCw size={13} />} onClick={handleGenerate}>
                    Regenerar Kick-Off Administrativo
                  </AppButton>
                  <p style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
                    Sobrescribirá la versión anterior.
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Incoherencias types & data ───────────────────────────────────────────────

type IncoherenciaTipo = "contradiccion" | "inconsistencia" | "ambiguedad" | "duplicado";

interface IncoherenciaItem {
  id:            string;
  tipo:          IncoherenciaTipo;
  titulo:        string;
  descripcion:   string;
  secciones:     string[];
  paginas:       string;
  recomendacion: string;
}

interface IncoherenciasResult {
  items:       IncoherenciaItem[];
  generatedAt: string;
  generatedBy: string;
}

function incoherenciaTipoLabel(tipo: IncoherenciaTipo): string {
  switch (tipo) {
    case "contradiccion":  return "Contradicción";
    case "inconsistencia": return "Inconsistencia";
    case "ambiguedad":     return "Ambigüedad";
    case "duplicado":      return "Criterio duplicado";
  }
}

function incoherenciaTipoStyle(tipo: IncoherenciaTipo): { stripBg: string; stripText: string; cardBorder: string } {
  switch (tipo) {
    case "contradiccion":
      return { stripBg: "var(--destructive-subtle)", stripText: "var(--destructive)", cardBorder: "var(--destructive)" };
    case "duplicado":
      return { stripBg: "var(--destructive-subtle)", stripText: "var(--destructive)", cardBorder: "var(--destructive)" };
    default:
      return { stripBg: "var(--warning-subtle)", stripText: "var(--warning-foreground)", cardBorder: "var(--warning)" };
  }
}

function buildMockIncoherencias(oppName: string, _oppId: string): IncoherenciasResult {
  const date     = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
  const userName = getAuthUser().name;
  return {
    generatedAt: date,
    generatedBy: userName,
    items: [
      {
        id: "I-001", tipo: "contradiccion",
        titulo: "Contradicción en el plazo de ejecución",
        descripcion: "El PCAP establece un plazo de ejecución inicial de 24 meses (cláusula 8.1), mientras que el PPT hace referencia a una duración de 18 meses (apartado 3.2, Cronograma de hitos). Esta discrepancia genera ambigüedad sobre el período contractual efectivo y puede comprometer la planificación de recursos del licitador.",
        secciones: ["PCAP – Cláusula 8.1 \"Plazo de Ejecución\"", "PPT – Apartado 3.2 \"Cronograma de hitos\""],
        paginas: "PCAP p. 14 / PPT p. 22",
        recomendacion: "Solicitar aclaración al órgano de contratación mediante consulta formal antes del plazo de presentación de ofertas.",
      },
      {
        id: "I-002", tipo: "inconsistencia",
        titulo: "Inconsistencia en la clasificación empresarial requerida",
        descripcion: "La Sección 3 del PCAP exige clasificación Grupo V, Subgrupo 3, Categoría D. Sin embargo, el Anexo I de solvencia técnica hace referencia a contratos de servicios de Categoría C como suficiente. Esta contradicción puede dar lugar a impugnaciones de otras empresas licitadoras.",
        secciones: ["PCAP – Sección 3 \"Solvencia y clasificación\"", "PCAP – Anexo I \"Solvencia técnica y profesional\""],
        paginas: "PCAP p. 8 / PCAP Anexo I p. 34",
        recomendacion: "Preparar documentación que justifique la Categoría D y documentar la interpretación más favorable. Considerar consulta previa.",
      },
      {
        id: "I-003", tipo: "duplicado",
        titulo: "Criterio de valoración duplicado sin delimitación",
        descripcion: "El criterio «Metodología de gestión del proyecto» aparece tanto en el Apartado A (criterios automáticos, 20 puntos) como en el Apartado B (juicio de valor, 15 puntos) sin delimitar claramente qué aspectos se evalúan en cada fase. Esto puede provocar doble penalización por la misma deficiencia o valoraciones contradictorias entre mesas.",
        secciones: ["PCAP – Apartado A \"Criterios evaluables mediante fórmulas\"", "PCAP – Apartado B \"Criterios sujetos a juicio de valor\""],
        paginas: "PCAP p. 17–18",
        recomendacion: "Separar explícitamente los subaspectos de metodología que corresponden a cada sobre. Coordinar respuesta con el equipo de calidad.",
      },
      {
        id: "I-004", tipo: "contradiccion",
        titulo: "Discrepancia en el importe de la garantía definitiva",
        descripcion: "El PCAP establece la garantía definitiva en el 5% del precio de adjudicación (cláusula 12.1), mientras que el cuadro resumen inicial de datos esenciales del contrato indica el 3%. Ambos documentos son de carácter vinculante, lo que genera incertidumbre sobre el importe real.",
        secciones: ["PCAP – Cláusula 12.1 \"Garantías\"", "PCAP – Cuadro resumen \"Datos esenciales del contrato\""],
        paginas: "PCAP p. 3 (cuadro resumen) / PCAP p. 21 (cláusula 12.1)",
        recomendacion: "La norma general (LCSP art. 107) fija el 5%. Es la cifra más probable y la que se debe usar en la planificación financiera.",
      },
      {
        id: "I-005", tipo: "ambiguedad",
        titulo: "Ambigüedad en los medios personales adscritos obligatorios",
        descripcion: "El PPT (cláusula 6.3) exige adscripción obligatoria de un Director de Proyecto con ≥8 años de experiencia y certificación PMP. Sin embargo, la tabla de valoración del criterio B no puntúa la certificación PMP, creando incertidumbre sobre si es requisito de admisión o únicamente de valoración.",
        secciones: ["PPT – Cláusula 6.3 \"Medios personales mínimos\"", "PCAP – Apartado B \"Criterios de valoración técnica\""],
        paginas: "PPT p. 18 / PCAP p. 19",
        recomendacion: "Interpretar la certificación PMP como requisito mínimo de admisión para evitar descalificación. Asegurar disponibilidad del perfil antes del cierre de la oferta.",
      },
    ],
  };
}

// ─── Word download ─────────────────────────────────────────────────────────────

function downloadIncoherenciasWord(result: IncoherenciasResult, oppName: string, oppId: string) {
  const blocks = result.items.map((inc, i) => {
    const isRed     = inc.tipo === "contradiccion" || inc.tipo === "duplicado";
    const tipoBg    = isRed ? "#f8d7da" : "#fff3cd";
    const tipoColor = isRed ? "#721c24" : "#7c4a00";
    const tipoBorder= isRed ? "#dc3545" : "#e6a817";
    const secHtml   = inc.secciones.map((s) => `<li style="margin:2px 0;color:#444;font-size:10.5pt;">· ${s}</li>`).join("");
    return `
    <div style="margin-bottom:22px;border:1px solid ${tipoBorder};border-radius:4px;overflow:hidden;">
      <div style="padding:7px 14px;background:${tipoBg};border-bottom:1px solid ${tipoBorder};">
        <span style="font-size:9pt;font-weight:bold;color:${tipoColor};letter-spacing:1px;text-transform:uppercase;">
          ⚠ ${incoherenciaTipoLabel(inc.tipo).toUpperCase()}
        </span>
        <span style="font-size:9pt;color:${tipoColor};font-weight:bold;float:right;">${inc.id}</span>
      </div>
      <div style="padding:14px 16px;background:#fff;">
        <p style="margin:0 0 8px;font-size:12pt;font-weight:bold;color:#111;">${i + 1}. ${inc.titulo}</p>
        <p style="margin:0 0 8px;font-size:10.5pt;color:#444;line-height:1.6;">${inc.descripcion}</p>
        <p style="margin:0 0 4px;font-size:10.5pt;font-weight:bold;color:#111;">Secciones implicadas:</p>
        <ul style="margin:0 0 8px;padding:0;list-style:none;">${secHtml}</ul>
        <p style="margin:0 0 8px;font-size:10pt;color:#666;font-style:italic;">Página estimada: ${inc.paginas}</p>
        <div style="padding:9px 12px;background:#eff3ff;border-left:3px solid #4361ee;border-radius:2px;">
          <b style="color:#4361ee;font-size:10.5pt;">Recomendación:</b>
          <span style="font-size:10.5pt;color:#1a1a2e;line-height:1.6;"> ${inc.recomendacion}</span>
        </div>
      </div>
    </div>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"><title>Incoherencias — ${oppName}</title>
<style>body{font-family:Calibri,Arial,sans-serif;margin:2cm 2.5cm;color:#111;font-size:11pt;}
h1{font-size:16pt;margin:0 0 4px;}h2{font-size:12pt;margin:28px 0 10px;border-bottom:2px solid #e0e0e0;padding-bottom:4px;}</style>
</head><body>
  <h1>Informe de control de incoherencias del pliego</h1>
  <p style="margin:0 0 2px;font-size:10pt;color:#555;">Oportunidad: <b>${oppName}</b> &nbsp;·&nbsp; Referencia: <b>${oppId}</b></p>
  <p style="margin:0 0 20px;font-size:10pt;color:#555;">Generado el: <b>${result.generatedAt}</b> &nbsp;·&nbsp; Por: <b>${result.generatedBy}</b> &nbsp;·&nbsp; Total: <b>${result.items.length} incoherencias</b></p>
  <h2>Incoherencias detectadas (${result.items.length})</h2>
  ${blocks}
  <p style="margin-top:36px;font-size:9pt;color:#aaa;border-top:1px solid #eee;padding-top:8px;">
    Documento generado automáticamente por Akena · Accenture &nbsp;·&nbsp; ${result.generatedAt}
  </p>
</body></html>`;

  const blob = new Blob([html], { type: "application/msword" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = `incoherencias-${oppName.replace(/\s+/g, "-").toLowerCase()}.doc`;
  a.click(); URL.revokeObjectURL(url);
}

// ─── IncoherenciaCard ─────────────────────────────────────────────────────────

function IncoherenciaCard({ inc, index }: { inc: IncoherenciaItem; index: number }) {
  const s = incoherenciaTipoStyle(inc.tipo);
  return (
    <div style={{
      borderRadius: "var(--radius-banner)",
      border: `1px solid ${s.cardBorder}`,
      background: "var(--card)",
      overflow: "hidden",
    }}>
      {/* Type strip */}
      <div className="flex items-center gap-2" style={{
        padding: "7px 14px",
        background: s.stripBg,
        borderBottom: `1px solid ${s.cardBorder}`,
      }}>
        <AlertTriangle size={11} style={{ color: s.stripText, flexShrink: 0 }} />
        <span style={{
          fontSize: "var(--text-3xs)",
          fontWeight: "var(--font-weight-bold)" as CSSProperties["fontWeight"],
          color: s.stripText, fontFamily: "inherit",
          letterSpacing: "0.08em", flex: 1,
        }}>
          {incoherenciaTipoLabel(inc.tipo).toUpperCase()}
        </span>
        <span style={{
          fontSize: "var(--text-2xs)",
          fontWeight: "var(--font-weight-bold)" as CSSProperties["fontWeight"],
          color: s.stripText, fontFamily: "inherit", opacity: 0.85,
        }}>
          {inc.id}
        </span>
      </div>
      {/* Body */}
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <p style={{
          fontSize: "var(--text-sm)",
          fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
          color: "var(--foreground)", fontFamily: "inherit",
        }}>
          {index + 1}. {inc.titulo}
        </p>
        <p style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit", lineHeight: "1.65" }}>
          {inc.descripcion}
        </p>
        {/* Sections box */}
        <div style={{
          padding: "10px 12px", borderRadius: "var(--radius-banner)",
          background: "var(--muted)", border: "1px solid var(--border)",
        }}>
          <p style={{
            fontSize: "var(--text-2xs)",
            fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
            color: "var(--foreground)", fontFamily: "inherit",
            marginBottom: "6px", letterSpacing: "0.03em",
          }}>
            Secciones implicadas
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {inc.secciones.map((sec, i) => (
              <div key={i} className="flex items-start gap-2">
                <span style={{ color: "var(--primary)", fontSize: "var(--text-xs)", flexShrink: 0, marginTop: "1px" }}>·</span>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit", lineHeight: "1.5" }}>{sec}</span>
              </div>
            ))}
          </div>
          {inc.paginas && (
            <p style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit", marginTop: "8px", fontStyle: "italic" }}>
              Página estimada: {inc.paginas}
            </p>
          )}
        </div>
        {/* Recommendation */}
        <div className="flex items-start gap-2" style={{
          padding: "9px 12px", borderRadius: "var(--radius-banner)",
          background: "var(--primary-subtle)", border: "1px solid var(--border)",
        }}>
          <FileSearch size={12} style={{ color: "var(--primary)", flexShrink: 0, marginTop: "2px" }} />
          <p style={{ fontSize: "var(--text-xs)", color: "var(--foreground)", fontFamily: "inherit", lineHeight: "1.6" }}>
            <span style={{
              fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
              color: "var(--primary)", fontFamily: "inherit",
            }}>
              Recomendación:{" "}
            </span>
            {inc.recomendacion}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Incoherencias persistence ────────────────────────────────────────────────

type IncoherenciasState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "done"; result: IncoherenciasResult };

function readPersistedIncoherencias(oppId: string): IncoherenciasState {
  try {
    const raw = localStorage.getItem(`incoherencias-${oppId}`);
    if (raw) {
      const p = JSON.parse(raw) as IncoherenciasResult;
      if (p.items && p.generatedAt && p.generatedBy)
        return { phase: "done", result: p };
    }
  } catch {}
  return { phase: "idle" };
}

function persistIncoherencias(oppId: string, result: IncoherenciasResult) {
  try {
    localStorage.setItem(`incoherencias-${oppId}`, JSON.stringify(result));
  } catch {}
}

// ─── AppIncoherenciasContent ───────────────────────────────────────────────────

function AppIncoherenciasContent({ oppId, oppName }: { oppId: string; oppName: string }) {
  const [state, setState] = useState<IncoherenciasState>(() => readPersistedIncoherencias(oppId));
  const [justGenerated, setJustGenerated] = useState(false);
  const [docs, setDocs] = useState<File[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { isReadOnly } = useWorkspaceReadonly();

  useEffect(() => {
    const stored = getFiles(oppId);
    if (stored && stored.length > 0) setDocs(stored);
  }, [oppId]);

  const handleAddFiles = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (!selected.length) return;
    const invalid = selected.filter(f => { const ext = f.name.split(".").pop()?.toLowerCase(); return ext !== "pdf" && ext !== "docx"; });
    if (invalid.length) { setBanner(`No admitidos: ${invalid.map(f => f.name).join(", ")}`); return; }
    setBanner(null);
    setDocs(prev => {
      const names = new Set(prev.map(f => f.name));
      const next = [...prev, ...selected.filter(f => !names.has(f.name))];
      storeFiles(oppId, next);
      return next;
    });
    e.target.value = "";
  }, [oppId]);

  const handleRemoveDoc = useCallback((name: string) => {
    setDocs(prev => { const next = prev.filter(f => f.name !== name); storeFiles(oppId, next); return next; });
  }, [oppId]);

  const handleGenerate = useCallback(async () => {
    if (docs.length === 0) { setBanner("Adjunta al menos un documento del pliego."); return; }
    setBanner(null);
    setJustGenerated(false);
    setState({ phase: "loading" });
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      const res = await detectIncoherencias(docs, `incoherencias:${oppId}:${Date.now()}`, abortRef.current.signal);
      const date = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
      const userName = getAuthUser().name;
      const result: IncoherenciasResult = { items: res.items as IncoherenciaItem[], generatedAt: date, generatedBy: userName };
      persistIncoherencias(oppId, result);
      setState({ phase: "done", result });
      setJustGenerated(true);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setBanner(`Error: ${err instanceof Error ? err.message : "Error desconocido."}`);
      setState({ phase: "idle" });
    }
  }, [docs, oppId]);

  const isDone    = state.phase === "done";
  const isLoading = state.phase === "loading";
  const isIdle    = state.phase === "idle";

  const typeCounts = isDone && state.phase === "done"
    ? state.result.items.reduce<Record<string, number>>((acc, inc) => {
        acc[inc.tipo] = (acc[inc.tipo] ?? 0) + 1; return acc;
      }, {})
    : {};

  return (
    <div style={{ padding: "var(--content-py) var(--content-px)", maxWidth: "860px" }}>

      {/* ── Tool header ── */}
      <div className="flex items-start gap-4 mb-8">
        <div
          className="bg-muted text-primary flex items-center justify-center flex-shrink-0"
          style={{ width: "48px", height: "48px", borderRadius: "var(--radius)" }}
        >
          <AlertTriangle size={24} />
        </div>
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 style={{ fontSize: "var(--text-xl)" }}>Control de incoherencias</h3>
            <span style={{
              padding: "2px 10px", borderRadius: "var(--radius-chip)",
              fontSize: "var(--text-3xs)",
              fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
              letterSpacing: "0.04em",
              background: "var(--warning-subtle)", color: "var(--warning-foreground)", fontFamily: "inherit",
            }}>
              Control
            </span>
          </div>
          <p className="text-muted-foreground" style={{ fontSize: "var(--text-sm)", maxWidth: "560px", fontFamily: "inherit", lineHeight: "1.55" }}>
            Detecta automáticamente inconsistencias, contradicciones y puntos ambiguos entre
            los documentos del pliego. Genera un informe estructurado con las incidencias
            encontradas, las secciones afectadas y recomendaciones de revisión.
          </p>
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--border)", marginBottom: "var(--space-7)" }} />

      {/* ── Error banner ── */}
      {banner && (
        <div className="flex items-start gap-3 mb-4" style={{ padding: "var(--banner-py) var(--banner-px)", borderRadius: "var(--radius-banner)", background: "var(--warning-subtle)", border: "1px solid var(--warning)", maxWidth: "680px" }}>
          <AlertCircle size={15} style={{ color: "var(--warning-foreground)", flexShrink: 0, marginTop: "1px" }} />
          <p style={{ fontSize: "var(--text-sm)", color: "var(--warning-foreground)", fontFamily: "inherit", lineHeight: 1.5 }}>{banner}</p>
        </div>
      )}

      {/* ── Documentos + añadir más ── */}
      {!isReadOnly && !isLoading && (
        <div className="flex flex-col gap-2 mb-6" style={{ maxWidth: "680px" }}>
          {docs.length > 0 ? (
            <div className="flex flex-col gap-1">
              {docs.map(f => (
                <div key={f.name} className="flex items-center gap-2" style={{ padding: "4px 10px", borderRadius: "var(--radius-input)", border: "1px solid var(--border)", background: "var(--muted)", maxWidth: "480px" }}>
                  <FileText size={11} style={{ color: "var(--primary)", flexShrink: 0 }} />
                  <span style={{ fontSize: "var(--text-2xs)", fontFamily: "inherit", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                  <button onClick={() => handleRemoveDoc(f.name)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: "0 2px", fontSize: "14px", lineHeight: 1, flexShrink: 0 }}>×</button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>Sin documentos. Añade el PCAP y PPT para detectar incoherencias.</p>
          )}
          <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 10px", borderRadius: "var(--radius-button)", border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", fontSize: "var(--text-xs)", fontFamily: "inherit", cursor: "pointer", width: "fit-content" }}>
            <FileText size={12} /> Añadir documentos
            <input type="file" accept=".pdf,.docx" multiple onChange={handleAddFiles} style={{ display: "none" }} />
          </label>
        </div>
      )}

      {/* ── Success flash ── */}
      {justGenerated && isDone && (
        <div className="flex items-center gap-3 mb-6" style={{
          padding: "var(--banner-py) var(--banner-px)",
          borderRadius: "var(--radius-banner)",
          background: "var(--success-subtle)", border: "1px solid var(--success)", maxWidth: "680px",
        }}>
          <CheckCircle2 size={15} style={{ color: "var(--success)", flexShrink: 0 }} />
          <span style={{ fontSize: "var(--text-sm)", color: "var(--success)", fontFamily: "inherit" }}>
            Control de incoherencias generado correctamente.
          </span>
        </div>
      )}

      {/* ── Actions bar ── */}
      <div className="flex items-center gap-3 mb-6" style={{ flexWrap: "wrap" }}>
        {isLoading ? (
          <div className="flex items-center gap-3">
            <Loader2 size={16} className="animate-spin" style={{ color: "var(--primary)" }} />
            <span style={{ fontSize: "var(--text-sm)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
              Analizando con IA… puede tardar hasta un minuto.
            </span>
          </div>
        ) : isReadOnly && isIdle ? (
          <ReadonlyNotExecuted />
        ) : (
          <>
            {!isReadOnly && (
              <AppButton
                variant="primary"
                icon={isDone ? <RefreshCw size={13} /> : <Sparkles size={14} />}
                disabled={docs.length === 0}
                onClick={handleGenerate}
              >
                {isDone ? "Volver a analizar incoherencias" : `Detectar incoherencias (${docs.length} doc${docs.length !== 1 ? "s" : ""})`}
              </AppButton>
            )}
            {isDone && state.phase === "done" && (
              <>
                <AppButton
                  variant="secondary"
                  icon={<FileDown size={13} />}
                  onClick={() => downloadIncoherenciasWord(state.result, oppName, oppId)}
                >
                  Descargar informe Word
                </AppButton>
                <p style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
                  Generado el {state.result.generatedAt} por {state.result.generatedBy}.
                </p>
              </>
            )}
          </>
        )}
      </div>

      {/* ── Results ── */}
      {isDone && state.phase === "done" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {/* Summary */}
          <div className="flex items-center gap-3 flex-wrap" style={{ marginBottom: "8px" }}>
            <div style={{
              padding: "7px 14px", borderRadius: "var(--radius-banner)",
              background: "var(--destructive-subtle)", border: "1px solid var(--destructive)",
              display: "flex", alignItems: "center", gap: "8px",
            }}>
              <AlertTriangle size={13} style={{ color: "var(--destructive)", flexShrink: 0 }} />
              <span style={{
                fontSize: "var(--text-xs)",
                fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                color: "var(--destructive)", fontFamily: "inherit",
              }}>
                {state.result.items.length} incoherencia{state.result.items.length !== 1 ? "s" : ""} detectada{state.result.items.length !== 1 ? "s" : ""}
              </span>
            </div>
            {Object.entries(typeCounts).map(([tipo, count]) => (
              <span key={tipo} style={{
                fontSize: "var(--text-2xs)",
                fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                padding: "3px 10px", borderRadius: "var(--radius-chip)",
                background: "var(--neutral-subtle)", border: "1px solid var(--border)",
                color: "var(--muted-foreground)", fontFamily: "inherit",
              }}>
                {incoherenciaTipoLabel(tipo as IncoherenciaTipo)} ({count})
              </span>
            ))}
          </div>

          {/* Incoherencia cards */}
          {state.result.items.map((inc, idx) => (
            <IncoherenciaCard key={inc.id} inc={inc} index={idx} />
          ))}

          {/* Disclaimer */}
          <div className="flex items-start gap-2" style={{
            padding: "10px 14px", marginTop: "4px",
            borderRadius: "var(--radius-banner)",
            background: "var(--neutral-subtle)", border: "1px solid var(--border)",
          }}>
            <AlertCircle size={12} style={{ color: "var(--muted-foreground)", flexShrink: 0, marginTop: "2px" }} />
            <p style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit", lineHeight: "1.6" }}>
              Este análisis automatizado es orientativo. Las incoherencias detectadas deben ser revisadas por el equipo legal y técnico antes de formular consultas al órgano de contratación.
            </p>
          </div>
        </div>
      )}

      {/* ── Idle empty state ── */}
      {isIdle && (
        <div style={{
          padding: "48px 32px", borderRadius: "var(--radius)",
          border: "1px dashed var(--border)", background: "var(--muted)",
          textAlign: "center", maxWidth: "560px",
        }}>
          <AlertTriangle size={28} style={{ color: "var(--muted-foreground)", margin: "0 auto 12px" }} />
          <p style={{ fontSize: "var(--text-sm)", color: "var(--muted-foreground)", fontFamily: "inherit", lineHeight: "1.6" }}>
            El listado de incoherencias detectadas se mostrará aquí tras ejecutar el análisis.
          </p>
        </div>
      )}

    </div>
  );
}

// ─── Generic tool content ──────────────────────────────────────────────────────

function AppGenericToolContent({ selectedItem }: { selectedItem: string }) {
  const content = CONTENT_MAP[selectedItem];
  const { isReadOnly } = useWorkspaceReadonly();
  if (!content) return null;

  const badgeStyle = content.badge ? (BADGE_COLORS[content.badge] ?? BADGE_COLORS["Análisis"]) : null;

  return (
    <div style={{ padding: "var(--content-py) var(--content-px)" }}>
      {/* Tool header */}
      <div className="flex items-start gap-4 mb-8">
        <div
          className="bg-muted text-primary flex items-center justify-center flex-shrink-0"
          style={{ width: "48px", height: "48px", borderRadius: "var(--radius)" }}
        >
          {content.icon}
        </div>
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 style={{ fontSize: "var(--text-xl)" }}>{content.title}</h3>
            {content.badge && badgeStyle && (
              <span
                style={{
                  padding: "2px 10px",
                  borderRadius: "var(--radius-chip)",
                  fontSize: "var(--text-3xs)",
                  fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                  letterSpacing: "0.04em",
                  background: badgeStyle.bg,
                  color: badgeStyle.color,
                  fontFamily: "inherit",
                }}
              >
                {content.badge}
              </span>
            )}
          </div>
          <p
            className="text-muted-foreground"
            style={{ fontSize: "var(--text-sm)", maxWidth: "560px", fontFamily: "inherit" }}
          >
            {content.description}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-10 flex-wrap">
        {isReadOnly ? (
          <ReadonlyNotExecuted />
        ) : (
          content.actions.map((action, i) => (
            <AppButton
              key={action}
              variant={i === 0 ? "primary" : "secondary"}
              size="md"
              icon={i === 0 ? <Sparkles size={14} /> : undefined}
              data-testid={`action-${i}`}
            >
              {action}
            </AppButton>
          ))
        )}
      </div>

      {/* Workspace placeholder */}
      <div
        className="border border-dashed border-border"
        style={{ borderRadius: "var(--radius-banner)", minHeight: "400px", background: "var(--muted)" }}
      >
        <div
          className="flex flex-col items-center justify-center"
          style={{ padding: "var(--space-12)", minHeight: "400px" }}
        >
          <div
            className="bg-card border border-border flex items-center justify-center mb-4"
            style={{ width: "48px", height: "48px", borderRadius: "var(--radius)" }}
          >
            {content.icon}
          </div>
          <p
            className="text-muted-foreground"
            style={{ fontSize: "var(--text-sm)", textAlign: "center", fontFamily: "inherit" }}
          >
            El área de trabajo se cargará aquí al activar la funcionalidad
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── AppWorkspaceContent ───────────────────────────────────────────────────────

interface WorkspaceContentProps {
  selectedItem: string;
  oppId: string;
  oppName: string;
  onRegisterGuard: (guard: ((newId: string) => void) | null) => void;
  navigateTo: (id: string) => void;
}

export function AppWorkspaceContent({ selectedItem, oppId, oppName, onRegisterGuard, navigateTo }: WorkspaceContentProps) {
  if (!selectedItem) {
    return (
      <Box sx={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1.5, p: 6 }}>
        <Sparkles size={28} style={{ color: "var(--muted-foreground)" }} />
        <Typography variant="body1" fontWeight={600}>Selecciona una funcionalidad</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", maxWidth: 420 }}>
          Utiliza el panel de navegación lateral para acceder a las herramientas de las líneas administrativa, técnica y económica.
        </Typography>
      </Box>
    );
  }

  if (selectedItem === "admin-equipo") {
    return <AppKickOffAdminContent oppId={oppId} oppName={oppName} />;
  }

  if (selectedItem === "tec-resumen-pliego") {
    return <AppResumenPliegoContent oppId={oppId} oppName={oppName} />;
  }

  if (selectedItem === "tec-incoherencias") {
    return <AppIncoherenciasContent oppId={oppId} oppName={oppName} />;
  }

  if (selectedItem === "tec-indice") {
    return (
      <AppIndiceContent
        oppId={oppId}
        oppName={oppName}
        onRegisterGuard={onRegisterGuard}
        navigateTo={navigateTo}
      />
    );
  }

  if (selectedItem === "tec-asistente") {
    return <AppAsistenteContent oppId={oppId} oppName={oppName} />;
  }

  // Modules blocked until the index is validated
  if (BLOCKED_UNTIL_INDICE.has(selectedItem) && !isIndiceValidated(oppId)) {
    return <AppBlockedByIndice />;
  }

  if (selectedItem === "tec-referencia") {
    return <AppReferenciaContent oppId={oppId} oppName={oppName} />;
  }

  if (selectedItem === "tec-win-themes") {
    return (
      <AppWinThemesContent
        oppId={oppId}
        oppName={oppName}
        onRegisterGuard={onRegisterGuard}
        navigateTo={navigateTo}
      />
    );
  }

  if (selectedItem === "tec-oferta-v0") {
    return <AppOfertaV0Content oppId={oppId} oppName={oppName} />;
  }

  // Generación documental — todas las herramientas doc-* en una sola pantalla de 5 tarjetas
  if (selectedItem.startsWith("doc-")) {
    return <AppDocumentalContent oppId={oppId} oppName={oppName} activeToolId={selectedItem} onActivate={navigateTo} />;
  }

  if (selectedItem === "val-evaluacion") {
    return <AppEvaluacionContent oppId={oppId} oppName={oppName} />;
  }

  if (selectedItem === "val-sobres") {
    return <AppSobresContent oppId={oppId} oppName={oppName} />;
  }

  if (selectedItem === "val-resumen") {
    return <AppResumenContent oppId={oppId} oppName={oppName} />;
  }

  if (selectedItem === "eco-config-simulacion") {
    return <AppEcoSimulacionContent oppId={oppId} oppName={oppName} />;
  }

  if (selectedItem === "eco-descuento-rec") {
    return <AppEcoDescuentoContent oppId={oppId} oppName={oppName} />;
  }

  if (selectedItem === "eco-espacio") {
    return <AppEcoEspacioContent oppId={oppId} oppName={oppName} />;
  }

  if (!CONTENT_MAP[selectedItem]) {
    return (
      <Box sx={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1.5, p: 6 }}>
        <Sparkles size={28} style={{ color: "var(--muted-foreground)" }} />
        <Typography variant="body1" fontWeight={600}>Funcionalidad no disponible</Typography>
        <Typography variant="body2" color="text.secondary">Esta herramienta está en desarrollo. Estará disponible próximamente.</Typography>
      </Box>
    );
  }

  return <AppGenericToolContent selectedItem={selectedItem} />;
}