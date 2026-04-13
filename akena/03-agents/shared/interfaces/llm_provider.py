from abc import ABC, abstractmethod
from typing import AsyncIterator, Optional


class LLMProviderInterface(ABC):
    """
    LLM invocation abstraction.
    Implementations: AnthropicLLMProvider, OpenAILLMProvider, BedrockLLMProvider
    """

    @abstractmethod
    async def complete(
        self,
        messages: list[dict],
        system: Optional[str] = None,
        tools: Optional[list[dict]] = None,
        max_tokens: int = 4096,
        temperature: float = 0.0,
    ) -> dict:
        """
        Send messages and return the complete response.
        Returns: {"role": "assistant", "content": str | list, "stop_reason": str}
        """
        ...

    @abstractmethod
    async def stream(
        self,
        messages: list[dict],
        system: Optional[str] = None,
        tools: Optional[list[dict]] = None,
        max_tokens: int = 4096,
    ) -> AsyncIterator[str]:
        """Stream response tokens as an async iterator."""
        ...

    @property
    @abstractmethod
    def model_id(self) -> str:
        """Return the model identifier being used."""
        ...
