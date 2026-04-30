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
| GET | `/users/lookup-recipient?identifier=...` | Bearer access token |
| POST | `/users/update-password` | Bearer access token — body `{ "currentPassword", "newPassword" }` |
| GET | `/resources/envelopes` | Bearer access token |
| GET | `/resources/partners` | Bearer access token |
| POST | `/resources/transfers` | Bearer access token |

Optional first admin: set `SEED_DEFAULT_ADMIN=true` plus `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`.

In non-production mode, `/auth/forgot-password` returns `resetToken` in the JSON response for local testing. In production, send this token by email instead.

## Auth and identifier conventions

- `POST /auth/login` accepts:
  - `identifier` (preferred): email or phone number.
  - `email` (legacy/deprecated): still accepted for older clients.
  - `password` (required).
- Phone login normalizes input to digits (`+213 555...` and `213555...` are treated the same).
- Login by `referenceId` is intentionally not supported.

### User IDs in responses

- `id`: public UUID (`users.public_id`) intended for client-facing display.
- `dbUserId`: internal numeric primary key (`users.id`) for server-side relations.
- `referenceId`: short human-friendly recipient handle used in lookup/transfer flows.

### Recipient lookup

`GET /users/lookup-recipient?identifier=...` resolves recipient by:
1. email (if `identifier` contains `@`);
2. otherwise `referenceId` or normalized phone digits.

Returns `404` with code `recipient_not_found` when no match exists.

### Transfer endpoint scope

- `POST /resources/transfers` is a resource-layer create endpoint.
- Sender credential re-check (password/biometric) is expected to be enforced by the caller flow before hitting this endpoint.

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
