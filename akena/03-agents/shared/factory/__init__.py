"""
Factory functions — the ONLY place that imports cloud SDKs.
Agent code calls get_X() and receives an interface; it never imports boto3,
google.cloud, or any cloud-specific library directly.

All functions are lazy singletons: the adapter is created once on first call
and cached for the lifetime of the process.
"""
from __future__ import annotations

from functools import lru_cache
from typing import TYPE_CHECKING

from .settings import SharedSettings

if TYPE_CHECKING:
    from shared.interfaces import (
        AuthValidatorInterface,
        GuardrailInterface,
        LLMProviderInterface,
        MemoryStoreInterface,
    )


@lru_cache(maxsize=1)
def get_settings() -> SharedSettings:
    """Singleton Pydantic settings — reads env vars once."""
    return SharedSettings()


# ── Auth ──────────────────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def get_auth_validator() -> "AuthValidatorInterface":
    """
    Returns the configured AuthValidatorInterface.
    Controlled by AUTH_VALIDATOR_TYPE env var (from capabilities.yaml).
    """
    s = get_settings()

    if s.auth_validator_type == "none":
        from shared.adapters.auth.none import NoAuthValidator
        return NoAuthValidator()

    if s.auth_validator_type == "cognito":
        from shared.adapters.auth.cognito import CognitoJWTValidator  # type: ignore[import]
        return CognitoJWTValidator(
            user_pool_id=s.cognito_user_pool_id,
            client_id=s.cognito_client_id,
            region=s.cognito_region,
        )

    if s.auth_validator_type == "identity_platform":
        from shared.adapters.auth.identity_platform import IdentityPlatformValidator  # type: ignore[import]
        return IdentityPlatformValidator(project_id=s.gcp_project_id)

    raise ValueError(f"Unknown auth_validator_type: {s.auth_validator_type}")


# ── Memory ────────────────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def get_memory_store() -> "MemoryStoreInterface":
    """
    Returns the configured MemoryStoreInterface.
    Controlled by MEMORY_STORE_TYPE env var (from capabilities.yaml).
    """
    s = get_settings()

    if s.memory_store_type == "local":
        from shared.adapters.memory_store.local import LocalMemoryStore
        return LocalMemoryStore(base_path=s.memory_local_path)

    if s.memory_store_type == "dynamodb":
        from shared.adapters.memory_store.dynamodb import DynamoDBMemoryStore  # type: ignore[import]
        return DynamoDBMemoryStore(
            table_name=s.dynamodb_conversations_table,
            region=s.dynamodb_region,
        )

    if s.memory_store_type == "firestore":
        from shared.adapters.memory_store.firestore import FirestoreMemoryStore  # type: ignore[import]
        return FirestoreMemoryStore(
            collection=s.firestore_collection,
            project_id=s.firestore_project_id,
        )

    if s.memory_store_type == "none":
        from shared.adapters.memory_store.noop import NoopMemoryStore  # type: ignore[import]
        return NoopMemoryStore()

    raise ValueError(f"Unknown memory_store_type: {s.memory_store_type}")


# ── LLM ───────────────────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def get_llm() -> "LLMProviderInterface":
    """
    Returns the configured LLMProviderInterface.
    Controlled by LLM_PROVIDER_TYPE env var (from capabilities.yaml).
    """
    s = get_settings()

    if s.llm_provider_type == "anthropic":
        from shared.adapters.llm.anthropic import AnthropicLLMProvider
        if not s.anthropic_api_key:
            raise EnvironmentError("ANTHROPIC_API_KEY is required for llm: anthropic")
        return AnthropicLLMProvider(
            api_key=s.anthropic_api_key,
            model=s.anthropic_model,
        )

    if s.llm_provider_type == "openai":
        from shared.adapters.llm.openai import OpenAILLMProvider  # type: ignore[import]
        return OpenAILLMProvider(
            api_key=s.openai_api_key,
            model=s.openai_model,
        )

    if s.llm_provider_type == "bedrock":
        from shared.adapters.llm.bedrock import BedrockLLMProvider  # type: ignore[import]
        return BedrockLLMProvider(
            model_id=s.bedrock_model_id,
            region=s.bedrock_region,
        )

    if s.llm_provider_type == "vertex_ai":
        from shared.adapters.llm.vertex_ai import VertexAILLMProvider  # type: ignore[import]
        return VertexAILLMProvider(
            model_id=s.vertex_model_id,
            project_id=s.vertex_project_id,
            location=s.vertex_location,
        )

    raise ValueError(f"Unknown llm_provider_type: {s.llm_provider_type}")


# ── Guardrail ─────────────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def get_guardrail() -> "GuardrailInterface":
    """
    Returns the configured GuardrailInterface.
    Controlled by GUARDRAIL_TYPE env var (from capabilities.yaml).
    """
    s = get_settings()

    if s.guardrail_type == "none":
        from shared.adapters.guardrail.noop import NoopGuardrail  # type: ignore[import]
        return NoopGuardrail()

    raise ValueError(f"Unknown guardrail_type: {s.guardrail_type}")
