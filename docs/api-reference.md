# API Reference

This document summarizes the major endpoints in Sound Net.

## Health

### `GET /health`
Returns service health.

Response:
```json
{
  "status": "ok",
  "service": "agent-network-mvp"
}
```

## Authentication

### API key
If `API_KEY` is configured, include:

```http
x-api-key: <value>
```

### Admin key
If `ADMIN_API_KEY` is configured, admin routes can include:

```http
x-admin-key: <value>
```

### User token
After creating a user, authenticate with either:

```http
Authorization: Bearer <api_token>
```

or:

```http
x-user-token: <api_token>
```

### Tenant routing
Sound Net supports a tenant foundation using:

```http
x-tenant-id: <tenant-id>
```

If an authenticated user token is present, the user tenant takes precedence over the header.
Current tenant scoping applies to users, agents, messages, capabilities, MCP servers, and analytics queries.

## Capabilities

### `GET /capabilities`
Lists all known capabilities.

### `POST /register`
Registers a direct HTTP capability.

Example body:
```json
{
  "name": "custom_food_order",
  "description": "Food ordering tool",
  "endpoint": "http://127.0.0.1:3000/mock/food-order",
  "method": "POST",
  "input_schema": {"type": "object"},
  "output_schema": {"type": "object"},
  "auth_type": "none",
  "tags": ["food", "order"],
  "provider": "custom",
  "category": "food"
}
```

### `POST /discover`
Discovers and ranks capabilities.

Example body:
```json
{
  "query": "food order",
  "filters": {
    "provider": "mock_public_mcp",
    "category": "food",
    "source_type": "mcp"
  }
}
```

### `POST /execute`
Executes a capability.

Example body:
```json
{
  "capability_id": "<capability-id>",
  "payload": {
    "item": "pizza",
    "quantity": 1
  },
  "budget_limit_usd": 20,
  "execution_mode": "bounded_auto"
}
```

### `POST /execute/preview`
Returns the autonomy policy decision for a capability execution without executing it.

Money-involved tools default to `bounded_auto`. High-risk tools are blocked from `full_auto`.

### `GET /policy/tenant`
Returns the active tenant policy profile.

### `POST /policy/tenant`
Updates the tenant policy profile, including `max_execution_mode`, `rolling_budget_limit_usd`, `safest_selection_default`, and `blocked_risk_levels`.

Tenant policy profiles are now persisted in the local data layer.

### `GET /logs`
Lists execution logs.

## MCP Servers

### `GET /mcp/servers`
Lists registered MCP servers.

### `POST /mcp/servers`
Registers an MCP server.

### `PATCH /mcp/servers/:serverId/trust`
Updates trust and sync permissions.

### `PATCH /mcp/servers/:serverId/disable`
Disables a server and removes imported tools.

### `PATCH /mcp/servers/:serverId/enable`
Re-enables a server and resyncs tools.

### `DELETE /mcp/servers/:serverId`
Deletes an MCP server.

### `POST /mcp/servers/:serverId/health`
Checks health for one server.

### `POST /mcp/servers/health`
Checks health for all servers.

### `POST /mcp/servers/:serverId/sync`
Syncs one server.

### `POST /mcp/servers/sync`
Bulk syncs trusted servers.

## Catalog

### `GET /catalog/mcp`
Lists seedable trusted MCP catalog entries.

The catalog now includes a curated market view of existing MCP servers and collections from providers such as GitHub, Perplexity, Firecrawl, BrowserStack, SmartBear, AWS, Oracle, and Brave. Some entries are informational and marked for manual setup rather than automatic seeding.

### `POST /catalog/mcp/seed`
Seeds catalog entries into the system.

Only entries marked as directly seedable are auto-registered. Providers that require credentials, local stdio setup, OAuth, or custom deployment are returned as manual-setup catalog items and skipped during seed.

## Agents

### `GET /agents`
Lists registered agents.

### `POST /agents/register`
Registers an agent.

Example body:
```json
{
  "name": "planner_agent",
  "description": "Planning and orchestration agent",
  "endpoint": "http://agent.local/planner",
  "protocol": "http",
  "trust_score": 0.9,
  "tags": ["planner"],
  "capabilities": ["planning"]
}
```

### `POST /agents/discover`
Discovers agents by query.

## Messages

### `POST /messages`
Sends a message between agents.

Example body:
```json
{
  "from_agent_id": "<agent-id>",
  "to_agent_id": "<agent-id>",
  "subject": "Plan",
  "body": "Execute step 1",
  "delivery_mode": "webhook",
  "scheduled_for": "2026-04-10T10:00:00.000Z",
  "max_attempts": 3
}
```

### `GET /messages/inbox/:agentId`
Lists inbox messages for an agent.

### `GET /messages/threads/:threadId`
Lists messages in a conversation thread.

### `POST /messages/:messageId/ack`
Marks a message as acknowledged.

### `GET /messages/queue/delivery?before=<iso>`
Lists messages ready for delivery processing. Requires admin authentication.

### `POST /messages/queue/process`
Processes queued messages, updates attempts, and marks messages as delivered, rescheduled, or failed. Requires admin authentication.

Queued delivery currently posts JSON payloads to the target agent `endpoint` for `http` and `webhook` protocols.

## Analytics

### `GET /analytics/summary`
Overall system analytics.

Supports optional `from` and `to` ISO date query parameters.

### `GET /analytics/capabilities`
Per-capability analytics.

Supports `from`, `to`, `limit`, and `offset`.

### `GET /analytics/servers`
Per-server analytics.

Supports `from`, `to`, `limit`, and `offset`.

### `GET /analytics/top-tools?limit=5`
Most-used tools.

### `GET /analytics/top-queries?limit=10`
Most common discovery queries.

### `GET /analytics/trends/executions`
Daily execution trend buckets with totals, success/failure counts, and average latency.

### `GET /analytics/policy`
Returns policy-oriented analytics such as spend over the last 24 hours and 7 days, plus execution counts by autonomy mode.

## Audit

### `GET /audit`
Lists audit log entries.

## Users

### `POST /users/register`
Registers a local Sound Net user and returns an API token.

Users, agents, and messages are tenant-scoped through `x-tenant-id`.

Example body:

```json
{
  "name": "Ops Admin",
  "email": "ops@soundnet.dev",
  "role": "admin"
}
```

Example response:

```json
{
  "id": "<user-id>",
  "email": "ops@soundnet.dev",
  "name": "Ops Admin",
  "role": "admin",
  "api_token": "<api-token>",
  "created_at": "2026-04-10T00:00:00.000Z"
}
```

### `GET /users/me`
Returns the currently authenticated user.

### `GET /users`
Lists all users. Requires an authenticated admin user token.

### `POST /users/:userId/rotate-token`
Rotates a user's token and returns a new one. Requires an authenticated admin user token.

### `POST /users/:userId/revoke-token`
Revokes a user's token. Requires an authenticated admin user token.

## System

### `GET /system/scheduler`
Returns scheduler status.

Scheduler status now includes message delivery worker fields such as `delivery_interval_ms`, `delivery_running`, `last_delivery_run_at`, and `last_delivery_processed_count`.

### `POST /system/repair/backfill`
Repairs older capability records with missing metadata.
