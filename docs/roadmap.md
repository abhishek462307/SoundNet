# Sound Net Roadmap

## Current MVP+

Sound Net already includes:

- capability registry
- MCP server aggregation
- discovery and execution
- ranking and filters
- server lifecycle controls
- analytics
- agent directory
- agent messaging with threads, queueing, retries, and acknowledgements
- tenant policy profiles and rolling budget enforcement
- operator dashboard UI foundation with admin workflows
- open source repo hygiene

## Next likely priorities

### 1. Security and access control
- admin auth hardening
- RBAC foundation with built-in user tokens and admin role enforcement
- token rotation and revocation for operator accounts
- tenant isolation foundation for users, agents, messages, capabilities, MCP operations, and analytics queries
- autonomy policy foundation with bounded-auto defaults for paid tools and full-auto restrictions for higher-risk actions
- tenant policy profile foundation with persisted settings, rolling budget enforcement, and safest-tool discovery defaults
- secrets management integration

### 2. Messaging upgrades
- richer realtime delivery
- realtime delivery
- delivery workers and webhook retry backoff

### 3. Analytics upgrades
- time-window analytics foundation
- pagination foundation for analytics listings
- execution trend views foundation
- policy analytics foundation with rolling 24h/7d spend visibility and mode-usage summaries
- alerting hooks

### 4. Identity and trust
- richer trust/reputation models
- cryptographic agent identity
- provider verification flow

### 5. Ecosystem growth
- richer MCP catalog ingestion
- SDK/client support
- dashboard UI expansion with routing, saved environments, and richer actions
- external integrations with agent frameworks
