// workspace-subheader.tsx — MUI Select for status, MUI IconButton for back
"use client";

import { type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import Box        from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button     from "@mui/material/Button";
import Select     from "@mui/material/Select";
import MenuItem   from "@mui/material/MenuItem";
import Chip       from "@mui/material/Chip";
import Divider    from "@mui/material/Divider";
import Tooltip    from "@mui/material/Tooltip";
import { STATUS_CONFIG } from "../../../../_components/ui";

export interface OppMeta {
  name:   string;
  client: string;
  id:     string;
  estado: string;
}

// Each option in the status dropdown
export interface EstadoOption {
  value:    string;
  disabled?: boolean;
  tooltip?:  string;
}

export interface AppWorkspaceSubHeaderProps {
  opp:             OppMeta;
  estado:          string;
  estadoOptions:   EstadoOption[];
  onEstadoChange:  (estado: string) => void;
  onBack:          () => void;
  actions?:        ReactNode;
  "data-testid"?:  string;
}

const FALLBACK = { bg: "var(--muted)", color: "var(--muted-foreground)" };

export function AppWorkspaceSubHeader({
  opp,
  estado,
  estadoOptions,
  onEstadoChange,
  onBack,
  actions,
  "data-testid": testId,
}: AppWorkspaceSubHeaderProps) {
  const token = STATUS_CONFIG[estado] ?? FALLBACK;

  return (
    <Box
      data-testid={testId ?? "workspace-subheader"}
      sx={{
        bgcolor: "background.paper",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        height: 52,
        px: 0,
      }}
    >
      {/* Back button */}
      <Button
        variant="text"
        color="inherit"
        size="small"
        startIcon={<ArrowLeft size={15} />}
        onClick={onBack}
        data-testid="workspace-back"
        sx={{
          color: "text.secondary",
          height: "100%",
          px: 2,
          borderRadius: 0,
          borderRight: "1px solid var(--border)",
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        Volver
      </Button>

      {/* Opportunity metadata */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2.5, flex: 1, px: 2.5, minWidth: 0 }}>
        {/* Name + client */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600} noWrap>{opp.name}</Typography>
          <Typography variant="caption" color="text.secondary" noWrap>{opp.client}</Typography>
        </Box>

        <Divider orientation="vertical" flexItem sx={{ my: 1 }} />

        {/* ID */}
        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace", flexShrink: 0 }}>
          {opp.id}
        </Typography>

        <Divider orientation="vertical" flexItem sx={{ my: 1 }} />

        {/* Status selector — only show dropdown if there are multiple options */}
        {estadoOptions.length <= 1 ? (
          <Chip
            label={estado}
            size="small"
            sx={{
              bgcolor: token.bg, color: token.color,
              borderRadius: "var(--radius-chip)", height: 20, fontWeight: 600,
              "& .MuiChip-label": { px: "10px", fontSize: "var(--text-2xs)" },
            }}
          />
        ) : (
          <Select
            value={estado}
            onChange={e => onEstadoChange(e.target.value)}
            size="small"
            data-testid="workspace-estado-dropdown"
            renderValue={val => {
              const t = STATUS_CONFIG[val] ?? FALLBACK;
              return (
                <Chip
                  label={val}
                  size="small"
                  sx={{
                    bgcolor: t.bg, color: t.color,
                    borderRadius: "var(--radius-chip)", height: 20, fontWeight: 600,
                    "& .MuiChip-label": { px: "10px", fontSize: "var(--text-2xs)" },
                  }}
                />
              );
            }}
            sx={{
              "& .MuiOutlinedInput-notchedOutline": { border: "none" },
              "& .MuiSelect-select": { py: 0.5, pl: 0, display: "flex", alignItems: "center" },
              minWidth: 0,
            }}
          >
            {estadoOptions.filter(o => STATUS_CONFIG[o.value]).map(opt => {
              const t = STATUS_CONFIG[opt.value];
              const item = (
                <MenuItem key={opt.value} value={opt.value} disabled={opt.disabled}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: t.color, flexShrink: 0, opacity: opt.disabled ? 0.4 : 1 }} />
                    <Typography variant="body2" sx={{ opacity: opt.disabled ? 0.4 : 1 }}>{opt.value}</Typography>
                    {opt.disabled && opt.tooltip && (
                      <Typography variant="caption" color="text.disabled" sx={{ ml: 0.5 }}>
                        ({opt.tooltip})
                      </Typography>
                    )}
                  </Box>
                </MenuItem>
              );
              return item;
            })}
          </Select>
        )}
      </Box>

      {/* Actions slot */}
      {actions && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexShrink: 0, pr: 2 }}>
          {actions}
        </Box>
      )}
    </Box>
  );
}