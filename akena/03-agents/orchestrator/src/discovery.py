"""
AgentRegistry — discovers specialized agents.

In production: watches Kubernetes Services with label agentic.io/agent-type=specialized.
In local dev: reads AGENT_REGISTRY env var (comma-separated name=url pairs)
              or auto-discovers via localhost ports.
"""
import asyncio
import logging
import os
from dataclasses import dataclass, field

import httpx

logger = logging.getLogger(__name__)


@dataclass
class AgentCard:
    name: str
    url: str
    description: str = ""
    skills: list[dict] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "url": self.url,
            "description": self.description,
            "skills": self.skills,
        }


class AgentRegistry:
    """
    Manages the live catalog of specialized agents.
    Local dev: reads AGENT_REGISTRY=agent-cualificacion=http://localhost:8081,...
    Production: K8s Service watcher (kubernetes-asyncio).
    """

    def __init__(self, namespace: str = "akena-dev") -> None:
        self._namespace = namespace
        self.agents: dict[str, AgentCard] = {}
        self._client = httpx.AsyncClient(timeout=5.0)
        self._refresh_task: asyncio.Task | None = None

    async def start(self) -> None:
        await self._load_from_env()
        self._refresh_task = asyncio.create_task(self._periodic_refresh())

    async def stop(self) -> None:
        if self._refresh_task:
            self._refresh_task.cancel()
        await self._client.aclose()

    async def _load_from_env(self) -> None:
        registry_str = os.getenv("AGENT_REGISTRY", "")
        for entry in registry_str.split(","):
            entry = entry.strip()
            if "=" not in entry:
                continue
            name, url = entry.split("=", 1)
            await self._register(name.strip(), url.strip())

    async def _register(self, name: str, url: str) -> None:
        try:
            resp = await self._client.get(f"{url}/.well-known/agent-card.json")
            card_data = resp.json()
            self.agents[name] = AgentCard(
                name=name,
                url=url,
                description=card_data.get("description", ""),
                skills=card_data.get("skills", []),
            )
            logger.info("Registered agent: %s @ %s", name, url)
        except Exception as exc:
            logger.warning("Could not reach agent %s @ %s: %s", name, url, exc)

    async def _periodic_refresh(self) -> None:
        while True:
            await asyncio.sleep(30)
            await self._load_from_env()

    async def call_agent(self, agent_name: str, query: str, session_id: str) -> str:
        card = self.agents.get(agent_name)
        if not card:
            return f"[Orchestrator] Agent '{agent_name}' not found in registry."

        try:
            resp = await self._client.post(
                f"{card.url}/chat",
                json={"message": query, "session_id": session_id},
                timeout=60.0,
            )
            data = resp.json()
            return data.get("response", "")
        except Exception as exc:
            logger.error("Error calling agent %s: %s", agent_name, exc)
            return f"[Orchestrator] Error calling {agent_name}: {exc}"
