// Wizard persistence engine — stores multi-step form progress in localStorage.
// Pure module (no React dependencies), TTL-validated, version-migratable.
// 🔄 NEXT.JS: este módulo usa localStorage → importar sólo desde Client Components.
"use client";

const APP_PREFIX     = "akena";
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SCHEMA_VERSION = 1;

// ─── Types ─────────────────────────────────────────────────────────────────

export interface WizardEngineConfig<TData extends object> {
  flow:           string;
  entityId?:      string;
  userId?:        string;
  initialData:    TData;
  initialStep?:   number;
  ttl?:           number;
  dataVersion?:   number;
  migrate?:       (oldData: unknown, fromVersion: number) => TData;
  sensitiveKeys?: (keyof TData)[];
}

export interface WizardStoredState<TData extends object> {
  schemaVersion:  number;
  dataVersion:    number;
  flow:           string;
  entityId?:      string;
  userId?:        string;
  currentStep:    number;
  completedSteps: number[];
  data:           Partial<TData>;
  createdAt:      number;
  updatedAt:      number;
  ttl:            number;
  isCompleted:    boolean;
  isCancelled:    boolean;
}

export type LoadResult<TData extends object> =
  | { found: true;  state: WizardStoredState<TData>; migrated: boolean }
  | { found: false; reason: "expired" | "notFound" | "invalid" | "migrationFailed" };

// ─── Key builder ───────────────────────────────────────────────────────────

export function buildKey(opts: { flow: string; entityId?: string; userId?: string }): string {
  const parts = [APP_PREFIX, "wizard", opts.flow];
  if (opts.entityId) parts.push(opts.entityId);
  if (opts.userId)   parts.push(opts.userId);
  return parts.join(":");
}

// ─── Sanitizer ─────────────────────────────────────────────────────────────

function sanitize<TData extends object>(
  data: Partial<TData>,
  sensitiveKeys: (keyof TData)[] = [],
): Partial<TData> {
  if (sensitiveKeys.length === 0) return data;
  const clean = { ...data };
  for (const k of sensitiveKeys) delete clean[k];
  return clean;
}

// ─── Debounce ──────────────────────────────────────────────────────────────

export function createDebounce<T extends (...args: unknown[]) => void>(
  fn: T, delay: number,
): T & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const debounced = (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { fn(...args); timer = null; }, delay);
  };
  debounced.cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
  return debounced as T & { cancel: () => void };
}

// ─── Engine ────────────────────────────────────────────────────────────────

export class WizardEngine<TData extends object> {
  private readonly key:         string;
  private readonly config:      WizardEngineConfig<TData>;
  private readonly ttl:         number;
  private readonly dataVersion: number;

  readonly debouncedSave: ((state: WizardStoredState<TData>) => void) & { cancel: () => void };

  constructor(config: WizardEngineConfig<TData>) {
    this.config      = config;
    this.key         = buildKey({ flow: config.flow, entityId: config.entityId, userId: config.userId });
    this.ttl         = config.ttl         ?? DEFAULT_TTL_MS;
    this.dataVersion = config.dataVersion ?? 1;
    this.debouncedSave = createDebounce(
      (state: WizardStoredState<TData>) => this.writeRaw(state),
      400,
    ) as ((state: WizardStoredState<TData>) => void) & { cancel: () => void };
  }

  load(): LoadResult<TData> {
    const raw = this.readRaw();
    if (!raw) return { found: false, reason: "notFound" };
    if (!raw.schemaVersion || !raw.flow || !raw.data) { this.clear(); return { found: false, reason: "invalid" }; }
    if (Date.now() > raw.ttl) { this.clear(); return { found: false, reason: "expired" }; }

    let migrated = false;
    let data = raw.data as TData;

    if (raw.dataVersion < this.dataVersion) {
      if (!this.config.migrate) { this.clear(); return { found: false, reason: "migrationFailed" }; }
      try { data = this.config.migrate(raw.data, raw.dataVersion); migrated = true; }
      catch { this.clear(); return { found: false, reason: "migrationFailed" }; }
    }

    return { found: true, state: { ...raw, data, dataVersion: this.dataVersion }, migrated };
  }

  save(state: WizardStoredState<TData>): void {
    this.debouncedSave.cancel();
    this.writeRaw(state);
  }

  createInitial(): WizardStoredState<TData> {
    const now = Date.now();
    return {
      schemaVersion: SCHEMA_VERSION, dataVersion: this.dataVersion,
      flow: this.config.flow, entityId: this.config.entityId, userId: this.config.userId,
      currentStep: this.config.initialStep ?? 0, completedSteps: [],
      data: this.config.initialData, createdAt: now, updatedAt: now,
      ttl: now + this.ttl, isCompleted: false, isCancelled: false,
    };
  }

  updateData(prev: WizardStoredState<TData>, updates: Partial<TData>): WizardStoredState<TData> {
    const next = { ...prev, data: { ...prev.data, ...sanitize(updates, this.config.sensitiveKeys) }, updatedAt: Date.now() };
    this.debouncedSave(next);
    return next;
  }

  advanceStep(prev: WizardStoredState<TData>, nextStep: number): WizardStoredState<TData> {
    const completedSteps = Array.from(new Set([...prev.completedSteps, prev.currentStep]));
    const next = { ...prev, currentStep: nextStep, completedSteps, updatedAt: Date.now() };
    this.save(next);
    return next;
  }

  backStep(prev: WizardStoredState<TData>, prevStep: number): WizardStoredState<TData> {
    const next = { ...prev, currentStep: prevStep, updatedAt: Date.now() };
    this.save(next);
    return next;
  }

  complete(): void { this.debouncedSave.cancel(); this.clear(); }
  cancel():   void { this.debouncedSave.cancel(); this.clear(); }

  clear(): void {
    try { localStorage.removeItem(this.key); } catch {}
  }

  static purgeExpired(): number {
    let count = 0;
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (!k?.startsWith(`${APP_PREFIX}:wizard:`)) continue;
        const raw = safeJsonParse<{ ttl?: number }>(localStorage.getItem(k));
        if (raw?.ttl && Date.now() > raw.ttl) { localStorage.removeItem(k); count++; }
      }
    } catch {}
    return count;
  }

  getKey(): string { return this.key; }

  private readRaw(): WizardStoredState<TData> | null {
    try { return safeJsonParse<WizardStoredState<TData>>(localStorage.getItem(this.key)); }
    catch { return null; }
  }

  private writeRaw(state: WizardStoredState<TData>): void {
    try {
      const safe = { ...state, data: sanitize(state.data, this.config.sensitiveKeys) };
      localStorage.setItem(this.key, JSON.stringify(safe));
    } catch (e) {
      if (isQuotaError(e)) {
        WizardEngine.purgeExpired();
        try { localStorage.setItem(this.key, JSON.stringify(state)); } catch {}
      }
    }
  }
}

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

function isQuotaError(e: unknown): boolean {
  return e instanceof DOMException &&
    (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED");
}