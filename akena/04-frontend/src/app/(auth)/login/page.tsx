// Next.js equivalent: app/(auth)/login/page.tsx
// Route: GET /
// Description: Página de autenticación corporativa de Akena
// Todos los valores usan exclusivamente CSS variables del design system.
"use client";

import { useState, type FormEvent } from "react";
import { useNav } from "../../../lib/routes/navigation";
import { AccentureLogo, AkenaWordmark } from "../../(dashboard)/_components/app-header";
import { setAuthUser } from "../../_components/auth-store";

import Box           from "@mui/material/Box";
import Button        from "@mui/material/Button";
import TextField     from "@mui/material/TextField";
import Typography    from "@mui/material/Typography";
import Paper         from "@mui/material/Paper";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton    from "@mui/material/IconButton";
import VisibilityIcon    from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

export default function AppLoginPage() {
  const nav = useNav();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    setAuthUser(email || "usuario@accenture.com");
    nav.home({ replace: true });
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display:   "flex",
        flexDirection: "column",
        bgcolor:   "background.default",
      }}
    >
      {/* Top bar */}
      <Box
        sx={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          px: 4,
          py: 2,
          borderBottom:   "1px solid var(--border)",
        }}
      >
        <AccentureLogo />

        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "var(--text-sm)" }}>
          Castellano
        </Typography>
      </Box>

      {/* Main content */}
      <Box
        sx={{
          flex:           1,
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          justifyContent: "center",
          px: 2,
          pb: "var(--space-20)",
        }}
      >
        {/* Brand header */}
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 5 }}>
          <AkenaWordmark size="lg" />
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1.5, textAlign: "center", maxWidth: 360, fontSize: "var(--text-lg)" }}
          >
            Plataforma corporativa de gestión estratégica y operativa de ofertas del sector público
          </Typography>
        </Box>

        {/* Login card */}
        <Paper
          variant="outlined"
          sx={{
            width:    "100%",
            maxWidth: 420,
            p:        "40px 36px",
            borderRadius: "var(--radius)",
            boxShadow:    "var(--elevation-sm)",
          }}
        >
          <Typography
            variant="h6"
            fontWeight={600}
            sx={{ mb: 0.75, fontSize: "var(--text-xl)" }}
          >
            Iniciar sesión
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3.5, fontSize: "var(--text-sm)" }}>
            Accede con tus credenciales corporativas
          </Typography>

          <Box component="form" onSubmit={handleLogin} sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            {/* Usuario */}
            <TextField
              id="usuario"
              label="Usuario"
              type="text"
              size="small"
              fullWidth
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre.apellido@accenture.com"
              autoComplete="username"
            />

            {/* Contraseña */}
            <TextField
              id="password"
              label="Contraseña"
              type={showPassword ? "text" : "password"}
              size="small"
              fullWidth
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
              autoComplete="current-password"
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setShowPassword((v) => !v)}
                        edge="end"
                        tabIndex={-1}
                        aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      >
                        {showPassword
                          ? <VisibilityOffIcon sx={{ fontSize: 16 }} />
                          : <VisibilityIcon    sx={{ fontSize: 16 }} />
                        }
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            {/* Forgot password */}
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: -1 }}>
              <Button
                variant="text"
                size="small"
                color="primary"
                sx={{ fontSize: "var(--text-xs)", p: 0, minWidth: 0 }}
              >
                ¿Olvidaste tu contraseña?
              </Button>
            </Box>

            {/* Submit */}
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              sx={{ mt: 0.5 }}
            >
              Iniciar sesión
            </Button>
          </Box>
        </Paper>

        {/* Footer note */}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 4, fontSize: "var(--text-2xs)" }}
        >
          Akena © 2025 · Accenture. Todos los derechos reservados.
        </Typography>
      </Box>
    </Box>
  );
}