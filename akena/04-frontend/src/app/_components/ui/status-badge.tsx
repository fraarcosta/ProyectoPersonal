"use client";
import Chip from "@mui/material/Chip";

export const STATUS_CONFIG: Record<string, { bg: string; color: string }> = {
  "En curso":      { bg: "var(--accent-subtle)",      color: "var(--accent)" },
  "En desarrollo": { bg: "var(--accent-subtle)",      color: "var(--accent)" },
  Entregada:       { bg: "var(--success-subtle)",     color: "var(--success)" },
  Activo:          { bg: "var(--success-subtle)",     color: "var(--success)" },
  Validado:        { bg: "var(--success-subtle)",     color: "var(--success)" },
  Adjudicada:      { bg: "var(--primary-subtle)",     color: "var(--primary)" },
  "En revisión":   { bg: "var(--warning-subtle)",     color: "var(--warning-foreground)" },
  Piloto:          { bg: "var(--warning-subtle)",     color: "var(--warning-foreground)" },
  Descartada:      { bg: "var(--destructive-subtle)", color: "var(--destructive)" },
  "No adjudicada": { bg: "var(--destructive-subtle)", color: "var(--destructive)" },
  Desierta:        { bg: "var(--destructive-subtle)", color: "var(--destructive)" },
  Archivado:       { bg: "var(--neutral-subtle)",     color: "var(--muted-foreground)" },
};

const FALLBACK = { bg: "var(--muted)", color: "var(--muted-foreground)" };

export interface AppStatusBadgeProps {
  status: string;
  size?:  "sm" | "md";
}

export function AppStatusBadge({ status, size = "sm" }: AppStatusBadgeProps) {
  const token = STATUS_CONFIG[status] ?? FALLBACK;
  return (
    <Chip
      label={status}
      size="small"
      sx={{
        bgcolor:      token.bg,
        color:        token.color,
        borderRadius: "var(--radius-chip)",
        height:       size === "sm" ? 20 : 24,
        fontWeight:   600,
        "& .MuiChip-label": {
          px:       "10px",
          fontSize: size === "sm" ? "var(--text-2xs)" : "var(--text-xs)",
        },
      }}
    />
  );
}