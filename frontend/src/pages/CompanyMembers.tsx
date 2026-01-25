import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useCurrentCompany } from '../hooks/useCurrentCompany';
import api from '../lib/api';
import { UserPlus, Edit, Trash2, Crown, Shield, Eye, Calculator, Mail, Clock } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { cn } from '../lib/utils';
import InviteMemberModal from '../components/InviteMemberModal';
import ManagerPermissionModal from '../components/ManagerPermissionModal';

interface CompanyMember {
    id: number;
    user_id: number;
    role: string;
    is_primary: boolean;
    invite_status: string;
    created_at: string;
    permissions?: any;
    user?: { id: number; email: string; full_name: string };
}

const roleLabels: Record<string, string> = {
    owner: 'Owner',
    manager: 'Manager',
    accountant: 'Accountant',
    viewer: 'Viewer',
};

const roleIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    owner: Crown,
    manager: Shield,
    accountant: Calculator,
    viewer: Eye,
};

const roleBadgeColors: Record<string, string> = {
    owner: 'bg-amber-500/20 text-amber-500',
    manager: 'bg-blue-500/20 text-blue-500',
    accountant: 'bg-emerald-500/20 text-emerald-500',
    viewer: 'bg-slate-500/20 text-slate-400',
};

const CompanyMembers: React.FC = () => {
    const { user } = useAuth();
    const { currentCompanyId, isOwner } = useCurrentCompany();
    const queryClient = useQueryClient();
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showPermissionModal, setShowPermissionModal] = useState(false);
    const [selectedMember, setSelectedMember] = useState<CompanyMember | null>(null);

    // Fetch company members
    const { data: members, isLoading } = useQuery({
        queryKey: ['companyMembers', currentCompanyId],
        queryFn: async () => {
            if (!currentCompanyId) return [];
            return api.getCompanyMembers(currentCompanyId);
        },
        enabled: !!currentCompanyId && isOwner,
    });

    // Fetch pending invitations
    const { data: pendingInvitations } = useQuery({
        queryKey: ['pendingInvitations', currentCompanyId],
        queryFn: async () => {
            if (!currentCompanyId) return [];
            return api.getPendingCompanyInvitations(currentCompanyId);
        },
        enabled: !!currentCompanyId && isOwner,
    });

    // Remove member mutation
    const removeMutation = useMutation({
        mutationFn: async (membershipId: number) => {
            return api.removeMember(membershipId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['companyMembers'] });
        },
    });


    // Update permissions mutation
    const updatePermissionsMutation = useMutation({
        mutationFn: async ({ membershipId, permissions }: { membershipId: number; permissions: any }) => {
            return api.updateManagerPermissions(membershipId, permissions);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['companyMembers'] });
            queryClient.invalidateQueries({ queryKey: ['user'] });
        },
    });

    const handleRemoveMember = async (member: CompanyMember) => {
        if (!confirm(`Are you sure you want to remove ${member.user?.full_name || member.user?.email || 'this member'} from the company?`)) {
            return;
        }

        // Check if this is the last owner
        const owners = members?.filter(m => m.role === 'owner' && m.invite_status === 'accepted') || [];
        if (member.role === 'owner' && owners.length <= 1) {
            alert('Cannot remove the last owner. Please assign another owner first.');
            return;
        }

        removeMutation.mutate(member.id);
    };

    const handleEditPermissions = (member: CompanyMember) => {
        if (member.role !== 'manager') return;
        setSelectedMember(member);
        setShowPermissionModal(true);
    };

    if (!isOwner) {
        return (
            <div className="p-6">
                <Card className="p-6 text-center">
                    <p className="text-muted-foreground">Only owners can manage company members.</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
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

            {/* Pending Invitations */}
            {pendingInvitations && pendingInvitations.length > 0 && (
                <Card className="p-6">
                    <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Pending Invitations ({pendingInvitations.length})
                    </h2>
                    <div className="space-y-3">
                        {pendingInvitations.map((invite: any) => (
                            <div
                                key={invite.id}
                                className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                        <Mail className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-foreground">
                                            {invite.user?.full_name || invite.user?.email || 'Unknown'}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {invite.user?.email}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={cn(
                                                "text-[10px] px-1.5 py-0.5 rounded font-medium",
                                                roleBadgeColors[invite.role]
                                            )}>
                                                {roleLabels[invite.role]}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                Invited {new Date(invite.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <span className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-500">
                                    Pending
                                </span>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Active Members */}
            <Card className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">
                    Active Members ({members?.filter(m => m.invite_status === 'accepted').length || 0})
                </h2>
                {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : members && members.length > 0 ? (
                    <div className="space-y-3">
                        {members
                            .filter(m => m.invite_status === 'accepted')
                            .map((member) => {
                                const RoleIcon = roleIcons[member.role] || UserPlus;
                                const isCurrentUser = member.user_id === user?.id;
                                return (
                                    <div
                                        key={member.id}
                                        className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className={cn(
                                                "h-12 w-12 rounded-full flex items-center justify-center",
                                                roleBadgeColors[member.role]
                                            )}>
                                                <RoleIcon className="h-6 w-6" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-foreground">
                                                        {member.user?.full_name || member.user?.email || 'Unknown User'}
                                                    </span>
                                                    {isCurrentUser && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-neon-emerald/20 text-neon-emerald">
                                                            You
                                                        </span>
                                                    )}
                                                    {member.is_primary && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-500">
                                                            Primary
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-muted-foreground mt-1">
                                                    {member.user?.email}
                                                </div>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className={cn(
                                                        "text-xs px-2 py-0.5 rounded font-medium",
                                                        roleBadgeColors[member.role]
                                                    )}>
                                                        {roleLabels[member.role]}
                                                    </span>
                                                    {member.role === 'manager' && member.permissions && (
                                                        <span className="text-xs text-muted-foreground">
                                                            {Object.values(member.permissions).filter((p: any) => p === true).length} permissions
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {member.role === 'manager' && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleEditPermissions(member)}
                                                    icon={Edit}
                                                >
                                                    Permissions
                                                </Button>
                                            )}
                                            {!isCurrentUser && member.role !== 'owner' && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleRemoveMember(member)}
                                                    icon={Trash2}
                                                    className="text-destructive hover:text-destructive"
                                                >
                                                    Remove
                                                </Button>
                                            )}
                                            {!isCurrentUser && member.role === 'owner' && (
                                                <span className="text-xs text-muted-foreground">
                                                    Cannot remove owner
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        No members found. Invite someone to get started.
                    </div>
                )}
            </Card>

            {/* Invite Modal */}
            {showInviteModal && (
                <InviteMemberModal
                    isOpen={showInviteModal}
                    onClose={() => setShowInviteModal(false)}
                    onInvite={async (data) => {
                        await api.inviteShareholder({
                            company_id: currentCompanyId!,
                            email: data.email,
                            name: data.name,
                            role: data.role,
                        });
                        queryClient.invalidateQueries({ queryKey: ['companyMembers'] });
                        queryClient.invalidateQueries({ queryKey: ['pendingInvitations'] });
                        setShowInviteModal(false);
                    }}
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
                        await updatePermissionsMutation.mutateAsync({
                            membershipId: selectedMember.id,
                            permissions,
                        });
                        setShowPermissionModal(false);
                        setSelectedMember(null);
                    }}
                    initialPermissions={selectedMember.permissions || {}}
                />
            )}
        </div>
    );
};

export default CompanyMembers;
