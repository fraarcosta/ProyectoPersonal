// Navigation hooks — typed wrappers over the router primitives.
// Importa SIEMPRE desde router-adapter, nunca directamente de 'next/navigation'.
"use client";

import { useCallback } from "react";
import { useNavigate, useLocation, useParams } from "../../lib/router-adapter";
import { routes, WorkspaceSection, isValidWorkspaceSection } from "./config";

// ─── useNav ────────────────────────────────────────────────────────────────
// Typed navigation helper. Use instead of hardcoding path strings.
//
//   const nav = useNav();
//   nav.workspace.to("abc", "indice");
//   nav.back();

export function useNav() {
  const navigate = useNavigate();
  // 🔄 NEXT.JS: reemplazar las 3 líneas de arriba con:
  //   import { useRouter } from 'next/navigation';
  //   const router = useRouter();
  //   const navigate = (path: string | number, opts?: { replace?: boolean }) =>
  //     typeof path === 'number' ? router.back() :
  //     opts?.replace ? router.replace(path) : router.push(path);
  const go = useCallback(
    (path: string, opts?: { replace?: boolean }) =>
      navigate(path, { replace: opts?.replace }),
    [navigate],
  );

  return {
    login:       (opts?: { replace?: boolean }) => go(routes.login(),  opts),
    home:        (opts?: { replace?: boolean }) => go(routes.home(),   opts),

    prospects: {
      list:   (opts?: { replace?: boolean }) => go(routes.prospects.list(),   opts),
      new:    ()                             => go(routes.prospects.new()),
      select: ()                             => go(routes.prospects.select()),
      detail: (id: string)                   => go(routes.prospects.detail(id)),
    },

    workspace: {
      root:    (id: string)                             => go(routes.workspace.root(id)),
      section: (id: string, section: WorkspaceSection)  => go(routes.workspace.section(id, section)),
      to:      (id: string, section?: WorkspaceSection) => go(routes.workspace.to(id, section)),
    },

    portals:     () => go(routes.portals()),

    intelligence: {
      marketing:   () => go(routes.intelligence.marketing()),
      competitive: () => go(routes.intelligence.competitive()),
    },

    qualifications: {
      new: () => go(routes.qualifications.new()),
    },

    back:    () => navigate(-1),
    forward: () => navigate(1),
    replace: (path: string) => go(path, { replace: true }),
  };
}

// ─── useIsActive ───────────────────────────────────────────────────────────
// Returns true if the given path matches the current location.
// Supports prefix matching (default) for highlighting nav items.
// 🔄 NEXT.JS: useLocation() → usePathname() de 'next/navigation'

export function useIsActive(href: string, exact = false): boolean {
  const { pathname } = useLocation();
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

// ─── useWorkspaceRoute ─────────────────────────────────────────────────────
// Extracts and validates workspace path params from the URL.

export function useWorkspaceRoute() {
  const params  = useParams<{ id?: string; section?: string }>();
  const id      = params.id ?? null;
  const raw     = params.section ?? null;
  const section = raw && isValidWorkspaceSection(raw) ? raw : null;

  return { id, section, isSectionValid: raw === null || section !== null };
}