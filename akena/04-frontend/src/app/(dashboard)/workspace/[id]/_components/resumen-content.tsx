// Next.js equivalent: app/(dashboard)/workspace/[id]/_components/resumen-content.tsx
// Resumen Ejecutivo + Chatbot de la oferta técnica.
// Bloque 1: sube oferta (docx/pdf), elige extensión (1-15 pp) y genera resumen editable.
// Bloque 2: genera chatbot con URL copiable por oportunidad.
// Persistencia colectiva por oppId. CSS variables del design system.
"use client";

import { useState, useRef, useCallback, useEffect, type CSSProperties, type ReactNode, type DragEvent, type ChangeEvent } from "react";
import {
  BookOpen, UploadCloud, FileText, X, Sparkles, Loader2,
  RefreshCw, FileDown, AlertCircle, User, Bot, Copy, Check,
  ChevronDown, Link, Lock,
} from "lucide-react";
import { AppButton } from "../../../../_components/ui";
import { getAuthUser } from "../../../../_components/auth-store";
import { useWorkspaceReadonly } from "./workspace-readonly-context";
import { analyzeFile, type AnalysisDepth } from "../../../../../services/pliegoService";
import { getFiles } from "../../../../../services/pliegoFileStore";

// ─── Types ──────────────────────────────────────────────────────────────────────

type ResumenPhase  = "idle" | "loading" | "done";
type ChatbotPhase  = "idle" | "loading" | "done";

interface UploadedFile {
  name: string;
  size: number;
  ext: string;
}

interface PersistedResumen {
  content:     string;
  pages:       number;
  generatedAt: string;
  generatedBy: string;
  fileName:    string;
}

interface PersistedChatbot {
  url:       string;
  createdAt: string;
  createdBy: string;
}

// ─── Storage ────────────────────────────────────────────────────────────────────
// Sin persistencia — el oppId viene del parámetro de URL.
// BACKEND HOOK: cuando exista API, leer/escribir aquí con el oppId como clave.

// ─── Helpers ────────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function today(): string {
  return new Date().toLocaleDateString("es-ES", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function buildChatbotUrl(oppId: string): string {
  const slug = oppId.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
  return `https://akena.ai/chatbot/${slug}`;
}

// ─── Mock resumen builder ────────────────────────────────────────────────────────
// BACKEND HOOK: reemplazar esta función con la llamada al API cuando esté disponible.

function buildMockResumen(
  oppName: string,
  oppId:   string,
  fileName: string,
  pages:   number,
): string {
  return `RESUMEN EJECUTIVO — ${oppName}
Referencia: ${oppId}  ·  Documento base: ${fileName}
Extensión objetivo: ${pages} página${pages > 1 ? "s" : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. CONTEXTO Y OBJETIVO

El presente documento constituye el resumen ejecutivo de la oferta técnica presentada por Accenture a la licitación ${oppName}. El organismo contratante persigue la modernización y transformación digital de sus procesos operativos núcleo, con especial énfasis en la integración de sistemas legados (SAP S/4HANA, GESINV) y la adopción de un modelo de gobernanza ágil orientado a resultados.

Accenture propone una solución integral sustentada en su metodología SynOps y su experiencia consolidada en el sector público, que garantiza la continuidad operativa durante la transición y un retorno de inversión cuantificable en el horizonte de los 24 meses posteriores a la puesta en producción.

(Incluir imagen existente del apartado "Introducción y contexto", página 3 de la oferta técnica.
Justificación: el mapa de actores institucionales y sistemas existentes del cliente sintetiza visualmente el punto de partida del proyecto y apoya el encuadre estratégico del resumen.)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2. METODOLOGÍA PROPUESTA

La metodología se articula en tres fases secuenciales: (i) Diagnóstico y arquitectura de solución (Meses 1-3); (ii) Implementación iterativa por dominios funcionales (Meses 4-18); (iii) Estabilización, transferencia de conocimiento y cierre (Meses 19-24). Cada fase culmina en un comité de aceptación formal con el cliente.

La gestión del proyecto se ejecuta bajo el marco SAFe 6.0 adaptado al PPT, con sprints quincenales, tablero Kanban compartido y reporting mensual al órgano de contratación conforme al modelo de seguimiento definido en el pliego.

(Incluir imagen existente del apartado "Metodología — Fases del proyecto", página 12 de la oferta técnica.
Justificación: el diagrama de fases con hitos y entregables por sprint condensa en un solo golpe de vista la propuesta metodológica completa, evitando la repetición de texto.)

(Se recomienda crear un diagrama de Gantt ejecutivo que muestre las tres fases principales, los hitos contractuales clave y los entregables críticos por trimestre. Incluir: nombre de fase, duración en semanas, responsable funcional, entregable asociado y criterio de aceptación.
Justificación: los tribunales técnicos de este organismo han valorado en licitaciones previas las planificaciones visuales ejecutivas que diferencien hitos de gestión de hitos técnicos.)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

3. EQUIPO Y ORGANIZACIÓN

El equipo propuesto está compuesto por 12 profesionales de Accenture con dedicación mínima del 80%, liderados por un Director de Proyecto certificado PMP y PRINCE2 con más de 15 años de experiencia en proyectos de transformación digital en la Administración General del Estado. Se adscriben los perfiles obligatorios establecidos en el PPT (Anexo IV) y tres perfiles complementarios de alto valor añadido: Arquitecto de Seguridad (ISO 27001 Lead Implementer), Especialista en Integración SAP y Data Engineer certificado en Azure.

(Incluir imagen existente del apartado "Equipo — Organigrama del proyecto", página 28 de la oferta técnica.
Justificación: el organigrama de dedicación y roles condensa la propuesta de gobierno del proyecto y facilita la lectura ejecutiva sin necesidad de describir textualmente cada perfil.)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

4. ARQUITECTURA Y SOLUCIÓN TECNOLÓGICA

La arquitectura propuesta sigue un modelo cloud-hybrid sobre Azure Government Cloud, con separación de capas de presentación, lógica de negocio y datos. La integración con los sistemas legados del organismo (SAP S/4HANA R2, GESINV 3.2) se realiza mediante una capa de API Management con autenticación OAuth 2.0 y cifrado TLS 1.3 end-to-end.

Los componentes principales: Portal de ciudadano (React + Azure Static Web Apps), Backend de servicios (Node.js + Azure Functions), Capa de integración (Azure API Management + Logic Apps) y Data Platform (Azure Synapse Analytics).

(Se recomienda crear un diagrama de arquitectura end-to-end que muestre los bloques funcionales principales, los flujos de integración con SAP S/4HANA y GESINV, los mecanismos de seguridad perimetral y los componentes cloud. Incluir: nombre de cada componente, tecnología asociada, protocolo de integración (REST/SOAP/batch) y clasificación del dato (público/restringido/confidencial).
Justificación: la ausencia de un diagrama de arquitectura completo fue identificada como debilidad en la evaluación técnica preliminar. Su inclusión en el resumen ejecutivo refuerza la credibilidad técnica ante el tribunal.)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

5. PLANIFICACIÓN Y ENTREGABLES

El cronograma de ejecución se distribuye en 24 meses con 6 fases de entrega validadas con el cliente. Los hitos contractuales principales son: Acta de inicio (M0), Arquitectura de solución validada (M3), Primer dominio funcional en producción (M8), Plataforma completa integrada (M18) y Cierre y transferencia (M24).

El plan de gestión de riesgos identifica 12 riesgos con probabilidad e impacto cuantificados, de los cuales 3 son clasificados como críticos y cuentan con planes de contingencia activables de forma autónoma por el equipo sin escalado al órgano contratante.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

6. PROPUESTA DE VALOR DIFERENCIAL

Accenture aporta tres elementos diferenciales únicos en esta licitación:

▸  Acelerador propietario AkenaGov™: framework de configuración rápida para organismos públicos que reduce en un 35% el tiempo de puesta en marcha. Certificado por la Agencia Digital de la Administración Pública (ADAP).

▸  Centro de Excelencia AGE (CoE-AGE): equipo especializado de 45 profesionales con dedicación exclusiva a proyectos de la Administración General del Estado, con 23 proyectos adjudicados en los últimos 4 años y satisfacción del 94%.

▸  Garantía de continuidad operativa 99,9%: SLA contractual con penalizaciones económicas definidas, sin coste adicional para el organismo contratante.

(Se recomienda crear una infografía comparativa de los tres diferenciadores principales frente a la oferta estándar del sector, con métricas cuantitativas y referencias a proyectos equivalentes adjudicados.
Justificación: el análisis del histórico del cliente indica que el tribunal valora especialmente las evidencias cuantificadas de ventaja competitiva en los criterios B5 y B6.)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

7. RIESGOS Y MITIGACIÓN

⚠  Disponibilidad del entorno SAP (prob.: media / impacto: alto): Accenture dispone de un sandbox SAP S/4HANA equivalente para desarrollo y pruebas, eliminando la dependencia del entorno del cliente en fases tempranas.

⚠  Rotación de personal clave (prob.: baja / impacto: alto): todos los perfiles clave tienen sustituto identificado con el mismo nivel de seniority. El plan de sustitución se activa en un máximo de 5 días hábiles.

⚠  Cambios normativos durante la ejecución (prob.: media / impacto: medio): especialista en normativa de contratación pública y RGPD con dedicación parcial permanente durante todo el contrato.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

8. CIERRE EJECUTIVO

La propuesta de Accenture representa la opción con mayor garantía de éxito para la modernización del organismo contratante: combina la experiencia sectorial más extensa del mercado en transformación digital de la AGE, una metodología contrastada y adaptada al PPT, un equipo de primer nivel con dedicación verificable, y un compromiso de continuidad operativa contractualmente garantizado.

Accenture considera que esta oferta cumple todos los requisitos de admisión, supera los umbrales técnicos de los criterios de juicio de valor y está posicionada para obtener la puntuación técnica más alta del panel de licitadores.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Resumen ejecutivo generado automáticamente por Akena · Accenture
`;
}

// ─── AppResumenContent ──────────────────────────────────────────────────────────

interface AppResumenContentProps {
  oppId:   string;
  oppName: string;
}

export function AppResumenContent({ oppId, oppName }: AppResumenContentProps) {
  const [resumenPhase,   setResumenPhase]   = useState<ResumenPhase>("idle");
  const [resumenData,    setResumenData]    = useState<PersistedResumen | null>(null);
  const [resumenContent, setResumenContent] = useState<string>("");
  const [uploadedFile,   setUploadedFile]   = useState<UploadedFile | null>(null);
  const [isDragOver,     setIsDragOver]     = useState(false);
  const [depth, setDepth] = useState<AnalysisDepth>("medio");
  const fileRef = useRef<File | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [chatbotPhase, setChatbotPhase] = useState<ChatbotPhase>("idle");
  const [chatbotData,  setChatbotData]  = useState<PersistedChatbot | null>(null);
  const [copied,       setCopied]       = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const ACCEPTED = ["docx", "pdf"];
  const { isReadOnly } = useWorkspaceReadonly();

  // ── Pre-load pliegos uploaded during "alta" (in-memory store) ──────────────
  useEffect(() => {
    if (resumenPhase !== "idle" || uploadedFile) return;
    const stored = getFiles(oppId);
    if (!stored) return;
    // Pick the first PDF or DOCX found — prefer PCAP/PPT by name heuristic
    const pliego = stored.find(f => /\.(pdf|docx)$/i.test(f.name)) ?? stored[0];
    if (!pliego) return;
    const ext = pliego.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["pdf", "docx"].includes(ext)) return;
    fileRef.current = pliego;
    setUploadedFile({ name: pliego.name, size: pliego.size, ext });
    setBanner(`📎 Pliego precargado desde el alta: "${pliego.name}". Pulsa "Analizar Pliego" cuando estés listo.`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oppId]);

  // ── File handling ──
  const processFile = useCallback((file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ACCEPTED.includes(ext)) {
      setBanner("Solo se aceptan archivos .docx y .pdf.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setBanner("El archivo no puede superar los 50 MB.");
      return;
    }
    fileRef.current = file;
    setUploadedFile({ name: file.name, size: file.size, ext });
  }, []);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
    e.target.value = "";
  };

  const handleRemoveFile = () => {
    fileRef.current = null;
    setUploadedFile(null);
    setBanner(null);
  };

  // ── Generate resumen — llama al agent-pliego real ──
  const handleGenerate = useCallback(async () => {
    if (!uploadedFile || !fileRef.current) {
      setBanner("Adjunta el pliego (.docx o .pdf) antes de generar el análisis.");
      return;
    }
    setBanner(null);
    setResumenPhase("loading");

    const sessionId = `pliego:${oppId}:${Date.now()}`;
    abortRef.current = new AbortController();

    try {
      const result = await analyzeFile(
        fileRef.current,
        depth,
        sessionId,
        abortRef.current.signal,
      );
      const date     = today();
      const userName = getAuthUser().name;
      const data: PersistedResumen = {
        content:     result.analysis,
        pages:       depth === "breve" ? 3 : depth === "medio" ? 6 : 12,
        generatedAt: date,
        generatedBy: userName,
        fileName:    uploadedFile.name,
      };
      setResumenData(data);
      setResumenContent(result.analysis);
      setResumenPhase("done");
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "No se pudo conectar con el agente de análisis. Comprueba que el servicio está arrancado.";
      setBanner(msg);
      setResumenPhase("idle");
    }
  }, [uploadedFile, oppId, depth]);

  // ── Regenerate ──
  const handleRegenerate = () => {
    abortRef.current?.abort();
    fileRef.current = null;
    setUploadedFile(null);
    setBanner(null);
    setResumenPhase("idle");
  };

  // ── Save edits on blur — actualiza solo el estado en memoria ──
  const handleContentBlur = () => {
    if (resumenData) {
      setResumenData({ ...resumenData, content: resumenContent });
    }
  };

  // ── Download resumen ──
  const handleDownload = () => {
    const safe     = oppName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
    const filename = `AnalisisPliego_${safe}_${oppId}.docx`;
    const mime     = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const blob     = new Blob([resumenContent], { type: mime });
    const url      = URL.createObjectURL(blob);
    const a        = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  // ── Create chatbot ──
  const canCreateChatbot = resumenPhase === "done" || !!uploadedFile;

  const handleCreateChatbot = () => {
    if (!canCreateChatbot) {
      setBanner("Carga la oferta técnica para poder generar el chatbot.");
      return;
    }
    setBanner(null);
    setChatbotPhase("loading");
    setTimeout(() => {
      const date     = today();
      const userName = getAuthUser().name;
      const data: PersistedChatbot = {
        url:       buildChatbotUrl(oppId),
        createdAt: date,
        createdBy: userName,
      };
      setChatbotData(data);
      setChatbotPhase("done");
    }, 2200);
  };

  const handleRegenerateChatbot = () => {
    setChatbotPhase("idle");
    setChatbotData(null);
  };

  // ── Copy URL ──
  const handleCopy = () => {
    if (!chatbotData?.url) return;
    navigator.clipboard.writeText(chatbotData.url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // fallback for non-secure contexts
      const ta = document.createElement("textarea");
      ta.value = chatbotData.url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const isResumenDone    = resumenPhase === "done";
  const isResumenLoading = resumenPhase === "loading";
  const isChatbotDone    = chatbotPhase === "done";
  const isChatbotLoading = chatbotPhase === "loading";

  // ─── Shared wrappers ───────────────────────────────────────────────────────
  const CardWrap = ({ children }: { children: ReactNode }) => (
    <div
      className="bg-card border border-border"
      style={{ borderRadius: "var(--radius)" }}
    >
      {children}
    </div>
  );

  const BlockHeader = ({
    title,
    subtitle,
    rightSlot,
  }: {
    title: ReactNode;
    subtitle?: string;
    rightSlot?: ReactNode;
  }) => (
    <div
      className="flex items-start justify-between"
      style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}
    >
      <div>
        <p
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
            color: "var(--foreground)",
            fontFamily: "inherit",
            marginBottom: subtitle ? "3px" : 0,
          }}
        >
          {title}
        </p>
        {subtitle && (
          <p style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
            {subtitle}
          </p>
        )}
      </div>
      {rightSlot}
    </div>
  );

  // ─── AuditPill ────────────────────────────────────────────────────────────
  const AuditPill = ({
    label,
    date,
    by,
    extra,
  }: {
    label: string;
    date: string;
    by: string;
    extra?: string;
  }) => (
    <div
      className="flex items-center gap-2 flex-wrap"
      style={{
        padding: "7px 12px",
        borderRadius: "var(--radius-banner)",
        background: "var(--neutral-subtle)",
        border: "1px solid var(--border)",
        alignSelf: "flex-start",
      }}
    >
      <User size={12} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
      <span style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
        {label}{" "}
        <strong style={{ color: "var(--foreground)", fontFamily: "inherit" }}>{date}</strong>
        {" "}— por{" "}
        <strong style={{ color: "var(--foreground)", fontFamily: "inherit" }}>{by}</strong>
      </span>
      {extra && (
        <>
          <span style={{ color: "var(--border)" }}>·</span>
          <span style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
            {extra}
          </span>
        </>
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
          <BookOpen size={24} />
        </div>
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 style={{ fontSize: "var(--text-xl)" }}>Resumen Ejecutivo</h3>
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
              }}
            >
              Calidad
            </span>
          </div>
          <p
            className="text-muted-foreground"
            style={{ fontSize: "var(--text-sm)", maxWidth: "580px", fontFamily: "inherit", lineHeight: "1.55" }}
          >
            Analiza automáticamente el pliego de contratación pública: alcance, presupuesto, criterios
            de valoración, solvencia, perfiles requeridos y resumen ejecutivo para dirección.
          </p>
        </div>
      </div>

      {/* ── Divider ── */}
      <div style={{ borderTop: "1px solid var(--border)", marginBottom: "28px" }} />

      {/* ── Validation / info banner ── */}
      {banner && (() => {
        const isInfo = banner.startsWith("📎");
        return (
          <div
            className="flex items-start gap-3 mb-6"
            style={{
              padding: "11px 14px",
              borderRadius: "var(--radius-banner)",
              background: isInfo ? "var(--success-subtle)" : "var(--warning-subtle)",
              border: `1px solid ${isInfo ? "var(--success)" : "var(--warning)"}`,
            }}
          >
            <AlertCircle size={14} style={{ color: isInfo ? "var(--success)" : "var(--warning-foreground)", flexShrink: 0, marginTop: "2px" }} />
            <p style={{ fontSize: "var(--text-xs)", color: isInfo ? "var(--success)" : "var(--warning-foreground)", fontFamily: "inherit", lineHeight: "1.5", flex: 1 }}>
              {banner}
            </p>
            <button
              onClick={() => setBanner(null)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "0", flexShrink: 0 }}
            >
              <X size={13} style={{ color: "var(--muted-foreground)" }} />
            </button>
          </div>
        );
      })()}

      {/* ════════════════════════════════════════════════
          BLOQUE 1 — RESUMEN EJECUTIVO
      ════════════════════════════════════════════════ */}

      {/* ── Section label ── */}
      <div className="flex items-center gap-3 mb-5">
        <div
          style={{
            width: "20px",
            height: "20px",
            borderRadius: "var(--radius)",
            background: "var(--primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: "var(--text-3xs)",
              fontWeight: "var(--font-weight-bold)" as CSSProperties["fontWeight"],
              color: "var(--primary-foreground)",
              fontFamily: "inherit",
            }}
          >
            1
          </span>
        </div>
        <p
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
            color: "var(--foreground)",
            fontFamily: "inherit",
          }}
        >
          Análisis del Pliego
        </p>
      </div>

      {isResumenDone && resumenData ? (
        /* ── DONE: result view ── */
        <div className="flex flex-col gap-5">

          <AuditPill
            label="Última versión generada el"
            date={resumenData.generatedAt}
            by={resumenData.generatedBy}
            extra={resumenData.fileName}
          />

          {/* Result card */}
          <CardWrap>
            <BlockHeader
              title={
                <span className="flex items-center gap-2">
                  <BookOpen size={14} style={{ color: "var(--primary)" }} />
                  Análisis del Pliego Generado
                </span>
              }
              subtitle={`Nivel: ${resumenData.pages >= 10 ? "Extenso" : resumenData.pages >= 5 ? "Medio" : "Breve"} · Editable`}
              rightSlot={
                <AppButton
                  variant="secondary"
                  size="sm"
                  icon={<FileDown size={12} />}
                  onClick={handleDownload}
                >
                  Descargar Resumen (.docx)
                </AppButton>
              }
            />
            <div style={{ padding: "20px" }}>
              <textarea
                value={resumenContent}
                onChange={(e) => setResumenContent(e.target.value)}
                onBlur={handleContentBlur}
                spellCheck={false}
                style={{
                  width: "100%",
                  minHeight: "600px",
                  padding: "16px",
                  borderRadius: "var(--radius-input)",
                  border: "1px solid var(--border)",
                  background: "var(--input-background)",
                  color: "var(--foreground)",
                  fontSize: "var(--text-xs)",
                  fontFamily: "inherit",
                  lineHeight: "1.75",
                  resize: "vertical",
                  outline: "none",
                }}
              />
              <p
                style={{
                  fontSize: "var(--text-2xs)",
                  color: "var(--muted-foreground)",
                  fontFamily: "inherit",
                  marginTop: "8px",
                }}
              >
                El contenido es editable. Los cambios se guardan automáticamente al salir del campo.
              </p>
            </div>
          </CardWrap>

          {/* Re-generate action — hidden in read-only */}
          {!isReadOnly && (
          <div className="flex items-center gap-4">
            <AppButton variant="primary" icon={<RefreshCw size={13} />} onClick={handleRegenerate}>
              Nuevo Análisis de Pliego
            </AppButton>
            <p style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
              Deberás adjuntar el pliego de nuevo para regenerar.
            </p>
          </div>
          )}
        </div>

      ) : (
        /* ── IDLE / LOADING: form view ── */
        isReadOnly ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: "var(--radius-banner)" }}>
            <Lock size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
            <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>No ejecutado antes de marcar como Entregada.</span>
          </div>
        ) : (
        <div className="flex flex-col gap-5">

          {/* Card A: Upload */}
          <CardWrap>
            <BlockHeader
              title="Cargar pliego"
              subtitle="Sube el PCAP, PPT o Anexos para generar el análisis estructurado."
            />
            <div style={{ padding: "20px" }}>
              {!uploadedFile ? (
                <>
                  {/* ── Drop zone ── */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                    style={{
                      border: `2px dashed ${isDragOver ? "var(--primary)" : "var(--border)"}`,
                      borderRadius: "var(--radius-input)",
                      background: isDragOver ? "var(--primary-subtle)" : "var(--muted)",
                      padding: "32px 20px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "10px",
                      marginBottom: "14px",
                      transition: "border-color 0.15s, background 0.15s",
                    }}
                  >
                    <UploadCloud size={28} style={{ color: isDragOver ? "var(--primary)" : "var(--muted-foreground)" }} />
                    <p style={{ fontSize: "var(--text-sm)", color: "var(--foreground)", fontFamily: "inherit", textAlign: "center" }}>
                      Arrastra aquí el pliego (PCAP / PPT / Anexos)
                    </p>
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
                      Máximo 50 MB · PDF o DOCX
                    </p>
                  </div>

                  {/* v4 — input nativo directo */}
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleInputChange}
                    title="Seleccionar pliego PDF o DOCX"
                    style={{
                      display: "block",
                      marginTop: "8px",
                      padding: "8px 12px",
                      border: "2px solid #6b21a8",
                      borderRadius: "6px",
                      background: "#f3e8ff",
                      color: "#3b0764",
                      fontSize: "14px",
                      fontFamily: "inherit",
                      cursor: "pointer",
                      width: "100%",
                      maxWidth: "340px",
                    }}
                  />
                </>
              ) : (
                <div
                  className="flex items-center gap-3"
                  style={{
                    padding: "10px 14px",
                    borderRadius: "var(--radius-input)",
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                  }}
                >
                  <div
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "var(--radius)",
                      background: uploadedFile.ext === "pdf"
                        ? "var(--warning-subtle)"
                        : "var(--accent-subtle)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <FileText
                      size={15}
                      style={{
                        color: uploadedFile.ext === "pdf"
                          ? "var(--warning-foreground)"
                          : "var(--accent)",
                      }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: "var(--text-xs)",
                        fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                        color: "var(--foreground)",
                        fontFamily: "inherit",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {uploadedFile.name}
                    </p>
                    <p style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
                      .{uploadedFile.ext.toUpperCase()} · {formatBytes(uploadedFile.size)}
                    </p>
                  </div>
                  <button
                    onClick={handleRemoveFile}
                    title="Eliminar"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "4px",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <X size={14} style={{ color: "var(--muted-foreground)" }} />
                  </button>
                </div>
              )}
            </div>
          </CardWrap>

          {/* Card B: Depth selector + action */}
          <CardWrap>
            <BlockHeader
              title="Nivel de profundidad del análisis"
              subtitle="Elige la extensión del informe según el tiempo disponible y el detalle requerido."
            />
            <div style={{ padding: "20px" }}>
              {/* Depth selector */}
              <div className="flex items-center gap-4" style={{ marginBottom: "20px" }}>
                <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                  <select
                    value={depth}
                    onChange={(e) => setDepth(e.target.value as AnalysisDepth)}
                    disabled={isResumenLoading}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-input)",
                      padding: "8px 40px 8px 12px",
                      background: "var(--input-background)",
                      color: "var(--foreground)",
                      fontSize: "var(--text-sm)",
                      fontFamily: "inherit",
                      cursor: isResumenLoading ? "not-allowed" : "pointer",
                      outline: "none",
                      appearance: "none",
                      WebkitAppearance: "none",
                      MozAppearance: "none",
                      minWidth: "200px",
                    }}
                  >
                    <option value="breve">Breve — hasta 1 500 palabras</option>
                    <option value="medio">Medio — hasta 3 000 palabras</option>
                    <option value="extenso">Extenso — hasta 5 000 palabras</option>
                  </select>
                  <ChevronDown
                    size={14}
                    style={{
                      position: "absolute",
                      right: "10px",
                      pointerEvents: "none",
                      color: "var(--muted-foreground)",
                    }}
                  />
                </div>
                <p style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
                  profundidad del informe
                </p>
              </div>

              {/* Divider */}
              <div style={{ borderTop: "1px solid var(--border)", marginBottom: "20px" }} />

              {/* Action */}
              {isResumenLoading ? (
                <div className="flex items-center gap-4">
                  <Loader2
                    size={18}
                    className="animate-spin"
                    style={{ color: "var(--primary)", flexShrink: 0 }}
                  />
                  <div>
                    <p
                      style={{
                        fontSize: "var(--text-sm)",
                        fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                        color: "var(--foreground)",
                        fontFamily: "inherit",
                        marginBottom: "2px",
                      }}
                    >
                      Analizando pliego con IA…
                    </p>
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
                      Extrayendo texto, estructurando secciones y generando el análisis. Puede tardar hasta 2 minutos según la extensión del pliego…
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <AppButton
                    variant="primary"
                    icon={<Sparkles size={14} />}
                    disabled={!uploadedFile}
                    onClick={handleGenerate}
                  >
                    Analizar Pliego
                  </AppButton>
                  {!uploadedFile && (
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
                      Carga el pliego para activar el análisis.
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardWrap>

        </div>
        )
      )}

      {/* ════════════════════════════════════════════════
          SEPARADOR ENTRE BLOQUES
      ════════════════════════════════════════════════ */}
      <div
        className="flex items-center gap-4"
        style={{ margin: "36px 0 32px" }}
      >
        <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
        <div
          className="flex items-center gap-2"
          style={{
            padding: "4px 14px",
            borderRadius: "var(--radius-chip)",
            border: "1px solid var(--border)",
            background: "var(--card)",
            flexShrink: 0,
          }}
        >
          <Bot size={12} style={{ color: "var(--muted-foreground)" }} />
          <span
            style={{
              fontSize: "var(--text-2xs)",
              color: "var(--muted-foreground)",
              fontFamily: "inherit",
              letterSpacing: "0.04em",
              fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
            }}
          >
            CHATBOT
          </span>
        </div>
        <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
      </div>

      {/* ════════════════════════════════════════════════
          BLOQUE 2 — CHATBOT DE LA OFERTA TÉCNICA
      ════════════════════════════════════════════════ */}

      {/* Section label */}
      <div className="flex items-center gap-3 mb-5">
        <div
          style={{
            width: "20px",
            height: "20px",
            borderRadius: "var(--radius)",
            background: "var(--primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: "var(--text-3xs)",
              fontWeight: "var(--font-weight-bold)" as CSSProperties["fontWeight"],
              color: "var(--primary-foreground)",
              fontFamily: "inherit",
            }}
          >
            2
          </span>
        </div>
        <p
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
            color: "var(--foreground)",
            fontFamily: "inherit",
          }}
        >
          Creación del Chatbot de la Oferta Técnica
        </p>
      </div>

      <div className="flex flex-col gap-5">

        {/* Chatbot description card */}
        <CardWrap>
          <div style={{ padding: "20px" }}>
            <div className="flex items-start gap-4">
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "var(--radius)",
                  background: "var(--accent-subtle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Bot size={18} style={{ color: "var(--accent)" }} />
              </div>
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    fontSize: "var(--text-sm)",
                    fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                    color: "var(--foreground)",
                    fontFamily: "inherit",
                    marginBottom: "6px",
                  }}
                >
                  Chatbot de consulta sobre la oferta técnica
                </p>
                <p style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit", lineHeight: "1.55" }}>
                  Genera un chatbot inteligente basado en el contenido completo de la oferta para
                  facilitar la consulta durante la valoración del cliente. El chatbot responde preguntas
                  sobre la propuesta técnica, el equipo, la metodología y los diferenciadores sin necesidad
                  de que el evaluador consulte directamente el documento.
                </p>
              </div>
            </div>
          </div>
        </CardWrap>

        {/* Chatbot action / result card */}
        <CardWrap>
          {isChatbotDone && chatbotData ? (
            <>
              <BlockHeader
                title={
                  <span className="flex items-center gap-2">
                    <Link size={14} style={{ color: "var(--accent)" }} />
                    Chatbot generado
                  </span>
                }
                subtitle="Enlace activo y copiable. Solo existe un chatbot por oportunidad."
              />
              <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* URL row */}
                <div className="flex items-center gap-2">
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "9px 12px",
                      borderRadius: "var(--radius-input)",
                      border: "1px solid var(--border)",
                      background: "var(--muted)",
                      overflow: "hidden",
                    }}
                  >
                    <Link size={13} style={{ color: "var(--accent)", flexShrink: 0 }} />
                    <span
                      style={{
                        fontSize: "var(--text-xs)",
                        color: "var(--foreground)",
                        fontFamily: "monospace",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {chatbotData.url}
                    </span>
                  </div>
                  <button
                    onClick={handleCopy}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "9px 14px",
                      borderRadius: "var(--radius-button)",
                      border: `1px solid ${copied ? "var(--success)" : "var(--border)"}`,
                      background: copied ? "var(--success-subtle)" : "var(--card)",
                      color: copied ? "var(--success)" : "var(--foreground)",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      flexShrink: 0,
                    }}
                  >
                    {copied ? (
                      <Check size={13} />
                    ) : (
                      <Copy size={13} />
                    )}
                    <span
                      style={{
                        fontSize: "var(--text-xs)",
                        fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                        fontFamily: "inherit",
                      }}
                    >
                      {copied ? "Copiado" : "Copiar enlace"}
                    </span>
                  </button>
                </div>

                {/* Audit + regenerate row */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <AuditPill
                    label="Chatbot generado el"
                    date={chatbotData.createdAt}
                    by={chatbotData.createdBy}
                  />
                  <AppButton
                    variant="secondary"
                    size="sm"
                    icon={<RefreshCw size={12} />}
                    disabled={isReadOnly}
                    onClick={handleRegenerateChatbot}
                  >
                    Regenerar Chatbot
                  </AppButton>
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: "20px 24px" }}>
              {isChatbotLoading ? (
                <div className="flex items-center gap-4">
                  <Loader2
                    size={18}
                    className="animate-spin"
                    style={{ color: "var(--accent)", flexShrink: 0 }}
                  />
                  <div>
                    <p
                      style={{
                        fontSize: "var(--text-sm)",
                        fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                        color: "var(--foreground)",
                        fontFamily: "inherit",
                        marginBottom: "2px",
                      }}
                    >
                      Generando chatbot…
                    </p>
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
                      Generando chatbot asociado a la oferta…
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <AppButton
                    variant="primary"
                    icon={<Bot size={14} />}
                    disabled={!canCreateChatbot || isReadOnly}
                    onClick={handleCreateChatbot}
                  >
                    Crear Chatbot de la Oferta Técnica
                  </AppButton>
                  {!canCreateChatbot && (
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
                      Carga la oferta técnica para activar esta funcionalidad.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </CardWrap>

      </div>

    </div>
  );
}