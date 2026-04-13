from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class GuardrailResult:
    passed: bool
    action: str          # "NONE" | "BLOCKED" | "ANONYMIZED"
    reason: Optional[str] = None


class GuardrailInterface(ABC):
    """
    Content safety guardrails.
    Implementations: NoGuardrail, BedrockGuardrail, ModelArmorGuardrail
    """

    @abstractmethod
    async def check_input(self, text: str, session_id: str) -> GuardrailResult:
        """Check user input before sending to LLM."""
        ...

    @abstractmethod
    async def check_output(self, text: str, session_id: str) -> GuardrailResult:
        """Check LLM output before returning to user."""
        ...
