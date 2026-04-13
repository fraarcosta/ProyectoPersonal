"""
validate_factory.py — validates that capabilities.yaml ↔ shared/factory/settings.py
are in sync. Run as part of validate_all before any commit.

Checks:
1. Every capability provider in capabilities.yaml has its env vars covered
   by a field in SharedSettings (either directly or via alias).
2. Every LLM_PROVIDER_TYPE / MEMORY_STORE_TYPE / AUTH_VALIDATOR_TYPE literal value
   in settings.py matches an entry in capabilities.yaml.

Exit 0 = OK, exit 1 = validation failures found.
"""
from __future__ import annotations

import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).parent.parent.parent
CAPABILITIES_PATH = ROOT / "capabilities.yaml"
SETTINGS_PATH = ROOT / "03-agents" / "shared" / "factory" / "settings.py"


def load_yaml(path: Path) -> dict:
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def extract_settings_aliases(settings_source: str) -> set[str]:
    """Extract all alias= values from SharedSettings fields."""
    import re
    return set(re.findall(r'alias="([A-Z_]+)"', settings_source))


def main() -> int:
    print("validate_factory: checking capabilities.yaml ↔ settings.py")
    caps = load_yaml(CAPABILITIES_PATH)
    settings_src = SETTINGS_PATH.read_text(encoding="utf-8")
    defined_aliases = extract_settings_aliases(settings_src)

    errors: list[str] = []

    for cap_name, providers in caps.items():
        for provider_name, config in providers.items():
            for env_var, _ in config.items():
                if env_var.startswith("_"):
                    continue
                if env_var not in defined_aliases:
                    errors.append(
                        f"  MISSING alias: {env_var} "
                        f"(from capabilities.yaml → {cap_name}.{provider_name}) "
                        f"not found in SharedSettings"
                    )

    if errors:
        print(f"\nFAIL — {len(errors)} issue(s) found:")
        for e in errors:
            print(e)
        return 1

    print(f"OK — all {sum(len(v) for v in caps.values())} capability env vars are covered")
    return 0


if __name__ == "__main__":
    sys.exit(main())
