// Línea Económica → Análisis económico → Recomendación de descuento
// Persistencia INDIVIDUAL por usuario + oportunidad (datos de negocio).
// Lee datos de la simulación (individual) y del Espacio de trabajo (colectivo).
"use client";


import { useState, useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import {
  Percent, AlertCircle, Info, ChevronDown, ChevronRight,
  TrendingUp, DollarSign, Target, Zap, BarChart2, BookOpen,
  CheckCircle2,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine,
} from "recharts";
import { getAuthUser } from "../../../../_components/auth-store";
import { useWorkspaceReadonly } from "./workspace-readonly-context";

// ─── Types shared with eco-simulacion (duplicated for self-containment) ────────

interface TablaDatos {
  partidaId:     string;
  partidaNombre: string;
  presupuesto:   number;
  puntuacionMax: number;
  bajatemeraria: string;
  descuentos:    string[];
}

interface SimPersistedState {
  simPhase:   "none" | "done";
  tablaDatos: TablaDatos[];
  numEmpresas: number;
}

interface EspacioState {
  descuentos: Record<string, string>;
  updatedAt:  string;
  updatedBy:  string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const parseDisc = (s: string): number => {
  const n = parseFloat(String(s).replace(",", "."));
  return isNaN(n) ? 0 : Math.max(0, Math.min(100, n));
};
const fmtEuro = (n: number) =>
  new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(n);
const fmtPts = (n: number) => n.toFixed(2);

function calcPuntuacion(desc: number, presupuesto: number, puntuacionMax: number, allDescs: number[]): number {
  if (presupuesto <= 0 || puntuacionMax <= 0) return 0;
  const offer  = presupuesto * (1 - desc / 100);
  const allOff = allDescs.map((d) => presupuesto * (1 - d / 100));
  const minOff = Math.min(...allOff);
  const range  = presupuesto - minOff;
  if (range < 0.01) return minOff < presupuesto ? puntuacionMax : 0;
  return Math.max(0, Math.min(puntuacionMax, (puntuacionMax * (presupuesto - offer)) / range));
}

function calcRanking(puntuaciones: number[], descuentos: number[]): number[] {
  const indexed = puntuaciones.map((pts, i) => ({ pts, desc: descuentos[i], i }));
  const sorted  = [...indexed].sort((a, b) =>
    Math.abs(b.pts - a.pts) > 0.001 ? b.pts - a.pts : a.desc - b.desc
  );
  const rankMap = new Map(sorted.map((item, idx) => [item.i, idx + 1]));
  return puntuaciones.map((_, i) => rankMap.get(i) ?? 1);
}

function extractBTThreshold(text: string): number | null {
  if (!text) return null;
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*%/);
  return m ? parseFloat(m[1].replace(",", ".")) : null;
}

// ─── Storage ─────────────────────────────────────────────────────────────────

function readSimState(oppId: string, userId: string): SimPersistedState | null {
  try {
    const raw = localStorage.getItem(`eco-sim-${oppId}-${userId}`);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<SimPersistedState>;
    if (p.simPhase === "done" && Array.isArray(p.tablaDatos)) return p as SimPersistedState;
    return null;
  } catch { return null; }
}

function readEspacioState(oppId: string): EspacioState | null {
  try {
    const raw = localStorage.getItem(`eco-espacio-${oppId}`);
    return raw ? (JSON.parse(raw) as EspacioState) : null;
  } catch { return null; }
}

function readDatosNegocio(oppId: string, userId: string): string {
  try {
    return localStorage.getItem(`eco-desc-negocio-${oppId}-${userId}`) ?? "";
  } catch { return ""; }
}
function saveDatosNegocio(oppId: string, userId: string, value: string) {
  try { localStorage.setItem(`eco-desc-negocio-${oppId}-${userId}`, value); } catch {}
}

function readDatosNegocioApplied(oppId: string, userId: string): string | null {
  try {
    const v = localStorage.getItem(`eco-desc-negocio-applied-${oppId}-${userId}`);
    return v;
  } catch { return null; }
}
function saveDatosNegocioApplied(oppId: string, userId: string, value: string | null) {
  try {
    if (value === null) {
      localStorage.removeItem(`eco-desc-negocio-applied-${oppId}-${userId}`);
    } else {
      localStorage.setItem(`eco-desc-negocio-applied-${oppId}-${userId}`, value);
    }
  } catch {}
}

// ─── Recommendation engine ────────────────────────────────────────────────────

function computeRecommendedDiscount(tabla: TablaDatos): number {
  const numE       = tabla.descuentos.length;
  const otherDescs = tabla.descuentos.slice(1).map(parseDisc);

  for (let d = 0; d <= 50; d += 0.5) {
    const allDescs = [d, ...otherDescs];
    const punts    = allDescs.map((di) => calcPuntuacion(di, tabla.presupuesto, tabla.puntuacionMax, allDescs));
    const ranks    = calcRanking(punts, allDescs);
    if (ranks[0] === 1) return d;
  }
  // Fallback: beat best competitor + 1%
  const maxOther = Math.max(...otherDescs);
  return Math.min(Math.round(maxOther + 1), 50);
}

// ─── Chart data builders ──────────────────────────────────────────────────────

const CHART_COLORS = [
  "var(--primary)",
  "var(--accent)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--success)",
  "var(--warning)",
];

interface ChartPoint {
  discount:  number;
  [key: string]: number;
}

function buildChartData(tabla: TablaDatos, numEmpresas: number): ChartPoint[] {
  const data: ChartPoint[] = [];
  const fixedDescs = tabla.descuentos.slice(1).map(parseDisc);

  for (let d = 0; d <= 50; d += 1) {
    const allDescs = [d, ...fixedDescs];
    const punts    = allDescs.map((di) => calcPuntuacion(di, tabla.presupuesto, tabla.puntuacionMax, allDescs));
    const ranks    = calcRanking(punts, allDescs);
    const row: ChartPoint = { discount: d };
    for (let i = 0; i < numEmpresas; i++) {
      row[`pts_e${i + 1}`]  = Math.round(punts[i] * 100) / 100;
      row[`rank_e${i + 1}`] = ranks[i];
    }
    data.push(row);
  }
  return data;
}

// Max companies shown in chart (visual clarity)
const MAX_CHART_COMPANIES = 5;

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  label, value, unit, sub, highlight = false,
}: {
  label: string; value: string; unit?: string; sub?: string; highlight?: boolean;
}) {
  return (
    <div
      style={{
        borderRadius:  "var(--radius)",
        border:        `1px solid ${highlight ? "var(--primary)" : "var(--border)"}`,
        background:    highlight ? "var(--primary-subtle)" : "var(--card)",
        padding:       "16px 20px",
        display:       "flex",
        flexDirection: "column",
        gap:           "6px",
        flex:          "1 1 0",
        minWidth:      "140px",
      }}
    >
      <span style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit", lineHeight: 1.3 }}>
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
        <span style={{
          fontSize:   "var(--text-kpi)",
          fontWeight: "var(--font-weight-bold)" as CSSProperties["fontWeight"],
          color:      highlight ? "var(--primary)" : "var(--foreground)",
          fontFamily: "inherit",
          lineHeight: 1.1,
        }}>
          {value}
        </span>
        {unit && (
          <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
            {unit}
          </span>
        )}
      </div>
      {sub && (
        <span style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
          {sub}
        </span>
      )}
    </div>
  );
}

function KpiSecondary({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div style={{
      display:       "flex",
      alignItems:    "center",
      gap:           "12px",
      padding:       "10px 16px",
      border:        "1px solid var(--border)",
      borderRadius:  "var(--radius)",
      background:    "var(--card)",
      flex:          "1 1 0",
      minWidth:      "180px",
    }}>
      <div style={{ color: "var(--muted-foreground)", flexShrink: 0 }}>{icon}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <span style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>{label}</span>
        <span style={{
          fontSize:   "var(--text-sm)",
          fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
          color:      "var(--foreground)",
          fontFamily: "inherit",
        }}>
          {value}
        </span>
      </div>
    </div>
  );
}

// ─── Partida recommendation block ─────────────────────────────────────────────

function PartidaRecomendacion({
  tabla, numEmpresas, isGlobal, allTablaDatos, actualDiscount,
}: {
  tabla:          TablaDatos;
  numEmpresas:    number;
  isGlobal?:      boolean;
  allTablaDatos?: TablaDatos[];
  actualDiscount: string | null;
}) {
  const [chartsOpen, setChartsOpen] = useState(true);

  // Effective data
  const effectivePuntuacionMax = isGlobal && allTablaDatos
    ? allTablaDatos.reduce((s, t) => s + t.puntuacionMax, 0)
    : tabla.puntuacionMax;
  const effectivePresupuesto = isGlobal && allTablaDatos
    ? allTablaDatos.reduce((s, t) => s + t.presupuesto, 0)
    : tabla.presupuesto;

  // Recommended discount
  const recDesc = isGlobal && allTablaDatos
    ? allTablaDatos.reduce((sum, t) => sum + computeRecommendedDiscount(t), 0) / allTablaDatos.length
    : computeRecommendedDiscount(tabla);

  const recDescRounded = Math.round(recDesc * 10) / 10;

  // KPI values at recommended discount
  const recDescs = isGlobal && allTablaDatos
    ? allTablaDatos.map(t => {
        const others = t.descuentos.slice(1).map(parseDisc);
        return [computeRecommendedDiscount(t), ...others];
      })
    : [tabla.descuentos.slice(1).map(parseDisc)];

  // Puntuación at recommended
  let recPuntos: number;
  let recPrecio: number;
  let recRebajado: number;

  if (isGlobal && allTablaDatos) {
    recPuntos  = allTablaDatos.reduce((s, t) => {
      const rec  = computeRecommendedDiscount(t);
      const aDs  = [rec, ...t.descuentos.slice(1).map(parseDisc)];
      return s + calcPuntuacion(rec, t.presupuesto, t.puntuacionMax, aDs);
    }, 0);
    recPrecio   = allTablaDatos.reduce((s, t) => s + t.presupuesto * (1 - computeRecommendedDiscount(t) / 100), 0);
    recRebajado = allTablaDatos.reduce((s, t) => s + t.presupuesto * computeRecommendedDiscount(t) / 100, 0);
  } else {
    const aDs  = [recDescRounded, ...tabla.descuentos.slice(1).map(parseDisc)];
    recPuntos  = calcPuntuacion(recDescRounded, tabla.presupuesto, tabla.puntuacionMax, aDs);
    recPrecio  = tabla.presupuesto * (1 - recDescRounded / 100);
    recRebajado = tabla.presupuesto * recDescRounded / 100;
  }

  // Secondary KPIs: pts per 1% and pts per €
  const computeSecondary = () => {
    if (isGlobal && allTablaDatos) {
      const pts1 = allTablaDatos.reduce((s, t) => {
        const aDs = [1, ...t.descuentos.slice(1).map(parseDisc)];
        return s + calcPuntuacion(1, t.presupuesto, t.puntuacionMax, aDs);
      }, 0);
      const pts2 = allTablaDatos.reduce((s, t) => {
        const aDs = [2, ...t.descuentos.slice(1).map(parseDisc)];
        return s + calcPuntuacion(2, t.presupuesto, t.puntuacionMax, aDs);
      }, 0);
      const dEuro = allTablaDatos.reduce((s, t) => s + t.presupuesto * 0.01, 0);
      return { ptsPerPct: pts2 - pts1, ptsPerEuro: (pts2 - pts1) / dEuro };
    }
    const aDs1 = [1, ...tabla.descuentos.slice(1).map(parseDisc)];
    const aDs2 = [2, ...tabla.descuentos.slice(1).map(parseDisc)];
    const pts1 = calcPuntuacion(1, tabla.presupuesto, tabla.puntuacionMax, aDs1);
    const pts2 = calcPuntuacion(2, tabla.presupuesto, tabla.puntuacionMax, aDs2);
    const dEuro = tabla.presupuesto * 0.01;
    return { ptsPerPct: pts2 - pts1, ptsPerEuro: dEuro > 0 ? (pts2 - pts1) / dEuro : 0 };
  };
  const { ptsPerPct, ptsPerEuro } = computeSecondary();

  // Chart data (only for non-global partidas)
  const chartData   = !isGlobal ? buildChartData(tabla, numEmpresas) : [];
  const maxShownCo  = Math.min(numEmpresas, MAX_CHART_COMPANIES);
  const actualDisc  = actualDiscount !== null ? parseDisc(actualDiscount) : null;
  const btThreshold = extractBTThreshold(tabla.bajatemeraria);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* ── 4 KPIs principales ── */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <KpiCard
          label="Descuento recomendado"
          value={fmtPts(recDescRounded)}
          unit="%"
          sub="mínimo para posición #1"
          highlight
        />
        <KpiCard
          label="Presupuesto c/ descuento"
          value={fmtEuro(recPrecio)}
          unit="€"
          sub="precio ofertado estimado"
        />
        <KpiCard
          label="Puntuación obtenida"
          value={fmtPts(recPuntos)}
          unit="p"
          sub={`de ${fmtPts(effectivePuntuacionMax)} p máx.`}
        />
        <KpiCard
          label="Importe rebajado"
          value={fmtEuro(recRebajado)}
          unit="€"
          sub="vs. presupuesto base"
        />
      </div>

      {/* ── 2 KPIs secundarios ── */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <KpiSecondary
          icon={<TrendingUp size={15} />}
          label="Puntos por cada 1% de descuento"
          value={`+${fmtPts(ptsPerPct)} p / %`}
        />
        <KpiSecondary
          icon={<DollarSign size={15} />}
          label="Puntos por cada € rebajado"
          value={`+${(ptsPerEuro * 1000).toFixed(4)} p / k€`}
        />
      </div>

      {/* ── Visualizaciones (charts) — solo tablas no-global ── */}
      {!isGlobal && chartData.length > 0 && (
        <div className="border border-border bg-card" style={{ borderRadius: "var(--radius)" }}>
          <button
            onClick={() => setChartsOpen(o => !o)}
            className="w-full flex items-center justify-between hover:bg-muted transition-colors"
            style={{ padding: "12px 16px", background: "none", border: "none", cursor: "pointer", borderBottom: chartsOpen ? "1px solid var(--border)" : "none", fontFamily: "inherit", borderRadius: chartsOpen ? "var(--radius) var(--radius) 0 0" : "var(--radius)" }}
          >
            <div className="flex items-center gap-2">
              {chartsOpen ? <ChevronDown size={14} style={{ color: "var(--muted-foreground)" }} /> : <ChevronRight size={14} style={{ color: "var(--muted-foreground)" }} />}
              <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], color: "var(--foreground)", fontFamily: "inherit" }}>
                Visualizaciones
              </span>
            </div>
            <span style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
              {chartsOpen ? "Contraer" : "Expandir"}
            </span>
          </button>

          {chartsOpen && (
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "24px" }}>

              {/* Leyenda de marcadores */}
              <div className="flex items-center gap-5" style={{ padding: "6px 0" }}>
                <div className="flex items-center gap-2">
                  <span style={{ width: "12px", height: "3px", background: "var(--primary)", display: "inline-block", borderRadius: "2px" }} />
                  <span style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>Descuento recomendado</span>
                </div>
                {actualDisc !== null && (
                  <div className="flex items-center gap-2">
                    <span style={{ width: "12px", height: "3px", background: "var(--accent)", display: "inline-block", borderRadius: "2px", borderTop: "2px dashed var(--accent)" }} />
                    <span style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>Descuento actual (Espacio)</span>
                  </div>
                )}
                {btThreshold !== null && (
                  <div className="flex items-center gap-2">
                    <span style={{ width: "12px", height: "3px", background: "var(--destructive)", display: "inline-block", borderRadius: "2px" }} />
                    <span style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>Umbral baja temeraria</span>
                  </div>
                )}
              </div>

              {/* Chart 1: Puntos vs Descuento */}
              <div>
                <p style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], color: "var(--foreground)", fontFamily: "inherit", marginBottom: "12px" }}>
                  Puntuación vs Descuento (%)
                </p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart id={`chart-pts-${tabla.partidaId}`} data={chartData} margin={{ top: 4, right: 16, bottom: 24, left: 0 }}>
                    <CartesianGrid key="grid" strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      key="x"
                      dataKey="discount"
                      tick={{ fontSize: 11, fontFamily: "inherit", fill: "var(--muted-foreground)" }}
                      label={{ value: "Descuento (%)", position: "insideBottom", offset: -14, fontSize: 11, fontFamily: "inherit", fill: "var(--muted-foreground)" }}
                    />
                    <YAxis
                      key="y"
                      tick={{ fontSize: 11, fontFamily: "inherit", fill: "var(--muted-foreground)" }}
                      label={{ value: "Puntos", angle: -90, position: "insideLeft", offset: 12, fontSize: 11, fontFamily: "inherit", fill: "var(--muted-foreground)" }}
                    />
                    <Tooltip
                      key="tooltip"
                      contentStyle={{ fontFamily: "inherit", fontSize: "11px", border: "1px solid var(--border)", borderRadius: "var(--radius-banner)", background: "var(--card)", color: "var(--foreground)" }}
                      formatter={(value: number, name: string) => [fmtPts(value) + " p", name]}
                      labelFormatter={(l) => `Descuento: ${l}%`}
                    />
                    {Array.from({ length: maxShownCo }, (_, i) => (
                      <Line
                        key={`${tabla.partidaId}-pts_e${i + 1}`}
                        type="monotone"
                        dataKey={`pts_e${i + 1}`}
                        name={`Empresa ${i + 1}${i === 0 ? " (nosotros)" : ""}`}
                        stroke={CHART_COLORS[i % CHART_COLORS.length]}
                        strokeWidth={i === 0 ? 2.5 : 1.5}
                        dot={false}
                        strokeOpacity={i === 0 ? 1 : 0.55}
                      />
                    ))}
                    <ReferenceLine key={`${tabla.partidaId}-ref-rec`} x={recDescRounded} stroke="var(--primary)" strokeWidth={2} strokeDasharray="4 2" />
                    {actualDisc !== null && (
                      <ReferenceLine key={`${tabla.partidaId}-ref-actual`} x={actualDisc} stroke="var(--accent)" strokeWidth={1.5} strokeDasharray="6 3" />
                    )}
                    {btThreshold !== null && (
                      <ReferenceLine key={`${tabla.partidaId}-ref-bt`} x={btThreshold} stroke="var(--destructive)" strokeWidth={1.5} strokeDasharray="3 3" />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Chart 2: Posición vs Descuento (solo Empresa 1) */}
              <div>
                <p style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], color: "var(--foreground)", fontFamily: "inherit", marginBottom: "12px" }}>
                  Posición (ranking) de Empresa 1 vs Descuento (%)
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart id={`chart-rank-${tabla.partidaId}`} data={chartData} margin={{ top: 4, right: 16, bottom: 24, left: 0 }}>
                    <CartesianGrid key="grid" strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      key="x"
                      dataKey="discount"
                      tick={{ fontSize: 11, fontFamily: "inherit", fill: "var(--muted-foreground)" }}
                      label={{ value: "Descuento (%)", position: "insideBottom", offset: -14, fontSize: 11, fontFamily: "inherit", fill: "var(--muted-foreground)" }}
                    />
                    <YAxis
                      key="y"
                      reversed
                      tick={{ fontSize: 11, fontFamily: "inherit", fill: "var(--muted-foreground)" }}
                      label={{ value: "Posición", angle: -90, position: "insideLeft", offset: 12, fontSize: 11, fontFamily: "inherit", fill: "var(--muted-foreground)" }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      key="tooltip"
                      contentStyle={{ fontFamily: "inherit", fontSize: "11px", border: "1px solid var(--border)", borderRadius: "var(--radius-banner)", background: "var(--card)", color: "var(--foreground)" }}
                      formatter={(value: number) => [`#${value}`, "Posición"]}
                      labelFormatter={(l) => `Descuento: ${l}%`}
                    />
                    <Line
                      key={`${tabla.partidaId}-rank_e1`}
                      type="stepAfter"
                      dataKey="rank_e1"
                      name="Posición Empresa 1"
                      stroke="var(--primary)"
                      strokeWidth={2.5}
                      dot={false}
                    />
                    <ReferenceLine key={`${tabla.partidaId}-ref-rec2`} x={recDescRounded} stroke="var(--primary)" strokeWidth={2} strokeDasharray="4 2" />
                    {actualDisc !== null && (
                      <ReferenceLine key={`${tabla.partidaId}-ref-actual2`} x={actualDisc} stroke="var(--accent)" strokeWidth={1.5} strokeDasharray="6 3" />
                    )}
                    {btThreshold !== null && (
                      <ReferenceLine key={`${tabla.partidaId}-ref-bt2`} x={btThreshold} stroke="var(--destructive)" strokeWidth={1.5} strokeDasharray="3 3" />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Justificación generator ──────────────────────────────────────────────────

function buildJustificacion(
  tablaDatos: TablaDatos[],
  datosNegocio: string,
  numEmpresas: number,
): string {
  if (tablaDatos.length === 0) return "";

  const isMultiPartida = tablaDatos.length > 1;
  const mainTabla      = tablaDatos[0];
  const recDesc        = computeRecommendedDiscount(mainTabla);
  const aDs            = [recDesc, ...mainTabla.descuentos.slice(1).map(parseDisc)];
  const recPuntos      = calcPuntuacion(recDesc, mainTabla.presupuesto, mainTabla.puntuacionMax, aDs);
  const recPrecio      = mainTabla.presupuesto * (1 - recDesc / 100);
  const rebajado       = mainTabla.presupuesto * recDesc / 100;
  const btThreshold    = extractBTThreshold(mainTabla.bajatemeraria);

  const behaviorNote = `La fórmula de valoración económica aplicada sigue un modelo de proporcionalidad relativa (P = Pmáx × (Ob − Oi) / (Ob − Omín)), en el que la puntuación obtenida depende directamente de la distancia entre la oferta propia y la oferta más baja del panel comparativo. Este comportamiento es de tipo lineal respecto al descuento cuando el conjunto de empresas se mantiene constante.`;

  const marginalNote = `La eficiencia marginal del descuento —medida como incremento de puntos por punto porcentual adicional— es ${mainTabla.puntuacionMax > 0 ? "constante mientras la oferta propia no define el mínimo del panel" : "variable según la configuración del panel"}, lo que implica que una vez alcanzada la posición #1, cada punto porcentual adicional de rebaja supone un coste económico sin retorno en puntuación.`;

  const recNote = `Considerando la distribución actual de ofertas del panel de simulación, el descuento mínimo recomendado para alcanzar la posición #1 en el criterio económico es ${fmtPts(recDesc)}%, que daría lugar a un precio ofertado de ${fmtEuro(recPrecio)} € (s/IVA) y una puntuación estimada de ${fmtPts(recPuntos)} puntos sobre ${fmtPts(mainTabla.puntuacionMax)}, con una rebaja económica de ${fmtEuro(rebajado)} € sobre el presupuesto base.`;

  const btNote = btThreshold !== null
    ? ` Se advierte que el umbral de baja temeraria está definido en ${btThreshold}%; cualquier descuento que supere dicho valor deberá ser justificado formalmente en el sobre económico para evitar exclusión.`
    : "";

  const multiNote = isMultiPartida
    ? ` En escenario de partidas múltiples, el descuento recomendado se ha calculado de forma independiente por partida; la estrategia global debe considerar la coherencia entre ellas y la capacidad de absorber el coste total.`
    : "";

  const negocioNote = datosNegocio.trim()
    ? `\n\nDatos de negocio aportados por el equipo: "${datosNegocio.trim()}". Estos factores —histórico de descuentos, presión competitiva estimada y sensibilidad al precio— refuerzan la estrategia de posicionamiento recomendada. Se aconseja contrastar con el Market Intelligence del Portal de Ventas antes de formalizar la oferta económica.`
    : `\n\nNo se han incorporado datos de negocio adicionales. Para mayor precisión en la recomendación, se recomienda completar el campo "Datos a considerar de negocio" con el histórico de descuentos del cliente, la posición del incumbent y la sensibilidad al precio estimada, así como consultar los informes económicos disponibles en el Portal de Ventas.`;

  return `${behaviorNote}\n\n${marginalNote}\n\n${recNote}${btNote}${multiNote}${negocioNote}`;
}

// ─── AppEcoDescuentoContent ───────────────────────────────────────────────────

interface AppEcoDescuentoContentProps {
  oppId:   string;
  oppName: string;
}

export function AppEcoDescuentoContent({ oppId, oppName }: AppEcoDescuentoContentProps) {
  const user     = getAuthUser();
  const userId   = user.id ?? user.name ?? "anon";
  const simState = readSimState(oppId, userId);
  const simDone  = simState?.simPhase === "done" && (simState?.tablaDatos?.length ?? 0) > 0;
  const { isReadOnly } = useWorkspaceReadonly();

  const [datosNegocio, setDatosNegocio] = useState(() => readDatosNegocio(oppId, userId));
  // Applied text — what's actually used in the recommendation
  const [datosNegocioApplied, setDatosNegocioApplied] = useState<string | null>(
    () => readDatosNegocioApplied(oppId, userId)
  );
  // Whether the textarea currently matches the applied text (not dirty)
  const [isApplied, setIsApplied] = useState<boolean>(
    () => {
      const applied = readDatosNegocioApplied(oppId, userId);
      const typed   = readDatosNegocio(oppId, userId);
      return applied !== null && applied === typed;
    }
  );
  const [showAppliedMsg, setShowAppliedMsg] = useState(false);
  const appliedMsgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [espacioState, setEspacioState] = useState<EspacioState | null>(null);

  // Poll espacio state to get "descuento actual"
  useEffect(() => {
    const refresh = () => setEspacioState(readEspacioState(oppId));
    refresh();
    const id = setInterval(refresh, 2000);
    return () => clearInterval(id);
  }, [oppId]);

  const handleDatosNegocioChange = (val: string) => {
    setDatosNegocio(val);
    saveDatosNegocio(oppId, userId, val);
    // If user modifies text, mark as no longer applied
    if (isApplied) setIsApplied(false);
  };

  const handleAplicarDatosNegocio = () => {
    setDatosNegocioApplied(datosNegocio);
    saveDatosNegocioApplied(oppId, userId, datosNegocio);
    setIsApplied(true);
    // Show temporary success message
    setShowAppliedMsg(true);
    if (appliedMsgTimerRef.current) clearTimeout(appliedMsgTimerRef.current);
    appliedMsgTimerRef.current = setTimeout(() => setShowAppliedMsg(false), 3500);
  };

  const handleEditarDatosNegocio = () => {
    setIsApplied(false);
  };

  const tablaDatos     = simState?.tablaDatos ?? [];
  const numEmpresas    = simState?.numEmpresas ?? 0;
  // Justificación only uses the APPLIED datos de negocio, not the raw typed text
  const justificacion  = simDone ? buildJustificacion(tablaDatos, datosNegocioApplied ?? "", numEmpresas) : "";

  const inputBase: CSSProperties = {
    border: "1px solid var(--border)", borderRadius: "var(--radius-input)",
    padding: "10px 12px", background: "var(--input-background)",
    color: "var(--foreground)", fontSize: "var(--text-sm)",
    fontFamily: "inherit", outline: "none", width: "100%",
    lineHeight: "1.6",
  };

  const SectionHeader = ({ title, isGlobal = false }: { title: string; isGlobal?: boolean }) => (
    <div className="flex items-center gap-2" style={{ marginBottom: "16px" }}>
      <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], color: "var(--foreground)", fontFamily: "inherit" }}>
        {title}
      </span>
      {isGlobal && (
        <span style={{ fontSize: "var(--text-3xs)", padding: "1px 8px", borderRadius: "var(--radius-chip)", background: "var(--success-subtle)", color: "var(--success)", fontFamily: "inherit", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], letterSpacing: "0.04em" }}>
          AGREGADO
        </span>
      )}
      <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
    </div>
  );

  return (
    <div style={{ padding: "32px 40px", maxWidth: "960px" }}>

      {/* ── Header ── */}
      <div className="flex items-start gap-4 mb-8">
        <div className="bg-muted text-primary flex items-center justify-center flex-shrink-0" style={{ width: "48px", height: "48px", borderRadius: "var(--radius)" }}>
          <Percent size={24} />
        </div>
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 style={{ fontSize: "var(--text-xl)" }}>Recomendación de descuento</h3>
            <span style={{ padding: "2px 10px", borderRadius: "var(--radius-chip)", fontSize: "var(--text-3xs)", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], letterSpacing: "0.04em", background: "var(--primary-subtle)", color: "var(--primary)", fontFamily: "inherit" }}>
              IA · Económico
            </span>
          </div>
          <p className="text-muted-foreground" style={{ fontSize: "var(--text-sm)", maxWidth: "600px", fontFamily: "inherit", lineHeight: "1.55" }}>
            Análisis matemático y de negocio para recomendar el descuento óptimo que maximiza la puntuación sin comprometer innecesariamente el margen económico.
          </p>
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--border)", marginBottom: "28px" }} />

      {/* ── Aviso si simulación no configurada ── */}
      {!simDone && (
        <div className="flex items-start gap-3 mb-6" style={{ padding: "14px 16px", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: "var(--muted)" }}>
          <AlertCircle size={16} style={{ color: "var(--muted-foreground)", flexShrink: 0, marginTop: "1px" }} />
          <div>
            <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], color: "var(--foreground)", fontFamily: "inherit", marginBottom: "4px" }}>
              Simulación económica no configurada
            </p>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit", lineHeight: "1.5" }}>
              Debe configurar y simular la fórmula económica en <strong style={{ fontFamily: "inherit" }}>Configuración y simulación</strong> antes de generar la recomendación de descuento.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-6">

        {/* ══ BLOQUE 1 — Datos de negocio (opcional) ══════════════════════ */}
        <div className="border border-border bg-card" style={{ borderRadius: "var(--radius)" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", background: "var(--neutral-subtle)", borderRadius: "var(--radius) var(--radius) 0 0" }}>
            <div className="flex items-center gap-2">
              <BookOpen size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
              <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], color: "var(--foreground)", fontFamily: "inherit" }}>
                Datos a considerar de negocio
              </span>
              <span style={{ fontSize: "var(--text-3xs)", padding: "1px 7px", borderRadius: "var(--radius-chip)", background: "var(--neutral-subtle)", color: "var(--muted-foreground)", fontFamily: "inherit", border: "1px solid var(--border)" }}>
                opcional
              </span>
              {/* Applied badge */}
              {isApplied && datosNegocio.trim() !== "" && (
                <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "var(--text-3xs)", padding: "1px 8px", borderRadius: "var(--radius-chip)", background: "var(--success-subtle)", color: "var(--success)", fontFamily: "inherit", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], letterSpacing: "0.04em" }}>
                  <CheckCircle2 size={11} />
                  Aplicado
                </span>
              )}
            </div>
          </div>
          <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <textarea
              value={datosNegocio}
              readOnly={isApplied}
              onChange={(e) => handleDatosNegocioChange(e.target.value)}
              placeholder="Histórico de descuentos, incumbent, presión competitiva estimada, sensibilidad al precio, etc."
              style={{
                ...inputBase,
                resize: "vertical",
                minHeight: "88px",
                background: isApplied ? "var(--muted)" : "var(--input-background)",
                cursor: isApplied ? "default" : "text",
              }}
              onFocus={(e) => { if (!isApplied) e.target.style.borderColor = "var(--primary)"; }}
              onBlur={(e)  => { e.target.style.borderColor = "var(--border)"; }}
            />

            {/* Temporary success message */}
            {showAppliedMsg && (
              <div className="flex items-center gap-2" style={{ padding: "7px 12px", borderRadius: "var(--radius-banner)", background: "var(--success-subtle)", border: "1px solid var(--success)", alignSelf: "flex-start" }}>
                <CheckCircle2 size={13} style={{ color: "var(--success)", flexShrink: 0 }} />
                <span style={{ fontSize: "var(--text-xs)", color: "var(--success)", fontFamily: "inherit" }}>
                  Datos de negocio aplicados correctamente.
                </span>
              </div>
            )}

            {/* Action button */}
            <div className="flex items-center justify-between">
              <p style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
                {isApplied
                  ? "Estos datos están activos y se integran en la justificación de la recomendación."
                  : "Esta información se integrará en la justificación automática de la recomendación solo tras pulsar «Aplicar»."}
              </p>
              {!isApplied ? (
                <button
                  onClick={handleAplicarDatosNegocio}
                  disabled={datosNegocio.trim() === "" || isReadOnly}
                  style={{
                    padding: "7px 16px",
                    borderRadius: "var(--radius-button)",
                    background: (datosNegocio.trim() === "" || isReadOnly) ? "var(--muted)" : "var(--primary)",
                    color: (datosNegocio.trim() === "" || isReadOnly) ? "var(--muted-foreground)" : "var(--primary-foreground)",
                    border: "none",
                    cursor: (datosNegocio.trim() === "" || isReadOnly) ? "not-allowed" : "pointer",
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                    fontFamily: "inherit",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    marginLeft: "16px",
                    opacity: (datosNegocio.trim() === "" || isReadOnly) ? 0.6 : 1,
                    transition: "opacity 0.15s",
                  }}
                >
                  Aplicar datos de negocio
                </button>
              ) : !isReadOnly ? (
                <button
                  onClick={handleEditarDatosNegocio}
                  style={{
                    padding: "7px 16px",
                    borderRadius: "var(--radius-button)",
                    background: "transparent",
                    color: "var(--primary)",
                    border: "1px solid var(--primary)",
                    cursor: "pointer",
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                    fontFamily: "inherit",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    marginLeft: "16px",
                  }}
                >
                  Editar datos de negocio
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* ══ BLOQUE 2 + 3 — KPIs y Visualizaciones (por partida) ══════════ */}
        {simDone && (
          <div className="border border-border bg-card" style={{ borderRadius: "var(--radius)" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", background: "var(--neutral-subtle)", borderRadius: "var(--radius) var(--radius) 0 0" }}>
              <div className="flex items-center gap-2">
                <Target size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], color: "var(--foreground)", fontFamily: "inherit" }}>
                  Descuento recomendado por el modelo
                </span>
              </div>
            </div>

            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "32px" }}>

              {/* Nota: Empresa 1 = nuestra empresa */}
              <div className="flex items-start gap-2" style={{ padding: "8px 12px", borderRadius: "var(--radius-banner)", background: "var(--neutral-subtle)", border: "1px solid var(--border)" }}>
                <Info size={12} style={{ color: "var(--muted-foreground)", flexShrink: 0, marginTop: "1px" }} />
                <p style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit", lineHeight: "1.5" }}>
                  La recomendación calcula el descuento mínimo de <strong style={{ fontFamily: "inherit" }}>Empresa 1</strong> para alcanzar posición #1, manteniendo los descuentos del resto fijos. Las marcas en las gráficas reflejan el descuento recomendado (línea continua) y el descuento actual del Espacio de trabajo (línea discontinua).
                </p>
              </div>

              {/* Por partida */}
              {tablaDatos.map((tabla) => {
                const actualDisc = espacioState?.descuentos[tabla.partidaId] ?? null;
                return (
                  <div key={tabla.partidaId}>
                    <SectionHeader title={tabla.partidaNombre} />
                    <PartidaRecomendacion
                      tabla={tabla}
                      numEmpresas={numEmpresas}
                      actualDiscount={actualDisc}
                    />
                  </div>
                );
              })}

              {/* GLOBAL si hay desglose */}
              {tablaDatos.length > 1 && (() => {
                const globalTabla: TablaDatos = {
                  partidaId:     "eco-global",
                  partidaNombre: "GLOBAL (agregado)",
                  presupuesto:   0,
                  puntuacionMax: 0,
                  bajatemeraria: "",
                  descuentos:    Array(numEmpresas).fill("0"),
                };
                return (
                  <div>
                    <SectionHeader title="GLOBAL (agregado)" isGlobal />
                    <PartidaRecomendacion
                      tabla={globalTabla}
                      numEmpresas={numEmpresas}
                      isGlobal
                      allTablaDatos={tablaDatos}
                      actualDiscount={null}
                    />
                  </div>
                );
              })()}

            </div>
          </div>
        )}

        {/* ══ BLOQUE 4 — Justificación de la recomendación ══════════════ */}
        {simDone && (
          <div className="border border-border bg-card" style={{ borderRadius: "var(--radius)" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", background: "var(--neutral-subtle)", borderRadius: "var(--radius) var(--radius) 0 0" }}>
              <div className="flex items-center gap-2">
                <BarChart2 size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], color: "var(--foreground)", fontFamily: "inherit" }}>
                  Justificación de la recomendación
                </span>
                <span style={{ fontSize: "var(--text-3xs)", padding: "1px 7px", borderRadius: "var(--radius-chip)", background: "var(--primary-subtle)", color: "var(--primary)", fontFamily: "inherit", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], letterSpacing: "0.03em" }}>
                  Generado automáticamente
                </span>
              </div>
            </div>
            <div style={{ padding: "16px 20px" }}>
              <textarea
                readOnly
                value={justificacion}
                style={{
                  ...inputBase,
                  resize: "vertical",
                  minHeight: "240px",
                  background: "var(--muted)",
                  cursor: "default",
                  color: "var(--foreground)",
                  fontSize: "var(--text-xs)",
                  lineHeight: "1.75",
                }}
              />
              <p style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit", marginTop: "6px" }}>
                Texto generado combinando análisis matemático de la fórmula, eficiencia marginal del descuento y los datos de negocio introducidos.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}