# AmanPay API (Backend)

Express + TypeScript + TypeORM API used by the AmanPay mobile app.

## Step-by-step local setup

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment

```bash
cp .env.example .env
```

Update `.env` at minimum:

- `JWT_ACCESS_SECRET` with 32+ random chars
- `DB_PASSWORD` / `DB_NAME` if needed

Recommended local values:

- `DB_SYNC=false`
- `RUN_MIGRATIONS_ON_START=true`
- `SEED_DEFAULT_ADMIN=true`
- `ADMIN_EMAIL=admin@example.com`
- `ADMIN_PASSWORD=change-me-8-chars-min`

### 3) Start PostgreSQL + API containers

```bash
docker compose up --build -d
docker compose logs -f api
```

### 4) Seed data (admin + 5 test users)

```bash
npm run seed
```

This seed command runs migrations (based on env), then creates:

- optional admin (if `SEED_DEFAULT_ADMIN=true`)
- 5 test users with wallets

Test users:

- `user1@amanpay.test` / `12345678` / phone `10000001`
- `user2@amanpay.test` / `12345678` / phone `20000002`
- `user3@amanpay.test` / `12345678` / phone `30000003`
- `user4@amanpay.test` / `12345678` / phone `40000004`
- `user5@amanpay.test` / `12345678` / phone `50000005`

Each test wallet gets a random integer balance between `1000` and `10000` (DB may display as `.00` because column type is decimal).

### 5) Verify backend

- API root: [http://localhost:5000/api](http://localhost:5000/api)
- Health: [http://localhost:5000/api/health](http://localhost:5000/api/health)

## Scripts

- `npm run dev`: start API in watch mode
- `npm run build`: compile TypeScript
- `npm start`: run compiled server
- `npm run seed`: run seeding entrypoint
- `npm run migration:run`: apply migrations
- `npm run migration:revert`: revert last migration
- `npm test`: run tests

## API notes

- API prefix is `/api`
- `POST /auth/login` accepts `identifier` (email or phone) + `password`
- Public user payload includes:
  - `id` (public UUID)
  - `dbUserId` (internal numeric ID)
  - `referenceId` (human-friendly transfer identifier)

## Troubleshooting

- `column User.public_id does not exist`:
  - run `npm run migration:run` then `npm run seed`
- stale local DB data:
  ```bash
  docker compose down -v
  docker compose up --build -d
  npm run seed
  ```
