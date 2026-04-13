# The Onion Architecture: How the Agentic Platform Builds Cloud-Agnostic AI Agents

> **From Infrastructure to Intelligence — Each Layer Wraps the Previous One, Each Layer is Pluggable**

---

## The Core Insight

The platform follows an **onion (layered) architecture** where each ring wraps the one below it, adding a new level of abstraction. Nothing in an outer layer knows the implementation details of an inner layer. Everything is pluggable — from the cloud provider at the core to the business tools at the surface.

```
                    ┌───────────────────────────────────────────┐
                    │          5. DEVELOPER EXPERIENCE          │
                    │     Skills, Scaffolding, Validation       │
                    │  ┌───────────────────────────────────┐    │
                    │  │     4. FUNCTIONAL SERVICES         │    │
                    │  │   Email, Docs, Extraction, CRM    │    │
                    │  │  ┌───────────────────────────┐    │    │
                    │  │  │  3. INFRASTRUCTURE        │    │    │
                    │  │  │     CAPABILITIES          │    │    │
                    │  │  │  Auth, Memory, LLM,       │    │    │
                    │  │  │  Guardrails, KB            │    │    │
                    │  │  │  ┌───────────────────┐    │    │    │
                    │  │  │  │ 2. FACTORY        │    │    │    │
                    │  │  │  │    PATTERN        │    │    │    │
                    │  │  │  │ Interfaces →      │    │    │    │
                    │  │  │  │ Adapters →        │    │    │    │
                    │  │  │  │ Singletons        │    │    │    │
                    │  │  │  │ ┌───────────┐    │    │    │    │
                    │  │  │  │ │ 1. INFRA  │    │    │    │    │
                    │  │  │  │ │ Terraform │    │    │    │    │
                    │  │  │  │ │ K8s, Cloud│    │    │    │    │
                    │  │  │  │ └───────────┘    │    │    │    │
                    │  │  │  └───────────────────┘    │    │    │
                    │  │  └───────────────────────────┘    │    │
                    │  └───────────────────────────────────┘    │
                    └───────────────────────────────────────────┘
```

**The key principle:** each layer only depends on the **interfaces** of the layer immediately below it — never on a concrete implementation. This is what makes the entire system cloud-agnostic without sacrificing power.

---

## Layer 1: Infrastructure (The Kernel)

**What it does:** Provisions the raw cloud resources — Kubernetes cluster, databases, identity services, container registries, networking.

**Where it lives:** `01-infrastructure/terraform/`

**What makes it pluggable:** Terraform modules are organized per cloud (`aws/`, `google/`), but they all produce the same contract — a **manifest** (`manifests/dev-aws.json`, `manifests/dev-gcp.json`).

```
                    Terraform (AWS)                   Terraform (GCP)
                         │                                 │
                         ▼                                 ▼
                  dev-aws.json                      dev-gcp.json
                         │                                 │
                         └──────────┬──────────────────────┘
                                    │
                                    ▼
                         infrastructure.yaml
                          (CONTRACT: output name → bash var name)
                                    │
                                    ▼
                          manifest_exports.py
                          exports: CONTAINER_REGISTRY, CLUSTER_NAME,
                                   NAMESPACE, DOMAIN ...
```

**The output contract (`infrastructure.yaml`)** maps cloud-specific terraform output names to canonical bash variable names. The deploy scripts never call `terraform output` directly — they read the committed manifest JSON through this contract.

```yaml
# infrastructure.yaml — the contract
container_registry:
  aws: ecr_repository_base
  gcp: artifact_registry_base
  canonical: CONTAINER_REGISTRY       # same bash var, any cloud

cluster_name:
  aws: eks_cluster_name
  gcp: gke_cluster_name
  canonical: CLUSTER_NAME
```

**What this means:** _Adding a new cloud_ (Azure, OpenShift) requires writing Terraform modules that produce the same output keys. Everything above this layer — factory, agents, MCP servers — doesn't change at all.

---

## Layer 2: Factory Pattern (The Abstraction Engine)

**What it does:** Translates a ConfigMap environment variable into the correct cloud adapter — at runtime, lazily, as a singleton.

**Where it lives:** `03-agents/shared/` (for agents) and `02-mcp-servers/lib/` (for MCP servers)

**The three-part pattern:**

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   INTERFACE     │     │    ADAPTER       │     │    FACTORY       │
│   (ABC)         │     │   (Cloud impl)   │     │   (Getter)       │
│                 │     │                  │     │                  │
│ MemoryStore     │◀────│ DynamoDB         │◀────│ get_memory_store()│
│  .save()        │     │  .save() → boto3 │     │  reads ConfigMap │
│  .load()        │     │                  │     │  returns adapter │
│  .delete()      │◀────│ Firestore        │     │  caches singleton│
│                 │     │  .save() → gcp   │     │                  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**How it works at runtime:**

```python
# Agent code — identical on EVERY cloud
from shared.factory import get_memory_store

memory = get_memory_store()   # What happens inside:
                               #   1. Reads MEMORY_STORE_TYPE from ConfigMap
                               #   2. "dynamodb" → imports DynamoDBMemoryStore
                               #   3. Reads DYNAMODB_CONVERSATIONS_TABLE from ConfigMap
                               #   4. Returns DynamoDBMemoryStore(table="agentic-convos")
                               #   5. Caches as singleton — next call returns same instance
```

**Why this matters:** The agent code _never imports boto3, google.cloud, or any cloud SDK_. It calls `get_memory_store()` and gets back an object that satisfies `MemoryStoreInterface`. The agent doesn't know — and doesn't care — whether it's talking to DynamoDB, Firestore, Redis, or PostgreSQL.

**Two symmetric factory libraries:**

| Library | Purpose | Used by | Definition file |
|---------|---------|---------|-----------------|
| `shared/` | Infrastructure capabilities (auth, memory, LLM, KB, guardrail) | Agents | `capabilities.yaml` |
| `lib/` | Functional capabilities (extraction, storage) | Commodity MCP servers | `services.yaml` |

Both follow the exact same pattern: Interface → Adapter → Factory → Pydantic Settings.

---

## Layer 3: Infrastructure Capabilities (The Agent Skeleton)

**What it does:** Gives every agent a standard set of enterprise features — authentication, conversation memory, LLM access, input/output guardrails, knowledge base search — without the agent developer writing any of it.

**Where it's declared:** `agent.yaml` → `capabilities:` section

**Where it's defined:** `capabilities.yaml` (the contract between agent.yaml and infrastructure)

```yaml
# agent.yaml — the developer writes THIS
capabilities:
  auth: cognito              # Validate JWT tokens
  memory: dynamodb            # Persist conversations
  llm: openai                 # LLM provider via LiteLLM
  guardrail: bedrock           # Content safety guardrails
  knowledge_base: bedrock      # RAG search
  mcp_client: http             # Connect to MCP tool servers
```

**The resolution pipeline:**

```
agent.yaml                          capabilities.yaml
  auth: cognito          ──────▶      cognito:
                                        COGNITO_USER_POOL_ID: cognito_user_pool_id  ← manifest key
                                        COGNITO_CLIENT_ID: cognito_client_id
                                        _required: [COGNITO_USER_POOL_ID]
                │
                ▼
      generate_config.py  + manifest JSON
                │
                ▼
      config.env:
        AUTH_VALIDATOR_TYPE=cognito
        COGNITO_USER_POOL_ID=eu-west-1_ABC123
        COGNITO_CLIENT_ID=7abc123def
                │
                ▼
      Kustomize → ConfigMap → Pod env vars
                │
                ▼
      Pydantic Settings (settings.py) reads env vars
                │
                ▼
      Factory: get_auth_validator() → CognitoJWTValidator
```

**The 7 infrastructure capabilities and their pluggable providers:**

| Capability | AWS | GCP | Cloud-neutral |
|-----------|-----|-----|---------------|
| **Auth** | Cognito | Identity Platform | Any JWT issuer |
| **Memory** | DynamoDB | Firestore | Redis*, PostgreSQL* |
| **Token Store** | DynamoDB | Firestore | Redis*, PostgreSQL* |
| **LLM** | Bedrock | Vertex AI | OpenAI, Azure OpenAI, Anthropic |
| **Guardrail** | Bedrock Guardrails | Model Armor | — |
| **Knowledge Base** | Bedrock KB | Vertex AI Search | Pinecone, OpenSearch |
| **MCP Client** | HTTP | HTTP | Gateway* |

_* = adapter planned, not yet implemented_

**Adding a new provider** (e.g., Azure Cosmos for memory):

1. Create `shared/adapters/memory_store/cosmos.py` implementing `MemoryStoreInterface`
2. Add `"cosmos"` to the Literal type in `shared/factory/settings.py`
3. Add `elif mem_type == "cosmos":` branch in `shared/factory/__init__.py`
4. Add `cosmos:` entry in `capabilities.yaml` with required env vars
5. **Zero changes to any agent code** — agents already call `get_memory_store()`

---

## Layer 4: Functional Services (The Tool Belt)

**What it does:** Gives agents the ability to _do things_ — send emails, search documents, extract text from PDFs, query CRMs. These are tools the LLM decides when to use, not framework plumbing that runs on every request.

**Where it's declared:** `agent.yaml` → `services:` section

**Where it's defined:** `services.yaml` (the functional services catalog)

```yaml
# agent.yaml — the developer writes THIS
services:
  email: google              # Gmail via MCP server
  documents: sharepoint      # SharePoint via MCP server
  extraction: textract       # OCR via commodity MCP server
```

**Two types of services:**

### Commodity Services (Same Tools, Different Backend)

The agent sees the same MCP tools regardless of which cloud backend processes the request:

```
                            ┌──▶ AWS Textract      (EXTRACTION_PROVIDER=textract)
Agent ──MCP──▶ mcp-server-extraction ──┤
                            └──▶ GCP Document AI   (EXTRACTION_PROVIDER=document_ai)
```

Commodity servers use `lib/` — the same factory pattern as `shared/`, but for functional capabilities.

### SaaS Services (Unique Tool Surface per Provider)

Each provider has its own MCP server with distinct tools. Not interchangeable:

```
Agent ──MCP──▶ mcp-server-google-mdc        (Gmail, Calendar, Drive)
Agent ──MCP──▶ mcp-server-sharepoint-mdc    (SharePoint document library)
Agent ──MCP──▶ mcp-server-linkedin          (LinkedIn profiles)
```

### OpenAPI MCP Servers: Any API on the Internet → Agent Tools in Minutes

This is one of the platform's most powerful extension mechanisms. **Any REST API that publishes an OpenAPI (Swagger) specification can be turned into an MCP tool server with zero Python code:**

```
    openapi.yaml (from ANY public/private API)            
         │                                                 
         ▼                                                 
    OpenAPI MCP Server template                            
         │  Reads spec at startup                          
         │  Auto-generates @mcp.tool for each endpoint     
         │  Maps parameters, auth, response schemas        
         ▼                                                 
    MCP tools available to any agent                       
                                                           
    Examples:                                              
    ├── Jira REST API        → search_issues, create_issue, assign_issue      
    ├── Stripe API           → list_charges, create_refund, get_invoice       
    ├── Salesforce REST API  → query_records, create_lead, update_opportunity 
    ├── GitHub API           → list_repos, create_pr, search_code            
    ├── Any internal API     → whatever endpoints it exposes                 
    └── Any SaaS with OpenAPI spec → instant MCP tools                       
```

**The developer's workflow:**
1. Find or write the OpenAPI spec (`.yaml` or `.json`) for the target API
2. Scaffold with `create-mcp-server` skill → choose "OpenAPI" type
3. Place the spec in the server directory
4. Configure auth (API key, OAuth, bearer token) in secrets
5. Deploy → register in `services.yaml` → any agent can consume it

**No Python code for tool definitions.** The spec *is* the code. Each `paths:` entry becomes an MCP tool. Each `parameters:` block becomes tool arguments. Each `responses:` schema becomes the return type. The LLM sees structured tools with descriptions, types, and constraints — all extracted from the spec.

This means the platform can **wrap any SaaS, any internal microservice, any partner API** — anything reachable over HTTP with an OpenAPI spec — and expose it to agents as first-class tools, with the same autodiscovery, same OAuth gateway, same services.yaml registration as hand-coded MCP servers.

**Auto-resolution:** When an agent declares `services:`, `generate_config.py` automatically:
- Resolves MCP server URLs from K8s service DNS
- Detects OAuth dependencies → sets `OAUTH_PROVIDER`, `OAUTH_GATEWAY_URL`
- Generates `MCP_SERVERS` (comma-separated `name=url` pairs)
- Generates `MCP_SERVICE_SKILLS` (for dynamic agent card + system prompt)

**Adding a new service:** Deploy an MCP server + add an entry to `services.yaml` → every agent can use it by adding one line to `agent.yaml`.

---

## Layer 5: Developer Experience (The Shell)

**What it does:** Makes the entire platform accessible to developers (and AI coding assistants) without requiring deep knowledge of Kubernetes, cloud SDKs, or the factory internals.

### Scaffolding

```bash
./create-agent.sh
# Interactive: picks name, type (specialized/orchestrator), target cloud
# Generates: agent.yaml, Dockerfile, src/, k8s/, deploy scripts
# Result: fully deployable agent in minutes
```

### Configuration Pipeline

The developer only edits `agent.yaml`. Everything else is derived:

```
agent.yaml  ───▶  generate_config.py  ───▶  config.env  ───▶  ConfigMap  ───▶  Pod
   │                     ▲                                        │
   │              capabilities.yaml                          env vars
   │              services.yaml                                   │
   │              manifest JSON                            settings.py
   │                                                       (Pydantic)
   │                                                              │
   └──────────────────── zero code changes ──────────────────▶ factory
                                                            get_X() → adapter
```

### Per-Cloud Overrides

When one `agent.yaml` doesn't fit all clouds, create `agent-{cloud}.yaml` with only the sections that differ:

```
agent.yaml         ← base (works on AWS)
agent-gcp.yaml     ← override: replaces only the sections that differ for GCP
```

The deploy script auto-detects and applies the override. Section-level replace — clean and predictable.

### Validation

```bash
./00-platform-tooling/cli/validate_all.sh
```

Runs 6 validators in sequence:
- Factory contract (capabilities.yaml ↔ settings.py)
- Commodity factory contract (services.yaml ↔ lib/settings.py)
- Infrastructure contract (infrastructure.yaml ↔ manifests)
- Template validation (generated agents deploy correctly)
- SSOT verification (docs match code)

### AI-Powered Skills

Six executable skills allow AI coding assistants to autonomously create agents, MCP servers, manage services, migrate between clouds, and configure OAuth — following the platform's patterns mechanically.

---

## How It All Connects: End-to-End Flow

```
                         THE ONION — FROM CORE TO SURFACE
╔══════════════════════════════════════════════════════════════════════════╗
║                                                                        ║
║   LAYER 1: INFRA                                                       ║
║   Terraform → manifest JSON (committed)                                ║
║        │                                                               ║
║        ▼                                                               ║
║   infrastructure.yaml ──▶ manifest_exports.py ──▶ CONTAINER_REGISTRY   ║
║                                                    CLUSTER_NAME        ║
║                                                    NAMESPACE ...       ║
║   ─────────────────────────────────────────────────────────────────     ║
║                                                                        ║
║   LAYER 2: FACTORY                                                     ║
║   Interface (ABC) → Adapter (cloud impl) → Factory (singleton getter)  ║
║   Agent code: get_memory_store() → DynamoDB or Firestore or Redis      ║
║                                                                        ║
║   ─────────────────────────────────────────────────────────────────     ║
║                                                                        ║
║   LAYER 3: INFRA CAPABILITIES                                          ║
║   agent.yaml capabilities: → capabilities.yaml → generate_config.py    ║
║   → config.env → ConfigMap → Pydantic Settings → Factory call          ║
║                                                                        ║
║   ─────────────────────────────────────────────────────────────────     ║
║                                                                        ║
║   LAYER 4: FUNCTIONAL SERVICES                                         ║
║   agent.yaml services: → services.yaml → generate_config.py            ║
║   → MCP_SERVERS auto-resolved → MCP protocol → external APIs           ║
║                                                                        ║
║   ─────────────────────────────────────────────────────────────────     ║
║                                                                        ║
║   LAYER 5: DX                                                          ║
║   create-agent.sh → agent.yaml → deploy-{cloud}-gen.sh → running pod  ║
║   AI Skills → autonomous agent creation/migration                      ║
║   validate_all.sh → 6 validators → green or fix                        ║
║                                                                        ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## Runtime Architecture

Once deployed, the agents communicate via standard protocols on Kubernetes:

```
┌───────────────────────────────────────────────────────────────┐
│  Kubernetes Cluster (any cloud, any distribution)             │
│                                                               │
│  User ──▶ Streamlit UI ──HTTP──▶ Orchestrator                 │
│                                      │                        │
│                                 A2A Protocol                  │
│                            (Google A2A, JSON-RPC)             │
│                    ┌─────────────┼─────────────┐              │
│                    ▼             ▼              ▼              │
│               Agent KB    Agent Google    Agent Sales          │
│                    │             │              │              │
│                MCP Protocol (Streamable HTTP)                  │
│                    │             │              │              │
│                    ▼             ▼              ▼              │
│              KB Search    MCP Google     MCP Ecommerce         │
│                                  │                            │
│                              OAuth GW ──▶ Token Store         │
│                                  │                            │
│                            External APIs                      │
│                       (Gmail, Drive, LinkedIn...)              │
└───────────────────────────────────────────────────────────────┘
```

**Agent discovery is dynamic:** The orchestrator watches Kubernetes Services with label `agentic.io/agent-type: specialized`. Deploy a new agent → the orchestrator discovers it automatically. No restarts, no hardcoded lists.

**Protocols:**
- **User → Orchestrator:** HTTP/REST + streaming (SSE)
- **Orchestrator → Agent:** A2A (Google Agent-to-Agent protocol, JSON-RPC 2.0)
- **Agent → MCP Server:** MCP (Model Context Protocol, Streamable HTTP)
- **MCP Server → OAuth Gateway:** Internal HTTP (`/internal/token`)
- **MCP Server → External APIs:** HTTPS with OAuth tokens

---

## The Runtime Onion: Autodiscovery at Every Ring

The onion pattern doesn't stop at build time — it **repeats at runtime** across three concentric discovery rings. Each ring discovers the next one dynamically, with zero hardcoded references:

```
                    ┌─────────────────────────────────────────────┐
                    │         RING 3: MCP SERVERS                 │
                    │    Discovered via MCP_SERVERS env var        │
                    │    (auto-resolved from services.yaml)       │
                    │  ┌─────────────────────────────────────┐    │
                    │  │     RING 2: SPECIALIZED AGENTS      │    │
                    │  │   Discovered via K8s label watcher   │    │
                    │  │   agentic.io/agent-type: specialized │    │
                    │  │  ┌─────────────────────────────┐    │    │
                    │  │  │   RING 1: ORCHESTRATOR      │    │    │
                    │  │  │   The decision-maker        │    │    │
                    │  │  │   Routes by agent skills     │    │    │
                    │  │  └─────────────────────────────┘    │    │
                    │  └─────────────────────────────────────┘    │
                    └─────────────────────────────────────────────┘
```

### Ring 1 → Ring 2: Agent Autodiscovery

The orchestrator never has a hardcoded list of agents. Instead, it runs a **Kubernetes Service watcher** that continuously monitors the namespace:

```python
# k8s_discovery.py — real code, not pseudocode
watcher = watch.Watch()
for event in watcher.stream(v1.list_namespaced_service, namespace):
    labels = svc.metadata.labels or {}
    if labels.get("agentic.io/agent-type") == "specialized":
        agent_name = labels["agentic.io/agent-name"]
        agent_url  = f"http://{svc.metadata.name}.{namespace}.svc.cluster.local:{port}"
        # Fetch /.well-known/agent-card.json → get skills, name, description
        agents[agent_name] = AgentCard(...)
```

**Deploy a new specialized agent → the orchestrator sees it within seconds.** Remove one → it disappears from the routing table. No config reload, no restart, no redeployment of the orchestrator.

The orchestrator's LLM receives the **full agent card** of every discovered agent, including the agent's skills. It uses this to decide which agent to delegate a user query to via `call_agent(agent_name, query)`.

### Ring 2 → Ring 3: MCP Server Auto-Resolution

Specialized agents don't hardcode MCP server URLs either. When `agent.yaml` declares `services:`, `generate_config.py` reads `services.yaml` and produces:

```bash
# Auto-generated in config.env — the agent never writes this
MCP_SERVERS=mcp-server-google=http://mcp-server-google.agentic-dev.svc.cluster.local/mcp/mcp-server-google,...
MCP_SERVICE_SKILLS=email:send_email,search_email;calendar:list_events,create_event;...
```

At startup, the agent calls `get_mcp_registry(user_id)` → the factory creates MCP clients for each server listed in `MCP_SERVERS`. The LLM sees the tools from **all connected MCP servers** as if they were local functions.

**Add a new MCP server to `services.yaml` → add one line to any agent's `agent.yaml` → the agent gains those tools on next deploy. No code changes.**

### The Discovery Chain

```
User query: "Send last week's invoices to juan@acme.com"
     │
     ▼
Orchestrator LLM ─── "This needs email + document extraction"
     │                "Agent Extraction has skill: document_processing"
     │                "Agent Extraction has skill: email"
     │
     ▼ call_agent("extraction", query)        ← A2A, auto-discovered
     │
     ▼
Agent Extraction LLM ─── "I need to extract PDF, then send email"
     │
     ├──▶ mcp-server-extraction/extract_text  ← MCP, auto-resolved from services.yaml
     │         (Textract on AWS, Document AI on GCP — same tool name)
     │
     └──▶ mcp-server-google/send_email        ← MCP, auto-resolved
               │
               └──▶ OAuth Gateway → Gmail API  ← OAuth, auto-configured
```

**Every arrow in this chain was auto-discovered or auto-resolved.** No developer wrote a URL, a routing rule, or a tool import. The onion discovers itself.

---

## Dynamic Prompt Self-Construction

One of the platform's most powerful features: **agents build their own system prompts and agent cards at startup**, based on what services they're connected to. No manual prompt engineering for service-level capabilities.

### How It Works

When `generate_config.py` resolves `services:` in `agent.yaml`, it produces `MCP_SERVICE_SKILLS` — a structured representation of what the agent can do:

```yaml
# agent.yaml
services:
  email: google
  documents: sharepoint
  extraction: textract
```

```bash
# Auto-generated → MCP_SERVICE_SKILLS
MCP_SERVICE_SKILLS=email:send_email,search_email,list_emails;documents:search_documents,get_document;extraction:extract_text,extract_tables
```

At runtime, the specialized agent template reads this variable and **dynamically constructs**:

**1. The Agent Card (`/.well-known/agent-card.json`)**

Skills are generated from `MCP_SERVICE_SKILLS`, not hand-written:

```json
{
  "name": "agent-extraction",
  "skills": [
    {"id": "email", "name": "Email Management", "description": "Send, search, and manage emails via Gmail"},
    {"id": "documents", "name": "Document Access", "description": "Search and retrieve SharePoint documents"},
    {"id": "extraction", "name": "Document Processing", "description": "Extract text and tables from documents"}
  ]
}
```

**2. The System Prompt**

The agent's system prompt includes a capabilities section auto-generated from the connected services:

```
You are a specialized agent with the following capabilities:
- Email Management: send_email, search_email, list_emails (via Gmail)
- Document Access: search_documents, get_document (via SharePoint)
- Document Processing: extract_text, extract_tables (via Textract)

Use the appropriate tools to fulfill user requests...
```

### Why This Matters

- **Add a service** → the agent card gains new skills, the system prompt describes them, the orchestrator routes relevant queries to this agent — **all automatically**
- **Remove a service** → skills disappear, prompt shrinks, orchestrator stops routing those queries here
- **Zero manual prompt editing** — the prompt is always synchronized with actual capabilities
- **The orchestrator uses these dynamic agent cards** to decide delegation — so the entire routing layer self-organizes based on what services each agent has

```
services.yaml  ──▶  MCP_SERVICE_SKILLS  ──▶  Agent Card (skills)
                                         ──▶  System Prompt (capabilities)
                                         ──▶  Orchestrator routing decisions

    Change ONE line in agent.yaml
    → the whole chain reconfigures
```

---

## Platform Self-Extension: The Extensibility Model

The platform is designed to grow without modifying existing code. Every extension point follows a common pattern: **implement an interface, register it, deploy it.**

### 1. Add a New Specialized Agent

The orchestrator discovers agents by **K8s labels** — it doesn't have a list to update:

```
Deploy agent-invoicing to the namespace
    → K8s watcher fires ADDED event
    → Orchestrator fetches agent card
    → LLM now knows "agent-invoicing" can handle invoice queries
    → Queries start routing there automatically
```

**Time to extend: ~30 minutes using Copilot Skills, zero changes to orchestrator.**

### 2. Add a New MCP Server (Three Types)

Three patterns exist, each for a different use case:

| Type | When to use | Tools defined by | Cloud abstraction |
|------|-------------|-----------------|-------------------|
| **Manual** | Custom business logic | `@mcp.tool` decorators in Python | None (your code) |
| **OpenAPI** | Existing REST API | Auto-generated from OpenAPI spec | None (passthrough) |
| **Commodity** | Same tool surface, different cloud backend | `@mcp.tool` + `lib/` factory | Full (via `lib/factory`) |

```
Manual MCP Server:
  Developer writes @mcp.tool functions
  → Full control, any logic
  → Use case: custom business logic, complex workflows

OpenAPI MCP Server:                          ◀◀◀ THE UNIVERSAL CONNECTOR
  Developer provides openapi.yaml
  → Tools auto-generated from API spec
  → Zero Python code for tool definitions
  → Use case: ANY REST API on the internet with an OpenAPI spec
  → Jira, Stripe, Salesforce, GitHub, internal APIs, partner APIs...
  → The fastest path from "API exists" to "agent can use it"

Commodity MCP Server:
  Developer writes @mcp.tool that calls lib/factory
  → Same tools (extract_text, store_file)
  → Backend swapped via ConfigMap (Textract ↔ Document AI, S3 ↔ GCS)
  → Onion pattern inside the MCP server itself
  → Use case: same tool interface, different cloud backend
```

**All three types register the same way:** add to `services.yaml` → any agent can use them.

The **OpenAPI type** deserves special attention: it turns the platform into a **universal API consumer**. Any service exposed on the internet (or internally) that follows the OpenAPI standard can be wrapped as an MCP server in minutes — no custom code, no manual tool definitions. The spec drives everything. This means the platform's functional reach is effectively **unlimited** — if an API exists and has a spec, agents can use it.

### 3. Add a New Infrastructure Capability

Adding a new cloud adapter (e.g., Azure Cosmos for memory):

```
1. shared/adapters/memory_store/cosmos.py     ← implements MemoryStoreInterface
2. shared/factory/settings.py                  ← add "cosmos" to Literal type
3. shared/factory/__init__.py                  ← add elif branch
4. capabilities.yaml                           ← add cosmos: entry with env vars
5. validate_factory.py                         ← automatically validates the new adapter
```

**Zero changes to any agent code. Every agent that uses `get_memory_store()` can now be configured to use Cosmos with a one-line ConfigMap change.**

### 4. Add a New Cloud Provider (End-to-End)

The ultimate extensibility test — adding Azure, OpenShift, or on-prem:

```
Layer 1: Write Terraform modules → produce manifest with same output keys
Layer 2: Write adapters for interfaces that need it (memory, auth, etc.)
Layer 3: Add provider entries to capabilities.yaml
Layer 4: Commodity MCP servers → add lib/ adapters if needed
Layer 5: Add deploy-azure-gen.sh template + kustomize overlay

Result: ALL existing agents deploy on Azure with zero source code changes.
        Only agent.yaml capabilities change (e.g., memory: cosmos).
```

### 5. Self-Construction via GitHub Copilot Skills

The platform doesn't just support extension — it **builds itself**. Six executable Skills allow AI coding assistants to autonomously perform platform operations:

| Skill | What it does | Triggered by |
|-------|-------------|-------------|
| **create-agent** | Scaffolds a complete agent (specialized or orchestrator) with all onion layers wired | "create a new agent" |
| **create-mcp-server** | Scaffolds any of the 3 MCP server types with K8s manifests and deploy scripts | "create an MCP server" |
| **manage-service-agent** | Adds or removes a service from an existing agent (MCP_SERVICE_SKILLS auto-updates) | "add email to agent-X" |
| **migrate-agent-cloud** | Migrates an agent from one cloud to another, remapping capabilities | "move agent-X to GCP" |
| **migrate-mcp-server-cloud** | Migrates an MCP server between clouds | "move MCP server to AWS" |
| **oauth-gateway** | Generates, configures, and deploys the OAuth Gateway | "set up OAuth gateway" |

Each skill is a step-by-step execution protocol that the AI follows mechanically — reading actual files, running actual validators, generating actual configs. It's not documentation — it's an executable recipe that produces production-ready deployable code.

```
Developer: "Create a specialized agent called agent-legal
            on AWS with memory, auth, guardrail, and email service"

Copilot Skill executes:
  1. Read capabilities.yaml → resolve auth, memory, guardrail providers for AWS
  2. Read services.yaml → resolve email → mcp-server-google → OAuth dependency
  3. Scaffold agent.yaml, Dockerfile, src/, k8s/
  4. Run generate_config.py → config.env
  5. Run validate_all.sh → green
  6. ✅ Ready to deploy-aws-gen.sh dev
```

### 6. SSOT Self-Maintenance

The platform maintains its own consistency through a Single Source of Truth protocol:

```
Source code changes
     │
     ▼
Cascade rules (docs/ssot-maintenance.md):
  Code → Docs → CI/Skills
     │
     ▼
validate_all.sh:
  ├── validate_factory.py          (capabilities.yaml ↔ settings.py ↔ adapters)
  ├── validate_lib_factory.py      (services.yaml ↔ lib/settings.py ↔ lib/adapters)
  ├── validate_infrastructure.py   (infrastructure.yaml ↔ manifests)
  ├── verify_ssot.sh               (docs match code, no stale references)
  └── template validation          (generated agents actually deploy)

110 checks, 4 validators — ALL must pass before commit.
```

**If you add a new adapter but forget to update `capabilities.yaml`, the validator catches it. If you add a new env var to `settings.py` but forget to document it, SSOT verification catches it. If a template generates broken Kustomize, template validation catches it.**

The platform knows its own contracts and enforces them automatically.

---

## The Pluggability Matrix

Every decision point in the platform is a plug:

### Infrastructure Plugs (Layer 1)

| Plug | Options |
|------|---------|
| Cloud provider | AWS, GCP, Azure, on-prem, sovereign |
| K8s distribution | EKS, GKE, AKS, OpenShift, k3s, kind |
| Container registry | ECR, Artifact Registry, ACR, Harbor |
| Ingress controller | ALB (AWS), Gateway API (GCP), NGINX |

### Capability Plugs (Layer 3)

| Plug | Current Options | Add New |
|------|----------------|---------|
| Authentication | Cognito, Identity Platform, none | Implement `AuthValidatorInterface` |
| Conversation Memory | DynamoDB, Firestore, none | Implement `MemoryStoreInterface` |
| LLM Provider | Bedrock, Vertex AI, OpenAI, Azure OpenAI, Anthropic | Add model ID format to LiteLLM config |
| Content Guardrails | Bedrock Guardrails, Model Armor, none | Implement `GuardrailInterface` |
| Knowledge Base | Bedrock KB, Vertex AI Search, Pinecone, OpenSearch | Add retriever to LangChain adapter |
| MCP Transport | HTTP (Streamable HTTP), Gateway* | Implement `MCPClientInterface` |

### Service Plugs (Layer 4)

| Plug | Current Options | Add New |
|------|----------------|---------|
| Email | Gmail (Google MCP) | Deploy new MCP server + register in `services.yaml` |
| Documents | Google Drive, SharePoint | Deploy new MCP server |
| Calendar | Google Calendar | Deploy new MCP server |
| Extraction | AWS Textract, GCP Document AI | Add adapter to `lib/adapters/extractor/` |
| Storage | AWS S3, GCP Cloud Storage | Add adapter to `lib/adapters/storage/` |
| Social | LinkedIn | Deploy new MCP server |
| Project Mgmt | Jira | Deploy new MCP server |

---

## Why This Architecture Works

### 1. True Cloud Agnosticism (Not Just Abstraction)

Most "cloud-agnostic" platforms abstract one layer. This platform abstracts **all five**:

- Layer 1: Terraform modules per cloud, but same manifest contract
- Layer 2: Factory pattern with ABC interfaces — zero SDK imports in agents
- Layer 3: `capabilities.yaml` maps capability names to cloud-specific env vars
- Layer 4: `services.yaml` resolves service names to MCP server URLs
- Layer 5: Deploy scripts auto-detect cloud, resolve infrastructure, build and apply

**To switch clouds:** change ConfigMap values. No code changes. No recompilation. No new images.

### 2. Separation of Concerns

Each layer has a single responsibility and a clear contract with its neighbors:

```
infrastructure.yaml  → Layer 1 ↔ Layer 2 contract (terraform outputs → bash vars)
capabilities.yaml    → Layer 2 ↔ Layer 3 contract (capability → env vars → adapters)
services.yaml        → Layer 3 ↔ Layer 4 contract (service → MCP server URL + OAuth)
agent.yaml           → Layer 4 ↔ Layer 5 contract (developer intent → platform execution)
```

### 3. Progressive Complexity

A developer sees only what they need:

- **Simplest case:** Write `agent.yaml` with `llm: openai`, deploy. Done.
- **Add memory:** Add `memory: dynamodb` to capabilities. No code changes.
- **Add services:** Add `email: google` to services. Agent gains Gmail tools automatically.
- **Switch clouds:** Create `agent-gcp.yaml` override. Same agent, different infrastructure.
- **Extend platform:** Add a new adapter, register in capabilities.yaml, run validators.

### 4. Validated Contracts

The platform doesn't just define contracts — it enforces them:

- `validate_factory.py` — every env var in `capabilities.yaml` has a matching Pydantic field
- `validate_lib_factory.py` — every commodity env var in `services.yaml` has a matching field
- `validate_infrastructure.py` — every infra output in `infrastructure.yaml` exists in manifests
- `validate_all.sh` — runs all validators + SSOT checks in one command

A broken contract is caught at validation time, not at 3 AM in production.

### 5. Zero-Boilerplate Expansion

Adding a **new agent**: Run scaffolding → edit `agent.yaml` → deploy. The template includes all capability wiring.

Adding a **new MCP server**: Deploy it → add to `services.yaml` → any agent can use it via one YAML line.

Adding a **new cloud provider**: Write Terraform → write adapters for interfaces that need it → add to `capabilities.yaml`. Existing agents and MCP servers work without modification.

---

## Summary: The Five Rings

| Ring | Name | Question it answers | Source of truth | Pluggable via |
|------|------|-------------------|-----------------|---------------|
| 1 | **Infrastructure** | Where does it run? | `infrastructure.yaml` + Terraform | New Terraform module |
| 2 | **Factory** | How does code talk to cloud? | `shared/` interfaces + adapters | New adapter class |
| 3 | **Infra Capabilities** | What enterprise features does the agent have? | `capabilities.yaml` | New entry + adapter |
| 4 | **Functional Services** | What can the agent do for users? | `services.yaml` | New MCP server |
| 5 | **Developer Experience** | How fast can I build? | Templates + Skills + Validators | New skill or template |

Each ring protects the rings inside it. Each ring can be extended independently. The agent code at the center never changes — it just calls factory functions and gets the right implementation, on any cloud, with any provider, every time.
