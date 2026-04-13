import { createBrowserRouter, redirect } from "react-router";

import LoginPage                  from "./(auth)/login/page";
import DashboardLayout             from "./(dashboard)/layout";
import HomePage                    from "./(dashboard)/home/page";
import NewOpportunityPage          from "./(dashboard)/nueva-oportunidad/page";
import SelectOpportunityPage       from "./(dashboard)/seleccionar-oportunidad/page";
import WorkspacePage               from "./(dashboard)/workspace/[id]/page";
import PortalsPage                 from "./(dashboard)/portales/page";
import MarketingIntelligencePage   from "./(dashboard)/marketing-intelligence/page";
import DiagnosticoPage             from "./(dashboard)/diagnostico/page";
import PrequalificationPage        from "./(dashboard)/cualificacion/page";
import HistorialPage               from "./(dashboard)/historial/page";
import NotFoundPage                from "./not-found";

import { STATIC_REDIRECTS, matchDynamicRedirect } from "../lib/routes/redirects";

export const router = createBrowserRouter([
  { path: "/", Component: LoginPage },

  // Legacy redirects
  ...Object.entries(STATIC_REDIRECTS).map(([from, to]) => ({
    path:   from,
    loader: async () => redirect(to, { status: 302 }),
  })),

  {
    Component: DashboardLayout,
    children: [
      { path: "/home",                    Component: HomePage               },
      { path: "/opportunities",           Component: SelectOpportunityPage  },
      { path: "/opportunities/new",       Component: NewOpportunityPage     },
      { path: "/opportunities/select",    Component: SelectOpportunityPage  },
      { path: "/workspace/:id",           Component: WorkspacePage          },
      { path: "/workspace/:id/:section",  Component: WorkspacePage          },
      { path: "/portals",                 Component: PortalsPage            },
      { path: "/portales",                Component: PortalsPage            },
      { path: "/intelligence/market",     Component: MarketingIntelligencePage },
      { path: "/marketing-intelligence",  Component: MarketingIntelligencePage },
      { path: "/diagnostico",             Component: DiagnosticoPage        },
      { path: "/cualificacion",           Component: PrequalificationPage   },
      { path: "/historial",              Component: HistorialPage           },
      {
        path:   "*",
        loader: ({ request }: { request: Request }) => {
          const dest = matchDynamicRedirect(new URL(request.url).pathname);
          return dest ? redirect(dest, { status: 302 }) : null;
        },
        Component: NotFoundPage,
      },
    ],
  },

  { path: "*", Component: NotFoundPage },
]);