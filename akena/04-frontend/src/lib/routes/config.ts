// Route configuration — path builders y workspace section definitions.
//
// ✅ VITE/React Router: estos paths están registrados en routes.ts
// 🔄 NEXT.JS: actualizar estos paths para que coincidan con los nombres
//    de directorio reales en src/app/(dashboard)/:
//      portals:              () => "/portales"
//      intelligence.market:  () => "/marketing-intelligence"
//      prospects.list/select:() => "/seleccionar-oportunidad"
//      prospects.new:        () => "/nueva-oportunidad"

export const WORKSPACE_SECTIONS = [
  "resumen",
  "indice",
  "win-themes",
  "referencia",
  "asistente",
  "admin",
] as const;

export type WorkspaceSection = (typeof WORKSPACE_SECTIONS)[number];

export function isValidWorkspaceSection(s: unknown): s is WorkspaceSection {
  return WORKSPACE_SECTIONS.includes(s as WorkspaceSection);
}

// ─── Path builders ──────────────────────────────────────────────────────────

export const routes = {
  login:       () => "/" as const,
  home:        () => "/home" as const,

  prospects: {
    list:   () => "/opportunities" as const,
    new:    () => "/opportunities/new" as const,
    select: () => "/opportunities/select" as const,
    detail: (id: string) => `/workspace/${id}` as `/workspace/${string}`,
  },

  workspace: {
    root:    (id: string) => `/workspace/${id}` as `/workspace/${string}`,
    section: (id: string, section: WorkspaceSection) =>
      `/workspace/${id}/${section}` as `/workspace/${string}/${string}`,
    to: (id: string, section?: WorkspaceSection): string =>
      section ? `/workspace/${id}/${section}` : `/workspace/${id}`,
  },

  portals: () => "/portals" as const,

  intelligence: {
    marketing:   () => "/intelligence/market" as const,
    competitive: () => "/intelligence/competitive" as const,
  },

  qualifications: {
    new: () => "/cualificacion" as const,
  },
} as const;