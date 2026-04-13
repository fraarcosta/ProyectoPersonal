"use client";
// Dashboard Layout — soporta ambos entornos:
//   Vite/React Router → children = undefined → <Outlet /> renderiza la página
//   Next.js App Router → children = page.tsx del segmento (Outlet es no-op)

import type { ReactNode } from "react";
import { Outlet } from "../../lib/router-adapter";
import { AppHeader } from "./_components/app-header";

export default function DashboardLayout({ children }: { children?: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <main className="flex-1" style={{ paddingTop: "var(--header-height)" }}>
        {children ?? <Outlet />}
      </main>
    </div>
  );
}
