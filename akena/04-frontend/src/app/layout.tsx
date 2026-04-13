// ─── Root Layout — Next.js App Router ────────────────────────────────────────
// Este archivo es el layout raíz de Next.js. Aplica a todas las rutas.
// En Vite/React Router NO se usa — el entry point es App.tsx.
//
// 🔄 MIGRACIÓN A NEXT.JS: descomentar el import de CSS en la línea marcada.

import type { ReactNode } from "react";
import { Providers } from "./providers";

// 🔄 NEXT.JS: descomentar esta línea al migrar (Vite carga el CSS desde main.tsx)
// import "../styles/index.css";

export const metadata = {
  title:       "Akena — Gestión de Ofertas",
  description: "Plataforma corporativa de gestión estratégica y operativa de ofertas del sector público. Accenture.",
  keywords:    ["licitaciones", "sector público", "ofertas", "Accenture", "Akena"],
};

export const viewport = {
  width:        "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
