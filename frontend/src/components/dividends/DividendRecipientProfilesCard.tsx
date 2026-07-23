import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api, { type DividendRecipientProfile } from '../../lib/api';
import Button from '../ui/Button';
import Card from '../ui/Card';
import DividendRecipientProfileModal from './DividendRecipientProfileModal';
import { Edit, Plus, Star, Trash2, Users } from 'lucide-react';

interface DividendRecipientProfilesCardProps {
    companyId: number;
}

const formatSIN = (sin: string | null | undefined): string => {
    if (!sin) return '—';
    const cleaned = sin.replace(/\D/g, '');
    if (cleaned.length !== 9) return sin;
    return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6, 9)}`;
};

const DividendRecipientProfilesCard: React.FC<DividendRecipientProfilesCardProps> = ({
    companyId,
}) => {
    const queryClient = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [editingProfile, setEditingProfile] = useState<DividendRecipientProfile | null>(null);
    const [assigning, setAssigning] = useState(false);

    const { data: profiles = [], isLoading } = useQuery({
        queryKey: ['dividend_recipient_profiles', companyId],
        queryFn: () => api.getDividendRecipientProfiles(companyId),
        enabled: !!companyId,
    });

    const { data: missingInfo } = useQuery({
        queryKey: ['dividends_missing_recipients', companyId],
        queryFn: () => api.countDividendsMissingRecipients(companyId),
        enabled: !!companyId,
    });

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['dividend_recipient_profiles', companyId] });
        queryClient.invalidateQueries({ queryKey: ['dividends_missing_recipients', companyId] });
        queryClient.invalidateQueries({ queryKey: ['dividends'] });
        queryClient.invalidateQueries({ queryKey: ['dividends_summary'] });
    };

    const openCreate = () => {
        setEditingProfile(null);
        setShowModal(true);
    };

    const openEdit = (profile: DividendRecipientProfile) => {
        setEditingProfile(profile);
        setShowModal(true);
    };

    const handleSave = async (
        profileData: Omit<DividendRecipientProfile, 'id' | 'created_at' | 'updated_at'>
    ) => {
        if (editingProfile) {
            await api.updateDividendRecipientProfile(editingProfile.id, profileData);
        } else {
            await api.createDividendRecipientProfile(profileData);
        }
        setShowModal(false);
        setEditingProfile(null);
        invalidate();
    };

    const handleDelete = async (profile: DividendRecipientProfile) => {
        if (!window.confirm(`Delete recipient profile "${profile.name}"? Existing dividend allocations keep their snapshot data.`)) {
            return;
        }
        try {
            await api.deleteDividendRecipientProfile(profile.id);
            invalidate();
        } catch (error) {
            console.error('Error deleting profile:', error);
            alert('Error deleting profile. Please try again.');
        }
    };

    const handleSetDefault = async (profile: DividendRecipientProfile) => {
        try {
            await api.setDefaultDividendRecipientProfile(companyId, profile.id);
            invalidate();
        } catch (error) {
            console.error('Error setting default profile:', error);
            alert('Error setting default profile. Please try again.');
        }
    };

    const canAssignMissing =
        (profiles.length === 1 || profiles.some((p) => p.is_default)) &&
        (missingInfo?.count ?? 0) > 0;

    const handleAssignMissing = async () => {
        const count = missingInfo?.count ?? 0;
        const total = missingInfo?.totalAmount ?? 0;
        const formatted = new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(total);

        if (
            !window.confirm(
                `Assign the default recipient profile to ${count} dividend(s) with no recipients (total ${formatted})? This creates allocation rows at 100% of each dividend amount.`
            )
        ) {
            return;
        }

        setAssigning(true);
        try {
            const result = await api.assignMissingDividendsToDefaultProfile(companyId);
            alert(
                `Assigned ${result.assignedCount} dividend(s) totaling ${new Intl.NumberFormat('en-CA', {
                    style: 'currency',
                    currency: 'CAD',
                }).format(result.totalAmount)}.`
            );
            invalidate();
        } catch (error) {
            console.error('Error assigning missing dividends:', error);
            alert(error instanceof Error ? error.message : 'Error assigning missing dividends.');
        } finally {
            setAssigning(false);
        }
    };

    return (
        <>
            <Card className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                    <div>
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            Dividend recipient profiles
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                            Save recipient identity once (name, SIN, address). New dividends can auto-fill from your default profile.
                        </p>
                    </div>
                    <Button type="button" size="sm" icon={Plus} onClick={openCreate}>
                        Add profile
                    </Button>
                </div>

                {isLoading ? (
                    <p className="text-sm text-muted-foreground py-4">Loading profiles...</p>
                ) : profiles.length === 0 ? (
                    <div className="rounded-md border border-border bg-muted/30 p-4 text-center">
                        <p className="text-sm text-foreground">No recipient profiles yet</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Create a profile so you do not re-enter SIN and address on every dividend.
                        </p>
                        <Button type="button" className="mt-3" size="sm" icon={Plus} onClick={openCreate}>
                            Create profile
                        </Button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-semibold">
                                <tr>
                                    <th className="px-3 py-2 text-left">Name</th>
                                    <th className="px-3 py-2 text-left">Type</th>
                                    <th className="px-3 py-2 text-left">SIN / BN</th>
                                    <th className="px-3 py-2 text-left">Default</th>
                                    <th className="px-3 py-2 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {profiles.map((profile) => (
                                    <tr key={profile.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-3 py-2 text-foreground">{profile.name}</td>
                                        <td className="px-3 py-2 text-muted-foreground capitalize">
                                            {profile.recipient_type}
                                        </td>
                                        <td className="px-3 py-2 text-muted-foreground">
                                            {profile.recipient_type === 'individual'
                                                ? formatSIN(profile.recipient_sin)
                                                : profile.business_number || '—'}
                                        </td>
                                        <td className="px-3 py-2">
                                            {profile.is_default ? (
                                                <span className="inline-flex items-center gap-1 text-xs text-primary">
                                                    <Star className="h-3 w-3 fill-current" />
                                                    Default
                                                </span>
                                            ) : (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleSetDefault(profile)}
                                                    className="h-7 px-2 text-xs text-muted-foreground"
                                                >
                                                    Set default
                                                </Button>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    title="Edit"
                                                    onClick={() => openEdit(profile)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    title="Delete"
                                                    onClick={() => handleDelete(profile)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {canAssignMissing && (
                    <div className="mt-4 rounded-md border border-border bg-muted/30 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <p className="text-xs text-muted-foreground">
                            {missingInfo?.count} dividend(s) have no recipients
                            {missingInfo
                                ? ` (${new Intl.NumberFormat('en-CA', {
                                      style: 'currency',
                                      currency: 'CAD',
                                  }).format(missingInfo.totalAmount)})`
                                : ''}
                            . Assign them to your default profile?
                        </p>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={assigning}
                            onClick={handleAssignMissing}
                        >
                            {assigning ? 'Assigning...' : 'Assign missing dividends'}
                        </Button>
                    </div>
                )}
            </Card>

            {showModal && (
                <DividendRecipientProfileModal
                    profile={editingProfile}
                    companyId={companyId}
                    onClose={() => {
                        setShowModal(false);
                        setEditingProfile(null);
                    }}
                    onSave={handleSave}
                />
            )}
        </>
    );
};

export default DividendRecipientProfilesCard;
