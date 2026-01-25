import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Building2, Mail, User, AlertCircle } from 'lucide-react';
import api from '../lib/api';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const AcceptInvitation: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, refreshUser } = useAuth();
    const queryClient = useQueryClient();
    const inviteToken = searchParams.get('token');
    
    const [invitationData, setInvitationData] = useState<{
        company_name?: string;
        role?: string;
        email?: string;
    } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch invitation details
    useEffect(() => {
        const fetchInvitation = async () => {
            if (!inviteToken) {
                setError('Invalid invitation link. No token provided.');
                setIsLoading(false);
                return;
            }

            try {
                // Try to find the invitation in user_companies
                const { data: { user: authUser } } = await supabase.auth.getUser();
                if (!authUser) {
                    setError('Please log in to accept this invitation.');
                    setIsLoading(false);
                    return;
                }

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('auth_user_id', authUser.id)
                    .single();

                if (!profile) {
                    setError('User profile not found.');
                    setIsLoading(false);
                    return;
                }

                // Check user_companies for pending invitation
                const { data: membership, error: membershipError } = await supabase
                    .from('user_companies')
                    .select(`
                        *,
                        company:companies (id, name)
                    `)
                    .eq('invite_token', inviteToken)
                    .eq('user_id', profile.id)
                    .eq('invite_status', 'pending')
                    .maybeSingle();

                if (membershipError || !membership) {
                    // Check pending_shareholder_invites table
                    const { data: pendingInvite, error: pendingError } = await supabase
                        .from('pending_shareholder_invites')
                        .select('*')
                        .eq('invite_token', inviteToken)
                        .is('claimed_at', null)
                        .gt('expires_at', new Date().toISOString())
                        .maybeSingle();

                    if (pendingError || !pendingInvite) {
                        setError('Invitation not found or has expired.');
                        setIsLoading(false);
                        return;
                    }

                    setInvitationData({
                        company_name: 'Unknown Company', // Will need to fetch company name
                        role: pendingInvite.role,
                        email: pendingInvite.email,
                    });
                } else {
                    const company = Array.isArray(membership.company) ? membership.company[0] : membership.company;
                    setInvitationData({
                        company_name: company?.name || 'Unknown Company',
                        role: membership.role,
                        email: user?.email,
                    });
                }
            } catch (err: any) {
                setError(err.message || 'Failed to load invitation details.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchInvitation();
    }, [inviteToken, user]);

    // Accept invitation mutation
    const acceptMutation = useMutation({
        mutationFn: async () => {
            if (!inviteToken) throw new Error('No invitation token');
            await api.acceptInvitation(inviteToken);
        },
        onSuccess: async () => {
            await refreshUser();
            queryClient.invalidateQueries();
            // Redirect to dashboard after a short delay
            setTimeout(() => {
                navigate('/');
            }, 2000);
        },
    });

    const roleLabels: Record<string, string> = {
        owner: 'Owner',
        manager: 'Manager',
        accountant: 'Accountant',
        viewer: 'Viewer',
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Card className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-emerald mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading invitation...</p>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md w-full"
                >
                    <Card className="p-8">
                        <div className="text-center">
                            <div className="h-16 w-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
                                <XCircle className="h-8 w-8 text-destructive" />
                            </div>
                            <h1 className="text-2xl font-bold text-foreground mb-2">Invitation Error</h1>
                            <p className="text-muted-foreground mb-6">{error}</p>
                            <Button onClick={() => navigate('/')}>Go to Dashboard</Button>
                        </div>
                    </Card>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full"
            >
                <Card className="p-8">
                    <div className="text-center mb-6">
                        <div className="h-16 w-16 rounded-full bg-neon-emerald/20 flex items-center justify-center mx-auto mb-4">
                            <Building2 className="h-8 w-8 text-neon-emerald" />
                        </div>
                        <h1 className="text-2xl font-bold text-foreground mb-2">Company Invitation</h1>
                        <p className="text-muted-foreground">You've been invited to join a company</p>
                    </div>

                    {invitationData && (
                        <div className="space-y-4 mb-6">
                            <div className="p-4 rounded-lg border border-border bg-muted/30">
                                <div className="flex items-center gap-3 mb-3">
                                    <Building2 className="h-5 w-5 text-neon-emerald" />
                                    <div className="flex-1">
                                        <p className="text-sm text-muted-foreground">Company</p>
                                        <p className="font-medium text-foreground">{invitationData.company_name}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 mb-3">
                                    <User className="h-5 w-5 text-neon-emerald" />
                                    <div className="flex-1">
                                        <p className="text-sm text-muted-foreground">Your Role</p>
                                        <p className="font-medium text-foreground">
                                            {roleLabels[invitationData.role || ''] || invitationData.role}
                                        </p>
                                    </div>
                                </div>
                                {invitationData.email && (
                                    <div className="flex items-center gap-3">
                                        <Mail className="h-5 w-5 text-neon-emerald" />
                                        <div className="flex-1">
                                            <p className="text-sm text-muted-foreground">Email</p>
                                            <p className="font-medium text-foreground">{invitationData.email}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-foreground">
                                    By accepting, you'll gain access to this company's data based on your assigned role.
                                </p>
                            </div>
                        </div>
                    )}

                    {acceptMutation.isSuccess ? (
                        <div className="text-center">
                            <div className="h-16 w-16 rounded-full bg-neon-emerald/20 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="h-8 w-8 text-neon-emerald" />
                            </div>
                            <h2 className="text-xl font-semibold text-foreground mb-2">Invitation Accepted!</h2>
                            <p className="text-muted-foreground mb-4">Redirecting to your dashboard...</p>
                        </div>
                    ) : (
                        <div className="flex items-center justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => navigate('/')}
                                disabled={acceptMutation.isPending}
                            >
                                Decline
                            </Button>
                            <Button
                                onClick={() => acceptMutation.mutate()}
                                disabled={acceptMutation.isPending}
                                icon={CheckCircle2}
                            >
                                {acceptMutation.isPending ? 'Accepting...' : 'Accept Invitation'}
                            </Button>
                        </div>
                    )}
                </Card>
            </motion.div>
        </div>
    );
};

export default AcceptInvitation;
