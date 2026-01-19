# Phase 4: API & Edge Functions

## Overview

This phase updates all API methods and Edge Functions to work with the new multi-company structure and permission system.

## Objectives

1. Update all API methods to use `currentCompanyId` from context
2. Refactor Edge Functions to check `user_companies` instead of `profiles.company_id`
3. Add permission checks to Edge Functions
4. Create new APIs for company member management
5. Ensure security at the API level

## API Layer Updates

### 1. Update API Base Class

**File**: `frontend/src/lib/api.ts`

#### Changes Needed:

1. **Remove `ensureCompanyId` dependency on `user.company_id`**
2. **Add method to get current company from context**
3. **Update all methods to use `currentCompanyId`**

```typescript
class SupabaseApi {
    // Add method to get current user's company
    private getCurrentCompanyId(): number {
        // This needs to access AuthContext
        // Option 1: Pass companyId to all methods
        // Option 2: Use React Query context
        // Option 3: Store in API instance (set on login)
        
        // For now, we'll require companyId to be passed explicitly
        // Or use a context provider pattern
        throw new Error('Company ID must be provided');
    }
    
    // Update all methods to accept companyId parameter
    // Example:
    async getEmployees(params?: { 
        page?: number; 
        limit?: number; 
        search?: string; 
        company_id?: number; // Now optional, will use currentCompanyId if not provided
        status?: string 
    }): Promise<PaginatedResponse<Employee>> {
        // Implementation
    }
}
```

#### Better Approach: React Query with Company Context

Create a hook that provides company context:

```typescript
// frontend/src/hooks/useCompanyContext.ts
import { useAuth } from '../contexts/AuthContext';

export function useCompanyContext() {
    const { user } = useAuth();
    
    if (!user?.currentCompanyId) {
        throw new Error('No company selected');
    }
    
    return {
        companyId: user.currentCompanyId,
        company: user.currentCompany,
        role: user.role,
        permissions: user.permissions,
    };
}

// In components:
const { companyId } = useCompanyContext();
const { data } = useQuery({
    queryKey: ['employees', companyId],
    queryFn: () => api.getEmployees({ company_id: companyId }),
});
```

### 2. Update All API Methods

**Pattern for each method**:

```typescript
// Before:
async getInvoices(params?: { 
    company_id?: number; 
    // ...
}): Promise<PaginatedResponse<Invoice>> {
    const companyId = this.ensureCompanyId(params?.company_id);
    // ...
}

// After:
async getInvoices(params?: { 
    company_id?: number; // Optional, but recommended to pass explicitly
    // ...
}): Promise<PaginatedResponse<Invoice>> {
    // If company_id not provided, it should come from context
    // But better to require it explicitly for clarity
    const companyId = params?.company_id;
    if (!companyId) {
        throw new Error('company_id is required');
    }
    // ...
}
```

### 3. New API Methods for Company Management

**File**: `frontend/src/lib/api.ts`

```typescript
// Get all companies for current user
async getUserCompanies(): Promise<CompanyMembership[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();
    
    if (!profile) throw new Error('Profile not found');
    
    const { data, error } = await supabase
        .from('user_companies')
        .select(`
            *,
            company:companies (*)
        `)
        .eq('user_id', profile.id)
        .order('is_primary', { ascending: false });
    
    if (error) throw error;
    return data;
}

// Invite user to company (creates user_companies entry)
async inviteUserToCompany(
    email: string,
    companyId: number,
    role: 'owner' | 'manager' | 'accountant' | 'viewer',
    permissions?: ManagerPermissions
): Promise<void> {
    // This should call an Edge Function for security
    const response = await fetch(`${SUPABASE_URL}/functions/v1/invite-company-member`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
            email,
            company_id: companyId,
            role,
            permissions: permissions || {},
        }),
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to invite user');
    }
}

// Update manager permissions
async updateManagerPermissions(
    userId: number,
    companyId: number,
    permissions: ManagerPermissions
): Promise<void> {
    const { error } = await supabase
        .from('user_companies')
        .update({ permissions })
        .eq('user_id', userId)
        .eq('company_id', companyId);
    
    if (error) throw error;
}

// Remove user from company
async removeUserFromCompany(userId: number, companyId: number): Promise<void> {
    // Should call Edge Function to prevent removing last owner
    const response = await fetch(`${SUPABASE_URL}/functions/v1/remove-company-member`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
            user_id: userId,
            company_id: companyId,
        }),
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove user');
    }
}
```

## Edge Functions Updates

### 1. Update Existing Edge Functions

All Edge Functions need to:
1. Check `user_companies` instead of `profiles.company_id`
2. Verify permissions for managers
3. Support multi-company context

#### Example: `create-employee` Function

**File**: `supabase/functions/create-employee/index.ts`

```typescript
// Before:
const { data: profile, error: profileError } = await userClient
    .from("profiles")
    .select("company_id, role")
    .eq("auth_user_id", user.id)
    .single();

if (profileError || !profile || !["admin", "accountant"].includes(profile.role)) {
    return error response;
}

if (profile.company_id !== company_id) {
    return error response;
}

// After:
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
        JSON.stringify({ error: "Insufficient permissions" }),
        { status: 403, headers: getCorsHeaders(req) }
    );
}
```

### 2. New Edge Functions

#### A. `invite-company-member`

**File**: `supabase/functions/invite-company-member/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: "Missing authorization header" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SERVICE_ROLE_KEY")!;
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

        const adminClient = createClient(supabaseUrl, supabaseServiceKey);
        const userClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } },
        });

        const { data: { user } } = await userClient.auth.getUser();
        if (!user) {
            return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const { email, company_id, role, permissions } = await req.json();

        // Verify caller is owner
        const { data: profile } = await userClient
            .from("profiles")
            .select("id")
            .eq("auth_user_id", user.id)
            .single();

        const { data: membership } = await userClient
            .from("user_companies")
            .select("role")
            .eq("user_id", profile.id)
            .eq("company_id", company_id)
            .single();

        if (!membership || membership.role !== 'owner') {
            return new Response(
                JSON.stringify({ error: "Only owners can invite members" }),
                { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Find or create user by email
        const { data: existingUser } = await adminClient.auth.admin.listUsers();
        let targetUser = existingUser.users.find(u => u.email === email);

        if (!targetUser) {
            // Create new user (send invitation email)
            const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
                email,
                email_confirm: false, // They'll need to confirm
            });
            
            if (createError) throw createError;
            targetUser = newUser.user;
        }

        // Get or create profile
        let { data: targetProfile } = await adminClient
            .from("profiles")
            .select("id")
            .eq("auth_user_id", targetUser.id)
            .single();

        if (!targetProfile) {
            const { data: newProfile, error: profileError } = await adminClient
                .from("profiles")
                .insert({
                    auth_user_id: targetUser.id,
                    email: targetUser.email,
                    full_name: targetUser.user_metadata?.full_name || null,
                    role: 'viewer', // Default, will be overridden by user_companies
                })
                .select()
                .single();
            
            if (profileError) throw profileError;
            targetProfile = newProfile;
        }

        // Create user_companies entry
        const { error: insertError } = await adminClient
            .from("user_companies")
            .insert({
                user_id: targetProfile.id,
                company_id,
                role,
                permissions: permissions || {},
            });

        if (insertError) {
            if (insertError.code === '23505') {
                return new Response(
                    JSON.stringify({ error: "User is already a member of this company" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
            throw insertError;
        }

        // Send invitation email if new user
        if (!targetUser.email_confirmed_at) {
            await adminClient.auth.admin.generateLink({
                type: 'invite',
                email,
            });
        }

        return new Response(
            JSON.stringify({ success: true }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
```

#### B. `remove-company-member`

**File**: `supabase/functions/remove-company-member/index.ts`

Similar structure, but:
- Verify caller is owner
- Prevent removing last owner
- Remove `user_companies` entry

#### C. `update-manager-permissions`

**File**: `supabase/functions/update-manager-permissions/index.ts`

- Verify caller is owner
- Update permissions in `user_companies`

### 3. Update All Existing Edge Functions

Functions to update:
- `create-employee`
- `update-employee-email`
- `update-employee-password`
- `reset-employee-password`
- `delete-employee`

**Pattern for each**:
1. Get profile by `auth_user_id`
2. Check `user_companies` for membership
3. Verify role/permissions
4. Proceed with operation

## Security Considerations

1. **Always verify company membership** in Edge Functions
2. **Check permissions** for manager actions
3. **Prevent privilege escalation** (managers can't grant permissions they don't have)
4. **Audit logging** for permission changes
5. **Rate limiting** on invitation endpoints

## Testing Checklist

- [ ] All API methods work with `currentCompanyId`
- [ ] Edge Functions verify company membership
- [ ] Permission checks work correctly
- [ ] New company member APIs work
- [ ] Security: unauthorized access is blocked
- [ ] Performance: queries are optimized

## Next Steps

After completing Phase 4:
1. Test all API endpoints thoroughly
2. Verify Edge Function security
3. Proceed to Phase 5: Frontend Features
