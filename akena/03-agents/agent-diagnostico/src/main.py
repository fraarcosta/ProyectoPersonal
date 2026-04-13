"""
Agent Diagnostico — FastAPI entry point.
Deep analysis: client needs, competitive landscape, risks.
"""
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from shared.factory import get_auth_validator, get_llm, get_memory_store, get_settings

from .agent import DiagnosticoAgent

settings = get_settings()
_agent: DiagnosticoAgent | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _agent
    _agent = DiagnosticoAgent(
        llm=get_llm(),
        memory=get_memory_store(),
        auth=get_auth_validator(),
    )
    yield


app = FastAPI(
    title="Akena — Agent Diagnostico",
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
        "name": "agent-diagnostico",
        "version": settings.agent_version,
        "type": "specialized",
        "description": "Deep analysis of opportunities: needs, competition, risks.",
        "skills": [
            {"id": "diagnose_opportunity", "name": "Opportunity Diagnosis",
             "description": "Comprehensive opportunity diagnosis."},
            {"id": "analyze_competition", "name": "Competitive Analysis",
             "description": "Identify competitors and differentiation strategy."},
            {"id": "assess_risks", "name": "Risk Assessment",
             "description": "Delivery, commercial, and strategic risks."},
            {"id": "extract_requirements", "name": "Requirements Extraction",
             "description": "Extract requirements from RFPs and client conversations."},
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
