# Employee Management Edge Functions

These edge functions handle employee authentication operations that require admin privileges (service role key).

## Functions

- **`create-employee`** - Creates an employee record and associated Supabase Auth user
- **`update-employee-password`** - Updates an employee's password
- **`reset-employee-password`** - Generates and sets a new secure password for an employee
- **`update-employee-email`** - Updates an employee's email in both employees table and auth.users
- **`delete-employee`** - Deletes an employee record and optionally the auth user account

## Quick Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

**Quick steps:**
1. Set the service role key secret: `npx supabase secrets set SERVICE_ROLE_KEY=<your-key>`
2. Functions are already deployed via Supabase MCP
3. Verify: `npx supabase functions list`

## Security

All functions:
- Require JWT authentication (`verify_jwt: true`)
- Verify caller has admin/accountant role
- Verify company_id matches caller's company
- Use service role key (stored as secret) for auth operations

## Environment Variables

Functions automatically have access to:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anon key

You must set as a secret:
- `SERVICE_ROLE_KEY` - Your Supabase service role key (for admin operations)

**Important:** Secret name must NOT start with `SUPABASE_`. Use `SERVICE_ROLE_KEY` instead.

## Function Details

### create-employee

Creates an employee with initial password. Creates both the auth user and employee record atomically.

**Request:**
```json
{
  "company_id": 1,
  "employee_id": "EMP001",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "initialPassword": "SecurePassword123!"
}
```

**Response:** Employee record with `auth_user_id` populated

### reset-employee-password

Generates a new secure 16-character password and updates the employee's auth account.

**Request:**
```json
{
  "employee_id": 1
}
```

**Response:**
```json
{
  "password": "aB3$kL9mN2pQ5rS"
}
```

**Note:** Password is shown once and cannot be retrieved later.

### update-employee-password

Updates an employee's password to a specified value.

**Request:**
```json
{
  "employee_id": 1,
  "newPassword": "NewSecurePassword123!"
}
```

### update-employee-email

Updates email in both `auth.users` and `employees` table.

**Request:**
```json
{
  "employee_id": 1,
  "newEmail": "newemail@example.com"
}
```

### delete-employee

Deletes employee record and optionally the auth user account.

**Request:**
```json
{
  "employee_id": 1,
  "deleteAuthUser": true
}
```

## Error Handling

All functions return appropriate HTTP status codes:
- `401` - Unauthorized (missing or invalid JWT)
- `403` - Forbidden (not admin/accountant or company mismatch)
- `404` - Not Found (employee doesn't exist)
- `400` - Bad Request (validation error or operation failed)
- `500` - Internal Server Error

Error responses include a message:
```json
{
  "error": "Error message here"
}
```

## Testing

Test functions using the Supabase Dashboard or via API calls:

```bash
curl -X POST https://<project>.supabase.co/functions/v1/create-employee \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"company_id": 1, ...}'
```

## Related Documentation

- [Main Employee Management Documentation](../../EMPLOYEE_MANAGEMENT.md)
- [Deployment Guide](./DEPLOYMENT.md)
