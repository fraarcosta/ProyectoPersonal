// Portal de Activos — Akena
// Persistencia COLECTIVA (sin userId): "portal-activos-v2"
"use client";

import { useState, useRef, type ReactNode } from "react";
import JSZip from "jszip";

import Dialog          from "@mui/material/Dialog";
import DialogTitle     from "@mui/material/DialogTitle";
import DialogContent   from "@mui/material/DialogContent";
import DialogActions   from "@mui/material/DialogActions";
import Button          from "@mui/material/Button";
import IconButton      from "@mui/material/IconButton";
import TextField       from "@mui/material/TextField";
import Select          from "@mui/material/Select";
import MenuItem        from "@mui/material/MenuItem";
import Chip            from "@mui/material/Chip";
import Box             from "@mui/material/Box";
import Typography      from "@mui/material/Typography";
import Paper           from "@mui/material/Paper";
import Alert           from "@mui/material/Alert";
import Collapse        from "@mui/material/Collapse";
import Pagination      from "@mui/material/Pagination";
import InputAdornment  from "@mui/material/InputAdornment";
import Checkbox        from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import ListItemText    from "@mui/material/ListItemText";
import Table           from "@mui/material/Table";
import TableContainer  from "@mui/material/TableContainer";
import TableHead       from "@mui/material/TableHead";
import TableBody       from "@mui/material/TableBody";
import TableRow        from "@mui/material/TableRow";
import TableCell       from "@mui/material/TableCell";
import Tooltip         from "@mui/material/Tooltip";
import CloseIcon       from "@mui/icons-material/Close";

import {
  Plus, X, Eye, Download, Trash2, Search,
  Paperclip, Upload, User, AlertCircle, FileText, CheckCircle2,
} from "lucide-react";

import { getAuthUser } from "../../../_components/auth-store";
import { addNotification } from "../../../_components/notifications-store";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DocFile { name: string; size: string; }

interface ColaboradorUser { id: string; name: string; role: string; }

interface Activo {
  id:                    string;
  nombre:                string;
  responsable:           string;
  descripcion:           string;
  planDesarrollo:        string;
  solucionTecnologica:   string;
  objetivo:              string;
  impacto:               string;
  clasificacion:         string[];
  clasificacionOtro:     string;
  estado:                string;
  version:               string;
  tecnologias:           string[];
  documentacion:         DocFile[];
  presupuestoEjecutado:  string;
  owners:                ColaboradorUser[];
  clientesImplementado:  string[];
  createdAt:             string;
  createdBy:             string;
  updatedAt:             string;
  updatedBy:             string;
}

interface ActivoForm {
  nombre:                string;
  responsable:           string;
  descripcion:           string;
  planDesarrollo:        string;
  solucionTecnologica:   string;
  objetivo:              string;
  impacto:               string;
  clasificacion:         string[];
  clasificacionOtro:     string;
  estado:                string;
  version:               string;
  nuevaTecnologia:       string;
  tecnologias:           string[];
  documentacion:         DocFile[];
  presupuestoEjecutado:  string;
  owners:                ColaboradorUser[];
  nuevoCliente:          string;
  clientesImplementado:  string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CLASIFICACIONES = [
  "Automatización operativa",
  "Observabilidad y monitoring",
  "Gestión de servicios / ITSM",
  "Seguridad y cumplimiento",
  "Gobierno y reporting",
  "Productividad / aceleración delivery",
  "Datos y analítica",
  "Integración / APIs",
  "Arquitectura y calidad",
  "IA aplicada",
  "Otro",
];

const ESTADOS = [
  "En desarrollo",
  "Desarrollado",
  "Implantado en cliente",
];

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  "En desarrollo":       { bg: "var(--accent-subtle)",  color: "var(--accent)"   },
  "Desarrollado":        { bg: "var(--success-subtle)", color: "var(--success)"  },
  "Implantado en cliente": { bg: "var(--primary-subtle)", color: "var(--primary)" },
};

const FALLBACK_TOKEN = { bg: "var(--muted)", color: "var(--muted-foreground)" };
const ITEMS_PER_PAGE = 10;
const STORAGE_KEY    = "portal-activos-v2";

// ─── Mock users ───────────────────────────────────────────────────────────────

const USUARIOS_MOCK: ColaboradorUser[] = [
  { id: "E12345", name: "Carlos Ruiz",    role: "Senior Manager"  },
  { id: "E23456", name: "Ana Martínez",   role: "Consultant"      },
  { id: "E34567", name: "David Sánchez",  role: "Architect"       },
  { id: "E45678", name: "Laura Gómez",    role: "Senior Analyst"  },
  { id: "E56789", name: "María García",   role: "Manager"         },
  { id: "E67890", name: "Carlos López",   role: "Senior Analyst"  },
  { id: "E78901", name: "Pedro Sánchez",  role: "Consultant"      },
  { id: "E89012", name: "Elena Torres",   role: "Data Engineer"   },
  { id: "E90123", name: "Javier Moreno",  role: "Tech Lead"       },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const todayStr = () =>
  new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });

const genId = () => `activo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fmtEuro = (n: string) => n ? `${Number(n).toLocaleString("es-ES")} €` : "—";

async function downloadZip(activo: Activo): Promise<void> {
  const zip    = new JSZip();
  const folder = zip.folder("Documentacion")!;
  activo.documentacion.forEach((f) =>
    folder.file(f.name, `Portal de Activos — Akena\n\nActivo: ${activo.nombre}\nFichero: ${f.name}\nTamaño: ${f.size}\n\n[Contenido simulado]`),
  );
  zip.file(
    "README.txt",
    `Portal de Activos — Akena\n\nActivo: ${activo.nombre}\nClasificación: ${activo.clasificacion.join(", ")}\nEstado: ${activo.estado}\nVersión: ${activo.version}`,
  );
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `Activo_${activo.nombre.replace(/\s+/g, "_")}_v${activo.version}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

function simulateFileDownload(file: DocFile) {
  const blob = new Blob(
    [`Portal de Activos — Akena\n\nFichero: ${file.name}\nTamaño: ${file.size}\n\n[Contenido simulado]`],
    { type: "text/plain;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href = url; a.download = file.name; a.click();
  URL.revokeObjectURL(url);
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const SEED: Activo[] = [
  {
    id: "act-1", nombre: "Plantilla oferta servicios TI",
    responsable: "María García",
    descripcion: "Plantilla estandarizada para la redacción de ofertas técnicas en proyectos TI del sector público.",
    planDesarrollo: "Desarrollo interno Q1 2024. Iteración con los Bid Managers del equipo.",
    solucionTecnologica: "Microsoft Word + SharePoint + Power Automate",
    objetivo: "Reducir el tiempo de elaboración de ofertas técnicas en un 30%.",
    impacto: "Ahorro estimado de 40 horas por oportunidad. Implantado en 8 ofertas.",
    clasificacion: ["Productividad / aceleración delivery"],
    clasificacionOtro: "",
    estado: "Implantado en cliente", version: "2.1",
    tecnologias: ["Microsoft Word", "SharePoint", "Power Automate"],
    documentacion: [{ name: "plantilla-oferta-TI-v2.1.docx", size: "1.2 MB" }],
    presupuestoEjecutado: "15000",
    owners: [
      { id: "E56789", name: "María García",  role: "Manager"        },
      { id: "E67890", name: "Carlos López",  role: "Senior Analyst" },
    ],
    clientesImplementado: ["AEAT", "MINHAP", "SEPE"],
    createdAt: "10/01/2024", createdBy: "María García",
    updatedAt: "15/03/2024", updatedBy: "María García",
  },
  {
    id: "act-2", nombre: "Framework análisis licitaciones",
    responsable: "Carlos López",
    descripcion: "Framework metodológico para el análisis y scoring de licitaciones públicas. Incluye modelo de evaluación y plantillas de análisis.",
    planDesarrollo: "Iteración continua desde 2023. Revisión trimestral con el equipo de Sector Público.",
    solucionTecnologica: "Excel + Python + Power BI",
    objetivo: "Estandarizar el proceso de evaluación de oportunidades de licitación pública.",
    impacto: "Mejora del 25% en tasa de éxito de ofertas evaluadas con el framework.",
    clasificacion: ["Gobierno y reporting", "Datos y analítica"],
    clasificacionOtro: "",
    estado: "Desarrollado", version: "3.0",
    tecnologias: ["Excel", "Python", "Power BI"],
    documentacion: [{ name: "framework-licitaciones-v3.pdf", size: "3.4 MB" }, { name: "guia-uso.docx", size: "0.8 MB" }],
    presupuestoEjecutado: "32000",
    owners: [{ id: "E67890", name: "Carlos López", role: "Senior Analyst" }],
    clientesImplementado: ["Interno Accenture"],
    createdAt: "05/03/2023", createdBy: "Carlos López",
    updatedAt: "20/02/2024", updatedBy: "Carlos López",
  },
  {
    id: "act-3", nombre: "Calculadora económica sector público",
    responsable: "Ana Martínez",
    descripcion: "Herramienta automatizada de cálculo para presupuestación y estimación de costes en licitaciones del sector público.",
    planDesarrollo: "Desarrollo Q2-Q3 2023 en respuesta a necesidad identificada en proyecto AEAT.",
    solucionTecnologica: "Excel VBA + Power Query",
    objetivo: "Automatizar el cálculo de márgenes, precios ofertados y descuentos.",
    impacto: "Reducción de errores de cálculo en un 95%. Utilizado en 12 licitaciones.",
    clasificacion: ["Automatización operativa"],
    clasificacionOtro: "",
    estado: "Implantado en cliente", version: "1.5",
    tecnologias: ["Excel VBA", "Power Query"],
    documentacion: [{ name: "calculadora-eco-v1.5.xlsx", size: "2.1 MB" }],
    presupuestoEjecutado: "8000",
    owners: [
      { id: "E23456", name: "Ana Martínez",  role: "Consultant" },
      { id: "E56789", name: "María García",  role: "Manager"    },
    ],
    clientesImplementado: ["DG Catastro", "DGT"],
    createdAt: "01/06/2023", createdBy: "Ana Martínez",
    updatedAt: "10/11/2023", updatedBy: "Ana Martínez",
  },
  {
    id: "act-4", nombre: "Biblioteca Win Themes AAPP",
    responsable: "Pedro Sánchez",
    descripcion: "Repositorio colaborativo de mensajes diferenciadores y win themes para oportunidades del sector público español.",
    planDesarrollo: "Construcción colaborativa 2022-2024 con aportaciones de todo el equipo Sector Público.",
    solucionTecnologica: "SharePoint + Microsoft Teams + Viva Engage",
    objetivo: "Acelerar la definición de propuesta de valor en ofertas y garantizar consistencia de mensajes.",
    impacto: "Disponibilidad de 200+ win themes categorizados por sector y tipología de cliente.",
    clasificacion: ["Productividad / aceleración delivery"],
    clasificacionOtro: "",
    estado: "En desarrollo", version: "4.2",
    tecnologias: ["SharePoint", "Microsoft Teams", "Viva Engage"],
    documentacion: [{ name: "biblioteca-win-themes.pdf", size: "5.7 MB" }],
    presupuestoEjecutado: "5000",
    owners: [
      { id: "E78901", name: "Pedro Sánchez", role: "Consultant"     },
      { id: "E45678", name: "Laura Gómez",   role: "Senior Analyst" },
    ],
    clientesImplementado: [],
    createdAt: "15/04/2022", createdBy: "Pedro Sánchez",
    updatedAt: "05/01/2024", updatedBy: "Laura Gómez",
  },
  {
    id: "act-5", nombre: "Acelerador implantación SAP S/4 AAPP",
    responsable: "Laura Gómez",
    descripcion: "Conjunto de artefactos preconfigurados para acelerar implantaciones SAP S/4HANA en organismos de la Administración Pública.",
    planDesarrollo: "Construcción durante el proyecto piloto con la Seguridad Social 2023.",
    solucionTecnologica: "SAP S/4HANA + SAP Activate + Fiori",
    objetivo: "Reducir el tiempo de implantación de SAP en AAPP en un 35%.",
    impacto: "Ahorro de 3 meses en la fase de Blueprinting en proyectos donde se aplicó.",
    clasificacion: ["Integración / APIs", "Arquitectura y calidad"],
    clasificacionOtro: "",
    estado: "Desarrollado", version: "1.0",
    tecnologias: ["SAP S/4HANA", "SAP Activate", "SAP Fiori", "ABAP"],
    documentacion: [{ name: "acelerador-sap-s4-aapp.zip", size: "18.4 MB" }, { name: "documentacion-tecnica.pdf", size: "4.1 MB" }],
    presupuestoEjecutado: "75000",
    owners: [{ id: "E45678", name: "Laura Gómez", role: "Senior Analyst" }],
    clientesImplementado: ["Seguridad Social"],
    createdAt: "20/09/2023", createdBy: "Laura Gómez",
    updatedAt: "15/12/2023", updatedBy: "Laura Gómez",
  },
];

// ─── Persistence ──────────────────────────────────────────────────────────────

function readActivos(): Activo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Activo[];
      if (Array.isArray(parsed)) {
        // Validate owners format — if items are plain strings (old format), discard and re-seed
        const validOwners = parsed.every(
          (a) =>
            !Array.isArray(a.owners) ||
            a.owners.length === 0 ||
            typeof a.owners[0] === "object",
        );
        if (!validOwners) { localStorage.removeItem(STORAGE_KEY); return SEED; }
        // Migrate old estado values to new names
        const ESTADO_MAP: Record<string, string> = {
          "Implantado en cliente(s)":        "Implantado en cliente",
          "Desarrollado (sin implantación)": "Desarrollado",
        };
        // Migrate clasificacion from string to string[] (legacy format)
        const migrated = parsed.map((a) => ({
          ...a,
          estado: ESTADO_MAP[a.estado] ?? a.estado,
          clasificacion: Array.isArray(a.clasificacion)
            ? a.clasificacion
            : [a.clasificacion as unknown as string],
        }));
        return migrated as Activo[];
      }
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {}
  return SEED;
}

function saveActivos(items: Activo[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
}

// ─── Form helpers ────────────────────────────────────────���────────────────────

const FORM_INIT: ActivoForm = {
  nombre: "", responsable: "", descripcion: "", planDesarrollo: "",
  solucionTecnologica: "", objetivo: "", impacto: "",
  clasificacion: [], clasificacionOtro: "", estado: "", version: "",
  nuevaTecnologia: "", tecnologias: [], documentacion: [],
  presupuestoEjecutado: "", owners: [], nuevoCliente: "", clientesImplementado: [],
};

function formFromActivo(a: Activo): ActivoForm {
  const standardClasifs = CLASIFICACIONES.slice(0, -1);
  const storedClasifs = Array.isArray(a.clasificacion) ? a.clasificacion : [a.clasificacion as unknown as string];
  const customClasifs = storedClasifs.filter((c) => !standardClasifs.includes(c));
  const formClasifs = [
    ...storedClasifs.filter((c) => standardClasifs.includes(c)),
    ...(customClasifs.length > 0 ? ["Otro"] : []),
  ];
  return {
    nombre: a.nombre, responsable: a.responsable, descripcion: a.descripcion,
    planDesarrollo: a.planDesarrollo, solucionTecnologica: a.solucionTecnologica,
    objetivo: a.objetivo, impacto: a.impacto,
    clasificacion: formClasifs,
    clasificacionOtro: customClasifs[0] ?? "",
    estado: a.estado, version: a.version,
    nuevaTecnologia: "", tecnologias: [...a.tecnologias], documentacion: [...a.documentacion],
    presupuestoEjecutado: a.presupuestoEjecutado,
    owners: [...a.owners], nuevoCliente: "", clientesImplementado: [...a.clientesImplementado],
  };
}

function validate(f: ActivoForm): Record<string, string> {
  const e: Record<string, string> = {};
  if (!f.nombre.trim())              e.nombre              = "Campo obligatorio";
  if (!f.responsable.trim())         e.responsable         = "Campo obligatorio";
  if (!f.descripcion.trim())         e.descripcion         = "Campo obligatorio";
  if (!f.planDesarrollo.trim())      e.planDesarrollo      = "Campo obligatorio";
  if (!f.solucionTecnologica.trim()) e.solucionTecnologica = "Campo obligatorio";
  if (!f.objetivo.trim())            e.objetivo            = "Campo obligatorio";
  if (!f.impacto.trim())             e.impacto             = "Campo obligatorio";
  if (f.clasificacion.length === 0)  e.clasificacion       = "Selecciona al menos una clasificación";
  if (f.clasificacion.includes("Otro") && !f.clasificacionOtro.trim()) e.clasificacionOtro = "Especifica la clasificación";
  if (!f.estado)                     e.estado              = "Selecciona un estado";
  if (!f.version.trim())             e.version             = "Campo obligatorio";
  if (f.tecnologias.length === 0)    e.tecnologias         = "Añade al menos una tecnología";
  if (f.documentacion.length === 0)  e.documentacion       = "Sube al menos un documento";
  return e;
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function StatusChip({ status }: { status: string }) {
  const token = STATUS_COLORS[status] ?? FALLBACK_TOKEN;
  return (
    <Chip label={status} size="small"
      sx={{
        bgcolor: token.bg, color: token.color,
        borderRadius: "var(--radius-chip)", height: 20, fontWeight: 600,
        "& .MuiChip-label": { px: "10px", fontSize: "var(--text-2xs)" },
      }}
    />
  );
}

function SectionCard({ title, icon, children }: {
  title: string; icon?: ReactNode; children: ReactNode;
}) {
  return (
    <Paper variant="outlined" sx={{ flexShrink: 0, borderRadius: "var(--radius)" }}>
      <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid var(--border)", bgcolor: "var(--neutral-subtle)", display: "flex", alignItems: "center", gap: 1 }}>
        {icon && <Box sx={{ color: "text.secondary", display: "flex" }}>{icon}</Box>}
        <Typography variant="caption" sx={{ fontWeight: 600, color: "text.primary", fontSize: "var(--text-xs)" }}>
          {title}
        </Typography>
      </Box>
      <Box sx={{ p: 2 }}>{children}</Box>
    </Paper>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: "var(--text-2xs)" }}>
        {label}
      </Typography>
      <Typography variant="body2" component="div" sx={{ fontSize: "var(--text-sm)", color: value ? "text.primary" : "text.secondary", fontStyle: value ? "normal" : "italic" }}>
        {value || "—"}
      </Typography>
    </Box>
  );
}

function DocFilePill({ file, onRemove }: { file: DocFile; onRemove?: () => void }) {
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, px: 1.25, py: 0.5, border: "1px solid var(--border)", borderRadius: "var(--radius-banner)", bgcolor: "var(--muted)" }}>
      <Paperclip size={11} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
      <Typography variant="caption" sx={{ fontSize: "var(--text-2xs)" }}>{file.name}</Typography>
      <Typography variant="caption" sx={{ fontSize: "var(--text-2xs)", color: "text.secondary" }}>({file.size})</Typography>
      {onRemove && <IconButton size="small" onClick={onRemove} sx={{ p: 0, ml: 0.25 }}><X size={11} /></IconButton>}
    </Box>
  );
}

function DocFileRow({ file, canDownload = true }: { file: DocFile; canDownload?: boolean }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 1.5, py: 0.875, border: "1px solid var(--border)", borderRadius: "var(--radius-banner)", bgcolor: "var(--muted)" }}>
      <Paperclip size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
      <Typography variant="caption" sx={{ flex: 1, fontSize: "var(--text-xs)", wordBreak: "break-all" }}>{file.name}</Typography>
      <Typography variant="caption" sx={{ fontSize: "var(--text-2xs)", color: "text.secondary", whiteSpace: "nowrap" }}>{file.size}</Typography>
      {canDownload && (
        <IconButton size="small" onClick={() => simulateFileDownload(file)}
          sx={{ border: "1px solid var(--border)", borderRadius: "var(--radius-button)", width: 26, height: 26, p: 0 }}>
          <Download size={12} />
        </IconButton>
      )}
    </Box>
  );
}

function FileUploadWidget({ label, files, onAdd, onRemove, error }: {
  label: ReactNode; files: DocFile[];
  onAdd: (f: DocFile) => void; onRemove: (i: number) => void; error?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
      <Typography variant="caption" sx={{ fontWeight: 600, fontSize: "var(--text-xs)", color: "text.primary" }}>{label}</Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, alignItems: "center" }}>
        {files.map((f, i) => <DocFilePill key={i} file={f} onRemove={() => onRemove(i)} />)}
        <Button variant="outlined" size="small" startIcon={<Upload size={11} />}
          onClick={() => ref.current?.click()} color="inherit"
          sx={{ fontSize: "var(--text-2xs)", borderStyle: "dashed", borderRadius: "var(--radius-button)" }}>
          Subir archivo
        </Button>
      </Box>
      <input ref={ref} type="file" style={{ display: "none" }} onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) onAdd({ name: file.name, size: formatFileSize(file.size) });
        e.target.value = "";
      }} />
      {error && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <AlertCircle size={11} style={{ color: "var(--destructive)" }} />
          <Typography variant="caption" sx={{ color: "var(--destructive)", fontSize: "var(--text-2xs)" }}>{error}</Typography>
        </Box>
      )}
    </Box>
  );
}

function TagInput({ label, required, tags, newValue, placeholder, onChangeNew, onAdd, onRemove, error }: {
  label: string; required?: boolean; tags: string[]; newValue: string; placeholder?: string;
  onChangeNew: (v: string) => void; onAdd: () => void; onRemove: (i: number) => void; error?: string;
}) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
      <Typography variant="caption" sx={{ fontWeight: 600, fontSize: "var(--text-xs)", color: "text.primary" }}>
        {label}{required && <span style={{ color: "var(--destructive)" }}> *</span>}
      </Typography>
      <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
        <TextField size="small" sx={{ flex: 1 }}
          placeholder={placeholder ?? `Añadir ${label.toLowerCase()}...`}
          value={newValue} onChange={(e) => onChangeNew(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(); } }}
        />
        <Button variant="outlined" size="small" startIcon={<Plus size={13} />}
          onClick={onAdd} disabled={!newValue.trim()} sx={{ flexShrink: 0 }}>
          Añadir
        </Button>
      </Box>
      {tags.length > 0 && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
          {tags.map((tag, i) => (
            <Box key={i} sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, pl: 1.25, pr: 0.5, py: 0.5, border: "1px solid var(--border)", borderRadius: "var(--radius-chip)", bgcolor: "var(--muted)" }}>
              <Typography variant="caption" sx={{ fontSize: "var(--text-2xs)" }}>{tag}</Typography>
              <IconButton size="small" onClick={() => onRemove(i)} sx={{ p: 0, width: 16, height: 16 }}><X size={10} /></IconButton>
            </Box>
          ))}
        </Box>
      )}
      {error && tags.length === 0 && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <AlertCircle size={11} style={{ color: "var(--destructive)" }} />
          <Typography variant="caption" sx={{ color: "var(--destructive)", fontSize: "var(--text-2xs)" }}>{error}</Typography>
        </Box>
      )}
    </Box>
  );
}

// ─── ColabUserRow — user avatar + name + role ─────────────────────────────────

function ColabUserRow({ name, id, role, filled = false }: {
  name: string; id: string; role: string; filled?: boolean;
}) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
      <Box sx={{
        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
        bgcolor: filled ? "primary.main" : "var(--muted)",
        border: filled ? "none" : "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <User size={13} style={{ color: filled ? "white" : "var(--muted-foreground)" }} />
      </Box>
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>{name}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "var(--text-2xs)" }}>
          {id} · {role}
        </Typography>
      </Box>
    </Box>
  );
}

// ─── ColaboradorSelector — search + autocomplete ──────────────────────────────

function ColaboradorSelector({ label, owners, onChange }: {
  label: string;
  owners: ColaboradorUser[];
  onChange: (owners: ColaboradorUser[]) => void;
}) {
  const [query, setQuery] = useState("");

  const suggestions = query.trim()
    ? USUARIOS_MOCK.filter(
        (u) =>
          !owners.find((o) => o.id === u.id) &&
          (u.id.toLowerCase().includes(query.toLowerCase()) ||
           u.name.toLowerCase().includes(query.toLowerCase())),
      )
    : [];

  const add = (u: ColaboradorUser) => {
    if (!owners.find((o) => o.id === u.id)) onChange([...owners, u]);
    setQuery("");
  };

  const remove = (id: string) => onChange(owners.filter((o) => o.id !== id));

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
      <Typography variant="caption" sx={{ fontWeight: 600, fontSize: "var(--text-xs)", color: "text.primary" }}>
        {label}
      </Typography>

      <TextField size="small" fullWidth
        placeholder="Buscar por ID Accenture o nombre..."
        value={query} onChange={(e) => setQuery(e.target.value)}
        slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search size={14} style={{ color: "var(--muted-foreground)" }} /></InputAdornment> } }}
      />

      {query.trim() && (
        <Paper variant="outlined" sx={{ borderRadius: "var(--radius-banner)", overflow: "hidden" }}>
          {suggestions.length === 0 ? (
            <Box sx={{ px: 1.5, py: 1 }}>
              <Typography variant="caption" color="text.secondary">Sin resultados para "{query}"</Typography>
            </Box>
          ) : suggestions.map((u) => (
            <Box key={u.id} sx={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              px: 1.5, py: 0.875,
              borderBottom: "1px solid var(--border)", "&:last-child": { borderBottom: "none" },
              "&:hover": { bgcolor: "action.hover" },
            }}>
              <ColabUserRow name={u.name} id={u.id} role={u.role} />
              <Button size="small" variant="outlined" onClick={() => add(u)} sx={{ flexShrink: 0, ml: 1 }}>
                Añadir
              </Button>
            </Box>
          ))}
        </Paper>
      )}

      {owners.length > 0 ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          {owners.map((o) => (
            <Box key={o.id} sx={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              px: 1.5, py: 0.875,
              border: "1px solid var(--border)", borderRadius: "var(--radius-banner)", bgcolor: "var(--muted)",
            }}>
              <ColabUserRow name={o.name} id={o.id} role={o.role} filled />
              <IconButton size="small" onClick={() => remove(o.id)} sx={{ color: "text.secondary" }}>
                <X size={14} />
              </IconButton>
            </Box>
          ))}
        </Box>
      ) : (
        <Box sx={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          bgcolor: "var(--muted)", border: "1px solid var(--border)", borderRadius: "var(--radius-banner)",
          py: 2, gap: 0.5,
        }}>
          <User size={18} style={{ color: "var(--muted-foreground)" }} />
          <Typography variant="caption" color="text.secondary">Sin colaboradores — busca por ID o nombre</Typography>
        </Box>
      )}
    </Box>
  );
}

// ─── ActivoFormModal — create & edit ─────────────────────────────────────────

function ActivoFormModal({ activo, onClose, onSave }: {
  activo: Activo | null;
  onClose: () => void;
  onSave: (a: Activo) => void;
}) {
  const isEdit = activo !== null;
  const [form, setForm]     = useState<ActivoForm>(() => activo ? formFromActivo(activo) : FORM_INIT);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof ActivoForm>(key: K, val: ActivoForm[K]) => {
    setForm((p) => ({ ...p, [key]: val }));
    setErrors((p) => { const n = { ...p }; delete n[key as string]; return n; });
  };

  const addTag = (
    listKey: "tecnologias" | "clientesImplementado",
    newKey:  "nuevaTecnologia" | "nuevoCliente",
    errorKey: string,
  ) => {
    const val = (form[newKey] as string).trim();
    if (!val || (form[listKey] as string[]).includes(val)) return;
    setForm((p) => ({ ...p, [listKey]: [...(p[listKey] as string[]), val], [newKey]: "" }));
    setErrors((p) => { const n = { ...p }; delete n[errorKey]; return n; });
  };

  const removeTag = (listKey: "tecnologias" | "clientesImplementado", i: number) =>
    setForm((p) => ({ ...p, [listKey]: (p[listKey] as string[]).filter((_, j) => j !== i) }));

  const handleSubmit = () => {
    const errs = validate(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    const user = getAuthUser();
    // Resolve classifications: replace "Otro" with custom text
    const clasificacionFinal = form.clasificacion.includes("Otro")
      ? [...form.clasificacion.filter((c) => c !== "Otro"), form.clasificacionOtro.trim()]
      : form.clasificacion;
    onSave({
      id:                   activo?.id ?? genId(),
      nombre:               form.nombre.trim(),
      responsable:          form.responsable.trim(),
      descripcion:          form.descripcion.trim(),
      planDesarrollo:       form.planDesarrollo.trim(),
      solucionTecnologica:  form.solucionTecnologica.trim(),
      objetivo:             form.objetivo.trim(),
      impacto:              form.impacto.trim(),
      clasificacion:        clasificacionFinal,
      clasificacionOtro:    form.clasificacion.includes("Otro") ? form.clasificacionOtro.trim() : "",
      estado:               form.estado,
      version:              form.version.trim(),
      tecnologias:          form.tecnologias,
      documentacion:        form.documentacion,
      presupuestoEjecutado: form.presupuestoEjecutado.trim(),
      owners:               form.owners,
      clientesImplementado: form.clientesImplementado,
      createdAt:            activo?.createdAt ?? todayStr(),
      createdBy:            activo?.createdBy ?? user.name,
      updatedAt:            todayStr(),
      updatedBy:            user.name,
    });
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md" scroll="paper">
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <Box>
            <Typography variant="h6">{isEdit ? "Editar activo" : "Nuevo activo"}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {isEdit ? "Modifica los campos y guarda los cambios" : "Registra un nuevo activo en el Portal de Activos"}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ mt: -0.5, mr: -0.5 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2.5, p: 3 }}>

        {/* 1 — Información del activo */}
        <SectionCard title="1 — Información del activo" icon={<FileText size={13} />}>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <Box sx={{ gridColumn: "1 / -1" }}>
              <TextField fullWidth size="small" required label="Nombre del activo"
                placeholder="Ej. Framework análisis licitaciones"
                value={form.nombre} onChange={(e) => set("nombre", e.target.value)}
                error={!!errors.nombre} helperText={errors.nombre || " "}
              />
            </Box>
            <TextField fullWidth size="small" required label="Responsable del activo"
              placeholder="Nombre del responsable técnico"
              value={form.responsable} onChange={(e) => set("responsable", e.target.value)}
              error={!!errors.responsable} helperText={errors.responsable || " "}
            />
            <TextField fullWidth size="small" required label="Versión"
              placeholder="Ej. 1.0, 2.3"
              value={form.version} onChange={(e) => set("version", e.target.value)}
              error={!!errors.version} helperText={errors.version || " "}
            />
            <Box sx={{ gridColumn: "1 / -1" }}>
              <TextField fullWidth size="small" required multiline rows={3} label="Descripción del activo"
                placeholder="Describe el activo, su propósito y contexto de uso..."
                value={form.descripcion} onChange={(e) => set("descripcion", e.target.value)}
                error={!!errors.descripcion} helperText={errors.descripcion || " "}
              />
            </Box>
            <Box sx={{ gridColumn: "1 / -1" }}>
              <TextField fullWidth size="small" required multiline rows={2} label="Plan de desarrollo"
                placeholder="Describe el plan o historia de desarrollo del activo..."
                value={form.planDesarrollo} onChange={(e) => set("planDesarrollo", e.target.value)}
                error={!!errors.planDesarrollo} helperText={errors.planDesarrollo || " "}
              />
            </Box>
            <Box sx={{ gridColumn: "1 / -1" }}>
              <TextField fullWidth size="small" required label="Solución tecnológica"
                placeholder="Ej. React + Python + Azure OpenAI"
                value={form.solucionTecnologica} onChange={(e) => set("solucionTecnologica", e.target.value)}
                error={!!errors.solucionTecnologica} helperText={errors.solucionTecnologica || " "}
              />
            </Box>
            <Box sx={{ gridColumn: "1 / -1" }}>
              <TextField fullWidth size="small" required multiline rows={2} label="Objetivo del activo"
                placeholder="¿Qué objetivo persigue este activo?"
                value={form.objetivo} onChange={(e) => set("objetivo", e.target.value)}
                error={!!errors.objetivo} helperText={errors.objetivo || " "}
              />
            </Box>
            <Box sx={{ gridColumn: "1 / -1" }}>
              <TextField fullWidth size="small" required multiline rows={2} label="Impacto del activo"
                placeholder="¿Qué impacto tiene o ha tenido este activo?"
                value={form.impacto} onChange={(e) => set("impacto", e.target.value)}
                error={!!errors.impacto} helperText={errors.impacto || " "}
              />
            </Box>

            {/* Clasificación — multi-select estilo tipología */}
            <Box sx={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 0 }}>
              <TextField
                select fullWidth size="small" required
                label="Clasificación del activo"
                value={form.clasificacion}
                onChange={(e) => {
                  const val = e.target.value as unknown as string[];
                  set("clasificacion", val);
                  if (!val.includes("Otro")) set("clasificacionOtro", "");
                }}
                error={!!errors.clasificacion}
                helperText={errors.clasificacion || " "}
                SelectProps={{
                  multiple: true,
                  renderValue: (selected) => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, py: 0.25 }}>
                      {(selected as string[]).map((v) => (
                        <Chip key={v}
                          label={v === "Otro" && form.clasificacionOtro ? `Otro: ${form.clasificacionOtro}` : v}
                          size="small"
                          sx={{ height: 20, fontSize: "var(--text-2xs)", bgcolor: "var(--primary)", color: "var(--primary-foreground)", "& .MuiChip-label": { px: 0.875 } }}
                        />
                      ))}
                    </Box>
                  ),
                }}
              >
                {CLASIFICACIONES.map((c) => (
                  <MenuItem key={c} value={c} sx={{ gap: 0.5 }}>
                    <Checkbox checked={form.clasificacion.includes(c)} size="small" sx={{ p: 0.5 }} />
                    <ListItemText primary={c} primaryTypographyProps={{ variant: "body2" }} />
                  </MenuItem>
                ))}
              </TextField>

              {/* Campo libre cuando "Otro" está marcado */}
              {form.clasificacion.includes("Otro") && (
                <TextField
                  size="small" fullWidth
                  label='Especifica la clasificación "Otro"'
                  placeholder="Describe la clasificación del activo..."
                  value={form.clasificacionOtro}
                  onChange={(e) => { set("clasificacionOtro", e.target.value); }}
                  error={!!errors.clasificacionOtro}
                  helperText={errors.clasificacionOtro || " "}
                  sx={{ mt: -1.5 }}
                />
              )}
            </Box>

            {/* Estado */}
            <TextField select fullWidth size="small" required label="Estado del activo"
              value={form.estado} onChange={(e) => set("estado", e.target.value)}
              error={!!errors.estado} helperText={errors.estado || " "}
            >
              <MenuItem value=""><em>Selecciona estado</em></MenuItem>
              {ESTADOS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </Box>
        </SectionCard>

        {/* 2 — Tecnologías */}
        <SectionCard title="2 — Tecnologías utilizadas">
          <TagInput
            label="Tecnologías" required
            tags={form.tecnologias} newValue={form.nuevaTecnologia}
            placeholder="Ej. React, Python, Azure..."
            onChangeNew={(v) => set("nuevaTecnologia", v)}
            onAdd={() => addTag("tecnologias", "nuevaTecnologia", "tecnologias")}
            onRemove={(i) => removeTag("tecnologias", i)}
            error={errors.tecnologias}
          />
        </SectionCard>

        {/* 3 — Documentación */}
        <SectionCard title="3 — Documentación asociada" icon={<Paperclip size={13} />}>
          <FileUploadWidget
            label={<>Documentación del activo <span style={{ color: "var(--destructive)" }}>*</span></>}
            files={form.documentacion}
            onAdd={(f) => { setForm((p) => ({ ...p, documentacion: [...p.documentacion, f] })); setErrors((p) => { const n = { ...p }; delete n.documentacion; return n; }); }}
            onRemove={(i) => setForm((p) => ({ ...p, documentacion: p.documentacion.filter((_, j) => j !== i) }))}
            error={errors.documentacion}
          />
        </SectionCard>

        {/* 4 — Colaboradores */}
        <SectionCard title="4 — Colaboradores del activo (owners)" icon={<User size={13} />}>
          <ColaboradorSelector
            label="Busca y añade colaboradores que podrán editar este activo"
            owners={form.owners}
            onChange={(owners) => set("owners", owners)}
          />
        </SectionCard>

        {/* 5 — Información adicional */}
        <SectionCard title="5 — Información adicional (opcional)">
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <TextField fullWidth size="small" label="Presupuesto ejecutado (€)"
              type="number" placeholder="0"
              value={form.presupuestoEjecutado} onChange={(e) => set("presupuestoEjecutado", e.target.value)}
              slotProps={{ input: { startAdornment: <InputAdornment position="start">€</InputAdornment> } }}
            />
            <TagInput
              label="Clientes donde se ha implementado"
              tags={form.clientesImplementado} newValue={form.nuevoCliente}
              placeholder="Ej. AEAT, MINHAP, SEPE..."
              onChangeNew={(v) => set("nuevoCliente", v)}
              onAdd={() => addTag("clientesImplementado", "nuevoCliente", "clientesImplementado")}
              onRemove={(i) => removeTag("clientesImplementado", i)}
            />
          </Box>
        </SectionCard>

      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5, gap: 1 }}>
        <Button variant="outlined" color="inherit" onClick={onClose}>Cancelar</Button>
        <Button variant="contained" startIcon={<CheckCircle2 size={14} />} onClick={handleSubmit}>
          {isEdit ? "Guardar cambios" : "Guardar activo"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── ConsultarActivoModal ─────────────────────────────────────────────────────

function ConsultarActivoModal({ activo, canEdit, canDelete, canDownload = true, onClose, onEdit, onDelete }: {
  activo: Activo; canEdit: boolean; canDelete: boolean; canDownload?: boolean;
  onClose: () => void; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md" scroll="paper">
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
              <Typography variant="h6">{activo.nombre}</Typography>
              <StatusChip status={activo.estado} />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {activo.clasificacion.join(" · ")} · v{activo.version} · Responsable: {activo.responsable}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ mt: -0.5, mr: -0.5 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2.5, p: 3 }}>

        <SectionCard title="Información del activo" icon={<FileText size={13} />}>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <ReadOnlyField label="Nombre"         value={activo.nombre} />
            <ReadOnlyField label="Responsable"    value={activo.responsable} />
            <ReadOnlyField label="Clasificación"  value={
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.25 }}>
                {activo.clasificacion.map((c, i) => (
                  <Box key={i} sx={{ px: 1.25, py: 0.25, border: "1px solid var(--border)", borderRadius: "var(--radius-chip)", bgcolor: "var(--muted)" }}>
                    <Typography variant="caption" sx={{ fontSize: "var(--text-2xs)" }}>{c}</Typography>
                  </Box>
                ))}
              </Box>
            } />
            <ReadOnlyField label="Estado"         value={<StatusChip status={activo.estado} />} />
            <ReadOnlyField label="Versión"        value={activo.version} />
            <ReadOnlyField label="Presupuesto ejecutado" value={fmtEuro(activo.presupuestoEjecutado)} />
            <Box sx={{ gridColumn: "1 / -1" }}><ReadOnlyField label="Descripción"          value={activo.descripcion} /></Box>
            <Box sx={{ gridColumn: "1 / -1" }}><ReadOnlyField label="Plan de desarrollo"   value={activo.planDesarrollo} /></Box>
            <Box sx={{ gridColumn: "1 / -1" }}><ReadOnlyField label="Solución tecnológica" value={activo.solucionTecnologica} /></Box>
            <Box sx={{ gridColumn: "1 / -1" }}><ReadOnlyField label="Objetivo"             value={activo.objetivo} /></Box>
            <Box sx={{ gridColumn: "1 / -1" }}><ReadOnlyField label="Impacto"              value={activo.impacto} /></Box>
          </Box>
        </SectionCard>

        <SectionCard title="Tecnologías utilizadas">
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
            {activo.tecnologias.length > 0
              ? activo.tecnologias.map((t, i) => (
                  <Box key={i} sx={{ px: 1.25, py: 0.5, border: "1px solid var(--border)", borderRadius: "var(--radius-chip)", bgcolor: "var(--muted)" }}>
                    <Typography variant="caption" sx={{ fontSize: "var(--text-2xs)" }}>{t}</Typography>
                  </Box>
                ))
              : <Typography variant="caption" color="text.secondary">—</Typography>}
          </Box>
        </SectionCard>

        <SectionCard title="Documentación asociada" icon={<Paperclip size={13} />}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
            {activo.documentacion.length > 0
              ? activo.documentacion.map((f, i) => <DocFileRow key={i} file={f} canDownload={canDownload} />)
              : <Typography variant="caption" color="text.secondary">Sin documentación</Typography>}
          </Box>
        </SectionCard>

        {/* Colaboradores */}
        {activo.owners.length > 0 && (
          <SectionCard title="Colaboradores (owners)" icon={<User size={13} />}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              {activo.owners.map((o) => (
                <Box key={o.id} sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 1.5, py: 0.875, border: "1px solid var(--border)", borderRadius: "var(--radius-banner)", bgcolor: "var(--muted)" }}>
                  <ColabUserRow name={o.name} id={o.id} role={o.role} filled />
                </Box>
              ))}
            </Box>
          </SectionCard>
        )}

        {activo.clientesImplementado.length > 0 && (
          <SectionCard title="Clientes implementados">
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
              {activo.clientesImplementado.map((c, i) => (
                <Box key={i} sx={{ px: 1.25, py: 0.5, border: "1px solid var(--border)", borderRadius: "var(--radius-chip)", bgcolor: "var(--muted)" }}>
                  <Typography variant="caption" sx={{ fontSize: "var(--text-2xs)" }}>{c}</Typography>
                </Box>
              ))}
            </Box>
          </SectionCard>
        )}

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 1, borderRadius: "var(--radius-banner)", bgcolor: "var(--neutral-subtle)", border: "1px solid var(--border)" }}>
          <User size={12} style={{ color: "var(--muted-foreground)" }} />
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: "var(--text-2xs)" }}>
            Actualizado el{" "}<strong style={{ color: "var(--foreground)" }}>{activo.updatedAt}</strong>{" "}
            por{" "}<strong style={{ color: "var(--foreground)" }}>{activo.updatedBy}</strong>
            {" · "}Creado el{" "}<strong style={{ color: "var(--foreground)" }}>{activo.createdAt}</strong>{" "}
            por{" "}<strong style={{ color: "var(--foreground)" }}>{activo.createdBy}</strong>
          </Typography>
        </Box>

      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5, justifyContent: "space-between" }}>
        <Box>
          {canDelete && (
            <Button variant="outlined" color="error" startIcon={<Trash2 size={13} />}
              onClick={() => { if (window.confirm(`¿Eliminar "${activo.nombre}"? Esta acción no se puede deshacer.`)) onDelete(); }}>
              Eliminar activo
            </Button>
          )}
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="outlined" color="inherit" onClick={onClose}>Cerrar</Button>
          {canEdit && (
            <Button variant="contained" startIcon={<CheckCircle2 size={14} />} onClick={onEdit}>
              Editar activo
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
}

// ─── ActivosPortal — main export ──────────────────────────────────────────────

export function ActivosPortal() {
  const [activos, setActivos]             = useState<Activo[]>(() => readActivos());
  const [modal, setModal]                 = useState<"none" | "nuevo" | "consultar" | "editar">("none");
  const [selectedId, setSelectedId]       = useState<string | null>(null);
  const [page, setPage]                   = useState(1);
  const [search, setSearch]               = useState("");
  const [filterClasifs, setFilterClasifs] = useState<string[]>([]);
  const [filterEstado, setFilterEstado]   = useState("");
  const [filterMios, setFilterMios]       = useState(false);
  const [successMsg, setSuccessMsg]       = useState("");

  const user        = getAuthUser();
  const canDownload = user.role !== "Lectura";
  const canDelete   = user.role === "Admin";
  const selected    = activos.find((a) => a.id === selectedId) ?? null;

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 5000);
  };

  const isOwner = (a: Activo) =>
    a.owners.some(
      (o) =>
        (o?.id?.toLowerCase() ?? "") === (user.id?.toLowerCase() ?? "") ||
        (o?.name?.toLowerCase() ?? "") === (user.name?.toLowerCase() ?? ""),
    );

  // canEdit per activo: Admin always; Editor only if owner
  const canEditActivo = (a: Activo) =>
    user.role === "Admin" ||
    (user.role === "Editor" && isOwner(a));

  const openConsultar = (id: string) => { setSelectedId(id); setModal("consultar"); };

  const clasificacionStandard = CLASIFICACIONES.slice(0, -1); // excluye "Otro"

  const filtered = activos.filter((a) => {
    const q = search.toLowerCase();
    const matchClasif = filterClasifs.length === 0 || filterClasifs.some((fc) =>
      fc === "Otro"
        ? a.clasificacion.some((c) => !clasificacionStandard.includes(c))
        : a.clasificacion.includes(fc),
    );
    return (
      (!q || a.nombre.toLowerCase().includes(q) || a.responsable.toLowerCase().includes(q) || a.clasificacion.join(" ").toLowerCase().includes(q)) &&
      matchClasif &&
      (!filterEstado || a.estado === filterEstado) &&
      (!filterMios   || isOwner(a))
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const pageRows   = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const handleSave = (activo: Activo) => {
    const exists = activos.some((a) => a.id === activo.id);
    const next   = exists ? activos.map((a) => a.id === activo.id ? activo : a) : [activo, ...activos];

    // Notify newly-added owners
    if (exists) {
      const prev = activos.find((a) => a.id === activo.id);
      const prevIds = new Set((prev?.owners ?? []).map((o) => o.id.toLowerCase()));
      activo.owners.forEach((o) => {
        if (o.id && !prevIds.has(o.id.toLowerCase()) && o.id.toLowerCase() !== user.id.toLowerCase()) {
          addNotification({
            userId: o.id.toLowerCase(),
            tipo: "OPPORTUNITY_ADDED",
            oportunidadId: activo.id,
            oportunidadNombre: activo.nombre,
            createdBy: user.name,
            readAt: null,
          });
        }
      });
    }
    setActivos(next); saveActivos(next);
    setModal("none"); setSelectedId(null);
    showSuccess(exists ? "Activo actualizado correctamente." : "Activo registrado en el Portal de Activos.");
  };

  const handleDelete = (id: string) => {
    const next = activos.filter((a) => a.id !== id);
    setActivos(next); saveActivos(next);
    setModal("none"); setSelectedId(null);
    showSuccess("El activo ha sido eliminado.");
  };

  const hasFilters   = !!(search || filterClasifs.length > 0 || filterEstado || filterMios);
  const clearFilters = () => { setSearch(""); setFilterClasifs([]); setFilterEstado(""); setFilterMios(false); setPage(1); };

  return (
    <Box>
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, mb: 2, flexWrap: "wrap" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <TextField
            size="small" placeholder="Buscar activo..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} sx={{ width: 240 }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search size={14} style={{ color: "var(--muted-foreground)" }} /></InputAdornment> } }}
          />

          {/* Multi-select clasificación */}
          <Select
            multiple
            size="small"
            value={filterClasifs}
            onChange={(e) => {
              const val = e.target.value;
              setFilterClasifs(typeof val === "string" ? [val] : val as string[]);
              setPage(1);
            }}
            displayEmpty
            renderValue={(selected) => {
              if (!selected.length) return <span style={{ color: "var(--muted-foreground)" }}>Clasificación</span>;
              if (selected.length === 1) return selected[0];
              return `${selected.length} clasificaciones`;
            }}
            sx={{ minWidth: 220, fontSize: "var(--text-sm)" }}
          >
            {CLASIFICACIONES.map((c) => (
              <MenuItem key={c} value={c} dense>
                <Checkbox size="small" checked={filterClasifs.includes(c)}
                  sx={{ p: 0, mr: 1, color: "var(--border)", "&.Mui-checked": { color: "var(--primary)" } }} />
                <Typography variant="caption">{c}</Typography>
              </MenuItem>
            ))}
          </Select>

          <TextField select size="small" value={filterEstado}
            onChange={(e) => { setFilterEstado(e.target.value); setPage(1); }}
            sx={{ minWidth: 200 }} SelectProps={{ displayEmpty: true }}
          >
            <MenuItem value=""><span style={{ color: "var(--muted-foreground)" }}>Estado</span></MenuItem>
            {ESTADOS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </TextField>
          <FormControlLabel
            control={<Checkbox checked={filterMios} size="small"
              onChange={(e) => { setFilterMios(e.target.checked); setPage(1); }}
              sx={{ color: "var(--border)", "&.Mui-checked": { color: "var(--primary)" } }} />}
            label={<Typography variant="caption">Mis activos</Typography>}
            sx={{ ml: 0.5 }}
          />
          {hasFilters && (
            <Button variant="text" size="small" color="inherit"
              startIcon={<X size={12} />} onClick={clearFilters}
              sx={{ fontSize: "var(--text-xs)", color: "text.secondary" }}>
              Limpiar
            </Button>
          )}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {(user.role === "Editor" || user.role === "Admin") && (
            <Button variant="contained" size="small" startIcon={<Plus size={14} />} onClick={() => setModal("nuevo")}>
              Nuevo activo
            </Button>
          )}
        </Box>
      </Box>

      {/* ── Success alert ────────────────────────────────────────────────── */}
      <Collapse in={!!successMsg}>
        <Alert severity="success" icon={<CheckCircle2 size={14} />} onClose={() => setSuccessMsg("")} sx={{ mb: 2 }}>
          {successMsg}
        </Alert>
      </Collapse>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: "var(--radius)" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>NOMBRE ACTIVO</TableCell>
              <TableCell>CLASIFICACIÓN</TableCell>
              <TableCell>ESTADO</TableCell>
              <TableCell sx={{ width: 110 }}>ACCIONES</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 5, color: "text.secondary" }}>
                  No se encontraron activos
                </TableCell>
              </TableRow>
            ) : pageRows.map((a) => (
              <TableRow
                key={a.id} hover
                onClick={() => openConsultar(a.id)}
                sx={{ cursor: "pointer" }}
              >
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>{a.nombre}</Typography>
                  <Typography variant="caption" color="text.secondary">v{a.version}</Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {a.clasificacion.slice(0, 2).map((c, i) => (
                      <Box key={i} sx={{ px: 1, py: 0.25, border: "1px solid var(--border)", borderRadius: "var(--radius-chip)", bgcolor: "var(--muted)" }}>
                        <Typography variant="caption" sx={{ fontSize: "var(--text-2xs)" }}>{c}</Typography>
                      </Box>
                    ))}
                    {a.clasificacion.length > 2 && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: "var(--text-2xs)", alignSelf: "center" }}>
                        +{a.clasificacion.length - 2}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <StatusChip status={a.estado} />
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    <Tooltip title="Consultar">
                      <IconButton size="small" onClick={() => openConsultar(a.id)}>
                        <Eye size={14} />
                      </IconButton>
                    </Tooltip>
                    {canDownload && (
                      <Tooltip title="Descargar todo">
                        <IconButton size="small" onClick={() => downloadZip(a)}>
                          <Download size={14} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {canDelete && (
                      <Tooltip title="Eliminar">
                        <IconButton size="small" color="error"
                          onClick={() => { if (window.confirm(`¿Eliminar "${a.nombre}"?`)) handleDelete(a.id); }}>
                          <Trash2 size={14} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 1.5 }}>
        <Typography variant="caption" color="text.secondary">
          Mostrando {pageRows.length} de {filtered.length} activo{filtered.length !== 1 ? "s" : ""}
        </Typography>
        {totalPages > 1 && (
          <Pagination count={totalPages} page={safePage} onChange={(_, p) => setPage(p)} size="small" />
        )}
      </Box>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      {modal === "nuevo" && (
        <ActivoFormModal activo={null} onClose={() => setModal("none")} onSave={handleSave} />
      )}
      {modal === "consultar" && selected && (
        <ConsultarActivoModal
          activo={selected}
          canEdit={canEditActivo(selected)}
          canDelete={canDelete}
          canDownload={canDownload}
          onClose={() => { setModal("none"); setSelectedId(null); }}
          onEdit={() => setModal("editar")}
          onDelete={() => handleDelete(selected.id)}
        />
      )}
      {modal === "editar" && selected && (
        <ActivoFormModal
          activo={selected}
          onClose={() => setModal("consultar")}
          onSave={handleSave}
        />
      )}
    </Box>
  );
}
