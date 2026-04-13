"""
Agente económico para licitaciones públicas españolas.
Funciones: extracción de fórmula económica del PCAP, simulación de escenarios de precio.
"""
import json
import logging
from shared.interfaces import LLMProviderInterface, MemoryStoreInterface

logger = logging.getLogger(__name__)

# ─── System prompts ───────────────────────────────────────────────────────────

FORMULA_PROMPT = """Eres un experto en análisis económico de licitaciones públicas españolas bajo la LCSP (Ley 9/2017).

Tu misión es extraer del PCAP toda la información sobre los criterios de valoración ECONÓMICA (criterios automáticos/objetivos).

Para cada partida económica debes identificar:
1. Nombre del criterio/partida
2. Puntuación máxima
3. Presupuesto base de licitación (sin IVA)
4. Fórmula exacta de valoración (cópiala textualmente del pliego)
5. Umbral de baja temeraria si se menciona (porcentaje o importe)
6. Observaciones relevantes (IVA, anualidades, prórrogas, etc.)

También extrae:
- Si hay desglose en lotes o partidas independientes
- Si existe un presupuesto global y subpresupuestos por componentes
- Cualquier condición especial (precio fijo, tarifas por perfil, etc.)

Responde EXCLUSIVAMENTE con JSON válido con este esquema:
{
  "presupuesto_global": "2.400.000",
  "tiene_desglose": true,
  "partidas": [
    {
      "nombre": "Oferta económica",
      "puntuacion_max": "30",
      "presupuesto": "2400000",
      "formula": "Puntuación = (Pi/Pm) × 30, donde Pi es el precio más bajo y Pm el precio ofertado",
      "baja_temeraria": "25",
      "observaciones": "Se excluyen ofertas con baja superior al 25%"
    }
  ],
  "resumen": "Texto explicativo del modelo económico general del contrato"
}

No incluyas texto fuera del JSON. No uses markdown ni bloques de código.
"""

SIMULATE_PROMPT = """Eres un experto en análisis económico de licitaciones públicas españolas.

Dado un conjunto de partidas económicas con sus fórmulas de valoración y los descuentos ofertados por varias empresas competidoras, calcula las puntuaciones obtenidas por cada empresa aplicando la fórmula exacta del pliego.

Para cada empresa y partida, muestra:
- El precio ofertado (aplicando el descuento sobre el presupuesto base)
- La puntuación obtenida
- Si entra en baja temeraria

Al final, muestra el ranking de empresas por puntuación total.

Identifica cuál sería el descuento óptimo para maximizar puntuación sin entrar en baja temeraria.

Responde en texto estructurado, con tablas ASCII si es posible, en español profesional.
"""


class EconomicoAgent:
    """Agente de análisis económico para licitaciones públicas."""

    def __init__(self, llm: LLMProviderInterface, memory: MemoryStoreInterface):
        self._llm = llm
        self._memory = memory

    async def extract_formula(
        self,
        document_text: str,
        session_id: str = "default",
        file_name: str = "",
    ) -> dict:
        """Extrae la fórmula económica del PCAP. Retorna dict con partidas."""
        user_msg = f"Extrae la información económica del siguiente pliego:\n\nFichero(s): {file_name}\n\n{document_text}"
        messages = [{"role": "user", "content": user_msg}]
        try:
            result = await self._llm.complete(messages=messages, system=FORMULA_PROMPT)
            raw = result["content"].strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            data = json.loads(raw)
            logger.info("extract-formula: %d partidas, session=%s", len(data.get("partidas", [])), session_id)
            return data
        except json.JSONDecodeError as e:
            logger.error("JSON parse error en extract-formula: %s", e)
            return {"presupuesto_global": "", "tiene_desglose": False, "partidas": [], "resumen": "No se pudo extraer la fórmula del pliego."}
        except Exception as e:
            logger.error("Error en extract-formula: %s", e)
            raise

    async def simulate(
        self,
        partidas: list,
        descuentos: list,
        num_empresas: int = 3,
        session_id: str = "default",
    ) -> str:
        """Simula escenarios económicos con los descuentos dados."""
        partidas_txt = json.dumps(partidas, ensure_ascii=False, indent=2)
        descuentos_txt = ", ".join(f"{d}%" for d in descuentos)
        user_msg = (
            f"Simula la puntuación económica para {num_empresas} empresas con estos descuentos: {descuentos_txt}.\n\n"
            f"Partidas económicas del pliego:\n{partidas_txt}"
        )
        messages = [{"role": "user", "content": user_msg}]
        result = await self._llm.complete(messages=messages, system=SIMULATE_PROMPT)
        content = result["content"]
        logger.info("simulate: %d chars, session=%s", len(content), session_id)
        return content
