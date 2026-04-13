"use client";

import { useState, useEffect, useRef, useCallback, type ChangeEvent, type CSSProperties } from "react";
import {
  List, Sparkles, Loader2, CheckCircle2, RefreshCw,
  Lock, AlertCircle, Edit3, ShieldCheck, Info, X, FileText,
} from "lucide-react";
import { AppButton } from "../../../../_components/ui";
import { getAuthUser } from "../../../../_components/auth-store";
import { useWorkspaceReadonly, READONLY_TOOLTIP } from "./workspace-readonly-context";
import { generateIndex } from "../../../../../services/ofertaService";
import { getFiles, storeFiles } from "../../../../../services/pliegoFileStore";

// ─── Types ─────────────────────────────────────────────────────────────────────

type IndicePhase = "idle" | "loading" | "editing" | "validated";

interface StoredIndice {
  content: string;
  validatedAt: string;
  validatedBy: string;
}

// ─── Persistence (collective per opp — no user segmentation) ──────────────────

const STORAGE_KEY = (oppId: string) => `indice-oferta-${oppId}`;

export function readStoredIndice(oppId: string): StoredIndice | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(oppId));
    if (!raw) return null;
    const p = JSON.parse(raw) as StoredIndice;
    if (p.content && p.validatedAt && p.validatedBy) return p;
  } catch {}
  return null;
}

function persistIndice(oppId: string, data: StoredIndice): void {
  try {
    localStorage.setItem(STORAGE_KEY(oppId), JSON.stringify(data));
  } catch {}
}

/** Comprueba si el índice está validado — exportado para el bloqueo de módulos. */
export function isIndiceValidated(oppId: string): boolean {
  return readStoredIndice(oppId) !== null;
}

// ─── Mock index builder ────────────────────────────────────────────────────────

function buildMockIndice(oppName: string, oppId: string): string {
  return `ÍNDICE DE LA OFERTA TÉCNICA — ${oppName}
Referencia: ${oppId}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. PRESENTACIÓN DE LA EMPRESA LICITADORA
   1.1. Acreditaciones, certificaciones y clasificación empresarial
   1.2. Estructura organizativa y capacidad técnica
   1.3. Experiencia acreditada en proyectos similares del sector público

2. ENTENDIMIENTO DEL OBJETO DEL CONTRATO
   2.1. Análisis de los pliegos y requerimientos técnicos
   2.2. Diagnóstico de la situación actual del cliente
   2.3. Retos, oportunidades y factores críticos de éxito

3. PROPUESTA DE SOLUCIÓN TÉCNICA [25 pts — mayor ponderación]
   3.1. Arquitectura de la solución propuesta
      3.1.1. Componentes tecnológicos principales
      3.1.2. Integraciones con sistemas existentes del organismo
      3.1.3. Modelo de datos, seguridad y cumplimiento normativo
   3.2. Funcionalidades principales y cobertura de requisitos
   3.3. Innovaciones tecnológicas y elementos diferenciales

4. METODOLOGÍA Y PLAN DE TRABAJO [20 pts]
   4.1. Metodología de gestión del proyecto
      4.1.1. Marcos de referencia aplicados (Agile/PMBOK)
      4.1.2. Herramientas de seguimiento, control y reporting
   4.2. Planificación detallada y cronograma de hitos
   4.3. Gestión del cambio organizativo y formación

5. EQUIPO Y MEDIOS TÉCNICOS ADSCRITOS [10 pts]
   5.1. Organigrama y estructura del equipo de proyecto
   5.2. Perfil profesional y experiencia de los recursos clave
   5.3. Medios materiales, herramientas e infraestructura

6. PLAN DE GESTIÓN DE RIESGOS [8 pts]
   6.1. Identificación y clasificación de riesgos
   6.2. Plan de mitigación, contingencia y continuidad

7. PROPUESTA DE MEJORAS SOBRE EL PPT [7 pts]
   7.1. Mejoras de carácter técnico y funcional
   7.2. Mejoras de valor añadido y sostenibilidad

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Índice generado por Akena · Accenture
Basado en criterios de adjudicación del pliego y mejores prácticas corporativas.
`;
}

// ─── Unsaved-changes modal ──────────────────────────────────────────────────────

interface DiscardModalProps {
  onDiscard: () => void;
  onKeepEditing: () => void;
}

function DiscardModal({ onDiscard, onKeepEditing }: DiscardModalProps) {
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
          gap: "0",
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: "36px",
                height: "36px",
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
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "2px",
              color: "var(--muted-foreground)",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <p
          className="text-muted-foreground"
          style={{
            fontSize: "var(--text-sm)",
            fontFamily: "inherit",
            lineHeight: "1.6",
            marginBottom: "24px",
          }}
        >
          Tienes cambios sin validar en el índice. Si sales ahora, se descartarán los
          cambios y se mantendrá la última versión validada.
        </p>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <AppButton variant="secondary" onClick={onKeepEditing}>
            Seguir editando
          </AppButton>
          <AppButton variant="primary" onClick={onDiscard}>
            Descartar cambios
          </AppButton>
        </div>
      </div>
    </div>
  );
}

// ─── Props ─────────────────────────────────────────────────────────────────────

export interface AppIndiceContentProps {
  oppId: string;
  oppName: string;
  /** Registra/cancela el guard de navegación en el componente padre. */
  onRegisterGuard?: (guard: ((newId: string) => void) | null) => void;
  /** Confirma la navegación pendiente desde el padre tras descartar cambios. */
  navigateTo?: (id: string) => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function AppIndiceContent({
  oppId,
  oppName,
  onRegisterGuard,
  navigateTo,
}: AppIndiceContentProps) {
  const stored = readStoredIndice(oppId);
  const { isReadOnly } = useWorkspaceReadonly();

  const [phase, setPhase] = useState<IndicePhase>(stored ? "validated" : "idle");
  const [editingContent, setEditingContent] = useState<string>(stored?.content ?? "");
  const [storedIndice, setStoredIndice] = useState<StoredIndice | null>(stored);
  const [justValidated, setJustValidated] = useState(false);
  const [justGenerated, setJustGenerated] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [pendingNavId, setPendingNavId] = useState<string | null>(null);
  const [docs, setDocs] = useState<File[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const initialEditingRef = useRef<string>("");

  const hasEdits = phase === "editing" && editingContent !== initialEditingRef.current;

  useEffect(() => {
    const stored2 = getFiles(oppId);
    if (stored2 && stored2.length > 0) setDocs(stored2);
  }, [oppId]);

  useEffect(() => {
    if (phase === "editing" && hasEdits) {
      onRegisterGuard?.((newId: string) => { setPendingNavId(newId); setShowModal(true); });
    } else {
      onRegisterGuard?.(null);
    }
    return () => { onRegisterGuard?.(null); };
  }, [phase, hasEdits, onRegisterGuard]);

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

  // ── Generate ──
  const handleGenerate = useCallback(async () => {
    if (docs.length === 0) { setBanner("Adjunta el pliego (.pdf o .docx) para generar el índice."); return; }
    setBanner(null);
    setJustGenerated(false);
    setJustValidated(false);
    setPhase("loading");
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      const res = await generateIndex(docs, `indice:${oppId}:${Date.now()}`, abortRef.current.signal);
      const content = res.index;
      initialEditingRef.current = content;
      setEditingContent(content);
      setPhase("editing");
      setJustGenerated(true);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setBanner(`Error: ${err instanceof Error ? err.message : "Error desconocido."}`);
      setPhase("idle");
    }
  }, [docs, oppId]);

  // ── Validate ──
  const handleValidate = useCallback(() => {
    const date = new Date().toLocaleDateString("es-ES", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
    const userName = getAuthUser().name;
    const newStored: StoredIndice = {
      content: editingContent,
      validatedAt: date,
      validatedBy: userName,
    };
    persistIndice(oppId, newStored);
    setStoredIndice(newStored);
    initialEditingRef.current = editingContent;
    setPhase("validated");
    setJustValidated(true);
    setJustGenerated(false);
  }, [editingContent, oppId]);

  // ── Edit ──
  const handleEdit = useCallback(() => {
    if (!storedIndice) return;
    initialEditingRef.current = storedIndice.content;
    setEditingContent(storedIndice.content);
    setJustValidated(false);
    setPhase("editing");
  }, [storedIndice]);

  // ── Cancel editing ──
  const handleCancelEditing = useCallback(() => {
    if (storedIndice) {
      setEditingContent(storedIndice.content);
      setPhase("validated");
    } else {
      setEditingContent("");
      setPhase("idle");
    }
    setJustGenerated(false);
  }, [storedIndice]);

  // ── Discard modal: confirm ──
  const handleDiscardConfirm = useCallback(() => {
    setShowModal(false);
    onRegisterGuard?.(null);
    // Reset state
    if (storedIndice) {
      setEditingContent(storedIndice.content);
      setPhase("validated");
    } else {
      setEditingContent("");
      setPhase("idle");
    }
    if (pendingNavId) {
      navigateTo?.(pendingNavId);
      setPendingNavId(null);
    }
  }, [storedIndice, pendingNavId, onRegisterGuard, navigateTo]);

  // ── Discard modal: keep editing ──
  const handleKeepEditing = useCallback(() => {
    setShowModal(false);
    setPendingNavId(null);
  }, []);

  // ── Derived ──
  const isIdle      = phase === "idle";
  const isLoading   = phase === "loading";
  const isEditing   = phase === "editing";
  const isValidated = phase === "validated";

  const textareaContent =
    isEditing   ? editingContent :
    isValidated ? (storedIndice?.content ?? "") :
    "";

  return (
    <>
      {/* ── Unsaved-changes modal ── */}
      {showModal && (
        <DiscardModal
          onDiscard={handleDiscardConfirm}
          onKeepEditing={handleKeepEditing}
        />
      )}

      <div style={{ padding: "32px 40px" }}>

        {/* ── Tool header ── */}
        <div className="flex items-start gap-4 mb-8">
          <div
            className="bg-muted text-primary flex items-center justify-center flex-shrink-0"
            style={{ width: "48px", height: "48px", borderRadius: "var(--radius)" }}
          >
            <List size={24} />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h3 style={{ fontSize: "var(--text-xl)" }}>
                Generación del índice de la oferta
              </h3>
              {/* Phase badge */}
              {isValidated && (
                <span
                  style={{
                    padding: "2px 10px",
                    borderRadius: "var(--radius-chip)",
                    fontSize: "var(--text-3xs)",
                    fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                    letterSpacing: "0.04em",
                    background: "var(--success-subtle)",
                    color: "var(--success)",
                    fontFamily: "inherit",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <ShieldCheck size={10} />
                  Validado
                </span>
              )}
              {isEditing && (
                <span
                  style={{
                    padding: "2px 10px",
                    borderRadius: "var(--radius-chip)",
                    fontSize: "var(--text-3xs)",
                    fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                    letterSpacing: "0.04em",
                    background: "var(--warning-subtle)",
                    color: "var(--warning-foreground)",
                    fontFamily: "inherit",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <Edit3 size={10} />
                  En edición
                </span>
              )}
              {(isIdle || isLoading) && (
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
                  Generación
                </span>
              )}
            </div>
            <p
              className="text-muted-foreground"
              style={{ fontSize: "var(--text-sm)", maxWidth: "560px", fontFamily: "inherit" }}
            >
              Genera automáticamente el índice estructurado de la oferta técnica a partir del
              análisis de los pliegos y criterios de valoración. Edita la propuesta y valídala
              para desbloquear las siguientes funcionalidades.
            </p>
          </div>
        </div>

        {/* ── Divider ── */}
        <div style={{ borderTop: "1px solid var(--border)", marginBottom: "28px" }} />

        {/* ── Error banner ── */}
        {banner && (
          <div className="flex items-start gap-3 mb-4" style={{ padding: "var(--banner-py) var(--banner-px)", borderRadius: "var(--radius-banner)", background: "var(--warning-subtle)", border: "1px solid var(--warning)", maxWidth: "720px" }}>
            <AlertCircle size={15} style={{ color: "var(--warning-foreground)", flexShrink: 0, marginTop: "1px" }} />
            <p style={{ fontSize: "var(--text-sm)", color: "var(--warning-foreground)", fontFamily: "inherit", lineHeight: 1.5 }}>{banner}</p>
          </div>
        )}

        {/* ── Documentos del pliego ── */}
        {!isReadOnly && (phase === "idle" || isLoading) && (
          <div className="flex flex-col gap-2 mb-6" style={{ maxWidth: "680px" }}>
            {docs.length > 0 ? (
              <div className="flex flex-col gap-1">
                {docs.map(f => (
                  <div key={f.name} className="flex items-center gap-2" style={{ padding: "4px 10px", borderRadius: "4px", border: "1px solid var(--border)", background: "var(--muted)", maxWidth: "480px" }}>
                    <FileText size={11} style={{ color: "var(--primary)", flexShrink: 0 }} />
                    <span style={{ fontSize: "var(--text-2xs)", fontFamily: "inherit", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                    <button onClick={() => handleRemoveDoc(f.name)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: "0 2px", fontSize: "14px", lineHeight: 1 }}>×</button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>Sin documentos. Añade el PCAP/PPT para generar el índice.</p>
            )}
            <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 10px", borderRadius: "4px", border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", fontSize: "var(--text-xs)", fontFamily: "inherit", cursor: "pointer", width: "fit-content" }}>
              <FileText size={12} /> Añadir documentos
              <input type="file" accept=".pdf,.docx" multiple onChange={handleAddFiles} style={{ display: "none" }} />
            </label>
          </div>
        )}

        {/* ── Success: generated ── */}
        {justGenerated && isEditing && (
          <div
            className="flex items-center gap-3 mb-6"
            style={{
              padding: "12px 16px",
              borderRadius: "var(--radius-banner)",
              background: "var(--success-subtle)",
              border: "1px solid var(--success)",
              maxWidth: "720px",
            }}
          >
            <CheckCircle2 size={15} style={{ color: "var(--success)", flexShrink: 0 }} />
            <span style={{ fontSize: "var(--text-sm)", color: "var(--success)", fontFamily: "inherit" }}>
              Índice generado correctamente. Revisa y edita el contenido antes de validar.
            </span>
          </div>
        )}

        {/* ── Success: validated ── */}
        {justValidated && isValidated && (
          <div
            className="flex items-center gap-3 mb-6"
            style={{
              padding: "12px 16px",
              borderRadius: "var(--radius-banner)",
              background: "var(--success-subtle)",
              border: "1px solid var(--success)",
              maxWidth: "720px",
            }}
          >
            <CheckCircle2 size={15} style={{ color: "var(--success)", flexShrink: 0 }} />
            <span style={{ fontSize: "var(--text-sm)", color: "var(--success)", fontFamily: "inherit" }}>
              Índice validado correctamente. Los módulos dependientes han sido desbloqueados.
            </span>
          </div>
        )}

        {/* ── Editing info banner ── */}
        {isEditing && (
          <div
            className="flex items-start gap-3 mb-6"
            style={{
              padding: "11px 14px",
              borderRadius: "var(--radius-banner)",
              background: "var(--accent-subtle)",
              border: "1px solid var(--accent)",
              maxWidth: "720px",
            }}
          >
            <Info size={14} style={{ color: "var(--accent)", flexShrink: 0, marginTop: "1px" }} />
            <span style={{ fontSize: "var(--text-sm)", color: "var(--accent)", fontFamily: "inherit" }}>
              Debes validar el índice para que los cambios sean definitivos y desbloquear los módulos dependientes.
            </span>
          </div>
        )}

        {/* ── Action bar ── */}
        <div className="flex items-center gap-3 mb-6" style={{ flexWrap: "wrap" }}>
          {/* LOADING */}
          {isLoading && (
            <div className="flex items-center gap-3">
              <Loader2 size={16} className="animate-spin" style={{ color: "var(--primary)" }} />
              <span style={{ fontSize: "var(--text-sm)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
                Generando índice con IA… puede tardar hasta un minuto.
              </span>
            </div>
          )}

          {/* IDLE: single generate button */}
          {isIdle && !isReadOnly && (
            <AppButton
              variant="primary"
              icon={<Sparkles size={14} />}
              disabled={docs.length === 0}
              onClick={handleGenerate}
            >
              {`Generar índice${docs.length > 0 ? ` (${docs.length} doc${docs.length !== 1 ? "s" : ""})` : ""}`}
            </AppButton>
          )}
          {isIdle && isReadOnly && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: "var(--radius-banner)" }}>
              <Lock size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
              <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>No ejecutado antes de marcar como Entregada.</span>
            </div>
          )}

          {/* EDITING: validate + regenerate + cancel — hidden in read-only */}
          {isEditing && !isReadOnly && (
            <>
              <AppButton
                variant="primary"
                icon={<ShieldCheck size={14} />}
                onClick={handleValidate}
              >
                Validar índice
              </AppButton>
              <AppButton
                variant="secondary"
                icon={<RefreshCw size={13} />}
                onClick={handleGenerate}
              >
                Regenerar índice
              </AppButton>
              <AppButton
                variant="secondary"
                onClick={handleCancelEditing}
              >
                Cancelar edición
              </AppButton>
            </>
          )}

          {/* VALIDATED: edit + regenerate — hidden in read-only */}
          {isValidated && !isReadOnly && (
            <>
              <AppButton
                variant="primary"
                icon={<Edit3 size={13} />}
                onClick={handleEdit}
              >
                Editar índice
              </AppButton>
              <AppButton
                variant="secondary"
                icon={<RefreshCw size={13} />}
                onClick={handleGenerate}
              >
                Regenerar índice
              </AppButton>
            </>
          )}
        </div>

        {/* ── Validation signature (below buttons) ── */}
        {isValidated && storedIndice && (
          <p
            style={{
              fontSize: "var(--text-2xs)",
              color: "var(--muted-foreground)",
              fontFamily: "inherit",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <ShieldCheck size={11} style={{ color: "var(--success)" }} />
            Validado el {storedIndice.validatedAt} por {storedIndice.validatedBy}.
          </p>
        )}

        {/* ── Textarea ── */}
        {(isEditing || isValidated) && (
          <div style={{ maxWidth: "800px" }}>
            <textarea
              readOnly={isValidated || isReadOnly}
              value={textareaContent}
              onChange={(e) => (isEditing && !isReadOnly) && setEditingContent(e.target.value)}
              placeholder="El índice de la oferta se mostrará aquí una vez generado."
              style={{
                width: "100%",
                minHeight: "520px",
                padding: "18px 20px",
                borderRadius: "var(--radius-input)",
                border: isEditing
                  ? "1px solid var(--primary)"
                  : "1px solid var(--border)",
                background: isValidated ? "var(--muted)" : "var(--input-background)",
                color: "var(--foreground)",
                fontSize: "var(--text-xs)",
                fontFamily: "inherit",
                lineHeight: "1.8",
                resize: "vertical",
                outline: "none",
                cursor: isValidated ? "default" : "text",
                transition: "border-color 0.15s",
              }}
            />

            {/* Char / line count hint while editing */}
            {isEditing && (
              <div className="flex items-center justify-between mt-2">
                <p
                  className="text-muted-foreground"
                  style={{ fontSize: "var(--text-3xs)", fontFamily: "inherit" }}
                >
                  Edita la estructura jerárquica (1., 1.1., 1.1.1.) según las necesidades de la oferta.
                </p>
                <p
                  className="text-muted-foreground"
                  style={{ fontSize: "var(--text-3xs)", fontFamily: "inherit" }}
                >
                  {editingContent.split("\n").length} líneas
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Idle placeholder ── */}
        {isIdle && (
          <div
            className="border border-dashed border-border flex flex-col items-center justify-center"
            style={{
              maxWidth: "800px",
              minHeight: "220px",
              borderRadius: "var(--radius-banner)",
              background: "var(--muted)",
              gap: "12px",
            }}
          >
            <div
              className="bg-card border border-border flex items-center justify-center"
              style={{ width: "40px", height: "40px", borderRadius: "var(--radius)" }}
            >
              <List size={18} style={{ color: "var(--muted-foreground)" }} />
            </div>
            <p
              className="text-muted-foreground"
              style={{ fontSize: "var(--text-sm)", fontFamily: "inherit", textAlign: "center" }}
            >
              El índice se generará aquí una vez iniciado el proceso.
            </p>
          </div>
        )}

      </div>
    </>
  );
}

// ─── Blocked module placeholder ────────────────────────────────────────────────

export function AppBlockedByIndice() {
  return (
    <div style={{ padding: "32px 40px" }}>
      <div
        className="flex flex-col items-center justify-center border border-dashed border-border"
        style={{
          maxWidth: "640px",
          minHeight: "280px",
          borderRadius: "var(--radius-banner)",
          background: "var(--muted)",
          gap: "14px",
        }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "var(--radius-sm)",
            background: "var(--warning-subtle)",
            border: "1px solid var(--warning)",
          }}
        >
          <Lock size={20} style={{ color: "var(--warning-foreground)" }} />
        </div>
        <div style={{ textAlign: "center", maxWidth: "400px", padding: "0 16px" }}>
          <p
            style={{
              fontSize: "var(--text-base)",
              fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
              fontFamily: "inherit",
              marginBottom: "6px",
            }}
          >
            Módulo bloqueado
          </p>
          <p
            className="text-muted-foreground"
            style={{ fontSize: "var(--text-sm)", fontFamily: "inherit", lineHeight: "1.6" }}
          >
            Este módulo requiere que el índice de la oferta esté validado. Completa
            primero la{" "}
            <span style={{ color: "var(--foreground)" }}>
              Generación del índice de la oferta
            </span>{" "}
            en la sección <em>Generación de la propuesta</em>.
          </p>
        </div>
      </div>
    </div>
  );
}