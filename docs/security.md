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

### Security Headers
Sound Net uses `helmet` for standard HTTP security headers.

### Rate Limiting
Sound Net uses `express-rate-limit`.
