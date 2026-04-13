// Portal de Permisos — solo visible para Admin
// Gestión centralizada de roles de usuario en Akena.
"use client";

import { useState, useMemo } from "react";
import { Shield, Search, X } from "lucide-react";

import Box            from "@mui/material/Box";
import Typography     from "@mui/material/Typography";
import Paper          from "@mui/material/Paper";
import Table          from "@mui/material/Table";
import TableContainer from "@mui/material/TableContainer";
import TableHead      from "@mui/material/TableHead";
import TableBody      from "@mui/material/TableBody";
import TableRow       from "@mui/material/TableRow";
import TableCell      from "@mui/material/TableCell";
import TextField      from "@mui/material/TextField";
import MenuItem       from "@mui/material/MenuItem";
import Avatar         from "@mui/material/Avatar";
import Snackbar       from "@mui/material/Snackbar";
import Alert          from "@mui/material/Alert";
import Pagination     from "@mui/material/Pagination";
import InputAdornment from "@mui/material/InputAdornment";
import Chip           from "@mui/material/Chip";

import {
  getRegistry, updateUserRole,
  type UserRole, type UserRegistryEntry,
} from "../../../_components/auth-store";

// ─── Role chip ────────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<UserRole, "default" | "primary" | "secondary"> = {
  Admin:   "primary",
  Editor:  "secondary",
  Lectura: "default",
};

const ROLE_STYLE: Record<UserRole, { bg: string; color: string }> = {
  Admin:   { bg: "var(--primary-subtle)", color: "var(--primary)" },
  Editor:  { bg: "var(--accent-subtle)",  color: "var(--accent)" },
  Lectura: { bg: "var(--neutral-subtle)", color: "var(--muted-foreground)" },
};

function RoleTag({ role }: { role: UserRole }) {
  const { bg, color } = ROLE_STYLE[role] ?? ROLE_STYLE.Lectura;
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", px: 1.25, py: 0.375, borderRadius: "var(--radius-chip)", bgcolor: bg }}>
      <Typography variant="caption" sx={{ fontSize: "var(--text-2xs)", color, fontWeight: 600, letterSpacing: "0.04em" }}>
        {role}
      </Typography>
    </Box>
  );
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

function userInitials(name: string): string {
  return name.split(" ").filter(Boolean).map((w) => w[0]?.toUpperCase() ?? "").slice(0, 2).join("");
}

const ITEMS_PER_PAGE = 15;
const ROLES: UserRole[] = ["Lectura", "Editor", "Admin"];

// ─── PermisosPortal ────────────────────────────────────────────────────────────

export function PermisosPortal() {
  const [registry, setRegistry] = useState<UserRegistryEntry[]>(() => getRegistry());
  const [search, setSearch]     = useState("");
  const [page, setPage]         = useState(1);
  const [toast, setToast]       = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return registry;
    return registry.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        u.userId.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }, [registry, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const pageRows   = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const handleRoleChange = (userId: string, role: UserRole) => {
    updateUserRole(userId, role);
    setRegistry(getRegistry());
    setToast(`Permiso actualizado para ${registry.find((u) => u.userId === userId)?.displayName ?? userId}`);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}>
        <Shield size={16} style={{ color: "var(--primary)" }} />
        <Box>
          <Typography variant="body2" fontWeight={600}>Configuración de permisos</Typography>
          <Typography variant="caption" color="text.secondary">
            Gestiona los roles de acceso de todos los usuarios registrados en Akena
          </Typography>
        </Box>
      </Box>

      {/* Rol legend */}
      <Box sx={{ display: "flex", gap: 1.5, mb: 2.5, flexWrap: "wrap" }}>
        {ROLES.map((r) => (
          <Box key={r} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <RoleTag role={r} />
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "var(--text-2xs)" }}>
              {r === "Lectura"  && "Ver + crear. Sin descargar, editar ni eliminar"}
              {r === "Editor"   && "Descargar siempre. Editar si es owner. Sin eliminar"}
              {r === "Admin"    && "Acceso total. Puede eliminar y gestionar permisos"}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Search */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
        <TextField
          size="small"
          placeholder="Buscar por nombre o ID corporativo..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          sx={{ width: 320 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={14} style={{ color: "var(--muted-foreground)" }} />
                </InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <Box
                    component="button"
                    onClick={() => { setSearch(""); setPage(1); }}
                    sx={{ display: "flex", alignItems: "center", border: "none", background: "none", cursor: "pointer", color: "var(--muted-foreground)", p: 0 }}
                  >
                    <X size={13} />
                  </Box>
                </InputAdornment>
              ) : null,
            },
          }}
        />
        <Typography variant="caption" color="text.secondary">
          {filtered.length} usuario{filtered.length !== 1 ? "s" : ""} registrado{filtered.length !== 1 ? "s" : ""}
        </Typography>
      </Box>

      {/* Table */}
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: "var(--radius)" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>USUARIO</TableCell>
              <TableCell sx={{ width: 160 }}>ROL</TableCell>
              <TableCell sx={{ width: 140 }}>ÚLTIMO ACCESO</TableCell>
              <TableCell sx={{ width: 140 }}>REGISTRADO</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 5, color: "text.secondary" }}>
                  No se encontraron usuarios
                </TableCell>
              </TableRow>
            ) : pageRows.map((u) => (
              <TableRow key={u.userId} hover>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Avatar sx={{ width: 28, height: 28, bgcolor: "primary.main", fontSize: "var(--text-3xs)" }}>
                      {userInitials(u.displayName)}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.3 }}>
                        {u.displayName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: "var(--text-3xs)" }}>
                        {u.userId}{u.email ? ` · ${u.email}` : ""}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <TextField
                    select size="small" value={u.role}
                    onChange={(e) => handleRoleChange(u.userId, e.target.value as UserRole)}
                    sx={{ minWidth: 140 }}
                  >
                    {ROLES.map((r) => (
                      <MenuItem key={r} value={r}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <RoleTag role={r} />
                        </Box>
                      </MenuItem>
                    ))}
                  </TextField>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {fmtDate(u.lastLoginAt)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {fmtDate(u.createdAt)}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Footer */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 1.5 }}>
        <Typography variant="caption" color="text.secondary">
          Mostrando {pageRows.length} de {filtered.length} usuario{filtered.length !== 1 ? "s" : ""}
        </Typography>
        {totalPages > 1 && (
          <Pagination count={totalPages} page={safePage} onChange={(_, p) => setPage(p)} size="small" />
        )}
      </Box>

      {/* Toast feedback */}
      <Snackbar
        open={!!toast}
        autoHideDuration={3500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" onClose={() => setToast(null)} sx={{ width: "100%" }}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  );
}
