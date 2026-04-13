// Opportunities store — persists created opportunities in localStorage.
// Each opportunity records its owner and collaborators so each user
// can see the opportunities they're involved in.
// 🔄 NEXT.JS: este módulo usa localStorage → sólo puede ejecutarse en el cliente.
"use client";

const KEY = "akena-opportunities";

export interface StoredOpportunity {
  id:            string;
  nombre:        string;
  codigo:        string;
  cliente:       string;
  anno:          string;
  duracion:      string;
  presupuesto:   string;
  tipologia:     string;
  tieneLottes:   string;
  lotes:         string[];
  pliegos:       string[];
  colaboradores: { id: string; name: string; role: string }[];
  ownerId:       string;
  ownerName:     string;
  createdAt:     string;
  estado:        string;
}

export function getOpportunities(): StoredOpportunity[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as StoredOpportunity[];
    }
  } catch {}
  return [];
}

function saveOpportunities(items: StoredOpportunity[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
}

export function addOpportunity(opp: StoredOpportunity): void {
  const existing = getOpportunities();
  saveOpportunities([opp, ...existing]);
}

export function updateOpportunity(
  id: string,
  patch: Partial<Omit<StoredOpportunity, "id">>,
): void {
  const items = getOpportunities();
  const idx = items.findIndex((o) => o.id === id);
  if (idx === -1) return;
  items[idx] = { ...items[idx], ...patch };
  saveOpportunities(items);
}

// Returns opportunities where userId is either owner or collaborator.
export function getOpportunitiesForUser(userId: string): StoredOpportunity[] {
  const uid = userId.toLowerCase();
  return getOpportunities().filter(
    (opp) =>
      opp.ownerId.toLowerCase() === uid ||
      opp.colaboradores.some((c) => c.id.toLowerCase() === uid),
  );
}