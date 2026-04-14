# Cashual Production Infrastructure

## Runtime Topology

- Frontend: `cashual.org` (React + Vite static build)
- API: `api.cashual.org` (Go service from `api/`)
- Database: Managed PostgreSQL (Coolify)
- Object storage: Backblaze B2 (S3-compatible)

```text
Browser -> Frontend (cashual.org) -> Go API (api.cashual.org) -> PostgreSQL
                                                      \-> Backblaze B2
```

## Services and Ownership

| Component | Provider | Notes |
|---|---|---|
| Frontend hosting | Coolify | Static build from `frontend/` |
| API hosting | Coolify | Containerized Go API from `api/` |
| PostgreSQL | Coolify managed DB | Source of truth for application data |
| Object storage | Backblaze B2 | Receipt and document object storage |

## Required API Environment Variables

```bash
DATABASE_URL=postgres://...
JWT_SECRET=<at-least-32-chars>
JWT_ISSUER=cashual-api
JWT_AUDIENCE=cashual-web
HTTP_ADDR=:8080
FRONTEND_URL=https://cashual.org
FRONTEND_URLS=https://cashual.org,https://www.cashual.org
RUN_MIGRATIONS=true
MIGRATIONS_PATH=file://migrations
```

Optional integrations:

```bash
# Backblaze B2
B2_S3_ENDPOINT=https://s3.us-west-000.backblazeb2.com
B2_REGION=us-west-000
B2_BUCKET=<bucket>
B2_KEY_ID=<key-id>
B2_APPLICATION_KEY=<app-key>

# OCR
GEMINI_API_KEY=<key>

# Email
RESEND_API_KEY=<key>
RESEND_FROM_EMAIL=onboarding@resend.dev

# Web push
VAPID_PUBLIC_KEY=<key>
VAPID_PRIVATE_KEY=<key>
VAPID_SUBJECT=mailto:support@cashual.org
```

## Required Frontend Environment Variables

```bash
VITE_API_URL=https://api.cashual.org
VITE_BACKEND_URL=https://api.cashual.org
VITE_STORAGE_BUCKET=expense-files
VITE_VAPID_PUBLIC_KEY=<public-vapid-key>
```

## Deployment

1. Push branch to repository.
2. Coolify builds:
   - frontend from `frontend/`
   - API from `api/`
3. API starts and runs in-repo migrations when `RUN_MIGRATIONS=true`.
4. Frontend points to API using `VITE_API_URL`.

## Migration and Data Lifecycle

- Supabase export/import is a one-time bootstrap process only.
- Ongoing schema changes must be in `api/migrations/`.
- Authorization is enforced in Go API code, not in browser-side RLS policies.

See:

- `docs/ARCHITECTURE.md`
- `docs/migrations/SUPABASE_TO_COOLIFY.md`
- `docs/RLS_AUTHORIZATION_MAP.md`
