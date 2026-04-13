// workspace-config-modal.tsx — Configuración de la oportunidad
// Sección 0: Datos básicos (editable)
// Sección 1: Colaboradores (con búsqueda y manejo "no encontrado")
// Sección 2: Documentación
"use client";
// Todos los valores usan exclusivamente CSS variables del design system.

import { useState, useEffect, useRef, type ReactNode } from "react";
import Dialog           from "@mui/material/Dialog";
import DialogTitle      from "@mui/material/DialogTitle";
import DialogContent    from "@mui/material/DialogContent";
import DialogActions    from "@mui/material/DialogActions";
import Button           from "@mui/material/Button";
import IconButton       from "@mui/material/IconButton";
import Typography       from "@mui/material/Typography";
import Box              from "@mui/material/Box";
import TextField        from "@mui/material/TextField";
import Select           from "@mui/material/Select";
import MenuItem         from "@mui/material/MenuItem";
import InputLabel       from "@mui/material/InputLabel";
import FormControl      from "@mui/material/FormControl";
import OutlinedInput    from "@mui/material/OutlinedInput";
import Chip             from "@mui/material/Chip";
import Tooltip          from "@mui/material/Tooltip";
import {
  Trash2, Download, Upload, UserPlus, X, FileText, Settings,
  CheckCircle2, Plus,
} from "lucide-react";
import {
  getOpportunities,
  updateOpportunity,
} from "../../../../_components/opportunities-store";
import { getRegistry, getAuthUser } from "../../../../_components/auth-store";
import { addNotification }          from "../../../../_components/notifications-store";

// ─── Constantes ───────────────────────────────────────────────────────────────

const TIPOLOGIAS = [
  "System Integration (SI)", "Mantenimiento evolutivo", "Mantenimiento correctivo",
  "AMS (Application Management Services)", "Soporte / Helpdesk", "PMO",
  "Consulting / Advisory", "Desarrollo a medida", "Servicios Cloud",
  "Ciberseguridad", "Data & AI", "Automatización / RPA", "Otros",
];

// ─── Types ───────────────────────────────────────────────────────────────────

type Collab       = { id: string; name: string; role: string };
type RegistryUser = { id: string; name: string; email: string };

interface DatosBasicos {
  nombre:      string;
  codigo:      string;
  cliente:     string;
  anno:        string;
  duracion:    string;
  presupuesto: string;
  tipologias:  string[];
  tieneLottes: "Si" | "No";
  lotes:       string[];
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface AppWorkspaceConfigModalProps {
  open:       boolean;
  oppId:      string;
  oppName?:   string;
  oppClient?: string;
  onClose:    () => void;
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Typography
      variant="overline"
      sx={{ color: "var(--muted-foreground)", letterSpacing: "0.07em", display: "block", mb: 2 }}
    >
      {children}
    </Typography>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AppWorkspaceConfigModal({
  open, oppId, oppName = "", oppClient = "", onClose,
}: AppWorkspaceConfigModalProps) {

  // ── Section states ──
  const [datos,       setDatos]       = useState<DatosBasicos>({
    nombre: "", codigo: "", cliente: "", anno: "", duracion: "",
    presupuesto: "", tipologias: [], tieneLottes: "No", lotes: [],
  });
  const [colaboradores, setColaboradores] = useState<Collab[]>([]);
  const [pliegos,       setPliegos]       = useState<string[]>([]);

  // ── UI state ──
  const [isDirty,      setIsDirty]      = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  // Collab search
  const [query,        setQuery]        = useState("");
  const [results,      setResults]      = useState<RegistryUser[]>([]);
  const [noResults,    setNoResults]    = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Lote new input
  const [newLote, setNewLote] = useState("");

  // ── Load fresh data on open ──
  useEffect(() => {
    if (!open) return;
    const opp = getOpportunities().find(o => o.id === oppId);

    setDatos({
      nombre:      opp?.nombre      ?? oppName,
      codigo:      opp?.codigo      ?? oppId,
      cliente:     opp?.cliente     ?? oppClient,
      anno:        opp?.anno        ?? String(new Date().getFullYear()),
      duracion:    opp?.duracion    ?? "",
      presupuesto: opp?.presupuesto ?? "",
      tipologias:  opp?.tipologia   ? opp.tipologia.split(", ").filter(Boolean) : [],
      tieneLottes: (() => {
        const v = opp?.tieneLottes?.toLowerCase();
        return v === "si" ? "Si" : "No";
      })() as "Si" | "No",
      lotes:       opp?.lotes       ?? [],
    });
    setColaboradores(opp?.colaboradores ?? []);
    setPliegos(opp?.pliegos            ?? []);
    setIsDirty(false);
    setSaved(false);
    setQuery("");
    setResults([]);
    setNoResults(false);
    setNewLote("");
  }, [open, oppId, oppName, oppClient]);

  // ── Collab search ──
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setNoResults(false);
      return;
    }
    const q = query.toLowerCase();
    const existing = new Set(colaboradores.map(c => c.id));
    const hits = getRegistry()
      .filter(u =>
        (u.userId.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q)) &&
        !existing.has(u.userId),
      )
      .slice(0, 5)
      .map(u => ({ id: u.userId, name: u.displayName, email: u.email }));
    setResults(hits);
    setNoResults(hits.length === 0);
  }, [query, colaboradores]);

  // ── Click outside closes search dropdown ──
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setResults([]);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Dirty helpers ──
  const touch = () => { setIsDirty(true); setSaved(false); };

  const setDato = (k: keyof DatosBasicos, v: DatosBasicos[typeof k]) => {
    setDatos(prev => ({ ...prev, [k]: v }));
    touch();
  };

  // ── Lotes ──
  const addLote = () => {
    const t = newLote.trim();
    if (!t || datos.lotes.includes(t)) return;
    setDato("lotes", [...datos.lotes, t]);
    setNewLote("");
  };
  const removeLote = (l: string) =>
    setDato("lotes", datos.lotes.filter(x => x !== l));

  // ── Collab actions ──
  const addCollab = (user: RegistryUser) => {
    setColaboradores(prev => [...prev, { id: user.id, name: user.name, role: "Editor" }]);
    setQuery("");
    setResults([]);
    setNoResults(false);
    touch();
  };
  const removeCollab = (id: string) => {
    setColaboradores(prev => prev.filter(c => c.id !== id));
    touch();
  };

  // ── Document actions ──
  const handleUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) { setPliegos(prev => [...prev, file.name]); touch(); }
    };
    input.click();
  };

  const removePliego = (name: string) => {
    setPliegos(prev => prev.filter(p => p !== name));
    touch();
  };

  const downloadPliego = (name: string) => {
    const blob = new Blob([`Mock content for ${name}`], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement("a"), { href: url, download: name });
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  // ── Save ──
  const handleSave = () => {
    const currentUser = getAuthUser();
    const opp         = getOpportunities().find(o => o.id === oppId);
    const existingIds = new Set(opp?.colaboradores.map(c => c.id) ?? []);
    const newCollabs  = colaboradores.filter(c => !existingIds.has(c.id));

    updateOpportunity(oppId, {
      nombre:      datos.nombre,
      codigo:      datos.codigo,
      cliente:     datos.cliente,
      anno:        datos.anno,
      duracion:    datos.duracion,
      presupuesto: datos.presupuesto,
      tipologia:   datos.tipologias.join(", "),
      tieneLottes: datos.tieneLottes,
      lotes:       datos.tieneLottes === "Si" ? datos.lotes : [],
      colaboradores,
      pliegos,
    });

    // Notify newly added collaborators
    const oppName2 = datos.nombre || opp?.nombre || oppId;
    newCollabs.forEach(c => {
      addNotification({
        userId:            c.id,
        tipo:              "OPPORTUNITY_ADDED",
        oportunidadId:     oppId,
        oportunidadNombre: oppName2,
        readAt:            null,
        createdBy:         currentUser.name,
      });
    });

    setIsDirty(false);
    setSaved(true);
  };

  // ── Close guard ──
  const handleClose = () => {
    if (isDirty) { setConfirmClose(true); }
    else         { onClose(); }
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Main modal ── */}
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        scroll="paper"
        PaperProps={{ sx: { borderRadius: "var(--radius)", maxHeight: "90vh" } }}
      >
        {/* Header */}
        <DialogTitle
          sx={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            borderBottom: "1px solid var(--border)", pb: 1.5, pt: 2, px: 3,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Settings size={15} style={{ color: "var(--muted-foreground)" }} />
            <Typography variant="subtitle1" component="span" fontWeight={600}>
              Configuración de la oportunidad
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleClose}>
            <X size={15} />
          </IconButton>
        </DialogTitle>

        {/* Body */}
        <DialogContent sx={{ p: 0 }}>

          {/* ── Success banner ── */}
          {saved && (
            <Box sx={{
              display: "flex", alignItems: "center", gap: 1.5,
              px: 3, py: 1.25,
              bgcolor: "var(--success-subtle)",
              borderBottom: "1px solid var(--success)",
            }}>
              <CheckCircle2 size={13} style={{ color: "var(--success)", flexShrink: 0 }} />
              <Typography variant="caption" sx={{ color: "var(--success)" }}>
                Cambios guardados correctamente.
              </Typography>
            </Box>
          )}

          {/* ══ SECCIÓN 0 – Datos básicos ══════════════════════════════════════ */}
          <Box sx={{ px: 3, pt: 3, pb: 3, borderBottom: "1px solid var(--border)" }}>
            <SectionLabel>Datos básicos</SectionLabel>

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              {/* Nombre */}
              <Box sx={{ gridColumn: "1 / -1" }}>
                <TextField
                  label="Nombre de la oportunidad *"
                  size="small"
                  fullWidth
                  value={datos.nombre}
                  onChange={e => setDato("nombre", e.target.value)}
                />
              </Box>

              {/* Código expediente */}
              <TextField
                label="Código de expediente"
                size="small"
                fullWidth
                value={datos.codigo}
                onChange={e => setDato("codigo", e.target.value)}
              />

              {/* Cliente */}
              <TextField
                label="Cliente *"
                size="small"
                fullWidth
                value={datos.cliente}
                onChange={e => setDato("cliente", e.target.value)}
              />

              {/* Año */}
              <TextField
                label="Año"
                size="small"
                fullWidth
                value={datos.anno}
                onChange={e => setDato("anno", e.target.value)}
              />

              {/* Duración */}
              <TextField
                label="Duración del contrato"
                size="small"
                fullWidth
                placeholder="ej. 12 meses"
                value={datos.duracion}
                onChange={e => setDato("duracion", e.target.value)}
              />

              {/* Presupuesto */}
              <Box sx={{ gridColumn: "1 / -1" }}>
                <TextField
                  label="Presupuesto base de licitación (sin IVA)"
                  size="small"
                  fullWidth
                  placeholder="ej. 500000"
                  value={datos.presupuesto}
                  onChange={e => setDato("presupuesto", e.target.value)}
                />
              </Box>

              {/* Tipología — multi-select */}
              <Box sx={{ gridColumn: "1 / -1" }}>
                <FormControl size="small" fullWidth>
                  <InputLabel id="cfg-tipologia-label">Tipología de contrato</InputLabel>
                  <Select
                    labelId="cfg-tipologia-label"
                    multiple
                    value={datos.tipologias}
                    onChange={e => setDato("tipologias", e.target.value as string[])}
                    input={<OutlinedInput label="Tipología de contrato" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {(selected as string[]).map(v => (
                          <Chip
                            key={v}
                            label={v}
                            size="small"
                            sx={{
                              bgcolor: "var(--accent-subtle)", color: "var(--accent)",
                              borderRadius: "var(--radius-chip)", height: 20,
                              "& .MuiChip-label": { px: "8px", fontSize: "var(--text-2xs)" },
                            }}
                          />
                        ))}
                      </Box>
                    )}
                  >
                    {TIPOLOGIAS.map(t => (
                      <MenuItem key={t} value={t}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Box
                            sx={{
                              width: 14, height: 14, borderRadius: "2px", flexShrink: 0,
                              border: "1px solid var(--border)",
                              bgcolor: datos.tipologias.includes(t) ? "var(--primary)" : "transparent",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}
                          >
                            {datos.tipologias.includes(t) && (
                              <Box sx={{ width: 8, height: 8, bgcolor: "white", borderRadius: "1px" }} />
                            )}
                          </Box>
                          <Typography variant="body2">{t}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* ¿Tiene lotes? */}
              <FormControl size="small" fullWidth>
                <InputLabel id="cfg-lotes-label">¿Tiene lotes?</InputLabel>
                <Select
                  labelId="cfg-lotes-label"
                  label="¿Tiene lotes?"
                  value={datos.tieneLottes}
                  onChange={e => {
                    setDato("tieneLottes", e.target.value as "Si" | "No");
                    if (e.target.value === "No") setDato("lotes", []);
                  }}
                >
                  <MenuItem value="Si">Sí</MenuItem>
                  <MenuItem value="No">No</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Lotes list */}
            {datos.tieneLottes === "Si" && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                  Lotes
                </Typography>

                {datos.lotes.length > 0 && (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 1.5 }}>
                    {datos.lotes.map((l, i) => (
                      <Chip
                        key={i}
                        label={l}
                        size="small"
                        onDelete={() => removeLote(l)}
                        sx={{
                          bgcolor: "var(--muted)", border: "1px solid var(--border)",
                          borderRadius: "var(--radius-chip)",
                          "& .MuiChip-label": { fontSize: "var(--text-xs)" },
                        }}
                      />
                    ))}
                  </Box>
                )}

                <Box sx={{ display: "flex", gap: 1 }}>
                  <TextField
                    size="small"
                    placeholder="Nombre del lote…"
                    value={newLote}
                    onChange={e => setNewLote(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addLote()}
                    sx={{ flex: 1 }}
                  />
                  <Button
                    variant="outlined"
                    color="inherit"
                    size="small"
                    startIcon={<Plus size={13} />}
                    onClick={addLote}
                    sx={{ borderColor: "var(--border)", flexShrink: 0 }}
                  >
                    Añadir
                  </Button>
                </Box>
              </Box>
            )}
          </Box>

          {/* ══ SECCIÓN 1 – Colaboradores ══════════════════════════════════════ */}
          <Box sx={{ px: 3, pt: 3, pb: 3, borderBottom: "1px solid var(--border)" }}>
            <SectionLabel>Colaboradores</SectionLabel>

            {/* List */}
            {colaboradores.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                No hay colaboradores asignados a esta oportunidad.
              </Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mb: 2.5 }}>
                {colaboradores.map(c => (
                  <Box
                    key={c.id}
                    sx={{
                      display: "flex", alignItems: "center", gap: 1.5,
                      p: "10px 12px",
                      bgcolor: "var(--muted)",
                      borderRadius: "var(--radius)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {/* Avatar */}
                    <Box sx={{
                      width: 28, height: 28, borderRadius: "50%",
                      bgcolor: "var(--primary-subtle)", color: "var(--primary)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      <Typography sx={{ fontSize: "var(--text-2xs)", fontWeight: 600 }}>
                        {c.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>{c.name}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>{c.id}</Typography>
                    </Box>
                    <Tooltip title="Eliminar colaborador">
                      <IconButton
                        size="small"
                        onClick={() => removeCollab(c.id)}
                        sx={{ color: "var(--muted-foreground)", "&:hover": { color: "var(--destructive)" } }}
                      >
                        <Trash2 size={13} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                ))}
              </Box>
            )}

            {/* Search */}
            <Box ref={searchRef} sx={{ position: "relative" }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Buscar colaborador por ID o nombre…"
                value={query}
                onChange={e => { setQuery(e.target.value); setNoResults(false); }}
                InputProps={{
                  startAdornment: (
                    <UserPlus size={13} style={{ marginRight: 8, color: "var(--muted-foreground)", flexShrink: 0 }} />
                  ),
                }}
              />

              {/* Results dropdown */}
              {results.length > 0 && (
                <Box sx={{
                  position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 20,
                  bgcolor: "background.paper",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  boxShadow: 4,
                  overflow: "hidden",
                }}>
                  {results.map(u => (
                    <Box
                      key={u.id}
                      onClick={() => addCollab(u)}
                      sx={{
                        display: "flex", alignItems: "center", gap: 1.5,
                        px: 2, py: 1.25, cursor: "pointer",
                        borderBottom: "1px solid var(--border)",
                        "&:last-child": { borderBottom: "none" },
                        "&:hover": { bgcolor: "var(--muted)" },
                      }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600}>{u.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{u.id}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}

              {/* No results message */}
              {noResults && query.trim().length >= 2 && (
                <Box sx={{
                  mt: 1, px: 2, py: 1.25,
                  bgcolor: "var(--muted)",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                }}>
                  <Typography variant="caption" color="text.secondary">
                    No se ha encontrado ningún usuario con ese ID. Verifica que el usuario esté registrado en Akena.
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          {/* ══ SECCIÓN 2 – Documentación ══════════════════════════════════════ */}
          <Box sx={{ px: 3, pt: 3, pb: 3 }}>
            <SectionLabel>Documentación</SectionLabel>

            {pliegos.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                No hay documentos adjuntos a esta oportunidad.
              </Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mb: 2.5 }}>
                {pliegos.map((name, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: "flex", alignItems: "center", gap: 1.5,
                      p: "10px 12px",
                      bgcolor: "var(--muted)", borderRadius: "var(--radius)", border: "1px solid var(--border)",
                    }}
                  >
                    <FileText size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap>{name}</Typography>
                    <Tooltip title="Descargar">
                      <IconButton size="small" onClick={() => downloadPliego(name)} sx={{ color: "var(--muted-foreground)" }}>
                        <Download size={13} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton
                        size="small"
                        onClick={() => removePliego(name)}
                        sx={{ color: "var(--muted-foreground)", "&:hover": { color: "var(--destructive)" } }}
                      >
                        <Trash2 size={13} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                ))}
              </Box>
            )}

            <Button
              variant="outlined"
              color="inherit"
              size="small"
              startIcon={<Upload size={13} />}
              onClick={handleUpload}
              sx={{ borderColor: "var(--border)" }}
            >
              Subir nuevo documento
            </Button>
          </Box>
        </DialogContent>

        {/* Footer */}
        <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid var(--border)", gap: 1, justifyContent: "flex-end" }}>
          <Button variant="text" color="inherit" size="small" onClick={handleClose}>
            Cerrar
          </Button>
          <Button
            variant="contained"
            color="primary"
            size="small"
            onClick={handleSave}
            disabled={!isDirty}
          >
            Guardar cambios
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Confirm-close dialog ── */}
      <Dialog
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: "var(--radius)" } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="subtitle1" component="span" fontWeight={600}>Cambios sin guardar</Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Tienes cambios pendientes. Si cierras ahora se perderán. ¿Deseas continuar?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button size="small" color="inherit" onClick={() => setConfirmClose(false)}>
            Seguir editando
          </Button>
          <Button
            size="small"
            color="error"
            variant="contained"
            onClick={() => { setConfirmClose(false); onClose(); }}
          >
            Salir sin guardar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}