"use client";
// ─── Client Providers ─────────────────────────────────────────────────────────
// Agrupa todos los providers que necesitan ejecutarse en el cliente.
// En Next.js App Router, este componente se importa desde el root layout
// (app/layout.tsx) que es un Server Component.
//
// 🔄 MIGRACIÓN: en Next.js este archivo se usa directamente.
//   En Vite/React Router, App.tsx hace lo mismo manualmente.
//   Al migrar, simplemente importa <Providers> desde app/layout.tsx.

import type { ReactNode } from "react";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";
import { muiTheme } from "./components/mui-theme";

interface ProvidersProps {
  children: ReactNode;
  [key: string]: unknown; // absorbe props extra del inspector de Figma Make
}

// MUI's ThemeProvider spreads unknown props from Figma Make's inspector (data-fg-*)
// down to an internal ThemeProvider that rejects them with console.error.
// This wrapper absorbs those extra props before they reach MUI.
function MuiThemeWrapper({ theme, children, ..._ }: { theme: Theme; children: ReactNode; [key: string]: unknown }) {
  return <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>;
}

export function Providers({ children, ...rest }: ProvidersProps) {
  return (
    <MuiThemeWrapper theme={muiTheme} {...rest}>
      {children}
    </MuiThemeWrapper>
  );
}
