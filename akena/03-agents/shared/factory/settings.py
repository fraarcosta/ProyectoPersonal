"""
Pydantic Settings — reads ConfigMap env vars injected into the pod.
The factory functions in __init__.py call these settings to know which
adapter to instantiate. Never read os.environ directly in agent code.
"""
from typing import Literal, Optional

from pydantic import Field
from pydantic_settings import BaseSettings


class SharedSettings(BaseSettings):
    """All env vars that the shared factory layer can consume."""

    # ── Auth ──────────────────────────────────────────────────────────────────
    auth_validator_type: Literal["none", "cognito", "identity_platform"] = Field(
        default="none", alias="AUTH_VALIDATOR_TYPE"
    )
    cognito_user_pool_id: Optional[str] = Field(default=None, alias="COGNITO_USER_POOL_ID")
    cognito_client_id: Optional[str] = Field(default=None, alias="COGNITO_CLIENT_ID")
    cognito_region: Optional[str] = Field(default=None, alias="COGNITO_REGION")

    # ── Memory ────────────────────────────────────────────────────────────────
    memory_store_type: Literal["none", "local", "dynamodb", "firestore"] = Field(
        default="local", alias="MEMORY_STORE_TYPE"
    )
    memory_local_path: str = Field(default="./.memory", alias="MEMORY_LOCAL_PATH")
    dynamodb_conversations_table: Optional[str] = Field(
        default=None, alias="DYNAMODB_CONVERSATIONS_TABLE"
    )
    dynamodb_region: Optional[str] = Field(default=None, alias="DYNAMODB_REGION")
    firestore_collection: str = Field(default="conversations", alias="FIRESTORE_COLLECTION")
    firestore_project_id: Optional[str] = Field(default=None, alias="FIRESTORE_PROJECT_ID")

    # ── LLM ───────────────────────────────────────────────────────────────────
    llm_provider_type: Literal["anthropic", "openai", "bedrock", "vertex_ai"] = Field(
        default="anthropic", alias="LLM_PROVIDER_TYPE"
    )
    anthropic_api_key: Optional[str] = Field(default=None, alias="ANTHROPIC_API_KEY")
    anthropic_model: str = Field(
        default="claude-haiku-4-5-20251001", alias="ANTHROPIC_MODEL"
    )
    openai_api_key: Optional[str] = Field(default=None, alias="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-4o-mini", alias="OPENAI_MODEL")
    bedrock_model_id: Optional[str] = Field(default=None, alias="BEDROCK_MODEL_ID")
    bedrock_region: Optional[str] = Field(default=None, alias="BEDROCK_REGION")
    vertex_model_id: str = Field(default="gemini-2.0-flash", alias="VERTEX_MODEL_ID")
    vertex_project_id: Optional[str] = Field(default=None, alias="VERTEX_PROJECT_ID")
    vertex_location: Optional[str] = Field(default=None, alias="VERTEX_LOCATION")

    # ── Guardrail ─────────────────────────────────────────────────────────────
    guardrail_type: Literal["none", "bedrock", "model_armor"] = Field(
        default="none", alias="GUARDRAIL_TYPE"
    )

    # ── MCP Client ────────────────────────────────────────────────────────────
    mcp_client_type: Literal["http"] = Field(default="http", alias="MCP_CLIENT_TYPE")
    mcp_servers: str = Field(default="", alias="MCP_SERVERS")
    mcp_service_skills: str = Field(default="", alias="MCP_SERVICE_SKILLS")

    # ── Agent Identity ────────────────────────────────────────────────────────
    agent_name: str = Field(default="agent", alias="AGENT_NAME")
    agent_version: str = Field(default="0.1.0", alias="AGENT_VERSION")
    port: int = Field(default=8080, alias="PORT")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"
