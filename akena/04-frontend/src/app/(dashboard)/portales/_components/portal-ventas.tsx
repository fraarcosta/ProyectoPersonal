// Portal de Ventas — Akena
// Persistencia COLECTIVA (sin userId): "portal-ventas-ofertas"
// UI: MUI components — brand colors only, default variants otherwise.
"use client";

import { useState, useRef, useCallback, useEffect, type ReactNode } from "react";
import JSZip from "jszip";

// ── MUI ────────────────────────────────────────────────────────────────────────
import Dialog         from "@mui/material/Dialog";
import DialogTitle    from "@mui/material/DialogTitle";
import DialogContent  from "@mui/material/DialogContent";
import DialogActions  from "@mui/material/DialogActions";
import Button         from "@mui/material/Button";
import IconButton     from "@mui/material/IconButton";
import TextField      from "@mui/material/TextField";
import MenuItem       from "@mui/material/MenuItem";
import Chip           from "@mui/material/Chip";
import Box            from "@mui/material/Box";
import Typography     from "@mui/material/Typography";
import Paper          from "@mui/material/Paper";
import Alert          from "@mui/material/Alert";
import Collapse       from "@mui/material/Collapse";
import Pagination     from "@mui/material/Pagination";
import InputAdornment from "@mui/material/InputAdornment";
import Checkbox       from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import ListItemText  from "@mui/material/ListItemText";
import Table          from "@mui/material/Table";
import TableContainer from "@mui/material/TableContainer";
import TableHead      from "@mui/material/TableHead";
import TableBody      from "@mui/material/TableBody";
import TableRow       from "@mui/material/TableRow";
import TableCell      from "@mui/material/TableCell";

// ── Lucide icons ───────────────────────────────────────────────────────────────
import {
  Plus, X, Eye, Download, Trash2, CheckCircle2,
  AlertCircle, Paperclip, Upload, User, AlertTriangle, FileText, Search,
  Sparkles, Loader2, RefreshCw, Info,
} from "lucide-react";
import CloseIcon from "@mui/icons-material/Close";
import Snackbar  from "@mui/material/Snackbar";
import Tooltip   from "@mui/material/Tooltip";

// ── Local imports ──────────────────────────────────────────────────────────────
import { STATUS_CONFIG } from "../../../_components/ui";
import { getAuthUser } from "../../../_components/auth-store";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface DocFile { name: string; size: string; }
interface Lote    { id: string; identificador: string; }

interface Oferta {
  id:                  string;
  codigoExpediente:    string;
  nombre:              string;
  tipologia:           string;
  cliente:             string;
  año:                 string;
  duracion:            string;
  presupuestoBase:     number;
  presupuestoOfertado: number;
  descuento:           number;
  tieneLotes:          boolean;
  lotes:               Lote[];
  pliegosAnexos:       DocFile[];
  wordOferta:          DocFile[];
  pptOferta:           DocFile[];
  lotesDocs:           Record<string, { word: DocFile[]; ppt: DocFile[] }>;
  estado:              string;
  resultado:           string;
  informeTecnico:      DocFile[];
  informeEconomico:    DocFile[];
  sinInformes:         boolean;
  updatedAt:           string;
  updatedBy:           string;
  createdAt:           string;
  createdBy:           string;
}

interface NuevaForm {
  codigoExpediente:    string;
  nombre:              string;
  tipologias:          string[];
  tipologiaOtros:      string;
  cliente:             string;
  año:                 string;
  duracion:            string;
  presupuestoBase:     string;
  presupuestoOfertado: string;
  tieneLotes:          "" | "si" | "no";
  nuevoLote:           string;
  lotes:               Lote[];
  pliegosAnexos:       DocFile[];
  wordOferta:          DocFile[];
  pptOferta:           DocFile[];
  lotesDocs:           Record<string, { word: DocFile[]; ppt: DocFile[] }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const TIPOLOGIAS = [
  "System Integration (SI)", "Mantenimiento evolutivo", "Mantenimiento correctivo",
  "AMS (Application Management Services)", "Soporte / Helpdesk", "PMO",
  "Consulting / Advisory", "Desarrollo a medida", "Servicios Cloud",
  "Ciberseguridad", "Data & AI", "Automatización / RPA", "Otros",
];
const RESULTADOS = ["Win", "Loss", "No aplica"];
const ESTADOS    = ["En curso", "Entregada", "Adjudicada", "Descartada"];
const ITEMS_PER_PAGE = 10;
const STORAGE_KEY    = "portal-ventas-ofertas";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const todayStr = () =>
  new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });

const fmtEuro = (n: number) =>
  new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(n);

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024)            return `${bytes} B`;
  if (bytes < 1024 * 1024)     return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const genId     = () => `offer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const genLoteId = () => `lote-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

function simulateFileDownload(file: DocFile) {
  const blob = new Blob(
    [`Portal de Ventas — Akena\n\nDocumento: ${file.name}\nTamaño: ${file.size}\n\n[Archivo simulado]`],
    { type: "text/plain;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href = url; a.download = file.name; a.click();
  URL.revokeObjectURL(url);
}

function makeFilePlaceholder(file: DocFile, folder: string): string {
  return [`Portal de Ventas — Akena`, `Carpeta: ${folder}`, `Fichero: ${file.name}`, `Tamaño: ${file.size}`, ``, `[Contenido simulado]`].join("\n");
}

async function downloadZip(oferta: Oferta): Promise<void> {
  const zip = new JSZip();
  const fPliegos = zip.folder("01_Pliegos_y_anexos")!;
  oferta.pliegosAnexos.forEach((f) => fPliegos.file(f.name, makeFilePlaceholder(f, "01_Pliegos_y_anexos")));
  const fOferta = zip.folder("02_Oferta")!;
  if (!oferta.tieneLotes) {
    oferta.wordOferta.forEach((f) => fOferta.file(f.name, makeFilePlaceholder(f, "02_Oferta")));
    oferta.pptOferta.forEach((f)  => fOferta.file(f.name, makeFilePlaceholder(f, "02_Oferta")));
  } else {
    oferta.lotes.forEach((l) => {
      const sf  = l.identificador.replace(/[^a-zA-Z0-9_\-]/g, "_");
      const sub = fOferta.folder(sf)!;
      const d   = oferta.lotesDocs[l.id] ?? { word: [], ppt: [] };
      d.word.forEach((f) => sub.file(f.name, makeFilePlaceholder(f, `02_Oferta/${sf}`)));
      d.ppt.forEach((f)  => sub.file(f.name, makeFilePlaceholder(f, `02_Oferta/${sf}`)));
    });
  }
  if (oferta.informeTecnico.length > 0 || oferta.informeEconomico.length > 0) {
    const fInf = zip.folder("03_Informes_valoracion")!;
    oferta.informeTecnico.forEach((f)  => fInf.file(f.name, makeFilePlaceholder(f, "03_Informes_valoracion")));
    oferta.informeEconomico.forEach((f) => fInf.file(f.name, makeFilePlaceholder(f, "03_Informes_valoracion")));
  }
  zip.file("README.txt", `Portal de Ventas — Akena\n\nExpediente: ${oferta.codigoExpediente}\nOferta: ${oferta.nombre}\nCliente: ${oferta.cliente}\nEstado: ${oferta.estado}`);
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  const safe = oferta.codigoExpediente.replace(/[^a-zA-Z0-9]/g, "_");
  a.href = url;
  a.download = `Oferta_${safe}_${oferta.cliente.replace(/\s+/g, "")}_${oferta.año}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed data
// ─────────────────────────────────────────────────────────────────────────────

const SEED: Oferta[] = [
  {
    id: "seed-1", codigoExpediente: "AEAT-2025-001",
    nombre: "Transformación Digital AEAT", tipologia: "Consulting / Advisory",
    cliente: "AEAT", año: "2025", duracion: "24 meses",
    presupuestoBase: 3200000, presupuestoOfertado: 3100000, descuento: 3.13,
    tieneLotes: false, lotes: [],
    pliegosAnexos: [{ name: "pliegos-aeat-2025.pdf", size: "2.1 MB" }],
    wordOferta: [{ name: "oferta-aeat-digital.docx", size: "1.4 MB" }],
    pptOferta: [{ name: "presentacion-aeat.pptx", size: "8.2 MB" }],
    lotesDocs: {}, estado: "En curso", resultado: "",
    informeTecnico: [], informeEconomico: [], sinInformes: false,
    updatedAt: "15/01/2025", updatedBy: "María García",
    createdAt: "10/01/2025", createdBy: "María García",
  },
  {
    id: "seed-2", codigoExpediente: "MINHAP-2025-003",
    nombre: "Plataforma Documental MINHAP", tipologia: "Desarrollo a medida",
    cliente: "MINHAP", año: "2025", duracion: "18 meses",
    presupuestoBase: 1800000, presupuestoOfertado: 1740000, descuento: 3.33,
    tieneLotes: false, lotes: [],
    pliegosAnexos: [{ name: "pliegos-minhap.pdf", size: "1.8 MB" }],
    wordOferta: [{ name: "oferta-documental.docx", size: "2.1 MB" }],
    pptOferta: [{ name: "ppt-minhap.pptx", size: "6.4 MB" }],
    lotesDocs: {}, estado: "En curso", resultado: "",
    informeTecnico: [], informeEconomico: [], sinInformes: false,
    updatedAt: "20/02/2025", updatedBy: "Carlos López",
    createdAt: "05/02/2025", createdBy: "Carlos López",
  },
  {
    id: "seed-3", codigoExpediente: "SEPE-2024-008",
    nombre: "Sistema SEPE Next", tipologia: "AMS (Application Management Services)",
    cliente: "SEPE", año: "2024", duracion: "36 meses",
    presupuestoBase: 5400000, presupuestoOfertado: 5200000, descuento: 3.70,
    tieneLotes: false, lotes: [],
    pliegosAnexos: [{ name: "pliegos-sepe.pdf", size: "3.2 MB" }],
    wordOferta: [{ name: "oferta-sepe-next.docx", size: "2.8 MB" }],
    pptOferta: [{ name: "ppt-sepe.pptx", size: "11.4 MB" }],
    lotesDocs: {}, estado: "Entregada", resultado: "",
    informeTecnico: [], informeEconomico: [], sinInformes: false,
    updatedAt: "12/09/2024", updatedBy: "Ana Martínez",
    createdAt: "01/09/2024", createdBy: "Ana Martínez",
  },
  {
    id: "seed-4", codigoExpediente: "CAT-2024-002",
    nombre: "Modernización Catastro 360", tipologia: "System Integration (SI)",
    cliente: "DG Catastro", año: "2024", duracion: "24 meses",
    presupuestoBase: 2800000, presupuestoOfertado: 2650000, descuento: 5.36,
    tieneLotes: true,
    lotes: [
      { id: "l1", identificador: "Lote 1 — Desarrollo core" },
      { id: "l2", identificador: "Lote 2 — Integración sistemas" },
    ],
    pliegosAnexos: [{ name: "pliegos-catastro.pdf", size: "4.1 MB" }],
    wordOferta: [], pptOferta: [],
    lotesDocs: {
      l1: { word: [{ name: "oferta-lote1.docx", size: "1.9 MB" }], ppt: [{ name: "ppt-lote1.pptx", size: "7.2 MB" }] },
      l2: { word: [{ name: "oferta-lote2.docx", size: "1.6 MB" }], ppt: [{ name: "ppt-lote2.pptx", size: "5.8 MB" }] },
    },
    estado: "Adjudicada", resultado: "Win",
    informeTecnico: [{ name: "informe-tecnico-catastro.pdf", size: "1.2 MB" }],
    informeEconomico: [{ name: "informe-eco-catastro.pdf", size: "0.9 MB" }],
    sinInformes: false, updatedAt: "03/11/2024", updatedBy: "Pedro Sánchez",
    createdAt: "01/07/2024", createdBy: "Pedro Sánchez",
  },
  {
    id: "seed-5", codigoExpediente: "DGT-2024-011",
    nombre: "Infraestructura Cloud DGT", tipologia: "Servicios Cloud",
    cliente: "DGT", año: "2024", duracion: "12 meses",
    presupuestoBase: 920000, presupuestoOfertado: 880000, descuento: 4.35,
    tieneLotes: false, lotes: [],
    pliegosAnexos: [{ name: "pliegos-dgt-cloud.pdf", size: "1.6 MB" }],
    wordOferta: [{ name: "oferta-dgt-cloud.docx", size: "1.1 MB" }],
    pptOferta: [{ name: "ppt-dgt.pptx", size: "4.9 MB" }],
    lotesDocs: {}, estado: "Descartada", resultado: "",
    informeTecnico: [], informeEconomico: [], sinInformes: false,
    updatedAt: "20/12/2024", updatedBy: "Laura Gómez",
    createdAt: "10/10/2024", createdBy: "Laura Gómez",
  },
  {
    id: "seed-6", codigoExpediente: "SEGSOC-2023-006",
    nombre: "Portal Ciudadano SEGSS", tipologia: "Desarrollo a medida",
    cliente: "Seg. Social", año: "2023", duracion: "30 meses",
    presupuestoBase: 4100000, presupuestoOfertado: 3900000, descuento: 4.88,
    tieneLotes: false, lotes: [],
    pliegosAnexos: [{ name: "pliegos-segsoc.pdf", size: "2.8 MB" }],
    wordOferta: [{ name: "oferta-portal-ciudadano.docx", size: "3.1 MB" }],
    pptOferta: [{ name: "ppt-segsoc.pptx", size: "9.7 MB" }],
    lotesDocs: {}, estado: "Adjudicada", resultado: "Win",
    informeTecnico: [{ name: "informe-tec-segsoc.pdf", size: "1.5 MB" }],
    informeEconomico: [{ name: "informe-eco-segsoc.pdf", size: "1.1 MB" }],
    sinInformes: false, updatedAt: "15/04/2023", updatedBy: "María García",
    createdAt: "01/02/2023", createdBy: "María García",
  },
  {
    id: "seed-7", codigoExpediente: "AEAT-2023-015",
    nombre: "Analytics Tributario AEAT", tipologia: "Data & AI",
    cliente: "AEAT", año: "2023", duracion: "18 meses",
    presupuestoBase: 2200000, presupuestoOfertado: 2100000, descuento: 4.55,
    tieneLotes: false, lotes: [],
    pliegosAnexos: [{ name: "pliegos-analytics.pdf", size: "1.9 MB" }],
    wordOferta: [{ name: "oferta-analytics.docx", size: "1.7 MB" }],
    pptOferta: [{ name: "ppt-analytics.pptx", size: "6.3 MB" }],
    lotesDocs: {}, estado: "Descartada", resultado: "",
    informeTecnico: [], informeEconomico: [], sinInformes: false,
    updatedAt: "30/11/2023", updatedBy: "Carlos López",
    createdAt: "01/08/2023", createdBy: "Carlos López",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Persistence
// ─────────────────────────────────────────────────────────────────────────────

function readOfertas(): Oferta[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Oferta[];
  } catch {}
  return SEED;
}
function saveOfertas(ofertas: Oferta[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ofertas)); } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// Status Chip — inline usage (MUI Chip + STATUS_CONFIG)
// ─────────────────────────────────────────────────────────────────────────────

const FALLBACK_TOKEN = { bg: "var(--muted)", color: "var(--muted-foreground)" };

function StatusChip({ status, colorOverride }: { status: string; colorOverride?: { bg: string; color: string } }) {
  const token = colorOverride ?? STATUS_CONFIG[status] ?? FALLBACK_TOKEN;
  return (
    <Chip
      label={status}
      size="small"
      sx={{
        bgcolor: token.bg,
        color: token.color,
        borderRadius: "var(--radius-chip)",
        height: 20,
        fontWeight: 600,
        "& .MuiChip-label": { px: "10px", fontSize: "var(--text-2xs)" },
      }}
    />
  );
}

function ResultadoChip({ resultado }: { resultado: string }) {
  if (!resultado) return <Typography variant="body2" color="text.secondary">—</Typography>;
  const token = resultado === "Win"
    ? { bg: "var(--success-subtle)",     color: "var(--success)" }
    : { bg: "var(--destructive-subtle)", color: "var(--destructive)" };
  return <StatusChip status={resultado} colorOverride={token} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// SectionCard — MUI Paper with header strip
// ─────────────────────────────────────────────────────────────────────────────

function SectionCard({ title, icon, action, children }: {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Paper variant="outlined" sx={{ flexShrink: 0, borderRadius: "var(--radius)" }}>
      <Box
        sx={{
          px: 2, py: 1.5,
          borderBottom: "1px solid var(--border)",
          bgcolor: "var(--neutral-subtle)",
          display: "flex", alignItems: "center", gap: 1,
        }}
      >
        {icon && <Box sx={{ color: "text.secondary", display: "flex", fontSize: 13 }}>{icon}</Box>}
        <Typography variant="caption" sx={{ fontWeight: 600, color: "text.primary", fontSize: "var(--text-xs)", flex: 1 }}>
          {title}
        </Typography>
        {action && action}
      </Box>
      <Box sx={{ p: 2 }}>{children}</Box>
    </Paper>
  );
}

// ─── Autofill helpers ─────────────────────────────────────────────────────────

function autoFilledSx(active: boolean): object {
  if (!active) return {};
  return {
    "& .MuiOutlinedInput-notchedOutline":       { borderColor: "var(--success) !important" },
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "var(--success) !important" },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ReadOnlyField
// ─────────────────────────────────────────────────────────────────────────────

function ReadOnlyField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
      <Typography
        variant="caption"
        component="div"
        sx={{ color: "text.secondary", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: "var(--text-2xs)" }}
      >
        {label}
      </Typography>
      <Typography variant="body2" component="div" sx={{ fontSize: "var(--text-sm)", color: value ? "text.primary" : "text.secondary", fontStyle: value ? "normal" : "italic" }}>
        {value || "—"}
      </Typography>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DocFileRow — file with individual download
// ─────────────────────────────────────────────────────────────────────────────

function DocFileRow({ file, canDownload = true }: { file: DocFile; canDownload?: boolean }) {
  return (
    <Box
      sx={{
        display: "flex", alignItems: "center", gap: 1.25,
        px: 1.5, py: 0.875,
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-banner)",
        bgcolor: "var(--muted)",
      }}
    >
      <Paperclip size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
      <Typography variant="caption" sx={{ flex: 1, fontSize: "var(--text-xs)", wordBreak: "break-all" }}>
        {file.name}
      </Typography>
      {file.size && (
        <Typography variant="caption" sx={{ fontSize: "var(--text-2xs)", color: "text.secondary", whiteSpace: "nowrap" }}>
          {file.size}
        </Typography>
      )}
      {canDownload && (
        <IconButton
          size="small"
          onClick={() => simulateFileDownload(file)}
          title={`Descargar ${file.name}`}
          sx={{ border: "1px solid var(--border)", borderRadius: "var(--radius-button)", width: 26, height: 26, p: 0 }}
        >
          <Download size={12} />
        </IconButton>
      )}
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DocFilePill — used in NuevaOfertaModal (with optional remove)
// ─────────────────────────────────────────────────────────────────────────────

function DocFilePill({ file, onRemove }: { file: DocFile; onRemove?: () => void }) {
  return (
    <Box
      sx={{
        display: "inline-flex", alignItems: "center", gap: 0.75,
        px: 1.25, py: 0.5,
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-banner)",
        bgcolor: "var(--muted)",
        fontSize: "var(--text-2xs)",
      }}
    >
      <Paperclip size={11} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
      <Typography variant="caption" sx={{ fontSize: "var(--text-2xs)" }}>{file.name}</Typography>
      <Typography variant="caption" sx={{ fontSize: "var(--text-2xs)", color: "text.secondary" }}>({file.size})</Typography>
      {onRemove && (
        <IconButton size="small" onClick={onRemove} sx={{ p: 0, ml: 0.25 }}>
          <X size={11} />
        </IconButton>
      )}
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FileUploadWidget
// ─────────────────────────────────────────────────────────────────────────────

function FileUploadWidget({
  label, accept = ".pdf,.docx,.pptx,.doc,.ppt",
  files, onAdd, onRemove, error,
}: {
  label: ReactNode;
  accept?: string;
  files: DocFile[];
  onAdd: (f: DocFile) => void;
  onRemove: (i: number) => void;
  error?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
      <Typography variant="caption" sx={{ fontWeight: 600, fontSize: "var(--text-xs)", color: "text.primary" }}>
        {label}
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, alignItems: "center" }}>
        {files.map((f, i) => (
          <DocFilePill key={i} file={f} onRemove={() => onRemove(i)} />
        ))}
        <Button
          variant="outlined"
          size="small"
          startIcon={<Upload size={11} />}
          onClick={() => ref.current?.click()}
          color="inherit"
          sx={{ fontSize: "var(--text-2xs)", borderStyle: "dashed", borderRadius: "var(--radius-button)" }}
        >
          Subir archivo
        </Button>
      </Box>
      <input ref={ref} type="file" accept={accept} style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onAdd({ name: file.name, size: formatFileSize(file.size) });
          e.target.value = "";
        }}
      />
      {error && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <AlertCircle size={11} style={{ color: "var(--destructive)" }} />
          <Typography variant="caption" sx={{ color: "var(--destructive)", fontSize: "var(--text-2xs)" }}>{error}</Typography>
        </Box>
      )}
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

const FORM_INIT: NuevaForm = {
  codigoExpediente: "", nombre: "", tipologias: [], tipologiaOtros: "", cliente: "",
  año: "", duracion: "", presupuestoBase: "", presupuestoOfertado: "",
  tieneLotes: "", nuevoLote: "", lotes: [],
  pliegosAnexos: [], wordOferta: [], pptOferta: [], lotesDocs: {},
};

function validateForm(f: NuevaForm): Record<string, string> {
  const e: Record<string, string> = {};
  if (!f.codigoExpediente.trim()) e.codigoExpediente = "Campo obligatorio";
  if (!f.nombre.trim())           e.nombre           = "Campo obligatorio";
  if (f.tipologias.length === 0)  e.tipologias       = "Selecciona al menos una tipología";
  if (f.tipologias.includes("Otros") && !f.tipologiaOtros.trim()) e.tipologiaOtros = "Describe la tipología personalizada";
  if (!f.cliente.trim())          e.cliente          = "Campo obligatorio";
  if (!f.año.trim())              e.año              = "Campo obligatorio";
  if (!f.duracion.trim())         e.duracion         = "Campo obligatorio";
  const base     = parseFloat(f.presupuestoBase);
  const ofertado = parseFloat(f.presupuestoOfertado);
  if (!f.presupuestoBase || isNaN(base) || base <= 0)           e.presupuestoBase     = "Introduce un importe válido";
  if (!f.presupuestoOfertado || isNaN(ofertado) || ofertado < 0) e.presupuestoOfertado = "Introduce un importe válido";
  if (!isNaN(base) && !isNaN(ofertado) && ofertado > base)       e.economico           = "El presupuesto ofertado no puede superar el presupuesto base";
  if (!f.tieneLotes) e.tieneLotes = "Selecciona una opción";
  if (f.tieneLotes === "si" && f.lotes.length === 0) e.lotes_req = "Añade al menos un lote";
  if (f.pliegosAnexos.length === 0) e.pliegosAnexos = "Sube los pliegos y anexos";
  if (f.tieneLotes === "no") {
    if (f.wordOferta.length === 0) e.wordOferta = "Sube el Word de oferta";
    if (f.pptOferta.length  === 0) e.pptOferta  = "Sube el PPT de oferta";
  }
  if (f.tieneLotes === "si") {
    f.lotes.forEach((l) => {
      const d = f.lotesDocs[l.id];
      if (!d || d.word.length === 0) e[`lote_word_${l.id}`] = `Word obligatorio para "${l.identificador}"`;
      if (!d || d.ppt.length  === 0) e[`lote_ppt_${l.id}`]  = `PPT obligatorio para "${l.identificador}"`;
    });
  }
  return e;
}

// ─────────────────────────────────────────────────────────────────────────────
// NuevaOfertaModal — MUI Dialog with scroll="paper"
// DialogTitle and DialogActions are always fixed.
// DialogContent is the ONLY scroll zone.
// ─────────────────────────────────────────────────────────────────────────────

function NuevaOfertaModal({ onClose, onCreate }: { onClose: () => void; onCreate: (o: Oferta) => void }) {
  const [form, setForm]     = useState<NuevaForm>(FORM_INIT);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Autofill / processing state ───────────────────────────────────────────
  type ProcFase = "idle" | "loading" | "done" | "partial";
  const [procFase,       setProcFase]       = useState<ProcFase>("idle");
  const [autorellenados, setAutorellenados] = useState<Set<string>>(new Set());
  const [tipSugerida,    setTipSugerida]    = useState<string | null>(null);
  const [yaProcess,      setYaProcess]      = useState(false);
  const [toast,          setToast]          = useState<{ tipo: "success" | "warning" | "error"; msg: string } | null>(null);

  const isAuto = (k: string) => autorellenados.has(k);

  const set = useCallback(<K extends keyof NuevaForm>(key: K, val: NuevaForm[K]) => {
    setForm((p) => ({ ...p, [key]: val }));
    setErrors((p) => { const n = { ...p }; delete n[key as string]; return n; });
    setAutorellenados((p) => {
      if (!p.has(key as string)) return p;
      const n = new Set(p); n.delete(key as string); return n;
    });
  }, []);

  const base     = parseFloat(form.presupuestoBase)     || 0;
  const ofertado = parseFloat(form.presupuestoOfertado) || 0;
  const descuento = base > 0 && ofertado >= 0 && ofertado <= base
    ? ((base - ofertado) / base) * 100 : null;

  const addLote = () => {
    const txt = form.nuevoLote.trim();
    if (!txt) return;
    const id = genLoteId();
    setForm((p) => ({ ...p, nuevoLote: "", lotes: [...p.lotes, { id, identificador: txt }], lotesDocs: { ...p.lotesDocs, [id]: { word: [], ppt: [] } } }));
    setErrors((p) => { const n = { ...p }; delete n.lotes_req; return n; });
  };
  const removeLote = (id: string) => {
    setForm((p) => { const d = { ...p.lotesDocs }; delete d[id]; return { ...p, lotes: p.lotes.filter((l) => l.id !== id), lotesDocs: d }; });
  };

  const addDoc    = (key: "pliegosAnexos" | "wordOferta" | "pptOferta", f: DocFile) => {
    setForm((p) => ({ ...p, [key]: [...p[key], f] }));
    setErrors((p) => { const n = { ...p }; delete n[key]; return n; });
  };
  const removeDoc = (key: "pliegosAnexos" | "wordOferta" | "pptOferta", i: number) =>
    setForm((p) => ({ ...p, [key]: p[key].filter((_, idx) => idx !== i) }));

  const addLoteDoc    = (loteId: string, kind: "word" | "ppt", f: DocFile) => {
    setForm((p) => { const old = p.lotesDocs[loteId] ?? { word: [], ppt: [] }; return { ...p, lotesDocs: { ...p.lotesDocs, [loteId]: { ...old, [kind]: [...old[kind], f] } } }; });
    setErrors((p) => { const n = { ...p }; delete n[`lote_${kind}_${loteId}`]; return n; });
  };
  const removeLoteDoc = (loteId: string, kind: "word" | "ppt", i: number) =>
    setForm((p) => { const old = p.lotesDocs[loteId] ?? { word: [], ppt: [] }; return { ...p, lotesDocs: { ...p.lotesDocs, [loteId]: { ...old, [kind]: old[kind].filter((_, idx) => idx !== i) } } }; });

  // ── Procesar pliegos (mock extracción) ───────────────────────────────────
  const handleProcesar = () => {
    if (form.pliegosAnexos.length === 0) return;
    setProcFase("loading");
    const multi = form.pliegosAnexos.length > 1;
    setTimeout(() => {
      const campos: Partial<NuevaForm> = {
        nombre:           "Transformación Digital — Plataforma Tributaria Estatal 2025",
        codigoExpediente: multi ? "EXP-AEAT-2025-0042" : "",
        cliente:          "Agencia Estatal de Administración Tributaria",
        año:              "2025",
        duracion:         "36 meses",
        presupuestoBase:  "4250000",
      };
      const tipConf  = multi ? "alta" : "baja";
      const tipValor = "System Integration (SI)";
      const parcial  = !multi;

      setForm((prev) => ({
        ...prev,
        nombre:           campos.nombre           || prev.nombre,
        codigoExpediente: campos.codigoExpediente || prev.codigoExpediente,
        cliente:          campos.cliente          || prev.cliente,
        año:              campos.año              || prev.año,
        duracion:         campos.duracion         || prev.duracion,
        presupuestoBase:  campos.presupuestoBase  || prev.presupuestoBase,
        tipologias:       tipConf === "alta" ? [tipValor] : prev.tipologias,
      }));

      const filled = new Set<string>(
        (Object.keys(campos) as (keyof NuevaForm)[]).filter((k) => Boolean(campos[k]))
      );
      if (tipConf === "alta") filled.add("tipologias");
      setAutorellenados(filled);
      setErrors((p) => { const n = { ...p }; filled.forEach((k) => delete n[k]); return n; });
      setTipSugerida(tipConf === "baja" && !form.tipologias.includes(tipValor) ? tipValor : null);
      setProcFase(parcial ? "partial" : "done");
      setYaProcess(true);

      const msg = parcial
        ? "Pliegos procesados parcialmente. Revisa los campos no completados."
        : "Pliegos procesados. Se han rellenado automáticamente los datos detectados.";
      setToast({ tipo: parcial ? "warning" : "success", msg });
      setTimeout(() => setToast(null), 7000);
    }, 2400);
  };

  const handleSubmit = () => {
    const errs = validateForm(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    const user = getAuthUser();
    const tipologiaStr = form.tipologias
      .map((t) => t === "Otros" ? (form.tipologiaOtros.trim() || "Otros") : t)
      .join(" · ");
    onCreate({
      id: genId(), codigoExpediente: form.codigoExpediente.trim(),
      nombre: form.nombre.trim(), tipologia: tipologiaStr,
      cliente: form.cliente.trim(), año: form.año.trim(), duracion: form.duracion.trim(),
      presupuestoBase: base, presupuestoOfertado: ofertado, descuento: descuento ?? 0,
      tieneLotes: form.tieneLotes === "si", lotes: form.lotes,
      pliegosAnexos: form.pliegosAnexos, wordOferta: form.wordOferta, pptOferta: form.pptOferta,
      lotesDocs: form.lotesDocs, estado: "En curso", resultado: "",
      informeTecnico: [], informeEconomico: [], sinInformes: false,
      updatedAt: todayStr(), updatedBy: user.name, createdAt: todayStr(), createdBy: user.name,
    });
  };

  return (
    <Dialog
      open
      onClose={onClose}
      fullWidth
      maxWidth="md"
      scroll="paper"   /* ← DialogTitle + DialogActions stay fixed; only DialogContent scrolls */
    >
      {/* ── Fixed header ─────────────────────────────────────────────────── */}
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <Box>
            <Typography variant="h6">Nueva oferta</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              Registra una nueva oferta en el Portal de Ventas
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ mt: -0.5, mr: -0.5 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* ── Scrollable body ───────────────────────────────────────────────── */}
      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2.5, p: 3 }}>

        {/* 1 — Datos de la licitación */}
        <SectionCard
          title="1 — Datos de la licitación"
          icon={<FileText size={13} />}
          action={
            <Tooltip
              title={
                form.pliegosAnexos.length === 0
                  ? "Debes subir los pliegos antes de poder procesarlos y rellenar automáticamente los campos."
                  : ""
              }
              arrow
              placement="left"
              disableHoverListener={form.pliegosAnexos.length > 0}
            >
              <span>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={form.pliegosAnexos.length === 0 || procFase === "loading"}
                  onClick={handleProcesar}
                  startIcon={
                    procFase === "loading"
                      ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} />
                      : yaProcess ? <RefreshCw size={11} /> : <Sparkles size={11} />
                  }
                  sx={{
                    whiteSpace: "nowrap",
                    fontSize: "var(--text-2xs)",
                    py: 0.375,
                    borderColor: form.pliegosAnexos.length > 0 ? "var(--primary)" : undefined,
                    color:       form.pliegosAnexos.length > 0 ? "var(--primary)"  : undefined,
                  }}
                >
                  {procFase === "loading"
                    ? "Procesando…"
                    : yaProcess ? "Reprocesar pliegos" : "Procesar pliegos"}
                </Button>
              </span>
            </Tooltip>
          }
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>

            {/* Hint de flujo (solo antes del primer procesado) */}
            {!yaProcess && (
              <Box sx={{
                display: "flex", alignItems: "flex-start", gap: 1.25,
                px: "var(--banner-px)", py: "var(--banner-py)",
                bgcolor: "var(--accent-subtle)", border: "1px solid var(--accent)",
                borderRadius: "var(--radius-banner)",
              }}>
                <Info size={12} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 1 }} />
                <Typography variant="caption" sx={{ color: "var(--accent)", lineHeight: 1.5 }}>
                  Sube los pliegos en la sección "Documentación obligatoria" y pulsa
                  <strong> "Procesar pliegos"</strong> (arriba a la derecha de este bloque)
                  para rellenar automáticamente estos campos.
                </Typography>
              </Box>
            )}

            {/* Banner: procesando */}
            {procFase === "loading" && (
              <Box sx={{
                display: "flex", alignItems: "center", gap: 1.5,
                px: "var(--banner-px)", py: "var(--banner-py)",
                bgcolor: "var(--accent-subtle)", border: "1px solid var(--accent)",
                borderRadius: "var(--radius-banner)",
              }}>
                <Loader2 size={13} style={{ color: "var(--accent)", flexShrink: 0, animation: "spin 1s linear infinite" }} />
                <Typography variant="caption" sx={{ color: "var(--accent)" }}>
                  Procesando pliegos para rellenar automáticamente los datos…
                </Typography>
              </Box>
            )}

            {/* Banner: resultado */}
            {(procFase === "done" || procFase === "partial") && (
              <Box sx={{
                display: "flex", alignItems: "flex-start", gap: 1.5,
                px: "var(--banner-px)", py: "var(--banner-py)",
                bgcolor: procFase === "done" ? "var(--success-subtle)" : "var(--warning-subtle)",
                border: `1px solid var(--${procFase === "done" ? "success" : "warning"})`,
                borderRadius: "var(--radius-banner)",
              }}>
                <CheckCircle2 size={13} style={{
                  color: procFase === "done" ? "var(--success)" : "var(--warning-foreground)",
                  flexShrink: 0, marginTop: 1,
                }} />
                <Typography variant="caption" sx={{ color: procFase === "done" ? "var(--success)" : "var(--warning-foreground)" }}>
                  {procFase === "done"
                    ? "Campos rellenados automáticamente desde los pliegos. Revisa y ajusta si es necesario."
                    : "Procesado parcial. Algunos campos no se pudieron extraer — complétalos manualmente."}
                </Typography>
              </Box>
            )}

            {/* Banner: tipología sugerida baja confianza */}
            {tipSugerida && (
              <Box sx={{
                display: "flex", alignItems: "flex-start", gap: 1.25,
                px: "var(--banner-px)", py: "var(--banner-py)",
                bgcolor: "var(--warning-subtle)", border: "1px solid var(--warning)",
                borderRadius: "var(--radius-banner)",
              }}>
                <Sparkles size={12} style={{ color: "var(--warning-foreground)", flexShrink: 0, marginTop: 1 }} />
                <Typography variant="caption" sx={{ color: "var(--warning-foreground)" }}>
                  Tipología sugerida con baja confianza: <strong>"{tipSugerida}"</strong>.
                  Selecciónala manualmente si es correcta.
                </Typography>
              </Box>
            )}

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <TextField
                size="small" fullWidth required
                label="Código de expediente"
                value={form.codigoExpediente}
                onChange={(e) => set("codigoExpediente", e.target.value)}
                error={!!errors.codigoExpediente}
                helperText={errors.codigoExpediente || (isAuto("codigoExpediente") ? "Autocompletado desde pliegos" : " ")}
                placeholder="Ej. AEAT-2025-001"
                sx={autoFilledSx(isAuto("codigoExpediente"))}
                FormHelperTextProps={isAuto("codigoExpediente") && !errors.codigoExpediente ? { style: { color: "var(--success)" } } : undefined}
              />
              <TextField
                size="small" fullWidth required
                label="Nombre de la oportunidad"
                value={form.nombre}
                onChange={(e) => set("nombre", e.target.value)}
                error={!!errors.nombre}
                helperText={errors.nombre || (isAuto("nombre") ? "Autocompletado desde pliegos" : " ")}
                placeholder="Ej. Transformación Digital AEAT"
                sx={autoFilledSx(isAuto("nombre"))}
                FormHelperTextProps={isAuto("nombre") && !errors.nombre ? { style: { color: "var(--success)" } } : undefined}
              />
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              {/* ── Tipología multiseleción ── */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0 }}>
                <TextField
                  select size="small" fullWidth required
                  label="Tipología de contrato"
                  value={form.tipologias}
                  onChange={(e) => {
                    const val = e.target.value as unknown as string[];
                    setForm((p) => ({ ...p, tipologias: val, tipologiaOtros: val.includes("Otros") ? p.tipologiaOtros : "" }));
                    setErrors((p) => { const n = { ...p }; delete n.tipologias; if (val.includes("Otros")) delete n.tipologiaOtros; return n; });
                    setAutorellenados((p) => { if (!p.has("tipologias")) return p; const n = new Set(p); n.delete("tipologias"); return n; });
                  }}
                  error={!!errors.tipologias}
                  helperText={errors.tipologias || (isAuto("tipologias") ? "Autocompletado desde pliegos" : " ")}
                  sx={autoFilledSx(isAuto("tipologias"))}
                  FormHelperTextProps={isAuto("tipologias") && !errors.tipologias ? { style: { color: "var(--success)" } } : undefined}
                  SelectProps={{
                    multiple: true,
                    renderValue: (selected) => (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, py: 0.25 }}>
                        {(selected as string[]).map((v) => (
                          <Chip
                            key={v}
                            label={v === "Otros" && form.tipologiaOtros ? `Otros: ${form.tipologiaOtros}` : v}
                            size="small"
                            sx={{ height: 20, fontSize: "var(--text-2xs)", bgcolor: "var(--primary)", color: "var(--primary-foreground)", "& .MuiChip-label": { px: 0.875 } }}
                          />
                        ))}
                      </Box>
                    ),
                  }}
                >
                  {TIPOLOGIAS.map((t) => (
                    <MenuItem key={t} value={t} sx={{ gap: 0.5 }}>
                      <Checkbox checked={form.tipologias.includes(t)} size="small" sx={{ p: 0.5 }} />
                      <ListItemText primary={t} primaryTypographyProps={{ variant: "body2" }} />
                    </MenuItem>
                  ))}
                </TextField>

                {/* Campo libre cuando "Otros" está marcado */}
                {form.tipologias.includes("Otros") && (
                  <TextField
                    size="small" fullWidth
                    label="Describe la tipología personalizada"
                    placeholder="Ej. Outsourcing de infraestructura"
                    value={form.tipologiaOtros}
                    onChange={(e) => {
                      setForm((p) => ({ ...p, tipologiaOtros: e.target.value }));
                      setErrors((p) => { const n = { ...p }; delete n.tipologiaOtros; return n; });
                    }}
                    error={!!errors.tipologiaOtros}
                    helperText={errors.tipologiaOtros || " "}
                    sx={{ mt: -1.5 }}
                  />
                )}
              </Box>
              <TextField
                size="small" fullWidth required
                label="Cliente"
                value={form.cliente}
                onChange={(e) => set("cliente", e.target.value)}
                error={!!errors.cliente}
                helperText={errors.cliente || (isAuto("cliente") ? "Autocompletado desde pliegos" : " ")}
                placeholder="Ej. AEAT"
                sx={autoFilledSx(isAuto("cliente"))}
                FormHelperTextProps={isAuto("cliente") && !errors.cliente ? { style: { color: "var(--success)" } } : undefined}
              />
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 2 }}>
              <TextField
                size="small" fullWidth required
                type="number" label="Año"
                value={form.año}
                onChange={(e) => set("año", e.target.value)}
                error={!!errors.año}
                helperText={errors.año || (isAuto("año") ? "Autocompletado desde pliegos" : " ")}
                placeholder="2025"
                slotProps={{ htmlInput: { min: 2000, max: 2099 } }}
                sx={autoFilledSx(isAuto("año"))}
                FormHelperTextProps={isAuto("año") && !errors.año ? { style: { color: "var(--success)" } } : undefined}
              />
              <TextField
                size="small" fullWidth required
                label="Duración del contrato"
                value={form.duracion}
                onChange={(e) => set("duracion", e.target.value)}
                error={!!errors.duracion}
                helperText={errors.duracion || (isAuto("duracion") ? "Autocompletado desde pliegos" : " ")}
                placeholder="Ej. 24 meses"
                sx={autoFilledSx(isAuto("duracion"))}
                FormHelperTextProps={isAuto("duracion") && !errors.duracion ? { style: { color: "var(--success)" } } : undefined}
              />
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <TextField
                size="small" fullWidth required
                type="number" label="Presupuesto base s/IVA (€)"
                value={form.presupuestoBase}
                onChange={(e) => set("presupuestoBase", e.target.value)}
                error={!!errors.presupuestoBase}
                helperText={errors.presupuestoBase || (isAuto("presupuestoBase") ? "Autocompletado desde pliegos" : " ")}
                placeholder="0"
                slotProps={{ htmlInput: { min: 0, step: 1000 } }}
                sx={autoFilledSx(isAuto("presupuestoBase"))}
                FormHelperTextProps={isAuto("presupuestoBase") && !errors.presupuestoBase ? { style: { color: "var(--success)" } } : undefined}
              />
              <TextField
                size="small" fullWidth required
                type="number" label="Presupuesto ofertado s/IVA (€)"
                value={form.presupuestoOfertado}
                onChange={(e) => set("presupuestoOfertado", e.target.value)}
                error={!!(errors.presupuestoOfertado || errors.economico)}
                helperText={errors.presupuestoOfertado || " "}
                placeholder="0"
                slotProps={{ htmlInput: { min: 0, step: 1000 } }}
              />
            </Box>

            {/* Descuento calculado */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 1.75, py: 1.125, borderRadius: "var(--radius-banner)", bgcolor: "var(--neutral-subtle)", border: "1px solid var(--border)" }}>
              <Typography variant="caption" color="text.secondary">Descuento aplicado (calculado):</Typography>
              <Typography variant="caption" sx={{ fontWeight: 600, color: descuento !== null ? "var(--primary)" : "text.secondary" }}>
                {descuento !== null ? `${descuento.toFixed(2)}%` : "—"}
              </Typography>
            </Box>

            {errors.economico && (
              <Alert severity="error" icon={<AlertCircle size={14} />} sx={{ py: 0.5 }}>
                {errors.economico}
              </Alert>
            )}
          </Box>
        </SectionCard>

        {/* 2 — Lotes */}
        <SectionCard title="2 — Lotes">
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.75 }}>
            <TextField
              select size="small" required
              label="¿La licitación tiene lotes?"
              value={form.tieneLotes}
              onChange={(e) => set("tieneLotes", e.target.value as "" | "si" | "no")}
              error={!!errors.tieneLotes} helperText={errors.tieneLotes || " "}
              sx={{ maxWidth: 260 }}
            >
              <MenuItem key="tienelotes-empty" value=""><em>Selecciona una opción</em></MenuItem>
              <MenuItem key="tienelotes-si" value="si">Sí</MenuItem>
              <MenuItem key="tienelotes-no" value="no">No</MenuItem>
            </TextField>

            {form.tieneLotes === "si" && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
                <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                  <TextField
                    size="small"
                    label="Identificador del lote"
                    value={form.nuevoLote}
                    onChange={(e) => set("nuevoLote", e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLote(); } }}
                    placeholder="Ej. Lote 1 — Desarrollo"
                    sx={{ flex: 1 }}
                  />
                  <Button
                    variant="outlined" size="small"
                    startIcon={<Plus size={13} />}
                    onClick={addLote}
                    sx={{ mt: 0.25, whiteSpace: "nowrap" }}
                  >
                    Añadir lote
                  </Button>
                </Box>

                {errors.lotes_req && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <AlertCircle size={11} style={{ color: "var(--destructive)" }} />
                    <Typography variant="caption" sx={{ color: "var(--destructive)", fontSize: "var(--text-2xs)" }}>{errors.lotes_req}</Typography>
                  </Box>
                )}

                {form.lotes.map((l) => (
                  <Box key={l.id} sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 0.875, border: "1px solid var(--border)", borderRadius: "var(--radius-banner)", bgcolor: "var(--muted)" }}>
                    <Typography variant="caption" sx={{ flex: 1, fontSize: "var(--text-xs)" }}>{l.identificador}</Typography>
                    <IconButton size="small" onClick={() => removeLote(l.id)} sx={{ p: 0.25 }}><X size={14} /></IconButton>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </SectionCard>

        {/* 3 — Documentación obligatoria — SIEMPRE VISIBLE */}
        <SectionCard title="3 — Documentación obligatoria" icon={<Paperclip size={13} />}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.25 }}>
              <FileUploadWidget
                label={<>📁 Pliegos y anexos (documentación común) <span style={{ color: "var(--destructive)" }}>*</span></>}
                accept=".pdf,.docx,.doc,.zip"
                files={form.pliegosAnexos}
                onAdd={(f) => addDoc("pliegosAnexos", f)}
                onRemove={(i) => removeDoc("pliegosAnexos", i)}
                error={errors.pliegosAnexos}
              />

              {form.tieneLotes === "no" && (
                <>
                  <Box sx={{ borderTop: "1px solid var(--border)", pt: 1.75 }}>
                    <FileUploadWidget
                      label={<>Word oferta (.docx) <span style={{ color: "var(--destructive)" }}>*</span></>}
                      accept=".docx,.doc"
                      files={form.wordOferta}
                      onAdd={(f) => addDoc("wordOferta", f)}
                      onRemove={(i) => removeDoc("wordOferta", i)}
                      error={errors.wordOferta}
                    />
                  </Box>
                  <FileUploadWidget
                    label={<>PPT editables (.pptx) <span style={{ color: "var(--destructive)" }}>*</span></>}
                    accept=".pptx,.ppt"
                    files={form.pptOferta}
                    onAdd={(f) => addDoc("pptOferta", f)}
                    onRemove={(i) => removeDoc("pptOferta", i)}
                    error={errors.pptOferta}
                  />
                </>
              )}

              {form.tieneLotes === "si" && form.lotes.map((l) => {
                const d = form.lotesDocs[l.id] ?? { word: [], ppt: [] };
                return (
                  <Box key={l.id} sx={{ borderTop: "1px solid var(--border)", pt: 1.75, display: "flex", flexDirection: "column", gap: 1.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: "var(--primary)", fontSize: "var(--text-xs)" }}>
                      Lote: {l.identificador}
                    </Typography>
                    <FileUploadWidget
                      label={<>Word oferta lote (.docx) <span style={{ color: "var(--destructive)" }}>*</span></>}
                      accept=".docx,.doc"
                      files={d.word}
                      onAdd={(f) => addLoteDoc(l.id, "word", f)}
                      onRemove={(i) => removeLoteDoc(l.id, "word", i)}
                      error={errors[`lote_word_${l.id}`]}
                    />
                    <FileUploadWidget
                      label={<>PPT editables lote (.pptx) <span style={{ color: "var(--destructive)" }}>*</span></>}
                      accept=".pptx,.ppt"
                      files={d.ppt}
                      onAdd={(f) => addLoteDoc(l.id, "ppt", f)}
                      onRemove={(i) => removeLoteDoc(l.id, "ppt", i)}
                      error={errors[`lote_ppt_${l.id}`]}
                    />
                  </Box>
                );
              })}
            </Box>
          </SectionCard>
      </DialogContent>


      {/* ── Fixed footer ─────────────────────────────────────────────────── */}
      <DialogActions sx={{ px: 3, py: 1.5, gap: 1 }}>
        <Button variant="outlined" color="inherit" onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          startIcon={<CheckCircle2 size={14} />}
          onClick={handleSubmit}
        >
          Crear oferta
        </Button>
      </DialogActions>

      {/* Toast de resultado del procesado */}
      <Snackbar
        open={toast !== null}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        sx={{ bottom: 24 }}
      >
        <Alert
          severity={toast?.tipo ?? "success"}
          onClose={() => setToast(null)}
          sx={{ minWidth: 320, maxWidth: 480, boxShadow: "var(--elevation-sm)" }}
        >
          {toast?.msg}
        </Alert>
      </Snackbar>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ConsultarModal — MUI Dialog with scroll="paper"
// ─────────────────────────────────────────────────────────────────────────────

interface ConsultarEdit {
  estado:          string;
  resultado:       string;
  informeTecnico:  DocFile[];
  informeEconomico: DocFile[];
  sinInformes:     boolean;
}

function consultarInit(o: Oferta): ConsultarEdit {
  return {
    estado: o.estado, resultado: o.resultado,
    informeTecnico: [...o.informeTecnico],
    informeEconomico: [...o.informeEconomico],
    sinInformes: o.sinInformes,
  };
}

function ConsultarModal({
  oferta, onClose, onSave, onDelete, canEdit = true, canDelete = true, canDownload = true,
}: {
  oferta: Oferta;
  onClose: () => void;
  onSave: (updated: Oferta) => void;
  onDelete: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
  canDownload?: boolean;
}) {
  const [edit, setEdit]              = useState<ConsultarEdit>(() => consultarInit(oferta));
  const [saveError, setSaveError]    = useState<string | null>(null);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const isDirty = canEdit && JSON.stringify(edit) !== JSON.stringify(consultarInit(oferta));

  const handleClose = useCallback(() => {
    if (isDirty) setShowConfirmClose(true);
    else onClose();
  }, [isDirty, onClose]);

  const forceClose = () => { setShowConfirmClose(false); onClose(); };

  const setField = <K extends keyof ConsultarEdit>(key: K, val: ConsultarEdit[K]) => {
    setEdit((p) => ({ ...p, [key]: val }));
    setSaveError(null);
  };

  const addInforme    = (kind: "informeTecnico" | "informeEconomico", f: DocFile) => {
    setEdit((p) => ({ ...p, [kind]: [...p[kind], f] }));
    setSaveError(null);
  };
  const removeInforme = (kind: "informeTecnico" | "informeEconomico", i: number) =>
    setEdit((p) => ({ ...p, [kind]: p[kind].filter((_, idx) => idx !== i) }));

  const handleSave = () => {
    if (edit.estado === "Adjudicada") {
      if (!edit.resultado) { setSaveError("Debe informar el resultado para adjudicar la oferta."); return; }
      if (!edit.sinInformes && (edit.informeTecnico.length === 0 || edit.informeEconomico.length === 0)) {
        setSaveError("Debe subir los informes de valoración para adjudicar la oferta.");
        return;
      }
    }
    const user = getAuthUser();
    onSave({
      ...oferta,
      estado: edit.estado,
      resultado: edit.estado === "Adjudicada" ? edit.resultado : "",
      informeTecnico: edit.informeTecnico,
      informeEconomico: edit.informeEconomico,
      sinInformes: edit.sinInformes,
      updatedAt: todayStr(),
      updatedBy: user.name,
    });
  };

  const tecnicoRef   = useRef<HTMLInputElement>(null);
  const economicoRef = useRef<HTMLInputElement>(null);

  return (
    <Dialog
      open
      onClose={handleClose}
      fullWidth
      maxWidth="md"
      scroll="paper"
    >
      {/* ── Fixed header ─────────────────────────────────────────────────── */}
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
              <Typography variant="h6">Consultar oferta</Typography>
              <StatusChip status={edit.estado} />
              {edit.estado === "Adjudicada" && edit.resultado && (
                <ResultadoChip resultado={edit.resultado} />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary">
              {oferta.codigoExpediente} · {oferta.nombre}
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small" sx={{ mt: -0.5, mr: -0.5 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Unsaved changes warning */}
        <Collapse in={showConfirmClose}>
          <Alert
            severity="warning"
            icon={<AlertTriangle size={14} />}
            sx={{ mt: 1 }}
            action={
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <Button size="small" color="inherit" onClick={() => setShowConfirmClose(false)}>Cancelar</Button>
                <Button size="small" variant="contained" color="warning" onClick={forceClose}>Salir sin guardar</Button>
              </Box>
            }
          >
            Tienes cambios sin guardar. ¿Salir sin guardar?
          </Alert>
        </Collapse>
      </DialogTitle>

      {/* ── Scrollable body ───────────────────────────────────────────────── */}
      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2.5, p: 3 }}>

        {/* Datos de la licitación (read-only) */}
        <SectionCard title="Datos de la licitación" icon={<FileText size={13} />}>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <ReadOnlyField label="Código de expediente"    value={oferta.codigoExpediente} />
            <ReadOnlyField label="Nombre de la oportunidad" value={oferta.nombre} />
            <ReadOnlyField label="Tipología de contrato"   value={oferta.tipologia} />
            <ReadOnlyField label="Cliente"                 value={oferta.cliente} />
            <ReadOnlyField label="Año"                     value={oferta.año} />
            <ReadOnlyField label="Duración del contrato"   value={oferta.duracion} />
            <ReadOnlyField
              label="Presupuesto base s/IVA"
              value={`${fmtEuro(oferta.presupuestoBase)} €`}
            />
            <ReadOnlyField
              label="Presupuesto ofertado s/IVA"
              value={`${fmtEuro(oferta.presupuestoOfertado)} €`}
            />
            <ReadOnlyField label="Descuento aplicado"   value={`${oferta.descuento.toFixed(2)}%`} />
            <ReadOnlyField label="Lotes"                value={oferta.tieneLotes ? `Sí (${oferta.lotes.length})` : "No"} />
            <ReadOnlyField label="Creado el"            value={oferta.createdAt} />
            <ReadOnlyField label="Creado por"           value={oferta.createdBy} />
          </Box>
        </SectionCard>

        {/* Lotes (read-only, if any) */}
        {oferta.tieneLotes && oferta.lotes.length > 0 && (
          <SectionCard title="Lotes">
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
              {oferta.lotes.map((l) => (
                <Box key={l.id} sx={{ px: 1.5, py: 0.875, border: "1px solid var(--border)", borderRadius: "var(--radius-banner)", bgcolor: "var(--muted)" }}>
                  <Typography variant="caption" sx={{ fontSize: "var(--text-xs)" }}>{l.identificador}</Typography>
                </Box>
              ))}
            </Box>
          </SectionCard>
        )}

        {/* Documentación (read-only) */}
        <SectionCard title="Documentación" icon={<Paperclip size={13} />}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {oferta.pliegosAnexos.length > 0 && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, fontSize: "var(--text-xs)", color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Pliegos y anexos
                </Typography>
                {oferta.pliegosAnexos.map((f, i) => <DocFileRow key={i} file={f} canDownload={canDownload} />)}
              </Box>
            )}
            {!oferta.tieneLotes && (
              <>
                {oferta.wordOferta.length > 0 && (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, fontSize: "var(--text-xs)", color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.04em" }}>Word oferta</Typography>
                    {oferta.wordOferta.map((f, i) => <DocFileRow key={i} file={f} canDownload={canDownload} />)}
                  </Box>
                )}
                {oferta.pptOferta.length > 0 && (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, fontSize: "var(--text-xs)", color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.04em" }}>PPT editables</Typography>
                    {oferta.pptOferta.map((f, i) => <DocFileRow key={i} file={f} canDownload={canDownload} />)}
                  </Box>
                )}
              </>
            )}
            {oferta.tieneLotes && oferta.lotes.map((l) => {
              const d = oferta.lotesDocs[l.id] ?? { word: [], ppt: [] };
              return (
                <Box key={l.id} sx={{ borderTop: "1px solid var(--border)", pt: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: "var(--primary)", fontSize: "var(--text-xs)" }}>
                    {l.identificador}
                  </Typography>
                  {d.word.map((f, i) => <DocFileRow key={`w${i}`} file={f} canDownload={canDownload} />)}
                  {d.ppt.map((f, i)  => <DocFileRow key={`p${i}`} file={f} canDownload={canDownload} />)}
                </Box>
              );
            })}
          </Box>
        </SectionCard>

        {/* Estado y resultado */}
        <SectionCard title="Estado y resultado">
          {canEdit ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                <TextField select size="small" fullWidth label="Estado" value={edit.estado}
                  onChange={(e) => setField("estado", e.target.value)}>
                  {ESTADOS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </TextField>
                {edit.estado === "Adjudicada" ? (
                  <TextField select size="small" fullWidth label="Resultado" value={edit.resultado}
                    onChange={(e) => setField("resultado", e.target.value)}>
                    <MenuItem key="resultado-empty" value=""><em>Selecciona resultado</em></MenuItem>
                    {RESULTADOS.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                  </TextField>
                ) : <Box />}
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <ReadOnlyField label="Estado" value={<StatusChip status={oferta.estado} />} />
              {oferta.resultado && <ReadOnlyField label="Resultado" value={oferta.resultado} />}
            </Box>
          )}
        </SectionCard>

        {/* Informes de valoración */}
        {(canEdit ? edit.estado : oferta.estado) === "Adjudicada" && (
          <SectionCard title="Informes de valoración">
            {canEdit ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.75 }}>
                <FormControlLabel
                  control={
                    <Checkbox id="c-sin-informes" checked={edit.sinInformes} size="small"
                      onChange={(e) => setField("sinInformes", e.target.checked)}
                      sx={{ color: "var(--border)", "&.Mui-checked": { color: "var(--primary)" } }}
                    />
                  }
                  label="Marcar que no existen informes de valoración"
                />
                {!edit.sinInformes && (
                  <>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, fontSize: "var(--text-xs)" }}>
                        Informe técnico <span style={{ color: "var(--destructive)" }}>*</span>
                      </Typography>
                      {edit.informeTecnico.map((f, i) => (
                        <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <DocFileRow file={f} canDownload={canDownload} />
                          <IconButton size="small" onClick={() => removeInforme("informeTecnico", i)} sx={{ p: 0.25 }}>
                            <X size={13} />
                          </IconButton>
                        </Box>
                      ))}
                      <input ref={tecnicoRef} type="file" accept=".pdf,.docx" style={{ display: "none" }}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) addInforme("informeTecnico", { name: f.name, size: formatFileSize(f.size) }); e.target.value = ""; }}
                      />
                      <Button variant="outlined" size="small" startIcon={<Upload size={11} />}
                        onClick={() => tecnicoRef.current?.click()} color="inherit"
                        sx={{ alignSelf: "flex-start", fontSize: "var(--text-2xs)", borderStyle: "dashed" }}>
                        Subir informe técnico
                      </Button>
                    </Box>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, fontSize: "var(--text-xs)" }}>
                        Informe económico <span style={{ color: "var(--destructive)" }}>*</span>
                      </Typography>
                      {edit.informeEconomico.map((f, i) => (
                        <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <DocFileRow file={f} canDownload={canDownload} />
                          <IconButton size="small" onClick={() => removeInforme("informeEconomico", i)} sx={{ p: 0.25 }}>
                            <X size={13} />
                          </IconButton>
                        </Box>
                      ))}
                      <input ref={economicoRef} type="file" accept=".pdf,.docx" style={{ display: "none" }}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) addInforme("informeEconomico", { name: f.name, size: formatFileSize(f.size) }); e.target.value = ""; }}
                      />
                      <Button variant="outlined" size="small" startIcon={<Upload size={11} />}
                        onClick={() => economicoRef.current?.click()} color="inherit"
                        sx={{ alignSelf: "flex-start", fontSize: "var(--text-2xs)", borderStyle: "dashed" }}>
                        Subir informe económico
                      </Button>
                    </Box>
                  </>
                )}
              </Box>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                {oferta.sinInformes
                  ? <Typography variant="caption" color="text.secondary">Sin informes de valoración</Typography>
                  : <>
                      {oferta.informeTecnico.map((f, i) => <DocFileRow key={i} file={f} canDownload={canDownload} />)}
                      {oferta.informeEconomico.map((f, i) => <DocFileRow key={i} file={f} canDownload={canDownload} />)}
                    </>
                }
              </Box>
            )}
          </SectionCard>
        )}

        {/* Audit trail */}
        {oferta.updatedAt && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 1, borderRadius: "var(--radius-banner)", bgcolor: "var(--neutral-subtle)", border: "1px solid var(--border)" }}>
            <User size={12} style={{ color: "var(--muted-foreground)" }} />
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "var(--text-2xs)" }}>
              Actualizado el{" "}
              <strong style={{ color: "var(--foreground)" }}>{oferta.updatedAt}</strong>
              {" "}por{" "}
              <strong style={{ color: "var(--foreground)" }}>{oferta.updatedBy}</strong>
            </Typography>
          </Box>
        )}

        {/* Save error */}
        {saveError && (
          <Alert severity="error" icon={<AlertCircle size={14} />} onClose={() => setSaveError(null)}>
            {saveError}
          </Alert>
        )}
      </DialogContent>

      {/* ── Fixed footer ─────────────────────────────────────────────────── */}
      <DialogActions sx={{ px: 3, py: 1.5, justifyContent: "space-between" }}>
        <Box>
          {canDelete && (
            <Button variant="outlined" color="error" startIcon={<Trash2 size={13} />}
              onClick={() => {
                if (window.confirm(`¿Eliminar la oferta "${oferta.nombre}"? Esta acción no se puede deshacer.`))
                  onDelete();
              }}>
              Eliminar oferta
            </Button>
          )}
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="outlined" color="inherit" onClick={handleClose}>
            {canEdit ? "Cancelar" : "Cerrar"}
          </Button>
          {canEdit && (
            <Button variant="contained" startIcon={<CheckCircle2 size={14} />}
              onClick={handleSave} disabled={!isDirty}>
              Guardar cambios
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VentasPortal — main export
// ─────────────────────────────────────────────────────────────────────────────

export function VentasPortal() {
  const [ofertas, setOfertas]         = useState<Oferta[]>(() => readOfertas());
  const [view, setView]               = useState<"list" | "nueva" | "consultar">("list");
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [page, setPage]               = useState(1);
  const [search, setSearch]           = useState("");
  const [filterAño, setFilterAño]             = useState("");
  const [filterEstado, setFilterEstado]       = useState("");
  const [filterResultado, setFilterResultado] = useState("");
  const [successMsg, setSuccessMsg]   = useState("");

  const selectedOferta = ofertas.find((o) => o.id === selectedId) ?? null;

  const user          = getAuthUser();
  const canDownload   = user.role !== "Lectura";
  const canEdit       = user.role === "Editor" || user.role === "Admin";
  const canDelete     = user.role === "Admin";

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 5000);
  };

  const openConsultar = (id: string) => { setSelectedId(id); setView("consultar"); };

  const años = Array.from(new Set(ofertas.map((o) => o.año).filter((a): a is string => a != null && a !== ""))).sort().reverse();

  const filtered = ofertas.filter((o) => {
    const q = search.toLowerCase();
    return (
      (!q || o.nombre.toLowerCase().includes(q) || o.cliente.toLowerCase().includes(q) || o.codigoExpediente.toLowerCase().includes(q)) &&
      (!filterAño       || o.año === filterAño) &&
      (!filterEstado    || o.estado === filterEstado) &&
      (!filterResultado || o.resultado === filterResultado)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const pageRows   = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const handleCreate = (oferta: Oferta) => {
    const next = [oferta, ...ofertas];
    setOfertas(next); saveOfertas(next);
    setView("list");
    showSuccess("La oferta se ha creado correctamente en el Portal de Ventas.");
  };

  const handleSave = (updated: Oferta) => {
    const next = ofertas.map((o) => o.id === updated.id ? updated : o);
    setOfertas(next); saveOfertas(next);
    setView("list"); setSelectedId(null);
    showSuccess("Los cambios se han guardado correctamente.");
  };

  const handleDelete = (id: string) => {
    const next = ofertas.filter((o) => o.id !== id);
    setOfertas(next); saveOfertas(next);
    setView("list"); setSelectedId(null);
    showSuccess("La oferta ha sido eliminada.");
  };

  const hasFilters = !!(search || filterAño || filterEstado || filterResultado);
  const clearFilters = () => { setSearch(""); setFilterAño(""); setFilterEstado(""); setFilterResultado(""); setPage(1); };

  return (
    <Box>
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, mb: 2, flexWrap: "wrap" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          {/* Search */}
          <TextField
            size="small"
            placeholder="Buscar oportunidad o cliente..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            sx={{ width: 280 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={14} style={{ color: "var(--muted-foreground)" }} />
                  </InputAdornment>
                ),
              },
            }}
          />

          {/* Año filter */}
          <TextField
            select size="small"
            value={filterAño}
            onChange={(e) => { setFilterAño(e.target.value); setPage(1); }}
            sx={{ minWidth: 90 }}
            SelectProps={{ displayEmpty: true }}
          >
            <MenuItem key="año-all" value=""><span style={{ color: "var(--muted-foreground)" }}>Año</span></MenuItem>
            {años.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </TextField>

          {/* Estado filter */}
          <TextField
            select size="small"
            value={filterEstado}
            onChange={(e) => { setFilterEstado(e.target.value); setPage(1); }}
            sx={{ minWidth: 120 }}
            SelectProps={{ displayEmpty: true }}
          >
            <MenuItem key="estado-all" value=""><span style={{ color: "var(--muted-foreground)" }}>Estado</span></MenuItem>
            {ESTADOS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </TextField>

          {/* Resultado filter */}
          <TextField
            select size="small"
            value={filterResultado}
            onChange={(e) => { setFilterResultado(e.target.value); setPage(1); }}
            sx={{ minWidth: 130 }}
            SelectProps={{ displayEmpty: true }}
          >
            <MenuItem key="resultado-all" value=""><span style={{ color: "var(--muted-foreground)" }}>Resultado</span></MenuItem>
            {RESULTADOS.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
          </TextField>

          {hasFilters && (
            <Button
              variant="text" size="small" color="inherit"
              startIcon={<X size={12} />}
              onClick={clearFilters}
              sx={{ fontSize: "var(--text-xs)", color: "text.secondary" }}
            >
              Limpiar
            </Button>
          )}
        </Box>

        {canEdit && (
          <Button
            variant="contained" size="small"
            startIcon={<Plus size={14} />}
            onClick={() => setView("nueva")}
          >
            Nueva oferta
          </Button>
        )}
      </Box>

      {/* ── Success alert ────────────────────────────────────────────────── */}
      <Collapse in={!!successMsg}>
        <Alert
          severity="success"
          icon={<CheckCircle2 size={14} />}
          onClose={() => setSuccessMsg("")}
          sx={{ mb: 2 }}
        >
          {successMsg}
        </Alert>
      </Collapse>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: "var(--radius)" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>NOMBRE OPORTUNIDAD</TableCell>
              <TableCell sx={{ width: 120 }}>CLIENTE</TableCell>
              <TableCell sx={{ width: 72 }}>AÑO</TableCell>
              <TableCell sx={{ width: 120 }}>ESTADO</TableCell>
              <TableCell sx={{ width: 110 }}>RESULTADO</TableCell>
              <TableCell sx={{ width: 110 }}>ACCIONES</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 5, color: "text.secondary" }}>
                  No hay oportunidades que coincidan con los filtros aplicados.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((o) => (
                <TableRow
                  key={o.id}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => openConsultar(o.id)}
                  title="Clic para consultar la oferta"
                >
                  {/* Nombre + expediente */}
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>
                        {o.nombre}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: "var(--text-2xs)" }}>
                        {o.codigoExpediente}
                      </Typography>
                    </Box>
                  </TableCell>

                  <TableCell>
                    <Typography variant="caption" color="text.secondary">{o.cliente}</Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="caption" color="text.secondary">{o.año}</Typography>
                  </TableCell>

                  <TableCell>
                    <StatusChip status={o.estado} />
                  </TableCell>

                  <TableCell>
                    {o.estado === "Adjudicada"
                      ? <ResultadoChip resultado={o.resultado} />
                      : <Typography variant="body2" color="text.secondary">—</Typography>
                    }
                  </TableCell>

                  {/* Actions — stop row click propagation */}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                      <Tooltip title="Consultar">
                        <IconButton size="small" onClick={() => openConsultar(o.id)}>
                          <Eye size={14} />
                        </IconButton>
                      </Tooltip>
                      {canDownload && (
                        <Tooltip title="Descargar ZIP">
                          <IconButton size="small" onClick={() => downloadZip(o)}>
                            <Download size={14} />
                          </IconButton>
                        </Tooltip>
                      )}
                      {canDelete && (
                        <Tooltip title="Eliminar">
                          <IconButton size="small" color="error"
                            onClick={() => { if (window.confirm(`¿Eliminar "${o.nombre}"?`)) handleDelete(o.id); }}>
                            <Trash2 size={14} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 1.75, flexWrap: "wrap", gap: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "var(--text-xs)" }}>
          {filtered.length === 0
            ? "Sin resultados"
            : `${filtered.length} oferta${filtered.length !== 1 ? "s" : ""} · Página ${safePage} de ${totalPages}`}
        </Typography>
        {totalPages > 1 && (
          <Pagination
            count={totalPages}
            page={safePage}
            onChange={(_, p) => setPage(p)}
            size="small"
            color="primary"
          />
        )}
      </Box>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      {view === "nueva" && (
        <NuevaOfertaModal onClose={() => setView("list")} onCreate={handleCreate} />
      )}
      {view === "consultar" && selectedOferta && (
        <ConsultarModal
          oferta={selectedOferta}
          onClose={() => { setView("list"); setSelectedId(null); }}
          onSave={handleSave}
          onDelete={() => handleDelete(selectedOferta.id)}
          canEdit={canEdit}
          canDelete={canDelete}
          canDownload={canDownload}
        />
      )}
    </Box>
  );
}
