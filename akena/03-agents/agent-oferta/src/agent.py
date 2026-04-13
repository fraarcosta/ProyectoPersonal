"""
Agente de análisis y generación de oferta técnica para licitaciones públicas españolas.
Funciones: detección de incoherencias entre PCAP/PPT, generación de índice de oferta.
"""
import json
import logging
from shared.interfaces import LLMProviderInterface, MemoryStoreInterface

logger = logging.getLogger(__name__)

# ─── System prompts ───────────────────────────────────────────────────────────

INCOHERENCIAS_PROMPT = """Eres un experto jurídico-técnico especializado en licitaciones públicas españolas bajo la Ley 9/2017 de Contratos del Sector Público (LCSP).

Tu misión es analizar los documentos del pliego (PCAP, PPT y Anexos) para detectar:
1. **Contradicciones** — datos que se contradicen entre documentos (plazos, importes, requisitos).
2. **Inconsistencias** — datos que no son coherentes internamente (clasificación exigida vs. valorable, criterios solapados).
3. **Ambigüedades** — redacciones que admiten interpretaciones múltiples y pueden perjudicar al licitador.
4. **Duplicados** — criterios de valoración que aparecen duplicados sin delimitación clara entre sobres.

Para CADA incoherencia detectada debes proporcionar:
- Un ID único (I-001, I-002, ...)
- El tipo exacto: "contradiccion", "inconsistencia", "ambiguedad" o "duplicado"
- Un título conciso y descriptivo
- Una descripción detallada del problema con cita textual de los apartados afectados
- Las secciones exactas donde aparece (array de strings)
- Las páginas aproximadas (string)
- Una recomendación concreta de acción para el licitador

IMPORTANTE: Responde EXCLUSIVAMENTE con un array JSON válido con este esquema exacto:
[
  {
    "id": "I-001",
    "tipo": "contradiccion",
    "titulo": "...",
    "descripcion": "...",
    "secciones": ["PCAP – Cláusula X", "PPT – Apartado Y"],
    "paginas": "PCAP p.X / PPT p.Y",
    "recomendacion": "..."
  }
]

Si no encuentras incoherencias relevantes, devuelve un array vacío [].
No incluyas ningún texto fuera del JSON. No uses markdown, no uses bloques de código.
"""

INDICE_PROMPT = """Eres un experto en elaboración de ofertas técnicas para licitaciones públicas españolas bajo la LCSP.

Tu misión es generar el ÍNDICE ESTRUCTURADO de la oferta técnica a partir del análisis del pliego.

El índice debe:
1. Mapear cada criterio de valoración subjetivo del PCAP con su sección correspondiente en la oferta
2. Incluir la puntuación máxima asociada a cada sección entre corchetes [XX pts]
3. Seguir la estructura habitual de ofertas técnicas para Administración Pública española
4. Incluir secciones obligatorias aunque no puntúen (presentación empresa, solvencia, etc.)
5. Ordenar los capítulos por importancia estratégica (mayor puntuación primero en el cuerpo técnico)
6. Usar numeración decimal completa (1. / 1.1. / 1.1.1.)

Formato de salida:
- Título del documento
- Separador ━━━━━━
- Capítulos numerados con subsecciones
- Al final: nota de "Índice generado por Akena · Accenture"

Sé preciso con las puntuaciones extraídas del pliego. Si un criterio no tiene puntuación especificada, indícalo con [—].
"""


class OfertaAgent:
    """Agente de análisis y generación de oferta técnica."""

    def __init__(self, llm: LLMProviderInterface, memory: MemoryStoreInterface):
        self._llm = llm
        self._memory = memory

    async def detect_incoherencias(
        self,
        document_text: str,
        session_id: str = "default",
        file_name: str = "",
    ) -> list:
        """Detecta incoherencias en el pliego. Retorna lista de IncoherenciaItem."""
        user_msg = f"Analiza el siguiente pliego y detecta todas las incoherencias:\n\nFichero(s): {file_name}\n\n{document_text}"
        messages = [{"role": "user", "content": user_msg}]
        try:
            result = await self._llm.complete(messages=messages, system=INCOHERENCIAS_PROMPT)
            raw = result["content"].strip()
            # Limpiar posibles bloques de código markdown
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            items = json.loads(raw)
            logger.info("detect-incoherencias: %d items encontrados, session=%s", len(items), session_id)
            return items
        except json.JSONDecodeError as e:
            logger.error("JSON parse error en detect-incoherencias: %s", e)
            return []
        except Exception as e:
            logger.error("Error en detect-incoherencias: %s", e)
            raise

    async def generate_index(
        self,
        document_text: str,
        session_id: str = "default",
        file_name: str = "",
    ) -> str:
        """Genera el índice de la oferta técnica a partir del pliego."""
        user_msg = f"Genera el índice de la oferta técnica para el siguiente pliego:\n\nFichero(s): {file_name}\n\n{document_text}"
        messages = [{"role": "user", "content": user_msg}]
        result = await self._llm.complete(messages=messages, system=INDICE_PROMPT)
        content = result["content"]
        logger.info("generate-index: %d chars, session=%s", len(content), session_id)
        return content
