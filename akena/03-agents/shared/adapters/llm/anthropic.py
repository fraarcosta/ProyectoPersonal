from typing import AsyncIterator, Optional

import anthropic

from shared.interfaces import LLMProviderInterface


class AnthropicLLMProvider(LLMProviderInterface):
    """
    LLM adapter for Anthropic Claude.
    Reads ANTHROPIC_API_KEY and ANTHROPIC_MODEL from the environment
    via shared/factory/settings.py — never hardcoded here.
    """

    def __init__(self, api_key: str, model: str) -> None:
        self._client = anthropic.AsyncAnthropic(api_key=api_key)
        self._model = model

    @property
    def model_id(self) -> str:
        return self._model

    async def complete(
        self,
        messages: list[dict],
        system: Optional[str] = None,
        tools: Optional[list[dict]] = None,
        max_tokens: int = 4096,
        temperature: float = 0.0,
    ) -> dict:
        kwargs: dict = {
            "model": self._model,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": messages,
        }
        if system:
            kwargs["system"] = system
        if tools:
            kwargs["tools"] = tools

        response = await self._client.messages.create(**kwargs)

        content = response.content
        text_blocks = [b.text for b in content if hasattr(b, "text")]
        tool_uses = [
            {"name": b.name, "input": b.input, "id": b.id}
            for b in content
            if b.type == "tool_use"
        ]

        return {
            "role": "assistant",
            "content": text_blocks[0] if text_blocks and not tool_uses else content,
            "tool_uses": tool_uses,
            "stop_reason": response.stop_reason,
            "usage": {
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
            },
        }

    async def stream(
        self,
        messages: list[dict],
        system: Optional[str] = None,
        tools: Optional[list[dict]] = None,
        max_tokens: int = 4096,
    ) -> AsyncIterator[str]:
        kwargs: dict = {
            "model": self._model,
            "max_tokens": max_tokens,
            "messages": messages,
        }
        if system:
            kwargs["system"] = system
        if tools:
            kwargs["tools"] = tools

        async with self._client.messages.stream(**kwargs) as stream:
            async for text in stream.text_stream:
                yield text
