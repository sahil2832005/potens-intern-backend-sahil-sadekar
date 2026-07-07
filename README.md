# Tamper-Evident Append-Only Log Service

Production-oriented audit log API. Events are stored append-only and linked by a SHA-256 hash chain so integrity can be checked without trusting the server alone.

## Overview

Clients append `{ actor, action, payload }` records once. Each row references the previous entry hash. Read paths support single-entry verification, full-chain scan, and filtered export for audit workflows.

## System design

![System architecture](docs/architecture.png)

Architecture and diagram are self-made — sketched before any application code to fix layer boundaries, endpoint split, and request flow. Implementation follows that layout: Express handlers in `routes/`, domain logic in `services/`, crypto and persistence in `lib/`.

| Layer | Responsibility |
|-------|----------------|
| Routes | HTTP mapping, middleware chain |
| Services | Append, fetch, export, chain verification |
| Lib | SHA-256 hash chain, Prisma client, structured logging |
| Middleware | API key auth, Zod validation, POST rate limit |
| Database | PostgreSQL with append-only triggers |

- Append-only enforced in PostgreSQL (triggers), not only in application code.
- Prisma for schema/migrations; append-only rules applied via SQL migration.

## Tech stack

Node.js 20 · Express 5 · PostgreSQL 16 · Prisma 6 · Zod · pino · Docker

## Getting started

**Prerequisite:** Docker Desktop (or Docker Engine + Compose)

```bash
docker compose up --build
```

No `.env` file needed — config is in `docker-compose.yml`. Wait until app logs show `server started`.

| Service | URL |
|---------|-----|
| API | `http://localhost:3000` |
| PostgreSQL (host) | `localhost:5433` |

Test API key: `dev-api-key-change-in-production`

Continue with [API testing](#api-testing) in a second terminal.

## Configuration

When using `docker compose up`, variables are defined in `docker-compose.yml`. `.env.example` documents the same settings for reference.

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `API_KEY` | Shared secret; sent as `X-API-Key` |
| `PORT` | HTTP port (default `3000`) |
| `RATE_LIMIT_MAX` | Max POST `/log` requests per window |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in milliseconds |
| `LOG_LEVEL` | pino log level |

Protected routes require a valid `X-API-Key` header. `/health` and `/ready` are unauthenticated.

## API reference

### Operational

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Process liveness |
| `GET` | `/ready` | Database readiness (`503` if unavailable) |

### Log service

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/log` | Yes | Append event. Body: `{ actor, action, payload }`. Returns `201` with hash fields. Rate limited. |
| `GET` | `/log/:id` | Yes | Entry by ID plus `verification` (`hashValid`, `chainValid`, `verified`). |
| `GET` | `/verify` | Yes | Full chain scan. Returns `valid`, `totalEntries`, `firstBrokenId`, `reason`. |
| `GET` | `/export` | Yes | Filtered export. Query: `from`, `to` (ISO 8601), `actor`. Returns `{ count, entries }`. |

## API testing

Use a **second terminal** while the stack from [Getting started](#getting-started) is running.

Set variables once:

```bash
export BASE_URL=http://localhost:3000
export API_KEY=dev-api-key-change-in-production
```

Windows PowerShell (`curl.exe`):

```powershell
$env:BASE_URL = "http://localhost:3000"
$env:API_KEY = "dev-api-key-change-in-production"
```

### 1. Health checks (no auth)

```bash
curl -s "$BASE_URL/health"
curl -s "$BASE_URL/ready"
```

```powershell
curl.exe -s "$env:BASE_URL/health"
curl.exe -s "$env:BASE_URL/ready"
```

### 2. Append log entries

Creates a fresh chain from genesis. Run both commands in order.

```bash
curl -s -X POST "$BASE_URL/log" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"actor":"user:42","action":"document.upload","payload":{"doc_id":"abc"}}'

curl -s -X POST "$BASE_URL/log" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"actor":"admin:raj","action":"user.login","payload":{"ip":"10.0.0.1"}}'
```

```powershell
curl.exe -s -X POST "$env:BASE_URL/log" -H "X-API-Key: $env:API_KEY" -H "Content-Type: application/json" -d "{\"actor\":\"user:42\",\"action\":\"document.upload\",\"payload\":{\"doc_id\":\"abc\"}}"
curl.exe -s -X POST "$env:BASE_URL/log" -H "X-API-Key: $env:API_KEY" -H "Content-Type: application/json" -d "{\"actor\":\"admin:raj\",\"action\":\"user.login\",\"payload\":{\"ip\":\"10.0.0.1\"}}"
```

Expected: `201` with `id`, `prevHash`, `entryHash`. First entry has `prevHash: "GENESIS"`.

### 3. Get entry by ID (with verification)

```bash
curl -s "$BASE_URL/log/1" -H "X-API-Key: $API_KEY"
curl -s "$BASE_URL/log/2" -H "X-API-Key: $API_KEY"
```

```powershell
curl.exe -s "$env:BASE_URL/log/1" -H "X-API-Key: $env:API_KEY"
curl.exe -s "$env:BASE_URL/log/2" -H "X-API-Key: $env:API_KEY"
```

Expected: `verification.verified` is `true` when the chain is intact.

### 4. Verify full chain

```bash
curl -s "$BASE_URL/verify" -H "X-API-Key: $API_KEY"
```

```powershell
curl.exe -s "$env:BASE_URL/verify" -H "X-API-Key: $env:API_KEY"
```

Expected after step 2: `{"valid":true,"totalEntries":2,"firstBrokenId":null}`

### 5. Export entries

```bash
# All entries
curl -s "$BASE_URL/export" -H "X-API-Key: $API_KEY"

# Filter by actor
curl -s "$BASE_URL/export?actor=user:42" -H "X-API-Key: $API_KEY"

# Filter by date range (ISO 8601)
curl -s "$BASE_URL/export?from=2026-01-01T00:00:00.000Z&to=2026-12-31T23:59:59.999Z" -H "X-API-Key: $API_KEY"
```

```powershell
curl.exe -s "$env:BASE_URL/export" -H "X-API-Key: $env:API_KEY"
curl.exe -s "$env:BASE_URL/export?actor=user:42" -H "X-API-Key: $env:API_KEY"
```

Expected: `{"count":2,"entries":[...]}` (count depends on filters).

### Inspect database (optional)

With the stack running, from the project root (requires Node.js installed locally):

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/auditlog npx prisma studio
```

Opens a browser UI at `http://localhost:5555` to view `log_entries`. Not required for API testing.

## Testing reports

| Report | Link |
|--------|------|
| QA Test Report | [View report](https://sahilsadekar249775.atlassian.net/wiki/spaces/MFS/pages/524289) |
| Security Test Report | [View report](https://sahilsadekar249775.atlassian.net/wiki/spaces/MFS/pages/557057) |

## Repository structure

```
src/
├── server.js, app.js
├── config/
├── routes/          log, verify, export
├── services/        log.service.js, verify.service.js
├── lib/             hash-chain.js, prisma.js, logger.js
├── middleware/
└── validators/
prisma/migrations/
docker/
docs/architecture.png
```

## Gaps / unfinished

- Stretch goals not implemented: `npm run verify` CLI, Merkle-style batch verification.
- Minor: malformed JSON returns `INTERNAL_ERROR`; unsupported HTTP methods return 404.

## Next steps

- CI on push, production secret management, GET rate limits, export pagination.

## AI use log

| Tool | Approx usage | Used for |
|------|--------------|----------|
| Cursor | ~70 messages (~150k tokens) | Express/Prisma scaffold, Docker & Express 5 fixes, concurrency lock, README |
| Docker MCP | Local agent sessions | Container stack inspection and compose workflow from IDE |
| AI-assisted pen test (Burp + MITM proxies) | Lab runs | Auth bypass, header tampering, request replay on in-scope APIs |
| Agent harness — security code review | Targeted passes | Middleware, auth, and input-validation review |
| CrowdStrike security agent | Lab monitoring | Runtime posture checks in isolated local environment |
| OWASP security agent | Checklist-driven review | OWASP Top 10 mapping for REST API endpoints |
| Wiz (IaC misconfiguration scan) | Config review | Docker Compose and deployment config hygiene |
| Trivy | Image scans | Container image vulnerability scanning |
| Docker Scout | Image analysis | Base image and dependency risk signals |
| Docker Gordon (AI base scans) | Image review | Base-image and Dockerfile hardening suggestions |
| Custom self-hosted lab tools | Local isolation | Private security toolchain — no production data |

Architecture, append-only DB design, and hash-chain model were planned manually before implementation.
