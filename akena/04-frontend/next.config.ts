// ─── Next.js Configuration — Akena ────────────────────────────────────────────
//
// ESTRATEGIA DE RUTAS:
//   Los paths canónicos de la app son los nombres de directorio en español
//   que usa el file-system de Next.js App Router (src/app/(dashboard)/...).
//   Los redirects a continuación mapean alias en inglés y variantes legacy
//   hacia esos paths canónicos.
//
//   Path canónico                Archivo
//   ─────────────────────────────────────────────────────────
//   /                            app/page.tsx  (login)
//   /home                        app/(dashboard)/home/page.tsx
//   /nueva-oportunidad           app/(dashboard)/nueva-oportunidad/page.tsx
//   /seleccionar-oportunidad     app/(dashboard)/seleccionar-oportunidad/page.tsx
//   /workspace/[id]              app/(dashboard)/workspace/[id]/page.tsx
//   /portales                    app/(dashboard)/portales/page.tsx
//   /marketing-intelligence      app/(dashboard)/marketing-intelligence/page.tsx
//   /diagnostico                 app/(dashboard)/diagnostico/page.tsx

import type { NextConfig } from "next";

const nextConfig: NextConfig = {

  // ── Directorio fuente ────────────────────────────────────────────────────
  // Next.js reconoce /src automáticamente desde v13. No se requiere config.

  // ── Redirects ────────────────────────────────────────────────────────────
  // Canonical English aliases → Spanish file-based paths
  // Legacy Spanish aliases    → Spanish file-based paths
  async redirects() {
    return [
      // ── Oportunidades ────────────────────────────────────────────────────
      { source: "/opportunities/new",    destination: "/nueva-oportunidad",       permanent: false },
      { source: "/opportunities/select", destination: "/seleccionar-oportunidad", permanent: false },
      { source: "/opportunities",        destination: "/seleccionar-oportunidad", permanent: false },

      // ── Portales ─────────────────────────────────────────────────────────
      { source: "/portals",              destination: "/portales",                permanent: false },

      // ── Inteligencia de mercado ───────────────────────────────────────────
      { source: "/intelligence/market",      destination: "/marketing-intelligence", permanent: false },
      { source: "/intelligence/competitive", destination: "/marketing-intelligence", permanent: false },

      // ── Legacy español (variantes anteriores) ────────────────────────────
      { source: "/ofertas",              destination: "/seleccionar-oportunidad", permanent: false },
      { source: "/ofertas/nueva",        destination: "/nueva-oportunidad",       permanent: false },
      { source: "/ofertas/seleccionar",  destination: "/seleccionar-oportunidad", permanent: false },
      { source: "/oportunidades",        destination: "/seleccionar-oportunidad", permanent: false },
      { source: "/oportunidades/nueva",  destination: "/nueva-oportunidad",       permanent: false },

      // ── Inteligencia legacy ───────────────────────────────────────────────
      { source: "/inteligencia/mercado",      destination: "/marketing-intelligence", permanent: false },
      { source: "/inteligencia/competencia",  destination: "/marketing-intelligence", permanent: false },
      { source: "/marketing-intelligence-old",destination: "/marketing-intelligence", permanent: false },

      // ── Admin (sin implementar — redirige al portal de gestión) ──────────
      { source: "/admin/usuarios",       destination: "/portales",  permanent: false },
      { source: "/admin/configuracion",  destination: "/portales",  permanent: false },
      { source: "/admin/integraciones",  destination: "/portales",  permanent: false },
      { source: "/admin/users",          destination: "/portales",  permanent: false },
      { source: "/admin/settings",       destination: "/portales",  permanent: false },
      { source: "/admin/integrations",   destination: "/portales",  permanent: false },
    ];
  },

  // ── Imágenes ─────────────────────────────────────────────────────────────
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },

  // ── Experimental ─────────────────────────────────────────────────────────
  experimental: {
    reactCompiler: false,
  },
};

export default nextConfig;
