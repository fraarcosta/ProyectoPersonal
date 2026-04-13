// User session — persists the authenticated user in localStorage.
// Also manages the user registry (all users who have logged in)
// and login history (for traceability).
// 🔄 NEXT.JS: este módulo usa localStorage → sólo puede ejecutarse en el cliente.
"use client";

const AUTH_KEY     = "akena-session-user";
const HISTORY_KEY  = "akena-login-history";
const REGISTRY_KEY = "akena-users-registry";

// ─── Configurable admin IDs ──────────────────────────────────────────────────
// Users whose corporate ID is in this list ALWAYS receive Admin role.
// This list takes priority over the registry so adding an ID here is enough
// to grant permanent Admin access regardless of any previously stored role.
export const PREDEFINED_ADMIN_IDS: string[] = [
  "admin",
  "maria.garcia",
  "administrador",
  "pol.masi.castillejo",   // pol.masi.castillejo@accenture.com — Admin principal
];

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = "Lectura" | "Editor" | "Admin";

export interface AuthUser {
  id:    string;
  name:  string;
  email: string;
  role:  UserRole;
}

export interface UserRegistryEntry {
  userId:      string;
  displayName: string;
  email:       string;
  role:        UserRole;
  lastLoginAt: string;
  createdAt:   string;
}

interface LoginHistoryEntry {
  userId:  string;
  name:    string;
  role:    UserRole;
  loginAt: string;
}

const FALLBACK_USER: AuthUser = { id: "user", name: "Usuario", email: "", role: "Lectura" };

// ─── Registry ─────────────────────────────────────────────────────────────────

export function getRegistry(): UserRegistryEntry[] {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as UserRegistryEntry[];
    }
  } catch {}
  return [];
}

function saveRegistry(entries: UserRegistryEntry[]): void {
  try { localStorage.setItem(REGISTRY_KEY, JSON.stringify(entries)); } catch {}
}

export function updateUserRole(userId: string, role: UserRole): void {
  // Predefined admins cannot be demoted through the UI
  if (PREDEFINED_ADMIN_IDS.includes(userId.toLowerCase())) return;

  const registry = getRegistry();
  const idx = registry.findIndex((u) => u.userId === userId);
  if (idx === -1) return;
  registry[idx] = { ...registry[idx], role };
  saveRegistry(registry);
  // Patch current session if same user
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw) {
      const current = JSON.parse(raw) as AuthUser;
      if (current.id === userId) {
        localStorage.setItem(AUTH_KEY, JSON.stringify({ ...current, role }));
      }
    }
  } catch {}
}

// ─── Login history (internal, not shown in UI) ────────────────────────────────

function appendLoginHistory(user: AuthUser): void {
  try {
    const raw     = localStorage.getItem(HISTORY_KEY);
    const history: LoginHistoryEntry[] = raw ? JSON.parse(raw) : [];
    history.push({ userId: user.id, name: user.name, role: user.role, loginAt: new Date().toISOString() });
    if (history.length > 500) history.splice(0, history.length - 500);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {}
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deriveNameFromEmail(email: string): string {
  if (!email) return FALLBACK_USER.name;
  return (email.split("@")[0] ?? "")
    .split(".")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ") || email;
}

function resolveRole(userId: string): UserRole {
  const uid = userId.toLowerCase();
  // PREDEFINED_ADMIN_IDS always wins — checked before registry so that
  // adding an ID here immediately grants Admin regardless of stored state.
  if (PREDEFINED_ADMIN_IDS.includes(uid)) return "Admin";
  // Registry takes priority for all other users (persisted role assignment)
  const registry = getRegistry();
  const existing = registry.find((u) => u.userId === uid);
  if (existing) return existing.role;
  // Default
  return "Lectura";
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export function setAuthUser(email: string): void {
  const name = deriveNameFromEmail(email);
  const id   = email.split("@")[0]?.toLowerCase() ?? "user";
  const role = resolveRole(id);
  const user: AuthUser = { id, name, email, role };

  // Persist session (always write fresh role)
  try { localStorage.setItem(AUTH_KEY, JSON.stringify(user)); } catch {}

  // Register / update in registry — always sync role so it matches resolveRole
  const registry = getRegistry();
  const now = new Date().toISOString();
  const idx = registry.findIndex((u) => u.userId === id);
  if (idx !== -1) {
    registry[idx] = { ...registry[idx], lastLoginAt: now, displayName: name, email, role };
  } else {
    registry.push({ userId: id, displayName: name, email, role, lastLoginAt: now, createdAt: now });
  }
  saveRegistry(registry);

  // Traceability history
  appendLoginHistory(user);
}

export function getAuthUser(): AuthUser {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AuthUser;
      if (parsed.name && parsed.id) {
        // Re-enforce predefined admin role in case session was stored with a stale role
        const role: UserRole = PREDEFINED_ADMIN_IDS.includes(parsed.id.toLowerCase())
          ? "Admin"
          : (parsed.role ?? "Lectura");
        return { ...parsed, role };
      }
    }
  } catch {}
  return FALLBACK_USER;
}

export function clearAuthUser(): void {
  try { localStorage.removeItem(AUTH_KEY); } catch {}
}