"""
CualificacionAgent — opportunity qualification logic.
"""
import json
import logging
import re
from typing import AsyncIterator

from shared.interfaces import AuthValidatorInterface, LLMProviderInterface, MemoryStoreInterface

logger = logging.getLogger(__name__)

# Origen comercial declarado por el usuario (API). Peso orientativo 50% en la decisión GO/NO-GO.
_COMMERCIAL_ORIGINS: dict[str, tuple[str, str]] = {
    "accenture_led": (
        "Origenación Accenture / co-creación con cliente",
        "Máxima probabilidad favorable a GO: relación de confianza, alineación previa y visibilidad "
        "del requerimiento. Salvo bloqueos duros del pliego (exclusión, solvencia inalcanzable, "
        "riesgo reputacional extremo), favorece presentar oferta.",
    ),
    "relationship_momentum": (
        "Relación comercial en curso",
        "Probabilidad intermedia: existen conversaciones, workshops o seguimiento previo, pero la "
        "oportunidad no fue diseñada íntegramente desde Accenture. La decisión depende en mayor "
        "medida del pliego y del encaje técnico-económico.",
    ),
    "reactive_untracked": (
        "Oportunidad reactiva / sin pipeline previo",
        "Menor probabilidad a priori de GO: detección sobre aviso público o canal entrante sin "
        "relación comercial acreditada. Exige pliego muy sólido, márgenes defendibles y ausencia "
        "de show-stoppers; ante dudas fuertes, inclínate a NO_GO o GO condicionado.",
    ),
}


def _normalize_commercial_origin(origin: str | None) -> str:
    o = (origin or "").strip().lower().replace("-", "_")
    if o in _COMMERCIAL_ORIGINS:
        return o
    return "relationship_momentum"


def _commercial_rubric_text(origin: str) -> str:
    key = _normalize_commercial_origin(origin)
    title, body = _COMMERCIAL_ORIGINS[key]
    return (
        f"ORIGEN COMERCIAL SELECCIONADO POR EL USUARIO — código: {key}\n"
        f"Título: {title}\n"
        f"Descripción: {body}\n"
        "REGLA DE DECISIÓN (aplica explícitamente):\n"
        "- Reparte el criterio de decisión en dos mitades de peso equivalente (~50% / ~50%).\n"
        "  MITAD A — Comercial: interpreta el origen anterior (accenture_led más favorable; "
        "relationship_momentum neutro; reactive_untracked más exigente).\n"
        "  MITAD B — Pliego: integra en una síntesis coherente la evidencia de los documentos: "
        "identificación y alcance, plazos, economía y tarifas, solvencia, perfiles, restricciones, "
        "criterios de adjudicación y riesgos documentales. Señala bloqueos duros si existen.\n"
        "- La decisión final GO o NO_GO y el nivel de confianza deben reflejar la combinación de "
        "ambas mitades; si el pliego impone un veto claro, puede dominar sobre el origen comercial.\n"
        "- En \"reasons\" incluye al menos una razón ligada al origen comercial y al menos dos "
        "basadas en el análisis del pliego.\n"
    )


SYSTEM_PROMPT = """Eres el Agente de Cualificación de Akena — experto en evaluar licitaciones \
públicas para Accenture España. Analizas pliegos (PCAP, PPT, Anexos) y produces informes \
GO/NO-GO estructurados basados en datos reales del documento.

Reglas absolutas:
- NUNCA inventes ni deduzas datos que no estén explícitamente en el pliego.
- Si un campo no aparece en el documento, escribe exactamente: "No especificado en el pliego".
- Cuando se te pida JSON: SOLO el objeto JSON. PROHIBIDO markdown y PROHIBIDO cercas ``` o ```json. \
El primer carácter debe ser {{.
- Textos breves: reasons ≤120 caracteres; value en extractedFields ≤280 (multiline ≤500).
- Responde siempre en español."""

_QUALIFY_PROMPT = """\
Eres un experto en licitaciones públicas. Analiza los siguientes documentos y devuelve \
un informe de cualificación GO/NO-GO para Accenture España.

{commercial_rubric}
DOCUMENTOS:
{documents}

INSTRUCCIÓN: Responde ÚNICAMENTE con JSON válido. NO uses ``` ni markdown. El primer carácter debe ser {{.
Si un dato no aparece en el pliego escribe: "No especificado en el pliego".
Mantén textos cortos (reasons ≤120 caracteres c/u; value ≤280 salvo multiline ≤500).
El campo "commercialOriginId" debe ser exactamente "{origin_echo}" (eco del origen declarado).

Campos obligatorios del JSON:

{{
  "decision": "GO",
  "confidence": "HIGH",
  "reasons": ["razón 1 del pliego", "razón 2", "razón 3", "razón 4", "razón 5"],
  "commercialOriginId": "{origin_echo}",
  "decisionBlend": {{
    "commercialHalf": "Qué aporta la mitad comercial (50%) al GO/NO-GO según el origen",
    "pliegoHalf": "Síntesis mitad pliego (50%): encaje económico, plazos, solvencia, perfiles, criterios, riesgos"
  }},
  "justification": {{
    "encaje": "encaje con capacidades Accenture",
    "riesgosOperativos": "subrogación, presencialidad, SLAs",
    "riesgosEconomicos": "margen, fórmula precio, penalizaciones",
    "complejidadDocumental": "sobres, certificaciones, solvencia",
    "recomendacion": "recomendación final"
  }},
  "clientName": "nombre del organismo",
  "objectSummary": "resumen en una frase",
  "extractedFields": [
    {{"id":"cliente",            "category":"Identificación y alcance",  "label":"Cliente / Organismo",                   "value":"...", "source":"PCAP", "needsReview":false}},
    {{"id":"objeto",             "category":"Identificación y alcance",  "label":"Objeto del contrato",                   "value":"...", "source":"PCAP", "needsReview":false, "multiline":true}},
    {{"id":"codigo_expediente",  "category":"Identificación y alcance",  "label":"Código de expediente",                  "value":"...", "source":"PCAP", "needsReview":false}},
    {{"id":"tipologia",          "category":"Identificación y alcance",  "label":"Tipología de contrato",                 "value":"...", "source":"PCAP", "needsReview":false}},
    {{"id":"ambito",             "category":"Identificación y alcance",  "label":"Ámbito geográfico",                     "value":"...", "source":"PCAP", "needsReview":false}},
    {{"id":"duracion",           "category":"Identificación y alcance",  "label":"Duración (+ prórrogas)",                "value":"...", "source":"PCAP", "needsReview":false}},
    {{"id":"lotes",              "category":"Identificación y alcance",  "label":"Lotes",                                 "value":"...", "source":"PCAP", "needsReview":false}},
    {{"id":"plazo_presentacion", "category":"Plazos y calendario",       "label":"Fecha límite presentación de ofertas",  "value":"...", "source":"PCAP", "needsReview":false}},
    {{"id":"plazo_aclaraciones", "category":"Plazos y calendario",       "label":"Plazo de consultas / aclaraciones",     "value":"...", "source":"PCAP", "needsReview":false}},
    {{"id":"plazo_inicio",       "category":"Plazos y calendario",       "label":"Plazo de inicio de la prestación",      "value":"...", "source":"PPT",  "needsReview":false}},
    {{"id":"plazo_garantia",     "category":"Plazos y calendario",       "label":"Plazo de garantía post-contrato",       "value":"...", "source":"PCAP", "needsReview":false}},
    {{"id":"presupuesto",        "category":"Económico",                 "label":"Presupuesto base sin IVA (€)",          "value":"...", "source":"PCAP", "needsReview":false}},
    {{"id":"formula",            "category":"Económico",                 "label":"Fórmula de valoración económica",       "value":"...", "source":"PCAP", "needsReview":false, "multiline":true}},
    {{"id":"penalizaciones",     "category":"Económico",                 "label":"Penalizaciones económicas",             "value":"...", "source":"PPT",  "needsReview":false}},
    {{"id":"garantias",          "category":"Económico",                 "label":"Garantías / fianzas exigidas",          "value":"...", "source":"PCAP", "needsReview":false}},
    {{"id":"forma_pago",         "category":"Económico",                 "label":"Forma y plazo de pago",                 "value":"...", "source":"PCAP", "needsReview":false}},
    {{"id":"modelo_facturacion", "category":"Tarifas y facturación",     "label":"Modelo de facturación (T&M / fijo / mixto)", "value":"...", "source":"PCAP", "needsReview":false}},
    {{"id":"tarifas_perfiles",   "category":"Tarifas y facturación",     "label":"Tarifas unitarias por perfil (€/h)",    "value":"...", "source":"PCAP", "needsReview":true,  "multiline":true}},
    {{"id":"hitos_facturacion",  "category":"Tarifas y facturación",     "label":"Hitos vinculados a facturación",        "value":"...", "source":"PCAP", "needsReview":false, "multiline":true}},
    {{"id":"bolsas_horas",       "category":"Tarifas y facturación",     "label":"Bolsas de horas / UFs",                 "value":"...", "source":"PPT",  "needsReview":false}},
    {{"id":"solvencia_economica","category":"Solvencia",                 "label":"Solvencia económica exigida",           "value":"...", "source":"PCAP", "needsReview":false}},
    {{"id":"solvencia_tecnica",  "category":"Solvencia",                 "label":"Solvencia técnica exigida",             "value":"...", "source":"PCAP", "needsReview":false, "multiline":true}},
    {{"id":"clasificacion",      "category":"Solvencia",                 "label":"Clasificación empresarial",             "value":"...", "source":"PCAP", "needsReview":false}},
    {{"id":"certificaciones_req","category":"Solvencia",                 "label":"Certificaciones obligatorias",          "value":"...", "source":"PPT",  "needsReview":false}},
    {{"id":"ute",                "category":"Solvencia",                 "label":"UTE / subcontratación admitida",        "value":"...", "source":"PCAP", "needsReview":false}},
    {{"id":"perfiles_lista",     "category":"Perfiles requeridos",       "label":"Perfiles profesionales (resumen)",      "value":"...", "source":"PPT",  "needsReview":false, "multiline":true}},
    {{"id":"perfil_director",    "category":"Perfiles requeridos",       "label":"Director / Jefe de proyecto",           "value":"...", "source":"PPT",  "needsReview":false}},
    {{"id":"perfil_tecnico",     "category":"Perfiles requeridos",       "label":"Perfil técnico principal (senior)",     "value":"...", "source":"PPT",  "needsReview":false}},
    {{"id":"perfil_otros",       "category":"Perfiles requeridos",       "label":"Otros perfiles relevantes",             "value":"...", "source":"PPT",  "needsReview":false, "multiline":true}},
    {{"id":"num_personas",       "category":"Perfiles requeridos",       "label":"Número estimado de FTEs",               "value":"...", "source":"PPT",  "needsReview":false}},
    {{"id":"presencialidad",     "category":"Restricciones operativas",  "label":"Presencialidad requerida",              "value":"...", "source":"PPT",  "needsReview":false}},
    {{"id":"idioma",             "category":"Restricciones operativas",  "label":"Idioma requerido",                      "value":"...", "source":"PCAP", "needsReview":false}},
    {{"id":"sla",                "category":"Restricciones operativas",  "label":"SLA críticos / 24x7",                  "value":"...", "source":"PPT",  "needsReview":false}},
    {{"id":"subrogacion",        "category":"Restricciones operativas",  "label":"Subrogación de personal",              "value":"...", "source":"PCAP", "needsReview":true}},
    {{"id":"seguridad",          "category":"Restricciones operativas",  "label":"Requisitos seguridad / ENS / GDPR",    "value":"...", "source":"PPT",  "needsReview":false}},
    {{"id":"reparto",            "category":"Criterios de adjudicación", "label":"Reparto técnico / económico (pts)",     "value":"...", "source":"PCAP", "needsReview":false}},
    {{"id":"criterios_tec",      "category":"Criterios de adjudicación", "label":"Criterios técnicos y puntuación",       "value":"...", "source":"PCAP", "needsReview":false, "multiline":true}},
    {{"id":"sobres",             "category":"Criterios de adjudicación", "label":"Documentación por sobres",              "value":"...", "source":"PCAP", "needsReview":false, "multiline":true}},
    {{"id":"mejoras",            "category":"Criterios de adjudicación", "label":"Mejoras / criterios de desempate",      "value":"...", "source":"PCAP", "needsReview":false}},
    {{"id":"riesgos",            "category":"Riesgos detectados",        "label":"Riesgos clave identificados",           "value":"...", "source":"Análisis IA", "needsReview":true, "multiline":true}},
    {{"id":"supuestos",          "category":"Riesgos detectados",        "label":"Supuestos / lagunas en el pliego",      "value":"...", "source":"Análisis IA", "needsReview":true, "multiline":true}},
    {{"id":"go_conditions",      "category":"Riesgos detectados",        "label":"Condiciones previas para el GO",        "value":"...", "source":"Análisis IA", "needsReview":true, "multiline":true}}
  ]
}}"""

# Reintento: menos campos y mensajes más cortos si la salida se trunca o el modelo usa markdown.
_QUALIFY_RETRY_PROMPT = """\
Analiza los documentos y devuelve JSON GO/NO-GO para Accenture España.
SIN markdown. SIN ```. El primer carácter debe ser {{.
Valores muy breves (≤100 caracteres salvo multiline ≤300).
Decisión: combina ~50% criterio comercial según origen y ~50% viabilidad del pliego.

{commercial_rubric}
DOCUMENTOS:
{documents}

JSON exacto (estructura fija, rellena desde el pliego). commercialOriginId = "{origin_echo}".
{{
  "decision": "GO",
  "confidence": "HIGH",
  "reasons": ["r1", "r2", "r3", "r4", "r5"],
  "commercialOriginId": "{origin_echo}",
  "decisionBlend": {{
    "commercialHalf": "...",
    "pliegoHalf": "..."
  }},
  "justification": {{
    "encaje": "...",
    "riesgosOperativos": "...",
    "riesgosEconomicos": "...",
    "complejidadDocumental": "...",
    "recomendacion": "..."
  }},
  "clientName": "...",
  "objectSummary": "...",
  "extractedFields": [
    {{"id":"cliente","category":"Identificación y alcance","label":"Cliente","value":"...","source":"PCAP","needsReview":false}},
    {{"id":"objeto","category":"Identificación y alcance","label":"Objeto","value":"...","source":"PCAP","needsReview":false,"multiline":true}},
    {{"id":"presupuesto","category":"Económico","label":"Presupuesto","value":"...","source":"PCAP","needsReview":false}},
    {{"id":"plazo_presentacion","category":"Plazos y calendario","label":"Presentación ofertas","value":"...","source":"PCAP","needsReview":false}},
    {{"id":"duracion","category":"Identificación y alcance","label":"Duración","value":"...","source":"PCAP","needsReview":false}},
    {{"id":"modelo_facturacion","category":"Tarifas y facturación","label":"Modelo facturación","value":"...","source":"PCAP","needsReview":false}},
    {{"id":"tarifas_perfiles","category":"Tarifas y facturación","label":"Tarifas/perfiles","value":"...","source":"PCAP","needsReview":true,"multiline":true}},
    {{"id":"perfiles_lista","category":"Perfiles requeridos","label":"Perfiles","value":"...","source":"PPT","needsReview":false,"multiline":true}},
    {{"id":"solvencia_economica","category":"Solvencia","label":"Solvencia económica","value":"...","source":"PCAP","needsReview":false}},
    {{"id":"reparto","category":"Criterios de adjudicación","label":"Reparto puntos","value":"...","source":"PCAP","needsReview":false}},
    {{"id":"riesgos","category":"Riesgos detectados","label":"Riesgos","value":"...","source":"IA","needsReview":true,"multiline":true}}
  ]
}}"""


class CualificacionAgent:
    def __init__(
        self,
        llm: LLMProviderInterface,
        memory: MemoryStoreInterface,
        auth: AuthValidatorInterface,
    ) -> None:
        self._llm = llm
        self._memory = memory
        self._auth = auth

    async def run(self, user_message: str, session_id: str) -> str:
        messages = self._memory.load(session_id)
        messages.append({"role": "user", "content": user_message})

        result = await self._llm.complete(
            messages=messages,
            system=SYSTEM_PROMPT,
        )

        content = result["content"]
        if isinstance(content, list):
            content = " ".join(b.get("text", "") for b in content if isinstance(b, dict))

        messages.append({"role": "assistant", "content": content})
        self._memory.save(session_id, messages)
        return content

    async def stream(self, user_message: str, session_id: str) -> AsyncIterator[str]:
        messages = self._memory.load(session_id)
        messages.append({"role": "user", "content": user_message})
        full_response = []

        async for chunk in self._llm.stream(messages=messages, system=SYSTEM_PROMPT):
            full_response.append(chunk)
            yield chunk

        messages.append({"role": "assistant", "content": "".join(full_response)})
        self._memory.save(session_id, messages)

    async def qualify_documents(
        self,
        doc_texts: list[dict],
        commercial_origin: str = "relationship_momentum",
    ) -> dict:
        """
        Analyze uploaded procurement documents and return a structured GO/NO-GO result.

        doc_texts: list of {"name": str, "doc_type": str, "text": str}
        commercial_origin: accenture_led | relationship_momentum | reactive_untracked
        Returns: dict matching the PrequalResult + extractedFields + clientName + objectSummary
                 schema expected by the frontend.
        """
        origin_key = _normalize_commercial_origin(commercial_origin)
        commercial_rubric = _commercial_rubric_text(origin_key)

        # Give priority budget to PCAP/administrativo, then tecnico, then anexo
        _PRIORITY = {"administrativo": 0, "tecnico": 1, "anexo": 2}
        sorted_docs = sorted(doc_texts, key=lambda d: _PRIORITY.get(d["doc_type"], 9))

        # Distribute token budget: ~30k chars total across all docs
        per_doc_limit = max(8_000, 30_000 // max(len(sorted_docs), 1))
        documents_section = "\n\n".join(
            f"=== [{d['doc_type'].upper()}] {d['name']} ===\n{d['text'][:per_doc_limit]}"
            for d in sorted_docs
        )

        prompt = _QUALIFY_PROMPT.format(
            documents=documents_section,
            commercial_rubric=commercial_rubric,
            origin_echo=origin_key,
        )

        logger.info(
            "qualify_documents: %d docs, prompt ~%d chars",
            len(doc_texts),
            len(prompt),
        )

        result = await self._llm.complete(
            messages=[{"role": "user", "content": prompt}],
            system=SYSTEM_PROMPT,
            # Salida grande (~40 campos); 8k suele bastar si el modelo respeta textos breves
            max_tokens=8192,
            temperature=0.0,
        )

        content = result["content"]
        if isinstance(content, list):
            content = " ".join(b.get("text", "") for b in content if isinstance(b, dict))

        stop_reason = result.get("stop_reason", "unknown")
        logger.info(
            "qualify_documents: stop_reason=%s, response_length=%d",
            stop_reason,
            len(content),
        )
        if stop_reason == "max_tokens":
            logger.warning("qualify_documents: response was TRUNCATED (max_tokens hit)")

        logger.info("qualify_documents raw (first 800 chars): %s", content[:800])
        try:
            return self._parse_qualify_response(content)
        except ValueError:
            # Salida truncada (max_tokens) o modelo ignora "sin markdown" (```json… sin cerrar)
            should_retry = stop_reason == "max_tokens" or "```" in (content or "")
            if should_retry:
                logger.warning(
                    "qualify_documents: parse failed (stop=%s, has_fence=%s), retry compact",
                    stop_reason,
                    "```" in (content or ""),
                )
                return await self._qualify_retry_compact(doc_texts, commercial_origin)
            raise

    async def _qualify_retry_compact(
        self,
        doc_texts: list[dict],
        commercial_origin: str = "relationship_momentum",
    ) -> dict:
        """Segunda pasada con menos campos para caber en max_tokens y sin fences."""
        origin_key = _normalize_commercial_origin(commercial_origin)
        commercial_rubric = _commercial_rubric_text(origin_key)

        _PRIORITY = {"administrativo": 0, "tecnico": 1, "anexo": 2}
        sorted_docs = sorted(doc_texts, key=lambda d: _PRIORITY.get(d["doc_type"], 9))
        per_doc_limit = max(6_000, 24_000 // max(len(sorted_docs), 1))
        documents_section = "\n\n".join(
            f"=== [{d['doc_type'].upper()}] {d['name']} ===\n{d['text'][:per_doc_limit]}"
            for d in sorted_docs
        )
        prompt = _QUALIFY_RETRY_PROMPT.format(
            documents=documents_section,
            commercial_rubric=commercial_rubric,
            origin_echo=origin_key,
        )
        logger.info("qualify_documents RETRY compact, prompt ~%d chars", len(prompt))

        result = await self._llm.complete(
            messages=[{"role": "user", "content": prompt}],
            system=SYSTEM_PROMPT,
            max_tokens=8192,
            temperature=0.0,
        )
        content = result["content"]
        if isinstance(content, list):
            content = " ".join(b.get("text", "") for b in content if isinstance(b, dict))
        return self._parse_qualify_response(content)

    @staticmethod
    def _strip_leading_markdown_fence(text: str) -> str:
        """Quita ``` o ```json inicial y ``` final si existe (respuesta truncada sin cierre)."""
        s = text.strip()
        if not s.startswith("```"):
            return s
        first_nl = s.find("\n")
        if first_nl == -1:
            return s
        rest = s[first_nl + 1 :]
        rest = rest.rstrip()
        if rest.endswith("```"):
            rest = rest[:-3].rstrip()
        return rest

    @staticmethod
    def _parse_qualify_response(text: str) -> dict:
        """
        Extrae JSON de la respuesta del LLM.

        - JSON plano
        - Cerca ``` cerrada
        - Cerca abierta sin cerrar (truncada): se quita cabecera ```json y se busca objeto por llaves
        """
        cleaned = CualificacionAgent._strip_leading_markdown_fence(text)
        cleaned = cleaned.strip()

        # 1. JSON plano
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            pass

        # 2. Bloque ``` ... ``` completo (regex no codiciosa con cierre)
        orig = text.strip()
        fence_closed = re.search(r"```(?:json)?\s*([\s\S]*)\s*```\s*$", orig)
        if fence_closed:
            inner = fence_closed.group(1).strip()
            try:
                return json.loads(inner)
            except json.JSONDecodeError:
                cleaned = inner

        # 3. Conteo de llaves desde la primera {{
        start = cleaned.find("{")
        if start != -1:
            depth = 0
            last_zero = -1
            for i, ch in enumerate(cleaned[start:], start=start):
                if ch == "{":
                    depth += 1
                elif ch == "}":
                    depth -= 1
                    if depth == 0:
                        last_zero = i
                        break

            if last_zero != -1:
                candidate = cleaned[start : last_zero + 1]
                try:
                    return json.loads(candidate)
                except json.JSONDecodeError as e:
                    logger.error("JSON parse error on brace-balanced candidate: %s", e)

        raise ValueError(
            f"No valid JSON found in LLM response. "
            f"First 400 chars: {text[:400]!r}"
        )
