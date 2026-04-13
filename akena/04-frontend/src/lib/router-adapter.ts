// ─── Router Adapter ──────────────────────────────────────────────────────────
// Punto único de importación para todos los primitivos de routing.
// Toda la app importa desde aquí — nunca directamente de 'react-router'.
//
// ✅ ACTUAL   → Vite + React Router v7
// 🔄 NEXT.JS  → Sustituir el bloque "VITE" por el bloque "NEXT.JS" de abajo
//               e instalar next; desinstalar react-router.
//
// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE NEXT.JS — pegar en lugar de los exports de abajo al migrar
// ═══════════════════════════════════════════════════════════════════════════════
//
// "use client";
// import { useRouter, usePathname, useSearchParams as _sp } from "next/navigation";
// import { useEffect, createElement, type ReactNode, type ComponentProps } from "react";
// import NextLink from "next/link";
//
// export { useParams, useSearchParams, redirect } from "next/navigation";
// export { default as Link } from "next/link";
//
// export function useNavigate() {
//   const router = useRouter();
//   return (to: string | number, opts?: { replace?: boolean }) => {
//     if (typeof to === "number") { to < 0 ? router.back() : router.forward(); return; }
//     opts?.replace ? router.replace(to) : router.push(to);
//   };
// }
//
// export function useLocation() {
//   const pathname = usePathname();
//   const sp = _sp();
//   return { pathname, search: sp.toString() ? `?${sp.toString()}` : "" };
// }
//
// export function NavLink({ to, children, ...rest }: { to: string; children?: ReactNode; [k: string]: unknown }) {
//   return createElement(NextLink, { href: to, ...(rest as ComponentProps<typeof NextLink>) }, children);
// }
//
// export function Navigate({ to, replace }: { to: string; replace?: boolean }) {
//   const router = useRouter();
//   useEffect(() => { replace ? router.replace(to) : router.push(to); }, [to, replace, router]);
//   return null;
// }
//
// export function Outlet(): null { return null; }
//
// ─────────────────────────────────────────────────────────────────────────────
// ✅ VITE (actual) — exporta desde react-router
// ─────────────────────────────────────────────────────────────────────────────

export {
  useNavigate,
  useLocation,
  useParams,
  useSearchParams,
  Link,
  NavLink,
  Navigate,
  Outlet,
  redirect,
} from "react-router";
