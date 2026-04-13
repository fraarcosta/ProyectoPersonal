"use client";

// Línea Económica → Análisis económico → Espacio de trabajo
// Persistencia COLECTIVA (clave sin userId): eco-espacio-${oppId}
// Lee la simulación del usuario actual para obtener la configuración de partidas.

import { useState, useEffect, useCallback, type CSSProperties } from "react";
import {
  Settings, AlertTriangle, CheckCircle2, Info, Copy, User, Lock,
} from "lucide-react";
import { AppButton } from "../../../../_components/ui";
import { getAuthUser } from "../../../../_components/auth-store";
import { useWorkspaceReadonly } from "./workspace-readonly-context";

// ─── Shared types/helpers (self-contained) ─────────────────────────────────────

interface TablaDatos {
  partidaId:     string;
  partidaNombre: string;
  presupuesto:   number;
  puntuacionMax: number;
  bajatemeraria: string;
  descuentos:    string[];
}

const parseDisc = (s: string): number => {
  const n = parseFloat(String(s).replace(",", "."));
  return isNaN(n) ? 0 : Math.max(0, Math.min(100, n));
};
const fmtEuro = (n: number) =>
  new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(n);
const fmtPts  = (n: number) => n.toFixed(2);
const today   = () =>
  new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });

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

function computeRecommendedDiscount(tabla: TablaDatos): number {
  const otherDescs = tabla.descuentos.slice(1).map(parseDisc);
  for (let d = 0; d <= 50; d += 0.5) {
    const allDescs = [d, ...otherDescs];
    const punts    = allDescs.map((di) => calcPuntuacion(di, tabla.presupuesto, tabla.puntuacionMax, allDescs));
    const ranks    = calcRanking(punts, allDescs);
    if (ranks[0] === 1) return d;
  }
  const maxOther = Math.max(0, ...otherDescs);
  return Math.min(Math.round(maxOther + 1), 50);
}

// ─── Collective persistence ───────────────────────────────────────────────────

interface EspacioState {
  descuentos: Record<string, string>;
  updatedAt:  string;
  updatedBy:  string;
}

function readEspacio(oppId: string): EspacioState | null {
  try {
    const raw = localStorage.getItem(`eco-espacio-${oppId}`);
    return raw ? (JSON.parse(raw) as EspacioState) : null;
  } catch { return null; }
}

function saveEspacio(oppId: string, state: EspacioState) {
  try { localStorage.setItem(`eco-espacio-${oppId}`, JSON.stringify(state)); } catch {}
}

// ─── Individual simulation read ───────────────────────────────────────────────

function readSimTablaDatos(oppId: string, userId: string): { tablaDatos: TablaDatos[]; numEmpresas: number } | null {
  try {
    const raw = localStorage.getItem(`eco-sim-${oppId}-${userId}`);
    if (!raw) return null;
    const p = JSON.parse(raw) as { simPhase?: string; tablaDatos?: TablaDatos[]; numEmpresas?: number };
    if (p.simPhase === "done" && Array.isArray(p.tablaDatos)) {
      return { tablaDatos: p.tablaDatos, numEmpresas: p.numEmpresas ?? 0 };
    }
    return null;
  } catch { return null; }
}

// ─── PartidaRow ───────────────────────────────────────────────────────────────

interface PartidaRowProps {
  tabla:           TablaDatos;
  numEmpresas:     number;
  finalDiscount:   string;
  onChangeDiscount:(value: string) => void;
  isGlobal?:       boolean;
  allTablaDatos?:  TablaDatos[];
  readOnly?:       boolean;
}

function PartidaRow({ tabla, numEmpresas, finalDiscount, onChangeDiscount, isGlobal = false, allTablaDatos, readOnly = false }: PartidaRowProps) {
  const disc    = parseDisc(finalDiscount);
  const btThreshold = extractBTThreshold(tabla.bajatemeraria);
  const isBT    = !isGlobal && btThreshold !== null && disc > btThreshold;

  // Calculate stats for empresa 1 (our company) with the final discount
  const calcStats = () => {
    if (isGlobal && allTablaDatos) {
      const precio    = allTablaDatos.reduce((s, t) => s + t.presupuesto * (1 - disc / 100), 0);
      const puntos    = allTablaDatos.reduce((s, t) => {
        const aDs = [disc, ...t.descuentos.slice(1).map(parseDisc)];
        return s + calcPuntuacion(disc, t.presupuesto, t.puntuacionMax, aDs);
      }, 0);
      const rebajado  = allTablaDatos.reduce((s, t) => s + t.presupuesto * disc / 100, 0);
      const maxTotal  = allTablaDatos.reduce((s, t) => s + t.puntuacionMax, 0);
      return { precio, puntos, rebajado, maxTotal };
    }
    const aDs      = [disc, ...tabla.descuentos.slice(1).map(parseDisc)];
    const precio   = tabla.presupuesto * (1 - disc / 100);
    const puntos   = calcPuntuacion(disc, tabla.presupuesto, tabla.puntuacionMax, aDs);
    const rebajado = tabla.presupuesto * disc / 100;
    return { precio, puntos, rebajado, maxTotal: tabla.puntuacionMax };
  };
  const { precio, puntos, rebajado, maxTotal } = calcStats();

  const inputSt: CSSProperties = {
    width: "80px",
    padding: "7px 10px",
    border: `2px solid ${isBT ? "var(--destructive)" : "var(--primary)"}`,
    borderRadius: "var(--radius-input)",
    background: "var(--input-background)",
    color: isBT ? "var(--destructive)" : "var(--foreground)",
    fontSize: "var(--text-sm)",
    fontFamily: "inherit",
    fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
    outline: "none",
    textAlign: "right" as const,
  };

  const statCell: CSSProperties = {
    display:       "flex",
    flexDirection: "column",
    gap:           "2px",
    padding:       "12px 16px",
    borderLeft:    "1px solid var(--border)",
    flex:          "1 1 0",
  };

  const statLabel: CSSProperties = {
    fontSize:   "var(--text-2xs)",
    color:      "var(--muted-foreground)",
    fontFamily: "inherit",
  };

  const statValue: CSSProperties = {
    fontSize:   "var(--text-sm)",
    fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
    color:      "var(--foreground)",
    fontFamily: "inherit",
  };

  return (
    <div
      className="border border-border"
      style={{
        borderRadius: "var(--radius)",
        background:   isBT ? "var(--warning-subtle)" : "var(--card)",
        borderColor:  isBT ? "var(--destructive)" : "var(--border)",
        overflow:     "hidden",
      }}
    >
      {/* Cabecera de la partida */}
      <div
        className="flex items-center justify-between"
        style={{ padding: "10px 16px", background: "var(--neutral-subtle)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2">
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
        {isBT && (
          <div className="flex items-center gap-2">
            <AlertTriangle size={13} style={{ color: "var(--destructive)", flexShrink: 0 }} />
            <span style={{ fontSize: "var(--text-2xs)", color: "var(--destructive)", fontFamily: "inherit", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"] }}>
              Baja temeraria
            </span>
          </div>
        )}
      </div>

      {/* Cuerpo: 4 campos en fila */}
      <div style={{ display: "flex", alignItems: "stretch" }}>

        {/* Campo 1: Descuento final (editable) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", padding: "12px 16px", minWidth: "160px" }}>
          <span style={{ ...statLabel, color: "var(--primary)" }}>Descuento final</span>
          <div className="flex items-center gap-6">
            <input
              type="number"
              min={0} max={100} step={0.5}
              value={finalDiscount}
              onChange={(e) => onChangeDiscount(e.target.value)}
              style={inputSt}
              onFocus={(e)  => { e.target.style.boxShadow = "0 0 0 2px var(--primary)"; }}
              onBlur={(e)   => { e.target.style.boxShadow = "none"; }}
              readOnly={readOnly}
            />
            <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>%</span>
          </div>
          <span style={{ fontSize: "var(--text-3xs)", color: "var(--primary)", fontFamily: "inherit", opacity: 0.75 }}>
            editable
          </span>
        </div>

        {/* Campo 2: Presupuesto con descuento */}
        <div style={statCell}>
          <span style={statLabel}>Presupuesto s/ IVA con descuento</span>
          <span style={statValue}>{fmtEuro(precio)} €</span>
          <span style={{ ...statLabel, fontSize: "var(--text-3xs)" }}>precio ofertado estimado</span>
        </div>

        {/* Campo 3: Puntuación */}
        <div style={{ ...statCell, borderRight: "none" }}>
          <span style={statLabel}>Puntuación obtenida</span>
          <div className="flex items-baseline gap-2">
            <span style={{ ...statValue, color: "var(--success)", fontSize: "var(--text-lg)" }}>
              {fmtPts(puntos)}
            </span>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>p</span>
          </div>
          <span style={{ ...statLabel, fontSize: "var(--text-3xs)" }}>de {fmtPts(maxTotal)} p máx.</span>
        </div>

        {/* Campo 4: Importe rebajado */}
        <div style={{ ...statCell, borderRight: "none" }}>
          <span style={statLabel}>Importe rebajado</span>
          <span style={{ ...statValue, color: "var(--muted-foreground)" }}>−{fmtEuro(rebajado)} €</span>
          <span style={{ ...statLabel, fontSize: "var(--text-3xs)" }}>vs. presupuesto base</span>
        </div>

      </div>
    </div>
  );
}

// ─── AppEcoEspacioContent ─────────────────────────────────────────────────────

interface AppEcoEspacioContentProps {
  oppId:   string;
  oppName: string;
}

export function AppEcoEspacioContent({ oppId, oppName }: AppEcoEspacioContentProps) {
  const user     = getAuthUser();
  const userId   = user.id ?? user.name ?? "anon";
  const { isReadOnly } = useWorkspaceReadonly();

  // Stable: read simulation data only once on mount (individual, read-only here)
  const [simData] = useState(() => readSimTablaDatos(oppId, userId));
  const simDone   = simData !== null && simData.tablaDatos.length > 0;

  const tablaDatos  = simData?.tablaDatos ?? [];
  const numEmpresas = simData?.numEmpresas ?? 0;

  // Initialize collective espacio state
  const [espacio, setEspacio] = useState<EspacioState>(() => {
    const saved = readEspacio(oppId);
    if (saved) return saved;
    // Default: no discounts set
    const descuentos: Record<string, string> = {};
    tablaDatos.forEach((t) => { descuentos[t.partidaId] = "0"; });
    return { descuentos, updatedAt: "", updatedBy: "" };
  });

  // Re-read collective state every 3 seconds (simulate multi-user sync)
  useEffect(() => {
    const refresh = () => {
      const latest = readEspacio(oppId);
      if (latest) setEspacio(latest);
    };
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, [oppId]);

  // Sync new partidas from simulation — runs only once after mount (tablaDatos is stable)
  useEffect(() => {
    if (!simDone) return;
    setEspacio((prev) => {
      const updated = { ...prev.descuentos };
      let changed   = false;
      tablaDatos.forEach((t) => {
        if (!(t.partidaId in updated)) {
          updated[t.partidaId] = "0";
          changed = true;
        }
      });
      // Return the same reference if nothing changed → avoids spurious re-renders
      if (!changed) return prev;
      return { ...prev, descuentos: updated };
    });
  }, [simDone, tablaDatos]);

  const updateDiscount = useCallback((partidaId: string, value: string) => {
    const next: EspacioState = {
      descuentos: { ...espacio.descuentos, [partidaId]: value },
      updatedAt:  today(),
      updatedBy:  user.name,
    };
    setEspacio(next);
    saveEspacio(oppId, next);
  }, [espacio, oppId, user.name]);

  const applyRecomendacion = useCallback(() => {
    if (!simDone) return;
    const newDescs: Record<string, string> = { ...espacio.descuentos };
    tablaDatos.forEach((t) => {
      const rec = computeRecommendedDiscount(t);
      newDescs[t.partidaId] = String(Math.round(rec * 10) / 10);
    });
    const next: EspacioState = {
      descuentos: newDescs,
      updatedAt:  today(),
      updatedBy:  user.name,
    };
    setEspacio(next);
    saveEspacio(oppId, next);
  }, [simDone, tablaDatos, espacio, oppId, user.name]);

  const hasUpdated = espacio.updatedAt !== "";

  // Global virtual tabla
  const globalTabla: TablaDatos = {
    partidaId:     "eco-global",
    partidaNombre: "GLOBAL (agregado)",
    presupuesto:   0,
    puntuacionMax: 0,
    bajatemeraria: "",
    descuentos:    Array(numEmpresas).fill("0"),
  };
  const globalDiscount = tablaDatos.length > 0
    ? String(Math.round(tablaDatos.reduce((s, t) => s + parseDisc(espacio.descuentos[t.partidaId] ?? "0"), 0) / tablaDatos.length * 10) / 10)
    : "0";

  return (
    <div style={{ padding: "32px 40px", maxWidth: "960px" }}>

      {/* ── Header ── */}
      <div className="flex items-start gap-4 mb-8">
        <div className="bg-muted text-primary flex items-center justify-center flex-shrink-0" style={{ width: "48px", height: "48px", borderRadius: "var(--radius)" }}>
          <Settings size={24} />
        </div>
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 style={{ fontSize: "var(--text-xl)" }}>Espacio de trabajo</h3>
            <span style={{ padding: "2px 10px", borderRadius: "var(--radius-chip)", fontSize: "var(--text-3xs)", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], letterSpacing: "0.04em", background: "var(--success-subtle)", color: "var(--success)", fontFamily: "inherit" }}>
              Económico
            </span>
            <span style={{ padding: "2px 10px", borderRadius: "var(--radius-chip)", fontSize: "var(--text-3xs)", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], letterSpacing: "0.04em", background: "var(--accent-subtle)", color: "var(--accent)", fontFamily: "inherit" }}>
              Colectivo
            </span>
          </div>
          <p className="text-muted-foreground" style={{ fontSize: "var(--text-sm)", maxWidth: "600px", fontFamily: "inherit", lineHeight: "1.55" }}>
            Define el descuento final para cada partida. Los cambios son colectivos y visibles para todos los miembros del equipo.
          </p>
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--border)", marginBottom: "28px" }} />

      {/* ── Aviso si no hay simulación ── */}
      {!simDone && (
        <div className="flex items-start gap-3 mb-6" style={{ padding: "14px 16px", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: "var(--muted)" }}>
          <AlertTriangle size={16} style={{ color: "var(--muted-foreground)", flexShrink: 0, marginTop: "1px" }} />
          <div>
            <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"], color: "var(--foreground)", fontFamily: "inherit", marginBottom: "4px" }}>
              Simulación económica no configurada
            </p>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit", lineHeight: "1.5" }}>
              Configure y simule la fórmula económica en <strong style={{ fontFamily: "inherit" }}>Configuración y simulación</strong> para habilitar el Espacio de trabajo.
            </p>
          </div>
        </div>
      )}

      {simDone && (
        <div className="flex flex-col gap-5">

          {/* Barra de acciones + auditoría */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              {!isReadOnly && (
              <AppButton
                variant="primary"
                size="sm"
                icon={<Copy size={13} />}
                onClick={applyRecomendacion}
              >
                Aplicar valores de recomendación
              </AppButton>
              )}
            </div>

            {hasUpdated && (
              <div className="flex items-center gap-2" style={{ padding: "6px 12px", borderRadius: "var(--radius-banner)", background: "var(--neutral-subtle)", border: "1px solid var(--border)" }}>
                <User size={12} style={{ color: "var(--muted-foreground)" }} />
                <span style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
                  Última actualización el{" "}
                  <strong style={{ color: "var(--foreground)", fontFamily: "inherit" }}>{espacio.updatedAt}</strong>
                  {" "}por{" "}
                  <strong style={{ color: "var(--foreground)", fontFamily: "inherit" }}>{espacio.updatedBy}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Nota de colectividad */}
          <div className="flex items-start gap-2" style={{ padding: "8px 12px", borderRadius: "var(--radius-banner)", background: "var(--neutral-subtle)", border: "1px solid var(--border)" }}>
            <Info size={12} style={{ color: "var(--muted-foreground)", flexShrink: 0, marginTop: "1px" }} />
            <p style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit", lineHeight: "1.5" }}>
              Solo el campo <strong style={{ fontFamily: "inherit" }}>Descuento final</strong> es editable. El resto de valores se recalculan automáticamente. Los cambios son visibles para todos los usuarios del equipo. El descuento actual aquí definido se refleja en las gráficas de la pantalla de Recomendación.
            </p>
          </div>

          {/* ── Partidas ── */}
          {tablaDatos.map((tabla) => (
            <PartidaRow
              key={tabla.partidaId}
              tabla={tabla}
              numEmpresas={numEmpresas}
              finalDiscount={espacio.descuentos[tabla.partidaId] ?? "0"}
              onChangeDiscount={(v) => updateDiscount(tabla.partidaId, v)}
              readOnly={isReadOnly}
            />
          ))}

          {/* GLOBAL agregado (solo si hay múltiples partidas) */}
          {tablaDatos.length > 1 && (
            <PartidaRow
              tabla={globalTabla}
              numEmpresas={numEmpresas}
              finalDiscount={globalDiscount}
              onChangeDiscount={() => {}}
              isGlobal
              allTablaDatos={tablaDatos}
            />
          )}

          {/* Nota de baja temeraria */}
          {tablaDatos.some((t) => {
            const bt = extractBTThreshold(t.bajatemeraria);
            return bt !== null && parseDisc(espacio.descuentos[t.partidaId] ?? "0") > bt;
          }) && (
            <div className="flex items-start gap-3" style={{ padding: "10px 14px", borderRadius: "var(--radius-banner)", background: "var(--destructive-subtle)", border: "1px solid var(--destructive)" }}>
              <AlertTriangle size={13} style={{ color: "var(--destructive)", flexShrink: 0, marginTop: "2px" }} />
              <p style={{ fontSize: "var(--text-xs)", color: "var(--destructive)", fontFamily: "inherit", lineHeight: "1.5" }}>
                Una o más partidas supera el umbral de baja temeraria definido en el pliego. Asegúrese de incluir la justificación correspondiente en el sobre económico antes de presentar la oferta.
              </p>
            </div>
          )}

          {/* Confirmación de guardado */}
          {hasUpdated && (
            <div className="flex items-center gap-2" style={{ padding: "8px 12px", borderRadius: "var(--radius-banner)", background: "var(--success-subtle)", border: "1px solid var(--border)", alignSelf: "flex-start" }}>
              <CheckCircle2 size={13} style={{ color: "var(--success)" }} />
              <span style={{ fontSize: "var(--text-xs)", color: "var(--success)", fontFamily: "inherit" }}>
                Valores guardados y sincronizados colectivamente.
              </span>
            </div>
          )}

        </div>
      )}
    </div>
  );
}