// Next.js equivalent: app/(dashboard)/workspace/[id]/_components/referencia-content.tsx
// Recomendador de ofertas de referencia.
// Modo 1: búsqueda por pliego completo.
// Modo 2: búsqueda por apartado del índice validado (árbol jerárquico + requisitos).
// Persistencia colectiva por oportunidad en localStorage.
// Todos los valores usan exclusivamente CSS variables del design system.
"use client";

import { useState, useCallback, useMemo, useRef, useEffect, type CSSProperties, type ReactNode } from "react";
import {
  Star, Search, Check, Minus, CheckCircle2, Loader2,
  AlertCircle, Info, ShieldCheck, RefreshCw, ChevronRight,
  ChevronDown, Building2, Calendar, FileDown, X, Lightbulb, Pencil, Lock,
} from "lucide-react";
import { AppButton } from "../../../../_components/ui";
import { getAuthUser } from "../../../../_components/auth-store";
import { readStoredIndice, isIndiceValidated } from "./indice-content";
import { useWorkspaceReadonly } from "./workspace-readonly-context";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface IndexNode {
  id: string;
  label: string;
  level: 1 | 2 | 3;
  children: IndexNode[];
}

interface MockOffer {
  id: string;
  name: string;
  client: string;
  deliveryDate: string;
  similarity: number;
  justification: string;
  hasDOCX: boolean;
  hasPPT: boolean;
}

interface L1Store {
  l1Id: string;
  selectedNodes: string[];
  requisitos: string;
  reqValidatedAt?: string;
  reqValidatedBy?: string;
  results?: MockOffer[];
  recomendacion?: string;
  timestamp: number;
}

type SectionKey = "indice" | "requisitos" | "resultados" | "recomendacion";

type SearchMode   = "pliego" | "apartado";
type SearchPhase  = "idle" | "loading" | "results";
type ReqPhase     = "idle" | "loading" | "ready";

// ─── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_OFFERS: MockOffer[] = [
  {
    id: "REF-001",
    name: "Sistema de Gestión Tributaria AEAT – Fase 2",
    client: "Agencia Estatal de Administración Tributaria",
    deliveryDate: "15/03/2024",
    similarity: 94,
    justification:
      "Alta coincidencia en tipología (transformación digital de organismos tributarios) y perfil de cliente idéntico. Arquitectura de microservicios y modelo de integración con sistemas legacy directamente aplicables. Los criterios de valoración técnica son equivalentes en estructura y ponderación.",
    hasDOCX: true,
    hasPPT: true,
  },
  {
    id: "REF-002",
    name: "Modernización Plataforma Hacienda Digital",
    client: "Ministerio de Hacienda y Administraciones Públicas",
    deliveryDate: "22/09/2023",
    similarity: 87,
    justification:
      "Coincidencia en criterios de valoración (metodología ágil, gestión del cambio organizativo) y en el cliente administrador. Modelo de datos comparable y solución de gestión de identidad basada en Cl@ve. Plan de formación y transferencia del conocimiento reutilizable.",
    hasDOCX: true,
    hasPPT: true,
  },
  {
    id: "REF-003",
    name: "Transformación Digital SEPE – Módulo de Prestaciones",
    client: "Servicio Público de Empleo Estatal",
    deliveryDate: "10/06/2023",
    similarity: 81,
    justification:
      "Similitud en alcance funcional (gestión de expedientes, notificaciones electrónicas) y en la complejidad de integraciones con sistemas de la SGAD. La fórmula de valoración económica del pliego es prácticamente equivalente.",
    hasDOCX: true,
    hasPPT: false,
  },
  {
    id: "REF-004",
    name: "Portal Ciudadano – Secretaría de Estado de Digitalización",
    client: "Secretaría de Estado de Digitalización e IA",
    deliveryDate: "28/01/2024",
    similarity: 73,
    justification:
      "Coincidencia en requisitos de accesibilidad (WCAG 2.1 AA), autenticación Cl@ve y metodología de desarrollo. La arquitectura de pruebas y el modelo de experiencia de usuario son directamente aplicables al contexto de la presente licitación.",
    hasDOCX: true,
    hasPPT: true,
  },
  {
    id: "REF-005",
    name: "Sistema Integrado de Gestión Documental DGT",
    client: "Dirección General de Tráfico",
    deliveryDate: "05/11/2022",
    similarity: 68,
    justification:
      "Coincidencia en tipología de solución documental y en el volumen de datos gestionados. La arquitectura de almacenamiento en cloud y los procedimientos de migración de datos resultan reutilizables en gran medida.",
    hasDOCX: false,
    hasPPT: true,
  },
  {
    id: "REF-006",
    name: "Plataforma Big Data – Ministerio de Industria",
    client: "Ministerio de Industria, Comercio y Turismo",
    deliveryDate: "17/04/2023",
    similarity: 61,
    justification:
      "Similitud en componentes de analítica avanzada y cuadros de mando ejecutivos. El enfoque de gobierno del dato y los modelos de reporting son directamente aplicables al contexto de este pliego.",
    hasDOCX: true,
    hasPPT: true,
  },
];

// Sugerencias para el autocomplete (no lista cerrada — el usuario puede escribir libremente)
const SUGGESTION_CLIENTS: string[] = [
  // Administración General del Estado
  "Ministerio de Hacienda y Función Pública",
  "Ministerio de la Presidencia, Justicia y Relaciones con las Cortes",
  "Ministerio de Asuntos Económicos y Transformación Digital",
  "Ministerio de Industria y Turismo",
  "Ministerio de Ciencia, Innovación y Universidades",
  "Ministerio de Educación, Formación Profesional y Deportes",
  "Ministerio de Sanidad",
  "Ministerio de Derechos Sociales, Consumo y Agenda 2030",
  "Ministerio de Trabajo y Economía Social",
  "Ministerio de Transportes y Movilidad Sostenible",
  "Ministerio para la Transición Ecológica y el Reto Demográfico",
  "Ministerio de Agricultura, Pesca y Alimentación",
  "Ministerio de Defensa",
  "Ministerio del Interior",
  "Ministerio de Asuntos Exteriores, Unión Europea y Cooperación",
  "Ministerio de Cultura",
  "Ministerio de Vivienda y Agenda Urbana",
  "Ministerio de Igualdad",
  "Ministerio de Inclusión, Seguridad Social y Migraciones",
  "Secretaría de Estado de Digitalización e Inteligencia Artificial",
  "Secretaría de Estado de Telecomunicaciones e Infraestructuras Digitales",
  "Secretaría de Estado de Administraciones Públicas",
  "Secretaría de Estado de Presupuestos y Gastos",
  "Secretaría de Estado de Economía y Apoyo a la Empresa",
  // Organismos y agencias estatales
  "Agencia Estatal de Administración Tributaria (AEAT)",
  "Agencia Española de Protección de Datos (AEPD)",
  "Agencia Española de Medicamentos y Productos Sanitarios (AEMPS)",
  "Agencia Española de Supervisión de Inteligencia Artificial (AESIA)",
  "Agencia Estatal de Meteorología (AEMET)",
  "Agencia Estatal del Consejo Superior de Investigaciones Científicas (CSIC)",
  "Centro Nacional de Inteligencia (CNI)",
  "Centro Criptológico Nacional (CCN)",
  "Dirección General de la Policía",
  "Dirección General de la Guardia Civil",
  "Dirección General de Tráfico (DGT)",
  "Dirección General del Catastro",
  "Dirección General de Política Digital",
  "Dirección General de Modernización Administrativa",
  "Fábrica Nacional de Moneda y Timbre – Real Casa de la Moneda (FNMT-RCM)",
  "Instituto Nacional de Estadística (INE)",
  "Instituto Nacional de Ciberseguridad (INCIBE)",
  "Instituto Nacional de la Seguridad Social (INSS)",
  "Instituto Nacional de Gestión Sanitaria (INGESA)",
  "Instituto Social de la Marina (ISM)",
  "Instituto de Mayores y Servicios Sociales (IMSERSO)",
  "Instituto para la Diversificación y Ahorro de la Energía (IDAE)",
  "Instituto de Crédito Oficial (ICO)",
  "Instituto de Contabilidad y Auditoría de Cuentas (ICAC)",
  "Intervención General de la Administración del Estado (IGAE)",
  "Mutualidad General de Funcionarios Civiles del Estado (MUFACE)",
  "Servicio Público de Empleo Estatal (SEPE)",
  "Servicio Español para la Internacionalización de la Empresa (ICEX)",
  "Sociedad Estatal de Participaciones Industriales (SEPI)",
  "Tesorería General de la Seguridad Social (TGSS)",
  // Entidades del sector TIC / digitalización
  "Red.es",
  "Secretaría General de Administración Digital (SGAD)",
  // Poder Judicial y organismos constitucionales
  "Consejo General del Poder Judicial (CGPJ)",
  "Tribunal Constitucional",
  "Tribunal de Cuentas",
  "Defensor del Pueblo",
  "Consejo de Estado",
  "Consejo Económico y Social (CES)",
  "Consejo de Seguridad Nuclear (CSN)",
  "Comisión Nacional de los Mercados y la Competencia (CNMC)",
  "Comisión Nacional del Mercado de Valores (CNMV)",
  "Banco de España",
  // Comunidades Autónomas
  "Junta de Andalucía",
  "Gobierno de Aragón",
  "Gobierno del Principado de Asturias",
  "Govern de les Illes Balears",
  "Gobierno de Canarias",
  "Gobierno de Cantabria",
  "Junta de Comunidades de Castilla-La Mancha",
  "Junta de Castilla y León",
  "Generalitat de Catalunya",
  "Junta de Extremadura",
  "Xunta de Galicia",
  "Comunidad de Madrid",
  "Región de Murcia",
  "Gobierno de Navarra / Nafarroako Gobernua",
  "Gobierno Vasco / Eusko Jaurlaritza",
  "Generalitat Valenciana",
  "Gobierno de La Rioja",
  "Ciudad Autónoma de Ceuta",
  "Ciudad Autónoma de Melilla",
  // Entidades locales principales
  "Ayuntamiento de Madrid",
  "Ayuntamiento de Barcelona",
  "Ayuntamiento de Valencia",
  "Ayuntamiento de Sevilla",
  "Ayuntamiento de Zaragoza",
  "Ayuntamiento de Málaga",
  "Ayuntamiento de Murcia",
  "Ayuntamiento de Palma",
  "Ayuntamiento de Las Palmas de Gran Canaria",
  "Ayuntamiento de Bilbao",
  "Ayuntamiento de Alicante",
  "Ayuntamiento de Córdoba",
  "Ayuntamiento de Valladolid",
  "Diputación Provincial de Madrid",
  "Diputación Provincial de Barcelona",
  "Diputación Foral de Bizkaia",
  "Diputación Foral de Gipuzkoa",
  "Diputación Foral de Álava",
  "Federación Española de Municipios y Provincias (FEMP)",
  // Sector sanitario público
  "Servicio Madrileño de Salud (SERMAS)",
  "Servicio Andaluz de Salud (SAS)",
  "Servei Català de la Salut (CatSalut)",
  "Servicio Valenciano de Salud (SVS – GVA)",
  "Servicio de Salud del Principado de Asturias (SESPA)",
  "Servicio de Salud de Castilla y León (SACYL)",
  "Servicio Murciano de Salud (SMS)",
  "Servicio Canario de la Salud (SCS)",
  "Osakidetza – Servicio Vasco de Salud",
  "Servicio Navarro de Salud – Osasunbidea",
  "Instituto Catalán de la Salud (ICS)",
  "Hospital Universitario La Paz",
  "Hospital Universitario 12 de Octubre",
  "Hospital Universitario Gregorio Marañón",
  "Hospital Universitario Ramón y Cajal",
  "Hospital Clínic de Barcelona",
  "Hospital Universitario Virgen del Rocío",
  // Sector educativo y universitario público
  "Universidad Complutense de Madrid (UCM)",
  "Universidad Autónoma de Madrid (UAM)",
  "Universidad Politécnica de Madrid (UPM)",
  "Universidad de Barcelona (UB)",
  "Universitat Politècnica de Catalunya (UPC)",
  "Universidad de Sevilla",
  "Universidad de Valencia",
  "Universidad del País Vasco (UPV/EHU)",
  "Universidad de Granada",
  "Universidad de Zaragoza",
  "Universidad Nacional de Educación a Distancia (UNED)",
  // Sector transporte e infraestructuras
  "ADIF – Administrador de Infraestructuras Ferroviarias",
  "RENFE Viajeros",
  "Aeropuertos Españoles y Navegación Aérea (AENA)",
  "Puertos del Estado",
  "Autoridad Portuaria de Barcelona",
  "Autoridad Portuaria de Valencia",
  "Autoridad Portuaria de Algeciras",
  "Sociedad Estatal de Infraestructuras del Transporte Terrestre (SEITT)",
  // Sector energético y medioambiental
  "Red Eléctrica de España (REE)",
  "Enagás",
  "Empresa Nacional de Residuos (ENRESA)",
  // Otros organismos relevantes
  "Correos y Telégrafos",
  "Loterías y Apuestas del Estado (LAE)",
  "Paradores de Turismo de España",
  "Fondo de Garantía Salarial (FOGASA)",
  "Instituto Nacional de Administración Pública (INAP)",
];

// ─── Persistence ───────────────────────────────────────────────────────────────

const KEY_PLIEGO = (oppId: string) => `ref-pliego-${oppId}`;
const KEY_SEL    = (oppId: string, nodeKey: string) => `ref-sel-${oppId}-${nodeKey}`;

/** Canonical key for a set of selected node IDs — sort ensures order-independence */
function makeNodeKey(selectedNodes: string[]): string {
  return [...selectedNodes].sort().join("\u00b7") || "empty";
}

function loadPligoResults(oppId: string): MockOffer[] | null {
  try {
    const raw = localStorage.getItem(KEY_PLIEGO(oppId));
    if (!raw) return null;
    return (JSON.parse(raw) as { results: MockOffer[] }).results;
  } catch { return null; }
}

function savePligoResults(oppId: string, results: MockOffer[]) {
  try { localStorage.setItem(KEY_PLIEGO(oppId), JSON.stringify({ results })); } catch {}
}

function loadSelStore(oppId: string, nodeKey: string): L1Store | null {
  try {
    const raw = localStorage.getItem(KEY_SEL(oppId, nodeKey));
    if (!raw) return null;
    return JSON.parse(raw) as L1Store;
  } catch { return null; }
}

function saveSelStore(oppId: string, store: L1Store) {
  const nodeKey = makeNodeKey(store.selectedNodes);
  try { localStorage.setItem(KEY_SEL(oppId, nodeKey), JSON.stringify(store)); } catch {}
}

function loadAllSelStores(oppId: string): Record<string, L1Store> {
  const prefix = `ref-sel-${oppId}-`;
  const result: Record<string, L1Store> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const nodeKey = key.slice(prefix.length);
            result[nodeKey] = JSON.parse(raw) as L1Store;
          }
        } catch {}
      }
    }
  } catch {}
  return result;
}

function getMostRecentSelStore(oppId: string): L1Store | null {
  const stores = Object.values(loadAllSelStores(oppId));
  if (stores.length === 0) return null;
  return stores.reduce((a, b) => (a.timestamp > b.timestamp ? a : b));
}

// ─── Index parser ──────────────────────────────────────────────────────────────

function parseIndex(content: string): IndexNode[] {
  const roots: IndexNode[] = [];
  let curL1: IndexNode | null = null;
  let curL2: IndexNode | null = null;
  const l3Re = /^\s+(\d+)\.(\d+)\.(\d+)\.\s+(.+)$/;
  const l2Re = /^\s+(\d+)\.(\d+)\.\s+(.+)$/;
  const l1Re = /^(\d+)\.\s+(.+)$/;

  for (const line of content.split("\n")) {
    const l3m = line.match(l3Re);
    if (l3m) {
      const id = `${l3m[1]}.${l3m[2]}.${l3m[3]}`;
      curL2?.children.push({ id, label: `${id}. ${l3m[4]}`, level: 3, children: [] });
      continue;
    }
    const l2m = line.match(l2Re);
    if (l2m) {
      const id = `${l2m[1]}.${l2m[2]}`;
      const node: IndexNode = { id, label: `${id}. ${l2m[3]}`, level: 2, children: [] };
      curL1?.children.push(node);
      curL2 = node;
      continue;
    }
    const l1m = line.match(l1Re);
    if (l1m) {
      const node: IndexNode = { id: l1m[1], label: `${l1m[1]}. ${l1m[2]}`, level: 1, children: [] };
      roots.push(node);
      curL1 = node;
      curL2 = null;
    }
  }
  return roots;
}

// ─── Tree utilities ────────────────────────────────────────────────────────────

function flattenTree(roots: IndexNode[]): IndexNode[] {
  const out: IndexNode[] = [];
  const walk = (n: IndexNode) => { out.push(n); n.children.forEach(walk); };
  roots.forEach(walk);
  return out;
}

function getL1Root(nodeId: string): string {
  return nodeId.split(".")[0];
}

function getAllDescendantIds(node: IndexNode): string[] {
  const out: string[] = [];
  const walk = (n: IndexNode) => n.children.forEach((c) => { out.push(c.id); walk(c); });
  walk(node);
  return out;
}

function getCheckState(
  node: IndexNode,
  selected: Set<string>
): "checked" | "indeterminate" | "unchecked" {
  const self = selected.has(node.id);
  if (node.children.length === 0) return self ? "checked" : "unchecked";
  const descs = getAllDescendantIds(node);
  const selCount = descs.filter((id) => selected.has(id)).length;
  if (selCount === 0 && !self) return "unchecked";
  if (selCount === descs.length && self) return "checked";
  return "indeterminate";
}

function toggleNode(
  node: IndexNode,
  selected: Set<string>,
  roots: IndexNode[]
): Set<string> {
  const state = getCheckState(node, selected);
  const next = new Set(selected);

  if (state !== "unchecked") {
    // Deselect node + all descendants + parent ancestors
    next.delete(node.id);
    getAllDescendantIds(node).forEach((id) => next.delete(id));
    const parts = node.id.split(".");
    if (parts.length >= 2) next.delete(parts[0]);
    if (parts.length >= 3) next.delete(`${parts[0]}.${parts[1]}`);
  } else {
    // Select node + all descendants
    next.add(node.id);
    getAllDescendantIds(node).forEach((id) => next.add(id));
    // Auto-check ancestors if all siblings are now selected
    const parts = node.id.split(".");
    const l1Node = roots.find((n) => n.id === parts[0]);
    if (l1Node && parts.length === 3) {
      const l2Id = `${parts[0]}.${parts[1]}`;
      const l2Node = l1Node.children.find((n) => n.id === l2Id);
      if (l2Node && l2Node.children.every((c) => next.has(c.id))) next.add(l2Id);
    }
    if (l1Node) {
      const allDesc = getAllDescendantIds(l1Node);
      if (allDesc.length > 0 && allDesc.every((id) => next.has(id))) next.add(l1Node.id);
    }
  }
  return next;
}

/**
 * Returns only the "root" nodes of a selection — nodes whose direct parent
 * is NOT also in the selection. This prevents cascading green checks to children
 * when a parent is processed.
 */
function getRootSelections(selectedNodes: string[]): string[] {
  const nodeSet = new Set(selectedNodes);
  return selectedNodes.filter((id) => {
    const parts = id.split(".");
    if (parts.length === 1) return true; // L1 nodes always qualify
    const parentId = parts.slice(0, -1).join(".");
    return !nodeSet.has(parentId); // root if its parent is not in the selection
  });
}

// ─── Contextual requirements builder ──────────────────────────────────────────

const SECTION_REQUISITOS: Record<string, string> = {
  "1": `A. ACREDITACIÓN Y SOLVENCIA EMPRESARIAL
• Certificado de clasificación empresarial en Grupo V, Subgrupo 3, Categoría D o equivalente vigente.
• Inscripción en el Registro Oficial de Licitadores y Empresas Clasificadas del Sector Público (ROLECE).
• Declaración responsable de no estar incurso en prohibición de contratar (art. 71 LCSP).
• Volumen de negocio anual ≥ 1.200.000 € acreditado en los tres últimos ejercicios cerrados.

B. EXPERIENCIA Y REFERENCIAS
• Mínimo 3 contratos similares ejecutados en los últimos 5 años con organismos públicos de perfil equivalente.
• Certificados de buena ejecución suscritos por el órgano de contratación correspondiente.
• Descripción del alcance, presupuesto y duración de cada referencia aportada.

C. CRITERIOS DE VALORACIÓN
• Solidez y trayectoria en el sector público (hasta 10 puntos).
• Número y relevancia de las referencias (hasta 8 puntos).
• Certificaciones adicionales: ISO 9001, ISO 27001, ENS (hasta 7 puntos).`,

  "2": `A. ANÁLISIS Y COMPRENSIÓN DEL ENTORNO
• Demostrar conocimiento del contexto organizativo y tecnológico actual del organismo contratante.
• Identificar al menos 5 retos clave derivados del análisis del pliego, con justificación técnica.
• Diagnóstico de la situación de partida con metodología contrastada (AS-IS / TO-BE).

B. PROPUESTA DE VALOR Y ALINEAMIENTO
• Alineamiento explícito de la propuesta con los objetivos estratégicos del pliego (art. 3 PPT).
• Identificación de oportunidades de mejora no recogidas explícitamente en el pliego.
• Mapa de actores, dependencias y factores críticos de éxito del proyecto.

C. CRITERIOS DE VALORACIÓN
• Profundidad del análisis y diagnóstico (hasta 12 puntos).
• Identificación de retos y oportunidades de mejora (hasta 8 puntos).
• Propuesta de indicadores de seguimiento y métricas de éxito (hasta 5 puntos).`,

  "3": `A. REQUISITOS TÉCNICOS OBLIGATORIOS
• La solución debe cumplir el Esquema Nacional de Seguridad (ENS) en el nivel establecido en el PPT.
• Cumplimiento del Esquema Nacional de Interoperabilidad (ENI) para todas las integraciones.
• Arquitectura basada en estándares abiertos; prohibición de lock-in tecnológico.
• Accesibilidad WCAG 2.1 nivel AA en todos los componentes de interfaz de usuario.
• Autenticación mediante sistemas oficiales: Cl@ve, certificado electrónico o DNIe.

B. CRITERIOS DE VALORACIÓN DE LA SOLUCIÓN TÉCNICA
• Adecuación y calidad técnica de la arquitectura propuesta (hasta 25 puntos).
• Cobertura de requisitos funcionales del PPT, incluyendo mejoras voluntarias (hasta 15 puntos).
• Modelo de integración con sistemas existentes del organismo (hasta 10 puntos).
• Estrategia de migración de datos y plan de contingencia (hasta 5 puntos).

C. DOCUMENTACIÓN TÉCNICA EXIGIDA
• Memoria técnica descriptiva (máximo 60 páginas).
• Diagramas de arquitectura: lógica, física, de integración y de seguridad.
• Matriz de trazabilidad entre requisitos del PPT y solución propuesta.`,

  "4": `A. MARCO METODOLÓGICO
• Descripción de la metodología de gestión del proyecto (Agile, PMBOK, PRINCE2 o híbrido justificado).
• Plan de aseguramiento de la calidad con hitos de revisión verificables.
• Procedimiento de gestión de cambios, incidencias y desviaciones respecto a la línea base.

B. PLANIFICACIÓN Y CRONOGRAMA
• Cronograma de hitos obligatorios conforme al PPT, con ruta crítica identificada.
• Desglose de actividades con estimación de esfuerzo en personas-día por perfil.
• Plan de comunicación y reporting al órgano de contratación (frecuencia, formato, interlocutores).

C. CRITERIOS DE VALORACIÓN
• Coherencia y viabilidad del plan de trabajo propuesto (hasta 20 puntos).
• Calidad del plan de gestión del cambio organizativo y formación (hasta 10 puntos).
• Mecanismos de seguimiento, control y gestión de riesgos (hasta 8 puntos).`,

  "5": `A. MEDIOS PERSONALES MÍNIMOS EXIGIDOS (art. 6.3 PPT)
• Director/a de Proyecto: titulación superior, ≥ 8 años de experiencia, certificación PMP o PRINCE2 Practitioner vigente. Dedicación mínima: 50%.
• Arquitecto/a de Solución: titulación técnica, ≥ 5 años en arquitecturas para sector público. Dedicación: 100% en fases de análisis y diseño.
• Equipo de desarrollo: mínimo 4 FTEs, con ≥ 50% de experiencia en tecnologías del PPT.
• Responsable de Seguridad: certificación CISM o equivalente, ≥ 3 años en proyectos ENS.

B. CRITERIOS DE VALORACIÓN
• Solvencia técnica y experiencia del Director de Proyecto (hasta 8 puntos).
• Experiencia del equipo en proyectos similares del sector público (hasta 7 puntos).
• Formación específica acreditada en tecnologías del pliego (hasta 5 puntos).

C. DOCUMENTACIÓN REQUERIDA
• CVs normalizados de todos los perfiles clave (máximo 3 páginas/perfil, firmados).
• Acreditación de certificaciones profesionales vigentes.`,

  "6": `A. IDENTIFICACIÓN Y ANÁLISIS DE RIESGOS
• Catálogo de riesgos con al menos 10 riesgos clasificados por probabilidad e impacto.
• Riesgos obligatorios: seguridad de la información, disponibilidad de sistemas, dependencias de terceros y cambios normativos.
• Metodología de valoración alineada con MAGERIT v3 o ISO 31000.

B. PLAN DE MITIGACIÓN Y CONTINGENCIA
• Medidas preventivas y correctivas para cada riesgo de probabilidad alta o impacto crítico.
• Plan de continuidad del servicio durante la implantación, con RTO definido.
• Protocolo de gestión de incidentes críticos con escalado y responsables nominados.

C. CRITERIOS DE VALORACIÓN
• Completitud y rigor del catálogo de riesgos (hasta 5 puntos).
• Calidad del plan de mitigación y contingencia (hasta 8 puntos).`,

  "7": `A. MEJORAS TÉCNICAS SOBRE EL PPT
• Las mejoras no deben suponer incremento del presupuesto de licitación.
• Cada mejora debe justificar su valor añadido con indicadores medibles y criterios de aceptación.
• Impacto obligatorio en: usabilidad, eficiencia operativa o seguridad del sistema.

B. MEJORAS DE SOSTENIBILIDAD Y ACCESIBILIDAD
• Propuestas de reducción de huella de carbono o eficiencia energética (Agenda 2030).
• Medidas adicionales de accesibilidad universal más allá de los mínimos WCAG 2.1 AA.
• Acciones de formación interna para la operación autónoma del sistema por parte del organismo.

C. CRITERIOS DE VALORACIÓN
• Relevancia e impacto de las mejoras técnicas (hasta 5 puntos).
• Viabilidad de las mejoras de sostenibilidad (hasta 4 puntos).
• Valor diferencial respecto a requisitos mínimos (hasta 3 puntos).`,
};

function buildContextualRequisitos(selectedLabels: string[], selectedIds: string[]): string {
  const l1Id    = selectedIds.length > 0 ? getL1Root(selectedIds[0]) : "3";
  const section = SECTION_REQUISITOS[l1Id] ?? SECTION_REQUISITOS["3"];
  const heading = selectedLabels.length > 0
    ? selectedLabels[0].replace(/^\d+(\.\d+)*\.\s*/, "").split("[")[0].trim()
    : "Apartado seleccionado";

  return `REQUISITOS GENERADOS AUTOMÁTICAMENTE
Apartado: ${heading}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${section}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Requisitos generados automáticamente a partir del pliego para el apartado seleccionado.
Akena · Accenture — basado en análisis del PPT y criterios de valoración.`;
}

// ─── Win Themes integration helpers ───────────────────────────────────────────

/** Mirrors the storage contract of win-themes-content.tsx (read-only reference). */
interface WinThemeStoreRef {
  generatedAt: string;
  generatedBy: string;
  sections: Record<string, { text: string; validatedAt?: string; validatedBy?: string }>;
}

interface WinThemeBullet {
  theme: string;
  justification: string;
}

interface ApplicableWT extends WinThemeBullet {
  howToIntegrate: string;
}

function readWinThemesForOpp(oppId: string): WinThemeStoreRef | null {
  try {
    const raw = localStorage.getItem(`win-themes-${oppId}`);
    if (!raw) return null;
    const p = JSON.parse(raw) as WinThemeStoreRef;
    if (p.generatedAt && p.sections) return p;
  } catch {}
  return null;
}

/** Parses the bullet-format Win Theme text into structured entries. */
function parseWinThemeBullets(text: string): WinThemeBullet[] {
  const bullets: WinThemeBullet[] = [];
  let current: WinThemeBullet | null = null;
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (t.startsWith("•")) {
      if (current) bullets.push(current);
      current = { theme: t.replace(/^•\s*/, ""), justification: "" };
    } else if ((t.startsWith("→") || t.startsWith("->")) && current) {
      current.justification = t.replace(/^[→>]\s*(Justificación:\s*)?/, "").trim();
    }
  }
  if (current) bullets.push(current);
  return bullets;
}

/**
 * For L1 selections → returns all bullets.
 * For L2/L3 subapartados → returns a deterministic contextual subset that
 * guarantees full coverage when all subapartados of the same parent are summed.
 */
function getApplicableWinThemes(
  bullets: WinThemeBullet[],
  nodeId: string,
  nodeLabel: string
): ApplicableWT[] {
  if (bullets.length === 0) return [];
  const parts  = nodeId.split(".");
  const isL1   = parts.length === 1;
  const depth  = parts.length; // 2 = L2, 3 = L3
  const subNum = isL1 ? 0 : (parseInt(parts[parts.length - 1], 10) - 1); // 0-based
  const n      = bullets.length;

  if (isL1) {
    return bullets.map((b, i) => ({
      ...b,
      howToIntegrate: _buildHowToIntegrate(b, nodeLabel, i),
    }));
  }

  // L2 gets 2 bullets (or all if ≤ 2); L3 gets 1
  const count = depth === 3 ? 1 : Math.min(2, n);
  const chosen: WinThemeBullet[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < n && chosen.length < count; i++) {
    const idx = (subNum + i) % n;
    if (!seen.has(bullets[idx].theme)) {
      chosen.push(bullets[idx]);
      seen.add(bullets[idx].theme);
    }
  }

  return chosen.map((b, i) => ({
    ...b,
    howToIntegrate: _buildHowToIntegrate(b, nodeLabel, i),
  }));
}

function _buildHowToIntegrate(b: WinThemeBullet, nodeLabel: string, idx: number): string {
  const snippet  = b.theme.split(",")[0].replace(/\.$/, "").trim();
  const subClean = nodeLabel.replace(/^\d+(\.\d+)*\.\s*/, "").split("[")[0].trim();
  const templates = [
    `Incorporar en la apertura de "${subClean}" como primer diferencial de Accenture: "${snippet.substring(0, 68)}…"`,
    `Desarrollar en el cuerpo técnico de "${subClean}" enlazando con los requisitos del pliego: "${snippet.substring(0, 68)}…"`,
    `Usar como cierre de "${subClean}" para reforzar la diferenciación: "${snippet.substring(0, 68)}…"`,
  ];
  return templates[idx % templates.length];
}

// ─── Recommendation builder ────────────────────────────────────────────────────

function buildRecomendacion(
  selectedLabels: string[],
  selectedIds: string[],
  results: MockOffer[],
  applicableWTs: ApplicableWT[],
  winThemeStore: WinThemeStoreRef | null,
  parentL1Label: string
): string {
  const apartado =
    selectedLabels.length > 0
      ? selectedLabels[0].replace(/^\d+(\.\d+)*\.\s*/, "").split("[")[0].trim()
      : "Apartado seleccionado";

  const primaryId     = selectedIds[0] ?? "";
  const isSubapartado = primaryId.split(".").length > 1;
  const top    = results[0];
  const second = results[1];
  const third  = results[2];
  const div    = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

  const lines: string[] = [
    `RECOMENDACIÓN DE RELLENADO — ${apartado}`,
    `Generado automáticamente por Akena · Accenture`,
    "",
    div,
    "",
    "🔹 1. ENFOQUE NARRATIVO RECOMENDADO",
    "",
    "A) Introducción",
    `   • Contextualizar el apartado en el marco estratégico del pliego, alineándolo con`,
    `     los objetivos del organismo contratante tal y como se recogen en el PPT.`,
    `   • Referenciar la trayectoria de Accenture en proyectos equivalentes como respaldo`,
    `     específico para este apartado.`,
    top
      ? `   • Base de partida: "${top.name}" — párrafo introductorio sección equivalente`
      : "",
    top ? `     (adaptar denominación del organismo y ejercicio presupuestario).` : "",
    "",
    "B) Desarrollo principal",
    `   • Desarrollar el contenido técnico/metodológico siguiendo la estructura de`,
    top ? `     "${top.name}".` : `     la oferta base identificada.`,
    second
      ? `   • Incorporar metodología detallada y plan de formación de "${second.name}"`
      : "",
    second ? `     (${second.similarity}% similitud).` : "",
    `   • Asegurar trazabilidad explícita con los requisitos del pliego mediante`,
    `     tabla de cumplimiento o matriz de trazabilidad.`,
    "",
    "C) Elementos diferenciales",
    `   • Destacar capacidades específicas de Accenture: aceleradores, activos propietarios`,
    `     y metodologías certificadas (ISO 9001, CMMI, ENS).`,
    third
      ? `   • Extraer indicadores de rendimiento de "${third.name}" (${third.similarity}% similitud).`
      : "",
    `   • Incluir referencias a proyectos equivalentes con indicadores de éxito verificables.`,
    "",
    "D) Cierre del apartado",
    `   • Reafirmar el compromiso de Accenture con los objetivos estratégicos del organismo.`,
    `   • Incluir tabla resumen de cumplimiento de requisitos del PPT para este apartado.`,
    `   • Referenciar el plan de seguimiento y los KPIs de éxito propuestos.`,
    "",
    div,
    "",
    "🔹 2. INTEGRACIÓN DE WIN THEMES APLICABLES",
    "",
  ];

  if (!winThemeStore) {
    lines.push(
      "   ⚠  Los Win Themes del apartado padre aún no han sido generados.",
      "      Para integrarlos en esta recomendación, genera y valida los Win Themes en",
      "      la sección 'Win Themes' (Línea Técnica → Generación de la propuesta)."
    );
  } else if (applicableWTs.length === 0) {
    lines.push(
      "   No se identifican Win Themes específicos aplicables a este subapartado.",
      "   Consulta el apartado padre para ver los Win Themes globales de la sección."
    );
  } else {
    const header = isSubapartado
      ? `   Win Themes del apartado "${parentL1Label}" aplicables a "${apartado}":`
      : `   Win Themes integrados para el apartado completo "${apartado}":`;
    lines.push(header, "");
    applicableWTs.forEach((wt, i) => {
      lines.push(`   Win Theme ${i + 1}: ${wt.theme}`);
      lines.push(`      ↳ Cómo integrarlo: ${wt.howToIntegrate}`);
      if (wt.justification) {
        lines.push(`      ↳ Base estratégica: ${wt.justification}`);
      }
      lines.push("");
    });
  }

  lines.push(
    div,
    "",
    "🔹 3. REFERENCIAS A OFERTAS HISTÓRICAS",
    "",
    "OFERTA BASE RECOMENDADA",
    `• Principal:  ${top?.name ?? "N/D"} (${top?.similarity ?? 0}% similitud) — Cliente: ${top?.client ?? "N/D"}`,
    second
      ? `• Secundaria: ${second.name} (${second.similarity}% similitud) — metodología y planificación.`
      : "",
    third
      ? `• Terciaria:  ${third.name} (${third.similarity}% similitud) — indicadores y métricas.`
      : "",
    "",
    "COMBINACIÓN DE OFERTAS",
    `• Usar "${top?.name ?? "N/D"}" como estructura base (secciones 1–3).`,
    second ? `• Complementar con "${second.name}" para metodología y plan de formación.` : "",
    third  ? `• Extraer indicadores de rendimiento de "${third.name}".` : "",
    `• Actualizar en todos los casos: denominación del cliente, año, marco normativo`,
    `  vigente y referencias a la oferta económica (excluir precios en memoria técnica).`,
    "",
    "ACTIVOS E INNOVACIÓN A INCORPORAR",
    "• Framework de gestión ágil del cambio organizativo (Accenture Change DNA).",
    "• Acelerador de integración con sistemas SGAD y servicios comunes de la Admón. Electrónica.",
    "• Modelo de gobierno del dato alineado con el ENI y la Estrategia de Datos del organismo.",
    "• Dashboard de seguimiento ejecutivo en tiempo real (activo SmartGov).",
    "",
    div,
    "Akena · Accenture — Recomendación generada automáticamente.",
    "Revisar y adaptar antes de incluir en la propuesta final."
  );

  return lines.filter((l) => l !== "").concat([""]).join("\n").trimEnd();
}

// ─── Similarity badge style ────────────────────────────────────────────────────

function simBadgeStyle(score: number): { bg: string; color: string } {
  if (score >= 90) return { bg: "var(--success-subtle)",  color: "var(--success)" };
  if (score >= 75) return { bg: "var(--primary-subtle)",  color: "var(--primary)" };
  if (score >= 60) return { bg: "var(--warning-subtle)",  color: "var(--warning-foreground)" };
  return             { bg: "var(--neutral-subtle)",   color: "var(--muted-foreground)" };
}

// ─── AppClientFilter — autocomplete multi-select with tags ────────────────────

function AppClientFilter({
  selectedClients: selectedClientsProp,
  onChange,
}: {
  selectedClients: string[];
  onChange: (clients: string[]) => void;
}) {
  // Defensive normalisation: HMR can rehydrate with a stale non-array value
  const selectedClients: string[] = Array.isArray(selectedClientsProp)
    ? selectedClientsProp
    : [];

  const [inputValue, setInputValue]   = useState("");
  const [showDrop, setShowDrop]       = useState(false);
  const containerRef                  = useRef<HTMLDivElement>(null);

  const suggestions = SUGGESTION_CLIENTS.filter(
    (c) =>
      c.toLowerCase().includes(inputValue.toLowerCase()) &&
      !selectedClients.includes(c)
  );

  const addClient = (client: string) => {
    const trimmed = client.trim();
    if (trimmed && !selectedClients.includes(trimmed)) {
      onChange([...selectedClients, trimmed]);
    }
    setInputValue("");
    setShowDrop(false);
  };

  const removeClient = (client: string) => {
    onChange(selectedClients.filter((c) => c !== client));
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDrop(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} style={{ position: "relative", minWidth: "320px", maxWidth: "480px" }}>
      {/* Input area */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "5px",
          padding: "5px 8px",
          border: showDrop ? "1px solid var(--primary)" : "1px solid var(--border)",
          borderRadius: "var(--radius-input)",
          background: "var(--input-background)",
          cursor: "text",
          transition: "border-color 0.15s",
          minHeight: "34px",
        }}
        onClick={() => { /* focus is handled by the input inside */ }}
      >
        {/* Tags */}
        {selectedClients.map((c) => (
          <span
            key={c}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "2px 8px",
              borderRadius: "var(--radius-chip)",
              background: "var(--primary-subtle)",
              border: "1px solid var(--primary)",
              fontSize: "var(--text-2xs)",
              color: "var(--primary)",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
            }}
          >
            {c}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeClient(c); }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0",
                color: "var(--primary)",
                display: "flex",
                alignItems: "center",
                lineHeight: 1,
              }}
            >
              <X size={10} />
            </button>
          </span>
        ))}

        {/* Text input */}
        <input
          value={inputValue}
          onChange={(e) => { setInputValue(e.target.value); setShowDrop(true); }}
          onFocus={() => { if (inputValue.trim().length > 0) setShowDrop(true); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && inputValue.trim()) {
              e.preventDefault();
              addClient(inputValue);
            }
            if (e.key === "Backspace" && !inputValue && selectedClients.length > 0) {
              removeClient(selectedClients[selectedClients.length - 1]);
            }
            if (e.key === "Escape") setShowDrop(false);
          }}
          placeholder={selectedClients.length === 0 ? "Escribe o busca un cliente…" : "Añadir otro…"}
          style={{
            flex: 1,
            minWidth: "120px",
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: "var(--text-xs)",
            fontFamily: "inherit",
            color: "var(--foreground)",
            padding: "2px 0",
          }}
        />

        {/* Clear all */}
        {selectedClients.length > 0 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange([]); setInputValue(""); }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--muted-foreground)",
              display: "flex",
              alignItems: "center",
              padding: "0 2px",
            }}
            title="Limpiar filtro"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Dropdown — solo se muestra cuando el usuario ha escrito algo */}
      {showDrop && inputValue.trim().length > 0 && (suggestions.length > 0 || inputValue.trim()) && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 50,
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-banner)",
            boxShadow: "var(--elevation-sm)",
            maxHeight: "220px",
            overflowY: "auto",
          }}
        >
          {suggestions.map((c) => (
            <div
              key={c}
              onMouseDown={(e) => { e.preventDefault(); addClient(c); }}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: "var(--text-xs)",
                fontFamily: "inherit",
                color: "var(--foreground)",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "var(--muted)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ""; }}
            >
              {c}
            </div>
          ))}
          {inputValue.trim() && !suggestions.find((s) => s.toLowerCase() === inputValue.trim().toLowerCase()) && (
            <div
              onMouseDown={(e) => { e.preventDefault(); addClient(inputValue); }}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: "var(--text-xs)",
                fontFamily: "inherit",
                color: "var(--primary)",
                borderTop: suggestions.length > 0 ? "1px solid var(--border)" : "none",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "var(--muted)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ""; }}
            >
              Añadir "<strong>{inputValue.trim()}</strong>"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── AppCheckbox (custom visual — avoids ref/indeterminate issues) ─────────────

function AppCheckbox({
  state,
  onChange,
  disabled,
}: {
  state: "checked" | "indeterminate" | "unchecked";
  onChange?: () => void;
  disabled?: boolean;
}) {
  const active = state !== "unchecked";
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onChange}
      style={{
        width: "15px",
        height: "15px",
        flexShrink: 0,
        border: active ? "1.5px solid var(--primary)" : "1.5px solid var(--border)",
        borderRadius: "var(--radius-button)",
        background: active ? "var(--primary)" : "var(--input-background)",
        cursor: disabled ? "default" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        outline: "none",
        transition: "background 0.1s, border-color 0.1s",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {state === "checked"       && <Check  size={9} style={{ color: "var(--primary-foreground)" }} />}
      {state === "indeterminate" && <Minus  size={9} style={{ color: "var(--primary-foreground)" }} />}
    </button>
  );
}

// ─── TreeNodeRow ───────────────────────────────────────────────────────────────

function TreeNodeRow({
  node,
  selected,
  validatedNodeIds,
  treeEditable,
  onToggle,
  depth,
}: {
  node: IndexNode;
  selected: Set<string>;
  validatedNodeIds: Set<string>;
  treeEditable: boolean;
  onToggle: (node: IndexNode) => void;
  depth: number;
}) {
  const state      = getCheckState(node, selected);
  const isValidated = validatedNodeIds.has(node.id);

  return (
    <>
      <div
        className="flex items-center gap-2"
        style={{
          padding: "5px 16px",
          paddingLeft: `${16 + depth * 20}px`,
          cursor: treeEditable ? "pointer" : "default",
          borderRadius: "var(--radius-sm)",
          transition: "background 0.1s",
        }}
        onMouseEnter={(e) => { if (treeEditable) (e.currentTarget as HTMLDivElement).style.background = "var(--muted)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ""; }}
        onClick={() => treeEditable && onToggle(node)}
      >
        <AppCheckbox
          state={state}
          onChange={() => treeEditable && onToggle(node)}
          disabled={!treeEditable}
        />
        <span
          style={{
            flex: 1,
            fontSize: node.level === 1 ? "var(--text-xs)" : "var(--text-2xs)",
            fontFamily: "inherit",
            color: "var(--foreground)",
            fontWeight:
              node.level === 1
                ? ("var(--font-weight-medium)" as CSSProperties["fontWeight"])
                : undefined,
            lineHeight: "1.5",
          }}
        >
          {node.label}
        </span>
        {isValidated && (
          <CheckCircle2
            size={12}
            style={{ color: "var(--success)", flexShrink: 0 }}
            title="Requisitos validados"
          />
        )}
      </div>
      {node.children.map((child) => (
        <TreeNodeRow
          key={child.id}
          node={child}
          selected={selected}
          validatedNodeIds={validatedNodeIds}
          treeEditable={treeEditable}
          onToggle={onToggle}
          depth={depth + 1}
        />
      ))}
    </>
  );
}

// ─── AppOfferCard ──────────────────────────────────────────────────────────────

function AppOfferCard({ offer }: { offer: MockOffer }) {
  const badge                                  = simBadgeStyle(offer.similarity);
  const [docxDone, setDocxDone]                = useState(false);
  const [pptDone,  setPptDone]                 = useState(false);

  const handleDownload = (type: "docx" | "ppt") => {
    if (type === "docx") { setDocxDone(true); setTimeout(() => setDocxDone(false), 2500); }
    else                 { setPptDone(true);  setTimeout(() => setPptDone(false),  2500); }
  };

  return (
    <div
      className="border border-border bg-card"
      style={{ borderRadius: "var(--radius)", padding: "18px 20px" }}
    >
      {/* Name + similarity */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <p style={{ fontSize: "var(--text-sm)", fontFamily: "inherit", lineHeight: "1.45", flex: 1 }}>
          {offer.name}
        </p>
        <span
          style={{
            padding: "2px 10px",
            flexShrink: 0,
            borderRadius: "var(--radius-chip)",
            fontSize: "var(--text-3xs)",
            fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
            letterSpacing: "0.03em",
            background: badge.bg,
            color: badge.color,
            fontFamily: "inherit",
          }}
        >
          {offer.similarity}% similitud
        </span>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-5 mb-3" style={{ flexWrap: "wrap" }}>
        <div className="flex items-center gap-1.5">
          <Building2 size={11} style={{ color: "var(--muted-foreground)" }} />
          <span style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
            {offer.client}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar size={11} style={{ color: "var(--muted-foreground)" }} />
          <span style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
            Entregada: {offer.deliveryDate}
          </span>
        </div>
      </div>

      {/* Justification */}
      <div
        style={{
          padding: "10px 12px",
          marginBottom: "14px",
          borderRadius: "var(--radius-banner)",
          background: "var(--muted)",
          border: "1px solid var(--border)",
        }}
      >
        <p
          style={{
            fontSize: "var(--text-2xs)",
            color: "var(--muted-foreground)",
            fontFamily: "inherit",
            marginBottom: "5px",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <Info size={10} />
          Justificación de similitud
        </p>
        <p
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--foreground)",
            fontFamily: "inherit",
            lineHeight: "1.65",
          }}
        >
          {offer.justification}
        </p>
      </div>

      {/* Downloads */}
      <div className="flex items-center gap-3" style={{ flexWrap: "wrap" }}>
        <div className="flex items-center gap-1">
          <Info size={10} style={{ color: "var(--muted-foreground)" }} />
          <span
            style={{
              fontSize: "var(--text-3xs)",
              color: "var(--muted-foreground)",
              fontFamily: "inherit",
            }}
          >
            Descarga como copia
          </span>
        </div>
        {offer.hasDOCX && (
          <button
            onClick={() => handleDownload("docx")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 10px",
              borderRadius: "var(--radius-button)",
              border: "1px solid var(--border)",
              background: "var(--input-background)",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "var(--text-2xs)",
              color: docxDone ? "var(--success)" : "var(--foreground)",
              transition: "color 0.15s",
              outline: "none",
            }}
          >
            {docxDone ? <Check size={10} /> : <FileDown size={10} />}
            {docxDone ? "Descargado" : "Descargar DOCX"}
          </button>
        )}
        {offer.hasPPT && (
          <button
            onClick={() => handleDownload("ppt")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 10px",
              borderRadius: "var(--radius-button)",
              border: "1px solid var(--border)",
              background: "var(--input-background)",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "var(--text-2xs)",
              color: pptDone ? "var(--success)" : "var(--foreground)",
              transition: "color 0.15s",
              outline: "none",
            }}
          >
            {pptDone ? <Check size={10} /> : <FileDown size={10} />}
            {pptDone ? "Descargado" : "Descargar PPT"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── AppResultsList ────────────────────────────────────────────────────────────

function AppResultsList({
  results,
  visible,
  onLoadMore,
  selectedClients,
}: {
  results: MockOffer[];
  visible: number;
  onLoadMore: () => void;
  selectedClients: string[];
}) {
  const filtered =
    selectedClients.length > 0
      ? results.filter((o) =>
          selectedClients.some((c) => o.client.toLowerCase().includes(c.toLowerCase()))
        )
      : results;
  const shown = filtered.slice(0, visible);

  if (filtered.length === 0) {
    return (
      <div
        className="border border-dashed border-border flex items-center justify-center"
        style={{
          minHeight: "100px",
          borderRadius: "var(--radius-banner)",
          background: "var(--muted)",
        }}
      >
        <p
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--muted-foreground)",
            fontFamily: "inherit",
          }}
        >
          No se encontraron ofertas para los clientes seleccionados.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p
        style={{
          fontSize: "var(--text-2xs)",
          color: "var(--muted-foreground)",
          fontFamily: "inherit",
          marginBottom: "14px",
        }}
      >
        {filtered.length} oferta{filtered.length !== 1 ? "s" : ""} encontrada
        {filtered.length !== 1 ? "s" : ""}, ordenadas de mayor a menor similitud.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
        {shown.map((offer) => (
          <AppOfferCard key={offer.id} offer={offer} />
        ))}
      </div>
      {visible < filtered.length && (
        <AppButton variant="secondary" icon={<Search size={13} />} onClick={onLoadMore}>
          Buscar más ofertas
        </AppButton>
      )}
    </div>
  );
}

// ─── AppResultsListPaginated ───────────────────────────────────────────────────

const PAGE_SIZE = 3;

function AppResultsListPaginated({
  results,
  page,
  onPageChange,
  selectedClients,
}: {
  results: MockOffer[];
  page: number;
  onPageChange: (p: number) => void;
  selectedClients: string[];
}) {
  const filtered =
    selectedClients.length > 0
      ? results.filter((o) =>
          selectedClients.some((c) => o.client.toLowerCase().includes(c.toLowerCase()))
        )
      : results;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const shown      = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  if (filtered.length === 0) {
    return (
      <div
        className="border border-dashed border-border flex items-center justify-center"
        style={{
          minHeight: "90px",
          borderRadius: "var(--radius-banner)",
          background: "var(--muted)",
        }}
      >
        <p style={{ fontSize: "var(--text-sm)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>
          No se encontraron ofertas para los clientes seleccionados.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Results count */}
      <p style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", fontFamily: "inherit", marginBottom: "14px" }}>
        {filtered.length} oferta{filtered.length !== 1 ? "s" : ""} encontrada{filtered.length !== 1 ? "s" : ""},
        ordenadas de mayor a menor similitud.
      </p>

      {/* Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
        {shown.map((offer) => (
          <AppOfferCard key={offer.id} offer={offer} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          className="flex items-center gap-1"
          style={{ justifyContent: "flex-start", flexWrap: "wrap" }}
        >
          {/* Prev */}
          <button
            type="button"
            disabled={safePage === 1}
            onClick={() => onPageChange(safePage - 1)}
            style={{
              padding: "4px 10px",
              borderRadius: "var(--radius-button)",
              border: "1px solid var(--border)",
              background: "var(--input-background)",
              color: safePage === 1 ? "var(--muted-foreground)" : "var(--foreground)",
              cursor: safePage === 1 ? "default" : "pointer",
              opacity: safePage === 1 ? 0.45 : 1,
              fontFamily: "inherit",
              fontSize: "var(--text-2xs)",
              outline: "none",
            }}
          >
            ‹
          </button>

          {/* Page numbers */}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              style={{
                minWidth: "28px",
                padding: "4px 8px",
                borderRadius: "var(--radius-button)",
                border: p === safePage ? "1.5px solid var(--primary)" : "1px solid var(--border)",
                background: p === safePage ? "var(--primary-subtle)" : "var(--input-background)",
                color: p === safePage ? "var(--primary)" : "var(--foreground)",
                cursor: p === safePage ? "default" : "pointer",
                fontFamily: "inherit",
                fontSize: "var(--text-2xs)",
                fontWeight: p === safePage ? ("var(--font-weight-semibold)" as CSSProperties["fontWeight"]) : undefined,
                outline: "none",
              }}
            >
              {p}
            </button>
          ))}

          {/* Next */}
          <button
            type="button"
            disabled={safePage === totalPages}
            onClick={() => onPageChange(safePage + 1)}
            style={{
              padding: "4px 10px",
              borderRadius: "var(--radius-button)",
              border: "1px solid var(--border)",
              background: "var(--input-background)",
              color: safePage === totalPages ? "var(--muted-foreground)" : "var(--foreground)",
              cursor: safePage === totalPages ? "default" : "pointer",
              opacity: safePage === totalPages ? 0.45 : 1,
              fontFamily: "inherit",
              fontSize: "var(--text-2xs)",
              outline: "none",
            }}
          >
            ›
          </button>

          <span
            style={{
              fontSize: "var(--text-2xs)",
              color: "var(--muted-foreground)",
              fontFamily: "inherit",
              marginLeft: "6px",
            }}
          >
            Página {safePage} de {totalPages}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── AppAccordionSection ───────────────────────────────────────────────────────

function AppAccordionSection({
  stepNumber,
  title,
  subtitle,
  isOpen,
  isDone,
  onToggle,
  children,
  summary,
}: {
  stepNumber: string;
  title: string;
  subtitle?: string;
  isOpen: boolean;
  isDone: boolean;
  onToggle: () => void;
  children: ReactNode;
  summary?: string;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-button)",
        marginBottom: "10px",
        overflow: "hidden",
        background: "var(--card)",
      }}
    >
      {/* ── Header ── */}
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "13px 16px",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          outline: "none",
        }}
      >
        {/* Step bubble */}
        <div
          style={{
            width: "22px",
            height: "22px",
            borderRadius: "50%",
            flexShrink: 0,
            background: isDone ? "var(--success)" : "var(--muted)",
            border: isDone ? "none" : "1.5px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isDone ? (
            <Check size={11} style={{ color: "var(--primary-foreground)" }} />
          ) : (
            <span
              style={{
                fontSize: "var(--text-2xs)",
                color: "var(--muted-foreground)",
                fontFamily: "inherit",
              }}
            >
              {stepNumber}
            </span>
          )}
        </div>

        {/* Title + summary */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              fontSize: "var(--text-sm)",
              fontFamily: "inherit",
              color: isDone ? "var(--success)" : "var(--foreground)",
              display: "block",
            }}
          >
            {title}
          </span>
          {!isOpen && (isDone ? summary : subtitle) && (
            <span
              style={{
                fontSize: "var(--text-2xs)",
                color: "var(--muted-foreground)",
                fontFamily: "inherit",
                display: "block",
                marginTop: "2px",
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                maxWidth: "520px",
              }}
            >
              {isDone ? summary : subtitle}
            </span>
          )}
        </div>

        {/* Chevron */}
        <ChevronDown
          size={15}
          style={{
            color: "var(--muted-foreground)",
            flexShrink: 0,
            transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
          }}
        />
      </button>

      {/* ── Body ── */}
      {isOpen && (
        <div
          style={{
            borderTop: "1px solid var(--border)",
            padding: "16px 18px 18px 18px",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// ─── AppReferenciaContent ──────────────────────────────────────────────────────

export function AppReferenciaContent({
  oppId,
  oppName: _oppName,
}: {
  oppId: string;
  oppName: string;
}) {
  const { isReadOnly } = useWorkspaceReadonly();

  // ── Shared ──
  const [mode, setMode]                   = useState<SearchMode>("pliego");
  const [selectedClientsRaw, setSelectedClients] = useState<string[]>([]);
  // Guard against HMR rehydrating a stale non-array value
  const selectedClients: string[] = Array.isArray(selectedClientsRaw) ? selectedClientsRaw : [];

  // ── Mode 1: pliego search ──
  const initPligoResults               = useMemo(() => loadPligoResults(oppId) ?? [], [oppId]);
  const [pligoPhase, setPligoPhase]   = useState<SearchPhase>(initPligoResults.length > 0 ? "results" : "idle");
  const [pligoResults, setPligoResults] = useState<MockOffer[]>(initPligoResults);
  const [pligoVisible, setPligoVisible] = useState(3);

  // ── Mode 2: apartado search ──
  const indiceValidated                = isIndiceValidated(oppId);
  const storedIndice                   = readStoredIndice(oppId);
  const treeRoots                      = useMemo(
    () => (storedIndice ? parseIndex(storedIndice.content) : []),
    [storedIndice]
  );

  // Restore last session from localStorage (per-node key store)
  const lastStore = useMemo(() => getMostRecentSelStore(oppId), [oppId]);

  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(
    () => (lastStore ? new Set(lastStore.selectedNodes) : new Set())
  );
  const [treeEditable, setTreeEditable]   = useState(() => !lastStore?.requisitos);
  const [reqPhase, setReqPhase]           = useState<ReqPhase>(() => (lastStore?.requisitos ? "ready" : "idle"));
  const [reqContent, setReqContent]       = useState(() => lastStore?.requisitos ?? "");
  const [reqValidated, setReqValidated]   = useState(() => !!lastStore?.reqValidatedAt);
  const [reqValidatedMeta, setReqValidatedMeta] = useState<{ at: string; by: string } | null>(
    () =>
      lastStore?.reqValidatedAt
        ? { at: lastStore.reqValidatedAt, by: lastStore.reqValidatedBy! }
        : null
  );
  const [searchPhase, setSearchPhase]     = useState<SearchPhase>(
    () => (lastStore?.results?.length ? "results" : "idle")
  );
  const [apartadoResults, setApartadoResults] = useState<MockOffer[]>(
    () => lastStore?.results ?? []
  );
  const [apartadoPage, setApartadoPage] = useState(1);
  const [crossBlockWarning, setCrossBlockWarning] = useState(false);

  // ── Section 4: Recomendación ──
  const [recoPhase, setRecoPhase] = useState<"idle" | "loading" | "ready">(
    () => (lastStore?.recomendacion ? "ready" : "idle")
  );
  const [recoContent, setRecoContent] = useState<string>(
    () => lastStore?.recomendacion ?? ""
  );

  // ── Accordion open state ──
  // Derive initial open section from persisted data
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>(() => {
    if (!lastStore) return { indice: true, requisitos: false, resultados: false, recomendacion: false };
    if (lastStore.recomendacion)   return { indice: false, requisitos: false, resultados: true, recomendacion: true };
    if (lastStore.results?.length) return { indice: false, requisitos: false, resultados: true, recomendacion: false };
    if (lastStore.requisitos)      return { indice: false, requisitos: true,  resultados: false, recomendacion: false };
    return { indice: true, requisitos: false, resultados: false, recomendacion: false };
  });

  const toggleSection = useCallback((key: SectionKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // ── Selected apartado label (for section 4 title) ──
  const selectedApartadoName = useMemo(() => {
    if (selectedNodes.size === 0) return "";
    const flat    = flattenTree(treeRoots);
    const firstId = Array.from(selectedNodes)[0];
    const node    = flat.find((n) => n.id === firstId);
    return node ? node.label.replace(/^\d+(\.\d+)*\.\s*/, "").split("[")[0].trim() : firstId;
  }, [selectedNodes, treeRoots]);

  // All selection stores for green-check status (keyed by nodeKey)
  const [l1Stores, setL1Stores] = useState<Record<string, L1Store>>(() =>
    loadAllSelStores(oppId)
  );

  const validatedNodeIds = useMemo(() => {
    // Only mark the ROOT nodes of each processed session — never cascade to descendants.
    // e.g. selecting "4" also adds 4.1, 4.1.1 to selectedNodes (tree cascade),
    // but the green check must show ONLY on "4".
    const result = new Set<string>();
    Object.values(l1Stores).forEach((store) => {
      if (store.reqValidatedAt && store.results && store.results.length > 0) {
        getRootSelections(store.selectedNodes).forEach((id) => result.add(id));
      }
    });
    return result;
  }, [l1Stores]);

  // ── Win Themes store (read from shared storage) ──
  const winThemeStore = useMemo<WinThemeStoreRef | null>(
    () => readWinThemesForOpp(oppId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [oppId, recoPhase] // re-read when recommendation phase changes
  );

  // ── Contextual Win Themes message for subapartado mode ──
  const contextualWTMessage = useMemo<string | null>(() => {
    if (recoPhase !== "ready" || selectedNodes.size === 0) return null;
    const primaryId = Array.from(selectedNodes)[0];
    if (primaryId.split(".").length <= 1) return null; // not a subapartado
    const l1Id   = getL1Root(primaryId);
    const l1Node = treeRoots.find((n) => n.id === l1Id);
    if (!l1Node || !winThemeStore?.sections[l1Id]) return null;
    const l1Label = l1Node.label.replace(/^\d+\.\s*/, "").split("[")[0].trim();
    return `Esta recomendación ha integrado los Win Themes oficiales del apartado "${l1Label}" que aplican al subapartado seleccionado.`;
  }, [recoPhase, selectedNodes, treeRoots, winThemeStore]);

  // ── Mode 1 handler ──
  const handlePligoSearch = useCallback(() => {
    setPligoPhase("loading");
    setTimeout(() => {
      const results = [...MOCK_OFFERS].sort((a, b) => b.similarity - a.similarity);
      savePligoResults(oppId, results);
      setPligoResults(results);
      setPligoPhase("results");
      setPligoVisible(3);
    }, 1800);
  }, [oppId]);

  // ── Mode 2 handlers ──
  const handleToggleNode = useCallback(
    (node: IndexNode) => {
      const newL1       = getL1Root(node.id);
      const currentL1s  = new Set(Array.from(selectedNodes).map(getL1Root));
      const isUnchecked = getCheckState(node, selectedNodes) === "unchecked";

      // Cross-block guard
      if (isUnchecked && currentL1s.size > 0 && !currentL1s.has(newL1)) {
        setCrossBlockWarning(true);
        return;
      }
      setCrossBlockWarning(false);
      setSelectedNodes(toggleNode(node, selectedNodes, treeRoots));
    },
    [selectedNodes, treeRoots]
  );

  const handleSiguiente = useCallback(() => {
    if (selectedNodes.size === 0) return;
    setTreeEditable(false);
    // Collapse índice, open requisitos
    setOpenSections({ indice: false, requisitos: true, resultados: false, recomendacion: false });

    const frozenSelection = new Set(selectedNodes);
    const l1Id    = getL1Root(Array.from(frozenSelection)[0]);
    const nodeKey = makeNodeKey(Array.from(frozenSelection));
    // Load store for this EXACT selection — no cross-node inheritance
    const existingStore = loadSelStore(oppId, nodeKey);

    if (existingStore?.requisitos) {
      setReqContent(existingStore.requisitos);
      setReqValidated(!!existingStore.reqValidatedAt);
      setReqValidatedMeta(
        existingStore.reqValidatedAt
          ? { at: existingStore.reqValidatedAt, by: existingStore.reqValidatedBy! }
          : null
      );
      if (existingStore.recomendacion) {
        setRecoContent(existingStore.recomendacion);
        setRecoPhase("ready");
        if (existingStore.results?.length) {
          setApartadoResults(existingStore.results);
          setSearchPhase("results");
          // Both resultados + recomendacion visible simultaneously
          setOpenSections({ indice: false, requisitos: false, resultados: true, recomendacion: true });
        } else {
          setOpenSections({ indice: false, requisitos: false, resultados: false, recomendacion: true });
        }
      } else if (existingStore.results?.length) {
        setApartadoResults(existingStore.results);
        setSearchPhase("results");
        setOpenSections({ indice: false, requisitos: false, resultados: true, recomendacion: false });
      } else {
        setSearchPhase("idle");
        setApartadoResults([]);
        setRecoPhase("idle");
        setRecoContent("");
      }
      setReqPhase("ready");
      return;
    }

    // Fresh generation for this exact selection
    setReqPhase("loading");
    setReqValidated(false);
    setReqValidatedMeta(null);
    setSearchPhase("idle");
    setApartadoResults([]);
    setRecoPhase("idle");
    setRecoContent("");

    setTimeout(() => {
      const flat           = flattenTree(treeRoots);
      const selectedLabels = Array.from(frozenSelection)
        .map((id) => flat.find((n) => n.id === id)?.label ?? id);
      const selectedIds    = Array.from(frozenSelection);
      const content        = buildContextualRequisitos(selectedLabels, selectedIds);
      setReqContent(content);
      setReqPhase("ready");

      const store: L1Store = {
        l1Id,
        selectedNodes: Array.from(frozenSelection),
        requisitos: content,
        timestamp: Date.now(),
      };
      saveSelStore(oppId, store);
      setL1Stores((prev) => ({ ...prev, [nodeKey]: store }));
    }, 1600);
  }, [selectedNodes, treeRoots, oppId]);

  /**
   * Unified action: validates the requisitos block AND immediately launches
   * the offer search in a single click. Replaces the old two-step flow.
   */
  const handleValidateAndSearch = useCallback(() => {
    const date    = new Date().toLocaleDateString("es-ES", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
    const user    = getAuthUser().name;
    const l1Id    = getL1Root(Array.from(selectedNodes)[0] ?? "1");
    const nodeKey = makeNodeKey(Array.from(selectedNodes));
    const existing = loadSelStore(oppId, nodeKey);

    // Step 1 — validate and persist immediately
    const withValidation: L1Store = {
      ...(existing ?? {
        l1Id,
        selectedNodes: Array.from(selectedNodes),
        requisitos: reqContent,
        timestamp: Date.now(),
      }),
      requisitos:     reqContent,
      reqValidatedAt: date,
      reqValidatedBy: user,
      timestamp:      Date.now(),
    };
    saveSelStore(oppId, withValidation);
    setL1Stores((prev) => ({ ...prev, [nodeKey]: withValidation }));
    setReqValidated(true);
    setReqValidatedMeta({ at: date, by: user });

    // Step 2 — start search; collapse indice+req, open resultados
    setSearchPhase("loading");
    setOpenSections({ indice: false, requisitos: false, resultados: true, recomendacion: false });
    setRecoPhase("idle");
    setRecoContent("");

    setTimeout(() => {
      const offset  = parseInt(l1Id, 10) % 3;
      const results = [...MOCK_OFFERS]
        .map((o) => ({ ...o, similarity: Math.min(99, o.similarity + offset) }))
        .sort((a, b) => b.similarity - a.similarity);

      const afterSearch: L1Store = { ...withValidation, results, timestamp: Date.now() };
      saveSelStore(oppId, afterSearch);
      setL1Stores((prev) => ({ ...prev, [nodeKey]: afterSearch }));
      setApartadoResults(results);
      setSearchPhase("results");
      setApartadoPage(1);
      setRecoPhase("idle");
      setRecoContent("");
    }, 2000);
  }, [selectedNodes, reqContent, oppId]);

  /** Re-opens the requisitos textarea for editing after validation. */
  const handleEditReq = useCallback(() => {
    setReqValidated(false);
    // Expand the requisitos accordion so the textarea is visible
    setOpenSections((prev) => ({ ...prev, requisitos: true }));
  }, []);

  /** Re-run search only (used by the "Volver a buscar" button in results section). */
  const handleApartadoSearch = useCallback(() => {
    setSearchPhase("loading");
    setOpenSections({ indice: false, requisitos: false, resultados: true, recomendacion: false });
    const l1Id    = getL1Root(Array.from(selectedNodes)[0] ?? "1");
    const nodeKey = makeNodeKey(Array.from(selectedNodes));

    setTimeout(() => {
      const offset  = parseInt(l1Id, 10) % 3;
      const results = [...MOCK_OFFERS]
        .map((o) => ({ ...o, similarity: Math.min(99, o.similarity + offset) }))
        .sort((a, b) => b.similarity - a.similarity);

      const existing = loadSelStore(oppId, nodeKey);
      const updated: L1Store = {
        ...(existing ?? {
          l1Id,
          selectedNodes: Array.from(selectedNodes),
          requisitos: reqContent,
          timestamp: Date.now(),
        }),
        results,
        timestamp: Date.now(),
      };
      saveSelStore(oppId, updated);
      setL1Stores((prev) => ({ ...prev, [nodeKey]: updated }));
      setApartadoResults(results);
      setSearchPhase("results");
      setApartadoPage(1);
      setRecoPhase("idle");
      setRecoContent("");
    }, 2000);
  }, [selectedNodes, oppId, reqContent]);

  const handleChangeSelection = useCallback(() => {
    setTreeEditable(true);
    setReqPhase("idle");
    setReqValidated(false);
    setReqValidatedMeta(null);
    setSearchPhase("idle");
    setCrossBlockWarning(false);
    setRecoPhase("idle");
    setRecoContent("");
    setOpenSections({ indice: true, requisitos: false, resultados: false, recomendacion: false });
  }, []);

  // ── Auto-generate recommendation when search results arrive ────────────────
  useEffect(() => {
    if (searchPhase !== "results" || recoPhase !== "idle" || apartadoResults.length === 0) return;

    // Short delay: let results render, then collapse resultados and open recomendacion
    const t1 = setTimeout(() => {
      // Open recomendacion WITHOUT closing resultados — both visible simultaneously
      setOpenSections((prev) => ({ ...prev, recomendacion: true }));
      setRecoPhase("loading");

      const t2 = setTimeout(() => {
        const flat           = flattenTree(treeRoots);
        const selectedLabels = Array.from(selectedNodes).map(
          (id) => flat.find((n) => n.id === id)?.label ?? id
        );
        const selectedIds    = Array.from(selectedNodes);
        const primaryId      = selectedIds[0] ?? "";
        const l1Id           = getL1Root(primaryId);
        const winStore       = readWinThemesForOpp(oppId);
        const l1Section      = winStore?.sections[l1Id];
        const bullets        = l1Section ? parseWinThemeBullets(l1Section.text) : [];
        const primaryLabel   = flat.find((n) => n.id === primaryId)?.label ?? primaryId;
        const appWTs         = getApplicableWinThemes(bullets, primaryId, primaryLabel);
        const l1Node         = treeRoots.find((n) => n.id === l1Id);
        const parentL1Lbl    = l1Node
          ? l1Node.label.replace(/^\d+\.\s*/, "").split("[")[0].trim()
          : l1Id;
        const content = buildRecomendacion(
          selectedLabels, selectedIds, apartadoResults, appWTs, winStore, parentL1Lbl
        );
        setRecoContent(content);
        setRecoPhase("ready");

        // Persist recommendation under exact selection key
        const nodeKey  = makeNodeKey(Array.from(selectedNodes));
        const existing = loadSelStore(oppId, nodeKey);
        if (existing) {
          const updated: L1Store = { ...existing, recomendacion: content, timestamp: Date.now() };
          saveSelStore(oppId, updated);
          setL1Stores((prev) => ({ ...prev, [nodeKey]: updated }));
        }
      }, 1800);

      return () => clearTimeout(t2);
    }, 900);

    return () => clearTimeout(t1);
  }, [searchPhase, recoPhase, apartadoResults, selectedNodes, treeRoots, oppId]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: "32px 40px" }}>

      {/* ── Tool header ── */}
      <div className="flex items-start gap-4 mb-8">
        <div
          className="bg-muted text-primary flex items-center justify-center flex-shrink-0"
          style={{ width: "48px", height: "48px", borderRadius: "var(--radius)" }}
        >
          <Star size={24} />
        </div>
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 style={{ fontSize: "var(--text-xl)" }}>Ofertas de referencia</h3>
            <span
              style={{
                padding: "2px 10px",
                borderRadius: "var(--radius-chip)",
                fontSize: "var(--text-3xs)",
                fontWeight: "var(--font-weight-semibold)" as CSSProperties["fontWeight"],
                letterSpacing: "0.04em",
                background: "var(--accent-subtle)",
                color: "var(--accent)",
                fontFamily: "inherit",
              }}
            >
              Referencia
            </span>
          </div>
          <p
            className="text-muted-foreground"
            style={{ fontSize: "var(--text-sm)", maxWidth: "560px", fontFamily: "inherit" }}
          >
            Busca ofertas históricas similares al pliego o a apartados específicos del índice validado.
          </p>
        </div>
      </div>

      {/* ── Divider ── */}
      <div style={{ borderTop: "1px solid var(--border)", marginBottom: "28px" }} />

      {/* ── Mode selector ── */}
      <div className="flex gap-4 mb-5" style={{ maxWidth: "620px" }}>
        {(
          [
            {
              id: "pliego"   as SearchMode,
              label: "Búsqueda por pliego",
              desc: "Busca ofertas similares tomando como base el pliego completo.",
            },
            {
              id: "apartado" as SearchMode,
              label: "Búsqueda por apartado",
              desc: "Busca por apartados específicos del índice validado.",
            },
          ] as const
        ).map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            style={{
              flex: 1,
              padding: "14px 16px",
              textAlign: "left",
              borderRadius: "var(--radius)",
              border:
                mode === m.id
                  ? "1.5px solid var(--primary)"
                  : "1px solid var(--border)",
              background:
                mode === m.id ? "var(--primary-subtle)" : "var(--card)",
              cursor: "pointer",
              outline: "none",
              transition: "border-color 0.15s, background 0.15s",
            }}
          >
            <p
              style={{
                fontSize: "var(--text-sm)",
                fontFamily: "inherit",
                marginBottom: "4px",
                color: mode === m.id ? "var(--primary)" : "var(--foreground)",
                fontWeight:
                  mode === m.id
                    ? ("var(--font-weight-semibold)" as CSSProperties["fontWeight"])
                    : undefined,
              }}
            >
              {m.label}
            </p>
            <p
              style={{
                fontSize: "var(--text-2xs)",
                color: "var(--muted-foreground)",
                fontFamily: "inherit",
              }}
            >
              {m.desc}
            </p>
          </button>
        ))}
      </div>

      {/* ── Client filter ── */}
      <div className="flex items-center gap-3 mb-8" style={{ flexWrap: "wrap" }}>
        <label
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--muted-foreground)",
            fontFamily: "inherit",
            whiteSpace: "nowrap",
          }}
        >
          Filtrar por cliente:
        </label>
        <AppClientFilter
          selectedClients={selectedClients}
          onChange={setSelectedClients}
        />
        {selectedClients.length > 0 && (
          <p
            style={{
              fontSize: "var(--text-2xs)",
              color: "var(--muted-foreground)",
              fontFamily: "inherit",
            }}
          >
            {selectedClients.length} cliente{selectedClients.length !== 1 ? "s" : ""} seleccionado{selectedClients.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* ════════════════════════════════════════════════
          MODE 1 — PLIEGO
          ════════════════════════════════════════════════ */}
      {mode === "pliego" && (
        <div style={{ maxWidth: "740px" }}>

          {/* Action bar */}
          <div className="flex items-center gap-4 mb-6">
            {pligoPhase === "loading" ? (
              <div className="flex items-center gap-3">
                <Loader2
                  size={15}
                  className="animate-spin"
                  style={{ color: "var(--primary)" }}
                />
                <span
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "var(--muted-foreground)",
                    fontFamily: "inherit",
                  }}
                >
                  Buscando ofertas similares al pliego…
                </span>
              </div>
            ) : isReadOnly && pligoPhase === "idle" ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: "var(--radius-banner)" }}>
                <Lock size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: "inherit" }}>No ejecutado antes de marcar como Entregada.</span>
              </div>
            ) : (
              <AppButton
                variant="primary"
                icon={
                  pligoPhase === "results" ? (
                    <RefreshCw size={13} />
                  ) : (
                    <Search size={14} />
                  )
                }
                onClick={handlePligoSearch}
                disabled={isReadOnly}
              >
                {pligoPhase === "results" ? "Volver a buscar" : "Buscar ofertas"}
              </AppButton>
            )}
          </div>

          {/* Results */}
          {pligoPhase === "results" && (
            <AppResultsList
              results={pligoResults}
              visible={pligoVisible}
              onLoadMore={() => setPligoVisible((v) => v + 3)}
              selectedClients={selectedClients}
            />
          )}

          {/* Idle placeholder */}
          {pligoPhase === "idle" && (
            <div
              className="border border-dashed border-border flex flex-col items-center justify-center"
              style={{
                minHeight: "180px",
                borderRadius: "var(--radius-banner)",
                background: "var(--muted)",
                gap: "10px",
              }}
            >
              <Star size={22} style={{ color: "var(--muted-foreground)" }} />
              <p
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--muted-foreground)",
                  fontFamily: "inherit",
                  textAlign: "center",
                }}
              >
                Pulsa "Buscar ofertas" para encontrar propuestas similares al pliego.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════
          MODE 2 — APARTADO
          ════════════════════════════════════════════════ */}
      {mode === "apartado" && (
        <div style={{ maxWidth: "860px" }}>

          {/* Gate: index not validated */}
          {!indiceValidated ? (
            <div
              className="flex items-start gap-3 border border-warning"
              style={{
                padding: "14px 16px",
                borderRadius: "var(--radius-banner)",
                background: "var(--warning-subtle)",
              }}
            >
              <AlertCircle
                size={16}
                style={{ color: "var(--warning-foreground)", flexShrink: 0, marginTop: "1px" }}
              />
              <p
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--warning-foreground)",
                  fontFamily: "inherit",
                  lineHeight: "1.5",
                }}
              >
                No se puede realizar la búsqueda por apartado hasta que el índice esté
                validado. Accede a{" "}
                <em>Generación del índice de la oferta</em> para generarlo y validarlo.
              </p>
            </div>
          ) : (
            <>
              {/* ══════════════════════════════════════════════════════════════
                  SECCIÓN 1 — ÍNDICE DEL DOCUMENTO (Accordion)
                  ══════════════════════════════════════════════════════════════ */}
              <AppAccordionSection
                stepNumber="1"
                title="Índice del documento"
                subtitle="Selecciona los apartados para los que deseas buscar ofertas de referencia."
                isOpen={openSections.indice}
                isDone={!treeEditable && selectedNodes.size > 0}
                onToggle={() => toggleSection("indice")}
                summary={`${selectedNodes.size} apartado${selectedNodes.size !== 1 ? "s" : ""} seleccionado${selectedNodes.size !== 1 ? "s" : ""}`}
              >
                {/* Selection state header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p
                      style={{
                        fontSize: "var(--text-2xs)",
                        color: "var(--muted-foreground)",
                        fontFamily: "inherit",
                      }}
                    >
                      {treeEditable
                        ? "Selecciona los apartados para los que deseas buscar ofertas. Solo se permite seleccionar un bloque principal."
                        : "Selección confirmada. "}
                      {!treeEditable && (
                        <button
                          onClick={handleChangeSelection}
                          style={{
                            color: "var(--primary)",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            fontFamily: "inherit",
                            fontSize: "var(--text-2xs)",
                            padding: 0,
                          }}
                        >
                          Cambiar selección
                        </button>
                      )}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: "var(--text-2xs)",
                      color: "var(--muted-foreground)",
                      fontFamily: "inherit",
                      flexShrink: 0,
                    }}
                  >
                    {selectedNodes.size} seleccionado{selectedNodes.size !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Cross-block warning */}
                {crossBlockWarning && (
                  <div
                    className="flex items-center gap-2 mb-3"
                    style={{
                      padding: "8px 12px",
                      borderRadius: "var(--radius-banner)",
                      background: "var(--warning-subtle)",
                      border: "1px solid var(--warning)",
                    }}
                  >
                    <AlertCircle
                      size={13}
                      style={{ color: "var(--warning-foreground)", flexShrink: 0 }}
                    />
                    <span
                      style={{
                        fontSize: "var(--text-2xs)",
                        color: "var(--warning-foreground)",
                        fontFamily: "inherit",
                        flex: 1,
                      }}
                    >
                      No es posible seleccionar apartados de distintos bloques
                      principales. Deselecciona la selección actual para cambiar de bloque.
                    </span>
                    <button
                      onClick={() => setCrossBlockWarning(false)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--warning-foreground)",
                        padding: "0 2px",
                      }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}

                {/* Tree */}
                <div
                  className="border border-border bg-card"
                  style={{ borderRadius: "var(--radius-banner)", padding: "4px 0" }}
                >
                  {treeRoots.length === 0 ? (
                    <p
                      style={{
                        fontSize: "var(--text-sm)",
                        color: "var(--muted-foreground)",
                        fontFamily: "inherit",
                        padding: "16px",
                      }}
                    >
                      No se pudo parsear el índice validado.
                    </p>
                  ) : (
                    treeRoots.map((l1) => (
                      <TreeNodeRow
                        key={l1.id}
                        node={l1}
                        selected={selectedNodes}
                        validatedNodeIds={validatedNodeIds}
                        treeEditable={treeEditable}
                        onToggle={handleToggleNode}
                        depth={0}
                      />
                    ))
                  )}
                </div>

                {/* Siguiente button */}
                {treeEditable && selectedNodes.size > 0 && reqPhase === "idle" && (
                  <div className="flex items-center gap-3 mt-4">
                    <AppButton
                      variant="primary"
                      icon={<ChevronRight size={14} />}
                      onClick={handleSiguiente}
                    >
                      Siguiente
                    </AppButton>
                    <p
                      style={{
                        fontSize: "var(--text-2xs)",
                        color: "var(--muted-foreground)",
                        fontFamily: "inherit",
                      }}
                    >
                      Generará los requisitos para los {selectedNodes.size} apartado
                      {selectedNodes.size !== 1 ? "s" : ""} seleccionado
                      {selectedNodes.size !== 1 ? "s" : ""}.
                    </p>
                  </div>
                )}
              </AppAccordionSection>

              {/* ══════════════════════════════════════════════════════════════
                  SECCIÓN 2 — REQUISITOS DEL APARTADO (Accordion)
                  ══════════════════════════════════════════════════════════════ */}
              {(reqPhase === "loading" || reqPhase === "ready") && (
                <AppAccordionSection
                  stepNumber="2"
                  title="Requisitos del apartado"
                  subtitle="Requisitos generados automáticamente para el apartado seleccionado."
                  isOpen={openSections.requisitos}
                  isDone={reqValidated}
                  onToggle={() => toggleSection("requisitos")}
                  summary={reqValidatedMeta ? `Validados por ${reqValidatedMeta.by} · ${reqValidatedMeta.at}` : "Pendiente de validación"}
                >
                  {reqPhase === "loading" ? (
                    <div className="flex items-center gap-3">
                      <Loader2
                        size={15}
                        className="animate-spin"
                        style={{ color: "var(--primary)" }}
                      />
                      <span
                        style={{
                          fontSize: "var(--text-sm)",
                          color: "var(--muted-foreground)",
                          fontFamily: "inherit",
                        }}
                      >
                        Generando requisitos del apartado seleccionado…
                      </span>
                    </div>
                  ) : (
                    <>
                      <textarea
                        readOnly={reqValidated}
                        value={reqContent}
                        onChange={(e) => !reqValidated && setReqContent(e.target.value)}
                        style={{
                          width: "100%",
                          minHeight: "300px",
                          padding: "16px 18px",
                          marginBottom: "16px",
                          borderRadius: "var(--radius-input)",
                          border: reqValidated
                            ? "1px solid var(--border)"
                            : "1px solid var(--primary)",
                          background: reqValidated
                            ? "var(--muted)"
                            : "var(--input-background)",
                          color: "var(--foreground)",
                          fontSize: "var(--text-xs)",
                          fontFamily: "inherit",
                          lineHeight: "1.7",
                          resize: "vertical",
                          outline: "none",
                          cursor: reqValidated ? "default" : "text",
                          transition: "border-color 0.15s",
                        }}
                      />

                      {/* Req actions row */}
                      <div className="flex items-center gap-3 mb-0" style={{ flexWrap: "wrap" }}>
                        {reqValidated ? (
                          <>
                            {/* Validated badge */}
                            <div className="flex items-center gap-2">
                              <CheckCircle2
                                size={14}
                                style={{ color: "var(--success)", flexShrink: 0 }}
                              />
                              <span
                                style={{
                                  fontSize: "var(--text-xs)",
                                  color: "var(--success)",
                                  fontFamily: "inherit",
                                }}
                              >
                                Requisitos validados
                              </span>
                              {reqValidatedMeta && (
                                <span
                                  style={{
                                    fontSize: "var(--text-2xs)",
                                    color: "var(--muted-foreground)",
                                    fontFamily: "inherit",
                                  }}
                                >
                                  · {reqValidatedMeta.at} · {reqValidatedMeta.by}
                                </span>
                              )}
                            </div>
                            {/* Edit button — re-enables the textarea */}
                            <AppButton
                              variant="secondary"
                              icon={<Pencil size={13} />}
                              onClick={handleEditReq}
                            >
                              Editar requisitos
                            </AppButton>
                          </>
                        ) : (
                          /* Single unified action — validates + searches in one click */
                          <AppButton
                            variant="primary"
                            icon={<ShieldCheck size={14} />}
                            onClick={handleValidateAndSearch}
                          >
                            Validar requisitos y buscar ofertas
                          </AppButton>
                        )}
                      </div>
                    </>
                  )}
                </AppAccordionSection>
              )}

              {/* ══════════════════════════════════════════════════════════════
                  SECCIÓN 3 — RESULTADOS (Accordion)
                  ══════════════════════════════════════════════════════════════ */}
              {(searchPhase === "loading" || searchPhase === "results") && (
                <AppAccordionSection
                  stepNumber="3"
                  title="Resultados de ofertas encontradas"
                  subtitle="Ofertas que cumplen el contexto global del pliego y los requisitos del apartado."
                  isOpen={openSections.resultados}
                  isDone={searchPhase === "results"}
                  onToggle={() => toggleSection("resultados")}
                  summary={
                    searchPhase === "results"
                      ? `${apartadoResults.length} oferta${apartadoResults.length !== 1 ? "s" : ""} encontrada${apartadoResults.length !== 1 ? "s" : ""}`
                      : undefined
                  }
                >
                  {searchPhase === "loading" ? (
                    <div className="flex items-center gap-3">
                      <Loader2
                        size={15}
                        className="animate-spin"
                        style={{ color: "var(--primary)" }}
                      />
                      <span
                        style={{
                          fontSize: "var(--text-sm)",
                          color: "var(--muted-foreground)",
                          fontFamily: "inherit",
                        }}
                      >
                        Buscando ofertas que cumplan los requisitos del apartado…
                      </span>
                    </div>
                  ) : (
                    <>
                      <AppResultsListPaginated
                        results={apartadoResults}
                        page={apartadoPage}
                        onPageChange={setApartadoPage}
                        selectedClients={selectedClients}
                      />
                      <div className="mt-4">
                        <AppButton
                          variant="secondary"
                          icon={<RefreshCw size={13} />}
                          onClick={handleApartadoSearch}
                        >
                          Volver a buscar
                        </AppButton>
                      </div>
                    </>
                  )}
                </AppAccordionSection>
              )}

              {/* ══════════════════════════════════════════════════════════════
                  SECCIÓN 4 — RECOMENDACIÓN DE RELLENADO (Accordion)
                  ══════════════════════════════════════════════════════════════ */}
              {(recoPhase === "loading" || recoPhase === "ready") && (
                <AppAccordionSection
                  stepNumber="4"
                  title={
                    selectedApartadoName
                      ? `Recomendación de rellenado del apartado (${selectedApartadoName})`
                      : "Recomendación de rellenado del apartado"
                  }
                  subtitle="Guía narrativa para estructurar el apartado basada en las ofertas de referencia encontradas."
                  isOpen={openSections.recomendacion}
                  isDone={recoPhase === "ready"}
                  onToggle={() => toggleSection("recomendacion")}
                  summary="Recomendación generada · Revisa antes de incluir en la propuesta final"
                >
                  {recoPhase === "loading" ? (
                    <div className="flex items-center gap-3">
                      <Loader2
                        size={15}
                        className="animate-spin"
                        style={{ color: "var(--primary)" }}
                      />
                      <span
                        style={{
                          fontSize: "var(--text-sm)",
                          color: "var(--muted-foreground)",
                          fontFamily: "inherit",
                        }}
                      >
                        Generando recomendación de rellenado del apartado…
                      </span>
                    </div>
                  ) : (
                    <>
                      {/* Header note */}
                      <div
                        className="flex items-start gap-2 mb-3"
                        style={{
                          padding: "10px 14px",
                          borderRadius: "var(--radius-banner)",
                          background: "var(--accent-subtle)",
                          border: "1px solid var(--accent)",
                        }}
                      >
                        <Lightbulb
                          size={13}
                          style={{ color: "var(--accent)", flexShrink: 0, marginTop: "1px" }}
                        />
                        <p
                          style={{
                            fontSize: "var(--text-2xs)",
                            color: "var(--accent)",
                            fontFamily: "inherit",
                            lineHeight: "1.55",
                          }}
                        >
                          Guía generada automáticamente. Estructura el apartado en tres bloques:
                          enfoque narrativo, Win Themes aplicables del apartado padre e innovación
                          de Accenture, y referencias a ofertas históricas.
                          Revisa y adapta antes de incluir en la propuesta final.
                        </p>
                      </div>

                      {/* Contextual Win Themes message — only in subapartado mode */}
                      {contextualWTMessage && (
                        <div
                          className="flex items-start gap-2 mb-3"
                          style={{
                            padding: "8px 12px",
                            borderRadius: "var(--radius-banner)",
                            background: "var(--primary-subtle)",
                            border: "1px solid var(--primary)",
                          }}
                        >
                          <Info
                            size={12}
                            style={{ color: "var(--primary)", flexShrink: 0, marginTop: "2px" }}
                          />
                          <p
                            style={{
                              fontSize: "var(--text-2xs)",
                              color: "var(--primary)",
                              fontFamily: "inherit",
                              lineHeight: "1.5",
                            }}
                          >
                            {contextualWTMessage}
                          </p>
                        </div>
                      )}

                      {/* Read-only textarea */}
                      <textarea
                        readOnly
                        value={recoContent}
                        style={{
                          width: "100%",
                          minHeight: "420px",
                          padding: "16px 18px",
                          borderRadius: "var(--radius-input)",
                          border: "1px solid var(--border)",
                          background: "var(--muted)",
                          color: "var(--foreground)",
                          fontSize: "var(--text-xs)",
                          fontFamily: "inherit",
                          lineHeight: "1.75",
                          resize: "vertical",
                          outline: "none",
                          cursor: "default",
                        }}
                      />

                      {/* Actions */}
                      <div className="flex items-center gap-3 mt-4" style={{ flexWrap: "wrap" }}>
                        <div
                          className="flex items-center gap-2"
                          style={{
                            padding: "5px 10px",
                            borderRadius: "var(--radius-chip)",
                            background: "var(--success-subtle)",
                            border: "1px solid var(--success)",
                          }}
                        >
                          <CheckCircle2 size={12} style={{ color: "var(--success)" }} />
                          <span
                            style={{
                              fontSize: "var(--text-2xs)",
                              color: "var(--success)",
                              fontFamily: "inherit",
                            }}
                          >
                            Recomendación guardada
                          </span>
                        </div>
                        <AppButton
                          variant="secondary"
                          icon={<RefreshCw size={13} />}
                          onClick={() => {
                            setRecoPhase("idle");
                            setRecoContent("");
                            // useEffect will re-trigger generation
                          }}
                        >
                          Regenerar recomendación
                        </AppButton>
                      </div>
                    </>
                  )}
                </AppAccordionSection>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
