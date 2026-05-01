# AmanPay-back (Backend API)

Language: [English](#english) | [العربية](#العربية)

---

## English

Express + TypeScript + TypeORM API used by the AmanPay mobile app.

Repository name: `AmanPay-back`.

### Local setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env
```

Minimum required updates in `.env`:
- `JWT_ACCESS_SECRET` (32+ random chars)
- `DB_PASSWORD` / `DB_NAME` as needed

Recommended local values:
- `DB_SYNC=false`
- `RUN_MIGRATIONS_ON_START=true`
- `RUN_SEED_ON_START=true`
- `SEED_DEFAULT_ADMIN=true`
- `ADMIN_EMAIL=admin@example.com`
- `ADMIN_PASSWORD=change-me-8-chars-min`

3. Start DB + API:
```bash
docker compose up --build -d
docker compose logs -f api
```

4. Seed data:
```bash
npm run seed
```

Note: with `RUN_SEED_ON_START=true`, seeding also runs automatically when the API starts.

Seed includes:
- optional admin (when `SEED_DEFAULT_ADMIN=true`)
- 5 test users with wallets
- merchant categories: `AL`, `FO`, `TR`, `PC`, `HO`
- merchants: all-categories + sample category merchants

Test users:
- `user1@amanpay.test` / `12345678` / phone `10000001`
- `user2@amanpay.test` / `12345678` / phone `20000002`
- `user3@amanpay.test` / `12345678` / phone `30000003`
- `user4@amanpay.test` / `12345678` / phone `40000004`
- `user5@amanpay.test` / `12345678` / phone `50000005`

5. Verify:
- API root: [http://localhost:3000/api](http://localhost:3000/api)
- Health: [http://localhost:3000/api/health](http://localhost:3000/api/health)

### Scripts

- `npm run dev` - start API in watch mode
- `npm run build` - compile TypeScript
- `npm start` - run compiled server
- `npm run seed` - run seed entrypoint
- `npm run migration:run` - apply migrations
- `npm run migration:revert` - revert last migration
- `npm test` - run tests

### API notes

- API prefix: `/api`
- Login endpoint: `POST /auth/login` (`identifier` + `password`)
- API port: `3000`
- Public user payload includes:
  - `id` (public UUID)
  - `dbUserId` (internal numeric ID)
  - `referenceId` (human-friendly transfer identifier)

Active transfer flows:
- `POST /api/resources/transfers/simple`
- `POST /api/resources/transfers/envelope`
- category wallet:
  - `GET /api/resources/category-wallets/me`
  - `POST /api/resources/category-wallets/move-dynamic-to-main`
  - `POST /api/resources/category-wallets/pay-merchant`

Strict-unlock request path used by mobile:
- `POST /api/resources/money-requests`

### Troubleshooting

- If `column User.public_id does not exist`:
  - run `npm run migration:run` then `npm run seed`
- For stale local DB:
```bash
docker compose down -v
docker compose up --build -d
npm run seed
```

---

## العربية

خدمة Backend مبنية بـ Express + TypeScript + TypeORM وتخدم تطبيق AmanPay.

اسم المستودع: `AmanPay-back`.

### التشغيل المحلي

1) تثبيت الحزم:
```bash
npm install
```

2) إعداد البيئة:
```bash
cp .env.example .env
```

الحد الأدنى المطلوب في `.env`:
- `JWT_ACCESS_SECRET` (طول 32 حرفًا عشوائيًا أو أكثر)
- تعديل `DB_PASSWORD` / `DB_NAME` عند الحاجة

القيم الموصى بها محليًا:
- `DB_SYNC=false`
- `RUN_MIGRATIONS_ON_START=true`
- `RUN_SEED_ON_START=true`
- `SEED_DEFAULT_ADMIN=true`
- `ADMIN_EMAIL=admin@example.com`
- `ADMIN_PASSWORD=change-me-8-chars-min`

3) تشغيل قاعدة البيانات والـ API:
```bash
docker compose up --build -d
docker compose logs -f api
```

4) تشغيل البذور:
```bash
npm run seed
```

البيانات الافتراضية تشمل:
- مدير (اختياري) عند تفعيل `SEED_DEFAULT_ADMIN`
- 5 مستخدمين تجريبيين مع محافظ
- فئات تجار: `AL`, `FO`, `TR`, `PC`, `HO`
- تجار تجريبيون (شامل الفئات + فئات محددة)

5) التحقق:
- [http://localhost:3000/api](http://localhost:3000/api)
- [http://localhost:3000/api/health](http://localhost:3000/api/health)

### الأوامر

- `npm run dev` تشغيل التطوير
- `npm run build` بناء TypeScript
- `npm start` تشغيل النسخة المبنية
- `npm run seed` تشغيل البذور
- `npm run migration:run` تطبيق الهجرات
- `npm run migration:revert` التراجع عن آخر هجرة
- `npm test` تشغيل الاختبارات

### ملاحظات API

- بادئة جميع المسارات: `/api`
- تسجيل الدخول: `POST /auth/login`
- المنفذ: `3000`
- مسارات التحويل الحالية:
  - `POST /api/resources/transfers/simple`
  - `POST /api/resources/transfers/envelope`
  - `GET /api/resources/category-wallets/me`
  - `POST /api/resources/category-wallets/move-dynamic-to-main`
  - `POST /api/resources/category-wallets/pay-merchant`
  - `POST /api/resources/money-requests` (طلب فتح رصيد صارم)
