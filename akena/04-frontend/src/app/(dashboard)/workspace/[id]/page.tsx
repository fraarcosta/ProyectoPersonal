// Next.js equivalent: app/(dashboard)/workspace/[id]/page.tsx
// Route: GET /workspace/:id
// Todos los valores usan exclusivamente CSS variables del design system.
//
// NOTA DE MIGRACIÓN A NEXT.JS:
//   useParams() → props.params.id
"use client";

import { useState, useRef, useCallback, useMemo, type CSSProperties } from "react";
import { useParams } from "../../../../lib/router-adapter";
import { Settings, Lock } from "lucide-react";
import { useNav } from "../../../../lib/routes/navigation";
import Button from "@mui/material/Button";
import Dialog        from "@mui/material/Dialog";
import DialogTitle   from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Typography    from "@mui/material/Typography";
import Box           from "@mui/material/Box";
import { AlertTriangle } from "lucide-react";
import { AppWorkspaceSidebar }     from "./_components/workspace-sidebar";
import { AppWorkspaceContent }     from "./_components/workspace-content";
import { AppWorkspaceSubHeader }   from "./_components/workspace-subheader";
import type { OppMeta, EstadoOption } from "./_components/workspace-subheader";
import { AppChatAssistant }        from "../../_components/chat-assistant";
import { AppWorkspaceConfigModal } from "./_components/workspace-config-modal";
import { AppWorkspaceEntregadaModal } from "./_components/workspace-entregada-modal";
import { getOpportunities, updateOpportunity } from "../../../_components/opportunities-store";
import { WorkspaceReadonlyContext } from "./_components/workspace-readonly-context";

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_OPPORTUNITIES: Record<string, OppMeta> = {
  "OPP-2025-001": {
    name:   "Transformación Digital AEAT",
    client: "Agencia Estatal de Administración Tributaria",
    id:     "OPP-2025-001",
    estado: "En curso",
  },
  "OPP-2025-002": {
    name:   "Plataforma Gestión Documental MINHAP",
    client: "Ministerio de Hacienda y Administraciones Públicas",
    id:     "OPP-2025-002",
    estado: "En curso",
  },
  "OPP-2024-018": {
    name:   "Sistema de Información SEPE Next",
    client: "Servicio Público de Empleo Estatal",
    id:     "OPP-2024-018",
    estado: "Entregada",
  },
};

// ─── Estado options based on current state ────────────────────────────────────

function computeEstadoOptions(estado: string): EstadoOption[] {
  switch (estado) {
    case "En curso":
      return [
        { value: "En curso"   },
        { value: "Entregada"  },
        { value: "Descartada" },
        { value: "Adjudicada", disabled: true, tooltip: "Solo desde Portal de Ventas" },
      ];
    case "Entregada":
      return [
        { value: "Entregada"  },
        { value: "Adjudicada", disabled: true, tooltip: "Solo desde Portal de Ventas" },
      ];
    default:
      // Adjudicada, Descartada → no more transitions
      return [{ value: estado }];
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AppWorkspacePage() {
  const nav = useNav();
  const { id } = useParams<{ id: string }>();
  const [selectedItem, setSelectedItem] = useState("");

  // ── Config modal ──
  const [configOpen, setConfigOpen] = useState(false);

  // ── Estado transitions ──
  const [pendingEstado,       setPendingEstado]       = useState<string | null>(null);
  const [descartadaConfirm,   setDescartadaConfirm]   = useState(false);
  const [entregadaModalOpen,  setEntregadaModalOpen]  = useState(false);

  // ── Navigation guard for unsaved-changes protection ──
  const guardFnRef = useRef<((newId: string) => void) | null>(null);

  const handleSelectItem = useCallback((id: string) => {
    if (guardFnRef.current) {
      guardFnRef.current(id);
      return;
    }
    setSelectedItem(id);
  }, []);

  const navigateTo = useCallback((id: string) => {
    guardFnRef.current = null;
    setSelectedItem(id);
  }, []);

  const registerGuard = useCallback((guard: ((newId: string) => void) | null) => {
    guardFnRef.current = guard;
  }, []);

  // ── Resolve opportunity ──
  const opp: OppMeta = (() => {
    if (MOCK_OPPORTUNITIES[id || ""]) return MOCK_OPPORTUNITIES[id || ""];
    const stored = getOpportunities().find(o => o.id === id);
    if (stored) return {
      name:   stored.nombre,
      client: stored.cliente || "Cliente por definir",
      id:     stored.id,
      estado: stored.estado,
    };
    return {
      name:   "Nueva Oportunidad",
      client: "Cliente por definir",
      id:     id ?? "OPP-2025-NEW",
      estado: "En curso",
    };
  })();

  const [estado, setEstado] = useState(opp.estado);

  // Persist estado change to store
  const persistEstado = (newEstado: string) => {
    setEstado(newEstado);
    updateOpportunity(opp.id, { estado: newEstado });
  };

  // ── Handle estado change with intercept ──
  const handleEstadoChange = (newEstado: string) => {
    if (newEstado === estado) return;

    if (newEstado === "Descartada") {
      setPendingEstado("Descartada");
      setDescartadaConfirm(true);
      return;
    }

    if (newEstado === "Entregada") {
      setEntregadaModalOpen(true);
      return;
    }

    // Direct transition (shouldn't happen with current options but guard anyway)
    persistEstado(newEstado);
  };

  // ── Estado options (memoized) ──
  const estadoOptions = useMemo(() => computeEstadoOptions(estado), [estado]);

  // ── Read-only mode ──
  const isReadOnly = estado === "Entregada";

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <WorkspaceReadonlyContext.Provider value={{ isReadOnly }}>
    <div
      className="flex flex-col"
      style={{ height: "calc(100vh - var(--header-height))", overflow: "hidden" }}
    >
      {/* ── Workspace sub-header ── */}
      <AppWorkspaceSubHeader
        opp={opp}
        estado={estado}
        estadoOptions={estadoOptions}
        onEstadoChange={handleEstadoChange}
        onBack={() => nav.prospects.select()}
        actions={
          !isReadOnly ? (
            <Button
              variant="outlined"
              color="inherit"
              size="small"
              startIcon={<Settings size={14} />}
              data-testid="workspace-config"
              onClick={() => setConfigOpen(true)}
              sx={{ borderColor: "var(--border)" }}
            >
              Configuración
            </Button>
          ) : null
        }
        data-testid="workspace-subheader"
      />

      {/* ── Modo Histórico banner ── */}
      {isReadOnly && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "10px 20px",
            background: "var(--muted)",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <Lock size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
          <div style={{ display: "flex", alignItems: "baseline", gap: "12px", flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: "var(--text-xs)",
                fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                color: "var(--muted-foreground)",
                fontFamily: "inherit",
                letterSpacing: "0.03em",
                textTransform: "uppercase",
              }}
            >
              Modo Histórico — Oportunidad entregada (solo lectura)
            </span>
            <span
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--muted-foreground)",
                fontFamily: "inherit",
              }}
            >
              Puedes consultar y descargar el contenido generado. No se permiten cambios.
            </span>
          </div>
        </div>
      )}

      {/* ── Main workspace area ── */}
      <div className="flex flex-1 overflow-hidden">
        <AppWorkspaceSidebar
          selectedItem={selectedItem}
          onSelectItem={handleSelectItem}
        />
        <div className="flex-1 overflow-y-auto bg-background">
          <AppWorkspaceContent
            selectedItem={selectedItem}
            oppId={opp.id}
            oppName={opp.name}
            onRegisterGuard={registerGuard}
            navigateTo={navigateTo}
          />
        </div>
      </div>

      {/* ── Chat asistente — hidden in read-only mode ── */}
      {!isReadOnly && <AppChatAssistant oppId={opp.id} oppName={opp.name} />}

      {/* ── Configuración modal ── */}
      <AppWorkspaceConfigModal
        open={configOpen}
        oppId={opp.id}
        oppName={opp.name}
        oppClient={opp.client}
        onClose={() => setConfigOpen(false)}
      />

      {/* ── Descartada confirmation ── */}
      <Dialog
        open={descartadaConfirm}
        onClose={() => { setDescartadaConfirm(false); setPendingEstado(null); }}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: "var(--radius)" } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="subtitle1" component="span" fontWeight={600}>Descartar oportunidad</Typography>
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: "flex", alignItems: "flex-start", gap: 1.5,
              p: "12px 16px", mb: 1.5,
              bgcolor: "var(--destructive-subtle)",
              border: "1px solid var(--destructive)",
              borderRadius: "var(--radius-banner)",
            }}
          >
            <AlertTriangle size={15} style={{ color: "var(--destructive)", flexShrink: 0, marginTop: 1 }} />
            <Typography variant="body2" sx={{ color: "var(--destructive)", lineHeight: 1.6 }}>
              ¿Seguro que deseas descartar esta oportunidad? Esta acción marcará la oportunidad como descartada.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid var(--border)", gap: 1 }}>
          <Button
            size="small"
            color="inherit"
            onClick={() => { setDescartadaConfirm(false); setPendingEstado(null); }}
          >
            Cancelar
          </Button>
          <Button
            size="small"
            variant="contained"
            color="error"
            onClick={() => {
              if (pendingEstado) persistEstado(pendingEstado);
              setDescartadaConfirm(false);
              setPendingEstado(null);
            }}
          >
            Sí, descartar
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Entregada modal (confirm + Portal de Ventas form) ── */}
      <AppWorkspaceEntregadaModal
        open={entregadaModalOpen}
        oppId={opp.id}
        oppName={opp.name}
        oppCliente={opp.client}
        onConfirm={() => {
          setEntregadaModalOpen(false);
          persistEstado("Entregada");
        }}
        onCancel={() => {
          setEntregadaModalOpen(false);
          // Estado remains "En curso" — no change
        }}
      />
    </div>
    </WorkspaceReadonlyContext.Provider>
  );
}