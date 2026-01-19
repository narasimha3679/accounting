import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Edit, Save, X, AlertTriangle } from 'lucide-react';
import type { EmployeeTaxCredits } from '../../lib/api';

interface EmployeeTD1FormProps {
    employeeId: number;
    year?: number;
}

export default function EmployeeTD1Form({ employeeId, year }: EmployeeTD1FormProps) {
    const taxYear = year || new Date().getFullYear();
    const [isEditing, setIsEditing] = useState(false);
    const queryClient = useQueryClient();

    const { data: taxCredits, isLoading } = useQuery({
        queryKey: ['myTaxCredits', employeeId, taxYear],
        queryFn: () => api.getMyTaxCredits(taxYear),
        enabled: !!employeeId,
    });

    const { data: taxConstants } = useQuery({
        queryKey: ['taxConstants', taxYear],
        queryFn: () => api.getTaxConstants(taxYear),
    });

    const { data: provincialConstants } = useQuery({
        queryKey: ['provincialTaxConstants', taxYear, 'ON'],
        queryFn: () => api.getProvincialTaxConstants(taxYear, 'ON'),
    });

    const [formData, setFormData] = useState({
        federal_basic_personal: taxConstants?.federal_basic_personal_amount || 0,
        federal_additional_claims: 0,
        provincial_basic_personal: provincialConstants?.basic_personal_amount || 0,
        provincial_additional_claims: 0,
        additional_tax_per_pay: 0,
        claim_tax_exempt: false,
    });

    React.useEffect(() => {
        if (taxCredits) {
            setFormData({
                federal_basic_personal: taxCredits.federal_basic_personal,
                federal_additional_claims: taxCredits.federal_additional_claims,
                provincial_basic_personal: taxCredits.provincial_basic_personal,
                provincial_additional_claims: taxCredits.provincial_additional_claims,
                additional_tax_per_pay: taxCredits.additional_tax_per_pay,
                claim_tax_exempt: taxCredits.claim_tax_exempt,
            });
        } else if (taxConstants && provincialConstants) {
            setFormData({
                federal_basic_personal: taxConstants.federal_basic_personal_amount,
                federal_additional_claims: 0,
                provincial_basic_personal: provincialConstants.basic_personal_amount,
                provincial_additional_claims: 0,
                additional_tax_per_pay: 0,
                claim_tax_exempt: false,
            });
        }
    }, [taxCredits, taxConstants, provincialConstants]);

    const updateMutation = useMutation({
        mutationFn: (credits: Partial<EmployeeTaxCredits>) =>
            api.updateMyTaxCredits(taxYear, credits),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['myTaxCredits', employeeId, taxYear] });
            setIsEditing(false);
        },
    });

    const handleSave = () => {
        const federalTotal = formData.federal_basic_personal + formData.federal_additional_claims;
        const provincialTotal = formData.provincial_basic_personal + formData.provincial_additional_claims;

        updateMutation.mutate({
            federal_basic_personal: formData.federal_basic_personal,
            federal_additional_claims: formData.federal_additional_claims,
            federal_total_claim: federalTotal,
            provincial_basic_personal: formData.provincial_basic_personal,
            provincial_additional_claims: formData.provincial_additional_claims,
            provincial_total_claim: provincialTotal,
            additional_tax_per_pay: formData.additional_tax_per_pay,
            claim_tax_exempt: formData.claim_tax_exempt,
            effective_date: new Date().toISOString().split('T')[0],
        });
    };

    const handleCancel = () => {
        if (taxCredits) {
            setFormData({
                federal_basic_personal: taxCredits.federal_basic_personal,
                federal_additional_claims: taxCredits.federal_additional_claims,
                provincial_basic_personal: taxCredits.provincial_basic_personal,
                provincial_additional_claims: taxCredits.provincial_additional_claims,
                additional_tax_per_pay: taxCredits.additional_tax_per_pay,
                claim_tax_exempt: taxCredits.claim_tax_exempt,
            });
        }
        setIsEditing(false);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(amount);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-emerald"></div>
            </div>
        );
    }

    const federalTotal = formData.federal_basic_personal + formData.federal_additional_claims;
    const provincialTotal = formData.provincial_basic_personal + formData.provincial_additional_claims;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">Tax Credits (TD1)</h2>
                {!isEditing && (
                    <Button
                        variant="outline"
                        size="sm"
                        icon={Edit}
                        onClick={() => setIsEditing(true)}
                    >
                        Edit
                    </Button>
                )}
            </div>

            <Card>
                {!isEditing ? (
                    <div className="space-y-6">
                        {/* Federal TD1 */}
                        <div>
                            <h3 className="text-lg font-semibold mb-3 text-foreground">FEDERAL TD1 ({taxYear})</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Basic Personal Amount</span>
                                    <span className="font-medium text-foreground">
                                        {formatCurrency(taxCredits?.federal_basic_personal || formData.federal_basic_personal)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Additional Claims</span>
                                    <span className="font-medium text-foreground">
                                        {formatCurrency(taxCredits?.federal_additional_claims || 0)}
                                    </span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-white/10">
                                    <span className="font-semibold text-foreground">Total Claim</span>
                                    <span className="font-semibold text-foreground">
                                        {formatCurrency(taxCredits?.federal_total_claim || federalTotal)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Provincial TD1 */}
                        <div>
                            <h3 className="text-lg font-semibold mb-3 text-foreground">ONTARIO TD1 ({taxYear})</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Basic Personal Amount</span>
                                    <span className="font-medium text-foreground">
                                        {formatCurrency(taxCredits?.provincial_basic_personal || formData.provincial_basic_personal)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Additional Claims</span>
                                    <span className="font-medium text-foreground">
                                        {formatCurrency(taxCredits?.provincial_additional_claims || 0)}
                                    </span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-white/10">
                                    <span className="font-semibold text-foreground">Total Claim</span>
                                    <span className="font-semibold text-foreground">
                                        {formatCurrency(taxCredits?.provincial_total_claim || provincialTotal)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Additional Options */}
                        <div>
                            <h3 className="text-lg font-semibold mb-3 text-foreground">ADDITIONAL OPTIONS</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Additional Tax Per Pay Period</span>
                                    <span className="font-medium text-foreground">
                                        {formatCurrency(taxCredits?.additional_tax_per_pay || 0)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Claim Tax Exempt</span>
                                    <span className="font-medium text-foreground">
                                        {taxCredits?.claim_tax_exempt ? 'Yes' : 'No'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {taxCredits && (
                            <p className="text-sm text-muted-foreground mt-4">
                                Last Updated: {new Date(taxCredits.updated_at).toLocaleDateString('en-CA')}
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-3 text-foreground">FEDERAL CLAIMS</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-foreground">
                                        Basic Personal Amount
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.federal_basic_personal}
                                        onChange={(e) =>
                                            setFormData({ ...formData, federal_basic_personal: Number(e.target.value) })
                                        }
                                        className="w-full glass border border-white/10 rounded-lg px-3 py-2 text-white bg-transparent focus:outline-none focus:ring-2 focus:ring-neon-emerald"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {taxYear} default: {formatCurrency(taxConstants?.federal_basic_personal_amount || 0)}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-foreground">
                                        Additional Claims
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.federal_additional_claims}
                                        onChange={(e) =>
                                            setFormData({ ...formData, federal_additional_claims: Number(e.target.value) })
                                        }
                                        className="w-full glass border border-white/10 rounded-lg px-3 py-2 text-white bg-transparent focus:outline-none focus:ring-2 focus:ring-neon-emerald"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Additional claims may include: spouse/partner amount, eligible dependent amount,
                                        caregiver amount, disability amount, tuition, etc. See TD1 form for details.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold mb-3 text-foreground">PROVINCIAL CLAIMS (Ontario)</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-foreground">
                                        Basic Personal Amount
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.provincial_basic_personal}
                                        onChange={(e) =>
                                            setFormData({ ...formData, provincial_basic_personal: Number(e.target.value) })
                                        }
                                        className="w-full glass border border-white/10 rounded-lg px-3 py-2 text-white bg-transparent focus:outline-none focus:ring-2 focus:ring-neon-emerald"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {taxYear} default: {formatCurrency(provincialConstants?.basic_personal_amount || 0)}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-foreground">
                                        Additional Claims
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.provincial_additional_claims}
                                        onChange={(e) =>
                                            setFormData({ ...formData, provincial_additional_claims: Number(e.target.value) })
                                        }
                                        className="w-full glass border border-white/10 rounded-lg px-3 py-2 text-white bg-transparent focus:outline-none focus:ring-2 focus:ring-neon-emerald"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold mb-3 text-foreground">ADDITIONAL OPTIONS</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-foreground">
                                        Additional Tax Per Pay Period
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.additional_tax_per_pay}
                                        onChange={(e) =>
                                            setFormData({ ...formData, additional_tax_per_pay: Number(e.target.value) })
                                        }
                                        className="w-full glass border border-white/10 rounded-lg px-3 py-2 text-white bg-transparent focus:outline-none focus:ring-2 focus:ring-neon-emerald"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Request extra tax withheld each pay period.
                                    </p>
                                </div>
                                <div className="flex items-start gap-2">
                                    <input
                                        type="checkbox"
                                        id="taxExempt"
                                        checked={formData.claim_tax_exempt}
                                        onChange={(e) =>
                                            setFormData({ ...formData, claim_tax_exempt: e.target.checked })
                                        }
                                        className="mt-1"
                                    />
                                    <label htmlFor="taxExempt" className="text-sm text-foreground">
                                        I claim tax exempt status (Line 13 of TD1)
                                    </label>
                                </div>
                                {formData.claim_tax_exempt && (
                                    <div className="flex items-start gap-2 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                                        <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                                        <p className="text-sm text-yellow-200">
                                            Only check this if you expect to earn less than your total claim amount for the year.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-2 pt-4 border-t border-white/10">
                            <Button
                                variant="outline"
                                size="sm"
                                icon={X}
                                onClick={handleCancel}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="default"
                                size="sm"
                                icon={Save}
                                onClick={handleSave}
                                disabled={updateMutation.isPending}
                            >
                                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
