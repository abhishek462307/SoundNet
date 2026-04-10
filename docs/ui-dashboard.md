# Sound Net UI Dashboard

The Sound Net operator dashboard is a Vite + React frontend in `web/`.

## What it includes today

Phase 5 provides:

- connection settings for base URL, API key, admin key, user token, and tenant id
- saved environment presets in the browser
- overview health and readiness status
- analytics summary
- top tools and policy analytics snapshot
- capability registration UI
- capability browsing with execution preview
- recent execution log visibility
- MCP server table with admin actions
- tenant policy editor
- agent registration and message sending
- inbox and thread viewer
- delivery queue view and manual processing trigger
- user registration and token lifecycle actions
- audit log viewer
- scheduler status viewer
- repair backfill trigger

## Local development

From the repo root:

```bash
npm install
npm --prefix web install
npm run dev
npm run dev:web
```

Default URLs:

- backend: `http://127.0.0.1:3000` or next available port
- frontend: `http://127.0.0.1:5173`

## Dashboard usage

1. Open the frontend in your browser
2. Enter the running Sound Net base URL
3. Add `API_KEY` if your backend requires `x-api-key`
4. Add `ADMIN_API_KEY` to unlock analytics, policy, MCP admin actions, queue actions, audit, scheduler access, and repair actions
5. Add `x-user-token` if you want user-scoped operations like `/users/me` and admin role-protected user actions
6. Set a tenant id if you want tenant-scoped reads and writes
7. Optionally save the current environment as a reusable preset
8. Click `Refresh data`

## Current operator actions

### Environment management

- save a dashboard environment preset locally
- reload a saved preset
- delete a saved preset

### Capability operations

- register a capability
- inspect capabilities
- preview execution policy
- inspect recent execution logs
- trigger repair backfill

### Tenant policy

- view current tenant policy
- set `max_execution_mode`
- set `rolling_budget_limit_usd`
- toggle `safest_selection_default`
- set `blocked_risk_levels`

### MCP fleet actions

- health check one server
- sync one server
- trust or untrust a server
- enable or disable a server

### Agent and messaging actions

- register an agent
- send a message between agents
- inspect inbox messages by agent
- inspect a conversation thread
- acknowledge a message
- inspect the delivery queue
- trigger queue processing

### User and ops actions

- register a user
- inspect the current authenticated user
- list tenant users when authenticated as admin
- rotate a user token
- revoke a user token
- inspect audit logs
- inspect scheduler status

## Current limitation

The current dashboard is still lightweight and does not yet expose:

- audit filtering and pagination
- system repair history/status
- richer creation forms for MCP servers
- multi-page routing and auth guards
- richer charting and time filters

## Next planned UI slices

- audit filtering and pagination
- MCP server creation form
- repair task history and status
- multi-page routing and auth guards
- charts and richer analytics visuals
