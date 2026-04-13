// Control de contenido de sobres — Línea Técnica › Validación y calidad.
// Permite subir .zip o carpeta con la estructura de sobres y detecta:
//   A) Falta de documentación, nomenclatura incorrecta o estructura errónea por sobre.
//   B) Contaminación entre sobres (información reservada en el sobre equivocado).
"use client";
import { useState, useRef, useCallback, type CSSProperties, type ReactNode, type ChangeEvent, type DragEvent } from "react";
import {
  CheckSquare, UploadCloud, FolderOpen, X, Sparkles, Loader2,
  CheckCircle2, RefreshCw, AlertCircle, AlertTriangle, User,
  CheckCheck, XCircle, Info, Archive, Lock, FileDown,
} from "lucide-react";
import { AppButton } from "../../../../_components/ui";
import { getAuthUser } from "../../../../_components/auth-store";
import { useWorkspaceReadonly } from "./workspace-readonly-context";

// ─── Types ──────────────────────────────────────────────────────────────────────

type ControlPhase = "idle" | "loading" | "done";

export type ControlStatus = "FAVORABLE" | "NO_FAVORABLE" | null;

type IncidenciaTipo = "falta_doc" | "nomenclatura" | "contaminacion" | "estructura";

interface Incidencia {
  tipo:          IncidenciaTipo;
  titulo:        string;
  sobre:         string;
  descripcion:   string;
  justificacion: string;
  recomendacion: string;
}

interface SobreValidacion {
  id:          string;
  nombre:      string;
  descripcion: string;
  status:      "ok" | "error";
  incidencias: Incidencia[];
}

interface UploadedPackage {
  name:     string;
  size:     number | null;
  isFolder: boolean;
}

interface PersistedControl {
  controlStatus:   ControlStatus;
  sobres:          SobreValidacion[];
  contaminaciones: Incidencia[];
  executedAt:      string;
  executedBy:      string;
  packageName:     string;
  packageIsFolder: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function formatBytes(bytes: number | null): string {
  if (bytes === null) return "—";
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function today(): string {
  return new Date().toLocaleDateString("es-ES", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function incidenciaLabel(tipo: IncidenciaTipo): string {
  switch (tipo) {
    case "falta_doc":     return "Falta de documentación";
    case "nomenclatura":  return "Nomenclatura incorrecta";
    case "contaminacion": return "Contaminación de sobres";
    case "estructura":    return "Estructura incorrecta";
  }
}

interface IncidenciaStyle {
  stripBg: string; stripText: string; cardBorder: string;
}

function incidenciaStyle(tipo: IncidenciaTipo): IncidenciaStyle {
  if (tipo === "contaminacion") {
    return {
      stripBg:    "var(--destructive)",
      stripText:  "var(--destructive-foreground)",
      cardBorder: "var(--destructive)",
    };
  }
  return {
    stripBg:    "var(--warning-subtle)",
    stripText:  "var(--warning-foreground)",
    cardBorder: "var(--warning)",
  };
}

// ─── Word download ───────────────────────────────────────────────────────────────

function downloadIncidenciasWord(data: PersistedControl, oppName: string): void {
  // Collect all incidences without duplicates
  const all: Array<Incidencia & { sobreLabel: string }> = [];
  data.sobres.forEach((s) => {
    s.incidencias.forEach((inc) => all.push({ ...inc, sobreLabel: s.nombre }));
  });
  data.contaminaciones.forEach((inc) => {
    const exists = all.some((x) => x.titulo === inc.titulo && x.tipo === "contaminacion");
    if (!exists) all.push({ ...inc, sobreLabel: inc.sobre });
  });

  const veredicto =
    data.controlStatus === "FAVORABLE"
      ? "RESULTADO FAVORABLE"
      : data.controlStatus === "NO_FAVORABLE"
      ? "RESULTADO NO FAVORABLE"
      : "—";

  const verdictColor  = data.controlStatus === "FAVORABLE" ? "#155724" : "#721c24";
  const verdictBg     = data.controlStatus === "FAVORABLE" ? "#d4edda"  : "#f8d7da";
  const verdictBorder = data.controlStatus === "FAVORABLE" ? "#28a745"  : "#dc3545";

  const sobreRows = data.sobres
    .map((s) => {
      const color = s.status === "ok" ? "#155724" : "#7c4a00";
      const icon  = s.status === "ok" ? "✓" : "⚠";
      const badge = s.incidencias.length > 0
        ? ` <span style="color:#dc3545;font-size:9pt;">(${s.incidencias.length} incidencia${s.incidencias.length > 1 ? "s" : ""})</span>`
        : "";
      return `<tr>
        <td style="padding:6px 10px;border:1px solid #e0e0e0;color:${color};font-weight:bold;">
          ${icon} ${s.nombre}
        </td>
        <td style="padding:6px 10px;border:1px solid #e0e0e0;color:#555;">${s.descripcion}${badge}</td>
      </tr>`;
    })
    .join("");

  const incBlocks = all
    .map((inc, i) => {
      const isContam  = inc.tipo === "contaminacion";
      const badgeBg   = isContam ? "#f8d7da" : "#fff3cd";
      const badgeTxt  = isContam ? "#721c24" : "#7c4a00";
      const leftColor = isContam ? "#dc3545" : "#e6a817";
      return `
      <div style="margin-bottom:20px;border:1px solid ${leftColor};border-radius:4px;overflow:hidden;">
        <div style="background:${badgeBg};padding:7px 14px;border-bottom:1px solid ${leftColor};">
          <span style="font-size:9pt;font-weight:bold;color:${badgeTxt};letter-spacing:1px;text-transform:uppercase;">
            ⚠ ${incidenciaLabel(inc.tipo).toUpperCase()} &nbsp;·&nbsp; ${inc.sobreLabel}
          </span>
        </div>
        <div style="padding:14px 16px;background:#fff;">
          <p style="margin:0 0 8px;font-size:11.5pt;font-weight:bold;color:#111;">${i + 1}. ${inc.titulo}</p>
          <p style="margin:0 0 8px;font-size:10.5pt;color:#444;line-height:1.6;">${inc.descripcion}</p>
          <p style="margin:0 0 10px;font-size:10.5pt;color:#444;line-height:1.6;">
            <b style="color:#111;">Justificación:</b> ${inc.justificacion}
          </p>
          <div style="padding:9px 12px;background:#eff3ff;border-left:3px solid #4361ee;border-radius:2px;">
            <span style="font-size:10.5pt;color:#1a1a2e;line-height:1.6;">
              <b style="color:#4361ee;">Recomendación:</b> ${inc.recomendacion}
            </span>
          </div>
        </div>
      </div>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="UTF-8">
  <title>Control de sobres — ${oppName}</title>
  <style>
    body { font-family: Calibri, Arial, sans-serif; margin: 2cm 2.5cm; color: #111; font-size: 11pt; }
    h1   { font-size: 16pt; margin: 0 0 4px; }
    h2   { font-size: 12pt; margin: 28px 0 10px; border-bottom: 2px solid #e0e0e0; padding-bottom: 4px; color: #222; }
    table { border-collapse: collapse; width: 100%; }
  </style>
</head>
<body>
  <h1>Informe de control de contenido de sobres</h1>
  <p style="margin:0 0 2px;font-size:10pt;color:#555;">Oportunidad: <b>${oppName}</b></p>
  <p style="margin:0 0 2px;font-size:10pt;color:#555;">Fecha de control: <b>${data.executedAt}</b> &nbsp;·&nbsp; Ejecutado por: <b>${data.executedBy}</b></p>
  <p style="margin:0 0 20px;font-size:10pt;color:#555;">Paquete analizado: <b>${data.packageIsFolder ? "📁 " : "🗜 "}${data.packageName}</b></p>

  <div style="padding:12px 18px;background:${verdictBg};border:2px solid ${verdictBorder};border-radius:4px;margin-bottom:24px;">
    <span style="font-size:13pt;font-weight:bold;color:${verdictColor};">${veredicto}</span>
    <span style="font-size:10pt;color:${verdictColor};margin-left:16px;">
      ${all.length} incidencia${all.length !== 1 ? "s" : ""} detectada${all.length !== 1 ? "s" : ""}
    </span>
  </div>

  <h2>Estado por sobre</h2>
  <table>
    <thead>
      <tr style="background:#f5f5f5;">
        <th style="padding:8px 10px;border:1px solid #e0e0e0;text-align:left;font-size:10pt;">Sobre</th>
        <th style="padding:8px 10px;border:1px solid #e0e0e0;text-align:left;font-size:10pt;">Descripción</th>
      </tr>
    </thead>
    <tbody>${sobreRows}</tbody>
  </table>

  ${all.length > 0 ? `<h2>Incidencias detectadas (${all.length})</h2>${incBlocks}` : `<p style="color:#28a745;font-size:11pt;">No se han detectado incidencias.</p>`}

  <p style="margin-top:36px;font-size:9pt;color:#aaa;border-top:1px solid #eee;padding-top:8px;">
    Documento generado automáticamente por Akena &nbsp;·&nbsp; ${data.executedAt}
  </p>
</body>
</html>`;

  const blob = new Blob([html], { type: "application/msword" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `control-sobres-${oppName.replace(/\s+/g, "-").toLowerCase()}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Mock builders ──────────────────────────────────────────────────────────────

function buildFavorableMock(
  packageName: string, packageIsFolder: boolean, userName: string, date: string,
): PersistedControl {
  return {
    controlStatus: "FAVORABLE",
    sobres: [
      { id: "sobre-a", nombre: "Sobre A", descripcion: "Documentación Administrativa y de Solvencia",             status: "ok", incidencias: [] },
      { id: "sobre-b", nombre: "Sobre B", descripcion: "Oferta Técnica — Criterios por juicio de valor",           status: "ok", incidencias: [] },
      { id: "sobre-c", nombre: "Sobre C", descripcion: "Oferta Económica y criterios evaluables mediante fórmulas", status: "ok", incidencias: [] },
    ],
    contaminaciones: [],
    executedAt: date, executedBy: userName, packageName, packageIsFolder,
  };
}

function buildNoFavorableMock(
  packageName: string, packageIsFolder: boolean, userName: string, date: string,
): PersistedControl {
  return {
    controlStatus: "NO_FAVORABLE",
    sobres: [
      { id: "sobre-a", nombre: "Sobre A", descripcion: "Documentación Administrativa y de Solvencia", status: "ok", incidencias: [] },
      {
        id: "sobre-b", nombre: "Sobre B", descripcion: "Oferta Técnica — Criterios por juicio de valor", status: "error",
        incidencias: [
          {
            tipo: "falta_doc", titulo: "Certificado ISO 27001 no localizado", sobre: "Sobre B",
            descripcion: "El documento «Certificado de Sistema de Gestión de la Seguridad de la Información ISO/IEC 27001 vigente» no ha sido encontrado en la estructura de entrega del Sobre B.",
            justificacion: "El pliego (PPT, cláusula 6.3) exige la acreditación de certificación ISO 27001 o equivalente como requisito de solvencia técnica. Su ausencia es causa de exclusión de la licitación.",
            recomendacion: "Incluir el certificado vigente en /SobreB/Solvencia_Tecnica/ con la nomenclatura CERT_ISO27001_[RazonSocial]_[Año].pdf antes de cerrar el paquete.",
          },
          {
            tipo: "nomenclatura", titulo: "Nomenclatura incorrecta: memoria_tecnica_v3.docx", sobre: "Sobre B",
            descripcion: "El documento «memoria_tecnica_v3.docx» no cumple el patrón de nomenclatura requerido: MEMORIA_TECNICA_[Expediente]_[Empresa].PDF (mayúsculas, guión bajo, formato PDF obligatorio).",
            justificacion: "El PPT (apartado 9.1) especifica el patrón de nombres exacto para los documentos del Sobre B. El incumplimiento puede conllevar la no valoración del documento por parte del tribunal.",
            recomendacion: "Renombrar el documento siguiendo el patrón oficial y exportar a formato PDF antes de incluirlo en el paquete de entrega definitivo.",
          },
        ],
      },
      {
        id: "sobre-c", nombre: "Sobre C", descripcion: "Oferta Económica y criterios evaluables mediante fórmulas", status: "error",
        incidencias: [
          {
            tipo: "contaminacion", titulo: "Información de criterio técnico (B4) detectada en Sobre C", sobre: "Sobre C",
            descripcion: "El archivo «propuesta_economica.xlsx» contiene una hoja denominada «Perfil Equipo» con referencias explícitas a la experiencia de los integrantes del equipo (≥10 años), información que corresponde al criterio B4 del Sobre B (valoración técnica por juicio de valor).",
            justificacion: "El PCAP (cláusula 11.2) establece que la apertura del Sobre C se realiza antes de la puntuación de los criterios de juicio de valor, con el fin de preservar la objetividad del tribunal. La presencia de datos técnicos en el Sobre C vulnera este principio y puede invalidar la valoración del criterio B4.",
            recomendacion: "Eliminar la hoja «Perfil Equipo» del archivo propuesta_economica.xlsx. Verificar que toda referencia a la experiencia del equipo figure únicamente en el Sobre B, apartado de Adscripción de Medios Personales.",
          },
        ],
      },
    ],
    contaminaciones: [
      {
        tipo: "contaminacion", titulo: "Experiencia del equipo (criterio B4) detectada en Sobre C",
        sobre: "Sobre C → debería estar exclusivamente en Sobre B",
        descripcion: "El Sobre C (propuesta_economica.xlsx, hoja «Perfil Equipo») contiene información de experiencia del equipo que el pliego reserva para el criterio B4 del Sobre B.",
        justificacion: "El PCAP (cláusula 11.2) obliga a que la apertura de los sobres se realice de forma secuencial para preservar la objetividad de la valoración. La presencia de datos de valoración técnica en el Sobre C vulnera este principio y puede ser motivo de impugnación.",
        recomendacion: "Retirar toda información de experiencia técnica del Sobre C. Confirmar que el Sobre B contiene el detalle completo del equipo en el apartado de Adscripción de Medios Personales.",
      },
    ],
    executedAt: date, executedBy: userName, packageName, packageIsFolder,
  };
}

function buildMockControlResult(
  packageName: string, packageIsFolder: boolean, userName: string, date: string,
): PersistedControl {
  return packageName.toLowerCase().includes("final")
    ? buildFavorableMock(packageName, packageIsFolder, userName, date)
    : buildNoFavorableMock(packageName, packageIsFolder, userName, date);
}

// ─── ControlStatusBand ──────────────────────────────────────────────────────────

function ControlStatusBand({ status }: { status: ControlStatus }) {
  const isFav = status === "FAVORABLE";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "14px",
      padding: "16px 22px",
      background: isFav ? "var(--success)" : "var(--destructive)",
    }}>
      <div style={{
        width: "38px", height: "38px", borderRadius: "50%",
        background: "rgba(255,255,255,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        {isFav
          ? <CheckCheck size={18} style={{ color: "var(--destructive-foreground)" }} />
          : <XCircle   size={18} style={{ color: "var(--destructive-foreground)" }} />}
      </div>
      <div>
        <p style={{
          fontSize: "var(--text-base)",
          fontWeight: "var(--font-weight-bold)" as CSSProperties["fontWeight"],
          color: "var(--destructive-foreground)", fontFamily: "inherit",
          letterSpacing: "0.04em", marginBottom: "2px",
        }}>
          {isFav ? "RESULTADO FAVORABLE" : "RESULTADO NO FAVORABLE"}
        </p>
        <p style={{ fontSize: "var(--text-xs)", color: "var(--destructive-foreground)", fontFamily: "inherit", opacity: 0.9 }}>
          {isFav
            ? "La documentación por sobre es completa y conforme al pliego. No se detecta contaminación entre sobres."
            : "Se han detectado incidencias en la documentación. Revisa el detalle a continuación."}
        </p>
      </div>
    </div>
  );
}

// ─── IncidenciaCard ─────────────────────────────────────────────────────────────

function IncidenciaCard({ inc, showSobreTag = false }: { inc: Incidencia; showSobreTag?: boolean }) {
  const s = incidenciaStyle(inc.tipo);

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
          {incidenciaLabel(inc.tipo).toUpperCase()}
        </span>
        {showSobreTag && (
          <span style={{
            fontSize: "var(--text-3xs)", color: s.stripText,
            fontFamily: "inherit", opacity: 0.85, fontStyle: "italic",
          }}>
            {inc.sobre}
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>

        {/* Title */}
        <p style={{
          fontSize: "var(--text-sm)",
          fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
          color: "var(--foreground)", fontFamily: "inherit",
        }}>
          {inc.titulo}
        </p>

        {/* Description */}
        <p style={{
          fontSize: "var(--text-xs)", color: "var(--muted-foreground)",
          fontFamily: "inherit", lineHeight: "1.6",
        }}>
          {inc.descripcion}
        </p>

        {/* Justification */}
        <p style={{
          fontSize: "var(--text-xs)", color: "var(--muted-foreground)",
          fontFamily: "inherit", lineHeight: "1.6",
        }}>
          <span style={{
            fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
            color: "var(--foreground)", fontFamily: "inherit",
          }}>
            Justificación:{" "}
          </span>
          {inc.justificacion}
        </p>

        {/* Recommendation box */}
        <div className="flex items-start gap-2" style={{
          padding: "9px 12px",
          borderRadius: "var(--radius-banner)",
          background: "var(--primary-subtle)",
          border: "1px solid var(--border)",
        }}>
          <Info size={12} style={{ color: "var(--primary)", flexShrink: 0, marginTop: "2px" }} />
          <p style={{
            fontSize: "var(--text-xs)", color: "var(--foreground)",
            fontFamily: "inherit", lineHeight: "1.6",
          }}>
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

// ─── SobreRow ──────────────────────────────────────────────────────────────────

function SobreRow({ sobre }: { sobre: SobreValidacion }) {
  const isOk  = sobre.status === "ok";
  const count = sobre.incidencias.length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3" style={{
        padding: "11px 18px",
        background: isOk ? "var(--success-subtle)" : "var(--destructive-subtle)",
        borderBottom: count > 0 ? "1px solid var(--border)" : undefined,
      }}>
        {isOk
          ? <CheckCircle2 size={15} style={{ color: "var(--success)", flexShrink: 0 }} />
          : <AlertTriangle size={15} style={{ color: "var(--warning-foreground)", flexShrink: 0 }} />
        }
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px", minWidth: 0, flexWrap: "wrap" }}>
          <span style={{
            fontSize: "var(--text-sm)",
            fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
            color: isOk ? "var(--success)" : "var(--foreground)",
            fontFamily: "inherit", flexShrink: 0,
          }}>
            {sobre.nombre}
          </span>
          <span style={{ color: "var(--muted-foreground)", fontSize: "var(--text-xs)", flexShrink: 0 }}>—</span>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
            {sobre.descripcion}
          </span>
        </div>
        {!isOk && count > 0 && (
          <span style={{
            fontSize: "var(--text-2xs)",
            fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
            padding: "2px 10px",
            borderRadius: "var(--radius-chip)",
            background: "var(--destructive-subtle)",
            color: "var(--destructive)",
            border: "1px solid var(--destructive)",
            fontFamily: "inherit", flexShrink: 0,
          }}>
            {count} {count === 1 ? "incidencia" : "incidencias"}
          </span>
        )}
      </div>

      {/* Incidencia cards */}
      {count > 0 && (
        <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {sobre.incidencias.map((inc, idx) => (
            <IncidenciaCard key={idx} inc={inc} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── AppSobresContent ──────────────────────────────────────────────────────────

interface AppSobresContentProps {
  oppId:   string;
  oppName: string;
}

export function AppSobresContent({ oppId, oppName }: AppSobresContentProps) {
  const [phase,            setPhase]            = useState<ControlPhase>("idle");
  const [controlData,      setControlData]      = useState<PersistedControl | null>(null);
  const [uploadedPackage,  setUploadedPackage]  = useState<UploadedPackage | null>(null);
  const [isDragOver,       setIsDragOver]       = useState(false);
  const [validationBanner, setValidationBanner] = useState<string | null>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const { isReadOnly } = useWorkspaceReadonly();

  // ── File / folder handling ──

  const processZipFile = useCallback((file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (ext !== "zip") { setValidationBanner("Solo se aceptan archivos .zip o carpetas."); return; }
    if (file.size > 500 * 1024 * 1024) { setValidationBanner("El archivo no puede superar los 500 MB."); return; }
    setValidationBanner(null);
    setUploadedPackage({ name: file.name, size: file.size, isFolder: false });
  }, []);

  const handleZipInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processZipFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const item  = e.dataTransfer.items?.[0];
    const entry = item?.webkitGetAsEntry?.();
    if (entry?.isDirectory) {
      setValidationBanner(null);
      setUploadedPackage({ name: entry.name, size: null, isFolder: true });
      return;
    }
    const file = e.dataTransfer.files?.[0];
    if (file) processZipFile(file);
  };

  const handleRemove = () => { setUploadedPackage(null); setValidationBanner(null); };

  const handleExecute = () => {
    if (!uploadedPackage) { setValidationBanner("Debes cargar un archivo .zip o una carpeta para ejecutar el control."); return; }
    setValidationBanner(null);
    setPhase("loading");
    setTimeout(() => {
      const data = buildMockControlResult(
        uploadedPackage.name, uploadedPackage.isFolder, getAuthUser().name, today(),
      );
      setControlData(data);
      setPhase("done");
    }, 2800);
  };

  const handleRerun = () => { setUploadedPackage(null); setValidationBanner(null); setPhase("idle"); };

  const isDone    = phase === "done";
  const isLoading = phase === "loading";
  const canRun    = !!uploadedPackage && !isReadOnly;

  const totalIncidencias = controlData
    ? controlData.sobres.reduce((n, s) => n + s.incidencias.length, 0)
    : 0;

  const resultBorderColor =
    controlData?.controlStatus === "FAVORABLE"   ? "var(--success)" :
    controlData?.controlStatus === "NO_FAVORABLE" ? "var(--destructive)" :
    "var(--border)";

  // ── Shared wrappers ──
  const CardWrap = ({ children }: { children: ReactNode }) => (
    <div className="bg-card border border-border" style={{ borderRadius: "var(--radius)" }}>
      {children}
    </div>
  );

  const BlockHeader = ({ title, subtitle }: { title: ReactNode; subtitle?: string }) => (
    <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
      <p style={{
        fontSize: "var(--text-sm)",
        fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
        color: "var(--foreground)", fontFamily: "inherit", marginBottom: subtitle ? "3px" : 0,
      }}>
        {title}
      </p>
      {subtitle && (
        <p style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
          {subtitle}
        </p>
      )}
    </div>
  );

  return (
    <div style={{ padding: "32px 40px", maxWidth: "860px" }}>

      {/* ── Tool header ── */}
      <div className="flex items-start gap-4 mb-8">
        <div
          className="bg-muted text-primary flex items-center justify-center flex-shrink-0"
          style={{ width: "48px", height: "48px", borderRadius: "var(--radius)" }}
        >
          <CheckSquare size={24} />
        </div>
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 style={{ fontSize: "var(--text-xl)" }}>Control de contenido de sobres</h3>
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
          <p className="text-muted-foreground" style={{ fontSize: "var(--text-sm)", maxWidth: "580px", fontFamily: "inherit", lineHeight: "1.55" }}>
            Verifica que cada sobre contiene exactamente los documentos requeridos por el pliego —
            sin omisiones ni excesos — y detecta posibles contaminaciones de información entre sobres.
          </p>
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--border)", marginBottom: "28px" }} />

      {/* ── Validation banner ── */}
      {validationBanner && (
        <div className="flex items-start gap-3 mb-6" style={{
          padding: "11px 14px", borderRadius: "var(--radius-banner)",
          background: "var(--warning-subtle)", border: "1px solid var(--warning)",
        }}>
          <AlertCircle size={14} style={{ color: "var(--warning-foreground)", flexShrink: 0, marginTop: "2px" }} />
          <p style={{ fontSize: "var(--text-xs)", color: "var(--warning-foreground)", fontFamily: "inherit", lineHeight: "1.5", flex: 1 }}>
            {validationBanner}
          </p>
          <button onClick={() => setValidationBanner(null)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}>
            <X size={13} style={{ color: "var(--muted-foreground)" }} />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          DONE VIEW
      ══════════════════════════════════════════════ */}
      {isDone && controlData ? (
        <div className="flex flex-col gap-5">

          {/* Audit line */}
          <div className="flex items-center gap-2 flex-wrap" style={{
            padding: "7px 12px", borderRadius: "var(--radius-banner)",
            background: "var(--neutral-subtle)", border: "1px solid var(--border)",
            alignSelf: "flex-start",
          }}>
            <User size={12} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
            <span style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
              Último control:{" "}
              <strong style={{ color: "var(--foreground)", fontFamily: "inherit" }}>{controlData.executedAt}</strong>
              {" "}— Ejecutado por{" "}
              <strong style={{ color: "var(--foreground)", fontFamily: "inherit" }}>{controlData.executedBy}</strong>
            </span>
            {controlData.packageName && (
              <>
                <span style={{ color: "var(--border)" }}>·</span>
                <span style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
                  {controlData.packageIsFolder ? "📁 " : "🗜 "}{controlData.packageName}
                </span>
              </>
            )}
          </div>

          {/* Result card */}
          <div className="bg-card border border-border" style={{
            borderRadius: "var(--radius)",
            borderTop: `3px solid ${resultBorderColor}`,
            overflow: "hidden",
          }}>
            {/* Card header */}
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
              <p style={{
                fontSize: "var(--text-sm)",
                fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                color: "var(--foreground)", fontFamily: "inherit",
              }}>
                Resultado del análisis
              </p>
            </div>

            {/* Status band */}
            <ControlStatusBand status={controlData.controlStatus} />

            {/* Per-sobre rows */}
            <div>
              {controlData.sobres.map((sobre, idx) => (
                <div key={sobre.id} style={{
                  borderBottom: idx < controlData.sobres.length - 1 ? "1px solid var(--border)" : undefined,
                }}>
                  <SobreRow sobre={sobre} />
                </div>
              ))}
            </div>

            {/* Contamination section */}
            <div style={{ borderTop: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2" style={{
                padding: "11px 18px",
                background: controlData.contaminaciones.length > 0 ? "var(--destructive-subtle)" : "var(--success-subtle)",
                borderBottom: controlData.contaminaciones.length > 0 ? "1px solid var(--border)" : undefined,
              }}>
                {controlData.contaminaciones.length === 0
                  ? <CheckCircle2 size={14} style={{ color: "var(--success)", flexShrink: 0 }} />
                  : <AlertTriangle size={14} style={{ color: "var(--warning-foreground)", flexShrink: 0 }} />
                }
                <span style={{
                  flex: 1,
                  fontSize: "var(--text-xs)",
                  fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                  color: controlData.contaminaciones.length > 0 ? "var(--destructive)" : "var(--success)",
                  fontFamily: "inherit",
                }}>
                  {controlData.contaminaciones.length === 0
                    ? "No se detecta contaminación entre sobres"
                    : `Contaminación entre sobres — ${controlData.contaminaciones.length} incidencia${controlData.contaminaciones.length > 1 ? "s" : ""} detectada${controlData.contaminaciones.length > 1 ? "s" : ""}`}
                </span>
                {controlData.contaminaciones.length > 0 && (
                  <span style={{
                    fontSize: "var(--text-2xs)",
                    fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                    padding: "2px 10px", borderRadius: "var(--radius-chip)",
                    background: "var(--destructive-subtle)", color: "var(--destructive)",
                    border: "1px solid var(--destructive)",
                    fontFamily: "inherit", flexShrink: 0,
                  }}>
                    {controlData.contaminaciones.length} {controlData.contaminaciones.length === 1 ? "incidencia" : "incidencias"}
                  </span>
                )}
              </div>

              {controlData.contaminaciones.length > 0 && (
                <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  {controlData.contaminaciones.map((con, idx) => (
                    <IncidenciaCard key={idx} inc={con} showSobreTag />
                  ))}
                </div>
              )}
            </div>

            {/* Disclaimer */}
            <div className="flex items-start gap-2" style={{
              padding: "11px 18px",
              background: "var(--neutral-subtle)",
              borderTop: "1px solid var(--border)",
            }}>
              <Info size={12} style={{ color: "var(--muted-foreground)", flexShrink: 0, marginTop: "2px" }} />
              <p style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit", lineHeight: "1.6" }}>
                Este análisis automatizado es una herramienta de apoyo. Es responsabilidad del equipo
                revisar manualmente la documentación antes de la entrega oficial para garantizar que no
                exista contaminación de sobres.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            {!isReadOnly && (
              <AppButton variant="primary" icon={<RefreshCw size={13} />} onClick={handleRerun}>
                Nuevo control
              </AppButton>
            )}
            {totalIncidencias > 0 && (
              <AppButton
                variant="secondary"
                icon={<FileDown size={13} />}
                onClick={() => downloadIncidenciasWord(controlData, oppName)}
              >
                Descargar informe Word
              </AppButton>
            )}
            {!isReadOnly && (
              <p style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
                Deberás cargar el paquete de nuevo para ejecutar un nuevo control.
              </p>
            )}
          </div>

        </div>

      ) : (
        /* ══════════════════════════════════════════════
            IDLE / LOADING VIEW
        ══════════════════════════════════════════════ */
        <div className="flex flex-col gap-5">

          {/* Bloque 1: Carga del paquete */}
          <CardWrap>
            <BlockHeader
              title="Carga del paquete de entrega"
              subtitle={isReadOnly
                ? "Oportunidad entregada. No se puede cargar documentación."
                : "Sube la carpeta o archivo .zip con la estructura final de sobres que se pretende entregar."}
            />
            <div style={{ padding: "20px" }}>
              {isReadOnly ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: "var(--radius-banner)" }}>
                  <Lock size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>La carga de documentación está deshabilitada en modo histórico.</span>
                </div>
              ) : !uploadedPackage ? (
                <>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => !isLoading && zipInputRef.current?.click()}
                    style={{
                      border: `2px dashed ${isDragOver ? "var(--primary)" : "var(--border)"}`,
                      borderRadius: "var(--radius-input)",
                      background: isDragOver ? "var(--primary-subtle)" : "var(--muted)",
                      padding: "36px 20px",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: "10px",
                      cursor: isLoading ? "not-allowed" : "pointer",
                      transition: "border-color 0.15s, background 0.15s",
                      marginBottom: "14px",
                    }}
                  >
                    <UploadCloud size={28} style={{ color: isDragOver ? "var(--primary)" : "var(--muted-foreground)" }} />
                    <div style={{ textAlign: "center" }}>
                      <p style={{ fontSize: "var(--text-sm)", color: "var(--foreground)", fontFamily: "inherit", marginBottom: "4px" }}>
                        Arrastra aquí la carpeta de sobres o el .zip, o{" "}
                        <span style={{
                          color: "var(--primary)",
                          fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                          fontFamily: "inherit",
                        }}>
                          selecciona un archivo
                        </span>
                      </p>
                      <p style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>Máximo 500 MB</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>Formatos aceptados:</span>
                    {[".zip", "carpeta"].map((label) => (
                      <span key={label} style={{
                        fontSize: "var(--text-2xs)",
                        fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                        padding: "2px 8px", borderRadius: "var(--radius-chip)",
                        background: "var(--neutral-subtle)", color: "var(--muted-foreground)",
                        fontFamily: "inherit", letterSpacing: "0.03em",
                      }}>
                        {label}
                      </span>
                    ))}
                  </div>

                  <input ref={zipInputRef} type="file" accept=".zip" style={{ display: "none" }} onChange={handleZipInputChange} />
                </>
              ) : (
                <div className="flex items-center gap-3" style={{
                  padding: "10px 14px", borderRadius: "var(--radius-input)",
                  border: "1px solid var(--border)", background: "var(--card)",
                }}>
                  <div style={{
                    width: "34px", height: "34px", borderRadius: "var(--radius)",
                    background: "var(--primary-subtle)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    {uploadedPackage.isFolder
                      ? <FolderOpen size={15} style={{ color: "var(--primary)" }} />
                      : <Archive    size={15} style={{ color: "var(--primary)" }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: "var(--text-xs)",
                      fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                      color: "var(--foreground)", fontFamily: "inherit",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {uploadedPackage.name}
                    </p>
                    <p style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
                      {uploadedPackage.isFolder ? "Carpeta" : ".ZIP"} · {formatBytes(uploadedPackage.size)}
                    </p>
                  </div>
                  <button onClick={handleRemove} title="Eliminar"
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", flexShrink: 0, display: "flex", alignItems: "center" }}>
                    <X size={14} style={{ color: "var(--muted-foreground)" }} />
                  </button>
                </div>
              )}
            </div>
          </CardWrap>

          {/* Bloque 2: Acción */}
          <CardWrap>
            <div style={{ padding: "20px 24px" }}>
              {isLoading ? (
                <div className="flex items-center gap-4">
                  <Loader2 size={18} className="animate-spin" style={{ color: "var(--primary)", flexShrink: 0 }} />
                  <div>
                    <p style={{
                      fontSize: "var(--text-sm)",
                      fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                      color: "var(--foreground)", fontFamily: "inherit", marginBottom: "2px",
                    }}>
                      Ejecutando control de sobres…
                    </p>
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
                      Analizando estructura y validando contenido según pliego…
                    </p>
                  </div>
                </div>
              ) : isReadOnly && phase === "idle" ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: "var(--radius-banner)" }}>
                  <Lock size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>No ejecutado antes de marcar como Entregada.</span>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <AppButton variant="primary" icon={<Sparkles size={14} />} disabled={!canRun} onClick={handleExecute}>
                    Control de contenidos
                  </AppButton>
                  {!uploadedPackage && !isReadOnly && (
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
                      Carga el paquete de entrega para activar el control.
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardWrap>

        </div>
      )}
    </div>
  );
}