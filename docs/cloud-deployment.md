# Cloud Deployment

This guide shows how to prepare Sound Net for common cloud platforms.

## Common requirements

Set these environment variables in every provider:

- `NODE_ENV=production`
- `APP_BASE_URL`
- `DATABASE_URL`
- `API_KEY`
- `ADMIN_API_KEY`
- `RATE_LIMIT_PER_MINUTE`
- `MCP_HEALTH_INTERVAL_MS`
- `MCP_SYNC_INTERVAL_MS`

## Render

Files included:

- `render.yaml`

What it sets up:

- web service from Dockerfile
- managed Postgres
- `/health` health check

## Railway

Files included:

- `railway.json`

Use Railway to:

- deploy the Dockerfile
- attach a Postgres database
- set required environment variables in the Railway dashboard

## Fly.io

Files included:

- `fly.toml`

Use Fly to:

- launch the app container
- attach a managed Postgres instance separately
- set secrets using `fly secrets set`

Example:

```bash
fly secrets set \
  APP_BASE_URL=https://your-app.fly.dev \
  DATABASE_URL=postgres://... \
  API_KEY=your_api_key \
  ADMIN_API_KEY=your_admin_key
```

## Recommended order

1. deploy app
2. provision Postgres
3. set env vars/secrets
4. run bootstrap if needed:

```bash
npm run db:bootstrap
```

5. verify:

- `GET /health`
- `GET /ready`

## Notes

- use a managed Postgres service in cloud
- do not commit real keys to git
- set `APP_BASE_URL` to the real public HTTPS URL
- rotate admin and API keys after first deployment
