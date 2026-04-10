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
- basic agent messaging
- open source repo hygiene

## Next likely priorities

### 1. Security and access control
- admin auth hardening
- RBAC foundation with built-in user tokens and admin role enforcement
- token rotation and revocation for operator accounts
- tenant isolation
- secrets management integration

### 2. Messaging upgrades
- threads / conversations foundation
- acknowledgement flow for agent messages
- scheduled delivery and retry queue foundation
- webhook and HTTP endpoint delivery foundation
- background delivery worker foundation
- exponential retry backoff foundation
- realtime delivery
- delivery workers and webhook retry backoff

### 3. Analytics upgrades
- time-window analytics foundation
- pagination foundation for analytics listings
- execution trend views foundation
- alerting hooks

### 4. Identity and trust
- richer trust/reputation models
- cryptographic agent identity
- provider verification flow

### 5. Ecosystem growth
- richer MCP catalog ingestion
- SDK/client support
- dashboard UI
- external integrations with agent frameworks
