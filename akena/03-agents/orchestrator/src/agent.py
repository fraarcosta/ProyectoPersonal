"""
OrchestratorAgent — core logic.
Discovers specialized agents, builds a routing prompt, and delegates.
"""
import json
import logging
import re
from typing import AsyncIterator

from shared.interfaces import AuthValidatorInterface, LLMProviderInterface, MemoryStoreInterface

from .discovery import AgentRegistry

logger = logging.getLogger(__name__)

ROUTING_SYSTEM = """
Eres el orquestador Akena, asistente experto en licitaciones públicas españolas y gestión de oportunidades de ventas en Accenture.

Agentes especializados disponibles:
{agent_cards}

REGLAS CRÍTICAS:
1. Si el mensaje contiene [CONTEXTO DE LA OPORTUNIDAD] con resumen del pliego, análisis o incoherencias,
   RESPONDE DIRECTAMENTE usando ese contexto. NO delegues a agent-pliego para preguntas informativas.
2. Solo delega a agentes especializados para TAREAS ACTIVAS que requieren procesar documentos nuevos
   (por ejemplo: "genera un nuevo análisis", "detecta incoherencias en este documento adjunto").
3. Para preguntas sobre requisitos, solvencia, criterios, plazos, presupuesto, equipo, riesgos, etc.,
   usa el contexto proporcionado para responder sin pedir que el usuario suba documentos de nuevo.
4. Si el contexto no contiene la información específica pedida, indícalo con claridad y brevedad.
5. Responde siempre en español.
6. Para delegar (solo tareas activas), responde ÚNICAMENTE con JSON válido:
   {{"delegate": "<agent_name>", "query": "<consulta_refinada>"}}
7. Para responder directamente, responde con texto plano (no JSON).
"""


class OrchestratorAgent:
    def __init__(
        self,
        llm: LLMProviderInterface,
        memory: MemoryStoreInterface,
        auth: AuthValidatorInterface,
        registry: AgentRegistry,
    ) -> None:
        self._llm = llm
        self._memory = memory
        self._auth = auth
        self._registry = registry

    @staticmethod
    def _extract_delegate_json(text: str) -> dict | None:
        """Extract the first JSON object containing 'delegate' from text.
        Handles cases where Claude wraps the JSON in explanatory prose or code fences.
        """
        # Try plain JSON first
        try:
            return json.loads(text.strip())
        except json.JSONDecodeError:
            pass
        # Extract JSON from code fences ```json ... ``` or ``` ... ```
        fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
        if fenced:
            try:
                return json.loads(fenced.group(1))
            except json.JSONDecodeError:
                pass
        # Find first { ... } block in free text
        brace = re.search(r"\{[^{}]*\"delegate\"[^{}]*\}", text, re.DOTALL)
        if brace:
            try:
                return json.loads(brace.group(0))
            except json.JSONDecodeError:
                pass
        return None

    def _build_system(self) -> str:
        cards = json.dumps(
            [card.to_dict() for card in self._registry.agents.values()],
            ensure_ascii=False,
            indent=2,
        )
        return ROUTING_SYSTEM.format(agent_cards=cards)

    async def run(self, user_message: str, session_id: str) -> tuple[str, str | None]:
        messages = self._memory.load(session_id)
        messages.append({"role": "user", "content": user_message})

        result = await self._llm.complete(
            messages=messages,
            system=self._build_system(),
        )

        content = result["content"]
        if isinstance(content, list):
            content = " ".join(b.get("text", "") for b in content if isinstance(b, dict))

        agent_used = None

        # Extract delegation JSON even when Claude adds surrounding text
        parsed = self._extract_delegate_json(content)
        if parsed and "delegate" in parsed:
            agent_name = parsed["delegate"]
            refined_query = parsed.get("query", user_message)
            # Pass full user message (including opportunity context) to the sub-agent
            # so it can answer with the pliego analysis already embedded
            if "[CONTEXTO DE LA OPORTUNIDAD]" in user_message:
                delegation_msg = f"{user_message}\n\n[INSTRUCCIÓN ORQUESTADOR]: {refined_query}"
            else:
                delegation_msg = refined_query
            logger.info("Delegating to agent: %s", agent_name)
            delegated = await self._registry.call_agent(agent_name, delegation_msg, session_id)
            content = delegated
            agent_used = agent_name

        messages.append({"role": "assistant", "content": content})
        self._memory.save(session_id, messages)
        return content, agent_used

    async def stream(self, user_message: str, session_id: str) -> AsyncIterator[str]:
        messages = self._memory.load(session_id)
        messages.append({"role": "user", "content": user_message})
        full_response = []

        async for chunk in self._llm.stream(messages=messages, system=self._build_system()):
            full_response.append(chunk)
            yield chunk

        messages.append({"role": "assistant", "content": "".join(full_response)})
        self._memory.save(session_id, messages)
