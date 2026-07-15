import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Save } from 'lucide-react';
import Button from './ui/Button';
import { cn } from '../lib/utils';
import type { ManagerPermissions } from '../lib/api';

interface ManagerPermissionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (permissions: ManagerPermissions) => Promise<void>;
    initialPermissions: ManagerPermissions;
}

const permissionDefinitions: Array<{
    key: keyof ManagerPermissions;
    label: string;
    description: string;
}> = [
    {
        key: 'can_manage_employees',
        label: 'Manage Employees',
        description: 'Create, edit, and delete employees',
    },
    {
        key: 'can_schedule_employees',
        label: 'Schedule Employees',
        description: 'Create and manage employee schedules',
    },
    {
        key: 'can_approve_timesheets',
        label: 'Approve Timesheets',
        description: 'Approve or reject employee timesheets',
    },
    {
        key: 'can_manage_invoices',
        label: 'Manage Invoices',
        description: 'Create, edit, and manage invoices',
    },
    {
        key: 'can_manage_expenses',
        label: 'Manage Expenses',
        description: 'Create and manage expense entries',
    },
    {
        key: 'can_manage_clients',
        label: 'Manage Clients',
        description: 'Add, edit, and remove clients',
    },
    {
        key: 'can_view_financials',
        label: 'View Financials',
        description: 'View financial reports and data',
    },
    {
        key: 'can_view_reports',
        label: 'View Reports',
        description: 'Access company reports',
    },
];

const ManagerPermissionModal: React.FC<ManagerPermissionModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialPermissions,
}) => {
    const [permissions, setPermissions] = useState<ManagerPermissions>({ ...initialPermissions });
    const [isSaving, setIsSaving] = useState(false);

    const handleTogglePermission = (key: keyof ManagerPermissions) => {
        setPermissions((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(permissions);
        } catch (error) {
            console.error('Failed to save permissions:', error);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative z-10 w-full max-w-2xl max-h-[90vh] bg-card border border-border rounded-lg shadow-xl overflow-hidden flex flex-col"
                >
                    <div className="p-6 flex-shrink-0">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                    <Shield className="h-5 w-5 text-blue-500" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-semibold text-foreground">Manager Permissions</h2>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Configure what this manager can access
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-6 pb-6">
                        <div className="space-y-3">
                            {permissionDefinitions.map((permission) => {
                                const isEnabled = permissions[permission.key] === true;
                                return (
                                    <div
                                        key={permission.key}
                                        className={cn(
                                            "p-4 rounded-lg border transition-colors",
                                            isEnabled
                                                ? "border-neon-emerald/30 bg-neon-emerald/5"
                                                : "border-border bg-card"
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-medium text-foreground">
                                                        {permission.label}
                                                    </h3>
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    {permission.description}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleTogglePermission(permission.key)}
                                                className={cn(
                                                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0",
                                                    isEnabled ? "bg-neon-emerald" : "bg-muted"
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                                        isEnabled ? "translate-x-6" : "translate-x-1"
                                                    )}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-border flex items-center justify-end gap-3 flex-shrink-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isSaving}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSave}
                            icon={Save}
                            disabled={isSaving}
                        >
                            {isSaving ? 'Saving...' : 'Save Permissions'}
                        </Button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ManagerPermissionModal;
