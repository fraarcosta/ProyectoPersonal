"use client";
// Next.js equivalent: app/(dashboard)/workspace/[id]/_components/oferta-v0-content.tsx
// Generación de Oferta v0 — integra índice validado y Win Themes del equipo.
// Persistencia colectiva por oportunidad (sin segmentación de usuario).
// Todos los valores usan exclusivamente CSS variables del design system.

import { useState, type CSSProperties, type ReactNode } from "react";
import {
  FileOutput, Sparkles, Loader2, CheckCircle2, RefreshCw,
  AlertCircle, FileDown, AlertTriangle, X, Info,
  CheckSquare, List, Trophy, FileText, Lock,
} from "lucide-react";
import { AppButton } from "../../../../_components/ui";
import { getAuthUser } from "../../../../_components/auth-store";
import { isIndiceValidated, readStoredIndice } from "./indice-content";
import { useWorkspaceReadonly } from "./workspace-readonly-context";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface OfertaV0Store {
  generatedAt: string;
  generatedBy: string;
}

// ─── Persistence ───────────────────────────────────────────────────────────────

const STORAGE_KEY = (oppId: string) => `oferta-v0-${oppId}`;

function readPersistedOfertaV0(oppId: string): OfertaV0Store | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(oppId));
    if (!raw) return null;
    const p = JSON.parse(raw) as OfertaV0Store;
    if (p.generatedAt && p.generatedBy) return p;
  } catch {}
  return null;
}

function persistOfertaV0(oppId: string, data: OfertaV0Store): void {
  try {
    localStorage.setItem(STORAGE_KEY(oppId), JSON.stringify(data));
  } catch {}
}

// ─── Prerequisite validators ───────────────────────────────────────────────────

function hasValidatedWinThemes(oppId: string): boolean {
  try {
    const raw = localStorage.getItem(`win-themes-${oppId}`);
    if (!raw) return false;
    const store = JSON.parse(raw) as {
      generatedAt: string;
      sections: Record<string, { text: string; validatedAt?: string }>;
    };
    if (!store.sections) return false;
    return Object.values(store.sections).some((s) => !!s.validatedAt);
  } catch {}
  return false;
}

// ─── State type ────────────────────────────────────────────────────────────────

type Phase = "idle" | "loading" | "done";

// ─── Checklist item ────────────────────────────────────────────────────────────

interface CheckItem {
  label: string;
  ok: boolean;
  icon: ReactNode;
}

// ─── Mock document content builder ────────────────────────────────────────────

function buildDocumentSummary(oppName: string, oppId: string): string {
  const indice = readStoredIndice(oppId);
  const indiceSection = indice
    ? `Índice validado el ${indice.validatedAt} por ${indice.validatedBy}`
    : "Índice validado";

  return `OFERTA v0 — ${oppName}
Expediente: ${oppId}
Versión: 0 (borrador generado automáticamente)

Generada a partir de:
  · ${indiceSection}
  · Win Themes validados por el equipo
  · Requisitos del pliego procesados

──────────────────────────────────────────────────

PORTADA
  Nombre de la oportunidad: ${oppName}
  Expediente: ${oppId}
  Fecha: ${new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}
  Versión: 0

──────────────────────────────────────────────────

ÍNDICE AUTOMÁTICO (con numeración y estilos Word)

1. PRESENTACIÓN DE LA EMPRESA LICITADORA
   1.1. Trayectoria en el sector público
   1.2. Certificaciones y clasificación empresarial

2. COMPRENSIÓN DEL PROYECTO Y ANÁLISIS DE CONTEXTO
   2.1. Análisis de la situación actual (AS-IS)
   2.2. Visión del estado objetivo (TO-BE)
   2.3. Retos y oportunidades identificados

3. SOLUCIÓN TÉCNICA PROPUESTA
   3.1. Arquitectura de la solución
   3.2. Componentes y plataformas tecnológicas
   3.3. Modelo de integración con sistemas legados

4. METODOLOGÍA Y PLAN DE TRABAJO
   4.1. Metodología de gestión del proyecto
   4.2. Fases y hitos del proyecto
   4.3. Organización del equipo

5. GESTIÓN DE RIESGOS
   5.1. Identificación y categorización de riesgos
   5.2. Plan de mitigación

6. EQUIPO Y PERFILES PROFESIONALES
   6.1. Estructura del equipo adscrito
   6.2. CVs de perfiles clave

7. MEJORAS ADICIONALES
   7.1. Propuestas de mejora sobre el PPT
   7.2. Valor diferencial de la propuesta

──────────────────────────────────────────────────

NOTA: Este documento es un borrador (v0) generado automáticamente por Akena · Accenture.
Contiene el texto base estructurado, storytelling diferencial y Win Themes integrados.
Requiere revisión y validación del equipo de oferta antes de su presentación final.`;
}

// ─── Confirm modal ─────────────────────────────────────────────────────────────

interface ConfirmRegenerateModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmRegenerateModal({ onConfirm, onCancel }: ConfirmRegenerateModalProps) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: "var(--overlay)" }}
      onClick={onCancel}
    >
      <div
        className="bg-card border border-border flex flex-col"
        style={{
          borderRadius: "var(--radius)",
          padding: "32px",
          maxWidth: "440px",
          width: "100%",
          margin: "0 24px",
          boxShadow: "var(--elevation-sm)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-start gap-3">
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "var(--radius)",
                background: "var(--warning-subtle)",
                color: "var(--warning-foreground)",
              }}
            >
              <AlertTriangle size={17} />
            </div>
            <div>
              <p
                style={{
                  fontSize: "var(--text-sm)",
                  fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                  color: "var(--foreground)",
                  fontFamily: "inherit",
                  marginBottom: "4px",
                }}
              >
                Regenerar Oferta v0
              </p>
              <p
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--muted-foreground)",
                  fontFamily: "inherit",
                  lineHeight: "1.5",
                }}
              >
                La regeneración sobrescribirá la versión actual. Esta acción no se puede deshacer.
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--muted-foreground)",
              padding: "2px",
              flexShrink: 0,
              borderRadius: "var(--radius-button)",
              fontFamily: "inherit",
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <AppButton variant="secondary" size="sm" onClick={onCancel}>
            Cancelar
          </AppButton>
          <AppButton variant="primary" size="sm" icon={<RefreshCw size={12} />} onClick={onConfirm}>
            Regenerar
          </AppButton>
        </div>
      </div>
    </div>
  );
}

// ─── AppOfertaV0Content ────────────────────────────────────────────────────────

export function AppOfertaV0Content({ oppId, oppName }: { oppId: string; oppName: string }) {
  const stored = readPersistedOfertaV0(oppId);
  const { isReadOnly } = useWorkspaceReadonly();

  // ── Prerequisite checks — only índice + win themes required
  const indiceOk     = isIndiceValidated(oppId);
  const winThemesOk  = hasValidatedWinThemes(oppId);
  const allPrereqsOk = indiceOk && winThemesOk;

  // ── Persistent state
  const [persisted, setPersisted] = useState<OfertaV0Store | null>(
    () => readPersistedOfertaV0(oppId)
  );

  // ── Phase: idle | loading | done
  const [phase, setPhase] = useState<Phase>(() =>
    readPersistedOfertaV0(oppId) ? "done" : "idle"
  );

  // ── Success flash (shown only right after generation in this session)
  const [justGenerated, setJustGenerated] = useState(false);

  // ── Confirm-regenerate modal
  const [showConfirm, setShowConfirm] = useState(false);

  // ── Handlers
  const doGenerate = () => {
    setJustGenerated(false);
    setPhase("loading");
    setTimeout(() => {
      const date     = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
      const userName = getAuthUser().name;
      const store: OfertaV0Store = { generatedAt: date, generatedBy: userName };
      persistOfertaV0(oppId, store);
      setPersisted(store);
      setPhase("done");
      setJustGenerated(true);
    }, 3200);
  };

  const handleGenerate = () => {
    if (!allPrereqsOk) return;
    doGenerate();
  };

  const handleRegenerateClick = () => setShowConfirm(true);

  const handleConfirmRegenerate = () => {
    setShowConfirm(false);
    doGenerate();
  };

  const handleDownload = () => {
    const content = buildDocumentSummary(oppName, oppId);
    const blob = new Blob([content], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const url = URL.createObjectURL(blob);
    const a   = document.createElement("a");
    a.href     = url;
    a.download = `Oferta_v0_${oppId}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Checklist items — only índice + win themes
  const checkItems: CheckItem[] = [
    { label: "Índice validado",      ok: indiceOk,   icon: <List size={13} /> },
    { label: "Win Themes validados", ok: winThemesOk, icon: <Trophy size={13} /> },
  ];

  const isDone    = phase === "done";
  const isLoading = phase === "loading";
  const isIdle    = phase === "idle";

  return (
    <>
      {/* ── Confirm regenerate modal ── */}
      {showConfirm && (
        <ConfirmRegenerateModal
          onConfirm={handleConfirmRegenerate}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      <div style={{ padding: "32px 40px" }}>

        {/* ── Tool header ── */}
        <div className="flex items-start gap-4 mb-8">
          <div
            className="bg-muted text-primary flex items-center justify-center flex-shrink-0"
            style={{ width: "48px", height: "48px", borderRadius: "var(--radius)" }}
          >
            <FileOutput size={24} />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h3 style={{ fontSize: "var(--text-xl)" }}>Generar Oferta v0</h3>
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
            </div>
            <p
              className="text-muted-foreground"
              style={{ fontSize: "var(--text-sm)", maxWidth: "560px", fontFamily: "inherit" }}
            >
              Genera automáticamente la versión base de la oferta técnica integrando el índice
              validado y los Win Themes del equipo.
            </p>
          </div>
        </div>

        {/* ── Divider ── */}
        <div style={{ borderTop: "1px solid var(--border)", marginBottom: "32px" }} />

        {/* ── Two-column layout ── */}
        <div className="flex gap-8 items-start" style={{ flexWrap: "wrap" }}>

          {/* ── Left: action card ── */}
          <div
            className="bg-card border border-border flex flex-col"
            style={{
              borderRadius: "var(--radius)",
              padding: "28px 32px",
              minWidth: "340px",
              maxWidth: "480px",
              flex: "1 1 340px",
            }}
          >
            {/* LOADING */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center gap-4" style={{ padding: "24px 0" }}>
                <Loader2 size={32} className="animate-spin" style={{ color: "var(--primary)" }} />
                <p
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "var(--muted-foreground)",
                    fontFamily: "inherit",
                    textAlign: "center",
                  }}
                >
                  Integrando índice y Win Themes para generar la Oferta v0…
                </p>
              </div>
            )}

            {/* IDLE */}
            {isIdle && (
              <div className="flex flex-col gap-4">
                {!allPrereqsOk && !isReadOnly && (
                  <div
                    className="flex items-start gap-3"
                    style={{
                      padding: "12px 14px",
                      borderRadius: "var(--radius-banner)",
                      background: "var(--warning-subtle)",
                      border: "1px solid var(--warning)",
                    }}
                  >
                    <AlertCircle size={14} style={{ color: "var(--warning-foreground)", flexShrink: 0, marginTop: "2px" }} />
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--warning-foreground)", fontFamily: "inherit", lineHeight: "1.5" }}>
                      Valida el índice y al menos un Win Theme antes de generar la Oferta v0.
                    </p>
                  </div>
                )}
                {isReadOnly ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: "var(--radius-banner)" }}>
                    <Lock size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>No ejecutado antes de marcar como Entregada.</span>
                  </div>
                ) : (
                  <div>
                    <AppButton variant="primary" icon={<Sparkles size={14} />} disabled={!allPrereqsOk} onClick={handleGenerate}>
                      Generar Oferta v0
                    </AppButton>
                  </div>
                )}
              </div>
            )}

            {/* DONE */}
            {isDone && persisted && (
              <div className="flex flex-col gap-5">
                {/* Success banner */}
                <div
                  className="flex items-center gap-3"
                  style={{
                    padding: "11px 14px",
                    borderRadius: "var(--radius-banner)",
                    background: "var(--success-subtle)",
                    border: "1px solid var(--success)",
                  }}
                >
                  <CheckCircle2 size={14} style={{ color: "var(--success)", flexShrink: 0 }} />
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--success)", fontFamily: "inherit" }}>
                    Oferta v0 generada correctamente.
                  </span>
                </div>

                {/* Metadata */}
                <p
                  style={{
                    fontSize: "var(--text-2xs)",
                    color: "var(--muted-foreground)",
                    fontFamily: "inherit",
                  }}
                >
                  Generada el {persisted.generatedAt} por {persisted.generatedBy}
                </p>

                {/* Download */}
                <div>
                  <AppButton variant="primary" icon={<FileDown size={14} />} onClick={handleDownload}>
                    Descargar Oferta v0 (.docx)
                  </AppButton>
                </div>

                {/* Divider */}
                <div style={{ borderTop: "1px solid var(--border)" }} />

                {/* Regenerate — hidden in read-only */}
                {!isReadOnly && (
                  <div className="flex items-center gap-3">
                    <AppButton variant="secondary" icon={<RefreshCw size={12} />} onClick={handleRegenerateClick}>
                      Regenerar Oferta v0
                    </AppButton>
                    <p style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
                      Sobrescribirá la versión actual.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Right: prerequisites + document structure ── */}
          <div className="flex flex-col gap-6" style={{ flex: "1 1 280px", minWidth: "260px", maxWidth: "400px" }}>

            {/* Prerequisites checklist */}
            <div
              className="bg-card border border-border"
              style={{ borderRadius: "var(--radius)", padding: "20px 24px" }}
            >
              <p
                style={{
                  fontSize: "var(--text-xs)",
                  fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                  color: "var(--foreground)",
                  fontFamily: "inherit",
                  marginBottom: "14px",
                  letterSpacing: "0.01em",
                }}
              >
                Fases estratégicas requeridas
              </p>
              <div className="flex flex-col gap-3">
                {checkItems.map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div
                      className="flex items-center justify-center flex-shrink-0"
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "var(--radius-button)",
                        background: item.ok ? "var(--success-subtle)" : "var(--muted)",
                        color: item.ok ? "var(--success)" : "var(--muted-foreground)",
                        border: `1px solid ${item.ok ? "var(--success)" : "var(--border)"}`,
                      }}
                    >
                      {item.ok ? <CheckSquare size={11} /> : item.icon}
                    </div>
                    <span
                      style={{
                        fontSize: "var(--text-xs)",
                        color: item.ok ? "var(--foreground)" : "var(--muted-foreground)",
                        fontFamily: "inherit",
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Document structure info */}
            <div
              className="border border-border"
              style={{
                borderRadius: "var(--radius)",
                padding: "20px 24px",
                background: "var(--muted)",
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Info size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                <p
                  style={{
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                    color: "var(--muted-foreground)",
                    fontFamily: "inherit",
                    letterSpacing: "0.01em",
                  }}
                >
                  Contenido del documento generado
                </p>
              </div>
              <ul
                className="flex flex-col gap-2"
                style={{ listStyle: "none", padding: 0, margin: 0 }}
              >
                {[
                  "Portada automática (nombre, cliente, expediente, fecha, versión)",
                  "Índice con numeración y estilos Word",
                  "Desarrollo de cada apartado con storytelling",
                  "Win Themes integrados por sección",
                  "Guía de estilos corporativa aplicada",
                  "Límites de páginas respetados por apartado",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <FileText
                      size={10}
                      style={{
                        color: "var(--muted-foreground)",
                        flexShrink: 0,
                        marginTop: "3px",
                      }}
                    />
                    <span
                      style={{
                        fontSize: "var(--text-2xs)",
                        color: "var(--muted-foreground)",
                        fontFamily: "inherit",
                        lineHeight: "1.5",
                      }}
                    >
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}