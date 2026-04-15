"""
Agente generador de Win Themes para licitaciones públicas españolas.

Arquitectura en dos fases:
  Fase 1 — Una sola llamada con el pliego completo → resumen estructurado del pliego
            (criterios subjetivos de valoración, entregables, tecnologías, ámbito funcional)
  Fase 2 — Una llamada por sección L1, usando SOLO el resumen (input ~10x más pequeño)
            → sin riesgo de rate limit ni de truncado de output
"""
import asyncio
import json
import logging
import re
from shared.interfaces import LLMProviderInterface, MemoryStoreInterface

logger = logging.getLogger(__name__)


# Tamaño máximo de cada chunk del pliego.
# 25 000 chars ≈ 6 500 tokens + system prompt (~500 t) + respuesta (~3 000 t)
# ≈ 10 000 tokens por llamada → muy por debajo del límite de 50 k t/min.
CHUNK_CHARS = 25_000

# Segundos de espera entre llamadas sucesivas al LLM para respetar el rate limit.
INTER_CALL_DELAY = 5.0


def _chunk_document(text: str, chunk_size: int = CHUNK_CHARS) -> list[str]:
    """Divide el texto en chunks del tamaño indicado, respetando líneas."""
    if len(text) <= chunk_size:
        return [text]
    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        if end < len(text):
            # Retrocede hasta el último salto de línea para no cortar palabras
            nl = text.rfind("\n", start, end)
            if nl > start:
                end = nl + 1
        chunks.append(text[start:end])
        start = end
    return chunks


def _merge_analysis(base: dict, extra: dict) -> None:
    """Fusiona `extra` sobre `base` en el resumen del pliego."""
    for key in ("objeto", "organismo", "ambito_funcional"):
        if not base.get(key) and extra.get(key):
            base[key] = extra[key]
    for key in ("entregables", "tecnologias"):
        seen = set(base.get(key) or [])
        for item in extra.get(key) or []:
            if item not in seen:
                base.setdefault(key, []).append(item)
                seen.add(item)
    # Fusiona criterios subjetivos: añade los que no existan aún por nombre
    existing_names = {c["nombre"] for c in base.get("criterios_subjetivos") or []}
    for crit in extra.get("criterios_subjetivos") or []:
        if crit.get("nombre") not in existing_names:
            base.setdefault("criterios_subjetivos", []).append(crit)
            existing_names.add(crit["nombre"])


def _parse_l1_sections(index_text: str) -> list[tuple[str, str]]:
    """
    Extrae secciones de nivel 1 del índice. Retorna [(id, titulo_completo), ...].

    Soporta los formatos que genera el LLM:
      1. Título         — estándar
      1.- Título        — con guión
      1.  Título        — espacio doble
      **1. Título**     — markdown bold
      1 Título          — sin punto (fallback)
    Excluye sub-secciones (1.1, 1.1.1…).
    """
    sections: list[tuple[str, str]] = []

    # Muestra las primeras líneas para diagnóstico
    preview = index_text[:500].replace("\r", "")
    logger.debug("Primeras líneas del índice recibido:\n%s", preview)

    for raw_line in index_text.splitlines():
        t = raw_line.strip()
        if not t:
            continue

        # Quitar negrita markdown si la hubiera
        t_clean = re.sub(r'\*+', '', t).strip()

        # Excluir sub-secciones: tienen un punto interno en el número (1.1, 2.3.1…)
        if re.match(r'^\d+\.\d', t_clean):
            continue

        # Patrones aceptados para L1:
        #   "1. Título"  "1.- Título"  "1.  Título"
        m = re.match(r'^(\d+)\.[–\-]?\s+(.+)$', t_clean)
        if m:
            sections.append((m.group(1), t_clean))
            continue

        # Fallback: "1 Título" (sin punto)
        m2 = re.match(r'^(\d+)\s{2,}(.+)$', t_clean)
        if m2:
            sections.append((m2.group(1), t_clean))

    logger.info("_parse_l1_sections: %d secciones L1 encontradas", len(sections))
    if not sections:
        logger.warning(
            "No se encontraron secciones L1. Muestra del índice (500 chars):\n%s",
            preview,
        )
    return sections


def _clean_json(raw: str) -> str:
    """Elimina bloques de código markdown del raw."""
    raw = raw.strip()
    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1] if len(parts) > 1 else raw
        if raw.startswith("json"):
            raw = raw[4:]
    if raw.endswith("```"):
        raw = raw[: raw.rfind("```")]
    return raw.strip()


# ─── Prompts ──────────────────────────────────────────────────────────────────

ANALYSIS_PROMPT = """Eres un experto en licitaciones públicas españolas bajo la LCSP.

Analiza el fragmento del pliego que se te proporciona y extrae toda la información relevante.
El documento puede llegar dividido en varios fragmentos; extrae lo que encuentres en ESTE fragmento.
Responde EXCLUSIVAMENTE con un objeto JSON válido con esta estructura:

{
  "objeto": "descripción concisa del objeto y finalidad del contrato (vacío si no aparece en este fragmento)",
  "organismo": "nombre del organismo contratante (vacío si no aparece)",
  "entregables": ["entregable 1", "entregable 2"],
  "tecnologias": ["tecnología 1", "tecnología 2"],
  "ambito_funcional": "ámbito funcional, procesos y sistemas implicados (vacío si no aparece)",
  "criterios_subjetivos": [
    {
      "nombre": "Nombre exacto del criterio de juicio de valor",
      "puntos_max": 20,
      "referencia": "Apartado X del PPT",
      "subcriterios": [
        {
          "nombre": "Nombre del subcriterio",
          "puntos": 10,
          "que_valora": "Qué contenido o nivel de detalle pide el pliego para la puntuación máxima"
        }
      ],
      "que_valora_globalmente": "Si no hay subcriterios: qué pide para puntuación máxima"
    }
  ]
}

SOLO incluye criterios de JUICIO DE VALOR (no automáticos como precio, plazo, etc.).
Si en este fragmento no hay criterios de juicio de valor, devuelve la lista vacía.
No incluyas texto fuera del JSON. No uses markdown ni bloques de código.
"""

WIN_THEMES_SECTION_PROMPT = """Eres un experto en elaboración de ofertas técnicas para licitaciones públicas españolas.

Se te proporciona un resumen estructurado del pliego y una sección del índice de la oferta.
Genera 2-3 Win Themes para esa sección que indiquen exactamente QUÉ contenido incluir
para maximizar la puntuación técnica en los criterios subjetivos del PPT.

FORMATO DE CADA WIN THEME (máximo 3 líneas):
• [Qué contenido concreto incluir — específico y accionable]
  → Criterio: [Nombre exacto del criterio] — hasta [N] pts ([referencia del PPT])
  → Por qué maximiza: [Qué aspecto específico del criterio cubre y cómo]

REGLAS CRÍTICAS:
- Win Themes = instrucciones de contenido, NO eslóganes de marketing
- MAL: "Acreditada trayectoria de Accenture en el sector público"
- BIEN: "Incluir tabla con 3 proyectos equivalentes (organismo, tecnología, resultado medible)
         → Criterio: Experiencia proyectos similares — hasta 15 pts (cláusula X)
         → Por qué maximiza: el PPT puntúa por número y similitud de referencias acreditadas"
- Cita SIEMPRE el criterio subjetivo del PPT y sus puntos
- Si el pliego valora "detalle": di exactamente QUÉ detallar y con qué estructura
- Si el pliego valora "metodología ágil": di qué marcos, ceremonias y evidencias incluir
- Si la sección no puntúa directamente: indica qué riesgo elimina para el evaluador
- NUNCA inventes datos que no estén en el resumen del pliego

FORMATO DE RESPUESTA: JSON con UNA sola clave (número de sección como string):
{"3": "• Contenido...\n  → Criterio: ...\n  → Por qué: ...\n\n• Contenido 2...\n  → Criterio: ..."}

No incluyas texto fuera del JSON. No uses markdown ni bloques de código.
"""


class WinThemesAgent:
    def __init__(self, llm: LLMProviderInterface, memory: MemoryStoreInterface):
        self._llm = llm
        self._memory = memory

    async def _analyze_chunk(self, chunk: str, file_names: str, chunk_num: int, total: int) -> dict:
        """Analiza un fragmento del pliego y devuelve su resumen parcial."""
        header = f"Fragmento {chunk_num}/{total} de los ficheros: {file_names}\n\n"
        result = await self._llm.complete(
            messages=[{"role": "user", "content": header + chunk}],
            system=ANALYSIS_PROMPT,
            max_tokens=3000,
        )
        raw = _clean_json(result["content"])
        return json.loads(raw)

    async def _analyze_pliego(self, document_text: str, file_names: str) -> dict:
        """Fase 1: analiza el pliego completo en chunks y fusiona los resultados."""
        chunks = _chunk_document(document_text)
        logger.info(
            "Fase 1 — Pliego dividido en %d chunk(s) de ~%d chars (total %d chars)",
            len(chunks), CHUNK_CHARS, len(document_text),
        )

        merged: dict = {
            "objeto": "",
            "organismo": "",
            "entregables": [],
            "tecnologias": [],
            "ambito_funcional": "",
            "criterios_subjetivos": [],
        }

        for i, chunk in enumerate(chunks):
            if i > 0:
                logger.info("Esperando %ss antes del chunk %d/%d…", INTER_CALL_DELAY, i + 1, len(chunks))
                await asyncio.sleep(INTER_CALL_DELAY)
            logger.info("Fase 1 — Analizando chunk %d/%d…", i + 1, len(chunks))
            partial = await self._analyze_chunk(chunk, file_names, i + 1, len(chunks))
            _merge_analysis(merged, partial)

        return merged

    async def _generate_section(
        self,
        pliego_summary: dict,
        section_id: str,
        section_title: str,
        index_text: str,
    ) -> str:
        """Fase 2: genera Win Themes para una sola sección usando el resumen."""
        summary_json = json.dumps(pliego_summary, ensure_ascii=False, indent=2)
        user_msg = (
            f"Genera Win Themes para la sección '{section_id}. {section_title}'.\n\n"
            f"━━ RESUMEN DEL PLIEGO ━━\n{summary_json}\n\n"
            f"━━ ÍNDICE COMPLETO (contexto) ━━\n{index_text}"
        )
        result = await self._llm.complete(
            messages=[{"role": "user", "content": user_msg}],
            system=WIN_THEMES_SECTION_PROMPT,
            max_tokens=1500,
        )
        raw = _clean_json(result["content"])
        parsed = json.loads(raw)
        return str(next(iter(parsed.values())))

    async def generate_win_themes(
        self,
        document_text: str,
        index_text: str,
        session_id: str = "default",
        file_names: str = "",
    ) -> dict[str, str]:
        """
        Genera Win Themes por sección L1.
        Fase 1: analiza el pliego completo → resumen estructurado (1 llamada).
        Fase 2: genera Win Themes por sección usando solo el resumen (N llamadas pequeñas).
        """
        sections = _parse_l1_sections(index_text)
        if not sections:
            raise ValueError(
                "No se encontraron secciones L1 en el índice. "
                "Asegúrate de que usa numeración decimal (1. Título, 2. Título…)"
            )

        logger.info(
            "Fase 1 — Analizando pliego (%d chars, %d secciones L1), session=%s",
            len(document_text), len(sections), session_id,
        )

        # ── Fase 1 ───────────────────────────────────────────────────────────
        try:
            summary = await self._analyze_pliego(document_text, file_names)
            logger.info(
                "Fase 1 OK — %d criterios subjetivos extraídos",
                len(summary.get("criterios_subjetivos", [])),
            )
        except Exception as e:
            logger.error("Error en Fase 1: %s", e)
            raise ValueError(f"Error al analizar el pliego: {e}") from e

        # ── Fase 2 ───────────────────────────────────────────────────────────
        # Esperamos 5 s tras la Fase 1 para que el contador de tokens se refresque
        await asyncio.sleep(5.0)

        results: dict[str, str] = {}
        for idx, (sec_id, sec_title) in enumerate(sections):
            logger.info("Fase 2 [%d/%d] — Sección %s: %s", idx + 1, len(sections), sec_id, sec_title)
            try:
                text = await self._generate_section(
                    pliego_summary=summary,
                    section_id=sec_id,
                    section_title=sec_title,
                    index_text=index_text,
                )
                results[sec_id] = text
            except Exception as e:
                logger.error("Error en sección %s ('%s'): %s", sec_id, sec_title, e)
                results[sec_id] = f"[Error generando Win Themes: {e}]"

            # Pausa de 5 s entre secciones — con ~2 k tokens/sección y 12 secciones
            # el peor caso es 24 k tokens en 60 s, muy por debajo del límite de 50 k.
            if idx < len(sections) - 1:
                await asyncio.sleep(5.0)

        logger.info("generate-win-themes COMPLETO: %d secciones, session=%s", len(results), session_id)
        return results
