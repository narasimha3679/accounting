# Send Push Notification Edge Function

This edge function sends Web Push notifications to subscribed users.

## Setup

### 1. Generate VAPID Keys

Generate VAPID keys using one of these methods:

**Option A: Using web-push npm package**
```bash
npx web-push generate-vapid-keys
```

**Option B: Using Node.js**
```bash
npm install -g web-push
web-push generate-vapid-keys
```

**Option C: Online tool**
Visit https://web-push-codelab.glitch.me/ and generate keys

You'll get output like:
```
Public Key: BEl62iUYgUivxIkv69yViEuiBIa40HI8H...
Private Key: 8VK3Xz9Q8Y...
```

### 2. Set Supabase Secrets

Set the VAPID keys as Supabase secrets:

```bash
npx supabase secrets set VAPID_PRIVATE_KEY=<your-private-key>
npx supabase secrets set VAPID_PUBLIC_KEY=<your-public-key>
npx supabase secrets set VAPID_SUBJECT=mailto:your-email@example.com
```

**Note:** `VAPID_SUBJECT` should be a mailto: URL or a URL identifying your service.

### 3. Set Frontend Environment Variable

Add the VAPID public key to your frontend environment variables:

```bash
# In frontend/.env or frontend/.env.production
VITE_VAPID_PUBLIC_KEY=<your-public-key>
```

### 4. Deploy the Function

```bash
npx supabase functions deploy send-push-notification
```

## Usage

### Test Notification

Send a test notification to a specific user:

```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/send-push-notification \
  -H "Authorization: Bearer <user-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "test",
    "userId": "<user-uuid>"
  }'
```

### Timesheet Notification (Future)

When timesheet table is created, set up a database webhook:
- Table: `timesheets`
- Event: `INSERT` where `status = 'pending'`
- Function: `send-push-notification`

The function will automatically:
1. Extract `company_id` from timesheet
2. Find company owners (admins/accountants)
3. Send notifications to all their enabled subscriptions

### Custom Notification

Send a custom notification:

```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/send-push-notification \
  -H "Authorization: Bearer <user-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "custom",
    "userId": "<user-uuid>",
    "title": "Custom Title",
    "body": "Custom message",
    "data": {
      "url": "/some-page"
    }
  }'
```

## Error Handling

The function automatically:
- Marks expired subscriptions (410 Gone) as disabled
- Logs errors for debugging
- Returns success/failure counts for batch operations

## Future: Database Webhook Setup

When implementing timesheet functionality:

1. Go to Supabase Dashboard → Database → Webhooks
2. Create new webhook:
   - Name: `timesheet-push-notification`
   - Table: `timesheets`
   - Events: `INSERT`
   - Type: `Supabase Edge Function`
   - Function: `send-push-notification`
   - HTTP Headers: Add auth header with service key

The webhook will automatically trigger when a timesheet is inserted with `status = 'pending'`.
