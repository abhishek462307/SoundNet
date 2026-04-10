# Sound Net Security

This document describes the current security posture and what remains to be done.

## Current protections

### API Key Protection
If `API_KEY` is set, API requests must include:

```http
x-api-key: <value>
```

### Admin Protection
If `ADMIN_API_KEY` is set, admin routes require:

```http
x-admin-key: <value>
```

### User Token Authentication
Sound Net also supports built-in user authentication.

Register a user:

```http
POST /users/register
```

Use the returned token with either:

```http
Authorization: Bearer <api_token>
```

or:

```http
x-user-token: <api_token>
```

When a valid admin user token is present, Sound Net grants admin access without requiring `x-admin-key`.

### Current RBAC Rules
- `user` can access `GET /users/me`
- `admin` can access `GET /users`
- `admin` can access admin-protected analytics, audit, MCP management, and system routes

### Security Notes
- user tokens are randomly generated UUID credentials
- tokens are currently stored directly in the backing store
- this is suitable for MVP and self-hosted deployments, but production hardening should include hashing, rotation, revocation, and external identity integration

### Security Headers
Sound Net uses `helmet` for standard HTTP security headers.

### Rate Limiting
Sound Net uses `express-rate-limit`.

## Operational Hardening

Sound Net now supports configurable background message delivery processing with retry backoff. For production-style deployments, tune:

- `MESSAGE_DELIVERY_INTERVAL_MS`
- `MESSAGE_RETRY_BASE_DELAY_MS`

These settings help operators control queue drain behavior and retry pressure on downstream agents.
