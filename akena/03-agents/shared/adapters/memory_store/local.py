import json
import os
from pathlib import Path

from shared.interfaces import MemoryStoreInterface


class LocalMemoryStore(MemoryStoreInterface):
    """
    Dev-only memory store backed by JSON files on disk.
    Not suitable for production — use DynamoDB or Firestore adapter instead.

    File layout: {base_path}/{user_id}/{session_id}.json
    """

    def __init__(self, base_path: str = "./.memory") -> None:
        self._base = Path(base_path)
        self._base.mkdir(parents=True, exist_ok=True)

    def _path(self, session_id: str) -> Path:
        # session_id format: "{user_id}:{session_uuid}"
        parts = session_id.split(":", 1)
        if len(parts) == 2:
            user_dir = self._base / parts[0]
            user_dir.mkdir(parents=True, exist_ok=True)
            return user_dir / f"{parts[1]}.json"
        return self._base / f"{session_id}.json"

    def save(self, session_id: str, messages: list[dict]) -> None:
        path = self._path(session_id)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(messages, f, ensure_ascii=False, indent=2)

    def load(self, session_id: str) -> list[dict]:
        path = self._path(session_id)
        if not path.exists():
            return []
        with open(path, encoding="utf-8") as f:
            return json.load(f)

    def delete(self, session_id: str) -> None:
        path = self._path(session_id)
        if path.exists():
            path.unlink()

    def list_sessions(self, user_id: str) -> list[str]:
        user_dir = self._base / user_id
        if not user_dir.exists():
            return []
        return [
            f"{user_id}:{p.stem}"
            for p in user_dir.iterdir()
            if p.suffix == ".json"
        ]
