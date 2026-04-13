// Route: /cualificacion  — Cualificación previa (GO / NO GO)
"use client";

import React, { useState, useCallback, useRef } from "react";
import {
  Upload, X, FileText, CheckCircle2, XCircle, AlertTriangle,
  ChevronDown, ChevronUp, Edit3, RotateCcw, Download, Plus,
  ArrowRight,
} from "lucide-react";
import { useNav } from "../../../lib/routes/navigation";

import Box           from "@mui/material/Box";
import Typography    from "@mui/material/Typography";
import Button        from "@mui/material/Button";
import TextField     from "@mui/material/TextField";
import Paper         from "@mui/material/Paper";
import RadioGroup    from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio         from "@mui/material/Radio";
import Chip          from "@mui/material/Chip";
import Divider       from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import Tooltip       from "@mui/material/Tooltip";
import Alert         from "@mui/material/Alert";
import ArrowLeftIcon from "@mui/icons-material/ArrowLeft";

import {
  type Prequalification,
  type PrequalFile,
  type ExtractedField,
  createPrequalification,
  savePrequalification,
  mockAnalyze,
} from "../../_components/prequalification-store";
import {
  analyzeDocuments,
  type CommercialOriginId,
} from "../../../services/cualificacionService";

// Use real backend unless VITE_USE_MOCK_CHAT=true
const USE_MOCK_QUALIFY =
  (import.meta as unknown as { env: Record<string, string> }).env
    ?.VITE_USE_MOCK_CHAT === "true";

// ─── Types ────────────────────────────────────────────────────────────────────

type DocType = "administrativo" | "tecnico" | "anexo";
type Phase   = "upload" | "analyzing" | "results";

interface LocalFile {
  file:    File;
  docType: DocType;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DOC_TYPE_OPTIONS: { value: DocType; label: string; color: string; bg: string }[] = [
  { value: "administrativo", label: "Pliego Administrativo", color: "var(--accent)",    bg: "var(--accent-subtle)"    },
  { value: "tecnico",        label: "Pliego Técnico",         color: "var(--primary)",   bg: "var(--primary-subtle)"   },
  { value: "anexo",          label: "Anexos",                 color: "var(--muted-foreground)", bg: "var(--muted)"    },
];

const CONFIDENCE_CONFIG = {
  HIGH:   { label: "Alta",  color: "var(--success)",            bg: "var(--success-subtle)"    },
  MEDIUM: { label: "Media", color: "var(--warning-foreground)", bg: "var(--warning-subtle)"    },
  LOW:    { label: "Baja",  color: "var(--destructive)",        bg: "var(--destructive-subtle)"},
};

/** Origen comercial: pesa ~50% en el criterio del agente (junto al análisis del pliego). */
const COMMERCIAL_ORIGIN_OPTIONS: {
  id: CommercialOriginId;
  title: string;
  subtitle: string;
}[] = [
  {
    id: "accenture_led",
    title: "Impulsada desde Accenture",
    subtitle:
      "Oportunidad co-diseñada o priorizada con el cliente: confianza instalada, visibilidad del requisito y mayor probabilidad favorable a presentar oferta (salvo vetos duros del pliego).",
  },
  {
    id: "relationship_momentum",
    title: "Relación comercial en curso",
    subtitle:
      "Conversaciones previas, diagnóstico compartido o seguimiento activo antes del pliego. Peso intermedio: la decisión depende en gran medida del encaje técnico-económico del concurso.",
  },
  {
    id: "reactive_untracked",
    title: "Detección reactiva / sin pipeline previo",
    subtitle:
      "Identificación sobre aviso público o canal entrante sin relación comercial acreditada. Exige pliego sólido y márgenes defendibles; mayor tendencia a NO_GO ante incertidumbre o requisitos agresivos.",
  },
];

const CATEGORIES_ORDER = [
  "Identificación y alcance",
  "Plazos y calendario",
  "Económico",
  "Tarifas y facturación",
  "Solvencia",
  "Perfiles requeridos",
  "Restricciones operativas",
  "Criterios de adjudicación",
  "Riesgos detectados",
  // Campos con categoría no reconocida por el LLM (no se pierden)
  "Otros datos extraídos",
];

function formatBytes(bytes: number): string {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SubHeader({ onBack }: { onBack: () => void }) {
  return (
    <Box sx={{
      bgcolor: "background.paper",
      borderBottom: "1px solid var(--border)",
      display: "flex", alignItems: "center", gap: 2,
      px: "var(--page-px)", height: "var(--subheader-height)", flexShrink: 0,
    }}>
      <Button variant="text" color="inherit" size="small"
        startIcon={<ArrowLeftIcon />} onClick={onBack}
        sx={{ color: "text.secondary" }}>
        Volver
      </Button>
      <Divider orientation="vertical" flexItem sx={{ my: 1 }} />
      <Typography variant="body2" fontWeight={600}>Cualificación previa de la oportunidad (GO / NO GO)</Typography>
    </Box>
  );
}

// ─── Upload Zone ──────────────────────────────────────────────────────────────

function UploadZone({
  files, onAdd, onRemove, onTypeChange, collapsed,
}: {
  files:        LocalFile[];
  onAdd:        (f: File[]) => void;
  onRemove:     (idx: number) => void;
  onTypeChange: (idx: number, t: DocType) => void;
  collapsed:    boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f =>
      f.name.toLowerCase().endsWith(".pdf") || f.name.toLowerCase().endsWith(".docx")
    );
    if (droppedFiles.length > 0) onAdd(droppedFiles);
  }, [onAdd]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length > 0) onAdd(selected);
    e.target.value = "";
  };

  // Collapsed summary (after analysis)
  if (collapsed && files.length > 0) {
    return (
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        {files.map((f, i) => {
          const cfg = DOC_TYPE_OPTIONS.find(d => d.value === f.docType)!;
          return (
            <Chip
              key={i}
              icon={<FileText size={12} />}
              label={`${f.file.name} · ${cfg.label}`}
              size="small"
              sx={{
                bgcolor: cfg.bg, color: cfg.color, fontWeight: 600, height: 22,
                "& .MuiChip-label": { fontSize: "var(--text-2xs)", px: "8px" },
              }}
            />
          );
        })}
      </Box>
    );
  }

  return (
    <Box>
      {/* Drop zone */}
      <Box
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        sx={{
          border: `2px dashed ${dragging ? "var(--primary)" : "var(--border)"}`,
          borderRadius: "var(--radius)",
          bgcolor: dragging ? "var(--primary-subtle)" : "var(--muted)",
          p: "var(--space-8)",
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", gap: 1.5, cursor: "pointer",
          transition: "all 0.2s",
          "&:hover": { borderColor: "var(--primary)", bgcolor: "var(--primary-subtle)" },
        }}
      >
        <Upload size={28} style={{ color: dragging ? "var(--primary)" : "var(--muted-foreground)" }} />
        <Typography variant="body2" fontWeight={600} sx={{ color: dragging ? "var(--primary)" : "text.primary" }}>
          Arrastra los pliegos aquí o haz clic para seleccionar
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Sube pliegos administrativos y técnicos (PDF/DOCX) y anexos necesarios para preevaluar la licitación
        </Typography>
        <Typography variant="caption" color="text.secondary">PDF · DOCX</Typography>
        <input ref={inputRef} type="file" multiple accept=".pdf,.docx" hidden onChange={handleInput} />
      </Box>

      {/* File list */}
      {files.length > 0 && (
        <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}>
          {files.map((lf, i) => (
            <Paper
              key={i}
              variant="outlined"
              sx={{
                display: "flex", alignItems: "center", gap: 2,
                px: "var(--space-4)", py: "var(--space-3)",
                borderRadius: "var(--radius)",
              }}
            >
              <FileText size={16} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600} noWrap>{lf.file.name}</Typography>
                <Typography variant="caption" color="text.secondary">{formatBytes(lf.file.size)}</Typography>
              </Box>
              {/* Type chips */}
              <Box sx={{ display: "flex", gap: 0.75, flexShrink: 0 }}>
                {DOC_TYPE_OPTIONS.map(opt => (
                  <Chip
                    key={opt.value}
                    label={opt.label}
                    size="small"
                    clickable
                    onClick={() => onTypeChange(i, opt.value)}
                    sx={{
                      height: 22, fontWeight: lf.docType === opt.value ? 600 : 400,
                      bgcolor: lf.docType === opt.value ? opt.bg : "transparent",
                      color:   lf.docType === opt.value ? opt.color : "var(--muted-foreground)",
                      border:  lf.docType === opt.value ? `1.5px solid ${opt.color}` : "1.5px solid var(--border)",
                      "& .MuiChip-label": { fontSize: "var(--text-2xs)", px: "8px" },
                    }}
                  />
                ))}
              </Box>
              <Box
                component="button"
                onClick={() => onRemove(i)}
                sx={{
                  border: "none", background: "none", cursor: "pointer", p: 0.5,
                  color: "var(--muted-foreground)", flexShrink: 0,
                  "&:hover": { color: "var(--destructive)" },
                  display: "flex", alignItems: "center",
                }}
              >
                <X size={14} />
              </Box>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
}

// ─── Verdict Banner ───────────────────────────────────────────────────────────

function VerdictBanner({ decision, confidence, reasons }: {
  decision:   "GO" | "NO_GO";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  reasons:    string[];
}) {
  const isGo    = decision === "GO";
  const confCfg = CONFIDENCE_CONFIG[confidence];

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: "var(--radius)",
        overflow: "hidden",
        border: `2px solid ${isGo ? "var(--success)" : "var(--destructive)"}`,
      }}
    >
      {/* Header */}
      <Box sx={{
        bgcolor: isGo ? "var(--success)" : "var(--destructive)",
        px: "var(--space-8)", py: "var(--space-6)",
        display: "flex", alignItems: "center", gap: 3,
      }}>
        {isGo
          ? <CheckCircle2 size={40} style={{ color: "#fff", flexShrink: 0 }} />
          : <XCircle      size={40} style={{ color: "#fff", flexShrink: 0 }} />
        }
        <Box>
          <Typography
            sx={{
              fontSize: "var(--text-4xl)", fontWeight: "var(--font-weight-bold)",
              color: "#fff", lineHeight: 1, letterSpacing: -1,
            }}
          >
            {isGo ? "GO" : "NO GO"}
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)", mt: 0.5 }}>
            Resultado de cualificación previa
          </Typography>
        </Box>
        <Box sx={{ ml: "auto", textAlign: "right" }}>
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.75)" }}>
            Nivel de confianza
          </Typography>
          <Box sx={{ mt: 0.5 }}>
            <Chip
              label={confCfg.label}
              size="small"
              sx={{
                bgcolor: "rgba(255,255,255,0.2)", color: "#fff",
                fontWeight: 700, height: 24, border: "1.5px solid rgba(255,255,255,0.4)",
                "& .MuiChip-label": { fontSize: "var(--text-xs)", px: "10px" },
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* Reasons */}
      <Box sx={{ px: "var(--space-8)", py: "var(--space-6)", bgcolor: "background.paper" }}>
        <Typography variant="body2" fontWeight={600} sx={{ mb: 1.5 }}>
          Razones principales
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: "var(--space-5)", display: "flex", flexDirection: "column", gap: 0.75 }}>
          {reasons.map((r, i) => (
            <Typography key={i} component="li" variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              {r}
            </Typography>
          ))}
        </Box>
      </Box>
    </Paper>
  );
}

// ─── Extracted Fields ─────────────────────────────────────────────────────────

function ExtractedFieldCard({
  field,
  onChange,
}: {
  field:    ExtractedField;
  onChange: (id: string, value: string) => void;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: "var(--space-4)",
        borderRadius: "var(--radius)",
        border: field.needsReview
          ? "1px solid var(--warning)"
          : "1px solid var(--border)",
        display: "flex", flexDirection: "column", gap: 1,
        position: "relative",
      }}
    >
      {/* Label row */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Typography
          variant="caption"
          fontWeight={600}
          sx={{ color: "text.secondary", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "0.04em", flex: 1 }}
        >
          {field.label}
        </Typography>
        {field.needsReview && (
          <Chip
            icon={<AlertTriangle size={10} />}
            label="Requiere revisión"
            size="small"
            sx={{
              bgcolor: "var(--warning-subtle)", color: "var(--warning-foreground)",
              fontWeight: 600, height: 18,
              "& .MuiChip-label": { fontSize: "var(--text-3xs)", px: "6px" },
              "& .MuiChip-icon":  { fontSize: 10, ml: "4px" },
            }}
          />
        )}
        <Tooltip title="Extraído automáticamente por IA" arrow placement="top">
          <Chip
            icon={<Edit3 size={9} />}
            label="IA"
            size="small"
            sx={{
              bgcolor: "var(--accent-subtle)", color: "var(--accent)",
              fontWeight: 700, height: 18,
              "& .MuiChip-label": { fontSize: "var(--text-3xs)", px: "5px" },
              "& .MuiChip-icon":  { fontSize: 9, ml: "4px" },
            }}
          />
        </Tooltip>
      </Box>

      {/* Editable value */}
      <TextField
        size="small"
        multiline={field.multiline}
        minRows={field.multiline ? 3 : undefined}
        value={field.value}
        onChange={e => onChange(field.id, e.target.value)}
        variant="outlined"
        fullWidth
        sx={{
          "& .MuiOutlinedInput-root": {
            fontSize:        "var(--text-sm)",
            borderRadius:    "var(--radius-input)",
          },
        }}
      />

      {/* Source */}
      {field.source && (
        <Typography variant="caption" sx={{ color: "var(--muted-foreground)", fontSize: "var(--text-3xs)", fontStyle: "italic" }}>
          Fuente: {field.source}
        </Typography>
      )}
    </Paper>
  );
}

function ExtractedFieldsSection({
  fields,
  onFieldChange,
}: {
  fields:       ExtractedField[];
  onFieldChange: (id: string, value: string) => void;
}) {
  const fieldsByCategory = CATEGORIES_ORDER.reduce<Record<string, ExtractedField[]>>((acc, cat) => {
    acc[cat] = fields.filter(f => f.category === cat);
    return acc;
  }, {});

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "var(--section-gap)" }}>
      {CATEGORIES_ORDER.map(cat => {
        const catFields = fieldsByCategory[cat] ?? [];
        if (catFields.length === 0) return null;
        return (
          <Box key={cat}>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 2 }}>{cat}</Typography>
            <Box sx={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "var(--space-3)",
            }}>
              {catFields.map(f => (
                <Box
                  key={f.id}
                  sx={f.multiline ? { gridColumn: "1 / -1" } : {}}
                >
                  <ExtractedFieldCard field={f} onChange={onFieldChange} />
                </Box>
              ))}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

// ─── Justification Block ──────────────────────────────────────────────────────

function JustificationBlock({ justification }: {
  justification: {
    encaje:                string;
    riesgosOperativos:     string;
    riesgosEconomicos:     string;
    complejidadDocumental: string;
    recomendacion:         string;
  };
}) {
  const sections = [
    { key: "encaje",                label: "Encaje con capacidades / delivery",             text: justification.encaje                },
    { key: "riesgosOperativos",     label: "Riesgos operativos",                            text: justification.riesgosOperativos     },
    { key: "riesgosEconomicos",     label: "Riesgos económicos",                            text: justification.riesgosEconomicos     },
    { key: "complejidadDocumental", label: "Complejidad documental y cumplimiento",         text: justification.complejidadDocumental },
    { key: "recomendacion",         label: "Recomendación final y condiciones",             text: justification.recomendacion         },
  ];

  return (
    <Paper variant="outlined" sx={{ borderRadius: "var(--radius)", overflow: "hidden" }}>
      <Box sx={{ px: "var(--space-6)", py: "var(--space-4)", bgcolor: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
        <Typography variant="body2" fontWeight={600}>Justificación de la recomendación</Typography>
        <Typography variant="caption" color="text.secondary">Solo lectura — generado por IA</Typography>
      </Box>
      <Box sx={{ p: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        {sections.map(s => (
          <Box key={s.key}>
            <Typography variant="caption" fontWeight={600} sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.04em", fontSize: "var(--text-2xs)" }}>
              {s.label}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.7 }}>
              {s.text}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

/** Resumen del criterio ~50% comercial + ~50% pliego devuelto por el agente. */
function DecisionBlendPanel({
  commercialOriginId,
  decisionBlend,
}: {
  commercialOriginId?: CommercialOriginId;
  decisionBlend?: Prequalification["decisionBlend"];
}) {
  const showBlend = Boolean(decisionBlend?.commercialHalf || decisionBlend?.pliegoHalf);
  if (!commercialOriginId && !showBlend) return null;

  const opt = commercialOriginId
    ? COMMERCIAL_ORIGIN_OPTIONS.find(o => o.id === commercialOriginId)
    : undefined;

  return (
    <Paper variant="outlined" sx={{ borderRadius: "var(--radius)", overflow: "hidden" }}>
      <Box sx={{ px: "var(--space-5)", py: "var(--space-3)", bgcolor: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
        <Typography variant="body2" fontWeight={600}>
          Criterio comercial y pliego (~50% / ~50%)
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Origen declarado y cómo el agente pondera el encaje comercial frente a economía, plazos, solvencia, perfiles y riesgos del pliego.
        </Typography>
      </Box>
      <Box sx={{ p: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {opt && (
          <Box>
            <Typography variant="caption" fontWeight={600} sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.04em", fontSize: "var(--text-2xs)" }}>
              Origen comercial seleccionado
            </Typography>
            <Typography variant="body2" fontWeight={600} sx={{ mt: 0.75 }}>
              {opt.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5, lineHeight: 1.6 }}>
              {opt.subtitle}
            </Typography>
          </Box>
        )}
        {showBlend && (
          <>
            {decisionBlend?.commercialHalf ? (
              <Box>
                <Typography variant="caption" fontWeight={600} sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.04em", fontSize: "var(--text-2xs)" }}>
                  Ponderación comercial (~50%)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.7 }}>
                  {decisionBlend.commercialHalf}
                </Typography>
              </Box>
            ) : null}
            {decisionBlend?.pliegoHalf ? (
              <Box>
                <Typography variant="caption" fontWeight={600} sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.04em", fontSize: "var(--text-2xs)" }}>
                  Síntesis del pliego (~50%)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.7 }}>
                  {decisionBlend.pliegoHalf}
                </Typography>
              </Box>
            ) : null}
          </>
        )}
      </Box>
    </Paper>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AppPrequalificationPage() {
  const nav = useNav();

  // Local file list (before upload)
  const [localFiles, setLocalFiles] = useState<LocalFile[]>([]);

  /** Origen comercial (~50% del criterio GO/NO-GO en backend) */
  const [commercialOrigin, setCommercialOrigin] = useState<CommercialOriginId>(
    "relationship_momentum",
  );

  // Phase state
  const [phase, setPhase] = useState<Phase>("upload");

  // Persisted prequalification
  const [pq, setPq] = useState<Prequalification | null>(null);

  // Extracted fields (local editable copy)
  const [fields, setFields] = useState<ExtractedField[]>([]);

  // Upload section collapsed
  const [uploadCollapsed, setUploadCollapsed] = useState(false);

  /** Error de red / backend (sin fallback silencioso a mock). */
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  // ── File handlers ──────────────────────────────────────────────────────────

  const handleAddFiles = (newFiles: File[]) => {
    const inferType = (name: string): DocType => {
      const lower = name.toLowerCase();
      if (lower.includes("admin") || lower.includes("pca") || lower.includes("pcap")) return "administrativo";
      if (lower.includes("tecn") || lower.includes("pct"))  return "tecnico";
      if (lower.includes("anex"))  return "anexo";
      return "administrativo";
    };
    setLocalFiles(prev => [
      ...prev,
      ...newFiles.map(f => ({ file: f, docType: inferType(f.name) })),
    ]);
  };

  const handleRemoveFile = (idx: number) =>
    setLocalFiles(prev => prev.filter((_, i) => i !== idx));

  const handleTypeChange = (idx: number, t: DocType) =>
    setLocalFiles(prev => prev.map((f, i) => i === idx ? { ...f, docType: t } : f));

  // ── Analyze ────────────────────────────────────────────────────────────────

  const handleAnalyze = async () => {
    if (localFiles.length === 0) return;

    setAnalyzeError(null);
    setPhase("analyzing");
    setUploadCollapsed(true);

    const files: PrequalFile[] = localFiles.map(lf => ({
      name:    lf.file.name,
      size:    lf.file.size,
      docType: lf.docType,
    }));

    let analysis: {
      result:          NonNullable<Prequalification["result"]>;
      extractedFields: ExtractedField[];
      clientName:      string;
      objectSummary:   string;
      commercialOriginId?: CommercialOriginId;
      decisionBlend?:   Prequalification["decisionBlend"];
    };

    if (USE_MOCK_QUALIFY) {
      const current = createPrequalification({ files });
      analysis = await mockAnalyze(current);
      analysis = {
        ...analysis,
        commercialOriginId: commercialOrigin,
        decisionBlend: {
          commercialHalf:
            "Modo demostración: el origen comercial seleccionado se aplicaría aquí con peso ~50%.",
          pliegoHalf:
            "Modo demostración: la mitad pliego sintetizaría economía, plazos, solvencia, perfiles y riesgos.",
        },
      };
      const done: Prequalification = {
        ...current,
        result:          analysis.result,
        extractedFields: analysis.extractedFields,
        clientName:      analysis.clientName,
        objectSummary:   analysis.objectSummary,
        commercialOriginId: analysis.commercialOriginId,
        decisionBlend:      analysis.decisionBlend,
      };
      savePrequalification(done);
      setPq(done);
      setFields(analysis.extractedFields);
      setPhase("results");
      return;
    }

    try {
      const raw = await analyzeDocuments(localFiles, { commercialOrigin });
      analysis = {
        result: {
          decision:      raw.decision,
          confidence:    raw.confidence,
          reasons:       raw.reasons,
          justification: raw.justification,
        },
        extractedFields: raw.extractedFields as ExtractedField[],
        clientName:      raw.clientName,
        objectSummary:   raw.objectSummary,
        commercialOriginId: raw.commercialOriginId ?? commercialOrigin,
        decisionBlend:      raw.decisionBlend,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[cualificacion] Backend error:", err);
      setAnalyzeError(msg);
      setPhase("upload");
      setUploadCollapsed(false);
      return;
    }

    const current = createPrequalification({ files });
    const done: Prequalification = {
      ...current,
      result:          analysis.result,
      extractedFields: analysis.extractedFields,
      clientName:      analysis.clientName,
      objectSummary:   analysis.objectSummary,
      commercialOriginId: analysis.commercialOriginId,
      decisionBlend:      analysis.decisionBlend,
    };
    savePrequalification(done);
    setPq(done);
    setFields(analysis.extractedFields);
    setPhase("results");
  };

  // ── Reanalyze ──────────────────────────────────────────────────────────────

  const handleReanalyze = () => {
    setPhase("upload");
    setUploadCollapsed(false);
    setPq(null);
    setFields([]);
    setAnalyzeError(null);
  };

  // ── Field change ───────────────────────────────────────────────────────────

  const handleFieldChange = (id: string, value: string) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, value } : f));
    if (pq) {
      const updated: Prequalification = {
        ...pq,
        extractedFields: pq.extractedFields.map(f => f.id === id ? { ...f, value } : f),
      };
      savePrequalification(updated);
      setPq(updated);
    }
  };

  // ── Create opportunity from qualification ──────────────────────────────────

  const handleCreateOpportunity = () => {
    if (!pq) return;

    // ── Parse tipología into array matching TIPOLOGIAS list ──────────────────
    const tipologiaRaw = fields.find(f => f.id === "tipologia")?.value ?? "";

    // ── Parse lotes field to determine tieneLottes + identifiers ────────────
    const lotesRaw   = fields.find(f => f.id === "lotes")?.value ?? "";
    const sinLotes   = /sin lotes|sin\s+lote|no\s+hay|único|unico|contrato único/i.test(lotesRaw) || lotesRaw.trim() === "";
    const lotesArray = sinLotes ? [] : lotesRaw.split(/[,;]/).map(s => s.trim()).filter(Boolean);

    const prefill = {
      from:          "prequalification",
      prequalId:     pq.id,
      // Step 0 — Datos de la licitación
      nombre:        pq.objectSummary.slice(0, 120),
      codigo:        fields.find(f => f.id === "codigo_expediente")?.value ?? "",
      cliente:       pq.clientName,
      anno:          fields.find(f => f.id === "anno")?.value ?? "",
      duracion:      fields.find(f => f.id === "duracion")?.value ?? "",
      presupuesto:   fields.find(f => f.id === "presupuesto")?.value ?? "",
      tipologia:     tipologiaRaw,
      tieneLottes:   sinLotes ? "no" : "si",
      lotes:         lotesArray,
      // Step 1 — Documentación (file names transferred to the wizard)
      fileNames:     pq.files.map(f => f.name),
    };

    sessionStorage.setItem("opp-prefill", JSON.stringify(prefill));
    nav.prospects.new();
  };

  // ── Save qualification (NO GO) ─────────────────────────────────────────────

  const handleSave = () => {
    if (pq) savePrequalification(pq);
    nav.home();
  };

  // ─────────────────────────────────────────────────────────────────────────

  const hasFiles     = localFiles.length > 0;
  const isAnalyzing  = phase === "analyzing";
  const hasResults   = phase === "results" && pq?.result != null;
  const result       = pq?.result ?? null;
  const isGo         = result?.decision === "GO";
  const isLowConf    = result?.confidence === "LOW";

  return (
    <Box sx={{ minHeight: "calc(100vh - var(--header-height))", bgcolor: "background.default", display: "flex", flexDirection: "column" }}>

      <SubHeader onBack={() => nav.home()} />

      {/* Scrollable content */}
      <Box sx={{ flex: 1, overflowY: "auto", px: "var(--page-px)", py: "var(--page-py)" }}>
        <Box sx={{ maxWidth: 960, mx: "auto", display: "flex", flexDirection: "column", gap: "var(--section-gap)" }}>

          {analyzeError && (
            <Alert
              severity="error"
              onClose={() => setAnalyzeError(null)}
              sx={{ borderRadius: "var(--radius-banner)" }}
            >
              <strong>No se pudo analizar los documentos.</strong>{" "}
              Comprueba que el servicio <code style={{ fontSize: "0.85em" }}>agent-cualificacion</code> esté en marcha
              (puerto 8084) y que el front use el proxy de Vite. Detalle:{" "}
              <Typography component="span" variant="body2" sx={{ fontFamily: "monospace", wordBreak: "break-all" }}>
                {analyzeError}
              </Typography>
            </Alert>
          )}

          {/* ── Section A: Upload ─────────────────────────────────────────── */}
          <Paper variant="outlined" sx={{ borderRadius: "var(--radius)", overflow: "hidden" }}>
            {/* Header */}
            <Box
              sx={{
                px: "var(--space-6)", py: "var(--space-4)",
                display: "flex", alignItems: "center", gap: 2,
                bgcolor: "background.paper", borderBottom: "1px solid var(--border)",
                cursor: hasResults ? "pointer" : "default",
              }}
              onClick={() => hasResults && setUploadCollapsed(p => !p)}
            >
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="body2" fontWeight={600} component="span">
                    A — Carga de documentación
                  </Typography>
                  {hasResults && (
                    <Chip label="Completado" size="small" sx={{
                      height: 18, bgcolor: "var(--success-subtle)", color: "var(--success)",
                      fontWeight: 600, "& .MuiChip-label": { fontSize: "var(--text-3xs)", px: "8px" },
                    }} />
                  )}
                </Box>
                <Typography variant="caption" component="span" sx={{ display: "block", color: "text.secondary" }}>
                  {localFiles.length === 0
                    ? "Sube al menos un pliego para poder analizar"
                    : `${localFiles.length} archivo${localFiles.length !== 1 ? "s" : ""} cargado${localFiles.length !== 1 ? "s" : ""}`}
                </Typography>
              </Box>
              {hasResults && (
                uploadCollapsed
                  ? <ChevronDown size={16} style={{ color: "var(--muted-foreground)" }} />
                  : <ChevronUp   size={16} style={{ color: "var(--muted-foreground)" }} />
              )}
            </Box>

            {/* Content */}
            {!uploadCollapsed && (
              <Box sx={{ p: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
                <Box>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                    Contexto comercial (criterio ~50%)
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2, maxWidth: 720 }}>
                    El agente combina este origen con el análisis del pliego (~50%) para decidir GO/NO-GO y el nivel de confianza.
                    Una oportunidad impulsada desde Accenture inclina a favor de presentar oferta; una reactiva sin pipeline exige un pliego muy favorable.
                  </Typography>
                  <RadioGroup
                    value={commercialOrigin}
                    onChange={(_, v) => setCommercialOrigin(v as CommercialOriginId)}
                  >
                    {COMMERCIAL_ORIGIN_OPTIONS.map(opt => (
                      <Paper
                        key={opt.id}
                        variant="outlined"
                        sx={{
                          mb: 1.5,
                          p: "var(--space-3)",
                          borderRadius: "var(--radius)",
                          borderColor: commercialOrigin === opt.id ? "var(--primary)" : "var(--border)",
                          bgcolor: commercialOrigin === opt.id ? "var(--primary-subtle)" : "transparent",
                        }}
                      >
                        <FormControlLabel
                          value={opt.id}
                          control={<Radio size="small" />}
                          label={
                            <Box>
                              <Typography variant="body2" fontWeight={600}>{opt.title}</Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5, lineHeight: 1.5 }}>
                                {opt.subtitle}
                              </Typography>
                            </Box>
                          }
                          sx={{ alignItems: "flex-start", m: 0, width: "100%" }}
                        />
                      </Paper>
                    ))}
                  </RadioGroup>
                </Box>
                <UploadZone
                  files={localFiles}
                  onAdd={handleAddFiles}
                  onRemove={handleRemoveFile}
                  onTypeChange={handleTypeChange}
                  collapsed={false}
                />
              </Box>
            )}

            {uploadCollapsed && hasFiles && (
              <Box sx={{ px: "var(--space-6)", py: "var(--space-4)" }}>
                <UploadZone
                  files={localFiles}
                  onAdd={handleAddFiles}
                  onRemove={handleRemoveFile}
                  onTypeChange={handleTypeChange}
                  collapsed
                />
              </Box>
            )}
          </Paper>

          {/* ── Section B: Analyze button ─────────────────────────────────── */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {!hasResults ? (
              <>
                <Button
                  variant="contained"
                  size="large"
                  disabled={!hasFiles || isAnalyzing}
                  onClick={handleAnalyze}
                  sx={{ px: "var(--space-8)", py: "var(--space-3)" }}
                  startIcon={isAnalyzing ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                  {isAnalyzing ? "Analizando documentación…" : "Analizar pliegos (GO / NO GO)"}
                </Button>
                {!hasFiles && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
                    Sube al menos un pliego para poder analizar.
                  </Typography>
                )}
                {isAnalyzing && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
                    Extrayendo criterios de viabilidad…
                  </Typography>
                )}
              </>
            ) : (
              <Button
                variant="outlined"
                color="inherit"
                size="small"
                startIcon={<RotateCcw size={14} />}
                onClick={handleReanalyze}
                sx={{ borderColor: "var(--border)", color: "text.secondary" }}
              >
                Reanalizar
              </Button>
            )}
          </Box>

          {/* ── Analyzing loader ──────────────────────────────────────────── */}
          {isAnalyzing && (
            <Paper variant="outlined" sx={{
              borderRadius: "var(--radius)", p: "var(--space-8)",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            }}>
              <CircularProgress size={36} />
              <Typography variant="body2" color="text.secondary">
                Analizando documentación… extrayendo criterios de viabilidad.
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Puede tardar entre 30 s y 2 min según el tamaño del pliego (extracción + IA).
              </Typography>
            </Paper>
          )}

          {/* ── Results ───────────────────────────────────────────────────── */}
          {hasResults && result && (
            <>
              {/* Low confidence warning */}
              {isLowConf && (
                <Alert
                  severity="warning"
                  icon={<AlertTriangle size={16} />}
                  sx={{ borderRadius: "var(--radius-banner)" }}
                >
                  <strong>Confianza baja:</strong> revise los campos marcados antes de tomar una decisión.
                </Alert>
              )}

              {/* Verdict */}
              <VerdictBanner
                decision={result.decision}
                confidence={result.confidence}
                reasons={result.reasons}
              />

              <DecisionBlendPanel
                commercialOriginId={pq.commercialOriginId}
                decisionBlend={pq.decisionBlend}
              />

              <Divider />

              {/* Resumen identificación (siempre visible con datos del backend) */}
              {(pq.clientName || pq.objectSummary) && (
                <Paper variant="outlined" sx={{ borderRadius: "var(--radius)", p: "var(--space-5)", bgcolor: "var(--muted)" }}>
                  <Typography variant="caption" fontWeight={600} sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Identificación de la licitación
                  </Typography>
                  {pq.clientName ? (
                    <Typography variant="body1" fontWeight={600} sx={{ mt: 1 }}>
                      {pq.clientName}
                    </Typography>
                  ) : null}
                  {pq.objectSummary ? (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.7 }}>
                      {pq.objectSummary}
                    </Typography>
                  ) : null}
                </Paper>
              )}

              {/* Extracted fields */}
              <Box>
                <Box sx={{ mb: "var(--space-4)" }}>
                  <Typography variant="h6" fontWeight={600}>Datos clave extraídos del pliego</Typography>
                  <Typography variant="body2" color="text.secondary" component="div">
                    Todos los campos son editables. Los cambios se guardan automáticamente.
                    {fields.length > 0 && (
                      <Box component="span" sx={{ display: "block", mt: 0.5 }}>
                        {fields.length} campos en{" "}
                        {CATEGORIES_ORDER.filter(c => fields.some(f => f.category === c)).length}{" "}
                        secciones.
                      </Box>
                    )}
                  </Typography>
                </Box>
                <ExtractedFieldsSection
                  fields={fields}
                  onFieldChange={handleFieldChange}
                />
              </Box>

              <Divider />

              {/* Justification */}
              <JustificationBlock justification={result.justification} />

              <Divider />

              {/* CTA */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, pb: "var(--space-8)" }}>
                {isGo ? (
                  <>
                    <Button
                      variant="contained"
                      size="large"
                      endIcon={<ArrowRight size={16} />}
                      onClick={handleCreateOpportunity}
                      sx={{ px: "var(--space-8)" }}
                    >
                      Crear oportunidad a partir de esta cualificación
                    </Button>
                    <Button
                      variant="outlined"
                      color="inherit"
                      size="large"
                      startIcon={<Download size={16} />}
                      onClick={() => {}}
                      sx={{ borderColor: "var(--border)", color: "text.secondary" }}
                    >
                      Descargar informe GO/NO GO
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="contained"
                      size="large"
                      onClick={handleSave}
                      sx={{ px: "var(--space-8)" }}
                    >
                      Guardar cualificación
                    </Button>
                    <Button
                      variant="outlined"
                      color="inherit"
                      size="large"
                      startIcon={<RotateCcw size={16} />}
                      onClick={handleReanalyze}
                      sx={{ borderColor: "var(--border)", color: "text.secondary" }}
                    >
                      Reanalizar
                    </Button>
                  </>
                )}
              </Box>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}