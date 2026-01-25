import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Users, Mail } from 'lucide-react';

interface CompanyMembersSummaryProps {
    companyId: number | null | undefined;
}

const CompanyMembersSummary: React.FC<CompanyMembersSummaryProps> = ({ companyId }) => {
    const { data: members, isLoading } = useQuery({
        queryKey: ['companyMembers', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            return api.getCompanyMembers(companyId);
        },
        enabled: !!companyId,
    });

    const { data: pendingInvitations } = useQuery({
        queryKey: ['pendingInvitations', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            return api.getPendingCompanyInvitations(companyId);
        },
        enabled: !!companyId,
    });

    if (isLoading) {
        return <div className="text-sm text-muted-foreground">Loading...</div>;
    }

    const activeMembers = members?.filter(m => m.invite_status === 'accepted') || [];
    const pendingCount = pendingInvitations?.length || 0;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">Active Members</span>
                </div>
                <span className="text-sm font-medium text-foreground">{activeMembers.length}</span>
            </div>
            {pendingCount > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-amber-500" />
                        <span className="text-sm text-foreground">Pending Invitations</span>
                    </div>
                    <span className="text-sm font-medium text-amber-500">{pendingCount}</span>
                </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
                Manage who has access to your company and their permissions.
            </p>
        </div>
    );
};

export default CompanyMembersSummary;
