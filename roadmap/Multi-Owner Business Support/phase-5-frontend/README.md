# Phase 5: Frontend Features

## Overview

This phase implements the frontend UI components and features needed for multi-owner business support, including company member management, permission-based UI, and enhanced employee features.

## Objectives

1. Create company member management UI
2. Implement permission-based feature visibility
3. Add employee paystub generation/download
4. Enhance employee dashboard
5. Update Settings page with company management

## Features to Implement

### 1. Company Member Management

**File**: `frontend/src/pages/CompanyMembers.tsx` (new)

```typescript
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { type CompanyMembership } from '../lib/api';
import { Plus, UserPlus, Edit, Trash2, Crown, Shield, Eye, Calculator } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ManagerPermissionModal from '../components/ManagerPermissionModal';

const CompanyMembers: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showPermissionModal, setShowPermissionModal] = useState(false);
    const [selectedMember, setSelectedMember] = useState<CompanyMembership | null>(null);
    
    const { data: members, isLoading } = useQuery({
        queryKey: ['companyMembers', user?.currentCompanyId],
        queryFn: async () => {
            // This would need a new API endpoint
            // For now, get from user_companies
            return api.getCompanyMembers(user!.currentCompanyId!);
        },
        enabled: !!user?.currentCompanyId && user.role === 'owner',
    });
    
    const inviteMutation = useMutation({
        mutationFn: async (data: { email: string; role: string; permissions?: any }) => {
            return api.inviteUserToCompany(
                data.email,
                user!.currentCompanyId!,
                data.role as any,
                data.permissions
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['companyMembers'] });
            setShowInviteModal(false);
        },
    });
    
    const removeMutation = useMutation({
        mutationFn: async (userId: number) => {
            return api.removeUserFromCompany(userId, user!.currentCompanyId!);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['companyMembers'] });
        },
    });
    
    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'owner': return Crown;
            case 'manager': return Shield;
            case 'accountant': return Calculator;
            case 'viewer': return Eye;
            default: return UserPlus;
        }
    };
    
    if (!user || user.role !== 'owner') {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">Only owners can manage company members.</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        Company Members
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Manage owners, managers, and other team members
                    </p>
                </div>
                <Button
                    onClick={() => setShowInviteModal(true)}
                    icon={UserPlus}
                >
                    Invite Member
                </Button>
            </div>
            
            <Card className="p-6">
                <div className="space-y-4">
                    {members?.map((member) => {
                        const RoleIcon = getRoleIcon(member.role);
                        return (
                            <div
                                key={member.id}
                                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-neon-emerald to-golden-hour flex items-center justify-center">
                                        <RoleIcon className="h-5 w-5 text-deep-forest" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-foreground">
                                            {member.company.name}
                                        </div>
                                        <div className="text-sm text-muted-foreground capitalize">
                                            {member.role}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {member.role === 'manager' && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setSelectedMember(member);
                                                setShowPermissionModal(true);
                                            }}
                                            icon={Edit}
                                        >
                                            Permissions
                                        </Button>
                                    )}
                                    {member.role !== 'owner' && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                if (confirm(`Remove ${member.role} from company?`)) {
                                                    removeMutation.mutate(member.user_id);
                                                }
                                            }}
                                            icon={Trash2}
                                        >
                                            Remove
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>
            
            {/* Invite Modal */}
            {showInviteModal && (
                <InviteMemberModal
                    onClose={() => setShowInviteModal(false)}
                    onInvite={(data) => inviteMutation.mutate(data)}
                />
            )}
            
            {/* Permission Modal */}
            {showPermissionModal && selectedMember && (
                <ManagerPermissionModal
                    isOpen={showPermissionModal}
                    onClose={() => {
                        setShowPermissionModal(false);
                        setSelectedMember(null);
                    }}
                    onSave={async (permissions) => {
                        await api.updateManagerPermissions(
                            selectedMember.user_id,
                            selectedMember.company_id,
                            permissions
                        );
                        queryClient.invalidateQueries({ queryKey: ['companyMembers'] });
                        setShowPermissionModal(false);
                    }}
                    initialPermissions={selectedMember.permissions || {}}
                    role={selectedMember.role as 'manager' | 'accountant'}
                />
            )}
        </div>
    );
};

export default CompanyMembers;
```

### 2. Update Settings Page

**File**: `frontend/src/pages/Settings.tsx`

Add new section:

```typescript
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';

// In Settings component:
<section className="space-y-4">
    <div className="flex items-center justify-between">
        <div>
            <h3 className="text-xl font-semibold text-foreground">Company Members</h3>
            <p className="text-sm text-muted-foreground">
                Manage owners, managers, and team members
            </p>
        </div>
        <Link to="/company-members">
            <Button icon={Users}>Manage Members</Button>
        </Link>
    </div>
</section>
```

### 3. Employee Paystub Feature

#### A. Paystub Generation API

**File**: `frontend/src/lib/api.ts`

```typescript
// Generate paystub PDF
async generatePaystub(salaryId: number): Promise<Blob> {
    const { data, error } = await supabase
        .from('salaries')
        .select(`
            *,
            employee:employees (*)
        `)
        .eq('id', salaryId)
        .single();
    
    if (error) throw error;
    
    // Call Edge Function to generate PDF
    const response = await fetch(
        `${SUPABASE_URL}/functions/v1/generate-paystub`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            },
            body: JSON.stringify({ salary_id: salaryId }),
        }
    );
    
    if (!response.ok) throw new Error('Failed to generate paystub');
    
    return await response.blob();
}

// Get paystub download URL (if stored in storage)
async getPaystubUrl(salaryId: number): Promise<string> {
    // Implementation to get from storage bucket
}
```

#### B. Paystub Generation Edge Function

**File**: `supabase/functions/generate-paystub/index.ts`

Use a PDF library (e.g., `pdf-lib` or `puppeteer`) to generate paystub PDF.

#### C. Employee Dashboard Update

**File**: `frontend/src/pages/EmployeeDashboard.tsx`

Add paystub download section:

```typescript
import { Download, FileText } from 'lucide-react';

// In component:
const { data: salaries } = useQuery({
    queryKey: ['salaries', 'employee', user?.employee?.id],
    queryFn: async () => {
        const result = await api.getSalaries({
            employee_id: user!.employee!.id,
        });
        return result.data;
    },
    enabled: !!user?.employee?.id,
});

const downloadPaystub = async (salaryId: number) => {
    try {
        const blob = await api.generatePaystub(salaryId);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `paystub-${salaryId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error('Error downloading paystub:', error);
        alert('Failed to download paystub');
    }
};

// In render:
<Card>
    <h3 className="text-lg font-semibold mb-4">Paystubs</h3>
    <div className="space-y-2">
        {salaries?.map((salary) => (
            <div
                key={salary.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border"
            >
                <div>
                    <div className="font-medium">
                        {new Date(salary.payment_date).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                        ${salary.amount.toFixed(2)}
                    </div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadPaystub(salary.id)}
                    icon={Download}
                >
                    Download
                </Button>
            </div>
        ))}
    </div>
</Card>
```

### 4. Enhanced Employee Features

#### A. Hours Worked Summary

**File**: `frontend/src/pages/EmployeeTimeManagement.tsx`

Add summary section (already partially implemented, enhance it):

```typescript
// Add period selector (week, month, year)
const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

// Calculate total hours for period
const totalHoursForPeriod = useMemo(() => {
    // Filter entries by period
    // Calculate sum
}, [submittedData, period]);
```

#### B. Schedule View Enhancement

Already implemented in `EmployeeTimeManagement` for allotted mode. Ensure it's working correctly.

#### C. Timesheet Input

Already implemented in `EmployeeTimeManagement` for submitted mode. Verify all features work.

### 5. Permission-Based UI Updates

#### A. Conditional Feature Rendering

Update all pages to check permissions:

```typescript
// Example: Employees page
const Employees: React.FC = () => {
    const { hasPermission } = usePermissions();
    
    if (!hasPermission('can_manage_employees')) {
        return <AccessDenied />;
    }
    
    // ... rest of component
};
```

#### B. Disable Actions Based on Permissions

```typescript
<Button
    onClick={handleCreate}
    disabled={!hasPermission('can_manage_employees')}
>
    Create Employee
</Button>
```

### 6. Company Selector Enhancement

**File**: `frontend/src/components/CompanySelector.tsx`

Add visual indicators:
- Show role badge
- Show primary company indicator
- Show company count

### 7. Navigation Updates

**File**: `frontend/src/components/Layout.tsx`

Already updated in Phase 3, but verify:
- All items respect permissions
- Company selector is visible
- Employee navigation is separate

## Testing Checklist

- [ ] Company member management UI works
- [ ] Permission modal saves correctly
- [ ] Paystub generation/download works
- [ ] Employee features all functional
- [ ] Permission-based UI shows/hides correctly
- [ ] Navigation respects permissions
- [ ] Settings page updated correctly

## UI/UX Considerations

1. **Clear role indicators**: Use icons/badges to show roles
2. **Permission tooltips**: Explain what each permission does
3. **Loading states**: Show loading for async operations
4. **Error handling**: User-friendly error messages
5. **Confirmation dialogs**: For destructive actions
6. **Success feedback**: Toast notifications for success

## Next Steps

After completing Phase 5:
1. Test all UI features thoroughly
2. Verify permission-based rendering
3. Test employee self-service features
4. Proceed to Phase 6: Migration & Testing
