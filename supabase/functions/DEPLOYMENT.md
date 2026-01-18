# Edge Functions Deployment Guide

## Quick Start

### 1. Prerequisites

- Supabase CLI installed: `npm install -g supabase`
- Logged into Supabase: `npx supabase login`
- Project linked: `npx supabase link --project-ref <your-project-ref>`

### 2. Set Service Role Key Secret

**Critical:** The secret name must NOT start with `SUPABASE_`. Use `SERVICE_ROLE_KEY` instead.

```bash
npx supabase secrets set SERVICE_ROLE_KEY=<your-service-role-key>
```

**Where to find your service role key:**
- Supabase Dashboard → Settings → API → Service Role Key
- **Security Warning:** This key has full admin access. Never commit it or expose it in frontend code.

### 3. Verify Secret is Set

```bash
npx supabase secrets list
```

You should see `SERVICE_ROLE_KEY` in the list.

### 4. Functions Are Already Deployed

The edge functions have been deployed via Supabase MCP. To verify:

```bash
npx supabase functions list
```

You should see:
- `create-employee`
- `update-employee-password`
- `reset-employee-password`
- `update-employee-email`
- `delete-employee`

### 5. Test Functions

View function logs to verify they're working:

```bash
npx supabase functions logs create-employee --follow
```

## Redeploying Functions

If you need to update a function:

```bash
# Deploy individual function
npx supabase functions deploy create-employee

# Or deploy all at once
npx supabase functions deploy create-employee update-employee-password reset-employee-password update-employee-email delete-employee
```

## Function Endpoints

Once deployed, functions are available at:

- `https://<your-project>.supabase.co/functions/v1/create-employee`
- `https://<your-project>.supabase.co/functions/v1/update-employee-password`
- `https://<your-project>.supabase.co/functions/v1/reset-employee-password`
- `https://<your-project>.supabase.co/functions/v1/update-employee-email`
- `https://<your-project>.supabase.co/functions/v1/delete-employee`

## Environment Variables

Functions automatically have access to:
- `SUPABASE_URL` - Auto-provided by Supabase
- `SUPABASE_ANON_KEY` - Auto-provided by Supabase

You must set:
- `SERVICE_ROLE_KEY` - Set via `supabase secrets set` command

## Troubleshooting

### Function Returns 401 Unauthorized

- Verify the Authorization header includes a valid JWT token
- Check that the user is authenticated in Supabase Auth

### Function Returns 403 Forbidden

- Verify the user has admin or accountant role
- Check that the company_id in the request matches the user's company

### Function Returns 500 Error

- Check function logs: `npx supabase functions logs <function-name>`
- Verify `SERVICE_ROLE_KEY` secret is set correctly
- Check that the service role key is valid and not expired

### Secret Not Found

- Verify secret is set: `npx supabase secrets list`
- Ensure you're using the correct name: `SERVICE_ROLE_KEY` (not `SUPABASE_SERVICE_ROLE_KEY`)
- Re-set the secret if needed

## Security Best Practices

1. **Never commit service role key** - It's stored as a secret on Supabase
2. **Rotate keys regularly** - Update the secret if compromised
3. **Monitor function logs** - Check for unauthorized access attempts
4. **Use JWT verification** - All functions have `verify_jwt: true` enabled
5. **Validate company_id** - Functions verify company_id matches user's company

## Local Development

For local development and testing:

```bash
# Start local Supabase (if using local instance)
npx supabase start

# Serve functions locally
npx supabase functions serve

# Test function locally
curl -X POST http://localhost:54321/functions/v1/create-employee \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"company_id": 1, "employee_id": "EMP001", ...}'
```

## Monitoring

View function metrics and logs in:
- Supabase Dashboard → Edge Functions → [Function Name] → Logs
- Or via CLI: `npx supabase functions logs <function-name>`
