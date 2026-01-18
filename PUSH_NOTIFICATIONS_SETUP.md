# Push Notifications Setup Guide

This guide covers setting up Web Push notifications for the Corporate Accounting application.

## Overview

The push notification system uses:
- **Web Push API** - Industry standard for browser push notifications
- **Supabase Edge Functions** - Serverless functions for sending notifications
- **Database Webhooks** - Event-driven triggers (zero cron costs)
- **VAPID** - Authentication protocol for Web Push

## Prerequisites

1. Supabase project with Edge Functions enabled
2. HTTPS domain (required for push notifications)
3. VAPID key pair (generated)

## Setup Steps

### 1. Generate VAPID Keys

Generate VAPID keys using one of these methods:

**Using web-push npm package:**
```bash
npx web-push generate-vapid-keys
```

**Using Node.js (if installed globally):**
```bash
npm install -g web-push
web-push generate-vapid-keys
```

You'll receive:
- **Public Key**: Used in frontend (starts with `BEl...`)
- **Private Key**: Used in edge function (starts with `8VK...`)

### 2. Configure Supabase Secrets

Set the VAPID keys as Supabase secrets:

```bash
npx supabase secrets set VAPID_PRIVATE_KEY=<your-private-key>
npx supabase secrets set VAPID_PUBLIC_KEY=<your-public-key>
npx supabase secrets set VAPID_SUBJECT=mailto:your-email@example.com
```

**Note:** `VAPID_SUBJECT` should be a mailto: URL or a URL identifying your service.

### 3. Configure Frontend Environment

Add the VAPID public key to your frontend environment variables:

**Development** (`frontend/.env.local`):
```env
VITE_VAPID_PUBLIC_KEY=<your-public-key>
```

**Production** (`frontend/.env.production` or your deployment platform):
```env
VITE_VAPID_PUBLIC_KEY=<your-public-key>
```

### 4. Create PWA Icons

Create two PNG icons and place them in `frontend/public/`:
- `icon-192x192.png` - 192x192 pixels
- `icon-512x512.png` - 512x512 pixels

These icons are used in:
- PWA install prompt
- Push notifications
- App launcher

### 5. Deploy Edge Function

Deploy the push notification edge function:

```bash
npx supabase functions deploy send-push-notification
```

Verify deployment:
```bash
npx supabase functions list
```

You should see `send-push-notification` in the list.

### 6. Test the System

1. Build and run the frontend:
   ```bash
   cd frontend
   npm run build
   npm run preview
   ```

2. Open the app in a browser (Chrome, Firefox, or Edge)

3. Navigate to Settings page

4. Click "Subscribe to Notifications"

5. Grant notification permission when prompted

6. Click "Send Test Notification" to verify it works

## Database Webhook Setup (Future: Timesheet Notifications)

When implementing timesheet functionality, set up a database webhook:

### Steps:

1. **Create timesheet table** (when implementing timesheet feature)

2. **Go to Supabase Dashboard**:
   - Navigate to: Database → Webhooks
   - Click "Create a new webhook"

3. **Configure webhook**:
   - **Name**: `timesheet-push-notification`
   - **Table**: `timesheets`
   - **Events**: Select `INSERT`
   - **Type**: `Supabase Edge Function`
   - **Function**: `send-push-notification`
   - **HTTP Headers**: 
     - Click "Add new header"
     - Select "Add auth header with service key"
     - Content-Type: `application/json`

4. **Save webhook**

### How it works:

When an employee submits a timesheet:
1. Row is inserted into `timesheets` table with `status = 'pending'`
2. Database webhook triggers automatically
3. Edge function receives webhook payload
4. Function finds company owners (admins/accountants)
5. Sends push notifications to all their enabled subscriptions

## Manual Testing

### Test Notification via API

```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/send-push-notification \
  -H "Authorization: Bearer <user-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "test",
    "userId": "<user-uuid>"
  }'
```

Get user JWT token from browser DevTools → Application → Local Storage → `sb-<project>-auth-token`

## Troubleshooting

### Notifications not working?

1. **Check VAPID keys are set**:
   ```bash
   npx supabase secrets list
   ```
   Should show `VAPID_PRIVATE_KEY` and `VAPID_PUBLIC_KEY`

2. **Check frontend env variable**:
   - Verify `VITE_VAPID_PUBLIC_KEY` is set
   - Rebuild frontend after setting env variable

3. **Check browser console**:
   - Look for service worker registration errors
   - Check for subscription errors

4. **Check edge function logs**:
   ```bash
   npx supabase functions logs send-push-notification
   ```

5. **Verify HTTPS**:
   - Push notifications require HTTPS (except localhost)
   - Check that your domain has valid SSL certificate

### Permission denied?

- User must grant notification permission
- Check browser notification settings
- Some browsers require user interaction before showing permission prompt

### Subscription not stored?

- Check RLS policies on `push_subscriptions` table
- Verify user is authenticated
- Check browser console for errors

## Architecture

```
User Subscribes → Store in DB → Edge Function → Web Push API → Browser Notification
     ↓
Service Worker → Show Notification → User Clicks → Open App
```

## Security

- VAPID private key stored as Supabase secret (never exposed)
- RLS policies ensure users only access their own subscriptions
- HTTPS required for push notifications
- Invalid subscriptions automatically disabled
- Edge function verifies webhook authenticity

## Cost

- **Edge Functions**: Free tier includes 500K invocations/month
- **Database Webhooks**: Free (event-driven, no cron costs)
- **Web Push API**: Free (browser service)

Estimated monthly cost for 100 timesheet submissions/day: **$0.00** (well within free tier)

## Next Steps

1. Generate and configure VAPID keys
2. Deploy edge function
3. Test with Settings page
4. Create PWA icons
5. Set up database webhook when timesheet feature is implemented

For detailed edge function documentation, see: `supabase/functions/send-push-notification/README.md`
