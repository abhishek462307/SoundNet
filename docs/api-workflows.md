# API Workflows

This guide explains the main workflows supported by Sound Net.

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
5. Inspect a conversation with `GET /messages/threads/:threadId`
6. Acknowledge receipt with `POST /messages/:messageId/ack`
7. Inspect the delivery queue with `GET /messages/queue/delivery`
8. Process scheduled and retryable messages with `POST /messages/queue/process`
9. Deliver queued webhook or HTTP messages to agent endpoints

## Operator auth workflow

1. Register an operator with `POST /users/register`
2. Save the returned `api_token`
3. Call `GET /users/me` with `Authorization: Bearer <token>`
4. Use an admin token for admin routes like `GET /users`
5. Rotate a credential with `POST /users/:userId/rotate-token`
6. Revoke a credential with `POST /users/:userId/revoke-token`

## Analytics workflow

Use:

- `GET /analytics/summary`
- `GET /analytics/capabilities`
- `GET /analytics/servers`
- `GET /analytics/top-tools`
- `GET /analytics/top-queries`
- `GET /analytics/trends/executions`

These endpoints help operators understand:

- what tools are used
- which servers are healthy
- what discovery demand looks like
- how capabilities perform over time
- how execution behavior changes across time windows
