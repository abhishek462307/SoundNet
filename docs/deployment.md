# Deploying Sound Net

## Docker Compose

Start the app and PostgreSQL together:

```bash
docker compose up --build
```

## Database bootstrap

Bootstrap database tables:

```bash
npm run db:bootstrap
```

## Environment variables

Use `.env.example` as a reference.

Important values:

- `DATABASE_URL`
- `API_KEY`
- `ADMIN_API_KEY`
- `RATE_LIMIT_PER_MINUTE`
- `MCP_HEALTH_INTERVAL_MS`
- `MCP_SYNC_INTERVAL_MS`

## Health and readiness

### Liveness
```bash
GET /health
```

### Readiness
```bash
GET /ready
```

`/ready` returns `503` until startup work is complete and flips back to not ready during shutdown.

## Admin protection

MCP operator routes and analytics should be called with:

```http
x-admin-key: <ADMIN_API_KEY>
```
