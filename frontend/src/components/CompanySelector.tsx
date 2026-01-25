import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, ChevronDown, Check, Crown, Users } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

const roleLabels: Record<string, string> = {
    owner: 'Owner',
    manager: 'Manager',
    accountant: 'Accountant',
    viewer: 'Viewer',
};

const roleBadgeColors: Record<string, string> = {
    owner: 'bg-amber-500/20 text-amber-500',
    manager: 'bg-blue-500/20 text-blue-500',
    accountant: 'bg-emerald-500/20 text-emerald-500',
    viewer: 'bg-slate-500/20 text-slate-400',
};

export const CompanySelector: React.FC = () => {
    const { user, switchCompany } = useAuth();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const companies = user?.companies ?? [];
    const currentCompany = user?.currentCompany ?? user?.company;
    const currentRole = companies.find(c => c.company_id === user?.currentCompanyId)?.role ?? user?.role;

    // Don't render if user has 0 or 1 company
    if (companies.length <= 1) {
        return null;
    }

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectCompany = async (companyId: number) => {
        if (companyId === user?.currentCompanyId) {
            setIsOpen(false);
            return;
        }

        setIsLoading(true);
        try {
            await switchCompany(companyId);
            setIsOpen(false);
            // Invalidate all queries to refresh data for new company context
            await queryClient.invalidateQueries();
        } catch (error) {
            console.error('Failed to switch company:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div ref={dropdownRef} className="relative">
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                disabled={isLoading}
                className={cn(
                    "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg",
                    "bg-card/50 border border-border hover:border-neon-emerald/30",
                    "transition-all duration-200",
                    isOpen && "border-neon-emerald/50 bg-card",
                    isLoading && "opacity-50 cursor-wait"
                )}
            >
                <div className="h-8 w-8 rounded-lg bg-neon-emerald/20 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-4 w-4 text-neon-emerald" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-foreground truncate">
                        {currentCompany?.name ?? 'Select Company'}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                        {roleLabels[currentRole ?? ''] ?? currentRole}
                    </p>
                </div>
                <ChevronDown className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    isOpen && "rotate-180"
                )} />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className={cn(
                            "absolute z-50 w-full mt-2 py-1",
                            "bg-card border border-border rounded-lg shadow-xl",
                            "max-h-[280px] overflow-y-auto"
                        )}
                    >
                        <div className="px-3 py-2 border-b border-border">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Users className="h-3 w-3" />
                                <span>Your Companies ({companies.length})</span>
                            </div>
                        </div>

                        {companies.map((membership) => {
                            const isSelected = membership.company_id === user?.currentCompanyId;
                            return (
                                <button
                                    key={membership.id}
                                    type="button"
                                    onClick={() => handleSelectCompany(membership.company_id)}
                                    disabled={isLoading}
                                    className={cn(
                                        "flex items-center gap-3 w-full px-3 py-2.5",
                                        "hover:bg-muted/50 transition-colors",
                                        isSelected && "bg-neon-emerald/10"
                                    )}
                                >
                                    <div className={cn(
                                        "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0",
                                        isSelected
                                            ? "bg-neon-emerald/20"
                                            : "bg-muted"
                                    )}>
                                        <Building2 className={cn(
                                            "h-4 w-4",
                                            isSelected ? "text-neon-emerald" : "text-muted-foreground"
                                        )} />
                                    </div>

                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="flex items-center gap-2">
                                            <p className={cn(
                                                "text-sm font-medium truncate",
                                                isSelected ? "text-neon-emerald" : "text-foreground"
                                            )}>
                                                {membership.company.name}
                                            </p>
                                            {membership.role === 'owner' && (
                                                <Crown className="h-3 w-3 text-amber-500 flex-shrink-0" />
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "text-[10px] px-1.5 py-0.5 rounded font-medium",
                                                roleBadgeColors[membership.role]
                                            )}>
                                                {roleLabels[membership.role]}
                                            </span>
                                        </div>
                                    </div>

                                    {isSelected && (
                                        <Check className="h-4 w-4 text-neon-emerald flex-shrink-0" />
                                    )}
                                </button>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
