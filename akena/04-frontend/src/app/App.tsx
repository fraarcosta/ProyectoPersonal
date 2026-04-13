// ─── App.tsx — Vite entry point ───────────────────────────────────────────────
// Solo usado en el entorno Vite/Figma Make.
// En Next.js App Router este archivo NO se usa — eliminarlo al migrar.
// ─────────────────────────────────────────────────────────────────────────────

import { RouterProvider } from "react-router";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";
import type { ReactNode } from "react";
import { router }   from "./routes";
import { muiTheme } from "./components/mui-theme";

// MUI's ThemeProvider spreads unknown props from Figma Make's inspector (data-fg-*)
// down to an internal ThemeProvider that rejects them with console.error.
// This wrapper absorbs those extra props before they reach MUI.
interface AppThemeProviderProps {
  theme:    Theme;
  children: ReactNode;
  [key: string]: unknown;
}

function AppThemeProvider({ theme, children, ..._ }: AppThemeProviderProps) {
  return <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>;
}

// Suppress the narrow class of MUI prop-type warnings caused by Figma Make injecting
// data-fg-* attributes into the ThemeProvider chain.
(function suppressFigmaPropWarnings() {
  const _err = console.error.bind(console);
  console.error = (...args: Parameters<typeof console.error>) => {
    const msg = args.join(" ");
    if (/data-fg(?:id)?-[a-z0-9]+/i.test(msg) || /The following props are not supported/i.test(msg)) return;
    _err(...args);
  };
})();

export default function App() {
  return (
    <AppThemeProvider theme={muiTheme}>
      <RouterProvider router={router} />
    </AppThemeProvider>
  );
}
