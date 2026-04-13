// Route: /opportunities/new
// Wizard 3 pasos:
//   0 — Datos de la licitación (multi-tipología) + Lotes
//   1 — Documentación (solo Pliegos y anexos)
//   2 — Colaboradores (globales o por lote si hay >1 lote)
"use client";

import React, { useState, useEffect } from "react";
import { ArrowRight, Upload, X, User, Plus, FileText, Copy } from "lucide-react";
import { useNav }    from "../../../lib/routes/navigation";
import { useWizard } from "../../../lib/wizard/use-wizard";
import { getAuthUser }       from "../../_components/auth-store";
import { addNotification }   from "../../_components/notifications-store";
import { addOpportunity, getOpportunities } from "../../_components/opportunities-store";
import { storeFiles, WIZARD_TEMP_KEY } from "../../../services/pliegoFileStore";

import Box               from "@mui/material/Box";
import Typography        from "@mui/material/Typography";
import Button            from "@mui/material/Button";
import TextField         from "@mui/material/TextField";
import MenuItem          from "@mui/material/MenuItem";
import InputAdornment    from "@mui/material/InputAdornment";
import Stepper           from "@mui/material/Stepper";
import Step              from "@mui/material/Step";
import StepLabel         from "@mui/material/StepLabel";
import Paper             from "@mui/material/Paper";
import Alert             from "@mui/material/Alert";
import Avatar            from "@mui/material/Avatar";
import Divider           from "@mui/material/Divider";
import Checkbox          from "@mui/material/Checkbox";
import ListItemText      from "@mui/material/ListItemText";
import FormControl       from "@mui/material/FormControl";
import InputLabel        from "@mui/material/InputLabel";
import OutlinedInput     from "@mui/material/OutlinedInput";
import Select            from "@mui/material/Select";
import Chip              from "@mui/material/Chip";
import Dialog            from "@mui/material/Dialog";
import DialogTitle       from "@mui/material/DialogTitle";
import DialogContent     from "@mui/material/DialogContent";
import DialogActions     from "@mui/material/DialogActions";
import ArrowLeftIcon     from "@mui/icons-material/ArrowLeft";
import SearchIcon        from "@mui/icons-material/Search";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Datos {
  nombre:      string;
  codigo:      string;
  cliente:     string;
  anno:        string;
  duracion:    string;
  presupuesto: string;
}

type TieneLottes = "si" | "no" | "";
type Colaborador  = { id: string; name: string; role: string };

interface FinishColabsData {
  globalColabs: Colaborador[];
  colasByLote:  Record<string, Colaborador[]>;
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const STEPS = ["Licitación", "Documentación", "Colaboradores"];

const TIPOLOGIAS = [
  "System Integration (SI)", "Mantenimiento evolutivo", "Mantenimiento correctivo",
  "AMS (Application Management Services)", "Soporte / Helpdesk", "PMO",
  "Consulting / Advisory", "Desarrollo a medida", "Servicios Cloud",
  "Ciberseguridad", "Data & AI", "Automatización / RPA", "Otros",
];

const COLABORADORES_MOCK: Colaborador[] = [
  { id: "E12345", name: "Carlos Ruiz",    role: "Senior Manager"  },
  { id: "E23456", name: "Ana Martínez",   role: "Consultant"      },
  { id: "E34567", name: "David Sánchez",  role: "Architect"       },
  { id: "E45678", name: "Laura Gómez",    role: "Senior Analyst"  },
];

const DATOS_VACIOS: Datos = {
  nombre: "", codigo: "", cliente: "", anno: "", duracion: "", presupuesto: "",
};

// ─── Sub-header ──────────────────────────────────────────────────────────────

function SubHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <Box sx={{
      bgcolor: "background.paper", borderBottom: "1px solid var(--border)",
      display: "flex", alignItems: "center", gap: 2,
      px: "var(--page-px)", height: "var(--subheader-height)", flexShrink: 0,
    }}>
      <Button variant="text" color="inherit" size="small"
        startIcon={<ArrowLeftIcon />} onClick={onBack}
        sx={{ color: "text.secondary" }}>
        Volver
      </Button>
      <Divider orientation="vertical" flexItem sx={{ my: 1 }} />
      <Typography variant="body2" fontWeight={600}>{title}</Typography>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 0 — Datos + Tipología multi-select + Lotes
// ═══════════════════════════════════════════════════════════════════════════════

interface Step0Props {
  datos:             Datos;
  setDato:           (k: keyof Datos, v: string) => void;
  tipologias:        string[];
  setTipologias:     (v: string[]) => void;
  tipologiaOtros:    string;
  setTipologiaOtros: (v: string) => void;
  tieneLottes:       TieneLottes;
  setTieneLottes:    (v: TieneLottes) => void;
  lotes:             string[];
  setLotes:          (v: string[]) => void;
  onNext:            () => void;
}

function Step0({
  datos, setDato,
  tipologias, setTipologias, tipologiaOtros, setTipologiaOtros,
  tieneLottes, setTieneLottes, lotes, setLotes,
  onNext,
}: Step0Props) {
  const [alerta, setAlerta]       = useState<string | null>(null);
  const [nuevoLote, setNuevoLote] = useState("");
  const [loteError, setLoteError] = useState<string | null>(null);

  const handleNext = () => {
    const tipOk = tipologias.length > 0 &&
      (!tipologias.includes("Otros") || tipologiaOtros.trim() !== "");
    if (!datos.nombre.trim() || !datos.cliente.trim() || !tipOk) {
      setAlerta("Completa los campos obligatorios (marcados con *) para continuar.");
      setTimeout(() => setAlerta(null), 5000);
      return;
    }
    onNext();
  };

  const handleTipChange = (event: { target: { value: unknown } }) => {
    const val = event.target.value as string[];
    setTipologias(val);
    if (!val.includes("Otros")) setTipologiaOtros("");
  };

  const addLote = () => {
    const t = nuevoLote.trim();
    if (!t) return;
    if (lotes.includes(t)) { setLoteError("Este identificador ya existe."); return; }
    setLotes([...lotes, t]);
    setNuevoLote("");
    setLoteError(null);
  };

  return (
    <Box>
      {/* ══ DATOS DE LA LICITACIÓN ════════════════════════════════════════════ */}
      <Box sx={{ mb: "var(--space-3)" }}>
        <Typography variant="h6" fontWeight={600} sx={{ mb: "var(--space-1)" }}>
          Datos de la licitación
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Rellena los datos del expediente de licitación.
        </Typography>
      </Box>

      {alerta && <Alert severity="error" sx={{ mb: "var(--space-4)" }}>{alerta}</Alert>}

      <Paper variant="outlined" sx={{ p: "var(--space-8)", borderRadius: "var(--radius)", mb: "var(--section-gap)" }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-5)" }}>

          {/* Nombre */}
          <Box sx={{ gridColumn: "1 / -1" }}>
            <TextField fullWidth size="small" required
              label="Nombre de la oportunidad"
              placeholder="Ej. Transformación Digital AEAT 2025"
              value={datos.nombre}
              onChange={e => setDato("nombre", e.target.value)}
            />
          </Box>

          {/* Código */}
          <TextField fullWidth size="small"
            label="Código de expediente"
            placeholder="Ej. EXP-2025-0124"
            value={datos.codigo}
            onChange={e => setDato("codigo", e.target.value)}
          />

          {/* Cliente */}
          <TextField fullWidth size="small" required
            label="Cliente"
            placeholder="Ej. Agencia Estatal de Administración Tributaria"
            value={datos.cliente}
            onChange={e => setDato("cliente", e.target.value)}
          />

          {/* Año */}
          <TextField fullWidth size="small"
            label="Año"
            placeholder="Ej. 2025"
            value={datos.anno}
            onChange={e => setDato("anno", e.target.value)}
            slotProps={{ htmlInput: { maxLength: 4 } }}
          />

          {/* Duración */}
          <TextField fullWidth size="small"
            label="Duración del contrato"
            placeholder="Ej. 24 meses"
            value={datos.duracion}
            onChange={e => setDato("duracion", e.target.value)}
          />

          {/* Presupuesto */}
          <Box sx={{ gridColumn: "1 / -1" }}>
            <TextField fullWidth size="small"
              label="Presupuesto base de licitación (sin IVA)"
              placeholder="Ej. 4.250.000"
              value={datos.presupuesto}
              onChange={e => setDato("presupuesto", e.target.value)}
              slotProps={{ input: { startAdornment: <InputAdornment position="start">€</InputAdornment> } }}
            />
          </Box>

          {/* ── Tipología — multi-select con checkboxes ── */}
          <Box sx={{ gridColumn: "1 / -1" }}>
            <FormControl fullWidth size="small" required>
              <InputLabel id="tipologia-label">Tipología de contrato *</InputLabel>
              <Select
                labelId="tipologia-label"
                multiple
                value={tipologias}
                onChange={handleTipChange}
                input={<OutlinedInput label="Tipología de contrato *" />}
                renderValue={(selected) => {
                  const s = selected as string[];
                  if (s.length === 0) return "";
                  if (s.length === 1) return s[0];
                  return `${s[0]}  +${s.length - 1} más`;
                }}
                MenuProps={{ PaperProps: { style: { maxHeight: 300 } } }}
              >
                {TIPOLOGIAS.map(t => (
                  <MenuItem key={t} value={t} dense>
                    <Checkbox checked={tipologias.includes(t)} size="small" sx={{ py: 0 }} />
                    <ListItemText
                      primary={t}
                      slotProps={{ primary: { style: { fontSize: "var(--text-sm)" } } }}
                    />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Chips de tipologías seleccionadas — debajo del select para evitar overflow */}
            {tipologias.length > 0 && (
              <Box sx={{ mt: "var(--space-2)", display: "flex", flexWrap: "wrap", gap: "var(--space-1)" }}>
                {tipologias.map(v => (
                  <Chip
                    key={v}
                    label={v}
                    size="small"
                    onDelete={() => setTipologias(tipologias.filter(t => t !== v))}
                    sx={{
                      height: 22,
                      bgcolor: "var(--primary-subtle)",
                      color: "var(--primary)",
                      border: "1px solid var(--primary)",
                      borderRadius: "var(--radius-chip)",
                      "& .MuiChip-label": { px: "10px", fontSize: "var(--text-3xs)", fontWeight: 600 },
                      "& .MuiChip-deleteIcon": { color: "var(--primary)", fontSize: 13, opacity: 0.7, "&:hover": { opacity: 1, color: "var(--primary)" } },
                    }}
                  />
                ))}
              </Box>
            )}

            {/* Campo libre para "Otros" */}
            {tipologias.includes("Otros") && (
              <TextField fullWidth size="small" required sx={{ mt: "var(--space-3)" }}
                label="Especifica la tipología"
                placeholder="Describe la tipología de contrato..."
                value={tipologiaOtros}
                onChange={e => setTipologiaOtros(e.target.value)}
              />
            )}
          </Box>
        </Box>
      </Paper>

      {/* ══ LOTES ══════════════════════════════════════════════════════════════ */}
      <Box sx={{ display: "flex", alignItems: "center", gap: "var(--space-3)", mb: "var(--space-1)" }}>
        <Typography variant="h6" fontWeight={600}>Lotes</Typography>
        {lotes.length > 1 && (
          <Box sx={{
            px: "var(--space-3)", py: "2px",
            bgcolor: "var(--accent-subtle)", border: "1px solid var(--accent)",
            borderRadius: "var(--radius-chip)", flexShrink: 0,
          }}>
            <Typography variant="caption" sx={{ color: "var(--accent)", fontWeight: 600 }}>
              Se crearán {lotes.length} oportunidades
            </Typography>
          </Box>
        )}
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: "var(--space-4)" }}>
        Indica si la licitación está dividida en lotes.
      </Typography>

      <Paper variant="outlined" sx={{ p: "var(--space-8)", borderRadius: "var(--radius)" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: "var(--space-4)", mb: tieneLottes === "si" ? "var(--space-6)" : 0 }}>
          <Typography variant="body2" fontWeight={600} sx={{ minWidth: 220 }}>
            ¿La licitación tiene lotes?
          </Typography>
          {/* Toggle Sí/No — dos Button contenidos/outlined en lugar de ToggleButtonGroup */}
          <Box sx={{ display: "flex", gap: "var(--space-2)" }}>
            {(["si", "no"] as const).map(v => (
              <Button
                key={v}
                size="small"
                variant={tieneLottes === v ? "contained" : "outlined"}
                color="primary"
                onClick={() => { setTieneLottes(v); if (v === "no") setLotes([]); }}
                sx={{ minWidth: 64, fontWeight: 600 }}
              >
                {v === "si" ? "Sí" : "No"}
              </Button>
            ))}
          </Box>
        </Box>

        {tieneLottes === "si" && (
          <Box>
            <Divider sx={{ mb: "var(--space-5)" }} />
            <Typography variant="body2" fontWeight={600} sx={{ mb: "var(--space-3)" }}>
              Identificadores de lote
            </Typography>
            <Box sx={{ display: "flex", gap: "var(--space-3)", mb: "var(--space-4)" }}>
              <TextField size="small" sx={{ flex: 1 }}
                label="Identificador del lote"
                placeholder="Ej. Lote 1, Lote A, Módulo Técnico..."
                value={nuevoLote}
                onChange={e => { setNuevoLote(e.target.value); setLoteError(null); }}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addLote(); } }}
                error={!!loteError} helperText={loteError ?? undefined}
              />
              <Button variant="outlined" size="small"
                startIcon={<Plus size={14} />} onClick={addLote}
                disabled={!nuevoLote.trim()}
                sx={{ flexShrink: 0, alignSelf: "flex-start" }}>
                Añadir
              </Button>
            </Box>

            {lotes.length === 0 ? (
              <Box sx={{ textAlign: "center", py: "var(--space-6)", bgcolor: "var(--muted)", border: "1px solid var(--border)", borderRadius: "var(--radius-input)" }}>
                <Typography variant="caption" color="text.secondary">Sin lotes añadidos aún.</Typography>
              </Box>
            ) : (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
                {lotes.map((lote, i) => (
                  <Box key={i} sx={{ display: "flex", alignItems: "center", gap: "var(--space-2)", pl: "var(--space-3)", pr: "var(--space-2)", py: "var(--space-1)", bgcolor: "background.paper", border: "1px solid var(--border)", borderRadius: "var(--radius-input)" }}>
                    <Typography variant="caption" fontWeight={600}>{lote}</Typography>
                    <Button size="small" variant="text" color="inherit"
                      onClick={() => setLotes(lotes.filter((_, j) => j !== i))}
                      sx={{ minWidth: 0, p: "2px", color: "text.secondary" }}>
                      <X size={12} />
                    </Button>
                  </Box>
                ))}
              </Box>
            )}

            {lotes.length > 1 && (
              <Box sx={{ mt: "var(--space-4)", p: "var(--banner-py) var(--banner-px)", bgcolor: "var(--accent-subtle)", border: "1px solid var(--accent)", borderRadius: "var(--radius-banner)" }}>
                <Typography variant="caption" sx={{ color: "var(--accent)" }}>
                  Se crearán <strong>{lotes.length} oportunidades</strong> independientes con el nombre <strong>"{datos.nombre || "Nombre base"} — [Lote]"</strong>, compartiendo los mismos metadatos y pliegos.
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Paper>

      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: "var(--space-8)" }}>
        <Button variant="contained" endIcon={<ArrowRight size={16} />} onClick={handleNext}>
          Continuar a documentación
        </Button>
      </Box>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 1 — Documentación (solo Pliegos y anexos)
// ═══════════════════════════════════════════════════════════════════════════════

function Step1({ pliegos, setPliegos, onBack, onNext }: {
  pliegos: File[]; setPliegos: (v: File[]) => void;
  onBack: () => void; onNext: () => void;
}) {
  const [dragP, setDragP]   = useState(false);
  const [alerta, setAlerta] = useState<string | null>(null);

  const handleNext = () => {
    if (pliegos.length === 0) {
      setAlerta("Sube al menos un pliego o documento del expediente para continuar.");
      setTimeout(() => setAlerta(null), 5000);
      return;
    }
    // Persist File objects so the workspace can pre-load them for analysis
    storeFiles(WIZARD_TEMP_KEY, pliegos);
    onNext();
  };

  const merge = (current: File[], incoming: File[]) => {
    const existing = new Set(current.map(f => f.name));
    return [...current, ...incoming.filter(f => !existing.has(f.name))];
  };

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} sx={{ mb: "var(--space-1)" }}>Documentación</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: "var(--space-6)" }}>
        Sube los pliegos y anexos del expediente. Se vincularán a todas las oportunidades creadas y estarán disponibles para análisis IA en el workspace.
      </Typography>

      {alerta && <Alert severity="error" sx={{ mb: "var(--space-4)" }}>{alerta}</Alert>}

      <Paper variant="outlined" sx={{ p: "var(--space-8)", borderRadius: "var(--radius)" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: "var(--space-3)", mb: "var(--space-5)" }}>
          <Box sx={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "var(--primary-subtle)", borderRadius: "var(--radius)" }}>
            <FileText size={15} style={{ color: "var(--primary)" }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" fontWeight={600}>Pliegos y anexos</Typography>
            <Typography variant="caption" color="text.secondary">
              PCAP, PPT, Anexos — documentación obligatoria del expediente
            </Typography>
          </Box>
          {pliegos.length > 0 && (
            <Box sx={{ display: "inline-flex", alignItems: "center", gap: "var(--space-1)", px: "var(--space-3)", py: "var(--space-1)", bgcolor: "var(--success-subtle)", border: "1px solid var(--success)", borderRadius: "var(--radius-chip)" }}>
              <Typography variant="caption" sx={{ color: "var(--success)", fontWeight: 600 }}>
                {pliegos.length} archivo{pliegos.length > 1 ? "s" : ""}
              </Typography>
            </Box>
          )}
        </Box>
        <DropZone
          files={pliegos} drag={dragP} setDrag={setDragP}
          onAdd={files => setPliegos(merge(pliegos, files))}
          onRemove={i => setPliegos(pliegos.filter((_, j) => j !== i))}
          label="Arrastra los pliegos y anexos aquí"
        />
      </Paper>

      <Box sx={{ display: "flex", justifyContent: "space-between", mt: "var(--space-8)" }}>
        <Button variant="outlined" color="inherit" onClick={onBack}>← Volver</Button>
        <Button variant="contained" endIcon={<ArrowRight size={16} />} onClick={handleNext}>
          Continuar a colaboradores
        </Button>
      </Box>
    </Box>
  );
}

// ─── DropZone ─────────────────────────────────────────────────────────────────

function DropZone({ files, drag, setDrag, onAdd, onRemove, label }: {
  files: File[]; drag: boolean; setDrag: (v: boolean) => void;
  onAdd: (f: File[]) => void; onRemove: (i: number) => void; label: string;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files || []);
    if (incoming.length > 0) onAdd(incoming);
    e.target.value = "";
  };

  return (
    <>
      <Box
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => {
          e.preventDefault(); setDrag(false);
          const incoming = Array.from(e.dataTransfer.files);
          if (incoming.length > 0) onAdd(incoming);
        }}
        sx={{
          border: "2px dashed", borderColor: drag ? "primary.main" : "var(--border)",
          borderRadius: "var(--radius-banner)",
          p: "var(--space-10) var(--space-6)",
          bgcolor: drag ? "var(--primary-subtle)" : "var(--muted)",
          display: "flex", flexDirection: "column", alignItems: "center",
          transition: "all 0.15s",
        }}
      >
        <Paper variant="outlined" sx={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", mb: "var(--space-3)", borderRadius: "var(--radius)" }}>
          <Upload size={18} style={{ color: "var(--muted-foreground)" }} />
        </Paper>
        <Typography variant="body2" fontWeight={600} gutterBottom>{label}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center", mb: "var(--space-3)" }}>
          Arrastra aquí o haz clic en el botón. PDF, DOCX, XLSX, ZIP.
        </Typography>
        {/* v4 — input nativo directo */}
        <input
          type="file"
          multiple
          accept=".pdf,.docx,.xlsx,.zip"
          onChange={handleChange}
          title="Seleccionar archivos del pliego"
          style={{
            display: "block",
            padding: "8px 12px",
            border: "2px solid #6b21a8",
            borderRadius: "6px",
            background: "#f3e8ff",
            color: "#3b0764",
            fontSize: "14px",
            fontFamily: "inherit",
            cursor: "pointer",
            width: "100%",
            maxWidth: "320px",
            marginTop: "4px",
          }}
        />
      </Box>

      {files.length > 0 && (
        <Box sx={{ mt: "var(--space-4)" }}>
          <Typography variant="caption" fontWeight={600} sx={{ display: "block", mb: "var(--space-2)" }}>
            Archivos cargados ({files.length})
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {files.map((f, i) => (
              <Box key={i} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", bgcolor: "background.paper", border: "1px solid var(--border)", borderRadius: "var(--radius-input)", px: "var(--space-4)", py: "var(--space-2)" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: "var(--space-3)", minWidth: 0 }}>
                  <FileText size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                  <Typography variant="caption" noWrap>{f.name}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                    ({(f.size / 1024).toFixed(0)} KB)
                  </Typography>
                </Box>
                <Button variant="text" size="small" color="inherit" onClick={() => onRemove(i)} sx={{ minWidth: 0, p: "var(--space-1)", color: "text.secondary", flexShrink: 0 }}>
                  <X size={13} />
                </Button>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 2 — Colaboradores (globales o por lote)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Subsección de colaboradores para un lote (o para global) ────────────────

function ColabSection({
  colabs, onUpdateColabs,
  showCopyAll, onCopyToAll,
}: {
  colabs:         Colaborador[];
  onUpdateColabs: (c: Colaborador[]) => void;
  showCopyAll:    boolean;
  onCopyToAll?:   () => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = COLABORADORES_MOCK.filter(
    c =>
      (c.id.toLowerCase().includes(query.toLowerCase()) ||
       c.name.toLowerCase().includes(query.toLowerCase()))
  );

  const isAdded = (id: string) => colabs.some(a => a.id === id);

  const addColab = (c: Colaborador) => {
    if (!isAdded(c.id)) onUpdateColabs([...colabs, c]);
  };

  const removeColab = (id: string) => {
    onUpdateColabs(colabs.filter(a => a.id !== id));
  };

  return (
    <Box>
      {/* Search */}
      <TextField fullWidth size="small"
        label="Buscar por ID Accenture o nombre"
        placeholder="Ej. E12345 o nombre del colaborador"
        value={query} onChange={e => setQuery(e.target.value)}
        sx={{ mb: query ? "var(--space-2)" : "var(--space-4)" }}
        slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: "text.secondary" }} /></InputAdornment> } }}
      />

      {/* Results dropdown */}
      {query && (
        <Paper variant="outlined" sx={{ mb: "var(--space-4)", borderRadius: "var(--radius-banner)", overflow: "hidden" }}>
          {filtered.length === 0 ? (
            <Box sx={{ px: "var(--space-4)", py: "var(--space-3)" }}>
              <Typography variant="caption" color="text.secondary">Sin resultados.</Typography>
            </Box>
          ) : filtered.map(c => (
            <Box key={c.id} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: "var(--space-4)", py: "var(--space-3)", borderBottom: "1px solid var(--border)", "&:last-child": { borderBottom: "none" }, "&:hover": { bgcolor: "action.hover" } }}>
              <ColabFila name={c.name} id={c.id} role={c.role} />
              <Button variant="outlined" size="small"
                disabled={isAdded(c.id)}
                onClick={() => addColab(c)}>
                {isAdded(c.id) ? "Añadido" : "Añadir"}
              </Button>
            </Box>
          ))}
        </Paper>
      )}

      {/* Assigned list header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: "var(--space-2)" }}>
        <Typography variant="caption" fontWeight={600}>
          Equipo asignado ({colabs.length})
        </Typography>
        {showCopyAll && colabs.length > 0 && (
          <Button
            size="small" variant="text" color="primary"
            startIcon={<Copy size={12} />}
            onClick={onCopyToAll}
            sx={{ fontSize: "var(--text-2xs)" }}
          >
            Mismos colaboradores en todos los lotes
          </Button>
        )}
      </Box>

      {/* Assigned collaborators */}
      {colabs.length === 0 ? (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", bgcolor: "var(--muted)", border: "1px solid var(--border)", borderRadius: "var(--radius)", py: "var(--space-6)", gap: "var(--space-2)" }}>
          <User size={20} style={{ color: "var(--muted-foreground)" }} />
          <Typography variant="caption" color="text.secondary">Sin colaboradores asignados</Typography>
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {colabs.map(c => (
            <Box key={c.id} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", bgcolor: "var(--muted)", border: "1px solid var(--border)", borderRadius: "var(--radius-banner)", px: "var(--space-4)", py: "var(--space-3)" }}>
              <ColabFila name={c.name} id={c.id} role={c.role} filled />
              <Button variant="text" size="small" color="inherit"
                onClick={() => removeColab(c.id)}
                sx={{ minWidth: 0, color: "text.secondary" }}>
                <X size={14} />
              </Button>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

// ─── Step2 ────────────────────────────────────────────────────────────────────

function Step2({ tieneLottes, lotes, onBack, onFinish }: {
  tieneLottes: TieneLottes;
  lotes:       string[];
  onBack:      () => void;
  onFinish:    (data: FinishColabsData) => void;
}) {
  const isPerLote = tieneLottes === "si" && lotes.length > 0;

  // Global collaborators (when no lots)
  const [globalColabs, setGlobalColabs] = useState<Colaborador[]>([]);

  // Per-lot collaborators (when lots exist)
  const [colasByLote, setColasByLote] = useState<Record<string, Colaborador[]>>(
    () => Object.fromEntries(lotes.map(l => [l, []]))
  );

  // Copy-to-all confirmation dialog
  const [copyFrom, setCopyFrom] = useState<string | null>(null);

  const updateLote = (lote: string, colabs: Colaborador[]) => {
    setColasByLote(prev => ({ ...prev, [lote]: colabs }));
  };

  const handleCopyToAll = (fromLote: string) => {
    setCopyFrom(fromLote);
  };

  const confirmCopyToAll = () => {
    if (!copyFrom) return;
    const source = colasByLote[copyFrom] ?? [];
    const updated = Object.fromEntries(lotes.map(l => [l, [...source]]));
    setColasByLote(updated);
    setCopyFrom(null);
  };

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} sx={{ mb: "var(--space-1)" }}>Colaboradores</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: "var(--space-6)" }}>
        {isPerLote
          ? "Asigna colaboradores por lote. Recibirán una notificación al crear la oportunidad."
          : "Añade los miembros del equipo. Recibirán una notificación al ser añadidos."}
      </Typography>

      {isPerLote ? (
        /* ── Per-lot mode ── */
        <Box sx={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          {lotes.map(lote => (
            <Paper key={lote} variant="outlined" sx={{ borderRadius: "var(--radius)", overflow: "hidden" }}>
              {/* Lot header */}
              <Box sx={{ px: "var(--space-5)", py: "var(--space-3)", bgcolor: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                <Typography variant="body2" fontWeight={600}>{lote}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Colaboradores de este lote
                </Typography>
              </Box>
              <Box sx={{ p: "var(--space-5)" }}>
                <ColabSection
                  colabs={colasByLote[lote] ?? []}
                  onUpdateColabs={c => updateLote(lote, c)}
                  showCopyAll={lotes.length > 1}
                  onCopyToAll={() => handleCopyToAll(lote)}
                />
              </Box>
            </Paper>
          ))}
        </Box>
      ) : (
        /* ── Global mode ── */
        <Paper variant="outlined" sx={{ p: "var(--space-8)", borderRadius: "var(--radius)" }}>
          <ColabSection
            colabs={globalColabs}
            onUpdateColabs={setGlobalColabs}
            showCopyAll={false}
          />
        </Paper>
      )}

      <Box sx={{ display: "flex", justifyContent: "space-between", mt: "var(--space-8)" }}>
        <Button variant="outlined" color="inherit" onClick={onBack}>← Volver</Button>
        <Button variant="contained" endIcon={<ArrowRight size={16} />}
          onClick={() => onFinish({ globalColabs, colasByLote })}>
          Crear oportunidad
        </Button>
      </Box>

      {/* Confirmación "copiar a todos los lotes" */}
      <Dialog open={!!copyFrom} onClose={() => setCopyFrom(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Copiar colaboradores a todos los lotes</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
            Los colaboradores de <strong>{copyFrom}</strong> se copiarán a los demás lotes,
            reemplazando las asignaciones existentes.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" color="inherit" onClick={() => setCopyFrom(null)}>Cancelar</Button>
          <Button variant="contained" onClick={confirmCopyToAll}>Confirmar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function ColabFila({ name, id, role, filled = false }: { name: string; id: string; role: string; filled?: boolean }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
      <Avatar sx={{ width: 30, height: 30, bgcolor: filled ? "primary.main" : "var(--muted)", color: filled ? "primary.contrastText" : "text.secondary", border: filled ? "none" : "1px solid var(--border)", fontSize: 13 }}>
        <User size={14} />
      </Avatar>
      <Box>
        <Typography variant="body2" fontWeight={600}>{name}</Typography>
        <Typography variant="caption" color="text.secondary">{id} · {role}</Typography>
      </Box>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE — estado compartido + lógica de creación multi-lote
// ═══════════════════════════════════════════════════════════════════════════════

export default function AppNuevaOportunidadPage() {
  const nav    = useNav();
  const wizard = useWizard({ flow: "nueva-oportunidad", totalSteps: 3, initialData: {} });

  const [datos,          setDatosState]      = useState<Datos>(DATOS_VACIOS);
  const [tipologias,     setTipologias]      = useState<string[]>([]);
  const [tipologiaOtros, setTipologiaOtros]  = useState("");
  const [tieneLottes,    setTieneLottes]     = useState<TieneLottes>("");
  const [lotes,          setLotes]           = useState<string[]>([]);
  const [pliegos,        setPliegos]         = useState<File[]>([]);

  // ── Flag: coming from prequalification ─────────────────────────────────────
  const [fromPrequal, setFromPrequal]        = useState(false);

  const setDato = (k: keyof Datos, v: string) =>
    setDatosState(p => ({ ...p, [k]: v }));

  // ── Read prefill from sessionStorage on mount ──────────────────────────────
  useEffect(() => {
    const raw = sessionStorage.getItem("opp-prefill");
    if (!raw) return;
    try {
      const prefill = JSON.parse(raw) as {
        from:        string;
        nombre?:     string;
        codigo?:     string;
        cliente?:    string;
        anno?:       string;
        duracion?:   string;
        presupuesto?: string;
        tipologia?:  string;
        tieneLottes?: string;
        lotes?:      string[];
        fileNames?:  string[];
      };

      if (prefill.from !== "prequalification") return;
      setFromPrequal(true);

      // ── Datos básicos ──────────────────────────────────────────────────────
      setDatosState({
        nombre:      prefill.nombre      ?? "",
        codigo:      prefill.codigo      ?? "",
        cliente:     prefill.cliente     ?? "",
        anno:        prefill.anno        ?? "",
        duracion:    prefill.duracion    ?? "",
        presupuesto: prefill.presupuesto ?? "",
      });

      // ── Tipología: match raw CSV against known TIPOLOGIAS ──────────────────
      if (prefill.tipologia) {
        const parts    = prefill.tipologia.split(",").map(s => s.trim()).filter(Boolean);
        const matched  = parts.filter(p => TIPOLOGIAS.includes(p));
        const unmatched = parts.filter(p => !TIPOLOGIAS.includes(p));
        const tipArray = [...matched];
        if (unmatched.length > 0) {
          tipArray.push("Otros");
          setTipologiaOtros(unmatched.join(", "));
        }
        setTipologias(tipArray);
      }

      // ── Lotes ──────────────────────────────────────────────────────────────
      if (prefill.tieneLottes === "si" || prefill.tieneLottes === "no") {
        setTieneLottes(prefill.tieneLottes as TieneLottes);
      }
      if (Array.isArray(prefill.lotes) && prefill.lotes.length > 0) {
        setLotes(prefill.lotes);
      }

      // ── Documentación: los nombres de fichero del prefill son strings, NO File objects.
      // No asignar al estado File[] — el usuario debe subir los ficheros reales.
    } catch {
      // ignore malformed prefill
    } finally {
      // Siempre limpiar el prefill de sessionStorage para evitar contaminación en recargas
      sessionStorage.removeItem("opp-prefill");
    }
  }, []);

  // ── Crear oportunidad(es) ──────────────────────────────────────────────────
  const handleCrearOportunidad = ({ globalColabs, colasByLote }: FinishColabsData) => {
    const currentUser = getAuthUser();
    const year        = new Date().getFullYear();
    const startCount  = getOpportunities().length + 1;

    // Tipología final: array limpio
    const tipologiaFinal = [
      ...tipologias.filter(t => t !== "Otros"),
      ...(tipologias.includes("Otros") && tipologiaOtros.trim()
        ? [`Otros: ${tipologiaOtros.trim()}`]
        : []),
    ];

    // Names only for the opportunity store (serializable)
    const pliegoNames = pliegos.map(f => f.name);

    const isMultiLote = tieneLottes === "si" && lotes.length > 0;

    if (isMultiLote) {
      // Crear N oportunidades (una por lote)
      lotes.forEach((lote, i) => {
        const id      = `OPP-${year}-${String(startCount + i).padStart(3, "0")}`;
        const nombre  = `${datos.nombre} — ${lote}`;
        const colabs  = colasByLote[lote] ?? globalColabs;

        // Store actual File objects indexed by oppId for workspace analysis
        if (pliegos.length > 0) storeFiles(id, pliegos);

        addOpportunity({
          id, nombre,
          codigo:      datos.codigo,
          cliente:     datos.cliente,
          anno:        datos.anno,
          duracion:    datos.duracion,
          presupuesto: datos.presupuesto,
          tipologia:   tipologiaFinal.join(", "),
          tieneLottes,
          lotes,
          pliegos:     pliegoNames,
          colaboradores: colabs,
          ownerId:     currentUser.id,
          ownerName:   currentUser.name,
          createdAt:   new Date().toISOString(),
          estado:      "En curso",
        });

        colabs.forEach(c =>
          addNotification({
            userId:            c.id,
            tipo:              "OPPORTUNITY_ADDED",
            oportunidadId:     id,
            oportunidadNombre: nombre,
            readAt:            null,
            createdBy:         currentUser.name,
          })
        );
      });

      wizard.complete();
      // Flash para seleccionar-oportunidad
      sessionStorage.setItem("opp-created-flash", JSON.stringify({ count: lotes.length }));
      // Ir al listado para ver todas las oportunidades creadas
      nav.prospects.select();

    } else {
      // Crear una única oportunidad
      const id     = `OPP-${year}-${String(startCount).padStart(3, "0")}`;
      const nombre = datos.nombre;

      // Store actual File objects indexed by oppId
      if (pliegos.length > 0) storeFiles(id, pliegos);

      addOpportunity({
        id, nombre,
        codigo:      datos.codigo,
        cliente:     datos.cliente,
        anno:        datos.anno,
        duracion:    datos.duracion,
        presupuesto: datos.presupuesto,
        tipologia:   tipologiaFinal.join(", "),
        tieneLottes,
        lotes,
        pliegos:     pliegoNames,
        colaboradores: globalColabs,
        ownerId:     currentUser.id,
        ownerName:   currentUser.name,
        createdAt:   new Date().toISOString(),
        estado:      "En curso",
      });

      globalColabs.forEach(c =>
        addNotification({
          userId:            c.id,
          tipo:              "OPPORTUNITY_ADDED",
          oportunidadId:     id,
          oportunidadNombre: nombre,
          readAt:            null,
          createdBy:         currentUser.name,
        })
      );

      wizard.complete();
      nav.workspace.to(id);
    }
  };

  return (
    <Box sx={{ minHeight: "calc(100vh - var(--header-height))", bgcolor: "background.default" }}>

      <SubHeader title="Nueva Oportunidad" onBack={() => { wizard.cancel(); nav.home(); }} />

      {/* Stepper */}
      <Box sx={{ bgcolor: "background.paper", borderBottom: "1px solid var(--border)", px: "var(--page-px)", py: "var(--space-5)" }}>
        <Stepper activeStep={wizard.step} sx={{ maxWidth: 600 }}>
          {STEPS.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
        </Stepper>
      </Box>

      {/* Contenido */}
      <Box sx={{ px: "var(--page-px)", py: "var(--page-py)", maxWidth: 800 }}>

        {/* Banner: cualificación previa vinculada */}
        {fromPrequal && wizard.step === 0 && (
          <Alert
            severity="info"
            icon={false}
            sx={{
              mb: "var(--space-5)",
              borderRadius: "var(--radius-banner)",
              bgcolor: "var(--primary-subtle)",
              border: "1px solid var(--primary)",
              color: "var(--primary)",
              "& .MuiAlert-message": { width: "100%" },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" fontWeight={600} sx={{ color: "var(--primary)" }}>
                Datos precargados desde cualificación previa (GO / NO GO)
              </Typography>
              <Typography variant="caption" sx={{ color: "var(--primary)", opacity: 0.8, ml: 0.5 }}>
                — Revisa y completa los campos antes de continuar.
              </Typography>
            </Box>
          </Alert>
        )}
        {fromPrequal && wizard.step === 1 && (
          <Alert
            severity="info"
            icon={false}
            sx={{
              mb: "var(--space-5)",
              borderRadius: "var(--radius-banner)",
              bgcolor: "var(--primary-subtle)",
              border: "1px solid var(--primary)",
              "& .MuiAlert-message": { width: "100%" },
            }}
          >
            <Typography variant="body2" fontWeight={600} sx={{ color: "var(--primary)" }}>
              Documentación recuperada de la cualificación previa
            </Typography>
            <Typography variant="caption" sx={{ color: "var(--primary)", opacity: 0.8 }}>
              Puedes añadir más archivos o eliminar los que no sean necesarios.
            </Typography>
          </Alert>
        )}

        {wizard.step === 0 && (
          <Step0
            datos={datos}                  setDato={setDato}
            tipologias={tipologias}        setTipologias={setTipologias}
            tipologiaOtros={tipologiaOtros} setTipologiaOtros={setTipologiaOtros}
            tieneLottes={tieneLottes}      setTieneLottes={setTieneLottes}
            lotes={lotes}                  setLotes={setLotes}
            onNext={() => wizard.next()}
          />
        )}

        {wizard.step === 1 && (
          <Step1
            pliegos={pliegos}  setPliegos={setPliegos}
            onBack={() => wizard.back()}
            onNext={() => wizard.next()}
          />
        )}

        {wizard.step === 2 && (
          <Step2
            tieneLottes={tieneLottes}
            lotes={lotes}
            onBack={() => wizard.back()}
            onFinish={handleCrearOportunidad}
          />
        )}
      </Box>
    </Box>
  );
}