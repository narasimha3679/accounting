# Coolify Deployment Guide

This guide covers deploying both the frontend (static site) and backend (Node.js Docker container) to Coolify.

## Architecture Overview

```
┌─────────────────┐         ┌─────────────────┐
│   Frontend      │         │    Backend      │
│  (Static Site)  │────────▶│  (Docker App)   │
│                 │  HTTPS  │                 │
│ yourdomain.com  │         │ api.yourdomain  │
└─────────────────┘         └─────────────────┘
       │                            │
       │                            │
       └──────────┬─────────────────┘
                  │
            ┌─────▼─────┐
            │  Supabase │
            │  (Cloud)  │
            └───────────┘
```

## Prerequisites

- Coolify instance running and accessible
- Git repository with your code
- Domain configured with DNS access
- Supabase project with all required keys
- Google Gemini API key (for OCR functionality)
- Resend API key (for email functionality)
- VAPID keys (for push notifications)

## Backend Deployment (Docker Container)

### Step 1: Create New Application in Coolify

1. Log into your Coolify dashboard
2. Navigate to your project/server
3. Click "New Resource" → "Application"
4. Select "Docker Compose" or "Dockerfile" deployment method

### Step 2: Configure Git Repository and Build Settings

1. Connect your Git repository
2. Select the branch (typically `main` or `master`)
3. **IMPORTANT**: Set the **Base Directory** to `/backend`
   - This tells Coolify to use the `backend/` directory as the build context
4. **IMPORTANT**: Set the **Dockerfile Location** to `Dockerfile` (relative to base directory)
   - Since Base Directory is `/backend`, the Dockerfile Location should be `Dockerfile` (not `/Dockerfile`)
   - This will look for `backend/Dockerfile` in your repository

**⚠️ Important**: Make sure you've pushed all changes to your Git repository, including:
- `backend/Dockerfile`
- `backend/.dockerignore`
- `backend/package.json` (with the start script)
- Any other backend files

Coolify pulls from your Git repository, so changes must be committed and pushed before deployment.

### Step 3: Configure Domain

1. Set the subdomain (e.g., `api` for `api.yourdomain.com`)
2. Enable HTTPS/SSL (Coolify will automatically provision Let's Encrypt certificates)
3. Note the full URL - you'll need this for the frontend configuration

### Step 4: Set Environment Variables

Add the following environment variables in Coolify's environment variable section:

#### Required Backend Environment Variables

```bash
# Server Configuration
PORT=3001
FRONTEND_URL=https://yourdomain.com

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Google Gemini API (for OCR)
GOOGLE_API_KEY=your_google_api_key_here

# Email Service (Resend)
RESEND_API_KEY=your_resend_api_key_here
RESEND_FROM_EMAIL=onboarding@resend.dev

# Push Notifications (VAPID)
VAPID_PUBLIC_KEY=your_vapid_public_key_here
VAPID_PRIVATE_KEY=your_vapid_private_key_here
VAPID_SUBJECT=mailto:support@yourdomain.com
```

**Important Notes:**
- `FRONTEND_URL` should be the full URL of your frontend (e.g., `https://yourdomain.com`)
- `PORT` may be overridden by Coolify - check the port mapping in Coolify's settings
- Never commit these values to Git - use Coolify's environment variable management

### Step 5: Configure Port

1. In Coolify, set the **Port** to `3001` (or the port your app listens on)
2. Coolify will automatically map this to the container
3. Verify the port mapping in the deployment settings

### Step 6: Deploy

1. Click "Deploy" or "Save & Deploy"
2. Coolify will:
   - Clone your repository
   - Build the Docker image using the Dockerfile
   - Start the container
   - Set up reverse proxy and SSL

### Step 7: Verify Backend Deployment

1. Check the health endpoint:
   ```bash
   curl https://api.yourdomain.com/health
   ```
   Should return: `{"status":"ok"}`

2. Check Coolify logs for any errors
3. Verify SSL certificate is active (HTTPS should work)

## Frontend Deployment Update

### Step 1: Update Frontend Service in Coolify

1. Navigate to your existing frontend service in Coolify
2. Go to Environment Variables section

### Step 2: Add Backend URL

Add the following environment variable:

```bash
VITE_BACKEND_URL=https://api.yourdomain.com
```

**Important:** 
- Use the full backend URL including `https://`
- This must match the backend subdomain you configured
- Vite requires the `VITE_` prefix for environment variables to be exposed to the client

### Step 3: Rebuild Frontend

1. Trigger a rebuild of the frontend service
2. The new environment variable will be baked into the build
3. Verify the build completes successfully

### Step 4: Verify Frontend-Backend Connection

1. Open your frontend in a browser
2. Open browser DevTools → Network tab
3. Try using features that call the backend:
   - Receipt scanning (OCR)
   - Bank statement upload
4. Verify requests are going to `https://api.yourdomain.com` instead of `localhost:3001`

## Environment Variable Checklist

### Backend (in Coolify Backend Service)

- [ ] `PORT=3001`
- [ ] `FRONTEND_URL=https://yourdomain.com`
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `GOOGLE_API_KEY`
- [ ] `RESEND_API_KEY`
- [ ] `RESEND_FROM_EMAIL`
- [ ] `VAPID_PUBLIC_KEY`
- [ ] `VAPID_PRIVATE_KEY`
- [ ] `VAPID_SUBJECT`

### Frontend (in Coolify Frontend Service)

- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] `VITE_SUPABASE_STORAGE_BUCKET`
- [ ] `VITE_BACKEND_URL=https://api.yourdomain.com` (NEW)

## Testing Checklist

After deployment, verify the following:

- [ ] Backend health check accessible: `https://api.yourdomain.com/health`
- [ ] Backend returns `{"status":"ok"}` from health endpoint
- [ ] Frontend loads without errors
- [ ] Frontend can make API calls to backend (check browser Network tab)
- [ ] CORS allows requests from frontend domain (no CORS errors in console)
- [ ] OCR/receipt scanning works from frontend
- [ ] Bank statement processing works from frontend
- [ ] HTTPS/SSL certificates are valid for both domains
- [ ] No mixed content warnings (all requests use HTTPS)

## Troubleshooting

### Backend Issues

**Backend not starting:**
- Check Coolify logs for error messages
- Verify all environment variables are set correctly
- Ensure Dockerfile is in the `backend/` directory
- Check that `package.json` has the `start` script

**"Dockerfile: no such file or directory" error:**
- **Most Common Cause**: Changes not pushed to Git repository
  - Verify `backend/Dockerfile` exists in your Git repository (check on GitHub/GitLab)
  - Make sure you've committed and pushed all changes: `git add backend/Dockerfile && git commit -m "Add Dockerfile" && git push`
  - Coolify pulls from Git, so files must be in the remote repository
- **Configuration Check**:
  - **Base Directory** should be: `/backend`
  - **Dockerfile Location** should be: `Dockerfile` (relative to base directory, not `/Dockerfile`)
- Verify the Dockerfile exists in your repository at `backend/Dockerfile`
- Check that you're deploying from the correct branch (the one with the Dockerfile)
- After pushing changes and updating settings, save and redeploy

**Port conflicts:**
- Verify the port in Coolify matches `PORT` environment variable
- Check if another service is using port 3001
- Coolify may auto-assign a port - check the port mapping

**Health check fails:**
- Verify the container is running: `docker ps` (if you have SSH access)
- Check application logs in Coolify
- Ensure the `/health` route is accessible (no authentication required)

### Frontend Issues

**Frontend can't connect to backend:**
- Verify `VITE_BACKEND_URL` is set correctly in frontend environment variables
- Check browser console for CORS errors
- Ensure backend `FRONTEND_URL` matches your frontend domain exactly
- Verify backend is accessible by visiting `https://api.yourdomain.com/health` directly

**CORS errors:**
- Check that `FRONTEND_URL` in backend matches your frontend domain exactly (including `https://`)
- Verify no trailing slashes in URLs
- Check browser console for specific CORS error messages
- Ensure credentials are being sent if using authentication

**Environment variables not working:**
- Vite requires `VITE_` prefix for client-side variables
- Rebuild frontend after adding environment variables
- Check that variables are set in Coolify, not just in `.env` files

**Mixed content errors:**
- Ensure both frontend and backend use HTTPS
- Check that `VITE_BACKEND_URL` uses `https://` not `http://`

### General Issues

**SSL certificate problems:**
- Wait a few minutes for Let's Encrypt to provision certificates
- Check DNS records are pointing to Coolify server
- Verify domain is accessible from the internet

**Build failures:**
- Check build logs in Coolify
- Verify all dependencies are in `package.json`
- Ensure Node.js version matches (using Node 20 in Dockerfile)

**Native module compilation errors (Python/node-gyp errors):**
- The Dockerfile includes build tools (python3, make, g++) needed for native modules
- If you see "Python is not set" or "node-gyp" errors, ensure the Dockerfile has been updated with build dependencies
- Some packages like `ofx` require native compilation - the updated Dockerfile handles this

## CORS Configuration Notes

The backend CORS configuration in `backend/src/app.js` uses the `FRONTEND_URL` environment variable:

```javascript
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
```

**Important:**
- Set `FRONTEND_URL` to your exact frontend domain (e.g., `https://yourdomain.com`)
- Include the protocol (`https://`)
- No trailing slash
- If you have multiple frontend domains, you may need to update the CORS configuration to accept an array of origins

## Monitoring

### Health Checks

The backend exposes a health check endpoint at `/health` that returns:
```json
{"status":"ok"}
```

You can set up monitoring to check this endpoint periodically.

### Logs

- View backend logs in Coolify's log viewer
- Check for errors, warnings, or unusual patterns
- Monitor API response times

### Updates

When updating the backend:
1. Push changes to your Git repository
2. Coolify will detect changes (if auto-deploy is enabled) or trigger manual deploy
3. New Docker image will be built
4. Container will be restarted with new code

When updating the frontend:
1. Push changes to your Git repository
2. Rebuild frontend (environment variables are baked in at build time)
3. If you change `VITE_BACKEND_URL`, you must rebuild the frontend

## Security Considerations

1. **Environment Variables**: Never commit secrets to Git. Use Coolify's environment variable management.

2. **HTTPS**: Always use HTTPS in production. Coolify handles SSL certificates automatically.

3. **CORS**: Keep CORS configuration restrictive - only allow your frontend domain.

4. **Rate Limiting**: The backend includes rate limiting (100 requests per 15 minutes per IP). Adjust if needed.

5. **Helmet**: The backend uses Helmet.js for security headers. Review configuration if needed.

6. **API Keys**: Rotate API keys regularly and use different keys for development and production.

## Support

For Coolify-specific issues, refer to the [Coolify documentation](https://coolify.io/docs).

For application-specific issues, check:
- Backend logs in Coolify
- Browser console for frontend errors
- Network tab for API request/response details
