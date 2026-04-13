// Route: GET /ofertas/seleccionar
"use client";

import React, { useState, useEffect } from "react";
import { ChevronRight, Plus, CheckCircle2 } from "lucide-react";
import { useNav } from "../../../lib/routes/navigation";

import Box            from "@mui/material/Box";
import Typography     from "@mui/material/Typography";
import Button         from "@mui/material/Button";
import TextField      from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Table          from "@mui/material/Table";
import TableContainer from "@mui/material/TableContainer";
import TableHead      from "@mui/material/TableHead";
import TableBody      from "@mui/material/TableBody";
import TableRow       from "@mui/material/TableRow";
import TableCell      from "@mui/material/TableCell";
import Paper          from "@mui/material/Paper";
import Chip           from "@mui/material/Chip";
import Divider        from "@mui/material/Divider";
import ArrowLeftIcon  from "@mui/icons-material/ArrowLeft";
import SearchIcon     from "@mui/icons-material/Search";

import { STATUS_CONFIG }            from "../../_components/ui";
import { getAuthUser }              from "../../_components/auth-store";
import { getOpportunitiesForUser }  from "../../_components/opportunities-store";

// ─── Data ─────────────────────────────────────────────────────────────────────

interface Opportunity {
  id:     string;
  name:   string;
  client: string;
  code:   string;
  year:   string;
  estado: string;
  team:   number;
}

// Valid statuses — "En revisión" has been removed from the workflow
const VALID_STATUSES = ["En curso", "Adjudicada", "Descartada"] as const;
type ValidStatus = typeof VALID_STATUSES[number];

// Static demo opportunities — "En revisión" entries excluded
const STATIC_OPPORTUNITIES: Opportunity[] = [
  { id: "OPP-2025-001", name: "Transformación Digital AEAT",          client: "Agencia Estatal de Administración Tributaria",     code: "EXP-AEAT-2025-004",     year: "2025", estado: "En curso",   team: 6 },
  { id: "OPP-2024-018", name: "Sistema de Información SEPE Next",     client: "Servicio Público de Empleo Estatal",               code: "EXP-SEPE-2024-018",     year: "2024", estado: "Adjudicada", team: 8 },
  { id: "OPP-2024-015", name: "Modernización Catastro 360",           client: "Dirección General del Catastro",                   code: "EXP-CATASTRO-2024-015", year: "2024", estado: "Adjudicada", team: 5 },
  { id: "OPP-2024-009", name: "Infraestructura Cloud DGT",            client: "Dirección General de Tráfico",                     code: "EXP-DGT-2024-009",      year: "2024", estado: "Descartada", team: 3 },
];

const FALLBACK = { bg: "var(--muted)", color: "var(--muted-foreground)" };

// ─── Filter chip config ────────────────────────────────────────────────────────

interface FilterOption {
  value: ValidStatus | "Todos";
  label: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  { value: "Todos",      label: "Todos" },
  { value: "En curso",   label: "En curso" },
  { value: "Adjudicada", label: "Adjudicada" },
  { value: "Descartada", label: "Descartada" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AppSelectOpportunityPage() {
  const nav    = useNav();
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState<ValidStatus | "Todos">("Todos");
  const [createdFlash, setCreatedFlash] = useState<{ count: number } | null>(null);

  // Lee y limpia el flash de sesión al montar
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("opp-created-flash");
      if (raw) {
        setCreatedFlash(JSON.parse(raw) as { count: number });
        sessionStorage.removeItem("opp-created-flash");
      }
    } catch {}
    // Auto-dismiss después de 5 s
    const t = setTimeout(() => setCreatedFlash(null), 5000);
    return () => clearTimeout(t);
  }, []);

  // Merge static + dynamic (created by or shared with current user)
  const currentUser   = getAuthUser();
  const staticIds     = new Set(STATIC_OPPORTUNITIES.map(o => o.id));
  const dynamicRows: Opportunity[] = getOpportunitiesForUser(currentUser.id)
    .filter(opp => !staticIds.has(opp.id))
    .filter(opp => opp.estado !== "En revisión")
    .map(opp => ({
      id:     opp.id,
      name:   opp.nombre,
      client: opp.cliente || "—",
      code:   opp.codigo  || "—",
      year:   opp.anno    || String(new Date().getFullYear()),
      estado: opp.estado,
      team:   opp.colaboradores.length + 1,
    }));

  const OPPORTUNITIES: Opportunity[] = [...dynamicRows, ...STATIC_OPPORTUNITIES];

  const rows = OPPORTUNITIES.filter(o => {
    const matchSearch =
      !search ||
      o.name.toLowerCase().includes(search.toLowerCase())   ||
      o.client.toLowerCase().includes(search.toLowerCase()) ||
      o.code.toLowerCase().includes(search.toLowerCase());

    const matchStatus =
      statusFilter === "Todos" || o.estado === statusFilter;

    return matchSearch && matchStatus;
  });

  // Count per status for badge display
  const countByStatus = (status: ValidStatus) =>
    OPPORTUNITIES.filter(o => o.estado === status).length;

  return (
    <Box sx={{ minHeight: "calc(100vh - var(--header-height))", bgcolor: "background.default" }}>

      {/* Sub-header */}
      <Box sx={{ bgcolor: "background.paper", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 2, px: 4, height: 52 }}>
        <Button variant="text" color="inherit" size="small" startIcon={<ArrowLeftIcon />} onClick={() => nav.home()} sx={{ color: "text.secondary" }}>
          Volver
        </Button>
        <Divider orientation="vertical" flexItem sx={{ my: 1 }} />
        <Typography variant="body2" fontWeight={600}>Oportunidades existentes</Typography>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" size="small" startIcon={<Plus size={14} />} onClick={() => nav.prospects.new()}>
          Nueva oportunidad
        </Button>
      </Box>

      <Box sx={{ px: 4, py: 4 }}>

        {/* ── Flash de creación ── */}
        {createdFlash && (
          <div
            style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "10px 16px",
              marginBottom: "20px",
              borderRadius: "var(--radius-banner)",
              background: "var(--success-subtle)",
              border: "1px solid var(--success)",
              maxWidth: "640px",
            }}
          >
            <CheckCircle2 size={15} style={{ color: "var(--success)", flexShrink: 0 }} />
            <span style={{ fontSize: "var(--text-sm)", color: "var(--success)", fontFamily: "inherit" }}>
              {createdFlash.count > 1
                ? `${createdFlash.count} oportunidades creadas correctamente.`
                : "Oportunidad creada correctamente."}
            </span>
          </div>
        )}

        {/* Intro */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>Espacio de trabajo</Typography>
          <Typography variant="body2" color="text.secondary">
            Selecciona una oportunidad para acceder a su espacio de trabajo
          </Typography>
        </Box>

        {/* ── Toolbar: Search + Status filter ── */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3, flexWrap: "wrap" }}>
          <TextField
            size="small"
            placeholder="Buscar por nombre, cliente o código..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            sx={{ width: 380 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                  </InputAdornment>
                ),
              },
            }}
          />

          {/* Divider visual */}
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

          {/* Status filter chips */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5, whiteSpace: "nowrap" }}>
              Estado:
            </Typography>
            {FILTER_OPTIONS.map(opt => {
              const isActive = statusFilter === opt.value;
              const token = opt.value !== "Todos" ? (STATUS_CONFIG[opt.value] ?? FALLBACK) : null;
              const count  = opt.value !== "Todos" ? countByStatus(opt.value as ValidStatus) : OPPORTUNITIES.length;

              return (
                <Chip
                  key={opt.value}
                  label={
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      {opt.label}
                      <span
                        style={{
                          display:         "inline-flex",
                          alignItems:      "center",
                          justifyContent:  "center",
                          minWidth:        16,
                          height:          16,
                          borderRadius:    "var(--radius-chip)",
                          padding:         "0 4px",
                          fontSize:        "var(--text-3xs)",
                          fontWeight:      700,
                          background:      isActive
                            ? "rgba(255,255,255,0.25)"
                            : "var(--muted)",
                          color: isActive
                            ? "inherit"
                            : "var(--muted-foreground)",
                        }}
                      >
                        {count}
                      </span>
                    </span>
                  }
                  size="small"
                  clickable
                  onClick={() => setStatusFilter(opt.value)}
                  sx={{
                    height:       26,
                    borderRadius: "var(--radius-chip)",
                    fontWeight:   isActive ? 600 : 400,
                    border:       isActive
                      ? "1.5px solid transparent"
                      : "1.5px solid var(--border)",
                    bgcolor: isActive
                      ? (token ? token.bg : "var(--foreground)")
                      : "transparent",
                    color: isActive
                      ? (token ? token.color : "var(--background)")
                      : "var(--muted-foreground)",
                    transition: "all 0.15s ease",
                    "&:hover": {
                      bgcolor: isActive
                        ? (token ? token.bg : "var(--foreground)")
                        : "var(--muted)",
                      opacity: 0.9,
                    },
                    "& .MuiChip-label": {
                      px:       "10px",
                      fontSize: "var(--text-xs)",
                    },
                  }}
                />
              );
            })}
          </Box>
        </Box>

        {/* Table */}
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: "var(--radius)" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>NOMBRE OPORTUNIDAD</TableCell>
                <TableCell>CLIENTE</TableCell>
                <TableCell>CÓDIGO</TableCell>
                <TableCell sx={{ width: 60 }}>AÑO</TableCell>
                <TableCell sx={{ width: 120 }}>ESTADO</TableCell>
                <TableCell sx={{ width: 80 }}>EQUIPO</TableCell>
                <TableCell sx={{ width: 40 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: "text.secondary" }}>
                    No se encontraron oportunidades
                    {statusFilter !== "Todos" && (
                      <span>
                        {" "}con estado <strong>{statusFilter}</strong>
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ) : rows.map(row => {
                const token = STATUS_CONFIG[row.estado] ?? FALLBACK;
                return (
                  <TableRow
                    key={row.id}
                    hover
                    sx={{ cursor: "pointer" }}
                    onClick={() => nav.workspace.to(row.id)}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{row.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{row.id}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 220, display: "block" }}>
                        {row.client}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: "monospace" }}>{row.code}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">{row.year}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={row.estado}
                        size="small"
                        sx={{
                          bgcolor: token.bg, color: token.color,
                          borderRadius: "var(--radius-chip)", height: 20, fontWeight: 600,
                          "& .MuiChip-label": { px: "10px", fontSize: "var(--text-2xs)" },
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">{row.team} personas</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <ChevronRight size={16} style={{ color: "var(--muted-foreground)" }} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
          Mostrando {rows.length} oportunidad{rows.length !== 1 ? "es" : ""}
          {statusFilter !== "Todos" && ` · filtrado por "${statusFilter}"`}
          {dynamicRows.length > 0 && ` (${dynamicRows.length} creada${dynamicRows.length !== 1 ? "s" : ""} recientemente)`}
        </Typography>
      </Box>
    </Box>
  );
}