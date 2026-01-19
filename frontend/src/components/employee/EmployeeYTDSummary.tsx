import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import Card from '../ui/Card';
import StatCard from '../ui/StatCard';
import { DollarSign, TrendingUp, Calendar, Briefcase } from 'lucide-react';

interface EmployeeYTDSummaryProps {
    employeeId: number;
    year?: number;
}

export default function EmployeeYTDSummary({ employeeId, year }: EmployeeYTDSummaryProps) {
    const taxYear = year || new Date().getFullYear();

    const { data: ytd, isLoading } = useQuery({
        queryKey: ['myYTD', employeeId, taxYear],
        queryFn: () => api.getMyYTD(taxYear),
        enabled: !!employeeId,
    });

    const { data: taxConstants } = useQuery({
        queryKey: ['taxConstants', taxYear],
        queryFn: () => api.getTaxConstants(taxYear),
    });

    const { data: recentPayStubs } = useQuery({
        queryKey: ['myPayStubs', employeeId, 'recent'],
        queryFn: () => api.getMyPayStubs({ limit: 1 }),
        enabled: !!employeeId,
    });

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(amount);
    };

    const formatPercent = (value: number, max: number) => {
        if (max === 0) return 0;
        return Math.min(100, (value / max) * 100);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-emerald"></div>
            </div>
        );
    }

    if (!ytd) {
        return (
            <Card>
                <div className="text-center py-12">
                    <p className="text-muted-foreground">No YTD data available for {taxYear}</p>
                </div>
            </Card>
        );
    }

    const lastPay = recentPayStubs && recentPayStubs.length > 0 ? recentPayStubs[0] : null;
    const cppMax = taxConstants?.cpp_max_contribution || 0;
    const cpp2Max = taxConstants?.cpp2_max_contribution || 0;
    const eiMax = taxConstants?.ei_max_premium || 0;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">Year-to-Date Summary ({taxYear})</h2>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="YTD Gross"
                    value={formatCurrency(ytd.gross_earnings)}
                    icon={DollarSign}
                />
                <StatCard
                    title="YTD Net"
                    value={formatCurrency(ytd.gross_earnings - ytd.federal_tax_withheld - ytd.provincial_tax_withheld - ytd.cpp_contributions - ytd.cpp2_contributions - ytd.ei_premiums)}
                    icon={TrendingUp}
                />
                <StatCard
                    title="Vacation Balance"
                    value={formatCurrency(ytd.vacation_balance)}
                    icon={Briefcase}
                />
                <StatCard
                    title="Last Pay"
                    value={lastPay ? formatCurrency(lastPay.net_pay) : formatCurrency(0)}
                    icon={Calendar}
                />
            </div>

            {/* Earnings Section */}
            <Card>
                <h3 className="text-lg font-semibold mb-4 text-foreground">EARNINGS</h3>
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Gross Earnings</span>
                        <span className="font-medium text-foreground">{formatCurrency(ytd.gross_earnings)}</span>
                    </div>
                    {ytd.taxable_benefits > 0 && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Taxable Benefits</span>
                            <span className="font-medium text-foreground">{formatCurrency(ytd.taxable_benefits)}</span>
                        </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-white/10">
                        <span className="font-semibold text-foreground">Total Earnings</span>
                        <span className="font-semibold text-foreground">{formatCurrency(ytd.gross_earnings + ytd.taxable_benefits)}</span>
                    </div>
                </div>
            </Card>

            {/* Deductions Section */}
            <Card>
                <h3 className="text-lg font-semibold mb-4 text-foreground">DEDUCTIONS</h3>
                <div className="space-y-4">
                    {/* CPP */}
                    <div>
                        <div className="flex justify-between mb-1">
                            <span className="text-muted-foreground">CPP Contributions</span>
                            <span className="font-medium text-foreground">
                                {formatCurrency(ytd.cpp_contributions)} / {formatCurrency(cppMax)}
                            </span>
                        </div>
                            <div className="w-full bg-white/10 rounded-full h-2">
                                <div
                                    className="bg-neon-emerald h-2 rounded-full transition-all"
                                    style={{ width: `${Math.min(100, formatPercent(ytd.cpp_contributions, cppMax))}%` }}
                                />
                            </div>
                        </div>

                        {/* CPP2 */}
                        {cpp2Max > 0 && (
                            <div>
                                <div className="flex justify-between mb-1">
                                    <span className="text-muted-foreground">CPP2 Contributions</span>
                                    <span className="font-medium text-foreground">
                                        {formatCurrency(ytd.cpp2_contributions)} / {formatCurrency(cpp2Max)}
                                    </span>
                                </div>
                                <div className="w-full bg-white/10 rounded-full h-2">
                                    <div
                                        className="bg-neon-emerald h-2 rounded-full transition-all"
                                        style={{ width: `${Math.min(100, formatPercent(ytd.cpp2_contributions, cpp2Max))}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* EI */}
                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-muted-foreground">EI Premiums</span>
                                <span className="font-medium text-foreground">
                                    {formatCurrency(ytd.ei_premiums)} / {formatCurrency(eiMax)}
                                </span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-2">
                                <div
                                    className="bg-neon-emerald h-2 rounded-full transition-all"
                                    style={{ width: `${Math.min(100, formatPercent(ytd.ei_premiums, eiMax))}%` }}
                                />
                            </div>
                        </div>

                    {/* Taxes */}
                    <div className="flex justify-between pt-2 border-t border-white/10">
                        <span className="text-muted-foreground">Federal Tax</span>
                        <span className="font-medium text-foreground">{formatCurrency(ytd.federal_tax_withheld)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Provincial Tax</span>
                        <span className="font-medium text-foreground">{formatCurrency(ytd.provincial_tax_withheld)}</span>
                    </div>

                    {/* Other Deductions */}
                    {(ytd.rrsp_contributions > 0 || ytd.union_dues > 0 || ytd.charitable_donations > 0) && (
                        <>
                            {ytd.rrsp_contributions > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">RRSP Contributions</span>
                                    <span className="font-medium text-foreground">{formatCurrency(ytd.rrsp_contributions)}</span>
                                </div>
                            )}
                            {ytd.union_dues > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Union Dues</span>
                                    <span className="font-medium text-foreground">{formatCurrency(ytd.union_dues)}</span>
                                </div>
                            )}
                            {ytd.charitable_donations > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Charitable Donations</span>
                                    <span className="font-medium text-foreground">{formatCurrency(ytd.charitable_donations)}</span>
                                </div>
                            )}
                        </>
                    )}

                    <div className="flex justify-between pt-2 border-t border-white/10">
                        <span className="font-semibold text-foreground">Total Deductions</span>
                        <span className="font-semibold text-foreground">
                            {formatCurrency(
                                ytd.cpp_contributions +
                                ytd.cpp2_contributions +
                                ytd.ei_premiums +
                                ytd.federal_tax_withheld +
                                ytd.provincial_tax_withheld +
                                ytd.rrsp_contributions +
                                ytd.union_dues +
                                ytd.charitable_donations
                            )}
                        </span>
                    </div>
                </div>
            </Card>

            {/* Vacation Section */}
            <Card>
                <h3 className="text-lg font-semibold mb-4 text-foreground">VACATION</h3>
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Earned</span>
                        <span className="font-medium text-foreground">{formatCurrency(ytd.vacation_earned)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Used</span>
                        <span className="font-medium text-foreground">{formatCurrency(ytd.vacation_used)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-white/10">
                        <span className="font-semibold text-foreground">Balance</span>
                        <span className="font-semibold text-foreground">{formatCurrency(ytd.vacation_balance)}</span>
                    </div>
                </div>
            </Card>
        </div>
    );
}
