# Sound Net

**Service Orchestration Unified Network for Discovery, Navigation, Execution, and Transport**

Open source infrastructure for **tool discovery**, **MCP aggregation**, **agent discovery**, **agent messaging**, and **operator analytics**.

<p>
  <a href="docs/index.md"><img alt="Docs" src="https://img.shields.io/badge/docs-available-blue"></a>
  <a href="docs/deployment.md"><img alt="Deployment" src="https://img.shields.io/badge/deployment-ready-green"></a>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-black"></a>
  <a href="CONTRIBUTING.md"><img alt="Contributions Welcome" src="https://img.shields.io/badge/contributions-welcome-brightgreen"></a>
</p>

---

## Overview

Sound Net is an open source backend platform for the next generation of AI systems.

It is designed for teams building agents that need more than simple tool calling.
Instead of wiring every tool, MCP provider, and partner agent manually into one application, Sound Net creates a shared operational layer where those things can be discovered, ranked, executed, monitored, and coordinated.

At a high level, Sound Net gives you one backend for:

- registering direct HTTP tools
- connecting and curating MCP servers
- importing and normalizing MCP tools
- discovering capabilities through one API
- executing tools through one API
- registering and discovering other agents
- sending messages between agents
- measuring trust, latency, failures, and usage demand

This makes it useful as a foundation for:

- tool-routing systems
- MCP control planes
- multi-agent backends
- agent marketplaces
- orchestration infrastructure
- internal AI operations platforms

Sound Net is **not a model**, **not a chat application**, and **not just a thin tool wrapper**.
It is infrastructure.

---

## Why this project exists

Most agent systems today are fragmented.

A real-world AI stack often contains:

- direct HTTP APIs
- MCP servers from multiple providers
- internal orchestration logic
- different agent roles such as planner, executor, and reviewer
- inconsistent trust and quality across providers
- little visibility into what actually works best

That leads to recurring problems:

- discovery is ad hoc
- execution logic is duplicated
- trust decisions are manual
- MCP tools live in isolated provider contexts
- delegation between agents is improvised
- performance and reliability data are scattered

Sound Net exists to unify these concerns into one control plane.

The first and clearest wedge is:

> **one backend to discover, rank, and execute tools across direct APIs and MCP servers**

That is where teams get immediate value.

From there, Sound Net expands naturally into:

- provider trust and lifecycle management
- query analytics and usage intelligence
- agent discovery
- agent messaging
- future delegation and coordination workflows

---

## What the name means

**SOUND NET** stands for:

**Service Orchestration Unified Network for Discovery, Navigation, Execution, and Transport**

This reflects the actual role of the platform:

- **Service Orchestration**: it coordinates tools and capabilities
- **Unified Network**: it brings HTTP tools, MCP servers, and agents into one system
- **Discovery**: it helps agents find the best option
- **Navigation**: it helps route tasks across tools and agents
- **Execution**: it can call tools directly
- **Transport**: it includes a basic messaging layer between agents

---

## What Sound Net does today

### 1. Capability registry
Sound Net can register direct HTTP tools and store structured metadata for them.

Each capability can include:

- name
- description
- endpoint
- method
- input schema
- output schema
- tags
- rating
- source type
- provider
- category
- status

This creates a normalized tool layer regardless of where the tool originated.

### 2. MCP aggregation
Sound Net can register MCP servers, health-check them, trust or untrust them, sync their tools, and convert those tools into internal capabilities.

This allows a system to treat imported MCP tools similarly to directly registered capabilities.

### 3. Discovery and ranking
Sound Net can rank tools using a practical set of signals:

- keyword match quality
- rating
- trust-derived boost
- freshness
- historical success rate
- usage count
- average latency
- duplicate suppression

This makes routing more intelligent than simple static lookup.

### 4. Unified execution
Once a capability is discovered, it can be executed through one API, regardless of whether it came from:

- direct HTTP registration
- an imported MCP provider

### 5. Agent directory
Sound Net includes a lightweight identity and discovery layer for agents.

Agents can publish:

- name
- description
- endpoint
- protocol

### 6. User auth and RBAC
Sound Net now supports a lightweight built-in user model for operator access.

Current flow:

- create a user with `POST /users/register`
- receive a generated `api_token`
- send that token in `Authorization: Bearer <token>` or `x-user-token: <token>`
- access user-aware endpoints like `GET /users/me`
- use admin-role users for admin-only routes such as user listing, analytics, audit, and system operations

This is intentionally simple and self-hostable. It is a step above raw header-based role checks and creates a foundation for future roadmap items like tenant isolation, SSO, and secrets-backed auth.
- trust score
- tags
- declared capabilities

Other agents can then discover them by keyword query.

### 6. Agent messaging
Sound Net includes a basic inbox-style messaging system for agent-to-agent communication.

This is intentionally simple, but it establishes the foundation for:

- delegation
- handoff
- coordination
- future message transport models

### 7. Analytics and operator visibility
Sound Net tracks:

- execution logs
- latency
- success/failure
- capability analytics
- MCP server analytics
- top tools
- top queries
- stale vs active capabilities

This is important because the system is not only for execution — it is also for operational feedback and routing improvement.

---

## Key concepts

### Capability
A discoverable and executable tool.

### MCP server
An external provider that exposes tools via MCP.

### Agent
A discoverable AI identity with metadata and an endpoint.

### Query log
A record of discovery demand, useful for understanding what users or agents search for most.

### Stale capability
An imported tool that no longer exists upstream and should not be returned for active use.

### Trust score
A lightweight quality/confidence signal for providers or agents.

---

## Quick links

### Start here
- [Docs Home](docs/index.md)
- [Getting Started](docs/getting-started.md)
- [API Workflows](docs/api-workflows.md)
- [Deployment Guide](docs/deployment.md)
- [Cloud Deployment](docs/cloud-deployment.md)

### Deep dive
- [API Reference](docs/api-reference.md)
- [Architecture](docs/architecture.md)
- [Security](docs/security.md)
- [Roadmap](docs/roadmap.md)
- [FAQ](docs/faq.md)
- [Glossary](docs/glossary.md)

### Examples
- [Examples Index](examples/README.md)
- [Discover and Execute](examples/discover-and-execute.sh)
- [Agent Register and Message](examples/agent-register-and-message.sh)
- [MCP Operator Flow](examples/mcp-operator-flow.sh)

### Open source
- [Contributing](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security Policy](SECURITY.md)
- [License](LICENSE)

---

## Architecture summary

Sound Net is organized around three main operational domains plus a cross-cutting analytics layer.

### Capability domain
Responsible for:

- tool registration
- discovery
- ranking
- execution
- execution logs

### MCP domain
Responsible for:

- server registry
- trust and sync permissions
- health checks
- import and normalization
- stale tool handling
- lifecycle controls

### Agent domain
Responsible for:

- agent registry
- agent discovery
- trust metadata
- inbox-style messaging

### Analytics domain
Responsible for:

- performance visibility
- provider quality tracking
- operator insight
- query demand visibility

If you want more detail, see:
- [Architecture](docs/architecture.md)

---

## Main features

### Capabilities and execution
- direct capability registration
- unified discovery and execution
- provider/category tagging
- file-backed or PostgreSQL-backed persistence

### MCP provider management
- server registration
- health checks
- trust management
- sync control
- disable / enable / delete lifecycle
- stale pruning
- trusted MCP catalog seed

### Agent networking
- agent registration
- agent discovery
- trust-aware ranking
- message inbox model

### Analytics
- summary analytics
- capability analytics
- server analytics
- top tools
- top queries
- query logging
- audit logging

### Runtime safety
- API key protection
- admin-only routes
- security headers
- rate limiting
- health endpoint
- readiness endpoint
- graceful shutdown hooks
- config validation on startup

---

## Main endpoints

### Capabilities
- `GET /capabilities`
- `POST /register`
- `POST /discover`
- `POST /execute`
- `GET /logs`

### MCP servers
- `GET /mcp/servers`
- `POST /mcp/servers`
- `PATCH /mcp/servers/:serverId/trust`
- `PATCH /mcp/servers/:serverId/disable`
- `PATCH /mcp/servers/:serverId/enable`
- `DELETE /mcp/servers/:serverId`
- `POST /mcp/servers/:serverId/health`
- `POST /mcp/servers/health`
- `POST /mcp/servers/:serverId/sync`
- `POST /mcp/servers/sync`

### Catalog
- `GET /catalog/mcp`
- `POST /catalog/mcp/seed`

### Agents and messaging
- `GET /agents`
- `POST /agents/register`
- `POST /agents/discover`
- `POST /messages`
- `GET /messages/inbox/:agentId`

### Analytics
- `GET /analytics/summary`
- `GET /analytics/capabilities`
- `GET /analytics/servers`
- `GET /analytics/top-tools?limit=5`
- `GET /analytics/top-queries?limit=10`

### Operations
- `GET /health`
- `GET /ready`
- `GET /audit`
- `GET /system/scheduler`
- `POST /system/repair/backfill`

For detailed request and response examples, see:
- [API Reference](docs/api-reference.md)

---

## Deployment quickstarts

## Local development

```bash
npm install
npm run dev
```

Default local server:

```bash
http://127.0.0.1:3000
```

## Docker Compose

```bash
docker compose up --build
```

Useful docs:
- [Deployment Guide](docs/deployment.md)

## Render

Files included:
- [`render.yaml`](render.yaml)

Useful docs:
- [Cloud Deployment](docs/cloud-deployment.md)

## Railway

Files included:
- [`railway.json`](railway.json)

Useful docs:
- [Cloud Deployment](docs/cloud-deployment.md)

## Fly.io

Files included:
- [`fly.toml`](fly.toml)

Useful docs:
- [Cloud Deployment](docs/cloud-deployment.md)

## Production env reference

- [`.env.example`](.env.example)
- [`.env.production.example`](.env.production.example)

---

## Health and readiness

### Liveness
- `GET /health`

### Readiness
- `GET /ready`

`/health` is intended for simple process liveness.
`/ready` is intended for startup/shutdown readiness and should be used by orchestrators or load balancers.

---

## Production hardening status

Sound Net includes several production-oriented controls already:

- API key enforcement
- admin key enforcement
- security headers
- request rate limiting
- audit logging
- startup config validation
- readiness signaling
- graceful shutdown
- Docker and cloud deployment config
- PostgreSQL support

However, there are still important production responsibilities outside the app itself.

### Included in code
- auth via shared keys
- admin/operator route protection
- provider lifecycle controls
- health and readiness endpoints
- file and PostgreSQL persistence
- cloud deployment configuration

### Still needed for serious production use
- proper RBAC
- multi-tenant isolation
- secrets manager integration
- migration/versioning workflow
- monitoring and alerting stack
- backup and restore process
- deployment-specific networking/TLS setup

More detail:
- [Security](docs/security.md)
- [Deployment](docs/deployment.md)

---

## Example usage stories

### 1. Tool routing
A planner agent needs a food-ordering tool.
It calls `/discover`, receives ranked results, and executes the best capability with `/execute`.

### 2. MCP aggregation
An operator connects a trusted MCP server.
Sound Net syncs its tools and makes them available through the same discovery and execution interface as direct capabilities.

### 3. Agent discovery and messaging
A planner agent discovers an execution agent via `/agents/discover` and sends a work instruction through `/messages`.

### 4. Operational insight
An operator checks:

- which tools are most used
- what search queries are common
- which MCP servers are most reliable
- which tools are stale or slow

---

## Open source readiness

This repository already includes:

- public README
- full docs set
- examples
- deployment configs
- MIT license
- contributing guide
- code of conduct
- security policy
- issue templates
- PR template

That makes it suitable to publish as an open-source infrastructure project.

---

## Roadmap direction

Likely next steps:

1. stronger auth and RBAC
2. realtime or webhook-style agent messaging
3. time-window analytics and pagination
4. cryptographic agent identity
5. richer MCP catalog ingestion
6. delegation workflows and reputation signals

See:
- [Roadmap](docs/roadmap.md)

---

## Testing

```bash
npm test
```

---

## Summary

Sound Net is open source infrastructure for discovering, routing, and coordinating tools, MCP servers, and agents.

If you are building multi-agent systems and need one backend to manage discovery, execution, trust, and coordination, that is exactly what Sound Net is for.
