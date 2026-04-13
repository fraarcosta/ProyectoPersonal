// app/page.tsx — Ruta raíz: "/"
// Renderiza la página de login de Akena.
// El componente vive en (auth)/login/page.tsx; aquí lo re-exportamos
// para que Next.js lo sirva en "/" (la (auth) es un route group, no un segmento de URL).
export { default } from "./(auth)/login/page";
