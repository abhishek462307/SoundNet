# API Workflows

This guide explains the main workflows supported by Agent Network.

## Capability workflow

1. Register a direct HTTP capability with `POST /register`
2. Discover it with `POST /discover`
3. Execute it with `POST /execute`
4. Inspect logs with `GET /logs`

## MCP workflow

1. Register an MCP server with `POST /mcp/servers`
2. Check health with `POST /mcp/servers/:serverId/health`
3. Sync tools with `POST /mcp/servers/:serverId/sync`
4. Discover imported tools with `POST /discover`
5. Disable or enable the server using:
   - `PATCH /mcp/servers/:serverId/disable`
   - `PATCH /mcp/servers/:serverId/enable`

## Agent workflow

1. Register an agent with `POST /agents/register`
2. Discover it with `POST /agents/discover`
3. Send a message with `POST /messages`
4. Read inbox with `GET /messages/inbox/:agentId`

## Analytics workflow

Use:

- `GET /analytics/summary`
- `GET /analytics/capabilities`
- `GET /analytics/servers`
- `GET /analytics/top-tools`
- `GET /analytics/top-queries`

These endpoints help operators understand:

- what tools are used
- which servers are healthy
- what discovery demand looks like
- how capabilities perform over time
