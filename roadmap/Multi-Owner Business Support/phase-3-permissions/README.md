# Phase 3: Permission System

## Overview

This phase implements a granular permission system for managers, allowing owners to configure what actions managers can perform within their companies.

## Objectives

1. Define permission structure and types
2. Create permission checking utilities
3. Implement permission-based UI rendering
4. Create manager permission management UI
5. Update navigation/routing based on permissions

## Permission Structure

### Permission Types

```typescript
export interface ManagerPermissions {
    // Employee Management
    can_manage_employees?: boolean;
    can_schedule_employees?: boolean;
    can_approve_timesheets?: boolean;
    
    // Financial Management
    can_manage_invoices?: boolean;
    can_manage_expenses?: boolean;
    can_view_financials?: boolean;
    
    // Client Management
    can_manage_clients?: boolean;
    
    // Reporting
    can_view_reports?: boolean;
    
    // Other
    can_manage_capital_assets?: boolean;
    can_manage_investments?: boolean;
}
```

### Default Permissions by Role

- **Owner**: All permissions (implicit, not stored)
- **Accountant**: Financial permissions (can be customized)
- **Manager**: Configurable (stored in `user_companies.permissions`)
- **Viewer**: Read-only (no write permissions)

## Implementation

### 1. Permission Utilities

**File**: `frontend/src/lib/permissions.ts`

```typescript
import type { User, ManagerPermissions } from './api';

export type Permission = 
    | 'can_manage_employees'
    | 'can_schedule_employees'
    | 'can_approve_timesheets'
    | 'can_manage_invoices'
    | 'can_manage_expenses'
    | 'can_view_financials'
    | 'can_manage_clients'
    | 'can_view_reports'
    | 'can_manage_capital_assets'
    | 'can_manage_investments';

/**
 * Check if user has a specific permission
 */
export function hasPermission(user: User | null, permission: Permission): boolean {
    if (!user) return false;
    
    // Employees don't have company permissions
    if (user.isEmployee) return false;
    
    // Owners have all permissions
    if (user.role === 'owner') return true;
    
    // Accountants have financial permissions by default
    if (user.role === 'accountant') {
        const accountantPermissions: Permission[] = [
            'can_manage_invoices',
            'can_manage_expenses',
            'can_view_financials',
            'can_view_reports',
        ];
        return accountantPermissions.includes(permission);
    }
    
    // Managers: check stored permissions
    if (user.role === 'manager' && user.permissions) {
        return user.permissions[permission] === true;
    }
    
    // Viewers: read-only, no write permissions
    if (user.role === 'viewer') {
        const viewerPermissions: Permission[] = [
            'can_view_reports',
            'can_view_financials',
        ];
        return viewerPermissions.includes(permission);
    }
    
    return false;
}

/**
 * Check if user can perform any write operation
 */
export function canWrite(user: User | null): boolean {
    if (!user) return false;
    if (user.isEmployee) return false;
    return ['owner', 'accountant', 'manager'].includes(user.role);
}

/**
 * Get all permissions for a role
 */
export function getDefaultPermissions(role: 'owner' | 'manager' | 'accountant' | 'viewer'): ManagerPermissions {
    switch (role) {
        case 'owner':
            // Owners have all permissions (not stored, but return all true for UI)
            return {
                can_manage_employees: true,
                can_schedule_employees: true,
                can_approve_timesheets: true,
                can_manage_invoices: true,
                can_manage_expenses: true,
                can_view_financials: true,
                can_manage_clients: true,
                can_view_reports: true,
                can_manage_capital_assets: true,
                can_manage_investments: true,
            };
        case 'accountant':
            return {
                can_manage_invoices: true,
                can_manage_expenses: true,
                can_view_financials: true,
                can_view_reports: true,
            };
        case 'viewer':
            return {
                can_view_reports: true,
                can_view_financials: true,
            };
        case 'manager':
            // Managers start with no permissions (owner configures)
            return {};
        default:
            return {};
    }
}

/**
 * Get permission label for UI
 */
export function getPermissionLabel(permission: Permission): string {
    const labels: Record<Permission, string> = {
        can_manage_employees: 'Manage Employees',
        can_schedule_employees: 'Schedule Employees',
        can_approve_timesheets: 'Approve Timesheets',
        can_manage_invoices: 'Manage Invoices',
        can_manage_expenses: 'Manage Expenses',
        can_view_financials: 'View Financials',
        can_manage_clients: 'Manage Clients',
        can_view_reports: 'View Reports',
        can_manage_capital_assets: 'Manage Capital Assets',
        can_manage_investments: 'Manage Investments',
    };
    return labels[permission] || permission;
}

/**
 * Get permission description for UI
 */
export function getPermissionDescription(permission: Permission): string {
    const descriptions: Record<Permission, string> = {
        can_manage_employees: 'Create, edit, and delete employee records',
        can_schedule_employees: 'Create and manage employee schedules',
        can_approve_timesheets: 'Approve or reject employee timesheet submissions',
        can_manage_invoices: 'Create, edit, and manage invoices',
        can_manage_expenses: 'Create, edit, and manage expense records',
        can_view_financials: 'View financial data and reports',
        can_manage_clients: 'Create, edit, and manage client records',
        can_view_reports: 'View company reports and analytics',
        can_manage_capital_assets: 'Manage capital asset records and depreciation',
        can_manage_investments: 'Manage investment records and transactions',
    };
    return descriptions[permission] || '';
}
```

### 2. Permission Hook

**File**: `frontend/src/hooks/usePermissions.ts`

```typescript
import { useAuth } from '../contexts/AuthContext';
import { hasPermission, canWrite, type Permission } from '../lib/permissions';

export function usePermissions() {
    const { user } = useAuth();
    
    return {
        hasPermission: (permission: Permission) => hasPermission(user, permission),
        canWrite: canWrite(user),
        isOwner: user?.role === 'owner',
        isManager: user?.role === 'manager',
        isAccountant: user?.role === 'accountant',
        isViewer: user?.role === 'viewer',
    };
}
```

### 3. Permission-Based Navigation

**File**: `frontend/src/components/Layout.tsx`

Update navigation to show/hide items based on permissions:

```typescript
import { usePermissions } from '../hooks/usePermissions';

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const { user, logout } = useAuth();
    const { hasPermission } = usePermissions();
    
    const companyNavigation = [
        { name: 'Dashboard', href: '/', icon: Home, permission: null },
        { name: 'Invoices', href: '/invoices', icon: FileText, permission: 'can_manage_invoices' as Permission },
        { name: 'Income', href: '/income', icon: DollarSign, permission: 'can_view_financials' as Permission },
        { name: 'Expenses', href: '/expenses', icon: Receipt, permission: 'can_manage_expenses' as Permission },
        { name: 'Capital Assets', href: '/capital-assets', icon: Building2, permission: 'can_manage_capital_assets' as Permission },
        { name: 'Investments', href: '/investments', icon: PieChart, permission: 'can_manage_investments' as Permission },
        { name: 'Dividends', href: '/dividends', icon: Banknote, permission: 'can_view_financials' as Permission },
        { name: 'Salary', href: '/salary', icon: Briefcase, permission: 'can_manage_employees' as Permission },
        { name: 'Owner Reimbursement', href: '/owner-payments', icon: CreditCard, permission: 'can_view_financials' as Permission },
        { name: 'Clients', href: '/clients', icon: Users, permission: 'can_manage_clients' as Permission },
        { name: 'Employees', href: '/employees', icon: UserCircle, permission: 'can_manage_employees' as Permission },
        { name: 'Time Management', href: '/time-management', icon: Clock, permission: 'can_schedule_employees' as Permission },
        { name: 'Reports', href: '/reports', icon: TrendingUp, permission: 'can_view_reports' as Permission },
        { name: 'Tax Calculator', href: '/tax-calculator', icon: Calculator, permission: 'can_view_financials' as Permission },
        { name: 'Settings', href: '/settings', icon: Settings, permission: null }, // Always visible
    ].filter(item => {
        // Owners and items without permission requirements always visible
        if (!item.permission || user?.role === 'owner') return true;
        return hasPermission(item.permission);
    });
    
    // ... rest of component
};
```

### 4. Permission-Based Route Protection

**File**: `frontend/src/components/ProtectedRoute.tsx` (or update existing)

```typescript
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import type { Permission } from '../lib/permissions';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredPermission?: Permission;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
    children, 
    requiredPermission 
}) => {
    const { user, isLoading } = useAuth();
    const { hasPermission } = usePermissions();
    
    if (isLoading) {
        return <LoadingSpinner />;
    }
    
    if (!user) {
        return <Navigate to="/login" />;
    }
    
    if (user.isEmployee) {
        return <Navigate to="/employee-dashboard" />;
    }
    
    if (!user.currentCompanyId) {
        return <Navigate to="/company-onboarding" />;
    }
    
    if (requiredPermission && !hasPermission(requiredPermission)) {
        return <Navigate to="/" />; // Or show access denied page
    }
    
    return <>{children}</>;
};
```

### 5. Manager Permission Management UI

**File**: `frontend/src/components/ManagerPermissionModal.tsx`

```typescript
import React, { useState } from 'react';
import { X, Info } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import { 
    type Permission, 
    getPermissionLabel, 
    getPermissionDescription,
    getDefaultPermissions 
} from '../lib/permissions';
import type { ManagerPermissions } from '../lib/api';

interface ManagerPermissionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (permissions: ManagerPermissions) => Promise<void>;
    initialPermissions?: ManagerPermissions;
    role: 'manager' | 'accountant';
}

const ManagerPermissionModal: React.FC<ManagerPermissionModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialPermissions = {},
    role,
}) => {
    const [permissions, setPermissions] = useState<ManagerPermissions>(initialPermissions);
    const [isSaving, setIsSaving] = useState(false);
    
    const allPermissions: Permission[] = [
        'can_manage_employees',
        'can_schedule_employees',
        'can_approve_timesheets',
        'can_manage_invoices',
        'can_manage_expenses',
        'can_view_financials',
        'can_manage_clients',
        'can_view_reports',
        'can_manage_capital_assets',
        'can_manage_investments',
    ];
    
    const togglePermission = (permission: Permission) => {
        setPermissions(prev => ({
            ...prev,
            [permission]: !prev[permission],
        }));
    };
    
    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(permissions);
            onClose();
        } catch (error) {
            console.error('Error saving permissions:', error);
        } finally {
            setIsSaving(false);
        }
    };
    
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={onClose} />
            <Card className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold text-foreground">
                        Configure {role === 'manager' ? 'Manager' : 'Accountant'} Permissions
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-md hover:bg-muted transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                
                <div className="space-y-4">
                    {allPermissions.map((permission) => (
                        <div
                            key={permission}
                            className="flex items-start gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                        >
                            <input
                                type="checkbox"
                                id={permission}
                                checked={permissions[permission] === true}
                                onChange={() => togglePermission(permission)}
                                className="mt-1"
                            />
                            <div className="flex-1">
                                <label
                                    htmlFor={permission}
                                    className="block font-medium text-foreground cursor-pointer"
                                >
                                    {getPermissionLabel(permission)}
                                </label>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {getPermissionDescription(permission)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="flex justify-end gap-3 mt-6">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Permissions'}
                    </Button>
                </div>
            </Card>
        </div>
    );
};

export default ManagerPermissionModal;
```

### 6. Update Settings Page

**File**: `frontend/src/pages/Settings.tsx`

Add section for managing company members and their permissions:

```typescript
// Add to Settings page
const [showPermissionModal, setShowPermissionModal] = useState(false);
const [selectedMember, setSelectedMember] = useState<CompanyMembership | null>(null);

// In render:
<section>
    <h2>Company Members</h2>
    {/* List of members with edit permissions button */}
    {/* Invite new owner/manager button */}
</section>
```

## Testing Checklist

- [ ] Permission checking works for all roles
- [ ] Navigation items show/hide based on permissions
- [ ] Routes are protected by permissions
- [ ] Manager permission UI works correctly
- [ ] Permissions persist after company switch
- [ ] Default permissions apply correctly

## Next Steps

After completing Phase 3:
1. Test permission system thoroughly
2. Verify UI updates correctly based on permissions
3. Proceed to Phase 4: API & Edge Functions
