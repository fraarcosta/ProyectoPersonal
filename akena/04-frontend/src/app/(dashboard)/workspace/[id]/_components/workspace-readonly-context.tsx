// Context that propagates isReadOnly (Modo Histórico) throughout the workspace.
// isReadOnly = true when opportunity estado === "Entregada".
// Consumed by every tool content component — no prop drilling needed.
"use client";


import { createContext, useContext } from "react";

interface WorkspaceReadonlyCtx {
  isReadOnly: boolean;
}

export const WorkspaceReadonlyContext = createContext<WorkspaceReadonlyCtx>({
  isReadOnly: false,
});

export function useWorkspaceReadonly(): WorkspaceReadonlyCtx {
  return useContext(WorkspaceReadonlyContext);
}

/** Tooltip shown on every disabled action button in read-only mode. */
export const READONLY_TOOLTIP =
  "La oportunidad está en estado Entregada. Solo se permite consulta histórica.";
