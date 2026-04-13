// Route: GET /portals
"use client";

import { useState }   from "react";
import { Settings }   from "lucide-react";
import Box            from "@mui/material/Box";
import Typography     from "@mui/material/Typography";
import Button         from "@mui/material/Button";
import Tabs           from "@mui/material/Tabs";
import Tab            from "@mui/material/Tab";

import { VentasPortal }     from "./_components/portal-ventas";
import { ActivosPortal }    from "./_components/portal-activos";
import { InnovacionPortal } from "./_components/portal-innovacion";
import { PermisosPortal }   from "./_components/portal-permisos";
import { getAuthUser }      from "../../_components/auth-store";

type PortalTab = "ventas" | "activos" | "innovacion";

export default function AppPortalsPage() {
  const [activeTab, setActiveTab] = useState<PortalTab>("ventas");
  const [showPermisos, setShowPermisos] = useState(false);

  // Read from store each render — getAuthUser re-enforces PREDEFINED_ADMIN_IDS
  // so even stale localStorage sessions show the correct role immediately.
  const user    = getAuthUser();
  const isAdmin = user.role === "Admin";

  return (
    <Box sx={{ minHeight: "calc(100vh - var(--header-height))", bgcolor: "background.default", display: "flex", flexDirection: "column" }}>

      {/* Page header */}
      <Box sx={{ bgcolor: "background.paper", borderBottom: "1px solid var(--border)", px: 4 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", pt: 2.5, pb: 0 }}>
          <Box>
            {showPermisos ? (
              <>
                <Typography variant="h6" fontWeight={600}>Configuración de permisos</Typography>
                <Typography variant="body2" color="text.secondary">
                  Gestión de roles de acceso a los portales corporativos
                </Typography>
              </>
            ) : (
              <>
                <Typography variant="h6" fontWeight={600}>Portales corporativos</Typography>
                <Typography variant="body2" color="text.secondary">
                  Gestión centralizada de oportunidades, activos e innovación
                </Typography>
              </>
            )}
          </Box>

          {/* Permissions button — Admin only */}
          {isAdmin && (
            showPermisos ? (
              <Button
                variant="outlined"
                size="small"
                color="inherit"
                onClick={() => setShowPermisos(false)}
                sx={{ mt: 0.5 }}
              >
                ← Volver a portales
              </Button>
            ) : (
              <Button
                variant="outlined"
                size="small"
                color="inherit"
                startIcon={<Settings size={14} />}
                onClick={() => setShowPermisos(true)}
                sx={{ mt: 0.5 }}
              >
                Configuración de permisos
              </Button>
            )
          )}
        </Box>

        {/* Tabs — hidden when showing permissions */}
        {!showPermisos && (
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{ mt: 1.5, "& .MuiTab-root": { color: "text.secondary" }, "& .MuiTab-root.Mui-selected": { color: "primary.main" } }}
          >
            <Tab key="ventas" value="ventas" label="Portal de Ventas" />
            <Tab key="activos" value="activos" label="Portal de Activos" />
            <Tab key="innovacion" value="innovacion" label="Portal de Innovación" />
          </Tabs>
        )}
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, px: 4, py: 3 }}>
        {showPermisos ? (
          isAdmin ? (
            <PermisosPortal />
          ) : (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", py: 10 }}>
              <Typography color="text.secondary">No tienes permisos para acceder a esta sección.</Typography>
            </Box>
          )
        ) : (
          <>
            {activeTab === "ventas"     && <VentasPortal />}
            {activeTab === "activos"    && <ActivosPortal />}
            {activeTab === "innovacion" && <InnovacionPortal />}
          </>
        )}
      </Box>
    </Box>
  );
}