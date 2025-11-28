# Production Setup Guide

This guide covers hosting the React frontend while Supabase provides the backend services (database, auth, storage).

## Prerequisites

- Supabase project provisioned (hosted or self-hosted)
- Docker Desktop (if using the provided `docker-compose.yml`)
- Node.js 18+ (for building locally)
- Supabase MCP connection in Cursor (for database management)

## 1. Configure Supabase

1. Use Supabase MCP tools in Cursor to manage the database:
   - View current schema: `mcp_supabase_list_tables`
   - Apply migrations: `mcp_supabase_apply_migration`
   - Check for security issues: `mcp_supabase_get_advisors`
   - Search documentation: `mcp_supabase_search_docs`
2. Ensure a storage bucket (default: `expense-files`) exists with appropriate policies.
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

## 5. GitHub Actions CI/CD (cloud VM)

Automated deployments are handled by `.github/workflows/frontend-deploy.yml`. The workflow runs on every push to `main` (and can also be triggered manually via **Run workflow**).

1. **Build job** – checks out the repo, installs Node 20 + dependencies inside `frontend/`, injects the Supabase environment variables, and runs `npm run build`. The generated `frontend/dist` directory is uploaded as an artifact.
2. **Deploy job** – runs only on the `main` branch, downloads the artifact, and uses `rsync` over SSH to sync the static bundle to your VM. An optional post-deploy command lets you reload nginx or restart a container once the files land on the server.

### Required GitHub secrets

- `VITE_SUPABASE_URL` – production Supabase URL
- `VITE_SUPABASE_ANON_KEY` – anon key used by the browser
- `VITE_SUPABASE_STORAGE_BUCKET` – bucket name (defaults to `expense-files`)
- `SSH_PRIVATE_KEY` – private key that can SSH into the VM (no passphrase)
- `DEPLOY_USER` – SSH user that owns the deploy directory
- `DEPLOY_HOST` – VM hostname or IP
- `DEPLOY_PATH` – absolute path served by nginx (e.g. `/var/www/accounting`)
- `DEPLOY_PORT` *(optional)* – SSH port if not `22`
- `POST_DEPLOY_COMMAND` *(optional)* – command run on the VM after rsync (e.g. `sudo systemctl reload nginx`)

### VM preparation checklist

- Create a deploy user with write access to `DEPLOY_PATH` and disable interactive password prompts for deployment commands (e.g. allow passwordless reload via sudoers).
- Install `rsync` and ensure the SSH key added to GitHub Secrets is present in `~/.ssh/authorized_keys`.
- Point nginx (or your static server) at `DEPLOY_PATH` so new builds are served immediately after rsync completes.

Once the secrets are configured, every push to `main` will build and publish the latest frontend bundle to the VM automatically. Use the `workflow_dispatch` trigger for ad-hoc deploys.

## 6. Post-deploy checklist

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
- Regularly review Supabase advisories using `mcp_supabase_get_advisors` in Cursor for security recommendations.

With Supabase handling the backend, deployment focuses solely on serving the React bundle and keeping the environment variables in sync with your Supabase project. Happy shipping!
