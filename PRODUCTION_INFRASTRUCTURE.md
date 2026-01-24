# Cashual Production Infrastructure

> **Product URL**: [cashual.org](https://cashual.org)  
> **Blog**: [cashual.org/blog](https://cashual.org/blog)  
> **API**: [api.cashual.org](https://api.cashual.org)

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                              OCI ARM VPS (Coolify)                             │
│                                                                                │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────────────────┐   │
│  │   Frontend      │   │   Blog          │   │   Backend (Node.js)         │   │
│  │  (Static Site)  │   │  (Astro Blog)   │   │   (Docker Container)        │   │
│  │                 │   │                 │   │                             │   │
│  │ cashual.org     │   │ cashual.org/blog│   │   api.cashual.org          │   │
│  │ nginx:alpine    │   │ nginx:alpine    │   │   node:20-alpine           │   │
│  └────────┬────────┘   └────────┬────────┘   └──────────────┬──────────────┘   │
│           │                     │                           │                  │
└───────────┼─────────────────────┼───────────────────────────┼──────────────────┘
            │                     │                           │
            └─────────────────────┴───────────────────────────┘
                                  │
                                  ▼
                          ┌───────────────┐
                          │   Supabase    │
                          │    Cloud      │
                          │               │
                          │  - Postgres   │
                          │  - Auth       │
                          │  - Storage    │
                          │  - Realtime   │
                          └───────────────┘
```

---

## Hosting Stack

| Component | Provider | Technology |
|-----------|----------|------------|
| **Database & Auth** | Supabase Cloud | PostgreSQL, Supabase Auth, Storage |
| **Infrastructure** | Oracle Cloud (OCI) | ARM-based VPS |
| **Orchestration** | Coolify | Self-hosted PaaS (running on same VPS) |
| **Frontend** | Coolify | Nixpacks → nginx:alpine |
| **Blog** | Coolify | Nixpacks → nginx:alpine |
| **Backend** | Coolify | Dockerfile → node:20-alpine |

---

## Tech Stack

### Frontend (`/frontend`)
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 3.4 + tailwindcss-animate
- **UI Components**: Radix UI primitives (Dialog, Dropdown, Tabs, Toast, etc.)
- **State Management**: TanStack React Query
- **Data Tables**: TanStack React Table
- **Animation**: Framer Motion
- **Routing**: React Router DOM 7
- **Icons**: Lucide React
- **Charts**: Recharts
- **PDF Generation**: jspdf, @react-pdf/renderer
- **PWA**: vite-plugin-pwa
- **Testing**: Vitest + Playwright

### Backend (`/backend`)
- **Runtime**: Node.js 20 LTS
- **Framework**: Express.js 5
- **AI/OCR**: Google Generative AI (Gemini) for receipt scanning
- **Email**: Resend
- **Push Notifications**: web-push (VAPID)
- **Security**: Helmet.js, cors, express-rate-limit (100 requests/15 min)
- **File Parsing**: pdf-parse, csv-parse, ofx
- **Database Client**: @supabase/supabase-js

### Blog (Separate Repository: `narasimha3679/cashual-blog`)
- **Framework**: Astro
- **Build Output**: Static HTML

---

## Supabase Cloud

Supabase provides the following managed services (no self-hosting required):

| Service | Usage |
|---------|-------|
| **PostgreSQL** | Primary database with Row-Level Security (RLS) |
| **Auth** | User authentication (email, magic link, OAuth) |
| **Storage** | File uploads (receipts, documents) - bucket: `expense-files` |
| **Realtime** | Live subscriptions for data changes |

### Why Node Server Instead of Edge Functions?
The Node.js backend in this repo replaces Supabase Edge Functions to:
- Consolidate server logic in one codebase
- Use npm packages not available in Deno (ofx, pdf-parse)
- Have more control over the runtime environment
- Easier local development and debugging

### Supabase MCP Tools (for Cursor IDE)
```
mcp_supabase_list_tables      # View current schema
mcp_supabase_apply_migration  # Apply migrations
mcp_supabase_get_advisors     # Check for security issues
mcp_supabase_search_docs      # Search documentation
```

---

## Coolify Configuration

### Frontend App
| Setting | Value |
|---------|-------|
| **Name** | `narasimha3679/accounting:main-*` |
| **Build Pack** | Nixpacks |
| **Static Image** | `nginx:alpine` |
| **Domain** | `https://cashual.org` |
| **Direction** | Allow www & non-www |
| **Base Directory** | `/frontend` |
| **Publish Directory** | `/dist` |
| **Install Command** | `npm i` |
| **Build Command** | `npm run build` |

**Custom Nginx Configuration:**
```nginx
server {
    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri.html $uri/index.html $uri/index.htm $uri/ =404;
    }

    error_page 404 /404.html;
    location = /404.html {
        root /usr/share/nginx/html;
        internal;
    }

    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
        internal;
    }
}
```

---

### Blog App
| Setting | Value |
|---------|-------|
| **Name** | `narasimha3679/cashual-blog:main-*` |
| **Build Pack** | Nixpacks |
| **Static Image** | `nginx:alpine` |
| **Domain** | `https://cashual.org/blog` |
| **Direction** | Allow www & non-www |
| **Base Directory** | `/` |
| **Publish Directory** | `/dist` |
| **Install Command** | `npm install` |
| **Build Command** | `npm run build` |

**Custom Nginx Configuration:**
```nginx
server {
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    error_page 404 /404.html;
    location = /404.html {
        root /usr/share/nginx/html;
        internal;
    }

    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
        internal;
    }
}
```

---

### Backend App
| Setting | Value |
|---------|-------|
| **Name** | `backend` |
| **Description** | Node backend |
| **Build Pack** | Dockerfile |
| **Domain** | `https://api.cashual.org` |
| **Direction** | Allow www & non-www |
| **Base Directory** | `/backend` |
| **Dockerfile Location** | `/Dockerfile` |
| **Port** | `3001` |

**Dockerfile:**
```dockerfile
FROM node:20-alpine

RUN apk add --no-cache python3 make g++ && rm -rf /var/cache/apk/*

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

EXPOSE 3001
CMD ["node", "server.js"]
```

---

## Environment Variables

### Frontend (Coolify)
```bash
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_SUPABASE_STORAGE_BUCKET=expense-files
VITE_BACKEND_URL=https://api.cashual.org
```

### Backend (Coolify)
```bash
# Server
PORT=3001
FRONTEND_URL=https://cashual.org

# Supabase
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Google Gemini (OCR/AI)
GOOGLE_API_KEY=<gemini-api-key>

# Email (Resend)
RESEND_API_KEY=<resend-api-key>
RESEND_FROM_EMAIL=onboarding@resend.dev

# Push Notifications (VAPID)
VAPID_PUBLIC_KEY=<vapid-public-key>
VAPID_PRIVATE_KEY=<vapid-private-key>
VAPID_SUBJECT=mailto:support@cashual.org
```

> **Important**: Never commit secrets to Git. Use Coolify's environment variable management.

---

## Deployment

Deployment is fully automated via **Coolify webhooks** - no GitHub Actions or CI/CD pipelines needed.

### How It Works
1. **Push** code to `main` branch
2. **Coolify webhook** detects the push automatically
3. **Coolify builds** the image:
   - Frontend/Blog: Nixpacks → nginx:alpine static site
   - Backend: Dockerfile → node:20-alpine container
4. **Coolify deploys** to the respective domain
5. **SSL renewed** automatically via Let's Encrypt

### Manual Trigger
1. Go to Coolify dashboard
2. Navigate to the application
3. Click "Deploy" or "Rebuild"

> **Note**: All builds and deployments happen on the OCI VPS itself via Coolify. No external CI/CD runners are used.

### CORS Configuration
The backend uses `FRONTEND_URL` for CORS:
```javascript
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
```

---

## DNS & SSL

All domains point to the OCI VPS IP, with Coolify's Traefik handling routing:

| Domain | Routes To |
|--------|-----------|
| `cashual.org` | Frontend (nginx) |
| `www.cashual.org` | Frontend (nginx) |
| `cashual.org/blog` | Blog (nginx) |
| `api.cashual.org` | Backend (Node.js:3001) |

SSL certificates are provisioned automatically via **Let's Encrypt** through Coolify.

---

## Local Development

```bash
# Frontend (http://localhost:5173)
cd frontend && npm run dev

# Backend (http://localhost:3001)
cd backend && npm start
```

### Local Environment Files
```bash
# Copy example env files
cp env.production.example frontend/.env
cp backend/.env.example backend/.env
```

---

## Troubleshooting

### Backend Issues
| Problem | Solution |
|---------|----------|
| **Backend not starting** | Check Coolify logs, verify env vars, ensure Dockerfile exists |
| **"Dockerfile not found"** | Ensure `backend/Dockerfile` is committed and pushed to Git |
| **Port conflicts** | Verify port in Coolify matches `PORT` env var |
| **Health check fails** | Check if `/health` route is accessible without auth |
| **Native module errors** | Dockerfile includes python3/make/g++ for compilation |

### Frontend Issues
| Problem | Solution |
|---------|----------|
| **Can't connect to backend** | Verify `VITE_BACKEND_URL` is set correctly |
| **CORS errors** | Ensure `FRONTEND_URL` in backend matches exactly (with `https://`) |
| **Env vars not working** | Rebuild frontend (Vite bakes vars at build time) |
| **Mixed content errors** | Ensure `VITE_BACKEND_URL` uses `https://` |

### Supabase Issues
| Problem | Solution |
|---------|----------|
| **Auth failures** | Confirm anon key matches project, check auth providers |
| **RLS errors** | Review policies in dashboard, check `profiles` table links |
| **Storage issues** | Check bucket policies, confirm bucket name matches env var |

### General Issues
| Problem | Solution |
|---------|----------|
| **SSL certificate problems** | Wait for Let's Encrypt, check DNS records |
| **Build failures** | Check Coolify logs, verify dependencies in package.json |

---

## Security Checklist

- [ ] Enforce strong password policies in Supabase Auth
- [ ] Enable MFA for admin accounts
- [ ] Keep Row-Level Security (RLS) enabled on all tables
- [ ] Review RLS policies during schema changes
- [ ] Limit storage bucket access to authenticated users
- [ ] Sanitize file names before upload
- [ ] Rotate anon key if leaked
- [ ] Never expose service-role key in frontend
- [ ] Keep Helmet.js enabled in backend
- [ ] Rate limiting is active (100 req/15 min)

---

## Monitoring

### Health Checks
```bash
curl https://api.cashual.org/health
# Returns: {"status":"ok"}
```

### Where to Monitor
- **Backend logs**: Coolify log viewer
- **Database metrics**: Supabase dashboard
- **Auth activity**: Supabase dashboard
- **Storage usage**: Supabase dashboard
- **Security advisories**: Run `mcp_supabase_get_advisors` in Cursor

---

## Repository Structure

```
accounting/
├── frontend/               # React + Vite frontend
│   ├── src/               # Source code
│   ├── public/            # Static assets
│   ├── dist/              # Build output (ignored)
│   └── package.json
├── backend/               # Node.js Express backend
│   ├── src/               # Source code
│   ├── Dockerfile         # Container definition
│   └── package.json
├── roadmap/               # Feature planning docs
├── analysis/              # Analysis scripts
└── INFRASTRUCTURE.md      # This file
```

**Blog** is in a separate repository: `narasimha3679/cashual-blog`

---

## Quick Reference

| What | Where | How |
|------|-------|-----|
| Database/Auth/Storage | Supabase Cloud | Managed by Supabase |
| Frontend + Blog + Backend | OCI ARM VPS | Managed by Coolify |
| Routing & SSL | Coolify (Traefik) | Automatic via Let's Encrypt |
| Deployments | Git push → Coolify | Webhook-triggered builds |

### Key URLs
- **Coolify Docs**: https://coolify.io/docs
- **Supabase Docs**: https://supabase.com/docs
