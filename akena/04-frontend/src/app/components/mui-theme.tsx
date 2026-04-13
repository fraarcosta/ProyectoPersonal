"use client";

import type { CSSProperties } from "react";

// MUI Theme — Akena / Accenture design system bridge
//
// ARCHITECTURE:
//   • palette.*           → concrete hex values ONLY (MUI uses them for JS colour
//                           calculations: alpha(), lighten(), darken(), contrast ratio).
//   • components.*        → CSS variables from /src/styles/theme.css wherever
//                           possible.  Changing a token in theme.css propagates
//                           automatically to every MUI component.
//   • typography          → fontFamily is a string; fontSize must be a number (px).
//   • shape.borderRadius  → MUI default (4 px) — each component inherits its own
//                           multiplier from there.  No custom radius overrides.
//
// CSS-variable → MUI-property mapping (all resolved at render-time via the DOM):
//   --text-3xs  (11px)  • --text-2xs (12px)  • --text-xs  (13px)
//   --text-sm   (14px)  • --text-base(16px)  • --text-lg  (15px)
//   --text-xl   (20px)  • --text-2xl (28px)
//   --font-weight-normal     (400)
//   --font-weight-semibold   (600)
//   --font-weight-bold       (700)
//   --border   • --muted  • --muted-foreground  • --primary  • --foreground
//   --elevation-sm

import { createTheme } from "@mui/material/styles";

// ── Palette hex values ────────────────────────────────────────────────────────
// These MUST stay as concrete hex values – MUI needs them for JS color maths.
// They mirror the matching CSS variable in /src/styles/theme.css exactly.
const PRIMARY    = "#A100FF";   // --primary
const SECONDARY  = "#224BFF";   // --accent
const ERROR      = "#D60D0D";   // --destructive
const WARNING    = "#EAB308";   // --warning
const SUCCESS    = "#16A34A";   // --success

const TEXT_PRIMARY   = "#000000";   // --foreground (light mode)
const TEXT_SECONDARY = "#555555";   // --muted-foreground (light mode)
const BORDER_HEX     = "#CFCFCF";   // --border (light mode) — palette only
const MUTED_BG_HEX   = "#F1F1EF";   // --muted  (light mode) — palette only
const BG_HEX         = "#FFFFFF";   // --background / --card

const FONT = '"Inter", -apple-system, BlinkMacSystemFont, sans-serif';

export const muiTheme = createTheme({

  // ── Palette ─────────────────────────────────────────────────────────────────
  palette: {
    primary:    { main: PRIMARY,   contrastText: "#fff" },
    secondary:  { main: SECONDARY, contrastText: "#fff" },
    error:      { main: ERROR },
    warning:    { main: WARNING },
    success:    { main: SUCCESS },
    text:       { primary: TEXT_PRIMARY, secondary: TEXT_SECONDARY },
    divider:    BORDER_HEX,
    background: { default: BG_HEX, paper: BG_HEX },
    action:     { hover: MUTED_BG_HEX, selected: MUTED_BG_HEX },
  },

  // ── Typography ───────────────────────────────────────────────────────────────
  typography: {
    fontFamily: FONT,
    fontSize: 14, // base MUI rem reference — matches --text-sm
    button:  { textTransform: "none", fontFamily: FONT },
    body1:   { fontFamily: FONT },
    body2:   { fontFamily: FONT },
    caption: { fontFamily: FONT },
    h6:      { fontFamily: FONT, fontWeight: 600 },
  },

  // ── Shape — MUI default 4 px base radius ────────────────────────────────────
  // Components derive their own radius from this value using MUI's multipliers.
  // Do NOT set this to 0; use MUI's standard rounding throughout the UI.
  shape: { borderRadius: 4 },

  // ── Component overrides ───────────────────────────────────────────────────────
  // borderRadius is intentionally absent from every override below so MUI's
  // own per-component defaults (derived from shape.borderRadius) are used.
  components: {

    // ─ Button ─────────────────────────────────────────────────────────────────
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          textTransform:   "none",
          fontFamily:      FONT,
          fontWeight:      "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
          fontSize:        "var(--text-sm)",
          letterSpacing:   "0.01em",
        },
        sizeLarge: {
          fontSize: "var(--text-base)",
        },
        sizeSmall: {
          fontSize: "var(--text-xs)",
        },
      },
    },

    MuiIconButton: {
      styleOverrides: {
        root: {
          fontFamily: FONT,
        },
      },
    },

    // ─ Inputs ─────────────────────────────────────────────────────────────────
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          fontFamily: FONT,
          fontSize:   "var(--text-sm)",
        },
        notchedOutline: {
          borderColor: "var(--border)",
        },
      },
    },

    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontFamily: FONT,
          fontSize:   "var(--text-sm)",
          color:      "var(--muted-foreground)",
        },
      },
    },

    MuiInputBase: {
      styleOverrides: {
        root: {
          fontFamily: FONT,
          fontSize:   "var(--text-sm)",
        },
      },
    },

    MuiSelect: {
      styleOverrides: {
        select: {
          fontFamily: FONT,
          fontSize:   "var(--text-sm)",
        },
      },
    },

    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontFamily: FONT,
          fontSize:   "var(--text-sm)",
        },
      },
    },

    MuiFormHelperText: {
      styleOverrides: {
        root: {
          fontFamily: FONT,
          fontSize:   "var(--text-2xs)",
          marginLeft: 0,
        },
      },
    },

    MuiFormLabel: {
      styleOverrides: {
        root: {
          fontFamily: FONT,
          fontSize:   "var(--text-sm)",
        },
      },
    },

    MuiFormControlLabel: {
      styleOverrides: {
        label: {
          fontFamily: FONT,
          fontSize:   "var(--text-sm)",
        },
      },
    },

    // ─ Checkbox / Radio ───────────────────────────────────────────────────────
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: "var(--border)",
        },
      },
    },

    MuiRadio: {
      styleOverrides: {
        root: { color: "var(--border)" },
      },
    },

    // ─ Paper / Card ───────────────────────────────────────────────────────────
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        elevation1: { boxShadow: "var(--elevation-sm)" },
        elevation2: { boxShadow: "var(--elevation-sm)" },
        elevation3: { boxShadow: "var(--elevation-sm)" },
      },
    },

    // ─ Card — border when elevation=0 so cards are never invisible ────────────
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: "1px solid var(--border)",
        },
      },
    },

    // ─ Dialog ─────────────────────────────────────────────────────────────────
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontFamily:  FONT,
          fontWeight:  "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
          fontSize:    "var(--text-xl)",
          paddingBottom: "var(--space-2)",
        },
      },
    },

    MuiDialogContent: {
      styleOverrides: {
        root: { fontFamily: FONT },
      },
    },

    MuiDialogActions: {
      styleOverrides: {
        root: { padding: "var(--space-3) var(--space-6)" },
      },
    },

    MuiDialogContentText: {
      styleOverrides: {
        root: { fontFamily: FONT, fontSize: "var(--text-sm)" },
      },
    },

    // ─ Chip ───────────────────────────────────────────────────────────────────
    MuiChip: {
      styleOverrides: {
        root: {
          fontFamily:   FONT,
          fontWeight:   "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
          fontSize:     "var(--text-2xs)",
        },
        label: {
          paddingLeft:  "var(--space-3)",
          paddingRight: "var(--space-3)",
        },
      },
    },

    // ─ Table ──────────────────────────────────────────────────────────────────
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontFamily: FONT,
          fontSize:   "var(--text-xs)",
          borderColor: "var(--border)",
        },
        head: {
          fontWeight:      "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
          fontSize:        "var(--text-3xs)",
          letterSpacing:   "0.05em",
          textTransform:   "uppercase",
          color:           "var(--muted-foreground)",
          backgroundColor: "var(--muted)",
        },
      },
    },

    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:last-child td": { borderBottom: 0 },
        },
      },
    },

    // ─ Tabs ───────────────────────────────────────────────────────────────────
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontFamily:    FONT,
          fontSize:      "var(--text-sm)",
          fontWeight:    "var(--font-weight-normal)" as CSSProperties["fontWeight"],
          minWidth:      0,
          paddingLeft:   "var(--space-6)",
          paddingRight:  "var(--space-6)",
          "&.Mui-selected": {
            fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
          },
        },
      },
    },

    MuiTabs: {
      styleOverrides: {
        root: {
          borderBottom: "1px solid var(--border)",
        },
        indicator: {
          backgroundColor: "var(--primary)",
        },
      },
    },

    // ─ Alert / Banner ─────────────────────────────────────────────────────────
    MuiAlert: {
      styleOverrides: {
        root: {
          fontFamily: FONT,
          fontSize:   "var(--text-xs)",
        },
        message: {
          fontFamily: FONT,
          fontSize:   "var(--text-xs)",
        },
      },
    },

    MuiAlertTitle: {
      styleOverrides: {
        root: {
          fontFamily: FONT,
          fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
          fontSize:   "var(--text-sm)",
        },
      },
    },

    // ─ Pagination ─────────────────────────────────────────────────────────────
    MuiPaginationItem: {
      styleOverrides: {
        root: {
          fontFamily: FONT,
          fontSize:   "var(--text-xs)",
        },
      },
    },

    // ─ Tooltip ────────────────────────────────────────────────────────────────
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontFamily: FONT,
          fontSize:   "var(--text-2xs)",
        },
      },
    },

    // ─ Divider ────────────────────────────────────────────────────────────────
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: "var(--border)" },
      },
    },

    // ─ Typography ─────────────────────────────────────────────────────────────
    MuiTypography: {
      styleOverrides: {
        root: { fontFamily: FONT },
      },
    },

    // ─ Stepper ────────────────────────────────────────────────────────────────
    MuiStepLabel: {
      styleOverrides: {
        label: {
          fontFamily: FONT,
          fontSize:   "var(--text-sm)",
          "&.Mui-active": {
            fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
          },
          "&.Mui-completed": {
            fontWeight: "var(--font-weight-normal)" as CSSProperties["fontWeight"],
          },
        },
      },
    },

    MuiStepConnector: {
      styleOverrides: {
        line: { borderColor: "var(--border)" },
      },
    },

    // ─ List ───────────────────────────────────────────────────────────────────
    MuiListItemText: {
      styleOverrides: {
        primary: {
          fontFamily: FONT,
          fontSize:   "var(--text-sm)",
        },
        secondary: {
          fontFamily: FONT,
          fontSize:   "var(--text-xs)",
          color:      "var(--muted-foreground)",
        },
      },
    },

    MuiListItem: {
      styleOverrides: {
        root: { fontFamily: FONT },
      },
    },

    // ─ Badge ──────────────────────────────────────────────────────────────────
    MuiBadge: {
      styleOverrides: {
        badge: {
          fontFamily: FONT,
          fontSize:   "var(--text-3xs)",
        },
      },
    },

    // ─ Breadcrumb ─────────────────────────────────────────────────────────────
    MuiBreadcrumbs: {
      styleOverrides: {
        root: {
          fontFamily: FONT,
          fontSize:   "var(--text-sm)",
        },
        separator: { color: "var(--muted-foreground)" },
      },
    },

    // ─ Accordion ──────────────────────────────────────────────────────────────
    MuiAccordion: {
      defaultProps: { disableGutters: true, elevation: 0 },
      styleOverrides: {
        root: {
          border: "1px solid var(--border)",
          "&:before": { display: "none" }, // remove MUI top-border pseudo-element
          "&+.MuiAccordion-root": { borderTop: "none" },
        },
      },
    },

    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          fontFamily: FONT,
          fontSize:   "var(--text-sm)",
          fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
        },
        content: { fontFamily: FONT },
      },
    },

    MuiAccordionDetails: {
      styleOverrides: {
        root: {
          fontFamily:  FONT,
          fontSize:    "var(--text-sm)",
          borderTop:   "1px solid var(--border)",
          paddingTop:  "var(--space-4)",
        },
      },
    },

    // ─ Linear Progress ────────────────────────────────────────────────────────
    MuiLinearProgress: {
      styleOverrides: {
        // no borderRadius override — MUI default used
        root: {},
      },
    },

    // ─ Snackbar ───────────────────────────────────────────────────────────────
    MuiSnackbarContent: {
      styleOverrides: {
        root: {
          fontFamily: FONT,
          fontSize:   "var(--text-sm)",
        },
      },
    },

    // ─ Popover / Menu ─────────────────────────────────────────────────────────
    MuiMenu: {
      styleOverrides: {
        list: { padding: "var(--space-1) 0" },
      },
    },

    // ─ Avatar ─────────────────────────────────────────────────────────────────
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontFamily: FONT,
          fontSize:   "var(--text-sm)",
          fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
        },
      },
    },

    // ─ Switch ─────────────────────────────────────────────────────────────────
    MuiSwitch: {
      styleOverrides: {
        switchBase: { "&.Mui-checked": { color: "var(--primary)" } },
        track: {
          "$checked$checked + &": { backgroundColor: "var(--primary)" },
        },
      },
    },

  },
});