"""
create_agent.py — interactive scaffolding for new Akena agents.
Windows-compatible equivalent of create-agent.sh.

Usage:
    python 00-platform-tooling/cli/create_agent.py

Generates:
    03-agents/<agent-name>/
        agent.yaml
        requirements.txt
        src/__init__.py
        src/main.py
        src/agent.py
        k8s/  (placeholder)
"""
from __future__ import annotations

import shutil
import textwrap
from pathlib import Path

ROOT = Path(__file__).parent.parent.parent
AGENTS_DIR = ROOT / "03-agents"

PORTS = {
    "orchestrator": 8080,
    "specialized": 8081,
}


def ask(prompt: str, default: str = "") -> str:
    suffix = f" [{default}]" if default else ""
    value = input(f"{prompt}{suffix}: ").strip()
    return value or default


def main() -> None:
    print("\n" + "=" * 55)
    print("  Akena — Create New Agent")
    print("=" * 55 + "\n")

    name = ask("Agent name (e.g. agent-marketing-intel)").lower().replace(" ", "-")
    if not name:
        print("ERROR: name is required")
        return

    agent_type = ask("Type [orchestrator/specialized]", default="specialized")
    description = ask("Short description", default=f"{name} specialized agent")
    llm = ask("LLM provider [anthropic/openai/bedrock/vertex_ai]", default="anthropic")
    memory = ask("Memory store [local/dynamodb/firestore/none]", default="local")
    auth = ask("Auth validator [none/cognito/identity_platform]", default="none")
    port_default = str(PORTS.get(agent_type, 8081))
    port = ask("Port", default=port_default)

    agent_dir = AGENTS_DIR / name
    if agent_dir.exists():
        print(f"\nERROR: {agent_dir} already exists")
        return

    src_dir = agent_dir / "src"
    src_dir.mkdir(parents=True)
    (agent_dir / "k8s").mkdir()

    # agent.yaml
    (agent_dir / "agent.yaml").write_text(textwrap.dedent(f"""\
        name: {name}
        version: "0.1.0"
        type: {agent_type}
        description: >
          {description}

        capabilities:
          auth: {auth}
          memory: {memory}
          llm: {llm}
          guardrail: none
          knowledge_base: none
          mcp_client: http

        services: {{}}

        skills: []

        system_prompt: |
          You are the {name} agent for Akena.
          Describe your role and capabilities here.

        deploy:
          replicas: 1
          port: {port}
          resources:
            cpu: "500m"
            memory: "512Mi"
          k8s_labels:
            agentic.io/agent-type: {agent_type}
            agentic.io/agent-name: {name}
            app: akena-{name}
    """), encoding="utf-8")

    # requirements.txt
    (agent_dir / "requirements.txt").write_text(
        "fastapi>=0.115.0\nuvicorn[standard]>=0.34.0\n"
        "pydantic>=2.10.0\npydantic-settings>=2.7.0\nanthropic>=0.40.0\n",
        encoding="utf-8",
    )

    # src/__init__.py
    (src_dir / "__init__.py").write_text("", encoding="utf-8")

    # src/agent.py
    class_name = "".join(w.capitalize() for w in name.replace("agent-", "").split("-")) + "Agent"
    (src_dir / "agent.py").write_text(textwrap.dedent(f"""\
        \"\"\"
        {class_name} — core logic.
        \"\"\"
        import logging
        from typing import AsyncIterator

        from shared.interfaces import AuthValidatorInterface, LLMProviderInterface, MemoryStoreInterface

        logger = logging.getLogger(__name__)

        SYSTEM_PROMPT = \"\"\"
        You are the {name} agent for Akena.
        Add your system prompt here.
        \"\"\"


        class {class_name}:
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
                messages.append({{\"role\": \"user\", \"content\": user_message}})
                result = await self._llm.complete(messages=messages, system=SYSTEM_PROMPT)
                content = result[\"content\"]
                if isinstance(content, list):
                    content = \" \".join(b.get(\"text\", \"\") for b in content if isinstance(b, dict))
                messages.append({{\"role\": \"assistant\", \"content\": content}})
                self._memory.save(session_id, messages)
                return content

            async def stream(self, user_message: str, session_id: str) -> AsyncIterator[str]:
                messages = self._memory.load(session_id)
                messages.append({{\"role\": \"user\", \"content\": user_message}})
                full_response = []
                async for chunk in self._llm.stream(messages=messages, system=SYSTEM_PROMPT):
                    full_response.append(chunk)
                    yield chunk
                messages.append({{\"role\": \"assistant\", \"content\": \"\".join(full_response)}})
                self._memory.save(session_id, messages)
    """), encoding="utf-8")

    # src/main.py
    (src_dir / "main.py").write_text(textwrap.dedent(f"""\
        \"\"\"
        {name} — FastAPI entry point.
        \"\"\"
        import uuid
        from contextlib import asynccontextmanager

        from fastapi import FastAPI
        from fastapi.middleware.cors import CORSMiddleware
        from fastapi.responses import StreamingResponse
        from pydantic import BaseModel

        from shared.factory import get_auth_validator, get_llm, get_memory_store, get_settings
        from .agent import {class_name}

        settings = get_settings()
        _agent: {class_name} | None = None


        @asynccontextmanager
        async def lifespan(app: FastAPI):
            global _agent
            _agent = {class_name}(llm=get_llm(), memory=get_memory_store(), auth=get_auth_validator())
            yield


        app = FastAPI(title="Akena — {name}", version=settings.agent_version, lifespan=lifespan)
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
            return {{"status": "ok", "agent": settings.agent_name, "version": settings.agent_version}}


        @app.get("/.well-known/agent-card.json")
        async def agent_card():
            return {{
                "name": "{name}",
                "version": settings.agent_version,
                "type": "{agent_type}",
                "description": "{description}",
                "skills": [],
            }}


        @app.post("/chat", response_model=ChatResponse)
        async def chat(req: ChatRequest):
            session_id = req.session_id or str(uuid.uuid4())
            if req.stream:
                async def event_stream():
                    async for chunk in _agent.stream(req.message, session_id):
                        yield f"data: {{chunk}}\\n\\n"
                return StreamingResponse(event_stream(), media_type="text/event-stream")
            response = await _agent.run(req.message, session_id)
            return ChatResponse(session_id=session_id, response=response)
    """), encoding="utf-8")

    print(f"\nAgent '{name}' created at {agent_dir}")
    print("\nNext steps:")
    print(f"  1. Edit {agent_dir / 'agent.yaml'} — add skills and system_prompt")
    print(f"  2. Run: python 00-platform-tooling/generate_config.py --agent 03-agents/{name}")
    print(f"  3. Install deps: pip install -r {agent_dir / 'requirements.txt'}")
    print(f"  4. Start: uvicorn {name.replace('-', '_')}.src.main:app --port {port} --reload")


if __name__ == "__main__":
    main()
