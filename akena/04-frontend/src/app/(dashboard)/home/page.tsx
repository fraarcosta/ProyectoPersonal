// Route: GET /home
"use client";

import { type ReactNode } from "react";
import { Plus, FolderOpen, BarChart3, Globe2, ShieldCheck, FileCode2, History } from "lucide-react";
import { useNav }  from "../../../lib/routes/navigation";
import Button      from "@mui/material/Button";
import Box         from "@mui/material/Box";
import Typography  from "@mui/material/Typography";
import Divider     from "@mui/material/Divider";

// ─── Workspace Card ───────────────────────────────────────────────────────────

function WorkspaceCard({
  icon, title, description, cta, onClick,
}: {
  icon:        ReactNode;
  title:       string;
  description: string;
  cta:         string;
  onClick:     () => void;
}) {
  return (
    <Box
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => (e.key === "Enter" || e.key === " ") && onClick()}
      sx={{
        flex: 1, p: "36px 32px", textAlign: "left",
        cursor: "pointer",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--elevation-sm)",
        bgcolor: "background.paper",
        transition: "border-color 0.2s",
        "&:hover": { borderColor: "primary.main" },
        "&:hover .icon-box": { bgcolor: "primary.main", color: "primary.contrastText" },
      }}
    >
      <Box
        className="icon-box"
        sx={{
          width: 52, height: 52, borderRadius: "var(--radius)",
          bgcolor: "var(--muted)",
          display: "flex", alignItems: "center", justifyContent: "center",
          mb: 2.5, color: "primary.main", transition: "all 0.2s",
        }}
      >
        {icon}
      </Box>
      <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>{title}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
        {description}
      </Typography>
      <Typography variant="body2" fontWeight={600} sx={{ mt: 3, color: "primary.main", display: "flex", alignItems: "center", gap: 0.5 }}>
        {cta} →
      </Typography>
    </Box>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AppHomePage() {
  const nav = useNav();

  return (
    <Box
      sx={{
        minHeight: "calc(100vh - var(--header-height))",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        px: "var(--page-px)", py: "var(--page-py)",
        bgcolor: "background.default",
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 840, display: "flex", flexDirection: "column", gap: "var(--section-gap)" }}>

        {/* ── 1. Cualificación previa (GO / NO GO) ─────────────────────────── */}
        <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
              <ShieldCheck size={18} style={{ color: "var(--primary)" }} />
              <Typography variant="body1" fontWeight={600}>
                Cualificación previa de la oportunidad (GO / NO GO)
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Sube los pliegos para que la IA analice la viabilidad de la licitación antes de crear la oportunidad.
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="small"
            startIcon={<Plus size={14} />}
            onClick={() => nav.qualifications.new()}
            sx={{ flexShrink: 0, ml: 2 }}
          >
            Nueva cualificación
          </Button>
        </Box>

        <Divider />

        {/* ── 2. Espacio de trabajo ─────────────────────────────────────────── */}
        <Box>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" fontWeight={600}>Espacio de trabajo</Typography>
            <Typography variant="body2" color="text.secondary">
              Crea una nueva oportunidad o retoma el trabajo en una existente.
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 3 }}>
            <WorkspaceCard
              icon={<Plus size={24} />}
              title="Crear nueva oportunidad"
              description="Inicia el proceso de creación de una nueva oferta pública. Define los datos básicos, carga documentación y asigna el equipo."
              cta="Comenzar"
              onClick={() => nav.prospects.new()}
            />
            <WorkspaceCard
              icon={<FolderOpen size={24} />}
              title="Seleccionar oportunidad existente"
              description="Accede al espacio de trabajo de una oportunidad en curso, entregada o adjudicada. Retoma tu trabajo donde lo dejaste."
              cta="Ver oportunidades"
              onClick={() => nav.prospects.select()}
            />
          </Box>
        </Box>

        <Divider />

        {/* ── 3. Portales corporativos ─────────────────────────────────────── */}
        <Box>
          <Typography variant="body1" fontWeight={600} sx={{ mb: 2 }}>
            Portales corporativos
          </Typography>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<Globe2 size={20} />}
              onClick={() => nav.portals()}
              sx={{ flex: 1, justifyContent: "flex-start", py: 1.5 }}
            >
              <Box sx={{ textAlign: "left" }}>
                <Typography variant="body2" fontWeight={600}>Portales</Typography>
                <Typography variant="caption" sx={{ opacity: 0.85 }}>Ventas · Activos · Innovación</Typography>
              </Box>
            </Button>

            <Button
              variant="outlined"
              size="large"
              startIcon={<BarChart3 size={20} />}
              onClick={() => nav.intelligence.marketing()}
              sx={{ flex: 1, justifyContent: "flex-start", py: 1.5 }}
            >
              <Box sx={{ textAlign: "left" }}>
                <Typography variant="body2" fontWeight={600}>Market Intelligence</Typography>
                <Typography variant="caption" sx={{ opacity: 0.75 }}>Análisis · Benchmarking · Insights</Typography>
              </Box>
            </Button>

            <Button
              variant="outlined"
              color="inherit"
              size="large"
              startIcon={<FileCode2 size={20} />}
              onClick={() => nav.replace("/diagnostico")}
              sx={{ flex: 1, justifyContent: "flex-start", py: 1.5, borderColor: "var(--border)", color: "text.secondary" }}
            >
              <Box sx={{ textAlign: "left" }}>
                <Typography variant="body2" fontWeight={600}>Diagnóstico API</Typography>
                <Typography variant="caption" sx={{ opacity: 0.75 }}>Integración · Gaps · Plan</Typography>
              </Box>
            </Button>

            <Button
              variant="outlined"
              color="inherit"
              size="large"
              startIcon={<History size={20} />}
              onClick={() => nav.replace("/historial")}
              sx={{ flex: 1, justifyContent: "flex-start", py: 1.5, borderColor: "var(--border)", color: "text.secondary" }}
            >
              <Box sx={{ textAlign: "left" }}>
                <Typography variant="body2" fontWeight={600}>Historial de cambios</Typography>
                <Typography variant="caption" sx={{ opacity: 0.75 }}>Versiones · Mejoras · Evolutivos</Typography>
              </Box>
            </Button>
          </Box>
        </Box>

      </Box>
    </Box>
  );
}
