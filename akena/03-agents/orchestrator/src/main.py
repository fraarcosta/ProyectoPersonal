"""
Orchestrator — FastAPI entry point.
Receives user messages, discovers specialized agents, and routes via A2A.
"""
import asyncio
import logging
import uuid
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from shared.factory import get_auth_validator, get_llm, get_memory_store, get_settings

from .agent import OrchestratorAgent
from .discovery import AgentRegistry

logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    registry = AgentRegistry(namespace=settings.k8s_namespace if hasattr(settings, "k8s_namespace") else "akena-dev")
    await registry.start()
    app.state.registry = registry
    app.state.agent = OrchestratorAgent(
        llm=get_llm(),
        memory=get_memory_store(),
        auth=get_auth_validator(),
        registry=registry,
    )
    logger.info("Orchestrator started — model: %s", get_llm().model_id)
    yield
    await registry.stop()


app = FastAPI(
    title="Akena Orchestrator",
    version=settings.agent_version,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response schemas ────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    session_id: str = ""
    stream: bool = False


class ChatResponse(BaseModel):
    session_id: str
    response: str
    agent_used: str | None = None


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "agent": settings.agent_name, "version": settings.agent_version}


@app.get("/.well-known/agent-card.json")
async def agent_card():
    """A2A protocol: exposes agent capabilities to other agents."""
    registry: AgentRegistry = app.state.registry
    return {
        "name": settings.agent_name,
        "version": settings.agent_version,
        "type": "orchestrator",
        "description": "Akena main orchestrator — routes to specialized agents",
        "skills": [
            {"id": "route", "name": "Request Routing", "description": "Routes user requests to the best specialized agent"}
        ],
        "discovered_agents": len(registry.agents),
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    session_id = req.session_id or str(uuid.uuid4())
    agent: OrchestratorAgent = app.state.agent

    if req.stream:
        async def event_stream():
            async for chunk in agent.stream(req.message, session_id):
                yield f"data: {chunk}\n\n"
        return StreamingResponse(event_stream(), media_type="text/event-stream")

    response, agent_used = await agent.run(req.message, session_id)
    return ChatResponse(session_id=session_id, response=response, agent_used=agent_used)
