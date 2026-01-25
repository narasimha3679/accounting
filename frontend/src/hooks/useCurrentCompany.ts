import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { Company, CompanyMembership, ManagerPermissions } from '../lib/api';

/**
 * Hook that provides the current company context and helper functions for permissions.
 * Use this hook in components that need to work with company-scoped data.
 */
export const useCurrentCompany = () => {
    const { user, switchCompany } = useAuth();

    const currentCompany = useMemo((): Company | undefined => {
        return user?.currentCompany ?? user?.company;
    }, [user?.currentCompany, user?.company]);

    const currentCompanyId = useMemo((): number | null => {
        return user?.currentCompanyId ?? user?.company_id ?? null;
    }, [user?.currentCompanyId, user?.company_id]);

    const companies = useMemo((): CompanyMembership[] => {
        return user?.companies ?? [];
    }, [user?.companies]);

    const currentMembership = useMemo((): CompanyMembership | undefined => {
        if (!currentCompanyId) return undefined;
        return companies.find(c => c.company_id === currentCompanyId);
    }, [companies, currentCompanyId]);

    const currentRole = useMemo((): string => {
        return currentMembership?.role ?? user?.role ?? 'viewer';
    }, [currentMembership?.role, user?.role]);

    const permissions = useMemo((): ManagerPermissions => {
        return user?.permissions ?? currentMembership?.permissions ?? {};
    }, [user?.permissions, currentMembership?.permissions]);

    const isOwner = useMemo(() => currentRole === 'owner', [currentRole]);
    const isManager = useMemo(() => currentRole === 'manager', [currentRole]);
    const isAccountant = useMemo(() => currentRole === 'accountant', [currentRole]);
    const isViewer = useMemo(() => currentRole === 'viewer', [currentRole]);

    const hasMultipleCompanies = useMemo(() => companies.length > 1, [companies]);

    /**
     * Check if the current user has a specific permission.
     * Owners always have all permissions.
     */
    const hasPermission = (permission: keyof ManagerPermissions): boolean => {
        if (isOwner) return true;
        return permissions[permission] === true;
    };

    /**
     * Check if user can perform write operations (not a viewer)
     */
    const canWrite = useMemo((): boolean => {
        return isOwner || isManager || isAccountant;
    }, [isOwner, isManager, isAccountant]);

    /**
     * Check if user can manage employees/payroll
     */
    const canManageEmployees = useMemo((): boolean => {
        if (isOwner) return true;
        if (isManager) return hasPermission('can_manage_employees');
        return false;
    }, [isOwner, isManager, hasPermission]);

    /**
     * Check if user can view financials
     */
    const canViewFinancials = useMemo((): boolean => {
        if (isOwner || isAccountant) return true;
        if (isManager) return hasPermission('can_view_financials');
        return false;
    }, [isOwner, isAccountant, isManager, hasPermission]);

    /**
     * Check if user can manage expenses
     */
    const canManageExpenses = useMemo((): boolean => {
        if (isOwner || isAccountant) return true;
        if (isManager) return hasPermission('can_manage_expenses');
        return false;
    }, [isOwner, isAccountant, isManager, hasPermission]);

    /**
     * Check if user can manage invoices
     */
    const canManageInvoices = useMemo((): boolean => {
        if (isOwner || isAccountant) return true;
        if (isManager) return hasPermission('can_manage_invoices');
        return false;
    }, [isOwner, isAccountant, isManager, hasPermission]);

    /**
     * Check if user can manage clients
     */
    const canManageClients = useMemo((): boolean => {
        if (isOwner || isAccountant) return true;
        if (isManager) return hasPermission('can_manage_clients');
        return false;
    }, [isOwner, isAccountant, isManager, hasPermission]);

    /**
     * Check if user can view reports
     */
    const canViewReports = useMemo((): boolean => {
        if (isOwner || isAccountant) return true;
        if (isManager) return hasPermission('can_view_reports');
        return false;
    }, [isOwner, isAccountant, isManager, hasPermission]);

    return {
        // Core data
        currentCompany,
        currentCompanyId,
        currentRole,
        companies,
        currentMembership,
        permissions,
        hasMultipleCompanies,

        // Role checks
        isOwner,
        isManager,
        isAccountant,
        isViewer,

        // Permission checks
        hasPermission,
        canWrite,
        canManageEmployees,
        canViewFinancials,
        canManageExpenses,
        canManageInvoices,
        canManageClients,
        canViewReports,

        // Actions
        switchCompany,
    };
};
