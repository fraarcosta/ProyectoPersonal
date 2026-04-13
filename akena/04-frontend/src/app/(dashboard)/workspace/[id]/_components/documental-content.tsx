// Next.js equivalent: app/(dashboard)/workspace/[id]/_components/documental-content.tsx
// Generación documental — RFT10 a RFT14.
// Una pantalla con 5 tarjetas: PPT NBM, Word Plantilla, Excel Seguimiento,
// PPT Editables, Carpeta Oferta.
"use client";
import { useState, useRef, useEffect, useCallback, type CSSProperties, type ReactNode } from "react";
import JSZip from "jszip";
import {
  Presentation, FileText, Table, FolderOpen, Sparkles,
  Loader2, CheckCircle2, RefreshCw, AlertCircle, FileDown,
  AlertTriangle, X, Info, Trophy, Lock, PlayCircle,
} from "lucide-react";
import { AppButton } from "../../../../_components/ui";
import { getAuthUser } from "../../../../_components/auth-store";
import { isIndiceValidated, readStoredIndice } from "./indice-content";
import { useWorkspaceReadonly } from "./workspace-readonly-context";

// ─── Types ─────────────────────────────────────────────────────────────────────

type CardPhase = "idle" | "loading" | "done";

interface CardState {
  phase: CardPhase;
  generatedAt?: string;
  generatedBy?: string;
  /** Optional informational message shown in done state */
  notice?: string;
}

type DocStates = Record<string, CardState>;

// ─── Storage helpers ────────────────────────────────────────────────────────────

interface PersistedCard {
  generatedAt: string;
  generatedBy: string;
  notice?: string;
}

const TOOL_IDS = ["doc-ppt-nbm", "doc-word", "doc-excel", "doc-ppt-edit", "doc-carpeta"] as const;
type ToolId = (typeof TOOL_IDS)[number];

const storageKey = (toolId: string, oppId: string) => `${toolId}-${oppId}`;

function readAllStates(oppId: string): DocStates {
  const result: DocStates = {};
  for (const id of TOOL_IDS) {
    try {
      const raw = localStorage.getItem(storageKey(id, oppId));
      if (raw) {
        const p = JSON.parse(raw) as PersistedCard;
        if (p.generatedAt && p.generatedBy) {
          result[id] = { phase: "done", generatedAt: p.generatedAt, generatedBy: p.generatedBy, notice: p.notice };
          continue;
        }
      }
    } catch {}
    result[id] = { phase: "idle" };
  }
  return result;
}

function persistCardState(toolId: string, oppId: string, data: PersistedCard) {
  try {
    localStorage.setItem(storageKey(toolId, oppId), JSON.stringify(data));
  } catch {}
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hasValidatedWinThemes(oppId: string): boolean {
  try {
    const raw = localStorage.getItem(`win-themes-${oppId}`);
    if (!raw) return false;
    const store = JSON.parse(raw) as { sections?: Record<string, { validatedAt?: string }> };
    return Object.values(store.sections ?? {}).some((s) => !!s.validatedAt);
  } catch {}
  return false;
}

function today(): string {
  return new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ─── Carpeta ZIP builder ──────────────────────────────────────────────────────

async function buildCarpetaZip(oppId: string, oppName: string, states: DocStates): Promise<Blob> {
  const zip = new JSZip();

  const wordDone    = states["doc-word"]?.phase     === "done";
  const excelDone   = states["doc-excel"]?.phase    === "done";
  const pptEditDone = states["doc-ppt-edit"]?.phase === "done";
  const pptNbmDone  = states["doc-ppt-nbm"]?.phase  === "done";

  const placeholder = (name: string) =>
    `[Documento simulado — ${name}]\nOportunidad: ${oppName}\nID: ${oppId}`;

  // ── 01. Pliegos — documentación subida en creación de la oportunidad ──
  const pliegos = zip.folder("01. Pliegos")!;
  pliegos.file("Pliego_Clausulas_Administrativas_Particulares.pdf",
    placeholder("Pliego de Cláusulas Administrativas Particulares (PCAP)"));
  pliegos.file("Pliego_Prescripciones_Tecnicas.pdf",
    placeholder("Pliego de Prescripciones Técnicas (PPT)"));
  pliegos.file("Documentacion_Complementaria.pdf",
    placeholder("Documentación complementaria de la licitación"));

  // ── 02. Oferta — solo documentos previamente generados ──
  const oferta = zip.folder("02. Oferta")!;
  if (wordDone)     oferta.file("Plantilla_Oferta.docx",      placeholder("Word Plantilla Oferta"));
  if (excelDone)    oferta.file("Seguimiento_Oferta.xlsx",    placeholder("Excel Seguimiento Oferta"));
  if (pptEditDone)  oferta.file("PPT_Editables.pptx",         placeholder("PPT Editables"));

  // ── 03. Material complementario — vacía ──
  zip.folder("03. Material complementario");

  // ── 04. Ofertas de referencia — vacía ──
  zip.folder("04. Ofertas de referencia");

  // ── 05. Sobres — tres subcarpetas sin numeración ──
  const sobres = zip.folder("05. Sobres")!;
  sobres.folder("Sobre 1");
  sobres.folder("Sobre 2");
  sobres.folder("Sobre 3");

  // ── 06. Solución — vacía ──
  zip.folder("06. Solución");

  // ── 07. NBM — PPT NBM si existe ──
  const nbm = zip.folder("07. NBM")!;
  if (pptNbmDone) nbm.file("PPT_NBM.pptx", placeholder("PPT New Business Meeting"));

  return await zip.generateAsync({ type: "blob" });
}

// ─── Download helpers ─────────────────────────────────────────────────────────

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function makeTextBlob(content: string, mime: string): Blob {
  return new Blob([content], { type: mime });
}

// ─── Confirm-regenerate modal ─────────────────────────────────────────────────

interface ConfirmModalProps {
  title: string;
  body?: string;
  onConfirm: () => void;
  onCancel:  () => void;
}

function ConfirmModal({ title, body, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: "var(--overlay)" }}
      onClick={onCancel}
    >
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "28px 28px 24px",
          maxWidth: "400px",
          width: "100%",
          margin: "0 24px",
          boxShadow: "var(--elevation-sm)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-start gap-3">
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: "34px", height: "34px",
                borderRadius: "var(--radius)",
                background: "var(--warning-subtle)",
                color: "var(--warning-foreground)",
              }}
            >
              <AlertTriangle size={16} />
            </div>
            <div>
              <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], color: "var(--foreground)", fontFamily: "inherit", marginBottom: "4px" }}>
                {title}
              </p>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit", lineHeight: "1.5" }}>
                {body ?? "La regeneración sobrescribirá la versión actual. Esta acción no se puede deshacer."}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: "2px", flexShrink: 0, borderRadius: "var(--radius-button)", fontFamily: "inherit" }}
          >
            <X size={14} />
          </button>
        </div>
        <div className="flex items-center justify-end gap-3">
          <AppButton variant="secondary" size="sm" onClick={onCancel}>Cancelar</AppButton>
          <AppButton variant="primary"   size="sm" icon={<RefreshCw size={12} />} onClick={onConfirm}>Regenerar todo</AppButton>
        </div>
      </div>
    </div>
  );
}

// ─── DocCard ──────────────────────────────────────────────────────────────────

interface BadgeStyle { label: string; bg: string; color: string }

interface DocCardProps {
  id:           string;
  rft:          string;
  title:        string;
  description:  string;
  badge:        BadgeStyle;
  icon:         ReactNode;
  isActive:     boolean;
  refCallback:  (el: HTMLDivElement | null) => void;
  state:        CardState;
  generateLabel: string;
  loadingMessage: string;
  downloadLabel: string;
  preconditionMet:      boolean;
  preconditionMessage?: string;
  onGenerate:  () => void;
  onDownload:  () => void;
  readOnly?:   boolean;
}

function DocCard({
  rft, title, description, badge, icon, isActive, refCallback,
  state, generateLabel, loadingMessage, downloadLabel,
  preconditionMet, preconditionMessage, onGenerate, onDownload,
  readOnly = false,
}: DocCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleRegenerateClick = () => setShowConfirm(true);
  const handleConfirm = () => { setShowConfirm(false); onGenerate(); };

  const isDone    = state.phase === "done";
  const isLoading = state.phase === "loading";
  const isIdle    = state.phase === "idle";

  return (
    <>
      {showConfirm && (
        <ConfirmModal
          title={title}
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      <div
        ref={refCallback}
        className="bg-card"
        style={{
          border: isActive ? "2px solid var(--primary)" : "1px solid var(--border)",
          borderRadius: "var(--radius)",
          overflow: "hidden",
          transition: "border-color 0.15s ease",
        }}
      >
        {/* ── Card header ── */}
        <div
          style={{ padding: "24px 28px 20px" }}
        >
          <div className="flex items-start gap-4">
            <div
              className="bg-muted text-primary flex items-center justify-center flex-shrink-0"
              style={{ width: "44px", height: "44px", borderRadius: "var(--radius)" }}
            >
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span
                  style={{
                    fontSize: "var(--text-2xs)",
                    fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                    color: "var(--muted-foreground)",
                    background: "var(--neutral-subtle)",
                    padding: "1px 7px",
                    borderRadius: "var(--radius-chip)",
                    fontFamily: "inherit",
                    letterSpacing: "0.03em",
                  }}
                >
                  {rft}
                </span>
                <span
                  style={{
                    fontSize: "var(--text-2xs)",
                    fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                    color: badge.color,
                    background: badge.bg,
                    padding: "1px 8px",
                    borderRadius: "var(--radius-chip)",
                    fontFamily: "inherit",
                    letterSpacing: "0.03em",
                  }}
                >
                  {badge.label}
                </span>
              </div>
              <p
                style={{
                  fontSize: "var(--text-lg)",
                  fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                  color: "var(--foreground)",
                  fontFamily: "inherit",
                  marginBottom: "5px",
                }}
              >
                {title}
              </p>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit", lineHeight: "1.55" }}>
                {description}
              </p>
            </div>
          </div>
        </div>

        {/* ── Divider ── */}
        <div style={{ borderTop: "1px solid var(--border)", margin: "0 28px" }} />

        {/* ── Body ── */}
        <div style={{ padding: "20px 28px 24px" }}>

          {/* Precondition warning — shown when not met */}
          {!preconditionMet && preconditionMessage && (
            <div
              className="flex items-start gap-3 mb-5"
              style={{
                padding: "11px 14px",
                borderRadius: "var(--radius-banner)",
                background: "var(--warning-subtle)",
                border: "1px solid var(--warning)",
              }}
            >
              <AlertCircle size={13} style={{ color: "var(--warning-foreground)", flexShrink: 0, marginTop: "2px" }} />
              <p style={{ fontSize: "var(--text-xs)", color: "var(--warning-foreground)", fontFamily: "inherit", lineHeight: "1.5" }}>
                {preconditionMessage}
              </p>
            </div>
          )}

          {/* LOADING */}
          {isLoading && (
            <div className="flex items-center gap-3">
              <Loader2 size={16} className="animate-spin" style={{ color: "var(--primary)", flexShrink: 0 }} />
              <p style={{ fontSize: "var(--text-sm)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
                {loadingMessage}
              </p>
            </div>
          )}

          {/* IDLE */}
          {isIdle && (
            readOnly ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: "var(--radius-banner)" }}>
                <Lock size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>No ejecutado antes de marcar como Entregada.</span>
              </div>
            ) : (
              <AppButton
                variant="primary"
                icon={<Sparkles size={13} />}
                disabled={!preconditionMet}
                onClick={onGenerate}
              >
                {generateLabel}
              </AppButton>
            )
          )}

          {/* DONE */}
          {isDone && state.generatedAt && state.generatedBy && (
            <div className="flex flex-col gap-4">

              {/* Notice (e.g. generated without win themes) */}
              {state.notice && (
                <div
                  className="flex items-start gap-3"
                  style={{
                    padding: "10px 13px",
                    borderRadius: "var(--radius-banner)",
                    background: "var(--accent-subtle)",
                    border: "1px solid var(--accent)",
                  }}
                >
                  <Info size={13} style={{ color: "var(--accent)", flexShrink: 0, marginTop: "2px" }} />
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--accent)", fontFamily: "inherit", lineHeight: "1.5" }}>
                    {state.notice}
                  </p>
                </div>
              )}

              {/* Success row + download */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <CheckCircle2 size={14} style={{ color: "var(--success)", flexShrink: 0 }} />
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--success)", fontFamily: "inherit", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"] }}>
                    Generado correctamente
                  </span>
                </div>
                <AppButton
                  variant="primary"
                  size="sm"
                  icon={<FileDown size={13} />}
                  onClick={onDownload}
                >
                  {downloadLabel}
                </AppButton>
              </div>

              {/* Metadata + regenerate — regenerate hidden in read-only */}
              <div className="flex items-center gap-4 flex-wrap">
                <p style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
                  Generado el {state.generatedAt} por {state.generatedBy}
                </p>
                {!readOnly && (
                  <AppButton
                    variant="secondary"
                    size="sm"
                    icon={<RefreshCw size={11} />}
                    disabled={!preconditionMet}
                    onClick={handleRegenerateClick}
                  >
                    Regenerar
                  </AppButton>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── AppDocumentalContent ─────────────────────────────────────────────────────

interface AppDocumentalContentProps {
  oppId:        string;
  oppName:      string;
  activeToolId: string;
  /** Called when the user initiates a generate/regenerate action on a card,
   *  so the parent can update selectedItem → sidebar highlight stays in sync. */
  onActivate:   (toolId: string) => void;
}

export function AppDocumentalContent({ oppId, oppName, activeToolId, onActivate }: AppDocumentalContentProps) {
  const [states, setStates] = useState<DocStates>(() => readAllStates(oppId));
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { isReadOnly } = useWorkspaceReadonly();
  const [showConfirmAll, setShowConfirmAll] = useState(false);

  // ── Scroll to active card on selection change ──
  useEffect(() => {
    const el = cardRefs.current[activeToolId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [activeToolId]);

  // ── Preconditions ──
  const indiceOk = isIndiceValidated(oppId);

  // ── Generic state updater ──
  const setCardState = useCallback((toolId: string, next: CardState) => {
    setStates((prev) => ({ ...prev, [toolId]: next }));
  }, []);

  /**
   * Wraps a generate function so that clicking generate/regenerate on any card
   * also notifies the parent to update selectedItem → syncs sidebar + active border.
   */
  const wrapGenerate = useCallback(
    (toolId: ToolId, genFn: () => void) => () => {
      onActivate(toolId);
      genFn();
    },
    [onActivate]
  );

  /**
   * Wraps a download function with the same activation behaviour as wrapGenerate,
   * so the sidebar and active border sync when the user clicks any download button.
   */
  const wrapDownload = useCallback(
    (toolId: ToolId, dlFn: () => void) => () => {
      onActivate(toolId);
      dlFn();
    },
    [onActivate]
  );

  // ─── RFT10 — PPT NBM ─────────────────────────────────────────────────────

  const generatePptNbm = useCallback(() => {
    setCardState("doc-ppt-nbm", { phase: "loading" });
    setTimeout(() => {
      const date         = today();
      const userName     = getAuthUser().name;
      const winThemesOk  = hasValidatedWinThemes(oppId);
      const notice       = winThemesOk
        ? undefined
        : "El PPT se ha generado sin incluir Win Themes porque aún no han sido validados.";
      const data: PersistedCard = { generatedAt: date, generatedBy: userName, notice };
      persistCardState("doc-ppt-nbm", oppId, data);
      setCardState("doc-ppt-nbm", { phase: "done", generatedAt: date, generatedBy: userName, notice });
    }, 2400);
  }, [oppId, setCardState]);

  const downloadPptNbm = useCallback(() => {
    const safeName = oppName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
    const content  = `PPT New Business Meeting\nOportunidad: ${oppName}\nID: ${oppId}\nGenerado por: ${getAuthUser().name}`;
    downloadBlob(
      makeTextBlob(content, "application/vnd.openxmlformats-officedocument.presentationml.presentation"),
      `PPT_NBM_${safeName}.pptx`
    );
  }, [oppId, oppName]);

  // ─── RFT11 — Word Plantilla ───────────────────────────────────────────────

  const generateWord = useCallback(() => {
    setCardState("doc-word", { phase: "loading" });
    setTimeout(() => {
      const date     = today();
      const userName = getAuthUser().name;
      const data: PersistedCard = { generatedAt: date, generatedBy: userName };
      persistCardState("doc-word", oppId, data);
      setCardState("doc-word", { phase: "done", generatedAt: date, generatedBy: userName });
    }, 2000);
  }, [oppId, setCardState]);

  const downloadWord = useCallback(() => {
    const safeName = oppName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
    const indice   = readStoredIndice(oppId);
    const content  = `Word Plantilla Oferta\nOportunidad: ${oppName}\nID: ${oppId}\n\n--- ÍNDICE ---\n${indice?.content ?? "(índice no disponible)"}`;
    downloadBlob(
      makeTextBlob(content, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
      `Plantilla_Oferta_${safeName}.docx`
    );
  }, [oppId, oppName]);

  // ─── RFT12 — Excel Seguimiento ────────────────────────────────────────────

  const generateExcel = useCallback(() => {
    setCardState("doc-excel", { phase: "loading" });
    setTimeout(() => {
      const date     = today();
      const userName = getAuthUser().name;
      const data: PersistedCard = { generatedAt: date, generatedBy: userName };
      persistCardState("doc-excel", oppId, data);
      setCardState("doc-excel", { phase: "done", generatedAt: date, generatedBy: userName });
    }, 1800);
  }, [oppId, setCardState]);

  const downloadExcel = useCallback(() => {
    const safeName = oppName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
    const indice   = readStoredIndice(oppId);
    let rows = "Núm.\tApartado\tResponsable\tPuntuación\tPáginas\tObservaciones\n";
    if (indice?.content) {
      const lines = indice.content.split("\n").filter((l) => /^\d+\./.test(l.trim()));
      lines.forEach((line, i) => {
        rows += `${i + 1}\t${line.trim()}\t-\t-\t-\t\n`;
      });
    }
    const content = `Excel Seguimiento Oferta — ${oppName}\nID: ${oppId}\n\n${rows}`;
    downloadBlob(
      makeTextBlob(content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
      `Seguimiento_Oferta_${safeName}.xlsx`
    );
  }, [oppId, oppName]);

  // ─── RFT13 — PPT Editables ────────────────────────────────────────────────

  const generatePptEdit = useCallback(() => {
    setCardState("doc-ppt-edit", { phase: "loading" });
    setTimeout(() => {
      const date     = today();
      const userName = getAuthUser().name;
      const data: PersistedCard = { generatedAt: date, generatedBy: userName };
      persistCardState("doc-ppt-edit", oppId, data);
      setCardState("doc-ppt-edit", { phase: "done", generatedAt: date, generatedBy: userName });
    }, 2000);
  }, [oppId, setCardState]);

  const downloadPptEdit = useCallback(() => {
    const safeName = oppName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
    const content  = `PPT Editables\nOportunidad: ${oppName}\nID: ${oppId}\nGenerado por: ${getAuthUser().name}`;
    downloadBlob(
      makeTextBlob(content, "application/vnd.openxmlformats-officedocument.presentationml.presentation"),
      `PPT_Editables_${safeName}.pptx`
    );
  }, [oppId, oppName]);

  // ─── RFT14 — Carpeta Oferta ───────────────────────────────────────────────

  const generateCarpeta = useCallback(() => {
    setCardState("doc-carpeta", { phase: "loading" });
    setTimeout(() => {
      const date     = today();
      const userName = getAuthUser().name;
      const data: PersistedCard = { generatedAt: date, generatedBy: userName };
      persistCardState("doc-carpeta", oppId, data);
      setCardState("doc-carpeta", { phase: "done", generatedAt: date, generatedBy: userName });
    }, 1600);
  }, [oppId, setCardState]);

  const downloadCarpeta = useCallback(async () => {
    const safeName = oppName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
    try {
      const blob = await buildCarpetaZip(oppId, oppName, states);
      downloadBlob(blob, `Carpeta_Oferta_${safeName}.zip`);
    } catch {
      const content = `Carpeta Oferta — ${oppName}\nID: ${oppId}`;
      downloadBlob(makeTextBlob(content, "application/zip"), `Carpeta_Oferta_${safeName}.zip`);
    }
  }, [oppId, oppName, states]);

  // ─── Card configs ─────────────────────────────────────────────────────────

  interface CardDef {
    id:                  ToolId;
    rft:                 string;
    title:               string;
    description:         string;
    badge:               BadgeStyle;
    icon:                ReactNode;
    generateLabel:       string;
    loadingMessage:      string;
    downloadLabel:       string;
    preconditionMet:     boolean;
    preconditionMessage?: string;
    onGenerate:          () => void;
    onDownload:          () => void;
  }

  const CARDS: CardDef[] = [
    {
      id:             "doc-ppt-nbm",
      rft:            "RFT10",
      title:          "PPT New Business Meeting",
      description:    "Genera la presentación del New Business Meeting (NBM) con la plantilla corporativa de Accenture. Si los Win Themes están validados, se incorpora automáticamente la sección estratégica.",
      badge:          { label: "Documental", bg: "var(--neutral-subtle)", color: "var(--muted-foreground)" },
      icon:           <Presentation size={22} />,
      generateLabel:  "Generar PPT New Business Meeting",
      loadingMessage: "Generando presentación del NBM…",
      downloadLabel:  "Descargar PPT NBM (.pptx)",
      preconditionMet: true,
      onGenerate:     wrapGenerate("doc-ppt-nbm", generatePptNbm),
      onDownload:     wrapDownload("doc-ppt-nbm", downloadPptNbm),
    },
    {
      id:             "doc-word",
      rft:            "RFT11",
      title:          "Word Plantilla Oferta",
      description:    "Genera el documento Word con portada, índice validado, numeración automática y estilos predefinidos. No incluye contenido automático — sirve como base estructural de la oferta.",
      badge:          { label: "Documental", bg: "var(--neutral-subtle)", color: "var(--muted-foreground)" },
      icon:           <FileText size={22} />,
      generateLabel:  "Generar Word Plantilla Oferta",
      loadingMessage: "Generando plantilla Word…",
      downloadLabel:  "Descargar Plantilla (.docx)",
      preconditionMet:     indiceOk,
      preconditionMessage: "No es posible generar la plantilla de oferta hasta que el índice esté validado.",
      onGenerate:     wrapGenerate("doc-word", generateWord),
      onDownload:     wrapDownload("doc-word", downloadWord),
    },
    {
      id:             "doc-excel",
      rft:            "RFT12",
      title:          "Excel Seguimiento Oferta",
      description:    "Genera el Excel de seguimiento con las columnas: numeración, título de apartado, responsable, puntuación, páginas y observaciones. Distribuye páginas según el pliego.",
      badge:          { label: "Documental", bg: "var(--neutral-subtle)", color: "var(--muted-foreground)" },
      icon:           <Table size={22} />,
      generateLabel:  "Generar Excel Seguimiento",
      loadingMessage: "Generando Excel de seguimiento…",
      downloadLabel:  "Descargar Excel Seguimiento (.xlsx)",
      preconditionMet:     indiceOk,
      preconditionMessage: "No es posible generar el Excel de seguimiento hasta que el índice esté validado.",
      onGenerate:     wrapGenerate("doc-excel", generateExcel),
      onDownload:     wrapDownload("doc-excel", downloadExcel),
    },
    {
      id:             "doc-ppt-edit",
      rft:            "RFT13",
      title:          "PPT Editables",
      description:    "Genera la plantilla PowerPoint editable con estilos corporativos. La primera diapositiva incluye el nombre de la oportunidad y el código de expediente.",
      badge:          { label: "Documental", bg: "var(--neutral-subtle)", color: "var(--muted-foreground)" },
      icon:           <Presentation size={22} />,
      generateLabel:  "Generar PPT Editables",
      loadingMessage: "Generando PPT editables…",
      downloadLabel:  "Descargar PPT Editables (.pptx)",
      preconditionMet: true,
      onGenerate:     wrapGenerate("doc-ppt-edit", generatePptEdit),
      onDownload:     wrapDownload("doc-ppt-edit", downloadPptEdit),
    },
    {
      id:             "doc-carpeta",
      rft:            "RFT14",
      title:          "Carpeta Oferta",
      description:    "Genera el archivo .zip con la estructura exacta: 01. Pliegos (con documentación subida), 02. Oferta (documentos generados), 03–04. vacías, 05. Sobres (Sobre 1/2/3), 06. Solución, 07. NBM.",
      badge:          { label: "Documental", bg: "var(--neutral-subtle)", color: "var(--muted-foreground)" },
      icon:           <FolderOpen size={22} />,
      generateLabel:  "Generar Carpeta Oferta (.zip)",
      loadingMessage: "Empaquetando documentos y generando carpeta…",
      downloadLabel:  "Descargar Carpeta Oferta (.zip)",
      preconditionMet: true,
      onGenerate:     wrapGenerate("doc-carpeta", generateCarpeta),
      onDownload:     wrapDownload("doc-carpeta", downloadCarpeta),
    },
  ];

  // ─── Win themes status banner for RFT10 context ───────────────────────────

  const winThemesOk = hasValidatedWinThemes(oppId);

  // ─── Generate all / Regenerate all ───────────────────────────────────────

  const allDone    = TOOL_IDS.every((id) => states[id]?.phase === "done");
  const anyLoading = TOOL_IDS.some((id)  => states[id]?.phase === "loading");

  /**
   * Kicks off all generators in sequence with staggered delays so each card
   * enters "loading" one after another (better UX than all at once).
   * Cards whose preconditions are not met are skipped silently.
   */
  const runGenerateAll = useCallback(() => {
    const fns: Array<[ToolId, () => void, boolean]> = [
      ["doc-ppt-nbm",  generatePptNbm,  true],
      ["doc-word",     generateWord,     indiceOk],
      ["doc-excel",    generateExcel,    indiceOk],
      ["doc-ppt-edit", generatePptEdit,  true],
      ["doc-carpeta",  generateCarpeta,  true],
    ];
    fns.forEach(([toolId, fn, precondition], idx) => {
      if (!precondition) return;
      setTimeout(() => {
        onActivate(toolId);
        fn();
      }, idx * 300); // 300 ms stagger per card
    });
  }, [generatePptNbm, generateWord, generateExcel, generatePptEdit, generateCarpeta, indiceOk, onActivate]);

  const handleGenerateAllClick = useCallback(() => {
    if (allDone) {
      setShowConfirmAll(true);
    } else {
      runGenerateAll();
    }
  }, [allDone, runGenerateAll]);

  const handleConfirmAll = useCallback(() => {
    setShowConfirmAll(false);
    runGenerateAll();
  }, [runGenerateAll]);

  return (
    <div style={{ padding: "32px 40px" }}>

      {/* Confirm-regenerate-all modal */}
      {showConfirmAll && (
        <ConfirmModal
          title="Regenerar todos los documentos"
          body="Esto sobrescribirá los 5 documentos generados. Esta acción no se puede deshacer."
          onConfirm={handleConfirmAll}
          onCancel={() => setShowConfirmAll(false)}
        />
      )}

      {/* ── Section header ── */}
      <div className="mb-8">
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-3">
            <h3 style={{ fontSize: "var(--text-xl)" }}>Generación documental</h3>
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
              5 herramientas
            </span>
          </div>

          {/* ── Generar todo / Regenerar todo ── */}
          {!isReadOnly && (
            <AppButton
              variant={allDone ? "secondary" : "primary"}
              icon={allDone ? <RefreshCw size={13} /> : <PlayCircle size={13} />}
              disabled={anyLoading}
              onClick={handleGenerateAllClick}
            >
              {allDone ? "Regenerar todo" : "Generar todo"}
            </AppButton>
          )}
        </div>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--muted-foreground)", fontFamily: "inherit", maxWidth: "640px" }}>
          Genera todos los documentos del proceso de oferta: presentación NBM, plantilla Word, Excel de seguimiento,
          PPT editables y la carpeta de entrega.
        </p>
      </div>

      {/* ── Context info strip ── */}
      <div
        className="flex items-start gap-6 flex-wrap mb-8"
        style={{
          padding: "12px 16px",
          borderRadius: "var(--radius-banner)",
          background: "var(--muted)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            style={{
              width: "8px", height: "8px", borderRadius: "50%",
              background: indiceOk ? "var(--success)" : "var(--warning)",
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
            Índice: {indiceOk ? "validado" : "pendiente de validación"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Trophy size={12} style={{ color: winThemesOk ? "var(--success)" : "var(--warning-foreground)", flexShrink: 0 }} />
          <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
            Win Themes: {winThemesOk ? "validados — se incluirán en el PPT NBM" : "no validados — el PPT NBM se generará sin ellos"}
          </span>
        </div>
      </div>

      {/* ── 5 Cards ── */}
      <div className="flex flex-col" style={{ gap: "16px" }}>
        {CARDS.map((card) => (
          <DocCard
            key={card.id}
            id={card.id}
            rft={card.rft}
            title={card.title}
            description={card.description}
            badge={card.badge}
            icon={card.icon}
            isActive={activeToolId === card.id}
            refCallback={(el) => { cardRefs.current[card.id] = el; }}
            state={states[card.id] ?? { phase: "idle" }}
            generateLabel={card.generateLabel}
            loadingMessage={card.loadingMessage}
            downloadLabel={card.downloadLabel}
            preconditionMet={card.preconditionMet}
            preconditionMessage={card.preconditionMessage}
            onGenerate={card.onGenerate}
            onDownload={card.onDownload}
            readOnly={isReadOnly}
          />
        ))}
      </div>

    </div>
  );
}