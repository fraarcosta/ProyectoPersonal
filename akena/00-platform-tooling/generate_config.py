"""
generate_config.py — Layer 5 pipeline: agent.yaml → config.env

Usage:
    python 00-platform-tooling/generate_config.py \
        --agent 03-agents/orchestrator \
        --manifest 01-infrastructure/manifests/dev-local.json \
        --out 03-agents/orchestrator/config.env

The generated config.env is loaded by each agent's Pydantic Settings (settings.py).
In Kubernetes this maps to a ConfigMap — never commit config.env to git for prod.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import yaml


ROOT = Path(__file__).parent.parent


def load_yaml(path: Path) -> dict:
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def load_json(path: Path) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def resolve_capabilities(
    agent_capabilities: dict,
    capabilities_catalog: dict,
    manifest: dict,
) -> dict[str, str]:
    """Resolve capability declarations to concrete env vars."""
    env: dict[str, str] = {}

    for cap_name, provider in agent_capabilities.items():
        if cap_name not in capabilities_catalog:
            print(f"  [WARN] Unknown capability '{cap_name}' — skipping", file=sys.stderr)
            continue

        providers = capabilities_catalog[cap_name]
        if provider not in providers:
            print(f"  [WARN] Unknown provider '{provider}' for capability '{cap_name}' — skipping", file=sys.stderr)
            continue

        cap_config = providers[provider]
        for env_var, manifest_key_or_default in cap_config.items():
            if env_var.startswith("_"):
                continue  # skip metadata keys like _required

            # If the value looks like a manifest key, resolve from manifest
            if isinstance(manifest_key_or_default, str) and manifest_key_or_default in manifest:
                env[env_var] = str(manifest[manifest_key_or_default])
            else:
                env[env_var] = str(manifest_key_or_default) if manifest_key_or_default else ""

    return env


def resolve_services(
    agent_services: dict,
    services_catalog: dict,
    manifest: dict,
) -> dict[str, str]:
    """Resolve service declarations to MCP_SERVERS and MCP_SERVICE_SKILLS env vars."""
    mcp_servers: list[str] = []
    service_skills: list[str] = []

    for service_name, provider in agent_services.items():
        if service_name not in services_catalog:
            print(f"  [WARN] Unknown service '{service_name}' — skipping", file=sys.stderr)
            continue

        providers = services_catalog[service_name]
        if provider not in providers:
            print(f"  [WARN] Unknown provider '{provider}' for service '{service_name}' — skipping", file=sys.stderr)
            continue

        svc_config = providers[provider]
        server_name = svc_config.get("mcp_server", f"mcp-server-{service_name}")
        namespace = manifest.get("NAMESPACE", "akena-dev")

        # Build K8s DNS URL (works locally if /etc/hosts or port-forwarded)
        server_url = f"http://{server_name}.{namespace}.svc.cluster.local/mcp/{server_name}"
        mcp_servers.append(f"{server_name}={server_url}")

        # Collect skills
        skills = svc_config.get("skills", [])
        if skills:
            service_skills.append(f"{service_name}:{','.join(skills)}")

        # Propagate commodity env vars (e.g. EXTRACTION_PROVIDER)
    env: dict[str, str] = {}
    if mcp_servers:
        env["MCP_SERVERS"] = ",".join(mcp_servers)
    if service_skills:
        env["MCP_SERVICE_SKILLS"] = ";".join(service_skills)
    return env


def generate_config(agent_dir: Path, manifest_path: Path, out_path: Path) -> None:
    agent_yaml_path = agent_dir / "agent.yaml"
    if not agent_yaml_path.exists():
        print(f"ERROR: agent.yaml not found at {agent_yaml_path}", file=sys.stderr)
        sys.exit(1)

    agent = load_yaml(agent_yaml_path)
    manifest = load_json(manifest_path)
    capabilities_catalog = load_yaml(ROOT / "capabilities.yaml")
    services_catalog = load_yaml(ROOT / "services.yaml")

    env: dict[str, str] = {}

    # Agent identity
    env["AGENT_NAME"] = agent.get("name", agent_dir.name)
    env["AGENT_VERSION"] = agent.get("version", "0.1.0")
    env["PORT"] = str(agent.get("deploy", {}).get("port", 8080))

    # Capabilities
    caps = agent.get("capabilities", {})
    env.update(resolve_capabilities(caps, capabilities_catalog, manifest))

    # Services
    svcs = agent.get("services", {})
    if svcs:
        env.update(resolve_services(svcs, services_catalog, manifest))

    # Write config.env
    out_path.parent.mkdir(parents=True, exist_ok=True)
    lines = [f'{k}="{v}"' for k, v in sorted(env.items())]
    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"Generated: {out_path}")
    for line in lines:
        print(f"  {line}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate agent config.env from agent.yaml")
    parser.add_argument("--agent", required=True, help="Path to agent directory (containing agent.yaml)")
    parser.add_argument("--manifest", default="01-infrastructure/manifests/dev-local.json",
                        help="Path to manifest JSON")
    parser.add_argument("--out", default=None, help="Output path for config.env (default: <agent>/config.env)")
    args = parser.parse_args()

    agent_dir = Path(args.agent)
    if not agent_dir.is_absolute():
        agent_dir = ROOT / agent_dir

    manifest_path = Path(args.manifest)
    if not manifest_path.is_absolute():
        manifest_path = ROOT / manifest_path

    out_path = Path(args.out) if args.out else agent_dir / "config.env"
    if not out_path.is_absolute():
        out_path = ROOT / out_path

    generate_config(agent_dir, manifest_path, out_path)


if __name__ == "__main__":
    main()
