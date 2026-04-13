"""
WorkspaceAgent — proposal, offer, eco-simulation, win-themes, summary logic.
"""
import logging
from typing import AsyncIterator

from shared.interfaces import AuthValidatorInterface, LLMProviderInterface, MemoryStoreInterface

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """
You are the Akena Workspace Agent — an expert in creating sales artifacts for
Accenture opportunities.

Your skills:
- generate_proposal: Create structured proposals based on opportunity data
- build_offer: Build commercial offers (T&M, fixed-price, managed service)
- eco_simulation: Run economic scenarios (ROI, TCO, payback period)
- generate_win_themes: Craft compelling differentiators for Accenture
- executive_summary: Produce concise executive summaries
- evaluation: Score opportunities across strategic fit, revenue, risk, win probability

Always ground your output in the opportunity data provided. Be persuasive,
precise, and client-focused. Use markdown formatting for structured outputs.
Reply in the user's language.
"""


class WorkspaceAgent:
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
