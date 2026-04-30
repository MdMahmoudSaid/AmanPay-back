# Express TypeScript starter

Opinionated API skeleton: **Express 5**, **TypeScript**, **TypeORM (PostgreSQL)**, **JWT access tokens**, **opaque refresh tokens**, **Zod-backed env**, **Helmet**, **rate limiting on `/api/auth`**, **Pino HTTP logs**, **migrations**, and **Jest** smoke tests.

## Quick start

1. Copy `.env.example` to `.env` and set `JWT_ACCESS_SECRET` (32+ characters) and database fields.
2. Create the PostgreSQL database, then either:
   - **Recommended:** `DB_SYNC=false`, `RUN_MIGRATIONS_ON_START=true`, run `npm run dev` (migrations apply on boot), or run `npm run migration:run` manually.
   - **Local only:** `DB_SYNC=true` (never in production).
3. `npm install` → `npm run dev`.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | `tsx watch` on `src/server.ts` |
| `npm run build` / `npm start` | Compile to `dist/`, run compiled server |
| `npm test` | Jest (no DB required for health test) |
| `npm run migration:run` | Apply TypeORM migrations |
| `npm run migration:revert` | Revert last migration |

Generate a new migration after changing entities (path is the first positional argument):

```bash
npx typeorm-ts-node-commonjs migration:generate src/migrations/DescribeChange -d src/config/database.ts
```

## API (prefix `/api`)

| Method | Path | Auth |
|--------|------|------|
| GET | `/` | No |
| GET | `/health` | No — liveness |
| GET | `/health/ready` | No — DB `SELECT 1` |
| POST | `/auth/register` | No |
| POST | `/auth/login` | No |
| POST | `/auth/forgot-password` | No — body `{ "email" }` |
| POST | `/auth/reset-password` | No — body `{ "resetToken", "newPassword" }` |
| POST | `/auth/refresh` | No — body `{ "refreshToken" }` |
| POST | `/auth/logout` | No — body `{ "refreshToken" }` (revokes) |
| GET | `/users/me` | Bearer access token |
| POST | `/users/update-password` | Bearer access token — body `{ "currentPassword", "newPassword" }` |

Optional first admin: set `SEED_DEFAULT_ADMIN=true` plus `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`.

In non-production mode, `/auth/forgot-password` returns `resetToken` in the JSON response for local testing. In production, send this token by email instead.

## Docker

Build and start API + PostgreSQL:

```bash
docker compose up --build
```

Then open:

- API: `http://localhost:5000/api`
- Health: `http://localhost:5000/api/health`

Notes:

- `docker-compose.yml` is env-driven: app/DB names, ports, and image can be changed via `.env`.
- Compose uses `DB_HOST_DOCKER` (default `postgres`), while local non-docker runs use `DB_HOST` (usually `localhost`).
- Set `JWT_ACCESS_SECRET` in `.env` before running.
