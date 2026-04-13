// app/not-found.tsx
// Vite/React Router: registrado como `path: "*"` en routes.ts
// Next.js App Router: usado automáticamente como página 404 global
"use client";

import { type CSSProperties } from "react";
import { useLocation } from "../lib/router-adapter";
import { useNav } from "../lib/routes/navigation";
import { routes } from "../lib/routes/config";
import { Home, ArrowLeft, Search, AlertTriangle } from "lucide-react";

// ─── Quick links que se muestran en el 404 ────────────────────────────────
const QUICK_LINKS = [
  { label: "Inicio",                  href: routes.home(),                    icon: <Home   size={14} /> },
  { label: "Ofertas",                 href: routes.prospects.list(),          icon: <Search size={14} /> },
  { label: "Inteligencia de mercado", href: routes.intelligence.marketing(), icon: <Search size={14} /> },
] as const;

export default function NotFoundPage() {
  const { pathname } = useLocation();
  const nav          = useNav();

  return (
    <div
      className="min-h-screen bg-background flex flex-col items-center justify-center"
      style={{ padding: "40px 24px" }}
    >
      {/* Card central */}
      <div
        className="bg-card border border-border w-full"
        style={{
          maxWidth:     "520px",
          borderRadius: "var(--radius)",
          boxShadow:    "var(--elevation-sm)",
          padding:      "48px 40px",
          textAlign:    "center",
        }}
      >
        {/* Icono */}
        <div
          className="flex items-center justify-center mx-auto mb-6"
          style={{
            width:        "64px",
            height:       "64px",
            borderRadius: "var(--radius)",
            background:   "var(--warning-subtle)",
            border:       "1px solid var(--warning)",
          }}
        >
          <AlertTriangle size={28} style={{ color: "var(--warning-foreground)" }} />
        </div>

        {/* Código */}
        <p
          style={{
            fontSize:     "var(--text-kpi)",
            fontFamily:   "inherit",
            fontWeight:   "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
            color:        "var(--primary)",
            marginBottom: "8px",
            lineHeight:   "1",
          }}
        >
          404
        </p>

        {/* Título */}
        <h4 style={{ marginBottom: "10px" }}>
          Página no encontrada
        </h4>

        {/* Descripción */}
        <p
          className="text-muted-foreground"
          style={{
            fontSize:     "var(--text-sm)",
            fontFamily:   "inherit",
            marginBottom: "6px",
          }}
        >
          La ruta{" "}
          <code
            style={{
              fontFamily:   "monospace",
              fontSize:     "var(--text-xs)",
              background:   "var(--muted)",
              padding:      "2px 6px",
              borderRadius: "var(--radius-banner)",
              color:        "var(--foreground)",
            }}
          >
            {pathname}
          </code>{" "}
          no existe en Akena.
        </p>
        <p
          className="text-muted-foreground"
          style={{ fontSize: "var(--text-sm)", fontFamily: "inherit", marginBottom: "32px" }}
        >
          Puede que el enlace esté desactualizado o que la URL sea incorrecta.
        </p>

        {/* CTA principal */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => nav.home({ replace: true })}
            className="bg-primary text-primary-foreground hover:opacity-90 transition-opacity w-full flex items-center justify-center gap-2"
            style={{
              padding:      "10px 20px",
              borderRadius: "var(--radius-button)",
              border:       "none",
              cursor:       "pointer",
              fontSize:     "var(--text-sm)",
              fontFamily:   "inherit",
              fontWeight:   "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
            }}
          >
            <Home size={15} />
            Ir al inicio
          </button>

          <button
            onClick={() => nav.back()}
            className="text-muted-foreground hover:text-foreground transition-colors w-full flex items-center justify-center gap-2"
            style={{
              padding:      "10px 20px",
              borderRadius: "var(--radius-button)",
              border:       "1px solid var(--border)",
              background:   "transparent",
              cursor:       "pointer",
              fontSize:     "var(--text-sm)",
              fontFamily:   "inherit",
            }}
          >
            <ArrowLeft size={15} />
            Volver atrás
          </button>
        </div>

        {/* Divisor */}
        <div
          className="border-t border-border"
          style={{ margin: "28px 0 20px" }}
        />

        {/* Quick links */}
        <p
          className="text-muted-foreground"
          style={{ fontSize: "var(--text-2xs)", fontFamily: "inherit", marginBottom: "12px" }}
        >
          O navega directamente a:
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {QUICK_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-primary hover:opacity-70 transition-opacity flex items-center gap-1.5"
              style={{ fontSize: "var(--text-xs)", fontFamily: "inherit", textDecoration: "none" }}
            >
              {link.icon}
              {link.label}
            </a>
          ))}
        </div>
      </div>

      {/* Footer branding */}
      <p
        className="text-muted-foreground mt-8"
        style={{ fontSize: "var(--text-3xs)", fontFamily: "inherit" }}
      >
        Akena · Plataforma corporativa de gestión de ofertas · Accenture
      </p>
    </div>
  );
}
