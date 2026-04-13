"""
Agent Workspace — FastAPI entry point.
Proposal generation, economic simulation, win-themes, offers, summaries.
"""
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from shared.factory import get_auth_validator, get_llm, get_memory_store, get_settings

from .agent import WorkspaceAgent

settings = get_settings()
_agent: WorkspaceAgent | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _agent
    _agent = WorkspaceAgent(
        llm=get_llm(),
        memory=get_memory_store(),
        auth=get_auth_validator(),
    )
    yield


app = FastAPI(
    title="Akena — Agent Workspace",
    version=settings.agent_version,
    lifespan=lifespan,
)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class ChatRequest(BaseModel):
    message: str
    session_id: str = ""
    stream: bool = False


class ChatResponse(BaseModel):
    session_id: str
    response: str


@app.get("/health")
async def health():
    return {"status": "ok", "agent": settings.agent_name, "version": settings.agent_version}


@app.get("/.well-known/agent-card.json")
async def agent_card():
    return {
        "name": "agent-workspace",
        "version": settings.agent_version,
        "type": "specialized",
        "description": "Proposal generation, economic simulation, win-themes, offers.",
        "skills": [
            {"id": "generate_proposal", "name": "Proposal Generation",
             "description": "Generate structured proposals."},
            {"id": "build_offer", "name": "Offer Builder",
             "description": "Build commercial offers with pricing and scope."},
            {"id": "eco_simulation", "name": "Economic Simulation",
             "description": "ROI, TCO, and payback period simulations."},
            {"id": "generate_win_themes", "name": "Win-Themes Generator",
             "description": "Compelling differentiators for Accenture offers."},
            {"id": "executive_summary", "name": "Executive Summary",
             "description": "Concise executive summaries of opportunities."},
            {"id": "evaluation", "name": "Opportunity Evaluation",
             "description": "Multi-dimensional scoring of opportunities."},
        ],
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    session_id = req.session_id or str(uuid.uuid4())

    if req.stream:
        async def event_stream():
            async for chunk in _agent.stream(req.message, session_id):
                yield f"data: {chunk}\n\n"
        return StreamingResponse(event_stream(), media_type="text/event-stream")

    response = await _agent.run(req.message, session_id)
    return ChatResponse(session_id=session_id, response=response)
