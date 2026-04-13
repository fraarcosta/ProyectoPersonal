// Portal de Innovación — Akena
// Persistencia COLECTIVA (sin userId): "portal-innovacion-v2"
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

interface Innovacion {
  id:                   string;
  nombre:               string;
  responsable:          string;
  descripcion:          string;
  planDesarrollo:       string;
  solucionTecnologica:  string;
  objetivo:             string;
  impacto:              string;
  estado:               string;
  presupuestoEjecutado: string;
  version:              string;
  owners:               ColaboradorUser[];
  clasificacion:        string[];
  clasificacionOtro:    string;
  tecnologias:          string[];
  clientes:             string[];
  documentacion:        DocFile[];
  createdAt:            string;
  createdBy:            string;
  updatedAt:            string;
  updatedBy:            string;
}

interface InnovacionForm {
  nombre:               string;
  responsable:          string;
  descripcion:          string;
  planDesarrollo:       string;
  solucionTecnologica:  string;
  objetivo:             string;
  impacto:              string;
  estado:               string;
  presupuestoEjecutado: string;
  version:              string;
  owners:               ColaboradorUser[];
  clasificacion:        string[];
  clasificacionOtro:    string;
  nuevaTecnologia:      string;
  tecnologias:          string[];
  nuevoCliente:         string;
  clientes:             string[];
  documentacion:        DocFile[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CLASIFICACIONES = [
  "IA / Automatización", "Analytics & Data", "IA Conversacional",
  "Blockchain", "Cloud / Infraestructura", "Automatización / RPA",
  "Ciberseguridad", "Visualización de datos", "Plataforma digital", "Otro",
];

const ESTADOS = ["En desarrollo", "Finalizada", "Implementada", "Escalada"];

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  "En desarrollo": { bg: "var(--accent-subtle)",  color: "var(--accent)"              },
  "Finalizada":    { bg: "var(--success-subtle)", color: "var(--success)"             },
  "Implementada":  { bg: "var(--primary-subtle)", color: "var(--primary)"             },
  "Escalada":      { bg: "var(--warning-subtle)", color: "var(--warning-foreground)"  },
};

const FALLBACK_TOKEN = { bg: "var(--muted)", color: "var(--muted-foreground)" };
const ITEMS_PER_PAGE = 10;
const STORAGE_KEY    = "portal-innovacion-v2";

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

const genId = () => `innov-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fmtEuro = (n: string) => n ? `${Number(n).toLocaleString("es-ES")} €` : "—";

async function downloadZip(innov: Innovacion): Promise<void> {
  const zip    = new JSZip();
  const folder = zip.folder("Documentacion")!;
  innov.documentacion.forEach((f) =>
    folder.file(f.name, `Portal de Innovación — Akena\n\nInnovación: ${innov.nombre}\nFichero: ${f.name}\nTamaño: ${f.size}\n\n[Contenido simulado]`),
  );
  zip.file(
    "README.txt",
    `Portal de Innovación — Akena\n\nInnovación: ${innov.nombre}\nClasificación: ${innov.clasificacion.join(", ")}\nEstado: ${innov.estado}\nVersión: ${innov.version}`,
  );
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `Innovacion_${innov.nombre.replace(/\s+/g, "_")}_v${innov.version}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

function simulateFileDownload(file: DocFile) {
  const blob = new Blob(
    [`Portal de Innovación — Akena\n\nFichero: ${file.name}\nTamaño: ${file.size}\n\n[Contenido simulado]`],
    { type: "text/plain;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href = url; a.download = file.name; a.click();
  URL.revokeObjectURL(url);
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const SEED: Innovacion[] = [
  {
    id: "inn-1", nombre: "IA Generativa para redacción de ofertas",
    responsable: "María García",
    descripcion: "Asistente de IA que genera borradores de ofertas técnicas a partir de los pliegos de condiciones, utilizando LLMs fine-tuned con ofertas históricas de Accenture.",
    planDesarrollo: "MVP desarrollado en Q2 2024 usando Azure OpenAI. Piloto con equipo de Sector Público.",
    solucionTecnologica: "Azure OpenAI GPT-4 + LangChain + React",
    objetivo: "Reducir el tiempo de redacción de ofertas técnicas en un 60%.",
    impacto: "Validado en 3 ofertas reales. Ahorro medio de 48 horas por oportunidad.",
    estado: "Implementada", presupuestoEjecutado: "85000", version: "1.2",
    owners: [
      { id: "E56789", name: "María García",  role: "Manager"        },
      { id: "E67890", name: "Carlos López",  role: "Senior Analyst" },
    ],
    clasificacion: ["IA / Automatización", "IA Conversacional"],
    clasificacionOtro: "",
    tecnologias: ["Azure OpenAI", "LangChain", "React", "Python"],
    clientes: ["AEAT", "Interno Accenture"],
    documentacion: [
      { name: "memoria-tecnica-ia-gen.pdf",  size: "4.2 MB" },
      { name: "demo-asistente-v1.2.pptx",    size: "8.7 MB" },
    ],
    createdAt: "10/03/2024", createdBy: "María García",
    updatedAt: "15/11/2024", updatedBy: "Carlos López",
  },
  {
    id: "inn-2", nombre: "Análisis predictivo de adjudicaciones",
    responsable: "Carlos López",
    descripcion: "Modelo de ML que predice la probabilidad de adjudicación de una licitación pública basándose en datos históricos de la plataforma de contratación del Estado.",
    planDesarrollo: "Análisis exploratorio Q3 2023. Modelo entrenado con 5 años de datos históricos.",
    solucionTecnologica: "Python (scikit-learn, XGBoost) + Power BI",
    objetivo: "Mejorar la tasa de selección de oportunidades con alta probabilidad de win.",
    impacto: "Precisión del 73% en predicción de adjudicaciones. Implementado en el proceso de Go/No-Go.",
    estado: "Finalizada", presupuestoEjecutado: "42000", version: "2.1",
    owners: [{ id: "E67890", name: "Carlos López", role: "Senior Analyst" }],
    clasificacion: ["Analytics & Data"],
    clasificacionOtro: "",
    tecnologias: ["Python", "scikit-learn", "XGBoost", "Power BI"],
    clientes: ["Transversal — Sector Público"],
    documentacion: [{ name: "modelo-predictivo-v2.1.pdf", size: "2.8 MB" }],
    createdAt: "01/09/2023", createdBy: "Carlos López",
    updatedAt: "20/06/2024", updatedBy: "Carlos López",
  },
  {
    id: "inn-3", nombre: "Asistente virtual tramitación administrativa",
    responsable: "Ana Martínez",
    descripcion: "Chatbot conversacional para automatizar la gestión de consultas y trámites administrativos en organismos de la Administración Pública española.",
    planDesarrollo: "Piloto en SEPE desde Q4 2024. Iteración mensual con el equipo del cliente.",
    solucionTecnologica: "Azure Bot Service + Azure OpenAI + Power Platform",
    objetivo: "Automatizar el 40% de las consultas de ciudadanos en primer nivel de atención.",
    impacto: "Reducción del 35% en volumen de llamadas al call center. NPS ciudadano +18 puntos.",
    estado: "En desarrollo", presupuestoEjecutado: "120000", version: "0.9",
    owners: [
      { id: "E23456", name: "Ana Martínez",  role: "Consultant" },
      { id: "E78901", name: "Pedro Sánchez", role: "Consultant" },
    ],
    clasificacion: ["IA Conversacional", "Automatización / RPA"],
    clasificacionOtro: "",
    tecnologias: ["Azure Bot Service", "Azure OpenAI", "Power Platform", "C#"],
    clientes: ["SEPE"],
    documentacion: [
      { name: "memoria-asistente-virtual.docx", size: "3.1 MB" },
      { name: "arquitectura-tecnica.pdf",        size: "1.9 MB" },
    ],
    createdAt: "05/10/2024", createdBy: "Ana Martínez",
    updatedAt: "28/01/2025", updatedBy: "Ana Martínez",
  },
  {
    id: "inn-4", nombre: "Dashboard gestión desempeño contractual",
    responsable: "Pedro Sánchez",
    descripcion: "Plataforma de visualización en tiempo real del desempeño de contratos públicos, con alertas automáticas de desvíos de SLA y KPIs contractuales.",
    planDesarrollo: "Desarrollado como acelerador reutilizable a partir del proyecto MINHAP 2023.",
    solucionTecnologica: "Power BI Embedded + Azure Synapse + API REST",
    objetivo: "Proporcionar visibilidad 360° sobre el cumplimiento contractual en tiempo real.",
    impacto: "Implantado en 2 contratos. Reducción del 60% en tiempo de preparación de informes de seguimiento.",
    estado: "Escalada", presupuestoEjecutado: "35000", version: "1.5",
    owners: [
      { id: "E78901", name: "Pedro Sánchez", role: "Consultant"     },
      { id: "E45678", name: "Laura Gómez",   role: "Senior Analyst" },
    ],
    clasificacion: ["Visualización de datos", "Analytics & Data"],
    clasificacionOtro: "",
    tecnologias: ["Power BI", "Azure Synapse", "SQL Server", "Python"],
    clientes: ["MINHAP", "DG Catastro"],
    documentacion: [{ name: "dashboard-desempeno-v1.5.pbix", size: "6.4 MB" }],
    createdAt: "15/01/2024", createdBy: "Pedro Sánchez",
    updatedAt: "10/10/2024", updatedBy: "Laura Gómez",
  },
  {
    id: "inn-5", nombre: "Blockchain trazabilidad documental AAPP",
    responsable: "Laura Gómez",
    descripcion: "Solución de trazabilidad inmutable para documentos oficiales de la Administración Pública usando tecnología blockchain permisionada.",
    planDesarrollo: "Prueba de concepto desarrollada con DG Catastro en Q1 2024. Evaluación regulatoria en curso.",
    solucionTecnologica: "Hyperledger Fabric + Azure Blockchain + REST API",
    objetivo: "Garantizar la integridad y trazabilidad de documentos en expedientes electrónicos.",
    impacto: "PoC validada técnicamente. Pendiente de aprobación regulatoria para despliegue.",
    estado: "En desarrollo", presupuestoEjecutado: "65000", version: "0.5",
    owners: [{ id: "E45678", name: "Laura Gómez", role: "Senior Analyst" }],
    clasificacion: ["Blockchain"],
    clasificacionOtro: "",
    tecnologias: ["Hyperledger Fabric", "Azure Blockchain", "Node.js"],
    clientes: ["DG Catastro"],
    documentacion: [
      { name: "poc-blockchain-dg-catastro.pdf", size: "5.2 MB" },
      { name: "analisis-regulatorio.docx",      size: "1.4 MB" },
    ],
    createdAt: "10/02/2024", createdBy: "Laura Gómez",
    updatedAt: "05/12/2024", updatedBy: "Laura Gómez",
  },
];

// ─── Persistence ──────────────────────────────────────────────────────────────

function readInnovaciones(): Innovacion[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Innovacion[];
      if (Array.isArray(parsed)) {
        // Validate owners format — if items are plain strings (old format), discard and re-seed
        const validOwners = parsed.every(
          (i) =>
            !Array.isArray(i.owners) ||
            i.owners.length === 0 ||
            typeof i.owners[0] === "object",
        );
        if (!validOwners) { localStorage.removeItem(STORAGE_KEY); return SEED; }
        // Migrate old estado values to new names
        const ESTADO_MAP: Record<string, string> = {
          "Implantado en cliente(s)":        "Implantado en cliente",
          "Desarrollado (sin implantación)": "Desarrollado",
        };
        // Migrate clasificacion from string to string[] (legacy format)
        const migrated = parsed.map((i) => ({
          ...i,
          estado: ESTADO_MAP[i.estado] ?? i.estado,
          clasificacion: Array.isArray(i.clasificacion)
            ? i.clasificacion
            : [i.clasificacion as unknown as string],
        }));
        return migrated as Innovacion[];
      }
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {}
  return SEED;
}

function saveInnovaciones(items: Innovacion[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
}

// ─── Form helpers ─────────────────────────────────────────────────────────────

const FORM_INIT: InnovacionForm = {
  nombre: "", responsable: "", descripcion: "", planDesarrollo: "",
  solucionTecnologica: "", objetivo: "", impacto: "",
  estado: "", presupuestoEjecutado: "", version: "",
  owners: [], clasificacion: [], clasificacionOtro: "",
  nuevaTecnologia: "", tecnologias: [],
  nuevoCliente: "", clientes: [], documentacion: [],
};

function formFromInnovacion(i: Innovacion): InnovacionForm {
  const standardClasifs = CLASIFICACIONES.slice(0, -1);
  const storedClasifs = Array.isArray(i.clasificacion) ? i.clasificacion : [i.clasificacion as unknown as string];
  const customClasifs = storedClasifs.filter((c) => !standardClasifs.includes(c));
  const formClasifs = [
    ...storedClasifs.filter((c) => standardClasifs.includes(c)),
    ...(customClasifs.length > 0 ? ["Otro"] : []),
  ];
  return {
    nombre: i.nombre, responsable: i.responsable,
    descripcion: i.descripcion, planDesarrollo: i.planDesarrollo,
    solucionTecnologica: i.solucionTecnologica,
    objetivo: i.objetivo, impacto: i.impacto,
    estado: i.estado, presupuestoEjecutado: i.presupuestoEjecutado,
    version: i.version,
    owners: [...i.owners],
    clasificacion: formClasifs,
    clasificacionOtro: customClasifs[0] ?? "",
    nuevaTecnologia: "", tecnologias: [...i.tecnologias],
    nuevoCliente: "", clientes: [...i.clientes],
    documentacion: [...i.documentacion],
  };
}

function validate(f: InnovacionForm): Record<string, string> {
  const e: Record<string, string> = {};
  if (!f.nombre.trim())              e.nombre              = "Campo obligatorio";
  if (!f.responsable.trim())         e.responsable         = "Campo obligatorio";
  if (!f.descripcion.trim())         e.descripcion         = "Campo obligatorio";
  if (!f.planDesarrollo.trim())      e.planDesarrollo      = "Campo obligatorio";
  if (!f.solucionTecnologica.trim()) e.solucionTecnologica = "Campo obligatorio";
  if (!f.objetivo.trim())            e.objetivo            = "Campo obligatorio";
  if (!f.impacto.trim())             e.impacto             = "Campo obligatorio";
  if (!f.estado)                     e.estado              = "Selecciona un estado";
  if (!f.presupuestoEjecutado.trim() || isNaN(Number(f.presupuestoEjecutado)))
                                     e.presupuestoEjecutado = "Introduce un importe válido";
  if (!f.version.trim())             e.version             = "Campo obligatorio";
  if (f.clasificacion.length === 0)  e.clasificacion       = "Selecciona al menos una clasificación";
  if (f.clasificacion.includes("Otro") && !f.clasificacionOtro.trim())
                                     e.clasificacionOtro   = "Especifica la clasificación";
  if (f.tecnologias.length === 0)    e.tecnologias         = "Añade al menos una tecnología";
  if (f.clientes.length === 0)       e.clientes            = "Añade al menos un cliente";
  if (f.documentacion.length === 0)  e.documentacion       = "Sube al menos un documento";
  return e;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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
          placeholder={placeholder ?? `Añadir...`}
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

// ─── ColabUserRow ─────────────────────────────────────────────────────────────

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

// ─── ColaboradorSelector ──────────────────────────────────────────────────────

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

  const add    = (u: ColaboradorUser) => { if (!owners.find((o) => o.id === u.id)) onChange([...owners, u]); setQuery(""); };
  const remove = (id: string)         => onChange(owners.filter((o) => o.id !== id));

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

// ─── InnovacionFormModal — create & edit ──────────────────────────────────────

function InnovacionFormModal({ innovacion, onClose, onSave }: {
  innovacion: Innovacion | null;
  onClose: () => void;
  onSave: (i: Innovacion) => void;
}) {
  const isEdit = innovacion !== null;
  const [form, setForm]     = useState<InnovacionForm>(() => innovacion ? formFromInnovacion(innovacion) : FORM_INIT);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof InnovacionForm>(key: K, val: InnovacionForm[K]) => {
    setForm((p) => ({ ...p, [key]: val }));
    setErrors((p) => { const n = { ...p }; delete n[key as string]; return n; });
  };

  const addTag = (
    listKey: "tecnologias" | "clientes",
    newKey:  "nuevaTecnologia" | "nuevoCliente",
    errorKey: string,
  ) => {
    const val = (form[newKey] as string).trim();
    if (!val || (form[listKey] as string[]).includes(val)) return;
    setForm((p) => ({ ...p, [listKey]: [...(p[listKey] as string[]), val], [newKey]: "" }));
    setErrors((p) => { const n = { ...p }; delete n[errorKey]; return n; });
  };

  const removeTag = (listKey: "tecnologias" | "clientes", i: number) =>
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
      id:                   innovacion?.id ?? genId(),
      nombre:               form.nombre.trim(),
      responsable:          form.responsable.trim(),
      descripcion:          form.descripcion.trim(),
      planDesarrollo:       form.planDesarrollo.trim(),
      solucionTecnologica:  form.solucionTecnologica.trim(),
      objetivo:             form.objetivo.trim(),
      impacto:              form.impacto.trim(),
      estado:               form.estado,
      presupuestoEjecutado: form.presupuestoEjecutado.trim(),
      version:              form.version.trim(),
      owners:               form.owners,
      clasificacion:        clasificacionFinal,
      clasificacionOtro:    form.clasificacion.includes("Otro") ? form.clasificacionOtro.trim() : "",
      tecnologias:          form.tecnologias,
      clientes:             form.clientes,
      documentacion:        form.documentacion,
      createdAt:            innovacion?.createdAt ?? todayStr(),
      createdBy:            innovacion?.createdBy ?? user.name,
      updatedAt:            todayStr(),
      updatedBy:            user.name,
    });
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md" scroll="paper">
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <Box>
            <Typography variant="h6">{isEdit ? "Editar innovación" : "Nueva innovación"}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {isEdit ? "Modifica los campos y guarda los cambios" : "Registra una nueva innovación en el Portal de Innovación"}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ mt: -0.5, mr: -0.5 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2.5, p: 3 }}>

        {/* 1 — Información */}
        <SectionCard title="1 — Información de la innovación" icon={<FileText size={13} />}>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <Box sx={{ gridColumn: "1 / -1" }}>
              <TextField fullWidth size="small" required label="Nombre de la innovación"
                placeholder="Ej. IA Generativa para redacción de ofertas"
                value={form.nombre} onChange={(e) => set("nombre", e.target.value)}
                error={!!errors.nombre} helperText={errors.nombre || " "}
              />
            </Box>
            <TextField fullWidth size="small" required label="Responsable"
              placeholder="Nombre del responsable"
              value={form.responsable} onChange={(e) => set("responsable", e.target.value)}
              error={!!errors.responsable} helperText={errors.responsable || " "}
            />
            <TextField fullWidth size="small" required label="Versión"
              placeholder="Ej. 1.0, 0.9"
              value={form.version} onChange={(e) => set("version", e.target.value)}
              error={!!errors.version} helperText={errors.version || " "}
            />
            <Box sx={{ gridColumn: "1 / -1" }}>
              <TextField fullWidth size="small" required multiline rows={3} label="Descripción"
                placeholder="Describe la innovación, su contexto y propósito..."
                value={form.descripcion} onChange={(e) => set("descripcion", e.target.value)}
                error={!!errors.descripcion} helperText={errors.descripcion || " "}
              />
            </Box>
            <Box sx={{ gridColumn: "1 / -1" }}>
              <TextField fullWidth size="small" required multiline rows={2} label="Plan de desarrollo"
                placeholder="Describe el plan o historia de desarrollo..."
                value={form.planDesarrollo} onChange={(e) => set("planDesarrollo", e.target.value)}
                error={!!errors.planDesarrollo} helperText={errors.planDesarrollo || " "}
              />
            </Box>
            <Box sx={{ gridColumn: "1 / -1" }}>
              <TextField fullWidth size="small" required label="Solución tecnológica aplicada"
                placeholder="Ej. Azure OpenAI + LangChain + React"
                value={form.solucionTecnologica} onChange={(e) => set("solucionTecnologica", e.target.value)}
                error={!!errors.solucionTecnologica} helperText={errors.solucionTecnologica || " "}
              />
            </Box>
            <Box sx={{ gridColumn: "1 / -1" }}>
              <TextField fullWidth size="small" required multiline rows={2} label="Objetivo"
                placeholder="¿Qué objetivo persigue esta innovación?"
                value={form.objetivo} onChange={(e) => set("objetivo", e.target.value)}
                error={!!errors.objetivo} helperText={errors.objetivo || " "}
              />
            </Box>
            <Box sx={{ gridColumn: "1 / -1" }}>
              <TextField fullWidth size="small" required multiline rows={2} label="Impacto conseguido"
                placeholder="¿Qué impacto ha tenido esta innovación?"
                value={form.impacto} onChange={(e) => set("impacto", e.target.value)}
                error={!!errors.impacto} helperText={errors.impacto || " "}
              />
            </Box>
            <TextField select fullWidth size="small" required label="Estado de la innovación"
              value={form.estado} onChange={(e) => set("estado", e.target.value)}
              error={!!errors.estado} helperText={errors.estado || " "}
            >
              <MenuItem value=""><em>Selecciona estado</em></MenuItem>
              {ESTADOS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
            <TextField fullWidth size="small" required label="Presupuesto ejecutado (€)"
              type="number" placeholder="0"
              value={form.presupuestoEjecutado} onChange={(e) => set("presupuestoEjecutado", e.target.value)}
              error={!!errors.presupuestoEjecutado} helperText={errors.presupuestoEjecutado || " "}
              slotProps={{ input: { startAdornment: <InputAdornment position="start">€</InputAdornment> } }}
            />

            {/* Clasificación — multi-select estilo tipología */}
            <Box sx={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 0 }}>
              <TextField
                select fullWidth size="small" required
                label="Clasificación de la innovación"
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
                  placeholder="Describe la clasificación..."
                  value={form.clasificacionOtro}
                  onChange={(e) => { set("clasificacionOtro", e.target.value); }}
                  error={!!errors.clasificacionOtro}
                  helperText={errors.clasificacionOtro || " "}
                  sx={{ mt: -1.5 }}
                />
              )}
            </Box>
          </Box>
        </SectionCard>

        {/* 2 — Colaboradores */}
        <SectionCard title="2 — Colaboradores de la innovación (owners)" icon={<User size={13} />}>
          <ColaboradorSelector
            label="Busca y añade colaboradores que podrán editar esta innovación"
            owners={form.owners}
            onChange={(owners) => set("owners", owners)}
          />
        </SectionCard>

        {/* 3 — Tecnologías */}
        <SectionCard title="3 — Tecnologías utilizadas">
          <TagInput
            label="Tecnologías" required
            tags={form.tecnologias} newValue={form.nuevaTecnologia}
            placeholder="Ej. Python, Azure OpenAI, React..."
            onChangeNew={(v) => set("nuevaTecnologia", v)}
            onAdd={() => addTag("tecnologias", "nuevaTecnologia", "tecnologias")}
            onRemove={(i) => removeTag("tecnologias", i)}
            error={errors.tecnologias}
          />
        </SectionCard>

        {/* 4 — Clientes */}
        <SectionCard title="4 — Cliente(s) donde se implementó">
          <TagInput
            label="Clientes" required
            tags={form.clientes} newValue={form.nuevoCliente}
            placeholder="Ej. AEAT, MINHAP, SEPE..."
            onChangeNew={(v) => set("nuevoCliente", v)}
            onAdd={() => addTag("clientes", "nuevoCliente", "clientes")}
            onRemove={(i) => removeTag("clientes", i)}
            error={errors.clientes}
          />
        </SectionCard>

        {/* 5 — Documentación */}
        <SectionCard title="5 — Documentación asociada" icon={<Paperclip size={13} />}>
          <FileUploadWidget
            label={<>Documentación de la innovación <span style={{ color: "var(--destructive)" }}>*</span></>}
            files={form.documentacion}
            onAdd={(f) => { setForm((p) => ({ ...p, documentacion: [...p.documentacion, f] })); setErrors((p) => { const n = { ...p }; delete n.documentacion; return n; }); }}
            onRemove={(i) => setForm((p) => ({ ...p, documentacion: p.documentacion.filter((_, j) => j !== i) }))}
            error={errors.documentacion}
          />
        </SectionCard>

      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5, gap: 1 }}>
        <Button variant="outlined" color="inherit" onClick={onClose}>Cancelar</Button>
        <Button variant="contained" startIcon={<CheckCircle2 size={14} />} onClick={handleSubmit}>
          {isEdit ? "Guardar cambios" : "Guardar innovación"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── ConsultarInnovacionModal ─────────────────────────────────────────────────

function ConsultarInnovacionModal({ innovacion, canEdit, canDelete, canDownload = true, onClose, onEdit, onDelete }: {
  innovacion: Innovacion; canEdit: boolean; canDelete: boolean; canDownload?: boolean;
  onClose: () => void; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md" scroll="paper">
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
              <Typography variant="h6">{innovacion.nombre}</Typography>
              <StatusChip status={innovacion.estado} />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {innovacion.clasificacion.join(" · ")} · v{innovacion.version} · Responsable: {innovacion.responsable}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ mt: -0.5, mr: -0.5 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2.5, p: 3 }}>

        <SectionCard title="Información de la innovación" icon={<FileText size={13} />}>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <ReadOnlyField label="Nombre"                value={innovacion.nombre} />
            <ReadOnlyField label="Responsable"           value={innovacion.responsable} />
            <ReadOnlyField label="Clasificación"         value={
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.25 }}>
                {innovacion.clasificacion.map((c, i) => (
                  <Box key={i} sx={{ px: 1.25, py: 0.25, border: "1px solid var(--border)", borderRadius: "var(--radius-chip)", bgcolor: "var(--muted)" }}>
                    <Typography variant="caption" sx={{ fontSize: "var(--text-2xs)" }}>{c}</Typography>
                  </Box>
                ))}
              </Box>
            } />
            <ReadOnlyField label="Estado"                value={<StatusChip status={innovacion.estado} />} />
            <ReadOnlyField label="Versión"               value={innovacion.version} />
            <ReadOnlyField label="Presupuesto ejecutado" value={fmtEuro(innovacion.presupuestoEjecutado)} />
            <Box sx={{ gridColumn: "1 / -1" }}><ReadOnlyField label="Descripción"             value={innovacion.descripcion} /></Box>
            <Box sx={{ gridColumn: "1 / -1" }}><ReadOnlyField label="Plan de desarrollo"      value={innovacion.planDesarrollo} /></Box>
            <Box sx={{ gridColumn: "1 / -1" }}><ReadOnlyField label="Solución tecnológica"    value={innovacion.solucionTecnologica} /></Box>
            <Box sx={{ gridColumn: "1 / -1" }}><ReadOnlyField label="Objetivo"                value={innovacion.objetivo} /></Box>
            <Box sx={{ gridColumn: "1 / -1" }}><ReadOnlyField label="Impacto conseguido"      value={innovacion.impacto} /></Box>
          </Box>
        </SectionCard>

        {innovacion.owners.length > 0 && (
          <SectionCard title="Colaboradores (owners)" icon={<User size={13} />}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              {innovacion.owners.map((o) => (
                <Box key={o.id} sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 1.5, py: 0.875, border: "1px solid var(--border)", borderRadius: "var(--radius-banner)", bgcolor: "var(--muted)" }}>
                  <ColabUserRow name={o.name} id={o.id} role={o.role} filled />
                </Box>
              ))}
            </Box>
          </SectionCard>
        )}

        <SectionCard title="Tecnologías utilizadas">
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
            {innovacion.tecnologias.length > 0
              ? innovacion.tecnologias.map((t, i) => (
                  <Box key={i} sx={{ px: 1.25, py: 0.5, border: "1px solid var(--border)", borderRadius: "var(--radius-chip)", bgcolor: "var(--muted)" }}>
                    <Typography variant="caption" sx={{ fontSize: "var(--text-2xs)" }}>{t}</Typography>
                  </Box>
                ))
              : <Typography variant="caption" color="text.secondary">—</Typography>}
          </Box>
        </SectionCard>

        <SectionCard title="Clientes donde se implementó">
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
            {innovacion.clientes.length > 0
              ? innovacion.clientes.map((c, i) => (
                  <Box key={i} sx={{ px: 1.25, py: 0.5, border: "1px solid var(--border)", borderRadius: "var(--radius-chip)", bgcolor: "var(--muted)" }}>
                    <Typography variant="caption" sx={{ fontSize: "var(--text-2xs)" }}>{c}</Typography>
                  </Box>
                ))
              : <Typography variant="caption" color="text.secondary">—</Typography>}
          </Box>
        </SectionCard>

        <SectionCard title="Documentación asociada" icon={<Paperclip size={13} />}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
            {innovacion.documentacion.length > 0
              ? innovacion.documentacion.map((f, i) => <DocFileRow key={i} file={f} canDownload={canDownload} />)
              : <Typography variant="caption" color="text.secondary">Sin documentación</Typography>}
          </Box>
        </SectionCard>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 1, borderRadius: "var(--radius-banner)", bgcolor: "var(--neutral-subtle)", border: "1px solid var(--border)" }}>
          <User size={12} style={{ color: "var(--muted-foreground)" }} />
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: "var(--text-2xs)" }}>
            Actualizado el{" "}<strong style={{ color: "var(--foreground)" }}>{innovacion.updatedAt}</strong>{" "}
            por{" "}<strong style={{ color: "var(--foreground)" }}>{innovacion.updatedBy}</strong>
            {" · "}Creado el{" "}<strong style={{ color: "var(--foreground)" }}>{innovacion.createdAt}</strong>{" "}
            por{" "}<strong style={{ color: "var(--foreground)" }}>{innovacion.createdBy}</strong>
          </Typography>
        </Box>

      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5, justifyContent: "space-between" }}>
        <Box>
          {canDelete && (
            <Button variant="outlined" color="error" startIcon={<Trash2 size={13} />}
              onClick={() => { if (window.confirm(`¿Eliminar "${innovacion.nombre}"? Esta acción no se puede deshacer.`)) onDelete(); }}>
              Eliminar innovación
            </Button>
          )}
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="outlined" color="inherit" onClick={onClose}>Cerrar</Button>
          {canEdit && (
            <Button variant="contained" startIcon={<CheckCircle2 size={14} />} onClick={onEdit}>
              Editar innovación
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
}

// ─── InnovacionPortal — main export ───────────────────────────────────────────

export function InnovacionPortal() {
  const [innovaciones, setInnovaciones]   = useState<Innovacion[]>(() => readInnovaciones());
  const [modal, setModal]                 = useState<"none" | "nuevo" | "consultar" | "editar">("none");
  const [selectedId, setSelectedId]       = useState<string | null>(null);
  const [page, setPage]                   = useState(1);
  const [search, setSearch]               = useState("");
  const [filterClasifs, setFilterClasifs] = useState<string[]>([]);
  const [filterEstado, setFilterEstado]   = useState("");
  const [filterCliente, setFilterCliente] = useState("");
  const [filterMios, setFilterMios]       = useState(false);
  const [successMsg, setSuccessMsg]       = useState("");

  const user        = getAuthUser();
  const canDownload = user.role !== "Lectura";
  const canDelete   = user.role === "Admin";
  const selected    = innovaciones.find((i) => i.id === selectedId) ?? null;

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(""), 5000); };

  const isOwner = (i: Innovacion) =>
    i.owners.some(
      (o) =>
        (o?.id?.toLowerCase() ?? "") === (user.id?.toLowerCase() ?? "") ||
        (o?.name?.toLowerCase() ?? "") === (user.name?.toLowerCase() ?? ""),
    );

  // canEdit per innovacion: Admin always; Editor only if owner
  const canEditInnovacion = (i: Innovacion) =>
    user.role === "Admin" ||
    (user.role === "Editor" && isOwner(i));

  const allClientes = Array.from(new Set(innovaciones.flatMap((i) => i.clientes))).sort();

  const clasificacionStandard = CLASIFICACIONES.slice(0, -1); // excluye "Otro"

  const filtered = innovaciones.filter((i) => {
    const q = search.toLowerCase();
    const matchClasif = filterClasifs.length === 0 || filterClasifs.some((fc) =>
      fc === "Otro"
        ? i.clasificacion.some((c) => !clasificacionStandard.includes(c))
        : i.clasificacion.includes(fc),
    );
    return (
      (!q || i.nombre.toLowerCase().includes(q) || i.responsable.toLowerCase().includes(q) || i.clasificacion.join(" ").toLowerCase().includes(q)) &&
      matchClasif &&
      (!filterEstado  || i.estado === filterEstado) &&
      (!filterCliente || i.clientes.includes(filterCliente)) &&
      (!filterMios    || isOwner(i))
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const pageRows   = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const handleSave = (innovacion: Innovacion) => {
    const exists = innovaciones.some((i) => i.id === innovacion.id);
    const next   = exists
      ? innovaciones.map((i) => i.id === innovacion.id ? innovacion : i)
      : [innovacion, ...innovaciones];
    setInnovaciones(next); saveInnovaciones(next);

    // Notify newly-added owners
    if (exists) {
      const prev = innovaciones.find((i) => i.id === innovacion.id);
      const prevIds = new Set((prev?.owners ?? []).map((o) => o.id.toLowerCase()));
      innovacion.owners.forEach((o) => {
        if (o.id && !prevIds.has(o.id.toLowerCase()) && o.id.toLowerCase() !== user.id.toLowerCase()) {
          addNotification({
            userId: o.id.toLowerCase(),
            tipo: "OPPORTUNITY_ADDED",
            oportunidadId: innovacion.id,
            oportunidadNombre: innovacion.nombre,
            createdBy: user.name,
            readAt: null,
          });
        }
      });
    }
    setModal("none"); setSelectedId(null);
    showSuccess(exists ? "Innovación actualizada correctamente." : "Innovación registrada en el Portal de Innovación.");
  };

  const handleDelete = (id: string) => {
    const next = innovaciones.filter((i) => i.id !== id);
    setInnovaciones(next); saveInnovaciones(next);
    setModal("none"); setSelectedId(null);
    showSuccess("La innovación ha sido eliminada.");
  };

  const hasFilters   = !!(search || filterClasifs.length > 0 || filterEstado || filterCliente || filterMios);
  const clearFilters = () => { setSearch(""); setFilterClasifs([]); setFilterEstado(""); setFilterCliente(""); setFilterMios(false); setPage(1); };

  return (
    <Box>
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, mb: 2, flexWrap: "wrap" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <TextField size="small" placeholder="Buscar innovación..." value={search}
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
            sx={{ minWidth: 200, fontSize: "var(--text-sm)" }}
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
            sx={{ minWidth: 150 }} SelectProps={{ displayEmpty: true }}
          >
            <MenuItem value=""><span style={{ color: "var(--muted-foreground)" }}>Estado</span></MenuItem>
            {ESTADOS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </TextField>
          <TextField select size="small" value={filterCliente}
            onChange={(e) => { setFilterCliente(e.target.value); setPage(1); }}
            sx={{ minWidth: 150 }} SelectProps={{ displayEmpty: true }}
          >
            <MenuItem value=""><span style={{ color: "var(--muted-foreground)" }}>Cliente</span></MenuItem>
            {allClientes.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </TextField>
          <FormControlLabel
            control={<Checkbox checked={filterMios} size="small"
              onChange={(e) => { setFilterMios(e.target.checked); setPage(1); }}
              sx={{ color: "var(--border)", "&.Mui-checked": { color: "var(--primary)" } }} />}
            label={<Typography variant="caption">Mis innovaciones</Typography>}
            sx={{ ml: 0.5 }}
          />
          {hasFilters && (
            <Button variant="text" size="small" color="inherit" startIcon={<X size={12} />} onClick={clearFilters}
              sx={{ fontSize: "var(--text-xs)", color: "text.secondary" }}>
              Limpiar
            </Button>
          )}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {(user.role === "Editor" || user.role === "Admin") && (
            <Button variant="contained" size="small" startIcon={<Plus size={14} />} onClick={() => setModal("nuevo")}>
              Nueva innovación
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
              <TableCell>NOMBRE INNOVACIÓN</TableCell>
              <TableCell>CLASIFICACIÓN</TableCell>
              <TableCell>CLIENTE(S)</TableCell>
              <TableCell>ESTADO</TableCell>
              <TableCell sx={{ width: 110 }}>ACCIONES</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 5, color: "text.secondary" }}>
                  No se encontraron innovaciones
                </TableCell>
              </TableRow>
            ) : pageRows.map((i) => (
              <TableRow key={i.id} hover onClick={() => { setSelectedId(i.id); setModal("consultar"); }} sx={{ cursor: "pointer" }}>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>{i.nombre}</Typography>
                  <Typography variant="caption" color="text.secondary">v{i.version}</Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {i.clasificacion.slice(0, 2).map((c, idx) => (
                      <Box key={idx} sx={{ px: 1, py: 0.25, border: "1px solid var(--border)", borderRadius: "var(--radius-chip)", bgcolor: "var(--muted)" }}>
                        <Typography variant="caption" sx={{ fontSize: "var(--text-2xs)" }}>{c}</Typography>
                      </Box>
                    ))}
                    {i.clasificacion.length > 2 && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: "var(--text-2xs)", alignSelf: "center" }}>
                        +{i.clasificacion.length - 2}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {i.clientes.length > 0
                      ? i.clientes.slice(0, 2).join(", ") + (i.clientes.length > 2 ? ` +${i.clientes.length - 2}` : "")
                      : "—"}
                  </Typography>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <StatusChip status={i.estado} />
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    <Tooltip title="Consultar">
                      <IconButton size="small" onClick={() => { setSelectedId(i.id); setModal("consultar"); }}>
                        <Eye size={14} />
                      </IconButton>
                    </Tooltip>
                    {canDownload && (
                      <Tooltip title="Descargar todo">
                        <IconButton size="small" onClick={() => downloadZip(i)}>
                          <Download size={14} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {canDelete && (
                      <Tooltip title="Eliminar">
                        <IconButton size="small" color="error"
                          onClick={() => { if (window.confirm(`¿Eliminar "${i.nombre}"?`)) handleDelete(i.id); }}>
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
          Mostrando {pageRows.length} de {filtered.length} innovación{filtered.length !== 1 ? "es" : ""}
        </Typography>
        {totalPages > 1 && (
          <Pagination count={totalPages} page={safePage} onChange={(_, p) => setPage(p)} size="small" />
        )}
      </Box>

      {/* ─��� Modals ───────────────────────────────────────────────────────── */}
      {modal === "nuevo" && (
        <InnovacionFormModal innovacion={null} onClose={() => setModal("none")} onSave={handleSave} />
      )}
      {modal === "consultar" && selected && (
        <ConsultarInnovacionModal
          innovacion={selected}
          canEdit={canEditInnovacion(selected)}
          canDelete={canDelete}
          canDownload={canDownload}
          onClose={() => { setModal("none"); setSelectedId(null); }}
          onEdit={() => setModal("editar")}
          onDelete={() => handleDelete(selected.id)}
        />
      )}
      {modal === "editar" && selected && (
        <InnovacionFormModal
          innovacion={selected}
          onClose={() => setModal("consultar")}
          onSave={handleSave}
        />
      )}
    </Box>
  );
}
