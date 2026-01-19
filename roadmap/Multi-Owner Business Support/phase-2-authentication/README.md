# Phase 2: Authentication & Company Context

## Overview

This phase refactors the authentication system to support multiple companies per user, implements company switching, and updates the user context throughout the application.

## Objectives

1. Refactor `AuthContext` to support multiple companies
2. Implement company switching functionality
3. Create `CompanySelector` component
4. Update user state management
5. Maintain backward compatibility during transition

## Changes Required

### 1. Update Type Definitions

**File**: `frontend/src/lib/api.ts`

```typescript
// Add new interfaces
export interface CompanyMembership {
    id: number;
    user_id: number;
    company_id: number;
    role: 'owner' | 'manager' | 'accountant' | 'viewer';
    permissions: ManagerPermissions | null;
    is_primary: boolean;
    created_at: string;
    updated_at: string;
    company: Company;
}

export interface ManagerPermissions {
    can_schedule_employees?: boolean;
    can_approve_timesheets?: boolean;
    can_view_reports?: boolean;
    can_manage_expenses?: boolean;
    can_manage_invoices?: boolean;
    can_manage_clients?: boolean;
    can_manage_employees?: boolean;
    can_view_financials?: boolean;
}

// Update User interface
export interface User {
    id: number;
    email: string;
    name: string;
    role: 'owner' | 'manager' | 'accountant' | 'viewer' | 'employee';
    companies: CompanyMembership[]; // All companies user belongs to
    currentCompanyId: number | null; // Currently selected company
    currentCompany?: Company;
    permissions?: ManagerPermissions; // Permissions for current company (if manager)
    isEmployee?: boolean;
    employee?: Employee;
    created_at: string;
    updated_at: string;
}
```

### 2. Refactor AuthContext

**File**: `frontend/src/contexts/AuthContext.tsx`

#### Key Changes:

1. **Load all company memberships** instead of single company
2. **Track current company** in state
3. **Load permissions** for current company
4. **Support company switching**

#### Implementation:

```typescript
interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    switchCompany: (companyId: number) => Promise<void>; // NEW
    resetPasswordForEmail: (email: string) => Promise<void>;
    updatePassword: (newPassword: string) => Promise<void>;
    isLoading: boolean;
    isAuthenticated: boolean;
    isPasswordRecovery: boolean;
}

const loadProfile = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const sessionUser = sessionData.session?.user;
    if (!sessionUser) {
        setUser(null);
        return;
    }

    // First check if user is an employee
    const { data: employeeData } = await supabase
        .from('employees')
        .select(`
            *,
            company:companies (*)
        `)
        .eq('auth_user_id', sessionUser.id)
        .maybeSingle<Employee>();

    if (employeeData) {
        // Employee user - single company
        const employeeUser: User = {
            id: employeeData.id,
            email: employeeData.email,
            name: `${employeeData.first_name} ${employeeData.last_name}`,
            role: 'employee',
            companies: [{
                id: 0, // Not used for employees
                user_id: 0,
                company_id: employeeData.company_id,
                role: 'employee',
                permissions: null,
                is_primary: true,
                created_at: employeeData.created_at,
                updated_at: employeeData.updated_at,
                company: employeeData.company,
            }],
            currentCompanyId: employeeData.company_id,
            currentCompany: employeeData.company,
            isEmployee: true,
            employee: employeeData,
            created_at: employeeData.created_at,
            updated_at: employeeData.updated_at,
        };
        setUser(employeeUser);
        return;
    }

    // Load profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', sessionUser.id)
        .maybeSingle();

    if (!profile) {
        setUser(null);
        return;
    }

    // Load all company memberships
    const { data: memberships, error } = await supabase
        .from('user_companies')
        .select(`
            *,
            company:companies (*)
        `)
        .eq('user_id', profile.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });

    if (error || !memberships || memberships.length === 0) {
        // No companies - might be new user
        const fallback: User = {
            id: profile.id,
            email: profile.email,
            name: profile.full_name ?? '',
            role: 'viewer',
            companies: [],
            currentCompanyId: null,
            isEmployee: false,
            created_at: profile.created_at,
            updated_at: profile.updated_at,
        };
        setUser(fallback);
        return;
    }

    // Determine current company (primary or first)
    const primaryCompany = memberships.find(m => m.is_primary) || memberships[0];
    const currentCompanyId = primaryCompany.company_id;
    const currentMembership = primaryCompany;

    // Map to User
    const user: User = {
        id: profile.id,
        email: profile.email,
        name: profile.full_name ?? '',
        role: currentMembership.role,
        companies: memberships.map(m => ({
            id: m.id,
            user_id: m.user_id,
            company_id: m.company_id,
            role: m.role,
            permissions: m.permissions as ManagerPermissions | null,
            is_primary: m.is_primary,
            created_at: m.created_at,
            updated_at: m.updated_at,
            company: m.company,
        })),
        currentCompanyId,
        currentCompany: primaryCompany.company,
        permissions: currentMembership.permissions as ManagerPermissions | undefined,
        isEmployee: false,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
    };

    setUser(user);
};

const switchCompany = async (companyId: number) => {
    if (!user) return;

    // Find membership for this company
    const membership = user.companies.find(c => c.company_id === companyId);
    if (!membership) {
        throw new Error('You do not have access to this company');
    }

    // Update current company
    const updatedUser: User = {
        ...user,
        currentCompanyId: companyId,
        currentCompany: membership.company,
        role: membership.role,
        permissions: membership.permissions || undefined,
    };

    setUser(updatedUser);

    // Optionally update primary company in database
    if (!membership.is_primary) {
        // Update is_primary flags
        await supabase
            .from('user_companies')
            .update({ is_primary: false })
            .eq('user_id', user.id);

        await supabase
            .from('user_companies')
            .update({ is_primary: true })
            .eq('user_id', user.id)
            .eq('company_id', companyId);
    }
};
```

### 3. Create CompanySelector Component

**File**: `frontend/src/components/CompanySelector.tsx`

```typescript
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Building2, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

const CompanySelector: React.FC = () => {
    const { user, switchCompany } = useAuth();
    const [isOpen, setIsOpen] = React.useState(false);

    if (!user || user.companies.length <= 1) {
        // Don't show selector if user has 0 or 1 company
        return null;
    }

    const currentCompany = user.companies.find(c => c.company_id === user.currentCompanyId);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg",
                    "bg-white/5 hover:bg-white/10 transition-colors",
                    "text-sm font-medium text-white"
                )}
            >
                <Building2 className="h-4 w-4" />
                <span className="truncate max-w-[150px]">
                    {currentCompany?.company.name || 'Select Company'}
                </span>
                <ChevronDown className={cn(
                    "h-4 w-4 transition-transform",
                    isOpen && "rotate-180"
                )} />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full left-0 mt-2 w-64 z-20 glass-heavy rounded-lg border border-white/10 shadow-lg">
                        <div className="p-2">
                            <div className="text-xs font-semibold text-slate-muted uppercase px-2 py-1 mb-1">
                                Companies
                            </div>
                            {user.companies.map((membership) => (
                                <button
                                    key={membership.company_id}
                                    onClick={() => {
                                        switchCompany(membership.company_id);
                                        setIsOpen(false);
                                    }}
                                    className={cn(
                                        "w-full text-left px-3 py-2 rounded-md transition-colors",
                                        "flex items-center justify-between",
                                        membership.company_id === user.currentCompanyId
                                            ? "bg-neon-emerald/20 text-neon-emerald"
                                            : "text-slate-muted hover:bg-white/10 hover:text-white"
                                    )}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium truncate">
                                            {membership.company.name}
                                        </div>
                                        <div className="text-xs capitalize">
                                            {membership.role}
                                        </div>
                                    </div>
                                    {membership.is_primary && (
                                        <span className="text-xs text-neon-emerald">Primary</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default CompanySelector;
```

### 4. Update Layout Component

**File**: `frontend/src/components/Layout.tsx`

Add CompanySelector to the sidebar:

```typescript
import CompanySelector from './CompanySelector';

// In the sidebar, after logo:
<div className="px-4 py-3 border-b border-white/10">
    <CompanySelector />
</div>
```

### 5. Update API Methods

**File**: `frontend/src/lib/api.ts`

All API methods need to use `user.currentCompanyId` instead of `user.company_id`:

```typescript
// Update ensureCompanyId helper
private ensureCompanyId(companyId?: number): number {
    if (companyId) return companyId;
    
    // Get from auth context
    const user = this.getCurrentUser(); // Need to access auth context
    if (!user?.currentCompanyId) {
        throw new Error('No company selected');
    }
    return user.currentCompanyId;
}

// Alternative: Pass companyId explicitly to all methods
// Or: Use React Query with company context
```

**Better approach**: Update all API calls to use `user.currentCompanyId` from context.

### 6. Add API Methods for Company Management

**File**: `frontend/src/lib/api.ts`

```typescript
// Get all companies for current user
async getUserCompanies(): Promise<CompanyMembership[]> {
    const { data, error } = await supabase
        .from('user_companies')
        .select(`
            *,
            company:companies (*)
        `)
        .eq('user_id', (await this.getCurrentUserProfile()).id)
        .order('is_primary', { ascending: false });
    
    if (error) throw error;
    return data;
}

// Switch active company (update is_primary)
async setPrimaryCompany(companyId: number): Promise<void> {
    const profile = await this.getCurrentUserProfile();
    
    // Set all to false
    await supabase
        .from('user_companies')
        .update({ is_primary: false })
        .eq('user_id', profile.id);
    
    // Set selected to true
    const { error } = await supabase
        .from('user_companies')
        .update({ is_primary: true })
        .eq('user_id', profile.id)
        .eq('company_id', companyId);
    
    if (error) throw error;
}
```

### 7. Update Route Protection

**File**: `frontend/src/App.tsx` or route guard component

Ensure routes check for `currentCompanyId`:

```typescript
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, isLoading } = useAuth();
    
    if (isLoading) {
        return <LoadingSpinner />;
    }
    
    if (!user) {
        return <Navigate to="/login" />;
    }
    
    // Check if employee
    if (user.isEmployee) {
        return <Navigate to="/employee-dashboard" />;
    }
    
    // Check if has company
    if (!user.currentCompanyId) {
        return <Navigate to="/company-onboarding" />;
    }
    
    return <>{children}</>;
};
```

## Testing Checklist

- [ ] User with single company works as before
- [ ] User with multiple companies can switch
- [ ] Company selector appears/disappears correctly
- [ ] Current company persists across page reloads
- [ ] Permissions update when switching companies
- [ ] API calls use correct company_id
- [ ] Employee users still work correctly
- [ ] New users without companies redirect to onboarding

## Migration Notes

- Keep `user.company_id` as fallback during transition
- Gradually migrate API calls to use `currentCompanyId`
- Test thoroughly with users who have multiple companies

## Next Steps

After completing Phase 2:
1. Test company switching thoroughly
2. Verify all API calls use correct company context
3. Proceed to Phase 3: Permission System
