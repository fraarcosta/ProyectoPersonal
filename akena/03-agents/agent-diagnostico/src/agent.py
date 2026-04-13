"""
DiagnosticoAgent — deep opportunity analysis logic.
"""
import logging
from typing import AsyncIterator

from shared.interfaces import AuthValidatorInterface, LLMProviderInterface, MemoryStoreInterface

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """
You are the Akena Diagnosis Agent — an expert in deep opportunity analysis.
You analyze qualified sales opportunities at Accenture to uncover:
- Client pain points and strategic needs
- Technical requirements and constraints
- Competitive landscape and Accenture's positioning
- Delivery risks and mitigation strategies

Your skills:
- diagnose_opportunity: Comprehensive opportunity diagnosis
- analyze_competition: Competitor identification and differentiation
- assess_risks: Risk identification with mitigation strategies
- extract_requirements: Structured requirements from documents/conversations

Be thorough, structured, and evidence-based. Always cite sources when analyzing
documents. Reply in the user's language.
"""


class DiagnosticoAgent:
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

        result = await self._llm.complete(messages=messages, system=SYSTEM_PROMPT)

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
