// Next.js equivalent: app/(dashboard)/workspace/[id]/_components/eco-simulacion-content.tsx
// Línea Económica → Análisis económico → Configuración y simulación.
// Persistencia INDIVIDUAL por usuario + oportunidad. Sin valores hardcodeados.
"use client";


import { useState, useCallback, useRef, useEffect, type CSSProperties, type ReactNode } from "react";
import {
  Calculator, ChevronDown, ChevronRight, Plus, Trash2,
  Sparkles, Loader2, Download, AlertTriangle, CheckCircle2,
  AlertCircle, X, RefreshCw, User, Settings, Info, Trophy, ImagePlus, Lock,
  ListChecks,
} from "lucide-react";
import { AppButton } from "../../../../_components/ui";
import { getAuthUser } from "../../../../_components/auth-store";
import { getOpportunities } from "../../../../_components/opportunities-store";
import { useWorkspaceReadonly } from "./workspace-readonly-context";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Partida {
  id:            string;
  nombre:        string;
  formula:       string;
  presupuesto:   string;
  puntuacionMax: string;
  bajatemeraria: string;
  observaciones: string;
}

interface TablaDatos {
  partidaId:     string;
  partidaNombre: string;
  presupuesto:   number;
  puntuacionMax: number;
  bajatemeraria: string;
  descuentos:    string[];
}

interface SimMeta { at: string; by: string; }

interface FieldErrors {
  desgloseEmpty: boolean;
  partidas: Record<string, Set<string>>;
}

interface PersistedState {
  configPhase:       "initial" | "ready";
  hasDesglose:       "si" | "no" | "";
  partidas:          Partida[];
  numEmpresas:       number;
  simPhase:          "none" | "done";
  tablaDatos:        TablaDatos[];
  simMeta:           SimMeta | null;
  simConfigSnapshot: string | null;
  configCollapsed:   boolean;
  resultsExpanded:   boolean;
  collapsedTables:   string[];
}

// ─── Storage ─────────────────────────────────────────────────────────────────

const simKey = (oppId: string, userId: string) => `eco-sim-${oppId}-${userId}`;

function readState(oppId: string, userId: string): PersistedState | null {
  try {
    const raw = localStorage.getItem(simKey(oppId, userId));
    return raw ? (JSON.parse(raw) as PersistedState) : null;
  } catch { return null; }
}
function saveState(oppId: string, userId: string, data: PersistedState) {
  try { localStorage.setItem(simKey(oppId, userId), JSON.stringify(data)); } catch {}
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

let _idN = 0;
const newId = () => `pid-${Date.now()}-${++_idN}`;

const parseDisc = (s: string): number => {
  const n = parseFloat(s.replace(",", "."));
  return isNaN(n) ? 0 : Math.max(0, Math.min(100, n));
};
const fmtEuro = (n: number) => new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(n);
const fmtPts  = (n: number) => n.toFixed(2);
const today   = () => new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });

function initDiscounts(n: number): string[] {
  if (n === 1) return ["10"];
  const min = 3, max = 25;
  return Array.from({ length: n }, (_, i) => String(Math.round(min + (max - min) * i / (n - 1))));
}

function extractBTThreshold(text: string): number | null {
  if (!text) return null;
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*%/);
  return m ? parseFloat(m[1].replace(",", ".")) : null;
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

function calcPuntuacion(desc: number, presupuesto: number, puntuacionMax: number, allDescs: number[]): number {
  if (presupuesto <= 0 || puntuacionMax <= 0) return 0;
  const offer   = presupuesto * (1 - desc / 100);
  const allOff  = allDescs.map(d => presupuesto * (1 - d / 100));
  const minOff  = Math.min(...allOff);
  const range   = presupuesto - minOff;
  if (range < 0.01) return minOff < presupuesto ? puntuacionMax : 0;
  return Math.max(0, Math.min(puntuacionMax, puntuacionMax * (presupuesto - offer) / range));
}

// ─── Ranking ─────────────────────────────────────────────────────────────────
// Ordenar por puntuación desc. Empate: menor descuento (menor rebaja) gana.

function calcRanking(puntuaciones: number[], descuentos: number[]): number[] {
  const indexed = puntuaciones.map((pts, i) => ({ pts, desc: descuentos[i], i }));
  const sorted  = [...indexed].sort((a, b) =>
    Math.abs(b.pts - a.pts) > 0.001 ? b.pts - a.pts : a.desc - b.desc
  );
  const rankMap = new Map(sorted.map((item, idx) => [item.i, idx + 1]));
  return puntuaciones.map((_, i) => rankMap.get(i) ?? 1);
}

// ─── Mock extraction ──────────────────────────────────────────────────────────

/** Parse Spanish-format presupuesto string → number.
 *  "4.250.000"    → 4 250 000
 *  "4.250.000,50" → 4 250 000.5
 *  "4250000"      → 4 250 000
 */
function parsePresupuesto(raw: string): number {
  const cleaned = raw.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) || n <= 0 ? 2_400_000 : n;
}

function mockExtract(oppId: string) {
  // Standard formula and BT used in all mock extractions
  const FORMULA_STD =
    "P = Pmáx × (Ob − Oi) / (Ob − Omín), donde Ob = presupuesto base s/IVA, " +
    "Oi = precio ofertado, Omín = oferta más baja del panel";
  const BT_STD = "No superar el 20% de baja sobre el presupuesto base de licitación";

  // ── Try to read real data from the store ─────────────────────────────────
  const opp = getOpportunities().find(o => o.id === oppId);

  if (!opp) {
    // Demo / legacy IDs not in store — still fill with useful defaults
    return {
      hasDocs: true, hasDesglose: "no" as const, numEmpresas: 5,
      partidas: [{
        id: newId(), nombre: "Fórmula económica (global)",
        formula: FORMULA_STD, presupuesto: "2400000",
        puntuacionMax: "30", bajatemeraria: BT_STD,
        observaciones: "Extraído del PCAP — Criterio A1, Apartado 5 — Oferta económica",
      }],
    };
  }

  // ── Parse real budget & lot data ─────────────────────────────────────────
  const presTotal    = parsePresupuesto(opp.presupuesto);
  const tieneLottesN = (opp.tieneLottes ?? "").toLowerCase();
  const hasLotes     = tieneLottesN === "si" && Array.isArray(opp.lotes) && opp.lotes.length > 1;

  if (hasLotes) {
    // One partida per lote; presupuesto split evenly across lotes
    const perLote   = Math.round(presTotal / opp.lotes.length);
    const partidas  = opp.lotes.map((nombre, idx) => ({
      id:            newId(),
      nombre:        nombre.trim() || `Lote ${idx + 1}`,
      formula:       FORMULA_STD,
      presupuesto:   String(perLote),
      puntuacionMax: "30",
      bajatemeraria: BT_STD,
      observaciones: `Extraído del PCAP — Lote ${idx + 1}`,
    }));
    return { hasDocs: true, hasDesglose: "si" as const, numEmpresas: 5, partidas };
  }

  // Single global partida using real budget
  return {
    hasDocs: true, hasDesglose: "no" as const, numEmpresas: 5,
    partidas: [{
      id:            newId(),
      nombre:        "Fórmula económica (global)",
      formula:       FORMULA_STD,
      presupuesto:   String(Math.round(presTotal)),
      puntuacionMax: "30",
      bajatemeraria: BT_STD,
      observaciones: "Extraído del PCAP — Criterio A1, Apartado 5 — Oferta económica",
    }],
  };
}

// ─── Excel export ─────────────────────────────────────────────────────────────

function exportToExcel(tablaDatos: TablaDatos[], numEmpresas: number, oppName: string) {
  const hdrs  = Array.from({ length: numEmpresas }, (_, i) => `Empresa ${i + 1}`);
  const style = `<style>
    body{font-family:Calibri,Arial,sans-serif;font-size:11pt}
    table{border-collapse:collapse;margin-bottom:24pt}
    th,td{border:1px solid #bbb;padding:4pt 8pt;text-align:right;white-space:nowrap}
    th{background:#e8eaf6;text-align:center;font-weight:bold}
    .label{text-align:left;min-width:200pt} .hero{font-weight:bold;font-size:12pt}
    .pos1{background:#f3f0ff} h3{font-size:12pt;margin:12pt 0 4pt}
  </style>`;

  const buildTableHTML = (t: TablaDatos, isGlobal = false, gd?: { precios: number[]; punts: number[]; maxTotal: number; rebajados: number[] }): string => {
    const allDescs = t.descuentos.map(parseDisc);
    const punts    = Array.from({ length: numEmpresas }, (_, i) => isGlobal && gd ? gd.punts[i] : calcPuntuacion(allDescs[i], t.presupuesto, t.puntuacionMax, allDescs));
    const maxTotal = isGlobal && gd ? gd.maxTotal : t.puntuacionMax;
    const ranks    = calcRanking(punts, isGlobal ? Array(numEmpresas).fill(0) : allDescs);
    let rows = "";
    if (!isGlobal) rows += `<tr><td class="label">Descuento (%)</td>${hdrs.map((_, i) => `<td>${fmtPts(allDescs[i])}%</td>`).join("")}</tr>`;
    rows += `<tr><td class="label">Precio ofertado (€)</td>${hdrs.map((_, i) => { const p = isGlobal && gd ? gd.precios[i] : t.presupuesto * (1 - allDescs[i] / 100); return `<td>${fmtEuro(p)}</td>`; }).join("")}</tr>`;
    rows += `<tr class="hero"><td class="label">Puntuación total (p)</td>${hdrs.map((_, i) => `<td${ranks[i] === 1 ? " class=\"pos1\"" : ""}>${fmtPts(punts[i])}</td>`).join("")}</tr>`;
    rows += `<tr><td class="label">Posición (ranking)</td>${hdrs.map((_, i) => `<td>#${ranks[i]}</td>`).join("")}</tr>`;
    rows += `<tr><td class="label">Puntos perdidos vs máx. (p)</td>${hdrs.map((_, i) => `<td>−${fmtPts(maxTotal - punts[i])}</td>`).join("")}</tr>`;
    rows += `<tr><td class="label">€ rebajados vs base (€)</td>${hdrs.map((_, i) => { const r = isGlobal && gd ? gd.rebajados[i] : t.presupuesto * allDescs[i] / 100; return `<td>−${fmtEuro(r)}</td>`; }).join("")}</tr>`;
    return `<h3>${t.partidaNombre}</h3><table><thead><tr><th class="label">Variable</th>${hdrs.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>`;
  };

  let html = `<html><head><meta charset="UTF-8">${style}</head><body><h2>Simulación Económica — ${oppName}</h2>`;
  tablaDatos.forEach(t => { html += buildTableHTML(t); });
  if (tablaDatos.length > 1) {
    const precios   = Array.from({ length: numEmpresas }, (_, i) => tablaDatos.reduce((s, t) => s + t.presupuesto * (1 - parseDisc(t.descuentos[i]) / 100), 0));
    const punts     = Array.from({ length: numEmpresas }, (_, i) => tablaDatos.reduce((s, t) => s + calcPuntuacion(parseDisc(t.descuentos[i]), t.presupuesto, t.puntuacionMax, t.descuentos.map(parseDisc)), 0));
    const maxTotal  = tablaDatos.reduce((s, t) => s + t.puntuacionMax, 0);
    const rebajados = Array.from({ length: numEmpresas }, (_, i) => tablaDatos.reduce((s, t) => s + t.presupuesto * parseDisc(t.descuentos[i]) / 100, 0));
    const dummy: TablaDatos = { partidaId: "g", partidaNombre: "GLOBAL (agregado)", presupuesto: 0, puntuacionMax: 0, bajatemeraria: "", descuentos: Array(numEmpresas).fill("0") };
    html += buildTableHTML(dummy, true, { precios, punts, maxTotal, rebajados });
  }
  html += "</body></html>";
  const blob = new Blob([html], { type: "application/vnd.ms-excel" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = `Simulacion_${oppName.replace(/\s+/g, "_")}.xls`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ─── SimTableView ─────────────────────────────────────────────────────────────
// Empresas = FILAS · Columnas fijas = Empresa | Descuento | Precio | Puntuación | Análisis
// Sin scroll horizontal. Scroll vertical únicamente si hay muchas empresas.

interface SimTableViewProps {
  tabla:             TablaDatos;
  numEmpresas:       number;
  isOpen:            boolean;
  onToggle:          () => void;
  onUpdateDiscount?: (idx: number, value: string) => void;
  isGlobal?:         boolean;
  allTablaDatos?:    TablaDatos[];
}

function SimTableView({ tabla, numEmpresas, isOpen, onToggle, onUpdateDiscount, isGlobal = false, allTablaDatos }: SimTableViewProps) {
  const btThreshold = extractBTThreshold(tabla.bajatemeraria);
  const allDescs    = tabla.descuentos.map(parseDisc);

  // ── Valores computados por empresa ──────────────────────────────────────────
  const computedPunts: number[] = Array.from({ length: numEmpresas }, (_, i) => {
    if (isGlobal && allTablaDatos) {
      return allTablaDatos.reduce((s, t) => s + calcPuntuacion(parseDisc(t.descuentos[i]), t.presupuesto, t.puntuacionMax, t.descuentos.map(parseDisc)), 0);
    }
    return calcPuntuacion(allDescs[i], tabla.presupuesto, tabla.puntuacionMax, allDescs);
  });

  const maxTotal = isGlobal && allTablaDatos
    ? allTablaDatos.reduce((s, t) => s + t.puntuacionMax, 0)
    : tabla.puntuacionMax;

  const computedPrecios: number[] = Array.from({ length: numEmpresas }, (_, i) => {
    if (isGlobal && allTablaDatos) return allTablaDatos.reduce((s, t) => s + t.presupuesto * (1 - parseDisc(t.descuentos[i]) / 100), 0);
    return tabla.presupuesto * (1 - allDescs[i] / 100);
  });

  const computedRebajados: number[] = Array.from({ length: numEmpresas }, (_, i) => {
    if (isGlobal && allTablaDatos) return allTablaDatos.reduce((s, t) => s + t.presupuesto * parseDisc(t.descuentos[i]) / 100, 0);
    return tabla.presupuesto * allDescs[i] / 100;
  });

  const ranks = calcRanking(computedPunts, isGlobal ? Array(numEmpresas).fill(0) : allDescs);

  // ── Shared cell styles ───────────────────────────────────────────────────────
  const bd = "1px solid var(--border)";

  const thSt: CSSProperties = {
    padding:      "10px 14px",
    fontSize:     "var(--text-xs)",
    fontWeight:   "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
    color:        "var(--muted-foreground)",
    background:   "var(--muted)",
    borderBottom: bd,
    borderRight:  bd,
    fontFamily:   "inherit",
    textAlign:    "left",
    whiteSpace:   "nowrap",
  };

  const tdSt: CSSProperties = {
    padding:       "12px 14px",
    fontSize:      "var(--text-xs)",
    color:         "var(--foreground)",
    borderBottom:  bd,
    borderRight:   bd,
    fontFamily:    "inherit",
    verticalAlign: "middle",
  };

  return (
    <div className="border border-border bg-card" style={{ borderRadius: "var(--radius)" }}>

      {/* Cabecera colapsable */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between hover:bg-muted transition-colors"
        style={{
          padding: "12px 16px", background: "none", border: "none", cursor: "pointer",
          borderBottom: isOpen ? "1px solid var(--border)" : "none", fontFamily: "inherit",
          borderRadius: isOpen ? "var(--radius) var(--radius) 0 0" : "var(--radius)",
        }}
      >
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronDown size={14} style={{ color: "var(--muted-foreground)" }} /> : <ChevronRight size={14} style={{ color: "var(--muted-foreground)" }} />}
          <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], color: "var(--foreground)", fontFamily: "inherit" }}>
            {tabla.partidaNombre}
          </span>
          {isGlobal && (
            <span style={{ fontSize: "var(--text-3xs)", padding: "1px 8px", borderRadius: "var(--radius-chip)", background: "var(--success-subtle)", color: "var(--success)", fontFamily: "inherit", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], letterSpacing: "0.04em" }}>
              AGREGADO
            </span>
          )}
          {!isGlobal && btThreshold !== null && (
            <span style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
              — umbral BT: {btThreshold}%
            </span>
          )}
        </div>
        <span style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
          {isOpen ? "Contraer" : "Expandir"}
        </span>
      </button>

      {/* ── Tabla: empresas como filas, columnas fijas, sin scroll horizontal ── */}
      {isOpen && (
        <div style={{ overflowX: "hidden", overflowY: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed" }}>

            {/* Anchos de columna — proporcionales, sin desbordamiento */}
            <colgroup>
              <col style={{ width: "13%" }} />
              {!isGlobal && <col style={{ width: "17%" }} />}
              <col style={{ width: isGlobal ? "25%" : "18%" }} />
              <col style={{ width: isGlobal ? "27%" : "22%" }} />
              <col />
            </colgroup>

            {/* Cabecera de columnas */}
            <thead>
              <tr>
                <th style={thSt}>Empresa</th>
                {!isGlobal && (
                  <th style={{ ...thSt, color: "var(--primary)" }}>
                    Descuento
                    <span style={{ marginLeft: "5px", fontSize: "var(--text-3xs)", opacity: 0.75, fontFamily: "inherit" }}>editable</span>
                  </th>
                )}
                <th style={{ ...thSt, textAlign: "right" }}>Precio ofertado (€)</th>
                <th style={{ ...thSt, textAlign: "right", color: "var(--success)" }}>Puntuación (p)</th>
                <th style={{ ...thSt, borderRight: "none" }}>Análisis</th>
              </tr>
            </thead>

            {/* Una fila por empresa */}
            <tbody>
              {Array.from({ length: numEmpresas }, (_, i) => {
                const d         = parseDisc(tabla.descuentos[i] ?? "0");
                const isBT      = !isGlobal && btThreshold !== null && d > btThreshold;
                const pts       = computedPunts[i];
                const rank      = ranks[i];
                const isFirst   = rank === 1;
                const lost      = maxTotal - pts;
                const rebajados = computedRebajados[i];
                const precio    = computedPrecios[i];

                // Fila #1: fondo lila suave (primary-subtle)
                const rowBg = isFirst ? "var(--primary-subtle)" : "var(--card)";

                return (
                  <tr key={i}>

                    {/* ── Col 1: Empresa + badge ranking ── */}
                    <td style={{ ...tdSt, background: rowBg }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        <span style={{
                          fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                          color: isFirst ? "var(--primary)" : "var(--foreground)",
                          fontFamily: "inherit",
                          fontSize: "var(--text-xs)",
                        }}>
                          Empresa {i + 1}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          {isFirst && <Trophy size={11} style={{ color: "var(--primary)", flexShrink: 0 }} />}
                          <span style={{
                            display: "inline-flex", alignItems: "center",
                            padding: "1px 6px", borderRadius: "var(--radius-chip)",
                            fontSize: "var(--text-3xs)",
                            fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                            background: isFirst ? "var(--primary)" : "var(--neutral-subtle)",
                            color:      isFirst ? "var(--primary-foreground)" : "var(--muted-foreground)",
                            fontFamily: "inherit", letterSpacing: "0.02em",
                          }}>
                            #{rank}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* ── Col 2: Descuento editable (solo no-global) ── */}
                    {!isGlobal && (
                      <td style={{
                        ...tdSt,
                        background:  isBT ? "var(--warning-subtle)" : rowBg,
                        borderLeft:  isBT ? "2px solid var(--destructive)" : bd,
                        borderRight: isBT ? "1px solid var(--destructive)" : bd,
                      }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {/* Input con borde primario/rojo */}
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <input
                              type="number" min={0} max={100} step={0.5}
                              value={tabla.descuentos[i] ?? "0"}
                              onChange={(e) => onUpdateDiscount?.(i, e.target.value)}
                              style={{
                                width: "66px", padding: "5px 8px",
                                border: `2px solid ${isBT ? "var(--destructive)" : "var(--primary)"}`,
                                borderRadius: "var(--radius-input)",
                                background: "var(--input-background)",
                                color: isBT ? "var(--destructive)" : "var(--foreground)",
                                fontSize: "var(--text-sm)",
                                fontFamily: "inherit",
                                fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                                outline: "none", textAlign: "right",
                              }}
                              onFocus={(e) => { e.target.style.boxShadow = "0 0 0 2px var(--primary)"; }}
                              onBlur={(e)  => { e.target.style.boxShadow = "none"; }}
                            />
                            <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>%</span>
                          </div>
                          {/* Badge baja temeraria: rojo sólido */}
                          {isBT && (
                            <span style={{
                              alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: "3px",
                              padding: "2px 6px", borderRadius: "var(--radius-chip)",
                              fontSize: "var(--text-3xs)",
                              fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                              background: "var(--destructive)", color: "var(--destructive-foreground)",
                              fontFamily: "inherit", letterSpacing: "0.03em", whiteSpace: "nowrap",
                            }}>
                              <AlertTriangle size={9} />
                              Baja temeraria
                            </span>
                          )}
                        </div>
                      </td>
                    )}

                    {/* ── Col 3: Precio ofertado (calculado, no editable) ── */}
                    <td style={{ ...tdSt, background: rowBg, textAlign: "right" }}>
                      <span style={{ color: "var(--muted-foreground)", fontFamily: "inherit", fontSize: "var(--text-xs)" }}>
                        {fmtEuro(precio)} €
                      </span>
                    </td>

                    {/* ── Col 4: Puntuación total — dato héroe ── */}
                    <td style={{ ...tdSt, background: rowBg, textAlign: "right" }}>
                      <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
                        {/* Valor principal: grande, bold, verde */}
                        <div style={{ display: "flex", alignItems: "baseline", gap: "3px" }}>
                          <span style={{
                            fontSize: "var(--text-xl)",
                            fontWeight: "var(--font-weight-bold)" as CSSProperties["fontWeight"],
                            color: "var(--success)",
                            fontFamily: "inherit", lineHeight: 1.1,
                          }}>
                            {fmtPts(pts)}
                          </span>
                          <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>p</span>
                        </div>
                        <span style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
                          de {fmtPts(maxTotal)} p máx.
                        </span>
                      </div>
                    </td>

                    {/* ── Col 5: Análisis — 3 métricas compactas ── */}
                    <td style={{ ...tdSt, background: rowBg, borderRight: "none" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>

                        {/* Posición */}
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit", minWidth: "76px" }}>
                            Posición
                          </span>
                          <span style={{
                            fontSize: "var(--text-xs)",
                            fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                            color: isFirst ? "var(--primary)" : "var(--foreground)",
                            fontFamily: "inherit",
                          }}>
                            #{rank}
                          </span>
                        </div>

                        {/* Puntos perdidos */}
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit", minWidth: "76px" }}>
                            Pts perdidos
                          </span>
                          <span style={{
                            fontSize: "var(--text-xs)",
                            fontWeight: "var(--font-weight-medium)" as CSSProperties["fontWeight"],
                            color: lost > 0.01 ? "var(--destructive)" : "var(--success)",
                            fontFamily: "inherit",
                          }}>
                            {lost > 0.01 ? `−${fmtPts(lost)} p` : "−0 p"}
                          </span>
                        </div>

                        {/* € rebajados */}
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit", minWidth: "76px" }}>
                            € rebajados
                          </span>
                          <span style={{
                            fontSize: "var(--text-xs)",
                            fontWeight: "var(--font-weight-medium)" as CSSProperties["fontWeight"],
                            color: "var(--muted-foreground)",
                            fontFamily: "inherit",
                          }}>
                            −{fmtEuro(rebajados)} €
                          </span>
                        </div>

                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Fórmulas detectadas en el pliego (mock) ─────────────────────────────────

interface FormulaDetectada {
  id: string; nombre: string; formula: string;
  presupuesto: string; presupuestoN: number; puntuacionMax: number;
  bajatemeraria: string; observaciones: string; fuente: string;
}

const FORMULAS_DETECTADAS: FormulaDetectada[] = [
  {
    id: "fd-1", nombre: "Fórmula principal — Oferta económica global",
    formula: "P = Pmáx × (Ob − Oi) / (Ob − Omín), donde Ob = presupuesto base s/IVA, Oi = precio ofertado, Omín = oferta más baja del panel",
    presupuesto: "4.250.000", presupuestoN: 4250000, puntuacionMax: 30,
    bajatemeraria: "No superar el 20% de baja sobre el presupuesto base de licitación",
    observaciones: "Criterio económico principal — Sobre C", fuente: "PCAP — pág. 12, Apartado 5.1",
  },
  {
    id: "fd-2", nombre: "Fórmula Lote 2 — Servicios complementarios",
    formula: "P = Pmáx × [1 − (Oi − Omín) / (Ob − Omín)]",
    presupuesto: "1.850.000", presupuestoN: 1850000, puntuacionMax: 20,
    bajatemeraria: "Descuento superior al 15% considerado temerario",
    observaciones: "Aplicable al Lote 2 — Servicios complementarios", fuente: "PPT — pág. 45, Cláusula 8.3",
  },
  {
    id: "fd-3", nombre: "Fórmula exponencial — Eficiencia económica",
    formula: "P = Pmáx × e^[−k × (Oi/Ob − 1)], con k = 3",
    presupuesto: "2.400.000", presupuestoN: 2400000, puntuacionMax: 25,
    bajatemeraria: "",
    observaciones: "Fórmula exponencial para criterio de eficiencia", fuente: "PCAP — pág. 18, Apartado 6",
  },
  {
    id: "fd-4", nombre: "Fórmula complementaria — Umbral de temeridad reforzado",
    formula: "P = Pmáx × (Ob − Oi) / (Ob − Omín) si Oi ≥ Omín; P = Pmáx si Oi < Omín",
    presupuesto: "950.000", presupuestoN: 950000, puntuacionMax: 15,
    bajatemeraria: "Umbral de temeridad: 25% sobre presupuesto base de licitación",
    observaciones: "Puede combinarse con el criterio principal", fuente: "Pliego técnico — pág. 32",
  },
];

// ─── AppEcoSimulacionContent ──────────────────────────────────────────────────

interface AppEcoSimulacionContentProps {
  oppId:   string;
  oppName: string;
}

export function AppEcoSimulacionContent({ oppId, oppName }: AppEcoSimulacionContentProps) {
  const user      = getAuthUser();
  const userId    = user.id ?? user.name ?? "anon";
  const persisted = readState(oppId, userId);
  const { isReadOnly } = useWorkspaceReadonly();

  // ── Config state ──────────────────────────────────────────────────────────
  const [configPhase,     setConfigPhase]     = useState<"initial" | "extracting" | "ready">(persisted ? (persisted.configPhase as "ready") : "initial");
  const [configCollapsed, setConfigCollapsed] = useState(persisted?.configCollapsed ?? false);
  const [hasDesglose,     setHasDesglose]     = useState<"si" | "no" | "">(persisted?.hasDesglose ?? "");
  const [partidas,        setPartidas]        = useState<Partida[]>(persisted?.partidas ?? []);
  const [numEmpresas,     setNumEmpresas]     = useState(persisted?.numEmpresas ?? 5);
  const [noDocsWarning,   setNoDocsWarning]   = useState(false);
  const [extractError,    setExtractError]    = useState<string | null>(null);

  // ── Desglose confirm modal ────────────────────────────────────────────────
  const [showConfirm, setShowConfirm] = useState(false);
  const pendingChange = useRef<"si" | "no" | "">("");

  // ── Simulation state ──────────────────────────────────────────────────────
  const [simPhase,        setSimPhase]        = useState<"none" | "loading" | "done">(persisted?.simPhase === "done" ? "done" : "none");
  const [resultsExpanded, setResultsExpanded] = useState(persisted?.resultsExpanded ?? false);
  const [tablaDatos,      setTablaDatos]      = useState<TablaDatos[]>(persisted?.tablaDatos ?? []);
  const [simMeta,         setSimMeta]         = useState<SimMeta | null>(persisted?.simMeta ?? null);
  const [simConfigSnap,   setSimConfigSnap]   = useState<string | null>(persisted?.simConfigSnapshot ?? null);
  const [collapsedTables, setCollapsedTables] = useState<Set<string>>(new Set(persisted?.collapsedTables ?? []));

  // ── Image-formula panel (per partida) ────────────────────────────────────
  const [imgPanelOpen, setImgPanelOpen] = useState<Record<string, boolean>>({});
  const [imgState,     setImgState]     = useState<Record<string, "idle" | "processing" | "success" | "error">>({});
  const imgDropOver   = useRef<Record<string, boolean>>({});

  const toggleImgPanel = (id: string) =>
    setImgPanelOpen(prev => ({ ...prev, [id]: !prev[id] }));

  const handleImgFile = (partidaId: string, file: File | null) => {
    if (!file) return;
    const allowed = ["image/png", "image/jpeg", "image/jpg", "application/pdf"];
    if (!allowed.includes(file.type)) return;
    setImgState(prev => ({ ...prev, [partidaId]: "processing" }));
    setTimeout(() => {
      if (file.size < 500) {
        setImgState(prev => ({ ...prev, [partidaId]: "error" }));
        return;
      }
      const extracted =
        "P = Pmáx × (Ob − Oi) / (Ob − Omín), donde Ob = presupuesto base s/IVA, " +
        "Oi = precio ofertado, Omín = oferta más baja del panel";
      handlePartidaChange(partidaId, "formula", extracted);
      setImgState(prev => ({ ...prev, [partidaId]: "success" }));
    }, 2200);
  };

  const openImgFilePicker = (partidaId: string) => {
    const input = document.createElement("input");
    input.type   = "file";
    input.accept = "image/png,image/jpeg,image/jpg,application/pdf";
    input.onchange = (e) => {
      handleImgFile(partidaId, (e.target as HTMLInputElement).files?.[0] ?? null);
    };
    input.click();
  };

  // ── Toast ─────────────────────────────────────────────────────────────────
  const [toast,     setToast]     = useState<string | null>(null);
  const [toastKind, setToastKind] = useState<"error" | "success">("error");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string, kind: "error" | "success" = "error") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    setToastKind(kind);
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  };
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  // ── Modal — Fórmulas detectadas ───────────────────────────────────────────
  const [showFormulasModal, setShowFormulasModal] = useState(false);
  const [selectedFormIds,   setSelectedFormIds]   = useState<Set<string>>(new Set());

  const toggleFormulaId = (id: string) =>
    setSelectedFormIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  const handleAddFormulasDetectadas = () => {
    const selected = FORMULAS_DETECTADAS.filter(f => selectedFormIds.has(f.id));
    if (selected.length === 0) return;
    const nuevas: Partida[] = selected.map(f => ({
      id: newId(), nombre: f.nombre, formula: f.formula,
      presupuesto: String(f.presupuestoN), puntuacionMax: String(f.puntuacionMax),
      bajatemeraria: f.bajatemeraria,
      observaciones: `${f.observaciones}${f.fuente ? ` — ${f.fuente}` : ""}`,
    }));
    if (configPhase === "initial") {
      setConfigPhase("ready");
      setHasDesglose(nuevas.length > 1 ? "si" : "no");
      setPartidas(nuevas);
    } else {
      const all = [...partidas, ...nuevas];
      if (all.length > 1) setHasDesglose("si");
      setPartidas(all);
    }
    setShowFormulasModal(false);
    setSelectedFormIds(new Set());
    showToast(
      `${selected.length} fórmula${selected.length !== 1 ? "s" : ""} añadida${selected.length !== 1 ? "s" : ""} correctamente.`,
      "success",
    );
  };

  // ── Field errors ─────────────────────────────────────────────────────────
  const [fieldErrors, setFieldErrors] = useState<FieldErrors | null>(null);

  // ── Dirty flag ───────────────────────────────────────────────────────────
  const configStr = JSON.stringify({
    hasDesglose,
    partidas: partidas.map(p => ({ formula: p.formula, presupuesto: p.presupuesto, puntuacionMax: p.puntuacionMax, bajatemeraria: p.bajatemeraria })),
    numEmpresas,
  });
  const isDirty = simPhase === "done" && simConfigSnap !== null && configStr !== simConfigSnap;

  // ── Persist ───────────────────────────────────────────────────────────────
  const persist = useCallback((overrides: Partial<PersistedState> = {}) => {
    saveState(oppId, userId, {
      configPhase: configPhase === "extracting" ? "initial" : configPhase as "initial" | "ready",
      hasDesglose, partidas, numEmpresas,
      simPhase: simPhase === "loading" ? "none" : simPhase as "none" | "done",
      tablaDatos, simMeta, simConfigSnapshot: simConfigSnap,
      configCollapsed, resultsExpanded,
      collapsedTables: Array.from(collapsedTables),
      ...overrides,
    });
  }, [configPhase, hasDesglose, partidas, numEmpresas, simPhase, tablaDatos, simMeta, simConfigSnap, configCollapsed, resultsExpanded, collapsedTables, oppId, userId]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleConfigureClick = () => {
    setConfigPhase("extracting");
    setFieldErrors(null);
    setTimeout(() => {
      const extracted = mockExtract(oppId);
      if (!extracted.hasDocs) { setNoDocsWarning(true); setExtractError("No hay documentación procesada. Complete los campos manualmente."); }
      else { setNoDocsWarning(false); setExtractError(null); }
      setHasDesglose(extracted.hasDesglose);
      setPartidas(extracted.partidas);
      setNumEmpresas(extracted.numEmpresas);
      setConfigPhase("ready");
    }, 1800);
  };

  const handleDesgloseChange = (val: "si" | "no" | "") => {
    if (val === "no" && hasDesglose === "si" && partidas.length > 1) {
      pendingChange.current = val; setShowConfirm(true); return;
    }
    applyDesgloseChange(val);
  };

  const applyDesgloseChange = (val: "si" | "no" | "") => {
    setHasDesglose(val);
    if (val === "no") {
      const first = partidas[0] ?? { id: newId(), nombre: "", formula: "", presupuesto: "", puntuacionMax: "", bajatemeraria: "", observaciones: "" };
      setPartidas([{ ...first, nombre: "Fórmula económica (global)" }]);
    } else if (val === "si") {
      const first = partidas[0] ?? { id: newId(), nombre: "", formula: "", presupuesto: "", puntuacionMax: "", bajatemeraria: "", observaciones: "" };
      setPartidas([{ ...first, nombre: first.nombre === "Fórmula económica (global)" ? "Partida 1" : first.nombre }]);
    }
    if (fieldErrors?.desgloseEmpty) setFieldErrors(prev => prev ? { ...prev, desgloseEmpty: false } : null);
  };

  const handleConfirmDesgloseChange = () => { applyDesgloseChange(pendingChange.current); setShowConfirm(false); };

  const handleAddPartida = () => {
    setPartidas(prev => [...prev, { id: newId(), nombre: `Partida ${prev.length + 1}`, formula: "", presupuesto: "", puntuacionMax: "", bajatemeraria: "", observaciones: "" }]);
  };

  // 1.1: Al eliminar hasta 1 partida con desglose=Sí → auto-cambiar a No
  const handleRemovePartida = (id: string) => {
    const next = partidas.filter(p => p.id !== id);
    if (next.length === 1 && hasDesglose === "si") {
      setHasDesglose("no");
      setPartidas([{ ...next[0], nombre: "Fórmula económica (global)" }]);
    } else {
      setPartidas(next);
    }
  };

  const handlePartidaChange = (id: string, field: keyof Partida, value: string) => {
    setPartidas(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    if (fieldErrors?.partidas[id]?.has(field)) {
      setFieldErrors(prev => {
        if (!prev) return null;
        const np = { ...prev.partidas };
        const fs = new Set(np[id]); fs.delete(field);
        if (fs.size === 0) delete np[id]; else np[id] = fs;
        return { ...prev, partidas: np };
      });
    }
  };

  // 1.2: Validación con toast + field highlighting
  const validateAndSimulate = () => {
    const errs: string[] = [];
    const fErrs: FieldErrors = { desgloseEmpty: false, partidas: {} };
    if (!hasDesglose) { fErrs.desgloseEmpty = true; errs.push("Selecciona si hay desglose de partidas."); }
    partidas.forEach((p) => {
      const fs = new Set<string>();
      if (!p.formula.trim()) { fs.add("formula"); errs.push("Fórmula vacía."); }
      if (!p.presupuesto || parseFloat(p.presupuesto) <= 0) { fs.add("presupuesto"); errs.push("Presupuesto inválido."); }
      if (!p.puntuacionMax || parseFloat(p.puntuacionMax) <= 0) { fs.add("puntuacionMax"); errs.push("Puntuación máxima inválida."); }
      if (fs.size > 0) fErrs.partidas[p.id] = fs;
    });
    if (numEmpresas < 1 || numEmpresas > 20) errs.push("Número de empresas inválido.");
    if (errs.length > 0) { setFieldErrors(fErrs); showToast("Debes rellenar todos los campos obligatorios antes de simular."); return; }
    setFieldErrors(null); runSimulation();
  };

  const runSimulation = () => {
    setSimPhase("loading");
    setTimeout(() => {
      const discounts = initDiscounts(numEmpresas);
      const tablas: TablaDatos[] = partidas.map(p => ({
        partidaId: p.id, partidaNombre: hasDesglose === "si" ? `Partida — ${p.nombre}` : "GLOBAL",
        presupuesto: parseFloat(p.presupuesto) || 0, puntuacionMax: parseFloat(p.puntuacionMax) || 0,
        bajatemeraria: p.bajatemeraria, descuentos: [...discounts],
      }));
      const snap = configStr;
      const meta: SimMeta = { at: today(), by: user.name };
      setTablaDatos(tablas); setSimMeta(meta); setSimConfigSnap(snap);
      setSimPhase("done"); setConfigCollapsed(true); setResultsExpanded(true); setCollapsedTables(new Set());
      persist({ simPhase: "done", tablaDatos: tablas, simMeta: meta, simConfigSnapshot: snap, configCollapsed: true, resultsExpanded: true, collapsedTables: [] });
    }, 2000);
  };

  const handleUpdateDiscount = (partidaId: string, idx: number, value: string) => {
    setTablaDatos(prev => prev.map(t => t.partidaId === partidaId ? { ...t, descuentos: t.descuentos.map((d, i) => i === idx ? value : d) } : t));
  };

  const toggleTable = (id: string) => {
    setCollapsedTables(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  // ── UI helpers ────────────────────────────────────────────────────────────
  const isReady    = configPhase === "ready";
  const isExtract  = configPhase === "extracting";
  const simDone    = simPhase === "done";
  const simLoading = simPhase === "loading";

  const inputBase: CSSProperties = {
    border: "1px solid var(--border)", borderRadius: "var(--radius-input)",
    padding: "8px 12px", background: "var(--input-background)",
    color: "var(--foreground)", fontSize: "var(--text-sm)", fontFamily: "inherit", outline: "none", width: "100%",
  };
  const inputErr: CSSProperties = { ...inputBase, border: "1.5px solid var(--destructive)" };
  const getInputSt    = (id: string, f: string) => fieldErrors?.partidas[id]?.has(f) ? inputErr : inputBase;
  const getTextareaSt = (id: string, f: string): CSSProperties => ({ ...getInputSt(id, f), resize: "vertical", minHeight: "72px", lineHeight: "1.55" });

  const selectWrap: CSSProperties = { position: "relative", display: "inline-flex", alignItems: "center" };
  const selectBase: CSSProperties = { ...inputBase, paddingRight: "32px", appearance: "none", WebkitAppearance: "none", cursor: "pointer" };

  const FieldHelper = ({ shown }: { shown: boolean }) =>
    shown ? <span style={{ fontSize: "var(--text-2xs)", color: "var(--destructive)", fontFamily: "inherit" }}>Campo obligatorio</span> : null;

  const CardWrap = ({ children }: { children: ReactNode }) => (
    <div className="border border-border bg-card" style={{ borderRadius: "var(--radius)" }}>{children}</div>
  );

  const SectionBar = ({ label, meta, collapsed, onToggle, rightSlot }: {
    label: string; meta?: string; collapsed: boolean; onToggle: () => void; rightSlot?: ReactNode;
  }) => (
    <div className="flex items-center justify-between hover:bg-muted transition-colors" style={{ background: "var(--neutral-subtle)", borderBottom: !collapsed ? "1px solid var(--border)" : "none", borderRadius: !collapsed ? "var(--radius) var(--radius) 0 0" : "var(--radius)" }}>
      <button onClick={onToggle} className="flex items-center gap-3 flex-1 text-left" style={{ padding: "14px 20px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", minWidth: 0 }}>
        {collapsed ? <ChevronRight size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} /> : <ChevronDown size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />}
        <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], color: "var(--foreground)", fontFamily: "inherit" }}>{label}</span>
        {meta && <span style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>{meta}</span>}
      </button>
      {rightSlot && <div style={{ padding: "0 16px", flexShrink: 0 }}>{rightSlot}</div>}
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "32px 40px", maxWidth: "960px" }}>

      {/* Toast error / success */}
      {toast && (
        <div style={{ position: "fixed", top: "24px", left: "50%", transform: "translateX(-50%)", zIndex: 99999, background: toastKind === "success" ? "var(--success)" : "var(--destructive)", color: toastKind === "success" ? "var(--success-foreground, #fff)" : "var(--destructive-foreground)", padding: "12px 20px", borderRadius: "var(--radius-banner)", display: "flex", alignItems: "center", gap: "10px", boxShadow: "var(--elevation-sm)", fontFamily: "inherit", fontSize: "var(--text-sm)", maxWidth: "500px" }}>
          {toastKind === "success"
            ? <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
            : <AlertCircle size={15} style={{ flexShrink: 0 }} />}
          <span style={{ flex: 1, fontFamily: "inherit" }}>{toast}</span>
          <button onClick={() => setToast(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0, color: "inherit", display: "flex" }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="bg-muted text-primary flex items-center justify-center flex-shrink-0" style={{ width: "48px", height: "48px", borderRadius: "var(--radius)" }}>
          <Calculator size={24} />
        </div>
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 style={{ fontSize: "var(--text-xl)" }}>Configuración y simulación</h3>
            <span style={{ padding: "2px 10px", borderRadius: "var(--radius-chip)", fontSize: "var(--text-3xs)", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], letterSpacing: "0.04em", background: "var(--success-subtle)", color: "var(--success)", fontFamily: "inherit" }}>Económico</span>
          </div>
          <p className="text-muted-foreground" style={{ fontSize: "var(--text-sm)", maxWidth: "600px", fontFamily: "inherit", lineHeight: "1.55" }}>
            Extrae la fórmula económica del pliego, configura las partidas y simula escenarios de pricing comparando descuentos, puntuaciones y posición entre empresas.
          </p>
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--border)", marginBottom: "28px" }} />

      {isDirty && (
        <div className="flex items-start gap-3 mb-6" style={{ padding: "10px 14px", borderRadius: "var(--radius-banner)", background: "var(--warning-subtle)", border: "1px solid var(--warning)" }}>
          <AlertTriangle size={13} style={{ color: "var(--warning-foreground)", flexShrink: 0, marginTop: "2px" }} />
          <p style={{ fontSize: "var(--text-xs)", color: "var(--warning-foreground)", fontFamily: "inherit", lineHeight: "1.5" }}>
            La simulación actual no coincide con la configuración. Vuelve a simular para actualizar los resultados.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4">

        {/* ══ SECCIÓN A — CONFIGURACIÓN ═══════════��════════════════════════ */}
        <CardWrap>
          <SectionBar
            label="CONFIGURACIÓN"
            meta={configCollapsed && simMeta ? `— Completada el ${simMeta.at} por ${simMeta.by}` : undefined}
            collapsed={configCollapsed}
            onToggle={() => setConfigCollapsed(c => !c)}
            rightSlot={
              isReady && !isReadOnly ? (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowFormulasModal(true); }}
                  title="Ver todas las fórmulas detectadas en el pliego y añadirlas a la configuración."
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "5px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--card)", color: "var(--foreground)", fontSize: "var(--text-xs)", fontFamily: "inherit", cursor: "pointer", fontWeight: "var(--font-weight-medium)" as CSSProperties["fontWeight"], whiteSpace: "nowrap" }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.color = "var(--primary)"; }}
                  onMouseOut={e  => { e.currentTarget.style.borderColor = "var(--border)";  e.currentTarget.style.color = "var(--foreground)"; }}
                >
                  <ListChecks size={13} style={{ color: "var(--primary)", flexShrink: 0 }} />
                  Ver fórmulas detectadas
                </button>
              ) : undefined
            }
          />

          {!configCollapsed && (
            <div style={{ padding: "24px" }}>

              {configPhase === "initial" && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-3" style={{ padding: "12px 14px", borderRadius: "var(--radius-banner)", background: "var(--accent-subtle)", border: "1px solid var(--border)" }}>
                    <Info size={13} style={{ color: "var(--accent)", flexShrink: 0, marginTop: "2px" }} />
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--foreground)", fontFamily: "inherit", lineHeight: "1.5" }}>
                      Pulsa el botón para extraer automáticamente la fórmula económica y los parámetros del pliego.
                    </p>
                  </div>
                  <AppButton variant="primary" icon={<Settings size={14} />} onClick={handleConfigureClick}>
                    Configurar fórmula económica
                  </AppButton>
                </div>
              )}

              {isExtract && (
                <div className="flex items-center gap-4">
                  <Loader2 size={18} className="animate-spin" style={{ color: "var(--primary)", flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], color: "var(--foreground)", fontFamily: "inherit", marginBottom: "2px" }}>Extrayendo fórmula del pliego…</p>
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>Analizando PCAP y PPT para obtener criterios económicos…</p>
                  </div>
                </div>
              )}

              {isReady && (
                <div className="flex flex-col gap-6">

                  {(extractError || noDocsWarning) ? (
                    <div className="flex items-start gap-3" style={{ padding: "10px 14px", borderRadius: "var(--radius-banner)", background: "var(--warning-subtle)", border: "1px solid var(--warning)" }}>
                      <AlertTriangle size={13} style={{ color: "var(--warning-foreground)", flexShrink: 0, marginTop: "2px" }} />
                      <p style={{ fontSize: "var(--text-xs)", color: "var(--warning-foreground)", fontFamily: "inherit", lineHeight: "1.5" }}>
                        {extractError ?? "No hay documentación procesada. Complete los campos manualmente."}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2" style={{ padding: "8px 12px", borderRadius: "var(--radius-banner)", background: "var(--success-subtle)", border: "1px solid var(--border)", alignSelf: "flex-start" }}>
                      <CheckCircle2 size={13} style={{ color: "var(--success)" }} />
                      <p style={{ fontSize: "var(--text-xs)", color: "var(--success)", fontFamily: "inherit" }}>Fórmula extraída del pliego. Revisa y ajusta si es necesario.</p>
                    </div>
                  )}

                  {/* ¿Hay desglose? */}
                  <div className="flex flex-col gap-2">
                    <label style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], color: fieldErrors?.desgloseEmpty ? "var(--destructive)" : "var(--foreground)", fontFamily: "inherit" }}>
                      ¿Hay desglose de partidas? <span style={{ color: "var(--destructive)" }}>*</span>
                    </label>
                    <div style={selectWrap}>
                      <select value={hasDesglose} onChange={(e) => handleDesgloseChange(e.target.value as "si" | "no" | "")}
                        style={{ ...selectBase, width: "240px", border: fieldErrors?.desgloseEmpty ? "1.5px solid var(--destructive)" : "1px solid var(--border)" }}
                        onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
                        onBlur={(e) => (e.target.style.borderColor = fieldErrors?.desgloseEmpty ? "var(--destructive)" : "var(--border)")}>
                        <option value="">— Selecciona —</option>
                        <option value="no">No (fórmula global única)</option>
                        <option value="si">Sí (múltiples partidas)</option>
                      </select>
                      <ChevronDown size={13} style={{ position: "absolute", right: "10px", pointerEvents: "none", color: "var(--muted-foreground)" }} />
                    </div>
                    {fieldErrors?.desgloseEmpty && <span style={{ fontSize: "var(--text-2xs)", color: "var(--destructive)", fontFamily: "inherit" }}>Campo obligatorio</span>}
                  </div>

                  {/* Partidas */}
                  {hasDesglose && partidas.map((partida, idx) => (
                    <div key={partida.id} className="border border-border" style={{ borderRadius: "var(--radius)" }}>
                      {/* Block header */}
                      <div className="flex items-center justify-between" style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "var(--neutral-subtle)", borderRadius: "var(--radius) var(--radius) 0 0" }}>
                        {/* Left: title or partida name */}
                        {hasDesglose === "no" ? (
                          <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], color: "var(--foreground)", fontFamily: "inherit" }}>Fórmula económica (global)</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit", flexShrink: 0 }}>Partida {idx + 1} —</span>
                            <input value={partida.nombre} onChange={(e) => handlePartidaChange(partida.id, "nombre", e.target.value)} placeholder="Nombre de partida"
                              style={{ ...inputBase, width: "280px", padding: "4px 8px", fontSize: "var(--text-xs)" }}
                              onFocus={(e) => (e.target.style.borderColor = "var(--primary)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
                          </div>
                        )}

                        {/* Right: actions */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              toggleImgPanel(partida.id);
                              setImgState(prev => ({ ...prev, [partida.id]: prev[partida.id] ?? "idle" }));
                            }}
                            title="Sube una captura de la fórmula económica para procesarla automáticamente."
                            style={{
                              display: "flex", alignItems: "center", gap: "5px",
                              padding: "4px 10px",
                              background: imgPanelOpen[partida.id] ? "var(--accent-subtle)" : "transparent",
                              border: `1px solid ${imgPanelOpen[partida.id] ? "var(--accent)" : "var(--border)"}`,
                              borderRadius: "var(--radius)",
                              cursor: "pointer",
                              color: imgPanelOpen[partida.id] ? "var(--accent)" : "var(--muted-foreground)",
                              fontSize: "var(--text-2xs)",
                              fontFamily: "inherit",
                              fontWeight: "var(--font-weight-medium)" as CSSProperties["fontWeight"],
                              transition: "border-color 0.15s, color 0.15s, background 0.15s",
                            }}
                          >
                            <ImagePlus size={12} />
                            Adjuntar imagen de fórmula
                          </button>
                          {hasDesglose === "si" && partidas.length > 1 && !isReadOnly && (
                            <button onClick={() => handleRemovePartida(partida.id)} title="Eliminar partida" style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center" }}>
                              <Trash2 size={13} style={{ color: "var(--muted-foreground)" }} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* ── Image formula upload panel (expandable) ── */}
                      {imgPanelOpen[partida.id] && (
                        <div
                          style={{ borderBottom: "1px solid var(--border)", background: "var(--accent-subtle)", padding: "14px 16px" }}
                          onDragOver={(e) => { e.preventDefault(); imgDropOver.current[partida.id] = true; }}
                          onDrop={(e) => {
                            e.preventDefault();
                            imgDropOver.current[partida.id] = false;
                            handleImgFile(partida.id, e.dataTransfer.files?.[0] ?? null);
                          }}
                        >
                          {imgState[partida.id] === "processing" ? (
                            <div className="flex items-center gap-2" style={{ color: "var(--accent)" }}>
                              <Loader2 size={14} className="animate-spin" />
                              <span style={{ fontSize: "var(--text-xs)", fontFamily: "inherit" }}>Procesando imagen de fórmula…</span>
                            </div>
                          ) : imgState[partida.id] === "success" ? (
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2" style={{ color: "var(--success)" }}>
                                <CheckCircle2 size={14} style={{ flexShrink: 0 }} />
                                <span style={{ fontSize: "var(--text-xs)", fontFamily: "inherit" }}>
                                  Fórmula actualizada desde la imagen. Revísala antes de simular.
                                </span>
                              </div>
                              <button
                                onClick={() => { setImgState(prev => ({ ...prev, [partida.id]: "idle" })); openImgFilePicker(partida.id); }}
                                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit", textDecoration: "underline", flexShrink: 0, padding: 0 }}
                              >
                                Subir otra
                              </button>
                            </div>
                          ) : imgState[partida.id] === "error" ? (
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2" style={{ color: "var(--destructive)" }}>
                                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                                <span style={{ fontSize: "var(--text-xs)", fontFamily: "inherit" }}>
                                  No se ha podido interpretar la fórmula. Intenta subir una imagen más clara.
                                </span>
                              </div>
                              <button
                                onClick={() => setImgState(prev => ({ ...prev, [partida.id]: "idle" }))}
                                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit", textDecoration: "underline", flexShrink: 0, padding: 0 }}
                              >
                                Reintentar
                              </button>
                            </div>
                          ) : (
                            /* Idle — drag & drop zone */
                            <div className="flex flex-col gap-2">
                              <p style={{ fontSize: "var(--text-xs)", color: "var(--accent)", fontFamily: "inherit", margin: 0 }}>
                                Sube una captura donde se vea claramente la fórmula económica.
                              </p>
                              <div
                                onClick={() => openImgFilePicker(partida.id)}
                                style={{
                                  border: "1.5px dashed var(--accent)", borderRadius: "var(--radius)",
                                  padding: "18px 16px",
                                  display: "flex", flexDirection: "column", alignItems: "center", gap: "7px",
                                  cursor: "pointer", background: "var(--background)",
                                  transition: "background 0.15s",
                                }}
                                onMouseOver={(e) => (e.currentTarget.style.background = "var(--muted)")}
                                onMouseOut={(e) => (e.currentTarget.style.background = "var(--background)")}
                              >
                                <ImagePlus size={20} style={{ color: "var(--accent)", opacity: 0.75 }} />
                                <span style={{ fontSize: "var(--text-xs)", color: "var(--foreground)", fontFamily: "inherit", textAlign: "center" }}>
                                  Arrastra la imagen aquí o{" "}
                                  <span style={{ color: "var(--accent)", textDecoration: "underline" }}>selecciona un archivo</span>
                                </span>
                                <span style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
                                  PNG · JPG · JPEG · PDF (1 página máx.)
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        <div style={{ gridColumn: "1 / -1" }} className="flex flex-col gap-1">
                          <label style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], color: "var(--foreground)", fontFamily: "inherit" }}>
                            Fórmula económica <span style={{ color: "var(--destructive)" }}>*</span>
                          </label>
                          <textarea value={partida.formula} onChange={(e) => handlePartidaChange(partida.id, "formula", e.target.value)}
                            placeholder="Ej.: P = Pmáx × (Ob − Oi) / (Ob − Omín)" style={getTextareaSt(partida.id, "formula")}
                            onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
                            onBlur={(e) => (e.target.style.borderColor = fieldErrors?.partidas[partida.id]?.has("formula") ? "var(--destructive)" : "var(--border)")} />
                          <FieldHelper shown={!!fieldErrors?.partidas[partida.id]?.has("formula")} />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], color: "var(--foreground)", fontFamily: "inherit" }}>
                            Presupuesto sin IVA (€) <span style={{ color: "var(--destructive)" }}>*</span>
                          </label>
                          <input type="number" min={0} value={partida.presupuesto} onChange={(e) => handlePartidaChange(partida.id, "presupuesto", e.target.value)}
                            placeholder="Ej.: 2400000" style={getInputSt(partida.id, "presupuesto")}
                            onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
                            onBlur={(e) => (e.target.style.borderColor = fieldErrors?.partidas[partida.id]?.has("presupuesto") ? "var(--destructive)" : "var(--border)")} />
                          <FieldHelper shown={!!fieldErrors?.partidas[partida.id]?.has("presupuesto")} />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], color: "var(--foreground)", fontFamily: "inherit" }}>
                            Puntuación máxima (p) <span style={{ color: "var(--destructive)" }}>*</span>
                          </label>
                          <input type="number" min={0} value={partida.puntuacionMax} onChange={(e) => handlePartidaChange(partida.id, "puntuacionMax", e.target.value)}
                            placeholder="Ej.: 30" style={getInputSt(partida.id, "puntuacionMax")}
                            onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
                            onBlur={(e) => (e.target.style.borderColor = fieldErrors?.partidas[partida.id]?.has("puntuacionMax") ? "var(--destructive)" : "var(--border)")} />
                          <FieldHelper shown={!!fieldErrors?.partidas[partida.id]?.has("puntuacionMax")} />
                        </div>

                        <div style={{ gridColumn: "1 / -1" }} className="flex flex-col gap-1">
                          <label style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], color: "var(--foreground)", fontFamily: "inherit" }}>
                            Condiciones de baja temeraria
                          </label>
                          <input type="text" value={partida.bajatemeraria} onChange={(e) => handlePartidaChange(partida.id, "bajatemeraria", e.target.value)}
                            placeholder="Ej.: No superar el 20% de baja sobre el presupuesto base" style={inputBase}
                            onFocus={(e) => (e.target.style.borderColor = "var(--primary)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
                          {extractBTThreshold(partida.bajatemeraria) !== null && (
                            <p style={{ fontSize: "var(--text-2xs)", color: "var(--warning-foreground)", fontFamily: "inherit" }}>
                              ⚠ Umbral detectado: {extractBTThreshold(partida.bajatemeraria)}% — se marcará en rojo en la tabla.
                            </p>
                          )}
                        </div>

                        <div style={{ gridColumn: "1 / -1" }} className="flex flex-col gap-1">
                          <label style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], color: "var(--foreground)", fontFamily: "inherit" }}>Observaciones</label>
                          <textarea value={partida.observaciones} onChange={(e) => handlePartidaChange(partida.id, "observaciones", e.target.value)}
                            placeholder="Referencia al apartado del pliego, notas adicionales…"
                            style={{ ...inputBase, resize: "vertical", minHeight: "56px", lineHeight: "1.55" }}
                            onFocus={(e) => (e.target.style.borderColor = "var(--primary)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
                        </div>
                      </div>
                    </div>
                  ))}

                  {hasDesglose === "si" && !isReadOnly && (
                    <div>
                      <AppButton variant="secondary" size="sm" icon={<Plus size={13} />} onClick={handleAddPartida}>Añadir partida</AppButton>
                    </div>
                  )}

                  {/* Número de empresas */}
                  <div className="flex flex-col gap-2">
                    <label style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], color: "var(--foreground)", fontFamily: "inherit" }}>
                      Número de empresas a simular
                    </label>
                    <div style={selectWrap}>
                      <select value={numEmpresas} onChange={(e) => setNumEmpresas(Number(e.target.value))}
                        style={{ ...selectBase, width: "180px" }}
                        onFocus={(e) => (e.target.style.borderColor = "var(--primary)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")}>
                        {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
                          <option key={n} value={n}>{n} {n === 1 ? "empresa" : "empresas"}</option>
                        ))}
                      </select>
                      <ChevronDown size={13} style={{ position: "absolute", right: "10px", pointerEvents: "none", color: "var(--muted-foreground)" }} />
                    </div>
                    <p style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
                      Define cuántas empresas se incluirán en la tabla de simulación.
                    </p>
                  </div>

                  {/* Simular */}
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: "20px" }}>
                    {simLoading ? (
                      <div className="flex items-center gap-4">
                        <Loader2 size={18} className="animate-spin" style={{ color: "var(--primary)", flexShrink: 0 }} />
                        <div>
                          <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], color: "var(--foreground)", fontFamily: "inherit", marginBottom: "2px" }}>Simulando escenarios…</p>
                          <p style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>Calculando puntuaciones, rankings y comparativas…</p>
                        </div>
                      </div>
                    ) : isReadOnly && !simDone ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: "var(--radius-banner)" }}>
                        <Lock size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>No ejecutado antes de marcar como Entregada.</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                        <AppButton variant="primary" icon={simDone ? <RefreshCw size={14} /> : <Sparkles size={14} />} onClick={validateAndSimulate} disabled={isReadOnly}>
                          {simDone ? "Re-simular" : "Simular"}
                        </AppButton>
                        {!isReadOnly && (
                        <p style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
                          Los campos con <span style={{ color: "var(--destructive)" }}>*</span> son obligatorios.
                        </p>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          )}
        </CardWrap>

        {/* ══ SECCIÓN B — RESULTADOS ════════════════════════════════════════ */}
        {(simDone || simLoading) && (
          <CardWrap>
            <SectionBar
              label="RESULTADOS DE SIMULACIÓN"
              meta={isDirty ? "— Desactualizados (configuración modificada)" : simMeta ? `— Generados el ${simMeta.at} por ${simMeta.by}` : undefined}
              collapsed={!resultsExpanded}
              onToggle={() => setResultsExpanded(e => !e)}
              rightSlot={
                resultsExpanded && simDone ? (
                  <AppButton variant="secondary" size="sm" icon={<Download size={12} />} onClick={() => exportToExcel(tablaDatos, numEmpresas, oppName)}>
                    Exportar Excel
                  </AppButton>
                ) : undefined
              }
            />

            {resultsExpanded && (
              <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>

                {isDirty && (
                  <div className="flex items-center gap-2" style={{ padding: "6px 12px", borderRadius: "var(--radius-banner)", background: "var(--warning-subtle)", border: "1px solid var(--warning)", alignSelf: "flex-start" }}>
                    <AlertTriangle size={12} style={{ color: "var(--warning-foreground)" }} />
                    <span style={{ fontSize: "var(--text-2xs)", color: "var(--warning-foreground)", fontFamily: "inherit" }}>Simulación desactualizada — vuelve a simular para actualizar</span>
                  </div>
                )}

                {simMeta && (
                  <div className="flex items-center gap-2" style={{ padding: "6px 12px", borderRadius: "var(--radius-banner)", background: "var(--neutral-subtle)", border: "1px solid var(--border)", alignSelf: "flex-start" }}>
                    <User size={12} style={{ color: "var(--muted-foreground)" }} />
                    <span style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
                      Simulación generada el <strong style={{ color: "var(--foreground)", fontFamily: "inherit" }}>{simMeta.at}</strong> — por <strong style={{ color: "var(--foreground)", fontFamily: "inherit" }}>{simMeta.by}</strong>
                    </span>
                  </div>
                )}

                {/* Leyenda */}
                <div className="flex items-center gap-5" style={{ padding: "4px 0" }}>
                  <div className="flex items-center gap-2">
                    <Trophy size={12} style={{ color: "var(--primary)" }} />
                    <span style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>Empresa #1 — fila resaltada</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: "var(--destructive)", display: "inline-block" }} />
                    <span style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>Baja temeraria</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: "var(--text-2xs)", color: "var(--success)", fontFamily: "inherit" }}>■</span>
                    <span style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>Puntuación</span>
                  </div>
                </div>

                {/* Tablas por partida */}
                {tablaDatos.map((tabla) => (
                  <SimTableView
                    key={tabla.partidaId}
                    tabla={tabla}
                    numEmpresas={numEmpresas}
                    isOpen={!collapsedTables.has(tabla.partidaId)}
                    onToggle={() => toggleTable(tabla.partidaId)}
                    onUpdateDiscount={(idx, val) => handleUpdateDiscount(tabla.partidaId, idx, val)}
                  />
                ))}

                {/* Tabla global agregada (solo si hay desglose) */}
                {tablaDatos.length > 1 && (() => {
                  const gId = "eco-global";
                  const gTabla: TablaDatos = { partidaId: gId, partidaNombre: "GLOBAL (agregado)", presupuesto: 0, puntuacionMax: 0, bajatemeraria: "", descuentos: Array(numEmpresas).fill("0") };
                  return (
                    <SimTableView key={gId} tabla={gTabla} numEmpresas={numEmpresas}
                      isOpen={!collapsedTables.has(gId)} onToggle={() => toggleTable(gId)}
                      isGlobal allTablaDatos={tablaDatos} />
                  );
                })()}

                {/* Nota fórmula */}
                <div className="flex items-start gap-2" style={{ padding: "8px 12px", borderRadius: "var(--radius-banner)", background: "var(--neutral-subtle)", border: "1px solid var(--border)" }}>
                  <Info size={12} style={{ color: "var(--muted-foreground)", flexShrink: 0, marginTop: "1px" }} />
                  <p style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit", lineHeight: "1.5" }}>
                    Puntuaciones mediante fórmula proporcional relativa: <strong style={{ fontFamily: "inherit" }}>P = Pmáx × (Ob − Oi) / (Ob − Omín)</strong>. Ranking por puntuación descendente; desempate: menor descuento gana. El input de descuento es el único campo editable; el resto se recalcula en tiempo real.
                  </p>
                </div>

              </div>
            )}
          </CardWrap>
        )}

      </div>

      {/* ══ MODAL — Fórmulas detectadas en el pliego ══════════════════════ */}
      {showFormulasModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowFormulasModal(false); setSelectedFormIds(new Set()); } }}
        >
          <div style={{ background: "var(--card)", borderRadius: "var(--radius)", border: "1px solid var(--border)", width: "100%", maxWidth: "700px", maxHeight: "82vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}>

            {/* Header */}
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexShrink: 0 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <ListChecks size={16} style={{ color: "var(--primary)" }} />
                  <h4 style={{ fontSize: "var(--text-base)", fontFamily: "inherit", margin: 0 }}>Fórmulas detectadas en el pliego</h4>
                </div>
                <p style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit", margin: 0 }}>
                  Selecciona una o varias fórmulas para añadirlas automáticamente a la configuración. Los campos se autorrellenan y son editables.
                </p>
              </div>
              <button onClick={() => { setShowFormulasModal(false); setSelectedFormIds(new Set()); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--muted-foreground)", display: "flex", flexShrink: 0 }}>
                <X size={18} />
              </button>
            </div>

            {/* Scrollable formula list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
              {FORMULAS_DETECTADAS.map(f => {
                const isSel = selectedFormIds.has(f.id);
                return (
                  <div
                    key={f.id}
                    onClick={() => toggleFormulaId(f.id)}
                    style={{ border: `1.5px solid ${isSel ? "var(--primary)" : "var(--border)"}`, borderRadius: "var(--radius)", padding: "14px 16px", cursor: "pointer", background: isSel ? "var(--primary-subtle)" : "var(--muted)", transition: "border-color 0.15s, background 0.15s" }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>

                      {/* Checkbox visual */}
                      <div style={{ width: 18, height: 18, borderRadius: "4px", border: `2px solid ${isSel ? "var(--primary)" : "var(--border)"}`, background: isSel ? "var(--primary)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2, transition: "background 0.15s, border-color 0.15s" }}>
                        {isSel && <CheckCircle2 size={11} style={{ color: "var(--primary-foreground, #fff)" }} />}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Nombre + fuente */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                          <p style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], color: "var(--foreground)", fontFamily: "inherit", margin: 0 }}>{f.nombre}</p>
                          {f.fuente && (
                            <span style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit", flexShrink: 0, background: "var(--neutral-subtle)", padding: "2px 8px", borderRadius: "var(--radius-chip)", border: "1px solid var(--border)" }}>{f.fuente}</span>
                          )}
                        </div>

                        {/* Formula monospace box */}
                        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-input)", padding: "9px 12px", marginBottom: 10 }}>
                          <p style={{ fontSize: "var(--text-xs)", color: "var(--foreground)", fontFamily: "monospace, monospace", lineHeight: 1.6, margin: 0 }}>{f.formula}</p>
                        </div>

                        {/* Metadata grid */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <span style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>Presupuesto</span>
                            <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], color: "var(--foreground)", fontFamily: "inherit" }}>{f.presupuesto} €</span>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <span style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>Puntuación máxima</span>
                            <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], color: "var(--success)", fontFamily: "inherit" }}>{f.puntuacionMax} p</span>
                          </div>
                          {f.bajatemeraria && (
                            <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 2 }}>
                              <span style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>Baja temeraria</span>
                              <span style={{ fontSize: "var(--text-xs)", color: "var(--warning-foreground)", fontFamily: "inherit" }}>{f.bajatemeraria}</span>
                            </div>
                          )}
                          {f.observaciones && (
                            <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 2 }}>
                              <span style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>Observaciones</span>
                              <span style={{ fontSize: "var(--text-xs)", color: "var(--foreground)", fontFamily: "inherit" }}>{f.observaciones}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexShrink: 0, background: "var(--muted)", borderRadius: "0 0 var(--radius) var(--radius)" }}>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit", margin: 0 }}>
                {selectedFormIds.size === 0
                  ? "Ninguna fórmula seleccionada"
                  : `${selectedFormIds.size} fórmula${selectedFormIds.size !== 1 ? "s" : ""} seleccionada${selectedFormIds.size !== 1 ? "s" : ""}`}
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <AppButton variant="secondary" onClick={() => { setShowFormulasModal(false); setSelectedFormIds(new Set()); }}>Cancelar</AppButton>
                <AppButton variant="primary" disabled={selectedFormIds.size === 0} onClick={handleAddFormulasDetectadas}>
                  Añadir fórmulas seleccionadas
                </AppButton>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal confirmación desglose Sí → No */}
      {showConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "var(--overlay)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div className="bg-card border border-border" style={{ borderRadius: "var(--radius)", padding: "28px 32px", maxWidth: "420px", width: "90%" }}>
            <div className="flex items-start gap-3 mb-5">
              <AlertTriangle size={18} style={{ color: "var(--warning-foreground)", flexShrink: 0, marginTop: "2px" }} />
              <div>
                <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], color: "var(--foreground)", fontFamily: "inherit", marginBottom: "6px" }}>Eliminar partidas adicionales</p>
                <p style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit", lineHeight: "1.55" }}>
                  Cambiar a "Sin desglose" eliminará todas las partidas adicionales y conservará solo la primera. <strong style={{ fontFamily: "inherit" }}>Esta acción no se puede deshacer.</strong>
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <AppButton variant="secondary" size="sm" onClick={() => setShowConfirm(false)}>Cancelar</AppButton>
              <AppButton variant="primary"   size="sm" onClick={handleConfirmDesgloseChange}>Confirmar</AppButton>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
