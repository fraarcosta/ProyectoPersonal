// Route: GET /marketing-intelligence
"use client";

import React, { useState } from "react";
import { BarChart2, TrendingUp, Target } from "lucide-react";

import Box            from "@mui/material/Box";
import Typography     from "@mui/material/Typography";
import TextField      from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Button         from "@mui/material/Button";
import Paper          from "@mui/material/Paper";
import Chip           from "@mui/material/Chip";
import Table          from "@mui/material/Table";
import TableContainer from "@mui/material/TableContainer";
import TableHead      from "@mui/material/TableHead";
import TableBody      from "@mui/material/TableBody";
import TableRow       from "@mui/material/TableRow";
import TableCell      from "@mui/material/TableCell";
import Divider        from "@mui/material/Divider";
import Menu           from "@mui/material/Menu";
import MenuItem       from "@mui/material/MenuItem";
import FormGroup      from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox       from "@mui/material/Checkbox";
import SearchIcon     from "@mui/icons-material/Search";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";

import { STATUS_CONFIG } from "../../_components/ui";

// ─── Static data ──────────────────────────────────────────────────────────────

interface ResultRow {
  nombre:     string;
  cliente:    string;
  tipologia:  string;
  año:        string;
  valoracion: string;
  resultado:  string;
  presupuesto: string;
}

const RESULTS: ResultRow[] = [
  { nombre: "Transformación Digital AEAT",       cliente: "AEAT",        tipologia: "Servicios TI",               año: "2024", valoracion: "8.2 / 10", resultado: "Adjudicada",    presupuesto: "4.2M€" },
  { nombre: "Modernización SEPE",                cliente: "SEPE",        tipologia: "Servicios de consultoría",   año: "2024", valoracion: "7.9 / 10", resultado: "Adjudicada",    presupuesto: "2.8M€" },
  { nombre: "Plataforma Digital Catastro",       cliente: "DG Catastro", tipologia: "Servicios TI",               año: "2023", valoracion: "6.5 / 10", resultado: "No adjudicada", presupuesto: "3.1M€" },
  { nombre: "Sistema Gestión Documental MINHAP", cliente: "MINHAP",      tipologia: "Suministro software",        año: "2023", valoracion: "9.1 / 10", resultado: "Adjudicada",    presupuesto: "1.5M€" },
  { nombre: "Portal Ciudadano Seg. Social",      cliente: "Seg. Social", tipologia: "Servicios TI",               año: "2023", valoracion: "8.7 / 10", resultado: "Adjudicada",    presupuesto: "5.6M€" },
  { nombre: "Infraestructura Cloud DGT",         cliente: "DGT",         tipologia: "Suministro infraestructura", año: "2022", valoracion: "5.8 / 10", resultado: "No adjudicada", presupuesto: "7.3M€" },
];

const TIPOLOGIAS = ["Servicios TI", "Servicios de consultoría", "Suministro software", "Suministro infraestructura"];
const CLIENTES   = ["AEAT", "SEPE", "DG Catastro", "MINHAP", "Seg. Social", "DGT"];
const AÑOS       = ["2025", "2024", "2023", "2022", "2021"];

const KPIS = [
  { label: "Tasa de éxito",           value: "58%",  icon: <Target size={14} />,    color: "var(--primary)" },
  { label: "Licitaciones analizadas", value: "143",  icon: <BarChart2 size={14} />, color: "var(--accent)" },
  { label: "Crecimiento YoY",         value: "+12%", icon: <TrendingUp size={14} />,color: "var(--success)" },
];

const SORT_OPTIONS = ["Más reciente", "Valoración descendente", "Presupuesto descendente", "Cliente A–Z"];

const FALLBACK = { bg: "var(--muted)", color: "var(--muted-foreground)" };

// ─── FilterSection ─────────────────────────────────────────────────────────────

function FilterSection({ title, options }: { title: string; options: string[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggle = (o: string) => setSelected(prev => { const s = new Set(prev); s.has(o) ? s.delete(o) : s.add(o); return s; });
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="caption" fontWeight={600} sx={{ textTransform: "uppercase", letterSpacing: "0.06em", color: "text.secondary", display: "block", mb: 1 }}>
        {title}
      </Typography>
      <FormGroup>
        {options.map(o => (
          <FormControlLabel
            key={o}
            control={<Checkbox size="small" checked={selected.has(o)} onChange={() => toggle(o)} />}
            label={<Typography variant="caption">{o}</Typography>}
            sx={{ my: -0.25 }}
          />
        ))}
      </FormGroup>
    </Box>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AppMarketingIntelligencePage() {
  const [search, setSearch]     = useState("");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [sortLabel, setSortLabel] = useState("Más reciente");

  const rows = RESULTS.filter(r =>
    !search ||
    r.nombre.toLowerCase().includes(search.toLowerCase()) ||
    r.cliente.toLowerCase().includes(search.toLowerCase()) ||
    r.tipologia.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box sx={{ minHeight: "calc(100vh - var(--header-height))", bgcolor: "background.default", display: "flex", flexDirection: "column" }}>

      {/* Page header */}
      <Box sx={{ bgcolor: "background.paper", borderBottom: "1px solid var(--border)", px: 4, py: 3 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 3 }}>
          {/* Title + icon */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ width: 36, height: 36, bgcolor: "primary.main", borderRadius: "var(--radius)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BarChart2 size={18} style={{ color: "white" }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={600}>Marketing Intelligence</Typography>
              <Typography variant="body2" color="text.secondary">
                Analiza el histórico de licitaciones, benchmarks competitivos y tendencias del mercado de sector público.
              </Typography>
            </Box>
          </Box>

          {/* KPI cards */}
          <Box sx={{ display: "flex", gap: 2 }}>
            {KPIS.map(kpi => (
              <Paper key={kpi.label} variant="outlined" sx={{ px: 2, py: 1.5, minWidth: 120, borderRadius: "var(--radius)" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.5, color: kpi.color }}>
                  {kpi.icon}
                  <Typography variant="caption" fontWeight={600} sx={{ textTransform: "uppercase", letterSpacing: "0.04em", fontSize: "var(--text-3xs)", color: kpi.color }}>
                    {kpi.label}
                  </Typography>
                </Box>
                <Typography variant="h6" fontWeight={600} sx={{ color: kpi.color, lineHeight: 1.2 }}>{kpi.value}</Typography>
              </Paper>
            ))}
          </Box>
        </Box>

        {/* Search */}
        <TextField
          fullWidth
          size="small"
          placeholder="Buscar licitaciones por cliente, tipología, año, palabras clave..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18 }} /></InputAdornment>,
              endAdornment: (
                <InputAdornment position="end">
                  <Button variant="contained" size="small" onClick={() => {}} disableElevation>
                    Buscar
                  </Button>
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      {/* Content */}
      <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Filters sidebar */}
        <Box
          sx={{
            width: 220, flexShrink: 0,
            borderRight: "1px solid var(--border)",
            bgcolor: "background.paper",
            p: 3,
            overflowY: "auto",
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2.5 }}>
            <Typography variant="body2" fontWeight={600}>Filtros</Typography>
            <Button variant="text" size="small" color="inherit" sx={{ color: "text.secondary", fontSize: "var(--text-2xs)" }}>
              Limpiar
            </Button>
          </Box>
          <FilterSection title="Tipología" options={TIPOLOGIAS} />
          <Divider sx={{ my: 1 }} />
          <FilterSection title="Cliente"   options={CLIENTES} />
          <Divider sx={{ my: 1 }} />
          <FilterSection title="Año"       options={AÑOS} />
          <Button variant="contained" fullWidth size="small" sx={{ mt: 2 }}>
            Aplicar filtros
          </Button>
        </Box>

        {/* Results */}
        <Box sx={{ flex: 1, px: 3, py: 2.5, overflowY: "auto" }}>
          {/* Results toolbar */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="body2">
              <strong>{rows.length} resultados</strong>{" "}
              <span style={{ color: "var(--muted-foreground)" }}>encontrados</span>
            </Typography>
            <Button
              variant="outlined"
              size="small"
              color="inherit"
              endIcon={<UnfoldMoreIcon fontSize="small" />}
              onClick={e => setAnchorEl(e.currentTarget)}
            >
              {sortLabel}
            </Button>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
              {SORT_OPTIONS.map(o => (
                <MenuItem key={o} onClick={() => { setSortLabel(o); setAnchorEl(null); }}>
                  <Typography variant="body2">{o}</Typography>
                </MenuItem>
              ))}
            </Menu>
          </Box>

          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: "var(--radius)" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>LICITACIÓN</TableCell>
                  <TableCell>CLIENTE</TableCell>
                  <TableCell>TIPOLOGÍA</TableCell>
                  <TableCell sx={{ width: 60 }}>AÑO</TableCell>
                  <TableCell sx={{ width: 90 }}>PRESUPUESTO</TableCell>
                  <TableCell sx={{ width: 140 }}>VALORACIÓN</TableCell>
                  <TableCell sx={{ width: 120 }}>RESULTADO</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r, i) => {
                  const token = STATUS_CONFIG[r.resultado] ?? FALLBACK;
                  const pct   = (parseFloat(r.valoracion) / 10) * 100;
                  return (
                    <TableRow key={i} hover>
                      <TableCell><Typography variant="body2" fontWeight={600}>{r.nombre}</Typography></TableCell>
                      <TableCell><Typography variant="caption" color="text.secondary">{r.cliente}</Typography></TableCell>
                      <TableCell><Typography variant="caption" color="text.secondary">{r.tipologia}</Typography></TableCell>
                      <TableCell><Typography variant="caption">{r.año}</Typography></TableCell>
                      <TableCell><Typography variant="caption" fontWeight={600}>{r.presupuesto}</Typography></TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Box sx={{ flex: 1, height: 4, bgcolor: "var(--muted)", borderRadius: 2, maxWidth: 60 }}>
                            <Box sx={{ width: `${pct}%`, height: "100%", bgcolor: "primary.main", borderRadius: 2 }} />
                          </Box>
                          <Typography variant="caption" fontWeight={600} color="primary">{r.valoracion}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={r.resultado}
                          size="small"
                          sx={{
                            bgcolor: token.bg, color: token.color,
                            borderRadius: "var(--radius-chip)", height: 20, fontWeight: 600,
                            "& .MuiChip-label": { px: "10px", fontSize: "var(--text-2xs)" },
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Box>
    </Box>
  );
}