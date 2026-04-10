# API Reference

This document summarizes the major endpoints in Agent Network.

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

## System

### `GET /system/scheduler`
Returns scheduler status.

### `POST /system/repair/backfill`
Repairs older capability records with missing metadata.
