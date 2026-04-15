"use client";

// Win Themes — Generación, edición y validación colectiva de Win Themes
// por apartado de nivel 1 del índice validado.
// Persistencia colectiva por oportunidad (sin segmentación de usuario).
// Guard de navegación: alerta modal si hay cambios sin validar.

import { useState, useEffect, useMemo, useCallback, useRef, type CSSProperties, type ChangeEvent } from "react";
import {
  Trophy, Sparkles, Loader2, CheckCircle2, RefreshCw,
  AlertCircle, ShieldCheck, FileDown, ChevronDown, X,
  ListFilter, Download, Lock, Upload, FileText,
} from "lucide-react";
import { AppButton } from "../../../../_components/ui";
import { getAuthUser } from "../../../../_components/auth-store";
import { readStoredIndice, isIndiceValidated } from "./indice-content";
import { useWorkspaceReadonly } from "./workspace-readonly-context";
import { generateWinThemes } from "../../../../../services/winThemesService";
import { getFiles } from "../../../../../services/pliegoFileStore";

// ─── Types ──────────────────────────────────────────────────────────────────────

interface IndexSection {
  id: string;       // "1", "2", …
  label: string;    // "1. PRESENTACIÓN DE LA EMPRESA LICITADORA"
  cleanTitle: string; // "PRESENTACIÓN DE LA EMPRESA LICITADORA"
  subs: IndexSub[];
}

interface IndexSub {
  id: string;       // "1.1", "1.1.1"
  label: string;
  depth: number;    // 2 = L2, 3 = L3
}

interface WinThemeSection {
  text: string;
  validatedAt?: string;
  validatedBy?: string;
}

interface WinThemeStore {
  generatedAt: string;
  generatedBy: string;
  sections: Record<string, WinThemeSection>; // keyed by L1 id
}

// ─── Storage ─────────────────────────────────────────────────────────────────

const STORE_KEY = (oppId: string) => `win-themes-${oppId}`;

function readWinThemes(oppId: string): WinThemeStore | null {
  try {
    const raw = localStorage.getItem(STORE_KEY(oppId));
    if (!raw) return null;
    const p = JSON.parse(raw) as WinThemeStore;
    if (p.generatedAt && p.generatedBy && p.sections) return p;
  } catch {}
  return null;
}

function saveWinThemes(oppId: string, store: WinThemeStore): void {
  try {
    localStorage.setItem(STORE_KEY(oppId), JSON.stringify(store));
  } catch {}
}

// ─── Index parser ────────────────────────────────────────────────────────────

function parseIndexSections(text: string): IndexSection[] {
  const lines = text.split("\n");
  const sections: IndexSection[] = [];
  let current: IndexSection | null = null;

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;

    // Try L3 first (most specific)
    const l3 = t.match(/^(\d+\.\d+\.\d+)\.\s+(.+)$/);
    if (l3) {
      current?.subs.push({ id: l3[1], label: t, depth: 3 });
      continue;
    }
    // L2
    const l2 = t.match(/^(\d+\.\d+)\.\s+(.+)$/);
    if (l2) {
      current?.subs.push({ id: l2[1], label: t, depth: 2 });
      continue;
    }
    // L1 (pure single-digit or multi-digit, no dots in the numeric prefix)
    const l1 = t.match(/^(\d+)\.\s+(.+)$/);
    if (l1) {
      const cleanTitle = l1[2].replace(/\[.*?\]/g, "").trim();
      current = { id: l1[1], label: t, cleanTitle, subs: [] };
      sections.push(current);
    }
  }

  return sections;
}

// ─── Mock Win Theme content builder ─────────────────────────────────────────

const MOCK_THEMES_BY_ID: Record<string, string> = {
  "1": `• Trayectoria acreditada de Accenture como partner estratégico del sector público español, con más de 200 contratos de consultoría y transformación digital ejecutados en los últimos 5 años.
  → Justificación: La solidez empresarial reduce el riesgo de adjudicación y aporta garantías de continuidad al organismo contratante.

• Clasificación empresarial Grupo V, Subgrupo 3, Categoría D vigente, cumpliendo con creces el umbral mínimo exigido por el pliego.
  → Justificación: Posiciona a Accenture como licitador de máxima categoría frente a competidores con clasificaciones inferiores.

• Certificaciones internacionales activas: ISO 9001, ISO 27001 e ISO 14001, más ENS nivel Alto homologado por el CCN-CERT.
  → Justificación: Diferenciadores certificados que maximizan la puntuación en criterios de valoración de seguridad y calidad.`,

  "2": `• Metodología propia de análisis de contexto AS-IS/TO-BE desarrollada específicamente para organismos del sector público, validada en más de 50 proyectos similares.
  → Justificación: Permite un diagnóstico más preciso y fundamentado, alineando la propuesta directamente con los objetivos estratégicos del pliego.

• Equipo de sector dedicado con conocimiento profundo del organismo contratante y su ecosistema tecnológico preexistente.
  → Justificación: Reduce la curva de arranque del proyecto y minimiza riesgos de desalineamiento con el cliente.

• Identificación proactiva de 7 retos críticos no contemplados explícitamente en el pliego, con propuestas de acción concretas y medibles.
  → Justificación: Demuestra capacidad analítica superior y alineamiento con la misión del organismo más allá del cumplimiento literal.`,

  "3": `• Arquitectura cloud-native en Microsoft Azure, con certificación de partner Gold en Public Sector, diseñada bajo los principios del ENS y el ENI.
  → Justificación: Garantiza escalabilidad, resiliencia y cumplimiento normativo desde el diseño, reduciendo riesgos técnicos para el organismo.

• Plataforma basada en microservicios con API-first design que facilita la integración nativa con los sistemas legados del organismo (SAP, SOROLLA2, GESTION+).
  → Justificación: Minimiza el esfuerzo de integración y asegura la interoperabilidad requerida por el ENI sin desarrollos adicionales costosos.

• Componentes reutilizables del Accenture Public Service Platform con track record en 12 organismos de perfil equivalente.
  → Justificación: Acelera los tiempos de entrega y reduce el riesgo tecnológico gracias a módulos ya probados en entornos equivalentes.`,

  "4": `• Metodología híbrida Agile-PMBOK adaptada a licitaciones públicas, con marcos de gobierno según PRINCE2 para cumplimiento de la LCSP.
  → Justificación: Combina agilidad operativa con los requisitos formales de control y auditoría exigibles en contratos del sector público.

• Plan de trabajo estructurado en sprints de 4 semanas con hitos de validación acordados con el comité técnico del organismo, garantizando visibilidad continua.
  → Justificación: El cliente dispone de capacidad de redireccionamiento en cualquier momento sin comprometer el calendario contractual.

• Programa de gestión del cambio organizativo con formación certificada incluida, ratio formador/usuario de 1:8 y plan de adopción medible.
  → Justificación: Asegura la adopción efectiva del sistema y el retorno de inversión del organismo desde el primer día operativo.`,

  "5": `• Equipo senior con media de 12 años de experiencia en proyectos equivalentes del sector público, liderado por Director de Proyecto certificado PMP y PRINCE2 Practitioner.
  → Justificación: La experiencia contrastada del equipo supera los requisitos mínimos del pliego y reduce el tiempo de arranque.

• Arquitecto de Solución con certificación Azure Solutions Architect Expert y experiencia directa en implantaciones ENS nivel Alto en organismos de la AGE.
  → Justificación: Diferencial técnico clave frente a propuestas con perfiles sin certificación equivalente en los criterios de valoración técnica.

• Centro de Excelencia de IA de Accenture disponible como soporte transversal, con capacidad de incorporar modelos de lenguaje avanzados al proyecto sin coste adicional.
  → Justificación: Aporta capacidades diferenciales de innovación que maximizan el valor percibido por el organismo durante toda la ejecución.`,

  "6": `• Marco de gestión de riesgos basado en ISO 31000, con registro actualizado quincenalmente y escalado automático a comité directivo en riesgos de nivel alto.
  → Justificación: El nivel de madurez en gestión del riesgo supera lo exigido por el pliego y proporciona máxima transparencia y control al organismo.

• Plan de continuidad de negocio (BCP) con RTO < 4 horas y RPO < 1 hora, validado mediante simulacros documentados en proyectos anteriores equivalentes.
  → Justificación: Garantías concretas y cuantificadas frente a propuestas que solo enuncian capacidades sin evidencia de validación empírica.`,

  "7": `• Propuesta de mejora sobre el PPT: implantación de dashboard ejecutivo en tiempo real para seguimiento de KPIs contractuales, sin coste adicional para el organismo.
  → Justificación: Agrega valor diferencial e inmediato, maximizando la puntuación en el criterio de mejoras voluntarias del pliego.

• Entorno de preproducción dedicado para pruebas del organismo, operativo desde la semana 4, con acceso permanente al equipo técnico del cliente.
  → Justificación: Permite participación activa del cliente en la validación funcional, reduciendo riesgos de rechazo y desviaciones en la aceptación final.`,
};

function buildMockWinTheme(sectionId: string, sectionLabel: string): string {
  if (MOCK_THEMES_BY_ID[sectionId]) return MOCK_THEMES_BY_ID[sectionId];

  // Fallback for IDs not explicitly mapped
  return `• Propuesta diferencial de Accenture para el apartado "${sectionLabel}", respaldada por metodologías propias y experiencia acreditada en más de 30 proyectos equivalentes en el sector público.
  → Justificación: Accenture aporta la combinación única de capacidad tecnológica, experiencia sectorial y escala global que garantiza el cumplimiento de los objetivos estratégicos del pliego.

• Equipo especializado con perfil senior alineado a los requerimientos específicos de este bloque de la oferta.
  → Justificación: La especialización del equipo permite una cobertura exhaustiva de los criterios de valoración definidos en el pliego para este apartado.

• Innovaciones tecnológicas y de proceso aplicables directamente a los objetivos de este apartado, derivadas del Centro de Excelencia de Accenture.
  → Justificación: Los elementos diferenciales propuestos maximizan la puntuación en juicio de valor sin incrementar el riesgo ni los costes para el organismo.`;
}

// ─── Download helpers ─────────────────────────────────────────────────────────

function buildDownloadContent(
  store: WinThemeStore,
  sections: IndexSection[],
  mode: "global" | "complete"
): string {
  const lines: string[] = [
    "WIN THEMES — OFERTA TÉCNICA",
    `Generado el ${store.generatedAt} por ${store.generatedBy}`,
    `Modo: ${mode === "global" ? "Win Themes globales por apartado (nivel 1)" : "Win Themes completos con desglose por subapartado"}`,
    "",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "",
  ];

  for (const sec of sections) {
    const stored = store.sections[sec.id];
    if (!stored) continue;

    lines.push(sec.label);
    if (stored.validatedAt) {
      lines.push(`  ✓ Validado el ${stored.validatedAt} por ${stored.validatedBy}`);
    }
    lines.push("");
    lines.push(stored.text);
    lines.push("");

    if (mode === "complete" && sec.subs.length > 0) {
      for (const sub of sec.subs) {
        if (sub.depth === 2) {
          lines.push(`  ${sub.label}`);
          lines.push(`  (Win Themes heredados del apartado ${sec.id})`);
          lines.push("");
        }
      }
    }

    lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    lines.push("");
  }

  lines.push("Generado automáticamente por Akena · Accenture");
  return lines.join("\n");
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Unsaved changes modal ────────────────────────────────────────────────────

function AppUnsavedChangesModal({
  onDiscard,
  onKeepEditing,
}: {
  onDiscard: () => void;
  onKeepEditing: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "var(--overlay)" }}
    >
      <div
        className="bg-card border border-border flex flex-col"
        style={{
          width: "420px",
          borderRadius: "var(--radius)",
          boxShadow: "var(--elevation-sm)",
          padding: "28px 32px",
        }}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: "36px", height: "36px",
                borderRadius: "var(--radius)",
                background: "var(--warning-subtle)",
              }}
            >
              <AlertCircle size={17} style={{ color: "var(--warning-foreground)" }} />
            </div>
            <p
              style={{
                fontSize: "var(--text-base)",
                fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                fontFamily: "inherit",
              }}
            >
              Cambios sin validar
            </p>
          </div>
          <button
            onClick={onKeepEditing}
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "2px", color: "var(--muted-foreground)",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <p
          style={{
            fontSize: "var(--text-sm)", fontFamily: "inherit",
            color: "var(--muted-foreground)", lineHeight: "1.6",
            marginBottom: "24px",
          }}
        >
          Tienes cambios sin validar en los Win Themes. Si sales ahora, los cambios
          se descartarán. ¿Deseas continuar?
        </p>

        <div className="flex gap-3">
          <AppButton variant="primary" onClick={onDiscard}>
            Salir sin guardar
          </AppButton>
          <AppButton variant="secondary" onClick={onKeepEditing}>
            Seguir editando
          </AppButton>
        </div>
      </div>
    </div>
  );
}

// ─── Download modal ───────────────────────────────────────────────────────────

function AppDownloadModal({
  store,
  sections,
  oppId,
  onClose,
}: {
  store: WinThemeStore;
  sections: IndexSection[];
  oppId: string;
  onClose: () => void;
}) {
  const [mode, setMode]     = useState<"global" | "complete">("global");
  const [format, setFormat] = useState<"txt" | "docx">("txt");

  const handleDownload = () => {
    const content  = buildDownloadContent(store, sections, mode);
    const modeSlug = mode === "global" ? "global" : "completo";
    if (format === "txt") {
      downloadFile(
        content,
        `Win_Themes_${modeSlug}_${oppId}.txt`,
        "text/plain;charset=utf-8"
      );
    } else {
      downloadFile(
        content,
        `Win_Themes_${modeSlug}_${oppId}.docx`,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
    }
    onClose();
  };

  const radioStyle = (active: boolean): CSSProperties => ({
    display: "flex", alignItems: "flex-start", gap: "10px",
    padding: "12px 14px",
    borderRadius: "var(--radius)",
    border: active ? "1.5px solid var(--primary)" : "1px solid var(--border)",
    background: active ? "var(--primary-subtle)" : "var(--card)",
    cursor: "pointer",
    transition: "all 0.12s",
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "var(--overlay)" }}
    >
      <div
        className="bg-card border border-border"
        style={{
          width: "480px",
          borderRadius: "var(--radius)",
          boxShadow: "var(--elevation-sm)",
          padding: "28px 32px",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: "36px", height: "36px",
                borderRadius: "var(--radius)",
                background: "var(--primary-subtle)",
              }}
            >
              <Download size={16} style={{ color: "var(--primary)" }} />
            </div>
            <p
              style={{
                fontSize: "var(--text-base)",
                fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                fontFamily: "inherit",
              }}
            >
              Descargar Win Themes
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "2px", color: "var(--muted-foreground)",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Mode selector */}
        <p
          style={{
            fontSize: "var(--text-xs)", fontFamily: "inherit",
            color: "var(--muted-foreground)", marginBottom: "10px",
            fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
          }}
        >
          Tipo de descarga
        </p>
        <div className="flex flex-col gap-2 mb-6">
          <div style={radioStyle(mode === "global")} onClick={() => setMode("global")}>
            <div
              style={{
                width: "15px", height: "15px", borderRadius: "50%",
                border: mode === "global" ? "4.5px solid var(--primary)" : "1.5px solid var(--border)",
                background: "var(--card)", flexShrink: 0, marginTop: "2px",
                transition: "all 0.1s",
              }}
            />
            <div>
              <p
                style={{
                  fontSize: "var(--text-sm)", fontFamily: "inherit",
                  fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                  color: "var(--foreground)", marginBottom: "2px",
                }}
              >
                Win Themes globales por apartado
              </p>
              <p style={{ fontSize: "var(--text-2xs)", fontFamily: "inherit", color: "var(--muted-foreground)" }}>
                Un bloque por apartado de nivel 1. Vista resumida.
              </p>
            </div>
          </div>

          <div style={radioStyle(mode === "complete")} onClick={() => setMode("complete")}>
            <div
              style={{
                width: "15px", height: "15px", borderRadius: "50%",
                border: mode === "complete" ? "4.5px solid var(--primary)" : "1.5px solid var(--border)",
                background: "var(--card)", flexShrink: 0, marginTop: "2px",
                transition: "all 0.1s",
              }}
            />
            <div>
              <p
                style={{
                  fontSize: "var(--text-sm)", fontFamily: "inherit",
                  fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                  color: "var(--foreground)", marginBottom: "2px",
                }}
              >
                Win Themes completos con desglose por subapartado
              </p>
              <p style={{ fontSize: "var(--text-2xs)", fontFamily: "inherit", color: "var(--muted-foreground)" }}>
                Incluye la jerarquía completa de subapartados de cada bloque.
              </p>
            </div>
          </div>
        </div>

        {/* Format selector */}
        <p
          style={{
            fontSize: "var(--text-xs)", fontFamily: "inherit",
            color: "var(--muted-foreground)", marginBottom: "10px",
            fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
          }}
        >
          Formato de descarga
        </p>
        <div className="flex gap-2 mb-8">
          {(["txt", "docx"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              style={{
                padding: "7px 18px",
                borderRadius: "var(--radius)",
                border: format === f ? "1.5px solid var(--primary)" : "1px solid var(--border)",
                background: format === f ? "var(--primary-subtle)" : "var(--card)",
                color: format === f ? "var(--primary)" : "var(--foreground)",
                fontSize: "var(--text-xs)",
                fontFamily: "inherit",
                fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                cursor: "pointer",
                transition: "all 0.12s",
              }}
            >
              {f === "txt" ? "TXT" : "Word (.docx)"}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <AppButton variant="primary" icon={<FileDown size={14} />} onClick={handleDownload}>
            Descargar
          </AppButton>
          <AppButton variant="secondary" onClick={onClose}>
            Cancelar
          </AppButton>
        </div>
      </div>
    </div>
  );
}

// ─── Section block ────────────────────────────────────────────────────────────

function AppWinThemeSectionBlock({
  section,
  storedSection,
  draftText,
  onTextChange,
  readOnly = false,
}: {
  section: IndexSection;
  storedSection: WinThemeSection | undefined;
  draftText: string;
  onTextChange: (id: string, value: string) => void;
  readOnly?: boolean;
}) {
  const isDirty      = !readOnly && (storedSection ? storedSection.text !== draftText : false);
  const isValidated  = !!storedSection?.validatedAt;

  return (
    <div
      className="border border-border bg-card"
      style={{
        borderRadius: "var(--radius-banner)",
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div
          style={{
            width: "28px", height: "28px",
            borderRadius: "var(--radius-sm)",
            background: "var(--primary-subtle)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: "var(--text-2xs)",
              fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
              color: "var(--primary)",
              fontFamily: "inherit",
            }}
          >
            {section.id}
          </span>
        </div>
        <p
          style={{
            fontSize: "var(--text-sm)", fontFamily: "inherit",
            fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
            color: "var(--foreground)",
            flex: 1,
          }}
        >
          {section.cleanTitle}
        </p>
        {isValidated && !isDirty && (
          <div className="flex items-center gap-1.5" style={{ flexShrink: 0 }}>
            <CheckCircle2 size={13} style={{ color: "var(--success)" }} />
            <span style={{ fontSize: "var(--text-2xs)", color: "var(--success)", fontFamily: "inherit" }}>
              Validado
            </span>
          </div>
        )}
        {isDirty && (
          <span
            style={{
              fontSize: "var(--text-2xs)", fontFamily: "inherit",
              color: "var(--warning-foreground)",
              background: "var(--warning-subtle)",
              border: "1px solid var(--warning)",
              borderRadius: "var(--radius-chip)",
              padding: "1px 8px",
              flexShrink: 0,
            }}
          >
            Editado — pendiente de validar
          </span>
        )}
      </div>

      {/* Textarea */}
      <textarea
        value={draftText}
        readOnly={readOnly}
        onChange={(e) => !readOnly && onTextChange(section.id, e.target.value)}
        style={{
          width: "100%",
          minHeight: "200px",
          padding: "14px 16px",
          borderRadius: "var(--radius-input)",
          border: isDirty ? "1px solid var(--primary)" : "1px solid var(--border)",
          background: readOnly ? "var(--muted)" : "var(--input-background)",
          color: "var(--foreground)",
          fontSize: "var(--text-xs)",
          fontFamily: "inherit",
          lineHeight: "1.75",
          resize: readOnly ? "none" : "vertical",
          outline: "none",
          cursor: readOnly ? "default" : "text",
          transition: "border-color 0.12s",
        }}
      />

      {/* Validation metadata (read-only, shown when validated and not dirty) */}
      {isValidated && !isDirty && storedSection?.validatedAt && (
        <p style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit", marginTop: "-4px" }}>
          Validado el {storedSection.validatedAt} por {storedSection.validatedBy}
        </p>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface AppWinThemesContentProps {
  oppId: string;
  oppName: string;
  onRegisterGuard?: (guard: ((newId: string) => void) | null) => void;
  navigateTo?: (id: string) => void;
}

export function AppWinThemesContent({
  oppId,
  onRegisterGuard,
  navigateTo,
}: AppWinThemesContentProps) {
  const indiceValidated = isIndiceValidated(oppId);
  const { isReadOnly } = useWorkspaceReadonly();

  // Parse L1 sections from the validated index
  const parsedSections = useMemo<IndexSection[]>(() => {
    if (!indiceValidated) return [];
    const stored = readStoredIndice(oppId);
    if (!stored) return [];
    return parseIndexSections(stored.content);
  }, [oppId, indiceValidated]);

  // Persisted Win Themes store
  const [persisted, setPersisted] = useState<WinThemeStore | null>(() =>
    readWinThemes(oppId)
  );

  // Local draft texts — one per L1 section
  const [draftTexts, setDraftTexts] = useState<Record<string, string>>(() => {
    const stored = readWinThemes(oppId);
    if (!stored) return {};
    return Object.fromEntries(
      Object.entries(stored.sections).map(([id, s]) => [id, s.text])
    );
  });

  // Ficheros del pliego (desde el store en memoria o subidos manualmente aquí)
  const [localFiles, setLocalFiles] = useState<File[]>(() => getFiles(oppId) ?? []);
  const abortRef = useRef<AbortController | null>(null);

  // UI state
  const [generating, setGenerating]             = useState(false);
  const [justGenerated, setJustGenerated]       = useState(false);
  const [justValidatedAll, setJustValidatedAll] = useState(false);
  const [filterValue, setFilterValue]           = useState("");
  const [generateError, setGenerateError]       = useState<string | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavId, setPendingNavId]         = useState<string | null>(null);
  const justGenTimerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const justValidAllTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derived: are there unsaved edits?
  const hasUnsaved = useMemo(() => {
    if (!persisted) return false;
    return Object.entries(draftTexts).some(([id, text]) => {
      const sec = persisted.sections[id];
      return sec && sec.text !== text;
    });
  }, [persisted, draftTexts]);

  // Navigation guard
  useEffect(() => {
    if (hasUnsaved) {
      onRegisterGuard?.((newId: string) => {
        setPendingNavId(newId);
        setShowUnsavedModal(true);
      });
    } else {
      onRegisterGuard?.(null);
    }
    return () => { onRegisterGuard?.(null); };
  }, [hasUnsaved, onRegisterGuard]);

  // Derived: are all sections globally validated (no dirty edits)?
  const allValidated = useMemo(() => {
    if (!persisted) return false;
    const ids = parsedSections.map((s) => s.id);
    if (ids.length === 0) return false;
    return ids.every((id) => {
      const sec = persisted.sections[id];
      return sec?.validatedAt && sec.text === (draftTexts[id] ?? "");
    });
  }, [persisted, parsedSections, draftTexts]);

  // Clear timers and abort on unmount
  useEffect(() => {
    return () => {
      if (justGenTimerRef.current) clearTimeout(justGenTimerRef.current);
      if (justValidAllTimerRef.current) clearTimeout(justValidAllTimerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  // ── File upload handler (fallback cuando los ficheros no están en memoria) ──
  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length > 0) setLocalFiles(selected);
    e.target.value = "";
  }, []);

  // ── Generate (llamada real al agente) ─────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    const storedIndice = readStoredIndice(oppId);
    if (!storedIndice) return;

    if (localFiles.length === 0) {
      setGenerateError("Adjunta los documentos del pliego (PCAP, PPT…) para generar los Win Themes.");
      return;
    }

    setGenerating(true);
    setJustGenerated(false);
    setGenerateError(null);

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const sessionId = `win-themes:${oppId}:${Date.now()}`;
      const res = await generateWinThemes(
        localFiles,
        storedIndice.content,
        sessionId,
        abortRef.current.signal,
      );

      const date = new Date().toLocaleDateString("es-ES", {
        day: "2-digit", month: "2-digit", year: "numeric",
      });
      const user = getAuthUser().name;

      const newSections: Record<string, WinThemeSection> = {};
      for (const sec of parsedSections) {
        const text = res.sections[sec.id] ?? res.sections[sec.label] ?? "";
        const prev = persisted?.sections[sec.id];
        newSections[sec.id] = {
          text,
          validatedAt: undefined,
          validatedBy: undefined,
          ...(prev?.validatedAt ? { validatedAt: prev.validatedAt, validatedBy: prev.validatedBy } : {}),
        };
      }

      const store: WinThemeStore = { generatedAt: date, generatedBy: user, sections: newSections };
      saveWinThemes(oppId, store);
      setPersisted(store);
      setDraftTexts(Object.fromEntries(Object.entries(newSections).map(([id, s]) => [id, s.text])));
      setJustGenerated(true);
      justGenTimerRef.current = setTimeout(() => setJustGenerated(false), 4000);
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === "CanceledError") return;
      const msg = (err as { response?: { data?: { detail?: string } }; message?: string })
        ?.response?.data?.detail ?? (err as { message?: string })?.message ?? "Error al generar Win Themes.";
      setGenerateError(msg);
    } finally {
      setGenerating(false);
    }
  }, [localFiles, oppId, parsedSections, persisted]);

  // ── Edit text — also clears global validation so all must be re-validated ─
  const handleTextChange = useCallback((sectionId: string, value: string) => {
    setDraftTexts((prev) => ({ ...prev, [sectionId]: value }));
    // If any section was validated, clear ALL validations to force re-validation globally
    setPersisted((prev) => {
      if (!prev) return prev;
      const anyValidated = Object.values(prev.sections).some((s) => s.validatedAt);
      if (!anyValidated) return prev;
      const cleared: Record<string, WinThemeSection> = {};
      for (const [k, s] of Object.entries(prev.sections)) {
        cleared[k] = { text: k === sectionId ? value : s.text, validatedAt: undefined, validatedBy: undefined };
      }
      const updated = { ...prev, sections: cleared };
      saveWinThemes(oppId, updated);
      return updated;
    });
  }, [oppId]);

  // ── Validate ALL sections globally ───────────────────────────────────────
  const handleValidateAll = useCallback(() => {
    if (!persisted) return;
    const date = new Date().toLocaleDateString("es-ES", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
    const user = getAuthUser().name;
    const updatedSections: Record<string, WinThemeSection> = {};
    for (const [id, sec] of Object.entries(persisted.sections)) {
      updatedSections[id] = {
        text: draftTexts[id] ?? sec.text,
        validatedAt: date,
        validatedBy: user,
      };
    }
    const updated: WinThemeStore = { ...persisted, sections: updatedSections };
    saveWinThemes(oppId, updated);
    setPersisted(updated);
    setJustValidatedAll(true);
    if (justValidAllTimerRef.current) clearTimeout(justValidAllTimerRef.current);
    justValidAllTimerRef.current = setTimeout(() => setJustValidatedAll(false), 4000);
  }, [persisted, draftTexts, oppId]);

  // ── Unsaved modal: discard ────────────────────────────────────────────────
  const handleDiscardConfirm = useCallback(() => {
    setShowUnsavedModal(false);
    // Restore drafts to persisted values
    if (persisted) {
      setDraftTexts(
        Object.fromEntries(
          Object.entries(persisted.sections).map(([id, s]) => [id, s.text])
        )
      );
    }
    onRegisterGuard?.(null);
    if (pendingNavId) {
      navigateTo?.(pendingNavId);
      setPendingNavId(null);
    }
  }, [persisted, pendingNavId, onRegisterGuard, navigateTo]);

  const handleKeepEditing = useCallback(() => {
    setShowUnsavedModal(false);
    setPendingNavId(null);
  }, []);

  // ── Filter logic ──────────────────────────────────────────────────────────
  // Find which L1 sections to show based on the filter value
  const filteredSections = useMemo<IndexSection[]>(() => {
    if (!filterValue || filterValue === "") return parsedSections;
    // If the filter is a L1 id ("1", "2", …)
    const directL1 = parsedSections.find((s) => s.id === filterValue);
    if (directL1) return [directL1];
    // If the filter is a L2/L3 id ("1.1", "1.1.1")
    const parentL1 = parsedSections.find((s) => s.subs.some((sub) => sub.id === filterValue));
    if (parentL1) return [parentL1];
    return parsedSections;
  }, [filterValue, parsedSections]);

  // ── Build filter options ──────────────────────────────────────────────────
  const filterOptions = useMemo(() => {
    const opts: { value: string; label: string; depth: number }[] = [];
    for (const sec of parsedSections) {
      opts.push({ value: sec.id, label: sec.label, depth: 1 });
      for (const sub of sec.subs) {
        opts.push({ value: sub.id, label: sub.label, depth: sub.depth });
      }
    }
    return opts;
  }, [parsedSections]);

  const isGenerated = !!persisted;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {showUnsavedModal && (
        <AppUnsavedChangesModal
          onDiscard={handleDiscardConfirm}
          onKeepEditing={handleKeepEditing}
        />
      )}
      {showDownloadModal && persisted && (
        <AppDownloadModal
          store={persisted}
          sections={parsedSections}
          oppId={oppId}
          onClose={() => setShowDownloadModal(false)}
        />
      )}

      <div style={{ padding: "32px 40px" }}>

        {/* ── Tool header ── */}
        <div className="flex items-start gap-4 mb-8">
          <div
            className="bg-muted text-primary flex items-center justify-center flex-shrink-0"
            style={{ width: "48px", height: "48px", borderRadius: "var(--radius)" }}
          >
            <Trophy size={24} />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h3 style={{ fontSize: "var(--text-xl)" }}>Win Themes</h3>
              <span
                style={{
                  padding: "2px 10px",
                  borderRadius: "var(--radius-chip)",
                  fontSize: "var(--text-3xs)",
                  fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                  letterSpacing: "0.04em",
                  background: "var(--primary-subtle)",
                  color: "var(--primary)",
                  fontFamily: "inherit",
                }}
              >
                IA
              </span>
            </div>
            <p
              className="text-muted-foreground"
              style={{ fontSize: "var(--text-sm)", maxWidth: "560px", fontFamily: "inherit" }}
            >
              Define los mensajes clave y argumentos diferenciales que maximizan las
              posibilidades de adjudicación. Generados a partir del índice validado,
              activos de ventas, innovación y base histórica de Accenture.
            </p>
          </div>
        </div>

        {/* ── Divider ── */}
        <div style={{ borderTop: "1px solid var(--border)", marginBottom: "28px" }} />

        {/* ── GUARD: index not validated ── */}
        {!indiceValidated ? (
          <div style={{ maxWidth: "640px" }}>
            <div
              className="flex items-start gap-3 mb-6"
              style={{
                padding: "14px 18px",
                borderRadius: "var(--radius-banner)",
                background: "var(--warning-subtle)",
                border: "1px solid var(--warning)",
              }}
            >
              <AlertCircle
                size={15}
                style={{ color: "var(--warning-foreground)", flexShrink: 0, marginTop: "2px" }}
              />
              <span
                style={{
                  fontSize: "var(--text-sm)", fontFamily: "inherit",
                  color: "var(--warning-foreground)", lineHeight: "1.55",
                }}
              >
                No es posible generar Win Themes hasta que el índice esté validado.
                Valida el índice de la oferta en{" "}
                <strong>Generación de la propuesta → Índice de la oferta</strong>{" "}
                para desbloquear esta funcionalidad.
              </span>
            </div>
            <AppButton variant="primary" icon={<Sparkles size={14} />} disabled>
              Generar Win Themes
            </AppButton>
          </div>
        ) : (
          <>
            {/* ── Ficheros del pliego ── */}
            <div
              style={{
                marginBottom: "20px",
                padding: "14px 18px",
                borderRadius: "var(--radius-banner)",
                background: "var(--neutral-subtle)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="flex items-center gap-3 mb-2">
                <FileText size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                <span style={{ fontSize: "var(--text-xs)", fontFamily: "inherit", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], color: "var(--foreground)" }}>
                  Documentos del pliego (PCAP, PPT, Anexos)
                </span>
              </div>
              {localFiles.length > 0 ? (
                <div className="flex flex-col gap-1 mb-2">
                  {localFiles.map((f) => (
                    <span key={f.name} style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
                      • {f.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: "var(--text-xs)", color: "var(--warning-foreground)", fontFamily: "inherit", marginBottom: "8px" }}>
                  Los documentos no están en memoria. Adjúntalos para poder generar.
                </p>
              )}
              {!isReadOnly && (
                <label
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "6px",
                    cursor: "pointer", fontSize: "var(--text-xs)", fontFamily: "inherit",
                    color: "var(--primary)", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                  }}
                >
                  <Upload size={12} />
                  {localFiles.length > 0 ? "Cambiar documentos" : "Adjuntar documentos"}
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    multiple
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                  />
                </label>
              )}
            </div>

            {/* ── Error banner ── */}
            {generateError && (
              <div
                className="flex items-start gap-3 mb-4"
                style={{
                  padding: "12px 16px",
                  borderRadius: "var(--radius-banner)",
                  background: "var(--destructive-subtle)",
                  border: "1px solid var(--destructive)",
                  maxWidth: "680px",
                }}
              >
                <AlertCircle size={14} style={{ color: "var(--destructive)", flexShrink: 0, marginTop: "1px" }} />
                <span style={{ fontSize: "var(--text-sm)", color: "var(--destructive)", fontFamily: "inherit" }}>
                  {generateError}
                </span>
              </div>
            )}

            {/* ── Success flash (generation) ── */}
            {justGenerated && (
              <div
                className="flex items-center gap-3 mb-6"
                style={{
                  padding: "12px 16px",
                  borderRadius: "var(--radius-banner)",
                  background: "var(--success-subtle)",
                  border: "1px solid var(--success)",
                  maxWidth: "680px",
                }}
              >
                <CheckCircle2 size={15} style={{ color: "var(--success)", flexShrink: 0 }} />
                <span style={{ fontSize: "var(--text-sm)", color: "var(--success)", fontFamily: "inherit" }}>
                  Win Themes generados correctamente.
                </span>
              </div>
            )}

            {/* ── Generate / Regenerate row ── */}
            <div className="flex items-center gap-4 mb-6" style={{ flexWrap: "wrap" }}>
              {generating ? (
                <div className="flex items-center gap-3">
                  <Loader2 size={16} className="animate-spin" style={{ color: "var(--primary)" }} />
                  <span style={{ fontSize: "var(--text-sm)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
                    Analizando pliego y generando Win Themes por apartado… (puede tardar 1-2 min)
                  </span>
                </div>
              ) : !isGenerated && isReadOnly ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: "var(--radius-banner)" }}>
                  <Lock size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>No ejecutado antes de marcar como Entregada.</span>
                </div>
              ) : (
                <>
                  {!isReadOnly && (
                    <AppButton
                      variant="primary"
                      icon={isGenerated ? <RefreshCw size={13} /> : <Sparkles size={14} />}
                      onClick={handleGenerate}
                    >
                      {isGenerated ? "Regenerar Win Themes" : "Generar Win Themes"}
                    </AppButton>
                  )}
                  {isGenerated && persisted && (
                    <p style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
                      Generado el {persisted.generatedAt} por {persisted.generatedBy}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* ── Content area (only when generated and not loading) ── */}
            {isGenerated && !generating && (
              <>
                {/* ── Filter + Download bar ── */}
                <div
                  className="flex items-center gap-3 mb-6"
                  style={{ flexWrap: "wrap" }}
                >
                  {/* Subapartado filter */}
                  <div className="flex items-center gap-2" style={{ flex: "1 1 280px", maxWidth: "420px" }}>
                    <ListFilter size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                    <div style={{ position: "relative", flex: 1 }}>
                      <select
                        value={filterValue}
                        onChange={(e) => setFilterValue(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "7px 32px 7px 10px",
                          borderRadius: "var(--radius-input)",
                          border: "1px solid var(--border)",
                          background: "var(--input-background)",
                          color: "var(--foreground)",
                          fontSize: "var(--text-xs)",
                          fontFamily: "inherit",
                          appearance: "none",
                          outline: "none",
                          cursor: "pointer",
                        }}
                      >
                        <option value="">Todos los apartados</option>
                        {filterOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.depth === 1
                              ? opt.label
                              : opt.depth === 2
                              ? `   ${opt.label}`
                              : `      ${opt.label}`}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={13}
                        style={{
                          position: "absolute", right: "10px", top: "50%",
                          transform: "translateY(-50%)",
                          color: "var(--muted-foreground)", pointerEvents: "none",
                        }}
                      />
                    </div>
                  </div>

                  {/* Unsaved warning */}
                  {hasUnsaved && (
                    <div
                      className="flex items-center gap-2"
                      style={{
                        padding: "6px 12px",
                        borderRadius: "var(--radius-banner)",
                        background: "var(--warning-subtle)",
                        border: "1px solid var(--warning)",
                      }}
                    >
                      <AlertCircle size={13} style={{ color: "var(--warning-foreground)", flexShrink: 0 }} />
                      <span
                        style={{
                          fontSize: "var(--text-2xs)", fontFamily: "inherit",
                          color: "var(--warning-foreground)",
                        }}
                      >
                        Tienes cambios sin validar
                      </span>
                    </div>
                  )}

                  {/* Download button — pushed to the right */}
                  <div style={{ marginLeft: "auto" }}>
                    <AppButton
                      variant="secondary"
                      size="sm"
                      icon={<FileDown size={13} />}
                      onClick={() => setShowDownloadModal(true)}
                    >
                      Descargar Win Themes
                    </AppButton>
                  </div>
                </div>

                {/* ── Global Validate bar — hidden in read-only mode ── */}
                {!isReadOnly && <div
                  className="flex items-center gap-4 mb-6"
                  style={{
                    padding: "14px 18px",
                    borderRadius: "var(--radius-banner)",
                    background: allValidated ? "var(--success-subtle)" : "var(--neutral-subtle)",
                    border: allValidated ? "1px solid var(--success)" : "1px solid var(--border)",
                    flexWrap: "wrap",
                  }}
                >
                  <div className="flex items-center gap-3" style={{ flex: 1 }}>
                    <ShieldCheck
                      size={16}
                      style={{ color: allValidated ? "var(--success)" : "var(--muted-foreground)", flexShrink: 0 }}
                    />
                    <div>
                      <p
                        style={{
                          fontSize: "var(--text-sm)", fontFamily: "inherit",
                          fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                          color: allValidated ? "var(--success)" : "var(--foreground)",
                          marginBottom: "1px",
                        }}
                      >
                        {allValidated ? "Todos los Win Themes validados" : "Validación global de Win Themes"}
                      </p>
                      <p style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
                        {allValidated
                          ? "Todos los apartados han sido revisados y confirmados por el equipo."
                          : "Revisa todos los apartados y pulsa el botón para validar el conjunto completo. Cualquier edición posterior requerirá volver a validar."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3" style={{ flexShrink: 0 }}>
                    {justValidatedAll && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={13} style={{ color: "var(--success)" }} />
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--success)", fontFamily: "inherit" }}>
                          Win Themes validados correctamente.
                        </span>
                      </div>
                    )}
                    <AppButton
                      variant={allValidated ? "secondary" : "primary"}
                      icon={allValidated ? <CheckCircle2 size={13} /> : <ShieldCheck size={13} />}
                      onClick={handleValidateAll}
                      disabled={allValidated}
                    >
                      {allValidated ? "Validados" : "Validar Win Themes"}
                    </AppButton>
                  </div>
                </div>}

                {/* Filter label when active */}
                {filterValue && (
                  <div
                    className="flex items-center gap-2 mb-4"
                    style={{
                      padding: "6px 12px",
                      borderRadius: "var(--radius-chip)",
                      background: "var(--primary-subtle)",
                      border: "1px solid var(--primary)",
                      display: "inline-flex",
                      maxWidth: "fit-content",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "var(--text-2xs)", fontFamily: "inherit",
                        color: "var(--primary)",
                      }}
                    >
                      Filtrado por: {filterOptions.find((o) => o.value === filterValue)?.label ?? filterValue}
                    </span>
                    <button
                      onClick={() => setFilterValue("")}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        padding: "0 0 0 4px", color: "var(--primary)", display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}

                {/* ── Subapartado cross-module message ── */}
                {filterValue && filterValue.includes(".") && (() => {
                  const parentL1Id  = filterValue.split(".")[0];
                  const parentSec   = parsedSections.find((s) => s.id === parentL1Id);
                  const subLabel    = filterOptions.find((o) => o.value === filterValue)?.label ?? filterValue;
                  const parentLabel = parentSec?.cleanTitle ?? `Apartado ${parentL1Id}`;
                  return (
                    <div
                      className="flex items-start gap-2 mb-2"
                      style={{
                        padding: "9px 13px",
                        borderRadius: "var(--radius-banner)",
                        background: "var(--accent-subtle)",
                        border: "1px solid var(--accent)",
                      }}
                    >
                      <ListFilter
                        size={12}
                        style={{ color: "var(--accent)", flexShrink: 0, marginTop: "2px" }}
                      />
                      <p
                        style={{
                          fontSize: "var(--text-2xs)", fontFamily: "inherit",
                          color: "var(--accent)", lineHeight: "1.5",
                        }}
                      >
                        Los Win Themes del apartado <strong>"{parentLabel}"</strong> que aplican
                        al subapartado <strong>"{subLabel.replace(/^\d+(\.\d+)*\.\s*/, "")}"</strong> están
                        integrados en la{" "}
                        <strong>Recomendación de rellenado del apartado</strong> dentro del módulo de
                        Ofertas de referencia.
                      </p>
                    </div>
                  );
                })()}

                {/* ── Section blocks ── */}
                <div className="flex flex-col gap-4">
                  {filteredSections.length === 0 ? (
                    <p
                      style={{
                        fontSize: "var(--text-sm)", color: "var(--muted-foreground)",
                        fontFamily: "inherit", padding: "20px 0",
                      }}
                    >
                      No hay apartados disponibles para mostrar.
                    </p>
                  ) : (
                    filteredSections.map((sec) => (
                      <AppWinThemeSectionBlock
                        key={sec.id}
                        section={sec}
                        storedSection={persisted?.sections[sec.id]}
                        draftText={draftTexts[sec.id] ?? ""}
                        onTextChange={handleTextChange}
                        readOnly={isReadOnly}
                      />
                    ))
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}