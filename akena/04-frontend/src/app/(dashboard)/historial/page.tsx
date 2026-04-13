// Route: /historial
// Historial de versiones y cambios de la plataforma Akena.
"use client";

import Box       from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip       from "@mui/material/Chip";
import { History, CheckCircle2, ArrowLeft } from "lucide-react";
import { useNav } from "../../../lib/routes/navigation";
import Button     from "@mui/material/Button";

// ─── Data ─────────────────────────────────────────────────────────────────────

const VERSION_CHANGES = [
  {
    id: 6,
    tipo: "Mejora",
    titulo: "Selección de fórmulas detectadas",
    antes: "La fórmula económica solo podía extraerse automáticamente o introducirse manualmente.",
    ahora: [
      "Visualizar listado de fórmulas detectadas en el pliego",
      "Seleccionar una o varias",
      "Añadirlas automáticamente a la configuración",
    ],
    autor: "Pol Masi",
    fecha: "19/03/2026",
  },
  {
    id: 5,
    tipo: "Mejora",
    titulo: "Gestión independiente por lotes en entrega",
    antes: "Al marcar una oportunidad como entregada, se requería subir documentación de todos los lotes a la vez.",
    ahora: [
      "Cada lote funciona como una oportunidad independiente",
      "Solo se sube la documentación del lote activo",
      "El resto de lotes no se ven afectados",
    ],
    autor: "Pol Masi",
    fecha: "19/03/2026",
  },
  {
    id: 4,
    tipo: "Mejora UX",
    titulo: "Línea técnica no desplegada por defecto",
    antes: "El bloque \"Análisis de la licitación\" aparecía desplegado automáticamente.",
    ahora: [
      "La línea técnica aparece totalmente colapsada por defecto",
      "El usuario puede expandir solo el bloque que necesite",
      "Mejora la claridad y la navegación",
    ],
    autor: "Pol Masi",
    fecha: "19/03/2026",
  },
  {
    id: 3,
    tipo: "Mejora",
    titulo: "Filtro en oportunidades existentes",
    antes: "No se podía filtrar por estado en el listado de oportunidades.",
    ahora: [
      "Filtro por estado: Todas, En curso, Entregadas, Adjudicadas, Descartadas",
    ],
    autor: "Pol Masi",
    fecha: "19/03/2026",
  },
  {
    id: 2,
    tipo: "Mejora",
    titulo: "Evaluación de la oferta técnica (vista visual)",
    antes: "La evaluación se mostraba únicamente como un bloque de texto.",
    ahora: [
      "Vista visual tipo cuadro de mando",
      "Resultado global (favorable / desfavorable)",
      "Puntuaciones por dimensión, fortalezas, riesgos y recomendaciones",
      "Se mantiene la vista en texto como alternativa",
    ],
    autor: "Pol Masi",
    fecha: "19/03/2026",
  },
  {
    id: 1,
    tipo: "Nueva funcionalidad",
    titulo: "Cualificación previa (GO / NO GO)",
    antes: "No existía ninguna fase previa para evaluar una licitación antes de crear la oportunidad.",
    ahora: [
      "Módulo de cualificación previa completo",
      "Subida de pliegos y análisis de viabilidad",
      "Resultado GO / NO GO con justificación automática",
      "Extracción de datos clave del pliego",
    ],
    autor: "Pol Masi",
    fecha: "19/03/2026",
  },
] as const;

const TIPO_COLORS: Record<string, { bg: string; border: string; fg: string }> = {
  "Nueva funcionalidad": {
    bg:     "var(--primary-subtle, color-mix(in srgb, var(--primary) 10%, transparent))",
    border: "var(--primary)",
    fg:     "var(--primary)",
  },
  "Mejora": {
    bg:     "var(--success-subtle)",
    border: "var(--success)",
    fg:     "var(--success)",
  },
  "Mejora UX": {
    bg:     "var(--accent-subtle, var(--muted))",
    border: "var(--accent, var(--border))",
    fg:     "var(--accent, var(--muted-foreground))",
  },
};

function getTipoStyle(tipo: string) {
  return TIPO_COLORS[tipo] ?? {
    bg:     "var(--muted)",
    border: "var(--border)",
    fg:     "var(--muted-foreground)",
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AppHistorialPage() {
  const nav = useNav();

  return (
    <Box
      sx={{
        minHeight: "calc(100vh - var(--header-height))",
        bgcolor: "background.default",
        px: "var(--page-px)",
        py: "var(--page-py)",
      }}
    >
      <Box sx={{ maxWidth: 760, mx: "auto", display: "flex", flexDirection: "column", gap: 0 }}>

        {/* ── Back ── */}
        <Box sx={{ mb: 3 }}>
          <Button
            size="small"
            color="inherit"
            startIcon={<ArrowLeft size={14} />}
            onClick={() => nav.home()}
            sx={{ color: "var(--muted-foreground)", pl: 0, "&:hover": { bgcolor: "transparent", color: "var(--foreground)" } }}
          >
            Volver al inicio
          </Button>
        </Box>

        {/* ── Header ── */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.75 }}>
          <Box sx={{
            width: 36, height: 36, borderRadius: "var(--radius)",
            bgcolor: "var(--muted)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <History size={18} style={{ color: "var(--muted-foreground)" }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={600} sx={{ lineHeight: 1.2 }}>
              Historial de versiones y cambios
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Registro de mejoras y evolutivos de la plataforma Akena
            </Typography>
          </Box>
        </Box>

        {/* ── Stats row ── */}
        <Box sx={{
          display: "flex", gap: 2, mt: 3, mb: 4,
          p: "14px 18px",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          bgcolor: "var(--muted)",
        }}>
          {[
            { label: "Total cambios", value: String(VERSION_CHANGES.length) },
            { label: "Nuevas funcionalidades", value: String(VERSION_CHANGES.filter(c => c.tipo === "Nueva funcionalidad").length) },
            { label: "Mejoras", value: String(VERSION_CHANGES.filter(c => c.tipo.startsWith("Mejora")).length) },
            { label: "Última actualización", value: "19/03/2026" },
          ].map((stat, i) => (
            <Box key={i} sx={{ flex: 1, borderRight: i < 3 ? "1px solid var(--border)" : "none", pr: i < 3 ? 2 : 0 }}>
              <Typography variant="caption" sx={{ color: "var(--muted-foreground)", display: "block", mb: 0.25, fontSize: "var(--text-2xs)" }}>
                {stat.label}
              </Typography>
              <Typography variant="body2" fontWeight={700} sx={{ color: "var(--foreground)" }}>
                {stat.value}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* ── Timeline ── */}
        <Box sx={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          bgcolor: "background.paper",
          overflow: "hidden",
        }}>
          {VERSION_CHANGES.map((change, idx) => {
            const isFirst = idx === 0;
            const isLast  = idx === VERSION_CHANGES.length - 1;
            const style   = getTipoStyle(change.tipo);

            return (
              <Box
                key={change.id}
                sx={{
                  display: "flex",
                  borderBottom: isLast ? "none" : "1px solid var(--border)",
                }}
              >
                {/* ── Timeline column ── */}
                <Box sx={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  pt: "22px", px: "24px", flexShrink: 0,
                }}>
                  <Box sx={{
                    width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                    bgcolor: isFirst ? "var(--primary)" : "var(--muted)",
                    border: `2px solid ${isFirst ? "var(--primary)" : "var(--border)"}`,
                    mt: "1px",
                  }} />
                  {!isLast && (
                    <Box sx={{ width: 1, flex: 1, mt: "6px", bgcolor: "var(--border)" }} />
                  )}
                </Box>

                {/* ── Content ── */}
                <Box sx={{ flex: 1, py: "20px", pr: "28px" }}>

                  {/* Badge + meta */}
                  <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1, mb: 1 }}>
                    <Box sx={{
                      display: "inline-flex", alignItems: "center",
                      px: "9px", py: "2px",
                      borderRadius: "var(--radius-chip)",
                      bgcolor: style.bg,
                      border: `1px solid ${style.border}`,
                    }}>
                      <Typography sx={{
                        fontSize: "var(--text-2xs)", fontWeight: 700,
                        color: style.fg, letterSpacing: "0.04em",
                        fontFamily: "inherit",
                      }}>
                        {change.tipo}
                      </Typography>
                    </Box>
                    <Typography sx={{
                      fontSize: "var(--text-2xs)", color: "var(--muted-foreground)",
                      fontFamily: "inherit",
                    }}>
                      {change.fecha} · {change.autor}
                    </Typography>
                  </Box>

                  {/* Title */}
                  <Typography variant="body2" fontWeight={700} sx={{ mb: 1.5, color: "var(--foreground)" }}>
                    {change.titulo}
                  </Typography>

                  {/* Antes / Ahora */}
                  <Box sx={{
                    display: "flex", flexDirection: "column", gap: 1.25,
                    p: "14px 16px",
                    bgcolor: "var(--muted)",
                    borderRadius: "var(--radius)",
                    border: "1px solid var(--border)",
                  }}>
                    {/* Antes */}
                    <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                      <Box sx={{
                        flexShrink: 0, mt: "5px",
                        width: 6, height: 6, borderRadius: "50%",
                        bgcolor: "var(--muted-foreground)", opacity: 0.35,
                      }} />
                      <Box>
                        <Typography component="span" sx={{
                          fontSize: "var(--text-2xs)", fontWeight: 700,
                          color: "var(--muted-foreground)", textTransform: "uppercase",
                          letterSpacing: "0.07em", mr: 1, fontFamily: "inherit",
                        }}>
                          Antes
                        </Typography>
                        <Typography component="span" sx={{
                          fontSize: "var(--text-xs)", color: "var(--muted-foreground)",
                          lineHeight: 1.6, fontFamily: "inherit",
                        }}>
                          {change.antes}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Divider */}
                    <Box sx={{ height: "1px", bgcolor: "var(--border)", mx: -2 }} />

                    {/* Ahora */}
                    <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                      <CheckCircle2
                        size={14}
                        style={{ color: "var(--success)", flexShrink: 0, marginTop: 3 }}
                      />
                      <Box>
                        <Typography component="span" sx={{
                          fontSize: "var(--text-2xs)", fontWeight: 700,
                          color: "var(--success)", textTransform: "uppercase",
                          letterSpacing: "0.07em", mr: 1, fontFamily: "inherit",
                        }}>
                          Ahora
                        </Typography>
                        {change.ahora.length === 1 ? (
                          <Typography component="span" sx={{
                            fontSize: "var(--text-xs)", color: "var(--foreground)",
                            lineHeight: 1.6, fontFamily: "inherit",
                          }}>
                            {change.ahora[0]}
                          </Typography>
                        ) : (
                          <Box
                            component="ul"
                            sx={{ m: 0, pl: "16px", mt: 0.5, display: "flex", flexDirection: "column", gap: 0.25 }}
                          >
                            {change.ahora.map((item, i) => (
                              <Box
                                key={i}
                                component="li"
                                sx={{
                                  fontSize: "var(--text-xs)", color: "var(--foreground)",
                                  lineHeight: 1.65, fontFamily: "inherit",
                                }}
                              >
                                {item}
                              </Box>
                            ))}
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* ── Footer note ── */}
        <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
          <Typography sx={{
            fontSize: "var(--text-2xs)", color: "var(--muted-foreground)",
            fontFamily: "inherit",
          }}>
            Preparado para futuras versiones · Solo lectura
          </Typography>
        </Box>

      </Box>
    </Box>
  );
}