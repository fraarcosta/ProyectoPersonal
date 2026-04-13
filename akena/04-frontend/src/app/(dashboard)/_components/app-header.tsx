"use client";
import { useState, useEffect, useRef, type RefObject } from "react";
import { User, Bell, LogOut, Settings, ChevronDown, ShieldCheck } from "lucide-react";
import { useNav } from "../../../lib/routes/navigation";
import { getAuthUser, clearAuthUser, type UserRole } from "../../_components/auth-store";
import {
  getNotifications, markNotificationRead, type AppNotification,
} from "../../_components/notifications-store";

import Box        from "@mui/material/Box";
import Avatar     from "@mui/material/Avatar";
import Badge      from "@mui/material/Badge";
import Divider    from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Popover    from "@mui/material/Popover";
import MenuItem   from "@mui/material/MenuItem";
import MenuList   from "@mui/material/MenuList";
import Paper      from "@mui/material/Paper";

// ─── Role chip ────────────────────────────────────────────────────────────────

function RoleChip({ role }: { role: UserRole }) {
  const cfg: Record<UserRole, { bg: string; color: string }> = {
    Admin:   { bg: "var(--primary-subtle)", color: "var(--primary)" },
    Editor:  { bg: "var(--accent-subtle)",  color: "var(--accent)" },
    Lectura: { bg: "var(--neutral-subtle)", color: "var(--muted-foreground)" },
  };
  const { bg, color } = cfg[role] ?? cfg.Lectura;
  return (
    <Box sx={{
      display: "inline-flex", alignItems: "center",
      px: 1, py: 0.25, borderRadius: "var(--radius-chip)", bgcolor: bg,
    }}>
      <Typography variant="caption" sx={{
        fontSize: "var(--text-3xs)", color, fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.05em",
      }}>
        {role}
      </Typography>
    </Box>
  );
}

// ─── Relative time ────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Ahora mismo";
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days} día${days !== 1 ? "s" : ""}`;
}

// ─── AppHeader ────────────────────────────────────────────────────────────────

export function AppHeader() {
  const nav = useNav();

  const [user, setUser] = useState(() => getAuthUser());

  // Profile dropdown
  const profileAnchorRef = useRef<HTMLButtonElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  // Bell dropdown
  const bellAnchorRef = useRef<HTMLButtonElement>(null);
  const [bellOpen, setBellOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    getNotifications(user.id),
  );

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  // Poll for notifications every 30 s
  useEffect(() => {
    const tick = () => {
      const fresh = getAuthUser();
      setUser(fresh);
      setNotifications(getNotifications(fresh.id));
    };
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  // Refresh when bell opens
  useEffect(() => {
    if (bellOpen) setNotifications(getNotifications(user.id));
  }, [bellOpen, user.id]);

  const handleLogout = () => {
    setProfileOpen(false);
    clearAuthUser();
    // Replace history so back-button cannot return to authenticated routes
    nav.replace("/");
  };

  const handleNotifClick = (notif: AppNotification) => {
    markNotificationRead(user.id, notif.id);
    setNotifications(getNotifications(user.id));
    setBellOpen(false);
    nav.portals();
  };

  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

  return (
    <Box
      component="header"
      sx={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        bgcolor: "background.paper",
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        px: 3, height: "var(--header-height)",
      }}
    >
      {/* Left — brand */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
        <Box
          component="button"
          onClick={() => nav.home()}
          sx={{ display: "flex", alignItems: "center", gap: 1, background: "none", border: "none", cursor: "pointer", p: 0 }}
        >
          <AccentureLogo />
        </Box>
        <Divider orientation="vertical" flexItem sx={{ height: 24, alignSelf: "center" }} />
        <Box
          component="button"
          onClick={() => nav.home()}
          sx={{ display: "flex", alignItems: "center", gap: 1, background: "none", border: "none", cursor: "pointer", p: 0 }}
        >
          <AkenaWordmark size="sm" />
        </Box>
        <Divider orientation="vertical" flexItem sx={{ height: 24, alignSelf: "center" }} />
        {/* Quick access: Cualificación previa */}
        <Box
          component="button"
          onClick={() => nav.qualifications.new()}
          sx={{
            display: "flex", alignItems: "center", gap: 0.75,
            background: "none", border: "none", cursor: "pointer", p: "4px 8px",
            borderRadius: "var(--radius)",
            color: "var(--muted-foreground)",
            "&:hover": { bgcolor: "var(--primary-subtle)", color: "var(--primary)" },
            transition: "all 0.15s",
          }}
        >
          <ShieldCheck size={14} />
          <Typography variant="caption" fontWeight={600} sx={{ fontSize: "var(--text-xs)", color: "inherit" }}>
            Cualificación previa
          </Typography>
        </Box>
      </Box>

      {/* Right — bell + profile */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>

        {/* Bell */}
        <IconButton
          ref={bellAnchorRef}
          size="small"
          sx={{ color: "text.secondary" }}
          onClick={() => setBellOpen((v) => !v)}
          aria-label="Notificaciones"
        >
          <Badge
            badgeContent={unreadCount || null}
            color="error"
            sx={{ "& .MuiBadge-badge": { fontSize: "var(--text-3xs)", minWidth: 16, height: 16, p: 0 } }}
          >
            <Bell size={16} />
          </Badge>
        </IconButton>

        <Divider orientation="vertical" flexItem sx={{ height: 24, alignSelf: "center" }} />

        {/* Profile button */}
        <Box
          component="button"
          ref={profileAnchorRef as RefObject<HTMLButtonElement>}
          onClick={() => setProfileOpen((v) => !v)}
          sx={{
            display: "flex", alignItems: "center", gap: 1,
            background: "none", border: "none", cursor: "pointer", px: 1, py: 0.5,
            borderRadius: "var(--radius-button)",
            "&:hover": { bgcolor: "var(--muted)" },
            transition: "background 0.15s",
          }}
        >
          <Avatar sx={{
            width: 30, height: 30, bgcolor: "primary.main",
            color: "primary.contrastText", fontSize: "var(--text-2xs)",
          }}>
            {initials || <User size={14} />}
          </Avatar>
          <Box sx={{ textAlign: "left" }}>
            <Typography variant="caption" fontWeight={600} sx={{ display: "block", lineHeight: 1.2 }}>
              {user.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "var(--text-3xs)", lineHeight: 1.2, display: "block" }}>
              {user.role}
            </Typography>
          </Box>
          <ChevronDown size={12} style={{ color: "var(--muted-foreground)" }} />
        </Box>
      </Box>

      {/* ── Profile Popover ──────────────────────────────────────────────── */}
      <Popover
        open={profileOpen}
        anchorEl={profileAnchorRef.current}
        onClose={() => setProfileOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { mt: 0.75, width: 248, boxShadow: "var(--elevation-sm)" } } }}
      >
        {/* User info */}
        <Box sx={{ px: 2, py: 1.75, borderBottom: "1px solid var(--border)" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Avatar sx={{
              width: 38, height: 38, bgcolor: "primary.main",
              color: "primary.contrastText", fontSize: "var(--text-sm)",
            }}>
              {initials || <User size={16} />}
            </Avatar>
            <Box>
              <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.3 }}>
                {user.name}
              </Typography>
              {user.email && (
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "var(--text-3xs)", display: "block" }}>
                  {user.email}
                </Typography>
              )}
              <Box sx={{ mt: 0.5 }}>
                <RoleChip role={user.role} />
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Menu items */}
        <MenuList dense sx={{ py: 0.5 }}>
          <MenuItem
            onClick={() => setProfileOpen(false)}
            sx={{ gap: 1.5, py: 1, color: "text.secondary" }}
          >
            <Settings size={14} />
            <Typography variant="body2">Configuración</Typography>
          </MenuItem>
          <Divider />
          <MenuItem
            onClick={handleLogout}
            sx={{ gap: 1.5, py: 1 }}
          >
            <LogOut size={14} style={{ color: "var(--destructive)" }} />
            <Typography variant="body2" color="error">Cerrar sesión</Typography>
          </MenuItem>
        </MenuList>
      </Popover>

      {/* ── Notifications Popover ────────────────────────────────────────── */}
      <Popover
        open={bellOpen}
        anchorEl={bellAnchorRef.current}
        onClose={() => setBellOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { mt: 0.75, width: 360, boxShadow: "var(--elevation-sm)" } } }}
      >
        {/* Header */}
        <Box sx={{
          px: 2, py: 1.5, borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <Typography variant="body2" fontWeight={600}>Notificaciones</Typography>
          {unreadCount > 0 && (
            <Typography variant="caption" color="text.secondary">
              {unreadCount} sin leer
            </Typography>
          )}
        </Box>

        {/* List */}
        <Box sx={{ maxHeight: 380, overflowY: "auto" }}>
          {notifications.length === 0 ? (
            <Box sx={{ px: 2, py: 4, textAlign: "center" }}>
              <Bell size={20} style={{ color: "var(--muted-foreground)", marginBottom: 8 }} />
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                Sin notificaciones
              </Typography>
            </Box>
          ) : notifications.map((n) => (
            <Box
              key={n.id}
              onClick={() => handleNotifClick(n)}
              sx={{
                px: 2, py: 1.5,
                cursor: "pointer",
                borderBottom: "1px solid var(--border)",
                bgcolor: n.readAt ? "transparent" : "var(--primary-subtle)",
                "&:hover": { bgcolor: "var(--muted)" },
                "&:last-child": { borderBottom: "none" },
                transition: "background 0.15s",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                {/* Unread dot */}
                <Box sx={{ width: 7, height: 7, borderRadius: "50%", mt: 0.75, flexShrink: 0, bgcolor: n.readAt ? "transparent" : "var(--primary)" }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" fontWeight={600} sx={{ display: "block", lineHeight: 1.4 }}>
                    Te han añadido a una oportunidad
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: "var(--text-3xs)", display: "block", mt: 0.25 }}>
                    {n.oportunidadNombre}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: "var(--text-3xs)", display: "block" }}>
                    {relativeTime(n.createdAt)}
                    {n.createdBy ? ` · por ${n.createdBy}` : ""}
                  </Typography>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      </Popover>
    </Box>
  );
}

// ─── Brand components ─────────────────────────────────────────────────────────

export function AccentureLogo() {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      <Box sx={{ width: 20, height: 20, bgcolor: "primary.main", clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }} />
      <Typography variant="caption" fontWeight={700} sx={{ letterSpacing: "0.04em", color: "text.primary" }}>
        ACCENTURE
      </Typography>
    </Box>
  );
}

export function AkenaWordmark({ size = "md", color }: { size?: "sm" | "md" | "lg"; color?: string }) {
  const cfg = {
    sm: { icon: 20, fontSize: "var(--text-lg)",  letterSpacing: "0.12em" },
    md: { icon: 28, fontSize: "var(--text-2xl)", letterSpacing: "0.14em" },
    lg: { icon: 40, fontSize: "var(--text-xl)",  letterSpacing: "0.16em" },
  }[size];

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Box sx={{ width: cfg.icon, height: cfg.icon, bgcolor: color || "primary.main", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Typography sx={{ color: "primary.contrastText", fontWeight: 700, fontSize: cfg.icon * 0.6, lineHeight: 1 }}>A</Typography>
      </Box>
      <Typography sx={{ fontSize: cfg.fontSize, fontWeight: 700, letterSpacing: cfg.letterSpacing, color: color || "text.primary" }}>
        AKENA
      </Typography>
    </Box>
  );
}