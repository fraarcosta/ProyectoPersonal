from abc import ABC, abstractmethod
from typing import Optional


class MemoryStoreInterface(ABC):
    """
    Conversation memory persistence.
    Implementations: LocalMemoryStore, DynamoDBMemoryStore, FirestoreMemoryStore
    """

    @abstractmethod
    def save(self, session_id: str, messages: list[dict]) -> None:
        """Persist conversation messages for a session."""
        ...

    @abstractmethod
    def load(self, session_id: str) -> list[dict]:
        """Load conversation messages for a session. Returns [] if not found."""
        ...

    @abstractmethod
    def delete(self, session_id: str) -> None:
        """Delete conversation history for a session."""
        ...

    @abstractmethod
    def list_sessions(self, user_id: str) -> list[str]:
        """List all session IDs for a given user."""
        ...
