// workspace-entregada-modal.tsx
// Formulario Portal de Ventas pre-rellenado al transicionar a "Entregada".
// Paso 1: Confirmación  →  Paso 2: Formulario pre-rellenado + subida Word/PPT (obligatorios)
// 🔑 REGLA: cada oportunidad es entregada de forma independiente (lote activo únicamente).
"use client";
// Todos los valores usan exclusivamente CSS variables del design system.

import React, { useState, useEffect } from "react";
import Dialog        from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button        from "@mui/material/Button";
import IconButton    from "@mui/material/IconButton";
import Typography    from "@mui/material/Typography";
import Box           from "@mui/material/Box";
import Chip          from "@mui/material/Chip";
import {
  X, Upload, FileText, Trash2, AlertTriangle,
  CheckCircle2, Loader2, AlertCircle, Package,
} from "lucide-react";
import { getOpportunities }  from "../../../../_components/opportunities-store";
import { getAuthUser }       from "../../../../_components/auth-store";
import type { StoredOpportunity } from "../../../../_components/opportunities-store";

// ─── Portal de Ventas localStorage integration ────────────────────────────────

const PV_KEY = "portal-ventas-ofertas";

interface PVOferta {
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
  lotes:               { id: string; identificador: string }[];
  pliegosAnexos:       { name: string; size: string }[];
  wordOferta:          { name: string; size: string }[];
  pptOferta:           { name: string; size: string }[];
  lotesDocs:           Record<string, { word: { name: string; size: string }[]; ppt: { name: string; size: string }[] }>;
  loteActivo:          string | null;
  estado:              string;
  resultado:           string;
  informeTecnico:      { name: string; size: string }[];
  informeEconomico:    { name: string; size: string }[];
  sinInformes:         boolean;
  updatedAt:           string;
  updatedBy:           string;
  createdAt:           string;
  createdBy:           string;
}

function savePVOferta(oferta: PVOferta): void {
  try {
    const raw      = localStorage.getItem(PV_KEY);
    const existing: PVOferta[] = raw ? JSON.parse(raw) : [];
    localStorage.setItem(PV_KEY, JSON.stringify([oferta, ...existing]));
  } catch {}
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface DocFile { name: string; size: string }

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Detecta el lote activo a partir del nombre de la oportunidad.
 * Estrategia 1: si la opp sólo tiene 1 lote en su lista → ese es el activo.
 * Estrategia 2: buscar sufijo "Lote X" / "— Lote X" en el nombre.
 * Devuelve null si no se detecta lote.
 */
function detectActiveLote(opp: StoredOpportunity | null): string | null {
  if (!opp) return null;

  // Si hay exactamente 1 lote registrado, es el activo
  if ((opp.lotes?.length ?? 0) === 1) return opp.lotes[0];

  // Intentar extraer "Lote X" del nombre
  const match = opp.nombre?.match(/[-–—]\s*(Lote\s+\S+(?:\s+[^—\-]+)?)/i);
  if (match) return match[1].trim();

  return null;
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface AppWorkspaceEntregadaModalProps {
  open:        boolean;
  oppId:       string;
  oppName:     string;
  oppCliente?: string;
  onConfirm:   () => void;   // called after successful save → caller sets estado = Entregada
  onCancel:    () => void;   // user cancelled → estado stays En curso
}

// ─── Confirmation step ────────────────────────────────────────────────────────

function ConfirmStep({ onConfirm, onCancel, loteActivo }: {
  onConfirm:   () => void;
  onCancel:    () => void;
  loteActivo:  string | null;
}) {
  return (
    <>
      <DialogContent sx={{ pt: 2.5, pb: 2 }}>
        {loteActivo && (
          <Box sx={{
            display: "flex", alignItems: "center", gap: 1.5,
            p: "10px 14px",
            bgcolor: "var(--info-subtle, var(--primary-subtle))",
            border: "1px solid var(--info, var(--primary))",
            borderRadius: "var(--radius-banner)",
            mb: 2,
          }}>
            <Package size={14} style={{ color: "var(--primary)", flexShrink: 0 }} />
            <Typography variant="body2" sx={{ color: "var(--primary)", fontWeight: 600 }}>
              Estás entregando: {loteActivo}
            </Typography>
          </Box>
        )}
        <Box sx={{
          display: "flex", alignItems: "flex-start", gap: 1.5,
          p: "12px 16px",
          bgcolor: "var(--warning-subtle)",
          border: "1px solid var(--warning)",
          borderRadius: "var(--radius-banner)",
          mb: 2,
        }}>
          <AlertTriangle size={15} style={{ color: "var(--warning-foreground)", flexShrink: 0, marginTop: 1 }} />
          <Typography variant="body2" sx={{ color: "var(--warning-foreground)", lineHeight: 1.6 }}>
            Se va a marcar esta oportunidad como <strong>Entregada</strong> y se registrará en el Portal de Ventas. ¿Deseas continuar?
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          A continuación deberás subir el Word de la oferta técnica y el PPT de editables{loteActivo ? ` del ${loteActivo}` : ""}. Ambos son obligatorios antes de confirmar.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid var(--border)", gap: 1 }}>
        <Button size="small" color="inherit" onClick={onCancel}>Cancelar</Button>
        <Button size="small" variant="contained" color="primary" onClick={onConfirm}>
          Continuar
        </Button>
      </DialogActions>
    </>
  );
}

// ─── Read-only metadata row ───────────────────────────────────────────────────

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: "flex", gap: 2, py: 0.875, borderBottom: "1px solid var(--border)" }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ minWidth: 165, flexShrink: 0, pt: "1px" }}
      >
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={500}>
        {value || "—"}
      </Typography>
    </Box>
  );
}

// ─── Upload zone ─────────────────────────────────────────────────────────────

function UploadZone({
  label, required, accept, files, onAdd, onRemove,
}: {
  label:    string;
  required: boolean;
  accept:   string;
  files:    DocFile[];
  onAdd:    (f: DocFile) => void;
  onRemove: (name: string) => void;
}) {
  const handleClick = () => {
    const input = document.createElement("input");
    input.type   = "file";
    input.accept = accept;
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) onAdd({ name: file.name, size: `${Math.round(file.size / 1024)} KB` });
    };
    input.click();
  };

  const missing = required && files.length === 0;

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
        <Typography variant="caption" color={missing ? "error" : "text.secondary"}>
          {label}
        </Typography>
        {required && (
          <Typography variant="caption" sx={{ color: "var(--destructive)" }}>*</Typography>
        )}
      </Box>

      {files.length > 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mb: 1 }}>
          {files.map((f, i) => (
            <Box
              key={i}
              sx={{
                display: "flex", alignItems: "center", gap: 1.5,
                p: "8px 12px",
                bgcolor: "var(--success-subtle)",
                borderRadius: "var(--radius)",
                border: "1px solid var(--success)",
              }}
            >
              <FileText size={13} style={{ color: "var(--success)", flexShrink: 0 }} />
              <Typography variant="body2" sx={{ flex: 1 }} noWrap>{f.name}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>{f.size}</Typography>
              <IconButton size="small" onClick={() => onRemove(f.name)} sx={{ color: "var(--muted-foreground)" }}>
                <Trash2 size={12} />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}

      <Button
        size="small"
        variant={missing ? "contained" : "outlined"}
        color={missing ? "primary" : "inherit"}
        startIcon={<Upload size={12} />}
        onClick={handleClick}
        sx={missing
          ? {}
          : { borderColor: "var(--border)", fontSize: "var(--text-xs)" }
        }
      >
        {files.length === 0 ? "Subir archivo" : "Cambiar archivo"}
      </Button>
    </Box>
  );
}

// ─── Form step ────────────────────────────────────────────────────────────────

function FormStep({
  opp, oppFallback, loteActivo, onSave, onCancel,
}: {
  opp:         StoredOpportunity | null;
  oppFallback: { id: string; name: string; client: string };
  loteActivo:  string | null;
  onSave:      () => void;
  onCancel:    () => void;
}) {
  // Re-read from store at mount to always use latest "Datos básicos"
  const freshOpp = getOpportunities().find(o => o.id === oppFallback.id) ?? opp;

  // ── Document state — always single-lote (current opp is the unit of delivery) ──
  const [wordDocs, setWordDocs] = useState<DocFile[]>([]);
  const [pptDocs,  setPptDocs]  = useState<DocFile[]>([]);

  const [saving,     setSaving]     = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [validError, setValidError] = useState<string | null>(null);

  // Clear validation error when files change
  useEffect(() => { setValidError(null); }, [wordDocs, pptDocs]);

  const handleSave = () => {
    if (wordDocs.length === 0 || pptDocs.length === 0) {
      setValidError(
        loteActivo
          ? `Debe subir la documentación del ${loteActivo} antes de marcar como entregada.`
          : "Debe subir el Word de la oferta técnica y el PPT de editables antes de marcar la oportunidad como entregada.",
      );
      return;
    }

    setSaving(true);
    setTimeout(() => {
      const user = getAuthUser();
      const now  = new Date().toISOString();
      const oferta: PVOferta = {
        id:                  `PV-${Date.now()}`,
        codigoExpediente:    freshOpp?.codigo    ?? oppFallback.id,
        nombre:              freshOpp?.nombre    ?? oppFallback.name,
        tipologia:           freshOpp?.tipologia ?? "—",
        cliente:             freshOpp?.cliente   ?? oppFallback.client,
        año:                 freshOpp?.anno      ?? String(new Date().getFullYear()),
        duracion:            freshOpp?.duracion  ?? "—",
        presupuestoBase:     parseFloat(freshOpp?.presupuesto ?? "0") || 0,
        presupuestoOfertado: 0,
        descuento:           0,
        tieneLotes:          !!loteActivo,
        lotes:               loteActivo ? [{ id: "L1", identificador: loteActivo }] : [],
        pliegosAnexos:       (freshOpp?.pliegos ?? []).map(p => ({ name: p, size: "—" })),
        wordOferta:          wordDocs,
        pptOferta:           pptDocs,
        lotesDocs:           {},
        loteActivo:          loteActivo,
        estado:              "Entregada",
        resultado:           "",
        informeTecnico:      [],
        informeEconomico:    [],
        sinInformes:         true,
        updatedAt:           now,
        updatedBy:           user.name,
        createdAt:           now,
        createdBy:           user.name,
      };
      savePVOferta(oferta);
      setSaving(false);
      setSuccess(true);
      setTimeout(onSave, 1400);
    }, 1200);
  };

  // ── Success screen ──
  if (success) {
    return (
      <DialogContent sx={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", py: 7, gap: 2,
      }}>
        <CheckCircle2 size={42} style={{ color: "var(--success)" }} />
        <Typography variant="subtitle1" component="p" fontWeight={600} sx={{ color: "var(--success)" }}>
          Oferta registrada correctamente
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", maxWidth: 360 }}>
          La oportunidad ha sido marcada como <strong>Entregada</strong> y la oferta se ha creado en el Portal de Ventas con estado "Pendiente de valoración".
        </Typography>
      </DialogContent>
    );
  }

  return (
    <>
      <DialogContent sx={{ p: 0 }}>

        {/* Lote activo banner */}
        {loteActivo && (
          <Box sx={{
            display: "flex", alignItems: "center", gap: 1.5,
            mx: 3, mt: 2.5,
            p: "10px 14px",
            bgcolor: "var(--primary-subtle, var(--muted))",
            border: "1px solid var(--primary)",
            borderRadius: "var(--radius-banner)",
          }}>
            <Package size={14} style={{ color: "var(--primary)", flexShrink: 0 }} />
            <Typography variant="body2" sx={{ color: "var(--primary)", fontWeight: 600 }}>
              Estás entregando: {loteActivo}
            </Typography>
          </Box>
        )}

        {/* Pre-filled metadata */}
        <Box sx={{ px: 3, pt: loteActivo ? 2.5 : 3, pb: 2.5, borderBottom: "1px solid var(--border)" }}>
          <Typography
            variant="overline"
            sx={{ color: "var(--muted-foreground)", letterSpacing: "0.07em", display: "block", mb: 1.5 }}
          >
            Datos de la oportunidad
          </Typography>
          <FieldRow label="Código expediente"          value={freshOpp?.codigo    ?? oppFallback.id} />
          <FieldRow label="Nombre"                     value={freshOpp?.nombre    ?? oppFallback.name} />
          <FieldRow label="Cliente"                    value={freshOpp?.cliente   ?? oppFallback.client} />
          <FieldRow label="Año"                        value={freshOpp?.anno      ?? String(new Date().getFullYear())} />
          <FieldRow label="Tipología"                  value={freshOpp?.tipologia ?? "—"} />
          <FieldRow label="Duración"                   value={freshOpp?.duracion  ?? "—"} />
          <FieldRow label="Presupuesto base (sin IVA)" value={freshOpp?.presupuesto ? `${Number(freshOpp.presupuesto).toLocaleString("es-ES")} €` : "—"} />
          {loteActivo && (
            <FieldRow label="Lote" value={loteActivo} />
          )}
        </Box>

        {/* Validation error banner */}
        {validError && (
          <Box sx={{
            display: "flex", alignItems: "flex-start", gap: 1.5,
            mx: 3, mt: 2.5,
            p: "12px 16px",
            bgcolor: "var(--destructive-subtle)",
            border: "1px solid var(--destructive)",
            borderRadius: "var(--radius-banner)",
          }}>
            <AlertCircle size={15} style={{ color: "var(--destructive)", flexShrink: 0, marginTop: 1 }} />
            <Typography variant="body2" sx={{ color: "var(--destructive)", lineHeight: 1.6 }}>
              {validError}
            </Typography>
          </Box>
        )}

        {/* Document uploads — siempre del lote activo únicamente */}
        <Box sx={{ px: 3, pt: 2.5, pb: 3 }}>
          <Typography
            variant="overline"
            sx={{ color: "var(--muted-foreground)", letterSpacing: "0.07em", display: "block", mb: 2 }}
          >
            Documentación{loteActivo ? ` — ${loteActivo}` : " de la oferta"}{" "}
            <Typography component="span" variant="caption" color="text.secondary">(obligatoria)</Typography>
          </Typography>

          <UploadZone
            label="Word oferta técnica (.docx)"
            required
            accept=".doc,.docx"
            files={wordDocs}
            onAdd={f => setWordDocs(prev => [...prev, f])}
            onRemove={name => setWordDocs(prev => prev.filter(x => x.name !== name))}
          />
          <UploadZone
            label="PPT editables (.pptx)"
            required
            accept=".ppt,.pptx"
            files={pptDocs}
            onAdd={f => setPptDocs(prev => [...prev, f])}
            onRemove={name => setPptDocs(prev => prev.filter(x => x.name !== name))}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid var(--border)", gap: 1 }}>
        <Button size="small" color="inherit" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button
          size="small"
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <Loader2 size={13} className="animate-spin" /> : undefined}
        >
          {saving ? "Guardando…" : "Guardar y marcar como Entregada"}
        </Button>
      </DialogActions>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AppWorkspaceEntregadaModal({
  open, oppId, oppName, oppCliente, onConfirm, onCancel,
}: AppWorkspaceEntregadaModalProps) {
  const [step, setStep] = useState<"confirm" | "form">("confirm");

  // Reset on open
  useEffect(() => { if (open) setStep("confirm"); }, [open]);

  const storedOpp  = getOpportunities().find(o => o.id === oppId) ?? null;
  const loteActivo = detectActiveLote(storedOpp);

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
      scroll="paper"
      PaperProps={{ sx: { borderRadius: "var(--radius)", maxHeight: "90vh" } }}
    >
      {/* Modal header */}
      <Box sx={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        px: 3, py: 1.75,
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Typography variant="subtitle1" component="p" fontWeight={600}>
            {step === "confirm" ? "Confirmar cambio de estado" : "Formulario Portal de Ventas"}
          </Typography>
          <Chip
            label="Entregada"
            size="small"
            sx={{
              bgcolor: "var(--success-subtle)", color: "var(--success)",
              borderRadius: "var(--radius-chip)", height: 20, fontWeight: 600,
              "& .MuiChip-label": { px: "10px", fontSize: "var(--text-2xs)" },
            }}
          />
        </Box>
        <IconButton size="small" onClick={onCancel}>
          <X size={15} />
        </IconButton>
      </Box>

      {step === "confirm" ? (
        <ConfirmStep
          loteActivo={loteActivo}
          onConfirm={() => setStep("form")}
          onCancel={onCancel}
        />
      ) : (
        <FormStep
          opp={storedOpp}
          oppFallback={{ id: oppId, name: oppName, client: oppCliente ?? "—" }}
          loteActivo={loteActivo}
          onSave={onConfirm}
          onCancel={onCancel}
        />
      )}
    </Dialog>
  );
}
