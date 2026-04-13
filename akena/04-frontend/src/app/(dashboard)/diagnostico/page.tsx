// Route: /diagnostico
// Informe de integración Frontend → APIs — 10 pantallas del brief + capa de servicios.
"use client";

import { useState, type ReactNode } from "react";
import Box            from "@mui/material/Box";
import Typography     from "@mui/material/Typography";
import Paper          from "@mui/material/Paper";
import Divider        from "@mui/material/Divider";
import Tabs           from "@mui/material/Tabs";
import Tab            from "@mui/material/Tab";
import Table          from "@mui/material/Table";
import TableHead      from "@mui/material/TableHead";
import TableBody      from "@mui/material/TableBody";
import TableRow       from "@mui/material/TableRow";
import TableCell      from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import {
  XCircle, FlaskConical, Layers, Server, Zap, AlertTriangle,
  ShieldAlert, Clock, FileCode2, CheckCircle2, Lock,
  Info, HelpCircle, ArrowRight, Package, GitBranch, Plug,
} from "lucide-react";

// ─── Design tokens (referenciando CSS variables) ──────────────────────────────

const T = {
  critica:  { fg: "var(--destructive)",        bg: "var(--destructive-subtle)" },
  alta:     { fg: "var(--warning-foreground)",  bg: "var(--warning-subtle)" },
  media:    { fg: "var(--accent)",              bg: "var(--accent-subtle)" },
  baja:     { fg: "var(--muted-foreground)",    bg: "var(--neutral-subtle)" },
  success:  { fg: "var(--success)",             bg: "var(--success-subtle)" },
  primary:  { fg: "var(--primary)",             bg: "var(--primary-subtle)" },
  neutral:  { fg: "var(--foreground)",          bg: "var(--neutral-subtle)" },
} as const;

type Prioridad = "CRÍTICA" | "ALTA" | "MEDIA" | "BAJA";
type EstadoKey = "no-impl" | "mock" | "gap-ui" | "gap-back";
type Talla     = "S" | "M" | "L";

// ─── Dataset — exactamente el mapping del brief ───────────────────────────────

const ITEMS = [
  // ── 01 ───────────────────────────────────────────────────────────────────
  {
    num: "01",
    pantalla: "Subida de documentos",
    contexto: "Nueva oportunidad · NuevaOfertaModal",
    endpoint: "POST document-collector:8000/collect",
    serviceFile: "collectService.ts → collectDocuments()",
    estado: "no-impl" as EstadoKey,
    prioridad: "CRÍTICA" as Prioridad,
    quickWin: false,
    hallazgo:
      "FileUploadWidget y DropZone leen nombre + tamaño del File nativo. Ningún byte sale del browser. Sin fetch, sin FormData, sin progress.",
    archivos: [
      "portales/_components/portal-ventas.tsx → FileUploadWidget",
      "nueva-oportunidad/page.tsx → DropZone",
    ],
    gap: "Prerequisito bloqueante de las pantallas 02, 04, 08 y 09. Sin documentIds reales, ningún generador puede funcionar.",
    accion: [
      "Crear hook useDocumentUpload(oppId, type) usando collectDocuments() de collectService.ts.",
      "Llamar al hook al soltar/seleccionar cada archivo — no al hacer submit.",
      "Persistir el documentId devuelto en el estado del wizard / formulario.",
      "Gestionar errores de red (timeout, 413, 500) con UI de reintento.",
    ],
    depBack: "Confirmar: ¿/collect acepta multipart/form-data? ¿requiere token auth?",
  },
  // ── 02 ───────────────────────────────────────────────────────────────────
  {
    num: "02",
    pantalla: "Generador del índice de la oferta",
    contexto: "Workspace → indice-content.tsx",
    endpoint: "POST outline-creator:8012/create_outline",
    serviceFile: "outlineService.ts → createOutline() · pollOutlineJob()",
    estado: "mock" as EstadoKey,
    prioridad: "CRÍTICA" as Prioridad,
    quickWin: false,
    hallazgo:
      "handleGenerate() llama buildMockIndice() → texto hardcodeado fijo + setTimeout(2000). Ni oppId ni documentIds se envían al servicio.",
    archivos: [
      "workspace/[id]/_components/indice-content.tsx → buildMockIndice(), handleGenerate()",
    ],
    gap: "Respuesta siempre igual independientemente del pliego real. Sin gestión de latencia LLM (>5 s posible).",
    accion: [
      "Eliminar buildMockIndice() y setTimeout.",
      "Llamar a createOutline({ licitation_id: oppId }) importando de services/outlineService.ts.",
      "Si respuesta asíncrona: polling con pollOutlineJob(jobId) cada 3 s hasta status=done.",
      "Mapear campo outline de la respuesta al textarea; validación y persistencia sin cambios.",
    ],
    depBack: "¿La respuesta es síncrona o devuelve jobId? ¿Streaming SSE?",
  },
  // ── 03 ───────────────────────────────────────────────────────────────────
  {
    num: "03",
    pantalla: "Recomendador de referencias",
    contexto: "Workspace → referencia-content.tsx",
    endpoint: "POST offers-searcher:8025/search_offers",
    serviceFile: "searchOffersService.ts → searchOffers()",
    estado: "mock" as EstadoKey,
    prioridad: "ALTA" as Prioridad,
    quickWin: true,
    hallazgo:
      "MOCK_OFFERS[] con 5 ofertas fijas hardcodeadas. Similitud siempre positiva. Los botones de descarga DOCX/PPT generan un Blob de texto plano.",
    archivos: [
      "workspace/[id]/_components/referencia-content.tsx → MOCK_OFFERS[]",
    ],
    gap: "Endpoint de descarga de documentos de referencia NO EXISTE en el backend (gap explícito del brief).",
    accion: [
      "Reemplazar MOCK_OFFERS[] por searchOffers() importando de services/searchOffersService.ts.",
      "Deshabilitar botones DOCX/PPT con Tooltip 'Descarga no disponible' hasta que backend cree el endpoint.",
      "La UI (árbol de índice, requisitos, selección) no requiere cambios.",
    ],
    depBack: "GAP CONFIRMADO: endpoint descarga GET /offers/{id}/document — requiere backend. ¿Cuándo disponible?",
  },
  // ── 04 ───────────────────────────────────────────────────────────────────
  {
    num: "04",
    pantalla: "Generar win themes",
    contexto: "Workspace → win-themes-content.tsx",
    endpoint: "POST win-themes:8028/win-themes-extractor",
    serviceFile: "winThemesService.ts → extractWinThemes()",
    estado: "mock" as EstadoKey,
    prioridad: "ALTA" as Prioridad,
    quickWin: false,
    hallazgo:
      "Generación por sección L1 con setTimeout + texto hardcodeado. El índice validado en localStorage no se incluye en ningún payload.",
    archivos: [
      "workspace/[id]/_components/win-themes-content.tsx",
    ],
    gap: "El extractor nunca recibe contenido real. Depende de índice validado (pantalla 02) y documentIds (pantalla 01).",
    accion: [
      "Llamar a extractWinThemes() de services/winThemesService.ts con { licitation_id, outline, sections[], document_ids[] }.",
      "readStoredIndice() ya está disponible — incluir el contenido del índice validado en el payload.",
      "Gestionar latencia por sección: estado 'generating' por L1 en lugar de spinner global.",
    ],
    depBack: "¿El extractor devuelve todos los temas de una vez o uno por sección? ¿jobId o síncrono?",
  },
  // ── 05 ───────────────────────────────────────────────────────────────────
  {
    num: "05",
    pantalla: "Portal Ventas — subir ofertas",
    contexto: "Portal de Ventas → NuevaOfertaModal",
    endpoint: "create_offer — NO DOCUMENTADO en el brief",
    serviceFile: "licitationService.ts → createOffer()",
    estado: "no-impl" as EstadoKey,
    prioridad: "ALTA" as Prioridad,
    quickWin: false,
    hallazgo:
      "handleSubmit() guarda la oferta en localStorage únicamente. Los archivos adjuntos (pliegos, Word, PPT) no se envían. El endpoint create_offer no aparece en el brief.",
    archivos: [
      "portales/_components/portal-ventas.tsx → NuevaOfertaModal, handleSubmit()",
    ],
    gap: "GAP FUNCIONAL TOTAL. Oferta nunca persiste en backend. Endpoint create_offer no documentado — se asume en licitation-management:8021 [SUPUESTO].",
    accion: [
      "Paso 1: Subir cada archivo a document-collector usando collectDocuments() al adjuntarlo.",
      "Paso 2: En handleSubmit(), llamar a createOffer() de services/licitationService.ts con { ...formData, documentIds[] }.",
      "Remover la escritura en localStorage (o conservarla solo como cache optimista).",
    ],
    depBack: "PREGUNTA ABIERTA: ¿existe create_offer en licitation-management:8021? ¿o en otro servicio? ¿cuál es el contrato?",
  },
  // ── 06 ───────────────────────────────────────────────────────────────────
  {
    num: "06",
    pantalla: "Portal Ventas — control de acceso",
    contexto: "Portal de Ventas → pestaña/sección (NO EXISTE)",
    endpoint: "GET · PUT · DELETE 172.205.199.243:8030/roles/{usuario} · POST /register",
    serviceFile: "rolesService.ts → getUserRole() · updateUserRole() · revokeUserAccess() · registerUser()",
    estado: "gap-ui" as EstadoKey,
    prioridad: "MEDIA" as Prioridad,
    quickWin: false,
    hallazgo:
      "No existe ningún componente ni pestaña de gestión de roles en todo el codebase. UI completa pendiente de crear.",
    archivos: [
      "portales/_components/portal-ventas.tsx → PENDIENTE crear AppControlAcceso",
    ],
    gap: "Doble gap: UI inexistente + IP directa HTTP sin HTTPS. Mixed Content block si la app está en HTTPS.",
    accion: [
      "Crear componente AppControlAcceso: tabla de usuarios + rol actual + acciones (editar, revocar).",
      "Usar getUserRole/updateUserRole/revokeUserAccess/registerUser de services/rolesService.ts.",
      "Resolver IP directa: proxy reverso para 172.205.199.243:8030 o habilitar TLS en el servicio.",
    ],
    depBack: "¿La IP 172.205.199.243 tiene HTTPS disponible? ¿hay proxy en producción? ¿cómo se autentica el endpoint?",
  },
  // ── 07 ───────────────────────────────────────────────────────────────────
  {
    num: "07",
    pantalla: "Portal Ventas — consulta de todas las ofertas",
    contexto: "Portal de Ventas → tabla principal + ConsultarModal",
    endpoint: "GET licitation-management:8021/get_offers",
    serviceFile: "licitationService.ts → getOffers() · updateOffer()",
    estado: "mock" as EstadoKey,
    prioridad: "ALTA" as Prioridad,
    quickWin: true,
    hallazgo:
      "SEED[] array con 4 ofertas demo hardcodeadas. Paginación y filtros son client-side sobre datos locales. Sin endpoint de descarga.",
    archivos: [
      "portales/_components/portal-ventas.tsx → SEED[], PortalVentasView, loadOfferData()",
    ],
    gap: "Datos del Portal completamente desvinculados del Workspace. Endpoint de descarga del ZIP de la oferta NO EXISTE.",
    accion: [
      "Sustituir SEED[] por getOffers() de services/licitationService.ts al montar el componente.",
      "Paginación server-side usando total devuelto por el endpoint.",
      "Usar updateOffer() desde ConsultarModal para guardar cambios de estado/resultado.",
      "Deshabilitar descarga ZIP con Tooltip hasta que backend cree el endpoint.",
    ],
    depBack: "GAP CONFIRMADO: endpoint descarga oferta ZIP. ¿Existe update_offer? ¿coincide con create_offer de pantalla 05?",
  },
  // ── 08 ───────────────────────────────────────────────────────────────────
  {
    num: "08",
    pantalla: "Resumen de la licitación",
    contexto: "Workspace → resumen-content.tsx",
    endpoint: "POST document-collector:8000/collect",
    serviceFile: "collectService.ts → collectDocuments()",
    estado: "no-impl" as EstadoKey,
    prioridad: "ALTA" as Prioridad,
    quickWin: true,
    hallazgo:
      "processFile() lee el archivo pero nunca lo envía. buildMockResumen() devuelve texto fijo + setTimeout(3200). Sin endpoint de generación de resumen documentado.",
    archivos: [
      "workspace/[id]/_components/resumen-content.tsx → processFile(), handleGenerate(), buildMockResumen()",
    ],
    gap: "Archivo no ingestado. Además, falta el endpoint de generación de resumen — el brief solo mapea /collect para esta pantalla.",
    accion: [
      "Al seleccionar el archivo: usar collectDocuments() de services/collectService.ts → obtener documentId.",
      "Habilitar botón 'Generar resumen' solo cuando documentId esté disponible.",
      "El endpoint de generación está pendiente de documentar por backend [SUPUESTO].",
    ],
    depBack: "PREGUNTA ABIERTA: ¿existe un endpoint de generación de resumen? ¿en document-collector o en otro servicio?",
  },
  // ── 09 ───────────────────────────────────────────────────────────────────
  {
    num: "09",
    pantalla: "Asistente de soporte",
    contexto: "Workspace → chat-store.ts · asistente-content.tsx · chat-assistant.tsx",
    endpoint: "POST context-enhancement:8017/retrieve_documents",
    serviceFile: "retrieveDocumentsService.ts → retrieveDocuments() · retrieveDocumentsStream()",
    estado: "mock" as EstadoKey,
    prioridad: "ALTA" as Prioridad,
    quickWin: false,
    hallazgo:
      "generateBotResponse() en chat-store.ts devuelve textos hardcodeados con setTimeout(1200). El historial se guarda en localStorage pero nunca sale al backend.",
    archivos: [
      "(dashboard)/_components/chat-store.ts → generateBotResponse()",
      "workspace/[id]/_components/asistente-content.tsx",
      "(dashboard)/_components/chat-assistant.tsx",
    ],
    gap: "El asistente no consulta ningún documento real. Los documentIds ingestados en collect nunca llegan a context-enhancement.",
    accion: [
      "Reemplazar generateBotResponse() por retrieveDocumentsStream() de services/retrieveDocumentsService.ts.",
      "Implementar SSE/ReadableStream para streaming carácter a carácter (UX tipo chat).",
      "El historial en localStorage puede mantenerse como cache de lectura; enviarlo como history[] en cada request.",
    ],
    depBack: "¿/retrieve_documents soporta SSE streaming o devuelve JSON completo? ¿acepta historial de conversación?",
  },
  // ── 10 ───────────────────────────────────────────────────────────────────
  {
    num: "10",
    pantalla: "Generador PPT NBM",
    contexto: "Workspace → componente a crear",
    endpoint: "POST 172.205.199.243:8026/extract_entities_ppt",
    serviceFile: "pptNbmService.ts → extractEntitiesPpt() · downloadPptNbmBlob()",
    estado: "gap-ui" as EstadoKey,
    prioridad: "MEDIA" as Prioridad,
    quickWin: false,
    hallazgo:
      "No existe ningún componente de PPT NBM en el workspace. El endpoint está disponible en backend pero sin UI que lo invoque. Gap confirmado en el brief.",
    archivos: [
      "workspace/[id]/_components/ → PENDIENTE crear ppt-nbm-content.tsx",
      "workspace/[id]/_components/workspace-sidebar.tsx → añadir item de menú",
    ],
    gap: "Gap de UI completo. IP directa HTTP — mismo problema Mixed Content que pantalla 06.",
    accion: [
      "Crear AppPptNbmContent: botón 'Generar PPT' + zona opcional de plantilla + estado loading/done.",
      "Llamar a extractEntitiesPpt() de services/pptNbmService.ts con { oppId, outline, winThemes }.",
      "Usar downloadPptNbmBlob() para descarga del resultado.",
      "Resolver IP directa: proxy reverso para 172.205.199.243:8026.",
    ],
    depBack: "¿Cuál es el payload exacto de /extract_entities_ppt? ¿devuelve URL o blob binario? ¿requiere plantilla PPT?",
  },
] as const;

// ─── Capa de servicios implementada ──────────────────────────────────────────

const SERVICES_LAYER = [
  {
    file: "apiClient.ts",
    exports: ["createApiClient()", "buildServiceUrl()", "withSignal()"],
    desc: "Instancia axios con interceptores de auth (Bearer token) y normalización de errores (ApiHttpError · ApiValidationError). Timeout 30 s.",
    pantallas: "—",
    status: "done" as const,
    note: "Cliente base. Todas las funciones de servicio lo usan internamente.",
  },
  {
    file: "collectService.ts",
    exports: ["collectDocuments()"],
    desc: "POST /collect — multipart/form-data. Soporte de onUploadProgress (XHR), AbortController via signal. Retorna CollectDocumentsResponse con file_info[].",
    pantallas: "01 · 05 · 08",
    status: "done" as const,
    note: "UI pendiente: FileUploadWidget y DropZone no llaman a esta función todavía.",
  },
  {
    file: "outlineService.ts",
    exports: ["createOutline()", "pollOutlineJob()"],
    desc: "POST /create_outline y GET /jobs/{jobId}. Tipado completo para respuesta síncrona y asíncrona (polling). OutlineJobStatus union type.",
    pantallas: "02",
    status: "done" as const,
    note: "UI pendiente: indice-content.tsx aún usa buildMockIndice() + setTimeout.",
  },
  {
    file: "licitationService.ts",
    exports: ["getOffers()", "createOffer()", "updateOffer()", "getLicitations()", "deleteLicitation()"],
    desc: "GET /get_offers (paginación + filtros), POST /create_offer, PUT /update_offer/{id}. Tipado con PortalOffer y GetOffersParams.",
    pantallas: "05 · 07",
    status: "done" as const,
    note: "UI pendiente: portal-ventas.tsx usa SEED[]. create_offer endpoint no confirmado por backend.",
  },
  {
    file: "retrieveDocumentsService.ts",
    exports: ["retrieveDocuments()", "retrieveDocumentsStream()"],
    desc: "POST /retrieve_documents — JSON completo y streaming SSE (ReadableStream + EventSource). StreamDelta type para delta incremental.",
    pantallas: "09",
    status: "done" as const,
    note: "UI pendiente: chat-store.ts usa generateBotResponse() hardcodeado.",
  },
  {
    file: "searchOffersService.ts",
    exports: ["searchOffers()", "downloadReferenceDocument()"],
    desc: "POST /search_offers con modo pliego/apartado. downloadReferenceDocument() implementado pero retorna error documentado (gap de backend).",
    pantallas: "03",
    status: "done" as const,
    note: "UI pendiente: referencia-content.tsx usa MOCK_OFFERS[]. Quick win disponible.",
  },
  {
    file: "winThemesService.ts",
    exports: ["extractWinThemes()", "extractWinThemesByArgs()"],
    desc: "POST /win-themes-extractor. extractWinThemesByArgs() acepta outline + sections[] + document_ids[] explícitos para consumo directo desde la UI.",
    pantallas: "04",
    status: "done" as const,
    note: "UI pendiente: win-themes-content.tsx usa setTimeout + texto hardcodeado.",
  },
  {
    file: "rolesService.ts",
    exports: ["getUserRole()", "updateUserRole()", "revokeUserAccess()", "registerUser()"],
    desc: "GET/PUT/DELETE /roles/{userId} y POST /register. CRUD completo del panel de control de acceso. IP directa HTTP pendiente de proxy.",
    pantallas: "06",
    status: "done" as const,
    note: "UI pendiente: componente AppControlAcceso no existe. Bloqueado por Mixed Content (IP HTTP directa).",
  },
  {
    file: "pptNbmService.ts",
    exports: ["extractEntitiesPpt()", "downloadPptNbmBlob()"],
    desc: "POST /extract_entities_ppt. downloadPptNbmBlob() descarga el binario .pptx cuando el servicio devuelve URL. IP directa HTTP pendiente de proxy.",
    pantallas: "10",
    status: "done" as const,
    note: "UI pendiente: ppt-nbm-content.tsx no existe. Bloqueado por Mixed Content (IP HTTP directa).",
  },
  {
    file: "index.ts",
    exports: ["barrel — re-exports de todos los servicios"],
    desc: "Punto único de importación. Importar siempre desde '../../services' para mantener rutas estables.",
    pantallas: "—",
    status: "done" as const,
    note: "import { collectDocuments, createOutline, searchOffers, … } from '../../services'",
  },
];

// ─── Bloqueos (solo los del scope del brief) ──────────────────────────────────

const BLOQUEOS = [
  {
    id: "B1",
    titulo: "DNS internos no resolvibles desde browser",
    afecta: "Pantallas 01, 02, 03, 04, 07, 08, 09",
    impacto: "BLOQUEANTE",
    desc: "document-collector, outline-creator, offers-searcher, win-themes, context-enhancement y licitation-management son hostnames de contenedores Docker/k8s. El browser devuelve ERR_NAME_NOT_RESOLVED. Necesitan proxy reverso (Nginx / Vite devServer.proxy / API Gateway) que los exponga con URL pública.",
    owner: "DevOps",
    accion: "Configurar proxy antes de cualquier sprint de integración.",
  },
  {
    id: "B2",
    titulo: "IP directa HTTP — Mixed Content Policy",
    afecta: "Pantallas 06 y 10 (172.205.199.243)",
    impacto: "BLOQUEANTE",
    desc: "Los servicios en 172.205.199.243 usan HTTP sobre IP directa. Si la app se sirve en HTTPS, el browser bloqueará estas peticiones por Mixed Content. El frontend no puede workaround esto — requiere TLS en el servicio o proxy con HTTPS.",
    owner: "Infra / Backend",
    accion: "Habilitar TLS en :8030 y :8026, o meter ambos servicios detrás del mismo proxy HTTPS.",
  },
  {
    id: "B3",
    titulo: "Endpoints de descarga NO existen",
    afecta: "Pantalla 03 (DOCX/PPT referencias) · Pantalla 07 (ZIP oferta)",
    impacto: "BLOQUEANTE para descarga",
    desc: "Gap explícito del brief. El frontend tiene botones de descarga pero no hay endpoint backend que sirva los archivos. Los botones actuales generan un Blob de texto plano — no son archivos reales.",
    owner: "Backend",
    accion: "Definir y crear GET /offers/{id}/document?type=docx|ppt y GET /get_offers/{id}/zip.",
  },
  {
    id: "B4",
    titulo: "create_offer no documentado",
    afecta: "Pantalla 05",
    impacto: "BLOQUEANTE para flujo completo",
    desc: "El brief no incluye el endpoint para crear/persistir una oferta nueva. Se asume que existe en licitation-management:8021 [SUPUESTO]. Sin contrato definido el frontend no puede completar el submit del formulario.",
    owner: "Backend",
    accion: "Documentar endpoint: URL, método, campos requeridos, respuesta esperada.",
  },
  {
    id: "B5",
    titulo: "Endpoint generación de resumen no documentado",
    afecta: "Pantalla 08",
    impacto: "ALTO",
    desc: "El brief solo mapea /collect para la pantalla de Resumen. No hay endpoint para generar el resumen ejecutivo a partir del documentId ingestado.",
    owner: "Backend",
    accion: "Documentar endpoint de generación de resumen o confirmar si se hace en /collect mismo.",
  },
  {
    id: "B6",
    titulo: "Latencia LLM no gestionada",
    afecta: "Pantallas 02, 04, 09",
    impacto: "MEDIO — UX rota en producción",
    desc: "outline-creator, win-themes-extractor y context-enhancement usan LLMs con latencias de 5–30 s. El frontend solo maneja loading/done. Requiere polling, webhooks o SSE según decida el backend.",
    owner: "Backend + Frontend",
    accion: "Decidir patrón: síncrono con timeout largo / jobId + polling / SSE streaming.",
  },
];

// ─── Plan técnico ─────────────────────────────────────────────────────────────

const PLAN = [
  {
    fase: "0", titulo: "Proxy reverso + API client tipado",
    talla: "S" as Talla, prioridad: "CRÍTICA" as Prioridad,
    quickWin: true,
    done: true,
    desc: "API client tipado: ✅ COMPLETADO — apiClient.ts + 9 servicios en /src/services/. Proxy DevOps: ❌ PENDIENTE.",
    tareas: [
      "✅ HECHO — Crear /src/services/apiClient.ts: axios con interceptors, timeout 30 s, error tipado.",
      "✅ HECHO — Crear 9 módulos de servicio + barrel index.ts en /src/services/.",
      "❌ PENDIENTE — Vite devServer.proxy: mapear /api/collect → document-collector:8000, /api/outline → outline-creator:8012, etc.",
      "❌ PENDIENTE — Definir variables de entorno VITE_API_* para cada servicio.",
      "❌ PENDIENTE — Proxy adicional para 172.205.199.243:8030 y :8026 con TLS (o esperar a B2 resuelto).",
    ],
    archivos: [
      "src/services/apiClient.ts ✅",
      "src/services/collectService.ts ✅",
      "src/services/outlineService.ts ✅",
      "src/services/licitationService.ts ✅",
      "src/services/retrieveDocumentsService.ts ✅",
      "src/services/searchOffersService.ts ✅",
      "src/services/winThemesService.ts ✅",
      "src/services/rolesService.ts ✅",
      "src/services/pptNbmService.ts ✅",
      "src/services/index.ts ✅",
      "vite.config.ts → server.proxy ❌ PENDIENTE",
    ],
    desbloqueaItems: ["01", "02", "03", "04", "05", "07", "08", "09"],
  },
  {
    fase: "1", titulo: "Ingesta de documentos (collect) — pantallas 01 y 08",
    talla: "M" as Talla, prioridad: "CRÍTICA" as Prioridad,
    quickWin: false,
    done: false,
    desc: "Prerequisito de las pantallas 02, 04, 08 y 09. collectDocuments() ya existe — falta wiring a los componentes de UI.",
    tareas: [
      "Crear hook useDocumentUpload: wrapper de collectDocuments() con estado de progreso y cancelación.",
      "Integrar el hook en FileUploadWidget (portal-ventas.tsx) — reemplazar lógica de solo-lectura.",
      "Integrar el hook en DropZone de nueva-oportunidad y en resumen-content.tsx → processFile().",
      "Persistir documentId[] en estado del wizard y del formulario NuevaOfertaModal.",
    ],
    archivos: [
      "src/lib/api/useDocumentUpload.ts (NUEVO)",
      "portales/_components/portal-ventas.tsx → FileUploadWidget",
      "nueva-oportunidad/page.tsx → DropZone",
      "workspace/[id]/_components/resumen-content.tsx → processFile()",
    ],
    desbloqueaItems: ["02", "04", "08", "09"],
  },
  {
    fase: "2", titulo: "Generador de índice — pantalla 02",
    talla: "M" as Talla, prioridad: "CRÍTICA" as Prioridad,
    quickWin: false,
    done: false,
    desc: "El índice validado desbloquea win-themes (04), referencias (03) y oferta v0. createOutline() + pollOutlineJob() ya existen.",
    tareas: [
      "Eliminar buildMockIndice() y el setTimeout en handleGenerate().",
      "Llamar a createOutline({ licitation_id: oppId }) de services/outlineService.ts.",
      "Si respuesta asíncrona: polling con pollOutlineJob(jobId) cada 3 s; UI con contador de espera.",
      "Mapear campo outline de la respuesta al textarea. Validación y persistencia sin cambios.",
    ],
    archivos: ["workspace/[id]/_components/indice-content.tsx → handleGenerate(), buildMockIndice()"],
    desbloqueaItems: ["04"],
  },
  {
    fase: "3", titulo: "Consulta de ofertas + Win themes — pantallas 07 y 04",
    talla: "M" as Talla, prioridad: "ALTA" as Prioridad,
    quickWin: true,
    done: false,
    desc: "07 es un quick win (solo reemplazar SEED[] con getOffers()). 04 depende de las fases 1 y 2.",
    tareas: [
      "[07 — QUICK WIN] Reemplazar SEED[] por getOffers() de services/licitationService.ts. Activar paginación server-side.",
      "[07] Llamar a updateOffer() desde ConsultarModal — confirmar endpoint con backend.",
      "[04] Llamar a extractWinThemes() de services/winThemesService.ts con { licitation_id, outline, sections[], document_ids[] }.",
      "[04] Estado 'generating' por sección L1 en lugar de spinner global.",
    ],
    archivos: [
      "portales/_components/portal-ventas.tsx → SEED[], loadOfferData()",
      "workspace/[id]/_components/win-themes-content.tsx",
    ],
    desbloqueaItems: [],
  },
  {
    fase: "4", titulo: "Asistente de soporte (chat real + SSE) — pantalla 09",
    talla: "M" as Talla, prioridad: "ALTA" as Prioridad,
    quickWin: false,
    done: false,
    desc: "Reemplazar generateBotResponse() con retrieveDocumentsStream(). Streaming real carácter a carácter.",
    tareas: [
      "Reemplazar generateBotResponse() en chat-store.ts por retrieveDocumentsStream() de services/retrieveDocumentsService.ts.",
      "Implementar SSE o ReadableStream para streaming carácter a carácter.",
      "Incluir documentIds[] de la oportunidad en el payload para contexto RAG.",
      "Mantener historial en localStorage como cache local; enviarlo como history[] en cada request.",
    ],
    archivos: [
      "(dashboard)/_components/chat-store.ts → generateBotResponse()",
      "(dashboard)/_components/chat-assistant.tsx",
      "workspace/[id]/_components/asistente-content.tsx",
    ],
    desbloqueaItems: [],
  },
  {
    fase: "5", titulo: "Referencias + Portal Ventas crear oferta — pantallas 03 y 05",
    talla: "M" as Talla, prioridad: "ALTA" as Prioridad,
    quickWin: false,
    done: false,
    desc: "03 es quick win (reemplazar MOCK_OFFERS[]). 05 bloqueada hasta que backend documente create_offer.",
    tareas: [
      "[03 — QUICK WIN] Reemplazar MOCK_OFFERS[] por searchOffers() de services/searchOffersService.ts. UI sin cambios.",
      "[03] Deshabilitar botones DOCX/PPT con Tooltip hasta que exista endpoint de descarga.",
      "[05 — BLOQUEADO] Una vez create_offer documentado: llamar a createOffer() de services/licitationService.ts.",
      "[05] Remover escritura en localStorage del handleSubmit.",
    ],
    archivos: [
      "workspace/[id]/_components/referencia-content.tsx → MOCK_OFFERS[]",
      "portales/_components/portal-ventas.tsx → NuevaOfertaModal, handleSubmit()",
    ],
    desbloqueaItems: [],
    bloqueado: "Pantalla 05 bloqueada hasta que backend documente create_offer.",
  },
  {
    fase: "6", titulo: "Control de acceso (UI nueva) + PPT NBM (UI nueva) — pantallas 06 y 10",
    talla: "M" as Talla, prioridad: "MEDIA" as Prioridad,
    quickWin: false,
    done: false,
    desc: "Dos componentes a crear desde cero. Servicios listos. Bloqueados por IP directa HTTP hasta resolver TLS.",
    tareas: [
      "[06] Crear AppControlAcceso: tabla usuarios + usar getUserRole/updateUserRole/revokeUserAccess/registerUser de rolesService.ts.",
      "[10] Crear AppPptNbmContent: botón generar + usar extractEntitiesPpt()/downloadPptNbmBlob() de pptNbmService.ts.",
      "[10] Añadir item de menú en workspace-sidebar.tsx.",
      "Resolver proxy HTTPS para 172.205.199.243:8030 y :8026 antes de activar en producción.",
    ],
    archivos: [
      "portales/_components/portal-ventas.tsx → crear AppControlAcceso",
      "workspace/[id]/_components/ppt-nbm-content.tsx (NUEVO)",
      "workspace/[id]/_components/workspace-sidebar.tsx → añadir item PPT NBM",
    ],
    desbloqueaItems: [],
    bloqueado: "IP directa HTTP — resolver TLS o proxy HTTPS antes de mergear a producción.",
  },
];

// ─── Contratos API ────────────────────────────────────────────────────────────

const CONTRATOS = [
  {
    num: "01 · 08",
    servicio: "document-collector:8000",
    method: "POST",
    path: "/collect",
    supuestos: ["multipart/form-data como content-type", "campo 'type' con valores pliego/oferta_tecnica/anexo"],
    req: `// multipart/form-data
{
  "file":   <binary>,               // PDF / DOCX / PPT
  "oppId":  "OPP-2025-001",
  "type":   "pliego",               // [SUPUESTO] pliego | oferta_tecnica | anexo
  "userId": "ana.garcia"            // [SUPUESTO] para trazabilidad
}`,
    res: `// 200 OK
{
  "documentId": "doc-abc123",       // clave para los demás endpoints
  "filename":   "pliego-aeat.pdf",
  "size":       245760,
  "status":     "indexed",          // [SUPUESTO] indexed | processing
  "oppId":      "OPP-2025-001"
}`,
  },
  {
    num: "02",
    servicio: "outline-creator:8012",
    method: "POST",
    path: "/create_outline",
    supuestos: ["documentIds[] como array de IDs del colector", "respuesta puede ser async con jobId"],
    req: `// application/json
{
  "oppId":       "OPP-2025-001",
  "documentIds": ["doc-abc123"],    // IDs de /collect
  "lang":        "es"               // [SUPUESTO]
}`,
    res: `// Opción A — síncrono
{ "outline": "1. PRESENTACIÓN...", "status": "done" }

// Opción B — asíncrono [SUPUESTO si LLM lento]
{ "jobId": "job-xyz", "status": "pending" }
// → polling GET /jobs/{jobId}
// → { "outline": "...", "status": "done" }`,
  },
  {
    num: "03",
    servicio: "offers-searcher:8025",
    method: "POST",
    path: "/search_offers",
    supuestos: ["campos l1Id y requisitos solo en mode=apartado", "similarity es float 0-1"],
    req: `// application/json
{
  "oppId":       "OPP-2025-001",
  "mode":        "pliego",          // pliego | apartado
  "documentIds": ["doc-abc123"],
  "l1Id":        "3",               // [SUPUESTO] solo mode=apartado
  "requisitos":  "texto libre",     // [SUPUESTO] solo mode=apartado
  "limit":       10                 // [SUPUESTO]
}`,
    res: `// 200 OK
{
  "results": [{
    "id":           "REF-001",
    "name":         "...",
    "client":       "AEAT",
    "deliveryDate": "2024-03-15",
    "similarity":   0.94,           // [SUPUESTO] float 0-1
    "justification": "...",
    "hasDocx": true,                // [SUPUESTO]
    "hasPpt":  true                 // [SUPUESTO]
  }]
}

// Descarga — GAP BACKEND (endpoint NO existe)
// GET /offers/{id}/document?type=docx|ppt`,
  },
  {
    num: "04",
    servicio: "win-themes:8028",
    method: "POST",
    path: "/win-themes-extractor",
    supuestos: ["outline es el texto completo del índice validado", "sections son los IDs de primer nivel L1"],
    req: `// application/json
{
  "oppId":       "OPP-2025-001",
  "outline":     "1. PRESENTACIÓN...",  // índice validado
  "sections":    ["1", "2", "3"],       // IDs L1 [SUPUESTO]
  "documentIds": ["doc-abc123"]
}`,
    res: `// 200 OK [SUPUESTO si síncrono]
{
  "themes": {
    "1": "Win theme para PRESENTACIÓN...",
    "2": "Win theme para ENTENDIMIENTO...",
    "3": "Win theme para SOLUCIÓN..."
  },
  "generatedAt": "2025-02-27T10:30:00Z"  // [SUPUESTO]
}`,
  },
  {
    num: "05",
    servicio: "licitation-management:8021",
    method: "POST",
    path: "/create_offer  ← NO DOCUMENTADO",
    supuestos: ["endpoint existe en licitation-management", "acepta los mismos campos del formulario NuevaOfertaModal"],
    req: `// [SUPUESTO TOTAL — endpoint no aparece en el brief]
// application/json
{
  "codigoExpediente": "AEAT-2025-001",
  "nombre":           "Transformación Digital AEAT",
  "tipologia":        "System Integration (SI)",
  "cliente":          "AEAT",
  "año":              "2025",
  "presupuestoBase":  3200000,
  "estado":           "En curso",
  "documentIds":      ["doc-abc123", "doc-def456"]
}`,
    res: `// [SUPUESTO]
// 201 Created
{
  "id":        "offer-001",
  "createdAt": "2025-02-27T09:00:00Z"
}`,
  },
  {
    num: "06",
    servicio: "172.205.199.243:8030",
    method: "GET · PUT · DELETE · POST",
    path: "/roles/{usuario} · /register",
    supuestos: ["userId es el identificador corporativo (nombre.apellido)", "roles posibles: admin, editor, viewer"],
    req: `// GET /roles/{userId}  — sin body

// PUT /roles/{userId}
{ "role": "admin" }   // [SUPUESTO] admin | editor | viewer

// DELETE /roles/{userId}  — sin body

// POST /register
{
  "userId": "carlos.ruiz",          // [SUPUESTO]
  "email":  "c.ruiz@accenture.com",
  "role":   "viewer"                // [SUPUESTO]
}`,
    res: `// GET 200 OK
{
  "userId": "carlos.ruiz",
  "email":  "c.ruiz@accenture.com",
  "role":   "editor",
  "active": true                    // [SUPUESTO]
}
// PUT  200 → { "updated": true }   // [SUPUESTO]
// DELETE 200 → { "deleted": true } // [SUPUESTO]
// POST 201 → { "userId": "...", "created": true } // [SUPUESTO]`,
  },
  {
    num: "07",
    servicio: "licitation-management:8021",
    method: "GET",
    path: "/get_offers",
    supuestos: ["soporta paginación por query params", "campo estado admite filtro"],
    req: `// Query params
?page=1&limit=10&estado=En+curso&search=AEAT

// Descarga — GAP BACKEND (endpoint NO existe)
// GET /get_offers/{id}/zip`,
    res: `// 200 OK
{
  "total": 45,                       // para paginación client
  "page":  1,
  "items": [{
    "id":               "offer-001",
    "codigoExpediente": "AEAT-2025-001",
    "nombre":           "Transformación Digital AEAT",
    "tipologia":        "System Integration (SI)",
    "cliente":          "AEAT",
    "año":              "2025",
    "presupuestoBase":  3200000,
    "estado":           "En curso",
    "createdAt":        "2025-01-10T09:00:00Z"
  }]
}`,
  },
  {
    num: "09",
    servicio: "context-enhancement:8017",
    method: "POST",
    path: "/retrieve_documents",
    supuestos: ["acepta historial de conversación como array", "puede devolver SSE o JSON completo"],
    req: `// application/json
{
  "oppId":       "OPP-2025-001",
  "query":       "¿Cuáles son los criterios de valoración?",
  "documentIds": ["doc-abc123"],    // [SUPUESTO] para contexto RAG
  "history": [                      // [SUPUESTO]
    { "role": "user",      "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}`,
    res: `// Opción A — JSON completo
{
  "answer":  "Los criterios son...",
  "sources": [{ "documentId": "doc-abc", "page": 12 }]  // [SUPUESTO]
}

// Opción B — SSE streaming [SUPUESTO preferido para UX]
data: {"delta": "Los criterios"}
data: {"delta": " son..."}
data: [DONE]`,
  },
  {
    num: "10",
    servicio: "172.205.199.243:8026",
    method: "POST",
    path: "/extract_entities_ppt",
    supuestos: ["PAYLOAD TOTALMENTE SUPUESTO — sin documentación", "devuelve URL o blob binario .pptx"],
    req: `// [SUPUESTO TOTAL — sin documentación del brief]
// application/json
{
  "oppId":     "OPP-2025-001",
  "outline":   "1. PRESENTACIÓN...",
  "winThemes": { "1": "...", "2": "..." },
  "templateDocumentId": "doc-template"   // [SUPUESTO]
}`,
    res: `// [SUPUESTO]
{
  "pptUrl":     "https://storage/ppt-abc.pptx",
  "documentId": "ppt-abc",
  "generatedAt": "2025-02-27T10:30:00Z"
}
// Alternativa: response body con blob .pptx [SUPUESTO]`,
  },
];

// ─── Preguntas abiertas ───────────────────────────────────────────────────────

const PREGUNTAS = [
  { id: "P1", afecta: "01, 08", pregunta: "¿/collect acepta multipart/form-data? ¿requiere token de autenticación en el header? ¿hay límite de tamaño de archivo?" },
  { id: "P2", afecta: "02", pregunta: "¿/create_outline devuelve respuesta síncrona o asíncrona (jobId)? ¿cuánto puede tardar un índice típico?" },
  { id: "P3", afecta: "03", pregunta: "¿Cuándo estará disponible el endpoint de descarga de documentos de referencia (DOCX/PPT)? ¿qué URL tendrá?" },
  { id: "P4", afecta: "04", pregunta: "¿/win-themes-extractor devuelve todos los temas de una vez o uno por sección? ¿síncrono o jobId?" },
  { id: "P5", afecta: "05", pregunta: "¿Existe create_offer en licitation-management:8021? ¿cuál es el contrato completo (campos, tipos, respuesta)? ¿o está en otro servicio?" },
  { id: "P6", afecta: "06", pregunta: "¿172.205.199.243:8030 tiene HTTPS disponible o hay proxy en producción? ¿cómo se autentica el endpoint de roles?" },
  { id: "P7", afecta: "07", pregunta: "¿Existe update_offer para modificar estado/resultado desde el Portal? ¿cuándo estará el endpoint de descarga ZIP de la oferta?" },
  { id: "P8", afecta: "08", pregunta: "¿Existe un endpoint de generación de resumen ejecutivo? ¿en document-collector o en un servicio separado? El brief solo mapea /collect." },
  { id: "P9", afecta: "09", pregunta: "¿/retrieve_documents soporta SSE streaming? ¿acepta historial de conversación? ¿cuántos mensajes de historia máximo?" },
  { id: "P10", afecta: "10", pregunta: "¿Cuál es el payload exacto de /extract_entities_ppt? ¿requiere plantilla PPT? ¿devuelve URL pública o blob binario?" },
];

// ─── Componentes de diseño ────────────────────────────────────────────────────

type ChipVariant = keyof typeof T;
function Chip({ variant, label }: { variant: ChipVariant; label: string }) {
  const c = T[variant];
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", px: "var(--space-2)", py: "2px", bgcolor: c.bg, borderRadius: "var(--radius-chip)", whiteSpace: "nowrap" }}>
      <Typography sx={{ fontSize: "var(--text-3xs)", fontWeight: "var(--font-weight-semibold)", color: c.fg, lineHeight: 1 }}>{label}</Typography>
    </Box>
  );
}

const ESTADO_META: Record<EstadoKey, { label: string; variant: ChipVariant; icon: ReactNode }> = {
  "no-impl":  { label: "No implementado",  variant: "critica", icon: <XCircle    size={10} /> },
  "mock":     { label: "Mock / setTimeout", variant: "alta",   icon: <FlaskConical size={10} /> },
  "gap-ui":   { label: "Gap de UI",        variant: "media",  icon: <Layers     size={10} /> },
  "gap-back": { label: "Gap de Backend",   variant: "primary", icon: <Server     size={10} /> },
};

function EstadoBadge({ e }: { e: EstadoKey }) {
  const m = ESTADO_META[e];
  const c = T[m.variant];
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: "var(--space-1)", px: "var(--space-2)", py: "2px", bgcolor: c.bg, borderRadius: "var(--radius-chip)", whiteSpace: "nowrap" }}>
      <span style={{ color: c.fg, display: "flex" }}>{m.icon}</span>
      <Typography sx={{ fontSize: "var(--text-3xs)", fontWeight: "var(--font-weight-semibold)", color: c.fg }}>{m.label}</Typography>
    </Box>
  );
}

function ServiceBadge() {
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: "var(--space-1)", px: "var(--space-2)", py: "2px", bgcolor: "var(--success-subtle)", borderRadius: "var(--radius-chip)", whiteSpace: "nowrap", border: "1px solid var(--success)" }}>
      <Plug size={9} style={{ color: "var(--success)" }} />
      <Typography sx={{ fontSize: "var(--text-3xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--success)" }}>Servicio listo</Typography>
    </Box>
  );
}

function QuickWinBadge() {
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: "3px", px: "var(--space-2)", py: "2px", bgcolor: T.success.bg, borderRadius: "var(--radius-chip)", border: `1px solid ${T.success.fg}` }}>
      <Zap size={9} style={{ color: T.success.fg }} />
      <Typography sx={{ fontSize: "var(--text-3xs)", fontWeight: "var(--font-weight-semibold)", color: T.success.fg }}>Quick win</Typography>
    </Box>
  );
}

function DoneBadge() {
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: "3px", px: "var(--space-2)", py: "2px", bgcolor: "var(--success-subtle)", borderRadius: "var(--radius-chip)" }}>
      <CheckCircle2 size={9} style={{ color: "var(--success)" }} />
      <Typography sx={{ fontSize: "var(--text-3xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--success)" }}>Completado</Typography>
    </Box>
  );
}

function TallaBadge({ t }: { t: Talla }) {
  const c = { S: T.success.fg, M: T.alta.fg, L: T.critica.fg }[t];
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, bgcolor: "var(--neutral-subtle)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
      <Typography sx={{ fontSize: "var(--text-3xs)", fontWeight: "var(--font-weight-bold)", color: c }}>{t}</Typography>
    </Box>
  );
}

function Code({ children }: { children: ReactNode }) {
  return (
    <Box component="code" sx={{ px: "5px", py: "1px", bgcolor: "var(--muted)", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: "var(--text-3xs)", fontFamily: "monospace", color: "var(--primary)" }}>
      {children}
    </Box>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <Box component="pre" sx={{
      m: 0, p: "var(--space-3) var(--space-4)",
      bgcolor: "var(--muted)", border: "1px solid var(--border)",
      borderRadius: "var(--radius)", fontSize: "var(--text-3xs)",
      fontFamily: "monospace", color: "var(--foreground)",
      overflowX: "auto", whiteSpace: "pre-wrap", lineHeight: 1.8,
    }}>
      {code}
    </Box>
  );
}

function Banner({ type, children }: { type: "warning" | "info" | "success"; children: ReactNode }) {
  const cfg = {
    warning: { bg: "var(--warning-subtle)", border: "var(--warning)", icon: <AlertTriangle size={13} />, iconColor: "var(--warning-foreground)", textColor: "var(--warning-foreground)" },
    info:    { bg: "var(--accent-subtle)",   border: "var(--accent)",   icon: <Info size={13} />,          iconColor: "var(--accent)",              textColor: "var(--accent)" },
    success: { bg: "var(--success-subtle)",  border: "var(--success)",  icon: <CheckCircle2 size={13} />,  iconColor: "var(--success)",             textColor: "var(--success)" },
  }[type];
  return (
    <Box sx={{
      display: "flex", alignItems: "flex-start", gap: "var(--space-3)",
      px: "var(--banner-px)", py: "var(--banner-py)",
      bgcolor: cfg.bg, border: `1px solid ${cfg.border}`,
      borderRadius: "var(--radius-banner)",
    }}>
      <span style={{ color: cfg.iconColor, flexShrink: 0, marginTop: 1, display: "flex" }}>{cfg.icon}</span>
      <Typography sx={{ fontSize: "var(--text-xs)", color: cfg.textColor, lineHeight: 1.6 }}>
        {children}
      </Typography>
    </Box>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = ["A · Resumen", "B · Matriz", "C · Bloqueos", "D · Plan", "E · Contratos", "F · Pruebas", "G · Estimación", "H · Servicios", "Supuestos"];

export default function AppDiagnosticoPage() {
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ minHeight: "calc(100vh - var(--header-height))", bgcolor: "background.default" }}>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: "var(--foreground)", px: "var(--page-px)", py: "var(--space-10)" }}>
        <Box sx={{ maxWidth: 960 }}>
          <Typography sx={{ fontSize: "var(--text-2xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted-foreground)", mb: "var(--space-3)" }}>
            Diagnóstico de integración · Akena · 6 mar 2026
          </Typography>
          <Typography sx={{ fontSize: "var(--text-2xl)", fontWeight: "var(--font-weight-bold)", color: "var(--background)", lineHeight: 1.2, mb: "var(--space-2)" }}>
            Informe Frontend → APIs Backend
          </Typography>
          <Typography sx={{ fontSize: "var(--text-sm)", color: "var(--muted-foreground)", mb: "var(--space-7)", maxWidth: 600 }}>
            Análisis exacto de las <strong style={{ color: "var(--primary)" }}>10 pantallas del brief</strong> · Capa de servicios <strong style={{ color: "var(--success)" }}>completa</strong> · Qué conectar, quick wins y riesgos.
          </Typography>

          {/* KPI row — row 1 */}
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", mb: "var(--space-3)" }}>
            {[
              { v: "0 / 10", l: "Endpoints conectados en UI", col: "var(--destructive)" },
              { v: "10 / 10", l: "Servicios listos en /services/", col: "var(--success)" },
              { v: "3",      l: "Quick wins disponibles",    col: "var(--success)" },
            ].map(k => (
              <Box key={k.l} sx={{ px: "var(--space-5)", py: "var(--space-3)", border: "1px solid var(--surface-on-dark-border)", borderRadius: "var(--radius)", bgcolor: "var(--surface-on-dark-bg)", minWidth: 130 }}>
                <Typography sx={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-weight-bold)", color: k.col, lineHeight: 1 }}>{k.v}</Typography>
                <Typography sx={{ fontSize: "var(--text-3xs)", color: "var(--muted-foreground)", mt: "3px" }}>{k.l}</Typography>
              </Box>
            ))}
          </Box>

          {/* KPI row — row 2 */}
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)" }}>
            {[
              { v: "4",      l: "Mocks a reemplazar",        col: "var(--warning-foreground)" },
              { v: "3",      l: "Sin implementar en UI",     col: "var(--destructive)" },
              { v: "2",      l: "Gaps de UI (crear nuevo)",  col: "var(--accent)" },
              { v: "2",      l: "Gaps de backend",           col: "var(--muted-foreground)" },
            ].map(k => (
              <Box key={k.l} sx={{ px: "var(--space-5)", py: "var(--space-3)", border: "1px solid var(--surface-on-dark-border)", borderRadius: "var(--radius)", bgcolor: "var(--surface-on-dark-bg)", minWidth: 130 }}>
                <Typography sx={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-weight-bold)", color: k.col, lineHeight: 1 }}>{k.v}</Typography>
                <Typography sx={{ fontSize: "var(--text-3xs)", color: "var(--muted-foreground)", mt: "3px" }}>{k.l}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: "background.paper", borderBottom: "1px solid var(--border)", px: "var(--page-px)", position: "sticky", top: "var(--header-height)", zIndex: 10 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
          sx={{ "& .MuiTab-root": { fontSize: "var(--text-2xs)", fontWeight: "var(--font-weight-semibold)", minWidth: "auto", px: "var(--space-5)", py: "var(--space-3)" } }}>
          {TABS.map((l) => <Tab key={l} label={l} />)}
        </Tabs>
      </Box>

      <Box sx={{ px: "var(--page-px)", py: "var(--page-py)", maxWidth: 1120 }}>

        {/* ══ A — RESUMEN ══════════════════════════════════════════════════ */}
        {tab === 0 && (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: "var(--font-weight-semibold)", mb: "var(--space-2)" }}>A · Resumen Ejecutivo</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: "var(--text-sm)", mb: "var(--space-4)" }}>
              Estado real de las 10 pantallas del brief — capa de servicios implementada, wiring a UI pendiente.
            </Typography>

            <Box sx={{ mb: "var(--space-5)" }}>
              <Banner type="success">
                <strong>Capa de servicios completa.</strong> Los 10 módulos de servicio en <Code>/src/services/</Code> están implementados con axios, interceptores de auth, tipado TypeScript completo y manejo centralizado de errores. El siguiente paso es conectarlos a los componentes de UI sustituyendo mocks y setTimeouts.
              </Banner>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {[
                { n: "01", col: T.critica.fg, t: "0 de 10 endpoints conectados en UI. Toda la app usa setTimeout + localStorage. La capa de servicios está lista — pendiente wiring a componentes." },
                { n: "02", col: T.success.fg, t: "COMPLETADO — Capa de servicios /src/services/: 10 ficheros (apiClient.ts + 9 servicios). Axios con interceptores, tipos wire en /src/types/api.ts, barrel index.ts." },
                { n: "03", col: T.critica.fg, t: "document-collector:8000/collect (pantallas 01 y 08) es el prerequisito bloqueante de los generadores 02, 04, 08 y 09. collectDocuments() está listo — falta llamarlo desde la UI." },
                { n: "04", col: T.critica.fg, t: "outline-creator:8012/create_outline (pantalla 02): createOutline() + pollOutlineJob() implementados. Pendiente: eliminar buildMockIndice() en indice-content.tsx y llamar al servicio." },
                { n: "05", col: T.alta.fg,   t: "QUICK WIN — Pantalla 07: sustituir SEED[] por getOffers() de licitationService.ts. La UI no requiere cambios — cambio de menor riesgo disponible hoy." },
                { n: "06", col: T.alta.fg,   t: "QUICK WIN — Pantalla 03: sustituir MOCK_OFFERS[] por searchOffers() de searchOffersService.ts. UI (árbol, filtros) sin cambios." },
                { n: "07", col: T.alta.fg,   t: "QUICK WIN — Pantalla 08: integrar collectDocuments() al seleccionar archivo en processFile(). Cambio mínimo, sin cambios de UI." },
                { n: "08", col: T.alta.fg,   t: "context-enhancement:8017 (pantalla 09): retrieveDocumentsStream() implementado con SSE. Reemplazar generateBotResponse() en chat-store.ts." },
                { n: "09", col: T.media.fg,  t: "Pantallas 06 y 10 son gaps de UI completos: servicios rolesService.ts y pptNbmService.ts listos pero los componentes AppControlAcceso y ppt-nbm-content.tsx no existen." },
                { n: "10", col: T.critica.fg, t: "Bloqueo de infra activo: DNS internos (B1) y IP directa HTTP (B2) impiden que cualquier servicio sea alcanzable desde el browser. Proxy DevOps es prerequisito de todos los sprints." },
              ].map(b => (
                <Box key={b.n} sx={{ display: "flex", alignItems: "flex-start", gap: "var(--space-4)", px: "var(--space-5)", py: "var(--space-3)", border: "1px solid var(--border)", borderRadius: "var(--radius)", bgcolor: "background.paper" }}>
                  <Typography sx={{ fontSize: "var(--text-3xs)", fontWeight: "var(--font-weight-bold)", color: b.col, minWidth: 20, pt: "2px" }}>{b.n}</Typography>
                  <Typography variant="body2" sx={{ fontSize: "var(--text-sm)", lineHeight: 1.65 }}>{b.t}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* ══ B — MATRIZ ═══════════════════════════════════════════════════ */}
        {tab === 1 && (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: "var(--font-weight-semibold)", mb: "var(--space-2)" }}>B · Matriz de Integración</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: "var(--text-sm)", mb: "var(--space-5)" }}>
              Pantalla → Endpoint → Estado UI actual → Servicio listo → Gap → Acción requerida · Prioridad
            </Typography>

            <Box sx={{ display: "flex", gap: "var(--space-3)", mb: "var(--space-4)", flexWrap: "wrap" }}>
              {(Object.keys(ESTADO_META) as EstadoKey[]).map(k => <EstadoBadge key={k} e={k} />)}
              <QuickWinBadge />
              <ServiceBadge />
            </Box>

            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: "var(--radius)" }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "var(--neutral-subtle)" }}>
                    {["#", "Pantalla", "Endpoint del brief", "Servicio", "Estado UI", "Hallazgo · Gap", "Acción requerida", "Prior."].map(h => (
                      <TableCell key={h} sx={{ fontWeight: "var(--font-weight-semibold)", fontSize: "var(--text-3xs)", textTransform: "uppercase", letterSpacing: "0.05em", py: "var(--space-3)", whiteSpace: "nowrap", color: "var(--muted-foreground)" }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ITEMS.map(row => (
                    <TableRow key={row.num} sx={{ verticalAlign: "top", "&:hover": { bgcolor: "action.hover" } }}>
                      <TableCell sx={{ py: "var(--space-3)" }}>
                        <Typography sx={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-bold)", color: "var(--muted-foreground)" }}>{row.num}</Typography>
                      </TableCell>
                      <TableCell sx={{ py: "var(--space-3)", minWidth: 130 }}>
                        <Typography sx={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", lineHeight: 1.4 }}>{row.pantalla}</Typography>
                        <Typography sx={{ fontSize: "var(--text-3xs)", color: "var(--muted-foreground)", lineHeight: 1.4, mt: "2px" }}>{row.contexto}</Typography>
                        {row.quickWin && <Box sx={{ mt: "var(--space-1)" }}><QuickWinBadge /></Box>}
                      </TableCell>
                      <TableCell sx={{ py: "var(--space-3)", minWidth: 190 }}>
                        <Typography sx={{ fontSize: "var(--text-3xs)", fontFamily: "monospace", color: "var(--primary)", lineHeight: 1.5 }}>{row.endpoint}</Typography>
                      </TableCell>
                      <TableCell sx={{ py: "var(--space-3)", minWidth: 160 }}>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
                          <ServiceBadge />
                          <Typography sx={{ fontSize: "var(--text-3xs)", fontFamily: "monospace", color: "var(--success)", lineHeight: 1.4 }}>{row.serviceFile}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: "var(--space-3)" }}>
                        <EstadoBadge e={row.estado} />
                      </TableCell>
                      <TableCell sx={{ py: "var(--space-3)", minWidth: 180 }}>
                        <Typography sx={{ fontSize: "var(--text-3xs)", color: "var(--muted-foreground)", lineHeight: 1.55 }}>{row.hallazgo}</Typography>
                        <Box sx={{ mt: "var(--space-2)", display: "flex", flexDirection: "column", gap: "2px" }}>
                          {row.archivos.map((a, i) => (
                            <Typography key={i} sx={{ fontSize: "var(--text-3xs)", fontFamily: "monospace", color: "var(--muted-foreground)", lineHeight: 1.4 }}>→ {a}</Typography>
                          ))}
                        </Box>
                        {row.depBack && (
                          <Box sx={{ display: "flex", alignItems: "flex-start", gap: "var(--space-1)", mt: "var(--space-2)", px: "var(--space-2)", py: "var(--space-1)", bgcolor: "var(--warning-subtle)", borderRadius: "var(--radius-banner)" }}>
                            <HelpCircle size={9} style={{ color: "var(--warning-foreground)", flexShrink: 0, marginTop: 1 }} />
                            <Typography sx={{ fontSize: "var(--text-3xs)", color: "var(--warning-foreground)", lineHeight: 1.4 }}>{row.depBack}</Typography>
                          </Box>
                        )}
                      </TableCell>
                      <TableCell sx={{ py: "var(--space-3)", minWidth: 200 }}>
                        <Box component="ul" sx={{ m: 0, pl: "var(--space-4)", display: "flex", flexDirection: "column", gap: "3px" }}>
                          {row.accion.map((a, i) => (
                            <Box key={i} component="li" sx={{ fontSize: "var(--text-3xs)", lineHeight: 1.55 }}>{a}</Box>
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: "var(--space-3)" }}>
                        <Chip variant={row.prioridad === "CRÍTICA" ? "critica" : row.prioridad === "ALTA" ? "alta" : "media"} label={row.prioridad} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* ══ C — BLOQUEOS ═════════════════════════════════════════════════ */}
        {tab === 2 && (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: "var(--font-weight-semibold)", mb: "var(--space-2)" }}>C · Bloqueos de Backend</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: "var(--text-sm)", mb: "var(--space-6)" }}>
              Impedimentos que deben resolver Backend / Infra antes o en paralelo con el desarrollo frontend.
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              {BLOQUEOS.map(b => {
                const isCrit = b.impacto.startsWith("BLOQUEANTE");
                return (
                  <Paper key={b.id} variant="outlined" sx={{ borderRadius: "var(--radius)", overflow: "hidden", borderColor: isCrit ? "var(--destructive)" : "var(--border)" }}>
                    <Box sx={{ px: "var(--space-5)", py: "var(--space-3)", bgcolor: "var(--neutral-subtle)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
                      <Chip variant={isCrit ? "critica" : "alta"} label={b.id} />
                      <Typography variant="body2" sx={{ flex: 1, fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)" }}>{b.titulo}</Typography>
                      <Chip variant={isCrit ? "critica" : "alta"} label={b.impacto} />
                      <Typography sx={{ fontSize: "var(--text-3xs)", color: "var(--muted-foreground)" }}>Owner: <strong>{b.owner}</strong></Typography>
                    </Box>
                    <Box sx={{ px: "var(--space-5)", py: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                      <Box>
                        <Typography sx={{ fontSize: "var(--text-3xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)", mb: "var(--space-1)" }}>Afecta</Typography>
                        <Typography sx={{ fontSize: "var(--text-xs)", fontFamily: "monospace", color: "var(--primary)" }}>{b.afecta}</Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: "var(--text-sm)", lineHeight: 1.65 }}>{b.desc}</Typography>
                      <Box sx={{ display: "flex", alignItems: "flex-start", gap: "var(--space-2)", px: "var(--space-3)", py: "var(--space-2)", bgcolor: isCrit ? "var(--destructive-subtle)" : "var(--warning-subtle)", borderRadius: "var(--radius-banner)" }}>
                        <ArrowRight size={11} style={{ color: isCrit ? "var(--destructive)" : "var(--warning-foreground)", flexShrink: 0, marginTop: 1 }} />
                        <Typography sx={{ fontSize: "var(--text-xs)", color: isCrit ? "var(--destructive)" : "var(--warning-foreground)", fontWeight: "var(--font-weight-semibold)" }}>{b.accion}</Typography>
                      </Box>
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          </Box>
        )}

        {/* ══ D — PLAN ═════════════════════════════════════════════════════ */}
        {tab === 3 && (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: "var(--font-weight-semibold)", mb: "var(--space-2)" }}>D · Plan Técnico Paso a Paso</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: "var(--text-sm)", mb: "var(--space-5)" }}>
              Ordenado por dependencias, no por pantalla. Fase 0 parcialmente completada. S = días · M = 1-2 sem
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              {PLAN.map(f => (
                <Paper key={f.fase} variant="outlined" sx={{ borderRadius: "var(--radius)", overflow: "hidden", borderColor: f.done ? "var(--success)" : "var(--border)" }}>
                  {/* Header */}
                  <Box sx={{ px: "var(--space-5)", py: "var(--space-3)", bgcolor: f.done ? "var(--success-subtle)" : "var(--neutral-subtle)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", gap: "var(--space-4)" }}>
                    <Box sx={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: f.done ? "var(--success)" : "var(--foreground)", borderRadius: "var(--radius)", flexShrink: 0 }}>
                      <Typography sx={{ fontSize: "var(--text-3xs)", fontWeight: "var(--font-weight-bold)", color: "var(--background)" }}>{f.fase}</Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap", mb: "2px" }}>
                        <Typography variant="body2" sx={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)" }}>{f.titulo}</Typography>
                        {f.quickWin && <QuickWinBadge />}
                        {f.done && <DoneBadge />}
                      </Box>
                      <Typography sx={{ fontSize: "var(--text-3xs)", color: "var(--muted-foreground)" }}>{f.desc}</Typography>
                    </Box>
                    <Box sx={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexShrink: 0 }}>
                      <TallaBadge t={f.talla} />
                      <Chip variant={f.prioridad === "CRÍTICA" ? "critica" : f.prioridad === "ALTA" ? "alta" : "media"} label={f.prioridad} />
                    </Box>
                  </Box>

                  {/* Body */}
                  <Box sx={{ px: "var(--space-5)", py: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                    {"bloqueado" in f && f.bloqueado && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: "var(--space-2)", px: "var(--space-3)", py: "var(--space-2)", bgcolor: "var(--warning-subtle)", border: "1px solid var(--warning)", borderRadius: "var(--radius-banner)" }}>
                        <Lock size={10} style={{ color: "var(--warning-foreground)" }} />
                        <Typography sx={{ fontSize: "var(--text-3xs)", color: "var(--warning-foreground)" }}>{f.bloqueado as string}</Typography>
                      </Box>
                    )}

                    {/* Tareas */}
                    <Box>
                      <Typography sx={{ fontSize: "var(--text-3xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)", mb: "var(--space-2)" }}>Tareas</Typography>
                      <Box component="ol" sx={{ m: 0, pl: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
                        {f.tareas.map((t, i) => (
                          <Box key={i} component="li" sx={{ fontSize: "var(--text-sm)", lineHeight: 1.65, color: t.startsWith("✅") ? "var(--success)" : "inherit" }}>{t}</Box>
                        ))}
                      </Box>
                    </Box>

                    {/* Archivos a tocar */}
                    <Box>
                      <Typography sx={{ fontSize: "var(--text-3xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)", mb: "var(--space-2)" }}>Archivos</Typography>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        {f.archivos.map((a, i) => (
                          <Typography key={i} sx={{ fontSize: "var(--text-3xs)", fontFamily: "monospace", color: a.includes("✅") ? "var(--success)" : a.includes("❌") ? "var(--warning-foreground)" : "var(--primary)", lineHeight: 1.5 }}>→ {a}</Typography>
                        ))}
                      </Box>
                    </Box>

                    {/* Desbloquea */}
                    {f.desbloqueaItems.length > 0 && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
                        <Typography sx={{ fontSize: "var(--text-3xs)", color: "var(--muted-foreground)" }}>Desbloquea pantallas:</Typography>
                        {f.desbloqueaItems.map(i => <Chip key={i} variant="success" label={`#${i}`} />)}
                      </Box>
                    )}
                  </Box>
                </Paper>
              ))}
            </Box>
          </Box>
        )}

        {/* ══ E — CONTRATOS ════════════════════════════════════════════════ */}
        {tab === 4 && (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: "var(--font-weight-semibold)", mb: "var(--space-2)" }}>E · Contratos API Esperados</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: "var(--text-sm)", mb: "var(--space-4)" }}>
              Solo los 10 endpoints del brief. Campos marcados <Code>[SUPUESTO]</Code> deben validarse con el equipo de backend antes de implementar.
            </Typography>

            <Banner type="warning">
              <strong>Ningún contrato ha sido confirmado por el equipo de backend.</strong> No existe documentación OpenAPI/Swagger para ningún servicio. Los campos no inferibles directamente del brief están marcados <strong>[SUPUESTO]</strong>.
            </Banner>

            <Box sx={{ display: "flex", flexDirection: "column", gap: "var(--space-5)", mt: "var(--space-6)" }}>
              {CONTRATOS.map((c, i) => (
                <Paper key={i} variant="outlined" sx={{ borderRadius: "var(--radius)", overflow: "hidden" }}>
                  {/* Header */}
                  <Box sx={{ px: "var(--space-5)", py: "var(--space-3)", bgcolor: "var(--neutral-subtle)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
                    <Chip variant="neutral" label={`#${c.num}`} />
                    <Chip variant="primary" label={c.method} />
                    <Typography sx={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", fontFamily: "monospace" }}>
                      {c.servicio}<span style={{ color: "var(--primary)" }}>{c.path}</span>
                    </Typography>
                  </Box>

                  {/* Supuestos */}
                  {c.supuestos.length > 0 && (
                    <Box sx={{ px: "var(--space-5)", py: "var(--space-3)", bgcolor: "var(--warning-subtle)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", gap: "var(--space-3)" }}>
                      <AlertTriangle size={12} style={{ color: "var(--warning-foreground)", flexShrink: 0, marginTop: 1 }} />
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
                        {c.supuestos.map((s, j) => (
                          <Typography key={j} sx={{ fontSize: "var(--text-3xs)", color: "var(--warning-foreground)" }}>
                            [SUPUESTO] {s}
                          </Typography>
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Code */}
                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                    <Box sx={{ p: "var(--space-4)", borderRight: "1px solid var(--border)" }}>
                      <Typography sx={{ fontSize: "var(--text-3xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)", mb: "var(--space-2)" }}>Request</Typography>
                      <CodeBlock code={c.req} />
                    </Box>
                    <Box sx={{ p: "var(--space-4)" }}>
                      <Typography sx={{ fontSize: "var(--text-3xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)", mb: "var(--space-2)" }}>Response</Typography>
                      <CodeBlock code={c.res} />
                    </Box>
                  </Box>
                </Paper>
              ))}
            </Box>
          </Box>
        )}

        {/* ══ F — PRUEBAS ══════════════════════════════════════════════════ */}
        {tab === 5 && (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: "var(--font-weight-semibold)", mb: "var(--space-2)" }}>F · Plan de Pruebas</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: "var(--text-sm)", mb: "var(--space-6)" }}>
              Cobertura específica por pantalla del brief — Unit · Integración · E2E
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
              {[
                {
                  tipo: "Unit", tool: "Vitest",
                  scope: "Funciones puras, hooks, transformaciones de respuesta API → estado React",
                  casos: [
                    "#01 / #08 — useDocumentUpload: progress callback, cancel (AbortController), error 413, retry en 500",
                    "#01 / #08 — validateFile(): tipo MIME no permitido, tamaño >50 MB, nombre vacío",
                    "#02 — parseOutlineResponse(): texto de /create_outline → estructura del textarea",
                    "#04 — parseWinThemesResponse(): objeto themes{} → secciones L1 del componente",
                    "#07 — getOffersQueryBuilder(): page/limit/estado/search → query string correcta",
                    "#09 — parseChatSSE(): stream delta[]  → string acumulado sin artefactos",
                    "apiClient.ts — timeout 30 s, retry 2×, interceptor 401 → logout, 500 → error state",
                  ],
                },
                {
                  tipo: "Integración", tool: "Vitest + MSW (Mock Service Worker)",
                  scope: "Componentes React que hacen fetch — estados loading / error / done contra API mockeada",
                  casos: [
                    "#01 — FileUploadWidget: /collect OK → documentId en estado; /collect 500 → banner error + retry",
                    "#02 — AppIndiceContent: /create_outline OK síncrono; jobId + polling done; polling timeout 60 s",
                    "#03 — AppReferenciaContent: /search_offers resultados; resultados vacíos; error de red",
                    "#07 — PortalVentasView tabla: GET /get_offers p1→p2; filtro por estado; 0 resultados",
                    "#05 — NuevaOfertaModal submit: collect OK + create_offer OK; collect falla → bloquear submit",
                    "#09 — ChatAssistant: SSE stream correcto; SSE cortado a mitad → estado error; reconexión",
                  ],
                },
                {
                  tipo: "E2E", tool: "Playwright",
                  scope: "Flujos completos en browser real contra backend de staging. Bloquear PR si falla.",
                  casos: [
                    "#01+#02 — Nueva oportunidad → adjuntar pliego → collect → generar índice → validar",
                    "#04 — Índice validado → generar win theme sección 1 → validar sección",
                    "#09 — Asistente: pregunta sobre pliego → respuesta streaming → historial visible",
                    "#07 — Portal Ventas: tabla carga desde backend → cambiar estado → guardar",
                    "#05 — Nueva oferta: rellenar form → adjuntar docs → submit → aparece en tabla",
                    "#06 — Control acceso: añadir usuario → cambiar rol → revocar acceso (pendiente UI)",
                    "#10 — PPT NBM: botón generar → loading → enlace descarga PPT (pendiente UI)",
                  ],
                },
              ].map(p => (
                <Paper key={p.tipo} variant="outlined" sx={{ borderRadius: "var(--radius)", overflow: "hidden" }}>
                  <Box sx={{ px: "var(--space-5)", py: "var(--space-3)", bgcolor: "var(--neutral-subtle)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Typography sx={{ fontWeight: "var(--font-weight-semibold)", fontSize: "var(--text-sm)" }}>{p.tipo}</Typography>
                    <Chip variant="primary" label={p.tool} />
                  </Box>
                  <Box sx={{ p: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: "var(--text-sm)" }}>{p.scope}</Typography>
                    <Divider />
                    <Box component="ul" sx={{ m: 0, pl: "var(--space-5)", display: "flex", flexDirection: "column", gap: "5px" }}>
                      {p.casos.map((c, i) => (
                        <Box key={i} component="li" sx={{ fontSize: "var(--text-sm)", lineHeight: 1.65 }}>{c}</Box>
                      ))}
                    </Box>
                  </Box>
                </Paper>
              ))}
            </Box>
          </Box>
        )}

        {/* ══ G — ESTIMACIÓN ═══════════════════════════════════════════════ */}
        {tab === 6 && (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: "var(--font-weight-semibold)", mb: "var(--space-2)" }}>G · Estimación y Orden de Implementación</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: "var(--text-sm)", mb: "var(--space-4)" }}>
              Coste solo de frontend. No incluye backend. S ≈ 1-3 días · M ≈ 1-2 semanas
            </Typography>

            <Banner type="info">
              Estimación asume que el bloqueo B1 (proxy DNS) está resuelto desde el día 1. Puede variar ±50% dependiendo de la calidad de la documentación de APIs y la velocidad de respuesta del equipo de backend.
            </Banner>

            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: "var(--radius)", mt: "var(--space-6)", mb: "var(--space-8)" }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "var(--neutral-subtle)" }}>
                    {["Fase", "Qué conecta", "Pantallas", "FE", "Prior.", "Estimación FE", "Prerequisito", "Riesgo"].map(h => (
                      <TableCell key={h} sx={{ fontWeight: "var(--font-weight-semibold)", fontSize: "var(--text-3xs)", textTransform: "uppercase", letterSpacing: "0.05em", py: "var(--space-3)", whiteSpace: "nowrap", color: "var(--muted-foreground)" }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[
                    { fase: "0",  titulo: "Proxy + API client",          pant: "—",       t: "S" as Talla, p: "CRÍTICA" as Prioridad, est: "✅ HECHO",  pre: "— (completado)",                          riesgo: "Proxy pendiente",              rCol: T.alta.fg,     qw: true,  done: true  },
                    { fase: "1",  titulo: "collect (ingesta)",            pant: "01, 08",  t: "M" as Talla, p: "CRÍTICA" as Prioridad, est: "1 sem",    pre: "Fase 0 + proxy",                          riesgo: "Medio",                        rCol: T.alta.fg,     qw: false, done: false },
                    { fase: "2",  titulo: "create_outline",               pant: "02",      t: "M" as Talla, p: "CRÍTICA" as Prioridad, est: "1–2 sem",  pre: "Fase 1 + documentIds",                    riesgo: "Alto — async LLM",             rCol: T.critica.fg,  qw: false, done: false },
                    { fase: "3a", titulo: "get_offers",                   pant: "07",      t: "S" as Talla, p: "ALTA"    as Prioridad, est: "1–2 días",  pre: "Fase 0 + proxy",                          riesgo: "Bajo",                         rCol: T.success.fg,  qw: true,  done: false },
                    { fase: "3b", titulo: "search_offers",                pant: "03",      t: "S" as Talla, p: "ALTA"    as Prioridad, est: "1–2 días",  pre: "Fase 0 + proxy",                          riesgo: "Bajo",                         rCol: T.success.fg,  qw: true,  done: false },
                    { fase: "4",  titulo: "win-themes-extractor",         pant: "04",      t: "M" as Talla, p: "ALTA"    as Prioridad, est: "1–2 sem",  pre: "Fases 1 + 2",                             riesgo: "Alto — async LLM por sección", rCol: T.critica.fg,  qw: false, done: false },
                    { fase: "5",  titulo: "retrieve_documents (SSE)",     pant: "09",      t: "M" as Talla, p: "ALTA"    as Prioridad, est: "1–2 sem",  pre: "Fase 1",                                  riesgo: "Alto — SSE streaming",         rCol: T.critica.fg,  qw: false, done: false },
                    { fase: "6",  titulo: "create_offer",                 pant: "05",      t: "M" as Talla, p: "ALTA"    as Prioridad, est: "1 sem †",  pre: "Fase 1 + backend documenta endpoint",     riesgo: "BLOQUEADO — no documentado",   rCol: T.critica.fg,  qw: false, done: false },
                    { fase: "7",  titulo: "Roles UI + PPT NBM UI",        pant: "06, 10",  t: "M" as Talla, p: "MEDIA"   as Prioridad, est: "2 sem †",  pre: "TLS en 172.205.199.243",                  riesgo: "BLOQUEADO — IP directa HTTP",  rCol: T.critica.fg,  qw: false, done: false },
                  ].map(r => (
                    <TableRow key={r.fase} sx={{ verticalAlign: "middle", "&:hover": { bgcolor: "action.hover" }, bgcolor: r.done ? "var(--success-subtle)" : "inherit" }}>
                      <TableCell sx={{ py: "var(--space-3)", fontWeight: "var(--font-weight-bold)", fontSize: "var(--text-xs)", color: "var(--muted-foreground)" }}>{r.fase}</TableCell>
                      <TableCell sx={{ py: "var(--space-3)" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                          <Typography sx={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)" }}>{r.titulo}</Typography>
                          {r.qw && !r.done && <QuickWinBadge />}
                          {r.done && <DoneBadge />}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: "var(--space-3)", fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "monospace" }}>{r.pant}</TableCell>
                      <TableCell sx={{ py: "var(--space-3)" }}><TallaBadge t={r.t} /></TableCell>
                      <TableCell sx={{ py: "var(--space-3)" }}><Chip variant={r.p === "CRÍTICA" ? "critica" : r.p === "ALTA" ? "alta" : "media"} label={r.p} /></TableCell>
                      <TableCell sx={{ py: "var(--space-3)", whiteSpace: "nowrap" }}>
                        <Typography sx={{
                          fontSize: "var(--text-xs)",
                          fontWeight: "var(--font-weight-semibold)",
                          fontFamily: "monospace",
                          color: r.done ? "var(--success)" : r.est.endsWith("†") ? "var(--warning-foreground)" : "var(--foreground)",
                        }}>
                          {r.est}
                        </Typography>
                        {r.est.endsWith("†") && (
                          <Typography sx={{ fontSize: "var(--text-3xs)", color: "var(--muted-foreground)", lineHeight: 1.3, mt: "2px" }}>
                            pendiente backend
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ py: "var(--space-3)", fontSize: "var(--text-xs)", color: "var(--muted-foreground)" }}>{r.pre}</TableCell>
                      <TableCell sx={{ py: "var(--space-3)", fontSize: "var(--text-xs)", fontWeight: r.riesgo.startsWith("BLOQ") ? "var(--font-weight-semibold)" : "var(--font-weight-normal)", color: r.rCol }}>{r.riesgo}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Paper variant="outlined" sx={{ p: "var(--space-6)", borderRadius: "var(--radius)", bgcolor: "var(--neutral-subtle)" }}>
              <Typography sx={{ fontWeight: "var(--font-weight-semibold)", fontSize: "var(--text-sm)", mb: "var(--space-4)" }}>Estimación total — solo coste frontend</Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-4)", mb: "var(--space-5)" }}>
                {[
                  { v: "5–7 sem",  l: "Optimista",  s: "Capa de servicios lista. APIs documentadas, proxy desde semana 1, sin cambios de contrato." },
                  { v: "8–11 sem", l: "Realista",   s: "Iteraciones con backend, ajustes de contrato, bloqueos resueltos con retraso." },
                  { v: "12–16 sem",l: "Pesimista",  s: "create_offer sin definir, LLM async sin patrón decidido, TLS sin resolver." },
                ].map(e => (
                  <Box key={e.l} sx={{ p: "var(--space-4)", bgcolor: "background.paper", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
                    <Typography sx={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-weight-bold)", color: "var(--primary)", lineHeight: 1.2, mb: "3px" }}>{e.v}</Typography>
                    <Typography sx={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", mb: "3px" }}>{e.l}</Typography>
                    <Typography sx={{ fontSize: "var(--text-3xs)", color: "var(--muted-foreground)", lineHeight: 1.5 }}>{e.s}</Typography>
                  </Box>
                ))}
              </Box>
              <Divider sx={{ mb: "var(--space-4)" }} />
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: "var(--text-sm)", lineHeight: 1.7 }}>
                <strong>Camino crítico:</strong> Proxy (B1) → Fases 1 → 2. Quick wins (3a, 3b) pueden ejecutarse en paralelo desde que proxy esté activo. La capa de servicios ya está implementada, lo que reduce la estimación optimista en 1–2 semanas respecto al plan original. Fases 6 y 7 bloqueadas por backend/infra.
              </Typography>
            </Paper>
          </Box>
        )}

        {/* ══ H — SERVICIOS ════════════════════════════════════════════════ */}
        {tab === 7 && (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: "var(--font-weight-semibold)", mb: "var(--space-2)" }}>H · Capa de Servicios — Estado de implementación</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: "var(--text-sm)", mb: "var(--space-4)" }}>
              Los 10 módulos en <Code>/src/services/</Code> están implementados y listos para ser consumidos por los componentes de UI.
            </Typography>

            <Box sx={{ mb: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <Banner type="success">
                <strong>10 / 10 servicios implementados.</strong> Axios client tipado, interceptores de autenticación Bearer, manejo centralizado de errores (ApiHttpError · ApiValidationError), AbortController, SSE streaming y progreso de subida. Importar siempre desde <Code>../../services</Code> vía barrel index.ts.
              </Banner>
              <Banner type="warning">
                <strong>Proxy de desarrollo pendiente.</strong> Los servicios están escritos pero los hostnames internos (document-collector:8000, outline-creator:8012, etc.) no son resolvibles desde el browser sin proxy reverso. Configure <Code>vite.config.ts → server.proxy</Code> antes del primer sprint de integración.
              </Banner>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {SERVICES_LAYER.map((svc) => (
                <Paper key={svc.file} variant="outlined" sx={{ borderRadius: "var(--radius)", overflow: "hidden", borderColor: "var(--success)" }}>
                  {/* Header */}
                  <Box sx={{ px: "var(--space-5)", py: "var(--space-3)", bgcolor: "var(--success-subtle)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "var(--space-4)", flexWrap: "wrap" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                      <CheckCircle2 size={13} style={{ color: "var(--success)", flexShrink: 0 }} />
                      <Typography sx={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", fontFamily: "monospace", color: "var(--foreground)" }}>
                        /src/services/<span style={{ color: "var(--primary)" }}>{svc.file}</span>
                      </Typography>
                    </Box>
                    {svc.pantallas !== "—" && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
                        <Typography sx={{ fontSize: "var(--text-3xs)", color: "var(--muted-foreground)" }}>Pantallas:</Typography>
                        <Typography sx={{ fontSize: "var(--text-3xs)", fontWeight: "var(--font-weight-semibold)", fontFamily: "monospace", color: "var(--primary)" }}>{svc.pantallas}</Typography>
                      </Box>
                    )}
                    <Box sx={{ ml: "auto" }}>
                      <Chip variant="success" label="✅ Implementado" />
                    </Box>
                  </Box>

                  {/* Body */}
                  <Box sx={{ px: "var(--space-5)", py: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                    {/* Exports */}
                    <Box>
                      <Typography sx={{ fontSize: "var(--text-3xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)", mb: "var(--space-2)" }}>Exports</Typography>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
                        {svc.exports.map((e, i) => (
                          <Box key={i} sx={{ px: "var(--space-2)", py: "2px", bgcolor: "var(--primary-subtle)", border: "1px solid var(--primary)", borderRadius: "var(--radius-sm)" }}>
                            <Typography sx={{ fontSize: "var(--text-3xs)", fontFamily: "monospace", color: "var(--primary)", fontWeight: "var(--font-weight-semibold)" }}>{e}</Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>

                    {/* Descripción */}
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: "var(--text-sm)", lineHeight: 1.65 }}>{svc.desc}</Typography>

                    {/* Nota pendiente */}
                    <Box sx={{ display: "flex", alignItems: "flex-start", gap: "var(--space-2)", px: "var(--space-3)", py: "var(--space-2)", bgcolor: svc.note.includes("pendiente") || svc.note.includes("Bloqueado") ? "var(--warning-subtle)" : "var(--muted)", borderRadius: "var(--radius-banner)" }}>
                      <Info size={10} style={{ color: svc.note.includes("pendiente") || svc.note.includes("Bloqueado") ? "var(--warning-foreground)" : "var(--muted-foreground)", flexShrink: 0, marginTop: 1 }} />
                      <Typography sx={{ fontSize: "var(--text-3xs)", color: svc.note.includes("pendiente") || svc.note.includes("Bloqueado") ? "var(--warning-foreground)" : "var(--muted-foreground)", lineHeight: 1.55 }}>{svc.note}</Typography>
                    </Box>
                  </Box>
                </Paper>
              ))}
            </Box>

            {/* Import example */}
            <Box sx={{ mt: "var(--space-6)" }}>
              <Typography sx={{ fontWeight: "var(--font-weight-semibold)", fontSize: "var(--text-sm)", mb: "var(--space-3)" }}>Patrón de importación recomendado</Typography>
              <CodeBlock code={`// Importar siempre desde el barrel index.ts
import {
  collectDocuments,
  createOutline,
  pollOutlineJob,
  getOffers,
  searchOffers,
  extractWinThemes,
  retrieveDocumentsStream,
  getUserRole, updateUserRole,
  extractEntitiesPpt,
} from "../../services"; // o la ruta relativa correcta

// Ejemplo: reemplazar mock en indice-content.tsx
// ANTES:
const result = buildMockIndice(); // → texto hardcodeado

// DESPUÉS:
const result = await createOutline({ licitation_id: oppId });
// Si asíncrono:
let job = await pollOutlineJob(jobId);
while (job.status === "pending" || job.status === "running") {
  await new Promise(r => setTimeout(r, 3000));
  job = await pollOutlineJob(jobId);
}
if (job.status === "done") { /* usar job.result */ }`} />
            </Box>
          </Box>
        )}

        {/* ══ SUPUESTOS Y PREGUNTAS ABIERTAS ═══════════════════════════════ */}
        {tab === 8 && (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: "var(--font-weight-semibold)", mb: "var(--space-2)" }}>Supuestos y Preguntas Abiertas para Backend</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: "var(--text-sm)", mb: "var(--space-4)" }}>
              Estas preguntas deben responderse antes de cerrar los contratos de integración. Sin ellas, los campos marcados <Code>[SUPUESTO]</Code> en la sección E son especulaciones.
            </Typography>

            <Banner type="warning">
              <strong>Bloqueo de planificación:</strong> Las Fases 5 y 6 del plan (pantallas 05, 06, 08 y 10) no pueden estimarse con precisión hasta que las preguntas P5, P6, P8 y P10 estén respondidas.
            </Banner>

            <Box sx={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", mt: "var(--space-6)" }}>
              {PREGUNTAS.map(p => (
                <Paper key={p.id} variant="outlined" sx={{ borderRadius: "var(--radius)", display: "flex", alignItems: "flex-start", gap: 0, overflow: "hidden" }}>
                  {/* ID col */}
                  <Box sx={{ px: "var(--space-4)", py: "var(--space-4)", bgcolor: "var(--muted)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-2)", minWidth: 64, flexShrink: 0 }}>
                    <Box sx={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "var(--warning-subtle)", border: "1px solid var(--warning)", borderRadius: "var(--radius)" }}>
                      <HelpCircle size={14} style={{ color: "var(--warning-foreground)" }} />
                    </Box>
                    <Typography sx={{ fontSize: "var(--text-3xs)", fontWeight: "var(--font-weight-bold)", color: "var(--warning-foreground)" }}>{p.id}</Typography>
                  </Box>
                  {/* Content */}
                  <Box sx={{ px: "var(--space-5)", py: "var(--space-4)", flex: 1 }}>
                    <Typography sx={{ fontSize: "var(--text-3xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)", mb: "var(--space-1)" }}>
                      Afecta pantalla{p.afecta.includes(",") ? "s" : ""} {p.afecta}
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: "var(--text-sm)", lineHeight: 1.65 }}>{p.pregunta}</Typography>
                  </Box>
                </Paper>
              ))}
            </Box>

            {/* Supuestos asumidos */}
            <Box sx={{ mt: "var(--space-8)" }}>
              <Typography sx={{ fontWeight: "var(--font-weight-semibold)", fontSize: "var(--text-sm)", mb: "var(--space-4)" }}>Supuestos asumidos en este informe</Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                {[
                  "Los endpoints internos (document-collector, outline-creator, etc.) están detrás de un proxy que los expondrá con URL pública.",
                  "/collect acepta multipart/form-data y devuelve un documentId único por archivo.",
                  "outline-creator devuelve un campo 'outline' con el índice como texto plano.",
                  "win-themes-extractor acepta el texto completo del índice y un array de IDs de sección L1.",
                  "context-enhancement acepta historial de conversación como array {role, content}[].",
                  "licitation-management:8021/get_offers acepta paginación por query params page/limit.",
                  "create_offer existe en licitation-management:8021 con un contrato compatible con NuevaOfertaModal.",
                  "Los servicios en 172.205.199.243 tendrán TLS habilitado o serán accesibles via proxy antes del despliegue en producción.",
                ].map((s, i) => (
                  <Box key={i} sx={{ display: "flex", alignItems: "flex-start", gap: "var(--space-3)", px: "var(--space-4)", py: "var(--space-3)", border: "1px solid var(--border)", borderRadius: "var(--radius)", bgcolor: "background.paper" }}>
                    <CheckCircle2 size={14} style={{ color: "var(--success)", flexShrink: 0, marginTop: 1 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: "var(--text-sm)", lineHeight: 1.6 }}>[SUPUESTO] {s}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        )}

      </Box>
    </Box>
  );
}
