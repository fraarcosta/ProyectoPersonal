// Legacy path redirects — maps old URLs to their current equivalents.
// Add entries here when renaming routes; never remove existing ones.

export const STATIC_REDIRECTS: Record<string, string> = {
  "/nueva-oportunidad":        "/opportunities/new",
  "/seleccionar-oportunidad":  "/opportunities/select",
  "/marketing-intelligence":   "/intelligence/market",

  "/ofertas":                  "/opportunities",
  "/ofertas/nueva":            "/opportunities/new",
  "/ofertas/seleccionar":      "/opportunities/select",
  "/oportunidades":            "/opportunities",
  "/oportunidades/nueva":      "/opportunities/new",
  "/portales":                 "/portals",
  "/inteligencia/mercado":     "/intelligence/market",
  "/inteligencia/competencia": "/intelligence/competitive",
  "/admin/usuarios":           "/admin/users",
  "/admin/configuracion":      "/admin/settings",
  "/admin/integraciones":      "/admin/integrations",
};

// Dynamic redirects (none active — add rules here when needed).
// Each rule: { from: "/old/:id", to: ({ id }) => `/new/${id}` }
type DynamicRule = {
  from: string;
  to:   string | ((params: Record<string, string>) => string);
};

const DYNAMIC_REDIRECTS: DynamicRule[] = [];

export function matchDynamicRedirect(pathname: string): string | null {
  for (const rule of DYNAMIC_REDIRECTS) {
    const params = matchPattern(rule.from, pathname);
    if (params !== null) {
      return typeof rule.to === "function" ? rule.to(params) : rule.to;
    }
  }
  return null;
}

function matchPattern(pattern: string, pathname: string): Record<string, string> | null {
  const ps = pattern.split("/");
  const pp = pathname.split("/");
  if (ps.length !== pp.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < ps.length; i++) {
    if (ps[i].startsWith(":")) {
      params[ps[i].slice(1)] = pp[i];
    } else if (ps[i] !== pp[i]) {
      return null;
    }
  }
  return params;
}
