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

## Tech stack

Node.js 20 · Express 5 · PostgreSQL 16 · Prisma 6 · Zod · pino · Docker

## Prerequisites

- Node.js 20+
- Docker (for PostgreSQL, or full stack)

## Getting started

### Local development

```powershell
cp .env.example .env
docker compose up postgres -d
npm install
npm run dev
```

| Service | URL |
|---------|-----|
| API | `http://localhost:3000` |
| PostgreSQL (host) | `localhost:5433` |

Migrations run automatically on server boot.

### Docker (API + database)

```powershell
docker compose up
```

Inside Compose, Postgres listens on `5432`; the app uses the connection string from `docker-compose.yml`.

## Configuration

Copy `.env.example` to `.env`.

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

### Examples

```powershell
$headers = @{ "X-API-Key" = "dev-api-key-change-in-production" }

# Append
Invoke-RestMethod -Uri http://localhost:3000/log -Method POST -Headers $headers `
  -ContentType "application/json" `
  -Body '{"actor":"user:42","action":"document.upload","payload":{"doc_id":"abc"}}'

# Read & verify
Invoke-RestMethod -Uri http://localhost:3000/log/1 -Headers $headers
Invoke-RestMethod -Uri http://localhost:3000/verify -Headers $headers

# Export
Invoke-RestMethod -Uri "http://localhost:3000/export?actor=user:42" -Headers $headers
```

## Implementation notes

- **Append-only enforcement** — DB triggers reject `UPDATE` and `DELETE`; writes go through `POST /log` only.
- **Hash chain** — Canonical JSON (stable key order) hashed with SHA-256; genesis entries use `prevHash = "GENESIS"`.
- **Verification split** — Per-entry checks on `GET /log/:id`; full scan on `GET /verify` (stops at first break).
- **Schema tooling** — Prisma for migrations and queries; raw SQL migration for append-only triggers where ORM cannot enforce immutability.
- **Security defaults** — Helmet, request IDs, timing-safe API key compare, structured errors via pino.

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

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with nodemon |
| `npm start` | Production start |
| `npm run migrate` | Apply Prisma migrations |
