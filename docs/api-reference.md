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
  }
}
```

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

### `POST /catalog/mcp/seed`
Seeds catalog entries into the system.

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
  "body": "Execute step 1"
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

## Analytics

### `GET /analytics/summary`
Overall system analytics.

### `GET /analytics/capabilities`
Per-capability analytics.

### `GET /analytics/servers`
Per-server analytics.

### `GET /analytics/top-tools?limit=5`
Most-used tools.

### `GET /analytics/top-queries?limit=10`
Most common discovery queries.

## Audit

### `GET /audit`
Lists audit log entries.

## Users

### `POST /users/register`
Registers a local Sound Net user and returns an API token.

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

### `POST /system/repair/backfill`
Repairs older capability records with missing metadata.
