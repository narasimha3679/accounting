# Production Setup Guide

This guide covers hosting the React frontend while Supabase provides the backend services (database, auth, storage).

## Prerequisites

- Supabase project provisioned (hosted or self-hosted)
- Docker Desktop (if using the provided `docker-compose.yml`)
- Node.js 18+ (for building locally)
- Supabase CLI (optional, recommended for schema management)

## 1. Configure Supabase

1. Apply the schema and policies:
   ```bash
   cd supabase
   supabase db push   # if using Supabase CLI linked to /supabase-mpc
   ```
   or copy the SQL from `supabase/sql/*.sql` into the Supabase dashboard.
2. Create a storage bucket (default `expense-files`) and apply the storage policies.
3. Note your project URL and anon key from the Supabase dashboard – they will be needed by the frontend.

## 2. Prepare environment variables

Copy the sample file and edit it with your Supabase values:

```bash
cp env.production.example frontend/.env
```

`frontend/.env` must contain:

```
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_SUPABASE_STORAGE_BUCKET=expense-files
```

> Never commit private keys. Use secrets management in your hosting provider for production deployments.

## 3. Build the frontend

```bash
npm run build
# output: frontend/dist
```

You can deploy these static files to any CDN or run them via Docker.

## 4. Deploy with Docker (optional)

The included `docker-compose.yml` builds the frontend image and serves it through nginx.

```bash
docker-compose up --build -d
```

Access the app at http://localhost. All API calls go directly from the browser to Supabase.

### Useful Docker commands

```bash
docker-compose logs -f frontend   # tail logs
docker-compose restart frontend   # restart container
docker-compose down               # stop and remove container
```

## 5. Post-deploy checklist

- Create initial accounts through Supabase Auth (email magic link, password, etc.).
- Seed baseline data using SQL scripts or the Supabase table editor.
- Verify file uploads reach the configured storage bucket.
- Enable a custom domain + HTTPS on your hosting provider.

## Troubleshooting

- **Auth failures**: Confirm the anon key matches the Supabase project and that email auth providers are enabled.
- **RLS errors**: Review policies in the Supabase dashboard logs; make sure the `profiles` table links users to companies.
- **Storage issues**: Check bucket policies and confirm the bucket name matches `VITE_SUPABASE_STORAGE_BUCKET`.
- **Network errors**: Ensure the frontend is served over HTTPS when calling a Supabase project that enforces HTTPS.

## Security Checklist

1. Enforce strong password policies and enable MFA in Supabase Auth.
2. Keep Row-Level Security enabled on every table and review policies during changes.
3. Limit storage bucket access to authenticated users and sanitize file names before upload.
4. Rotate the anon key if it leaks and avoid exposing the service-role key in the frontend.

## Monitoring & Maintenance

- Use the Supabase dashboard metrics for database performance, auth activity, and storage usage.
- Set up alerts for approaching plan limits (row count, bandwidth, etc.).
- Regularly review Supabase advisories (`supabase projects list --advisory` via CLI) for security recommendations.

With Supabase handling the backend, deployment focuses solely on serving the React bundle and keeping the environment variables in sync with your Supabase project. Happy shipping!
