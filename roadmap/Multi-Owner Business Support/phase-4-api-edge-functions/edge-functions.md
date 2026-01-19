# Edge Functions Updates

This document details the changes needed for each Edge Function to support multi-company and permissions.

## Functions to Update

### 1. create-employee

**File**: `supabase/functions/create-employee/index.ts`

**Changes**:
- Check `user_companies` instead of `profiles.company_id`
- Verify manager permissions

**Updated Code**:
```typescript
// Get profile
const { data: profile } = await userClient
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

if (!profile) {
    return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 401, headers: getCorsHeaders(req) }
    );
}

// Check user_companies membership
const { data: membership, error: membershipError } = await userClient
    .from("user_companies")
    .select("role, permissions")
    .eq("user_id", profile.id)
    .eq("company_id", company_id)
    .single();

if (membershipError || !membership) {
    return new Response(
        JSON.stringify({ error: "You do not have access to this company" }),
        { status: 403, headers: getCorsHeaders(req) }
    );
}

// Check permission
const hasPermission = 
    membership.role === 'owner' ||
    membership.role === 'accountant' ||
    (membership.role === 'manager' && 
     membership.permissions?.can_manage_employees === true);

if (!hasPermission) {
    return new Response(
        JSON.stringify({ error: "Insufficient permissions to create employees" }),
        { status: 403, headers: getCorsHeaders(req) }
    );
}
```

### 2. update-employee-email

**File**: `supabase/functions/update-employee-email/index.ts`

**Changes**: Same pattern as `create-employee`

### 3. update-employee-password

**File**: `supabase/functions/update-employee-password/index.ts`

**Changes**: Same pattern as `create-employee`

### 4. reset-employee-password

**File**: `supabase/functions/reset-employee-password/index.ts`

**Changes**: Same pattern as `create-employee`

### 5. delete-employee

**File**: `supabase/functions/delete-employee/index.ts`

**Changes**: 
- Same pattern as `create-employee`
- Only owners and accountants can delete (not managers)

## New Functions to Create

### 1. invite-company-member

**File**: `supabase/functions/invite-company-member/index.ts`

**Purpose**: Invite user to company with role and permissions

**Security**:
- Only owners can invite
- Verify company ownership

**See Phase 4 README for full implementation**.

### 2. remove-company-member

**File**: `supabase/functions/remove-company-member/index.ts`

**Purpose**: Remove user from company

**Security**:
- Only owners can remove
- Prevent removing last owner
- Verify company ownership

### 3. update-manager-permissions

**File**: `supabase/functions/update-manager-permissions/index.ts`

**Purpose**: Update manager permissions

**Security**:
- Only owners can update permissions
- Verify company ownership

### 4. generate-paystub

**File**: `supabase/functions/generate-paystub/index.ts`

**Purpose**: Generate PDF paystub for employee

**Security**:
- Employee can only generate their own paystubs
- Verify employee ownership of salary record

**See Phase 5 employee-features.md for implementation**.

## Common Patterns

### Pattern 1: Verify Company Membership

```typescript
const { data: profile } = await userClient
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

const { data: membership } = await userClient
    .from("user_companies")
    .select("role, permissions")
    .eq("user_id", profile.id)
    .eq("company_id", company_id)
    .single();

if (!membership) {
    return error response;
}
```

### Pattern 2: Check Permission

```typescript
const hasPermission = 
    membership.role === 'owner' ||
    membership.role === 'accountant' ||
    (membership.role === 'manager' && 
     membership.permissions?.[permissionName] === true);

if (!hasPermission) {
    return error response;
}
```

### Pattern 3: Only Owners

```typescript
if (membership.role !== 'owner') {
    return error response;
}
```

## Testing

For each function:
1. Test with owner role
2. Test with manager role (with/without permission)
3. Test with accountant role
4. Test unauthorized access (wrong company)
5. Test unauthenticated requests

## Deployment

Deploy all updated functions:
```bash
npx supabase functions deploy create-employee
npx supabase functions deploy update-employee-email
npx supabase functions deploy update-employee-password
npx supabase functions deploy reset-employee-password
npx supabase functions deploy delete-employee
npx supabase functions deploy invite-company-member
npx supabase functions deploy remove-company-member
npx supabase functions deploy update-manager-permissions
npx supabase functions deploy generate-paystub
```
