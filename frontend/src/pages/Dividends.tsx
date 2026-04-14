import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import api, { type Dividend, type DividendRecipient } from '../lib/api';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import DividendRecipientModal from '../components/dividends/DividendRecipientModal';
import DividendRecipientList from '../components/dividends/DividendRecipientList';
import { generateT5SlipPDF, generateT5SummaryPDF } from '../lib/t5Generator';
import { generateDividendMinutesPDF } from '../lib/dividendMinutesGenerator';
import { getFiscalYear } from '../lib/fiscalYear';
import { formatLocalDate } from '../lib/utils';
import {
    Plus,
    Edit,
    Trash2,
    DollarSign,
    CheckCircle,
    Clock,
    Search,
    X,
    FileText,
    Download,
    // AlertCircle,
    Users
} from 'lucide-react';

// Dividend Table Row Component
const DividendTableRow: React.FC<{
    dividend: Dividend;
    formatCurrency: (amount: number) => string;
    formatDate: (dateString: string) => string;
    getStatusIcon: (status: string) => React.ReactNode;
    getStatusColor: (status: string) => string;
    getComplianceStatus: (dividend: Dividend) => Promise<{
        status: 'compliant' | 'warning' | 'error';
        message: string;
        recipientCount: number;
    }>;
    handleEdit: (dividend: Dividend) => void;
    handleDelete: (id: number) => void;
    handleGenerateT5Slip: (dividend: Dividend, recipient: DividendRecipient) => Promise<void>;
    handleGenerateMinutes: (dividend: Dividend) => Promise<void>;
}> = ({
    dividend,
    formatCurrency,
    formatDate,
    getStatusIcon,
    getStatusColor,
    getComplianceStatus,
    handleEdit,
    handleDelete,
    handleGenerateT5Slip,
    handleGenerateMinutes,
}) => {
    const [compliance, setCompliance] = useState<{
        status: 'compliant' | 'warning' | 'error';
        message: string;
        recipientCount: number;
    } | null>(null);
    const [loadingCompliance, setLoadingCompliance] = useState(true);

    useEffect(() => {
        getComplianceStatus(dividend).then(setCompliance).finally(() => setLoadingCompliance(false));
    }, [dividend.id]);

    const getComplianceColor = (status: string) => {
        switch (status) {
            case 'compliant':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            case 'warning':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
            case 'error':
                return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
            default:
                return 'bg-muted text-slate-muted';
        }
    };

    return (
        <tr className="hover:bg-muted/50 transition-colors">
            <td className="px-6 py-4 font-medium text-white">
                {formatCurrency(dividend.amount)}
            </td>
            <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    dividend.dividend_type === 'eligible'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300'
                }`}>
                    {dividend.dividend_type === 'eligible' ? 'Eligible' : 'Non-eligible'}
                </span>
            </td>
            <td className="px-6 py-4 text-slate-muted">
                {dividend.fiscal_year}
            </td>
            <td className="px-6 py-4 text-slate-muted">
                {formatDate(dividend.declaration_date)}
            </td>
            <td className="px-6 py-4 text-slate-muted">
                {dividend.payment_date ? formatDate(dividend.payment_date) : '-'}
            </td>
            <td className="px-6 py-4">
                {loadingCompliance ? (
                    <span className="text-slate-muted text-xs">Loading...</span>
                ) : compliance ? (
                    <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-slate-muted" />
                        <span className="text-sm text-white">{compliance.recipientCount}</span>
                        {compliance.status !== 'compliant' && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getComplianceColor(compliance.status)}`}>
                                {compliance.message}
                            </span>
                        )}
                    </div>
                ) : (
                    <span className="text-slate-muted text-xs">-</span>
                )}
            </td>
            <td className="px-6 py-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(dividend.status)}`}>
                    {getStatusIcon(dividend.status)}
                    <span className="ml-1 capitalize">{dividend.status}</span>
                </span>
            </td>
            <td className="px-6 py-4 text-right">
                <div className="flex justify-end gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(dividend)}
                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                        title="Edit"
                    >
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                            const recipients = await api.getDividendRecipients(dividend.id);
                            if (recipients.length === 0) {
                                alert('No recipients found. Please add recipients first.');
                                return;
                            }
                            // Generate T5 slips for all recipients
                            for (const recipient of recipients) {
                                await handleGenerateT5Slip(dividend, recipient);
                            }
                        }}
                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                        title="Generate T5 Slips"
                    >
                        <FileText className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleGenerateMinutes(dividend)}
                        className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/20"
                        title="Generate Minutes"
                    >
                        <Download className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(dividend.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Delete"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </td>
        </tr>
    );
};

const Dividends: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [editingDividend, setEditingDividend] = useState<Dividend | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [yearFilter, setYearFilter] = useState<'all' | number>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedFiscalYear, setSelectedFiscalYear] = useState<number>(new Date().getFullYear());

    const [formData, setFormData] = useState({
        amount: '',
        declaration_date: '',
        payment_date: '',
        status: 'declared' as 'declared' | 'paid',
        notes: '',
        dividend_type: (user?.company?.default_dividend_type || 'non_eligible') as 'eligible' | 'non_eligible',
        fiscal_year: new Date().getFullYear(),
    });

    const [recipients, setRecipients] = useState<DividendRecipient[]>([]);
    const [showRecipientModal, setShowRecipientModal] = useState(false);
    const [editingRecipient, setEditingRecipient] = useState<DividendRecipient | null>(null);
    const [loadingRecipients, setLoadingRecipients] = useState(false);

    const yearDates = useMemo(() => {
        if (yearFilter === 'all') {
            return { start: undefined as string | undefined, end: undefined as string | undefined };
        }
        return {
            start: `${yearFilter}-01-01`,
            end: `${yearFilter}-12-31`,
        };
    }, [yearFilter]);

    const { data: dividendYearSeed } = useQuery({
        queryKey: ['dividends_year_options', user?.company_id],
        queryFn: async () => {
            const r = await api.getDividends({
                company_id: user?.company_id,
                page: 1,
                limit: 1000,
            });
            return r.data;
        },
        enabled: !!user?.company_id,
    });

    const yearOptions = useMemo(() => {
        const years = new Set<number>();
        dividendYearSeed?.forEach((d) => {
            years.add(new Date(d.declaration_date).getFullYear());
        });
        if (years.size === 0) {
            years.add(new Date().getFullYear());
        }
        return Array.from(years).sort((a, b) => b - a);
    }, [dividendYearSeed]);

    const {
        data: dividendsPage,
        isLoading,
    } = useQuery({
        queryKey: ['dividends', user?.company_id, currentPage, statusFilter, yearFilter],
        queryFn: async () =>
            api.getDividends({
                company_id: user?.company_id,
                page: currentPage,
                limit: 10,
                status: statusFilter || undefined,
                start_date: yearDates.start,
                end_date: yearDates.end,
            }),
        enabled: !!user?.company_id,
    });

    const dividends = dividendsPage?.data ?? [];
    const totalPages = dividendsPage?.totalPages ?? 1;
    const total = dividendsPage?.total ?? 0;

    const { data: dividendsSummaryPage } = useQuery({
        queryKey: ['dividends_summary', user?.company_id, statusFilter, yearFilter],
        queryFn: async () =>
            api.getDividends({
                company_id: user?.company_id,
                page: 1,
                limit: 1000,
                status: statusFilter || undefined,
                start_date: yearDates.start,
                end_date: yearDates.end,
            }),
        enabled: !!user?.company_id,
    });

    const invalidateDividendQueries = () => {
        queryClient.invalidateQueries({ queryKey: ['dividends'] });
        queryClient.invalidateQueries({ queryKey: ['dividends_summary'] });
        queryClient.invalidateQueries({ queryKey: ['dividends_year_options'] });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validate recipient amounts
        const totalAllocated = recipients.reduce((sum, r) => sum + r.amount, 0);
        const dividendAmount = parseFloat(formData.amount);
        
        if (recipients.length > 0 && Math.abs(totalAllocated - dividendAmount) > 0.01) {
            alert(`Recipient amounts (${totalAllocated.toFixed(2)}) must equal dividend amount (${dividendAmount.toFixed(2)})`);
            return;
        }

        try {
            const companyId = user?.company_id;
            if (companyId === undefined) {
                alert('Company information is not available.');
                return;
            }

            // Calculate fiscal year from declaration date if not set
            let fiscalYear = formData.fiscal_year;
            if (formData.declaration_date && user?.company?.fiscal_year_end) {
                fiscalYear = getFiscalYear(formData.declaration_date, user.company.fiscal_year_end);
            }

            const dividendData = {
                amount: dividendAmount,
                declaration_date: formData.declaration_date,
                payment_date: formData.payment_date || undefined,
                status: formData.status,
                notes: formData.notes || undefined,
                dividend_type: formData.dividend_type,
                fiscal_year: fiscalYear,
                company_id: companyId,
            };

            let savedDividend: Dividend;
            if (editingDividend) {
                savedDividend = await api.updateDividend(editingDividend.id, dividendData);
            } else {
                savedDividend = await api.createDividend(dividendData);
            }

            // Save recipients
            if (recipients.length > 0) {
                // Delete existing recipients if editing
                if (editingDividend) {
                    const existingRecipients = await api.getDividendRecipients(savedDividend.id);
                    for (const recipient of existingRecipients) {
                        await api.deleteDividendRecipient(recipient.id);
                    }
                }

                // Create new recipients
                for (const recipient of recipients) {
                    await api.createDividendRecipient({
                        ...recipient,
                        dividend_id: savedDividend.id,
                    });
                }
            }

            setShowModal(false);
            setEditingDividend(null);
            setRecipients([]);
            resetForm();
            invalidateDividendQueries();
        } catch (error) {
            console.error('Error saving dividend:', error);
            alert('Error saving dividend. Please try again.');
        }
    };

    const handleEdit = async (dividend: Dividend) => {
        setEditingDividend(dividend);
        setFormData({
            amount: dividend.amount.toString(),
            declaration_date: dividend.declaration_date.split('T')[0],
            payment_date: dividend.payment_date ? dividend.payment_date.split('T')[0] : '',
            status: dividend.status,
            notes: dividend.notes || '',
            dividend_type: dividend.dividend_type,
            fiscal_year: dividend.fiscal_year,
        });
        
        // Load recipients for this dividend
        setLoadingRecipients(true);
        try {
            const dividendRecipients = await api.getDividendRecipients(dividend.id);
            setRecipients(dividendRecipients);
        } catch (error) {
            console.error('Error loading recipients:', error);
            setRecipients([]);
        } finally {
            setLoadingRecipients(false);
        }
        
        setShowModal(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this dividend?')) {
            try {
                await api.deleteDividend(id);
                invalidateDividendQueries();
            } catch (error) {
                console.error('Error deleting dividend:', error);
            }
        }
    };

    const resetForm = () => {
        setFormData({
            amount: '',
            declaration_date: '',
            payment_date: '',
            status: 'declared',
            notes: '',
            dividend_type: (user?.company?.default_dividend_type || 'non_eligible') as 'eligible' | 'non_eligible',
            fiscal_year: new Date().getFullYear(),
        });
        setRecipients([]);
    };

    const openModal = () => {
        setEditingDividend(null);
        resetForm();
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingDividend(null);
        setRecipients([]);
        resetForm();
    };

    // Recipient management
    const handleAddRecipient = () => {
        setEditingRecipient(null);
        setShowRecipientModal(true);
    };

    const handleEditRecipient = (recipient: DividendRecipient) => {
        setEditingRecipient(recipient);
        setShowRecipientModal(true);
    };

    const handleSaveRecipient = async (recipientData: Omit<DividendRecipient, 'id' | 'created_at' | 'updated_at'>) => {
        if (editingRecipient) {
            const updated = await api.updateDividendRecipient(editingRecipient.id, recipientData);
            setRecipients(recipients.map(r => r.id === updated.id ? updated : r));
        } else {
            const newRecipient = await api.createDividendRecipient({
                ...recipientData,
                dividend_id: editingDividend?.id || 0, // Temporary, will be set on save
            });
            setRecipients([...recipients, newRecipient]);
        }
        setShowRecipientModal(false);
        setEditingRecipient(null);
    };

    const handleDeleteRecipient = async (id: number) => {
        try {
            if (editingDividend) {
                await api.deleteDividendRecipient(id);
            }
            setRecipients(recipients.filter(r => r.id !== id));
        } catch (error) {
            console.error('Error deleting recipient:', error);
        }
    };

    // Document generation
    const handleGenerateT5Slip = async (dividend: Dividend, recipient: DividendRecipient) => {
        try {
            const company = user?.company;
            if (!company) {
                alert('Company information not available');
                return;
            }
            const blob = await generateT5SlipPDF(dividend, recipient, company);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `T5_${recipient.recipient_name.replace(/\s+/g, '_')}_${dividend.id}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error generating T5 slip:', error);
            alert('Error generating T5 slip. Please try again.');
        }
    };

    const handleGenerateT5Summary = async (fiscalYear: number) => {
        try {
            const company = user?.company;
            if (!company) {
                alert('Company information not available');
                return;
            }
            
            // Get all dividends for the fiscal year
            const dividendsResponse = await api.getDividends({
                company_id: company.id,
                limit: 1000,
            });
            const fiscalYearDividends = dividendsResponse.data.filter(d => d.fiscal_year === fiscalYear);
            
            // Get all recipients for these dividends
            const allRecipients: DividendRecipient[] = [];
            for (const dividend of fiscalYearDividends) {
                const recipients = await api.getDividendRecipients(dividend.id);
                allRecipients.push(...recipients);
            }

            if (allRecipients.length === 0) {
                alert('No recipients found for this fiscal year');
                return;
            }

            const blob = await generateT5SummaryPDF(company, fiscalYear, fiscalYearDividends, allRecipients);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `T5_Summary_FY${fiscalYear}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error generating T5 Summary:', error);
            alert('Error generating T5 Summary. Please try again.');
        }
    };

    const handleGenerateMinutes = async (dividend: Dividend) => {
        try {
            const company = user?.company;
            if (!company) {
                alert('Company information not available');
                return;
            }
            
            const recipients = await api.getDividendRecipients(dividend.id);
            if (recipients.length === 0) {
                alert('No recipients found for this dividend');
                return;
            }

            const blob = generateDividendMinutesPDF(dividend, recipients, company);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Dividend_Minutes_${dividend.id}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error generating minutes:', error);
            alert('Error generating minutes. Please try again.');
        }
    };

    // Compliance status
    const getComplianceStatus = async (dividend: Dividend): Promise<{
        status: 'compliant' | 'warning' | 'error';
        message: string;
        recipientCount: number;
    }> => {
        const dividendRecipients = await api.getDividendRecipients(dividend.id);
        const recipientCount = dividendRecipients.length;
        
        if (recipientCount === 0) {
            return {
                status: 'warning',
                message: 'No recipients',
                recipientCount: 0,
            };
        }

        const totalAllocated = dividendRecipients.reduce((sum, r) => sum + r.amount, 0);
        if (Math.abs(totalAllocated - dividend.amount) > 0.01) {
            return {
                status: 'error',
                message: 'Amount mismatch',
                recipientCount,
            };
        }

        const missingSIN = dividendRecipients.some(
            r => r.recipient_type === 'individual' && !r.recipient_sin
        );
        if (missingSIN) {
            return {
                status: 'warning',
                message: 'Missing SIN',
                recipientCount,
            };
        }

        return {
            status: 'compliant',
            message: 'Compliant',
            recipientCount,
        };
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return formatLocalDate(dateString);
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'paid':
                return <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400" />;
            case 'declared':
                return <Clock className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />;
            default:
                return <Clock className="h-4 w-4 text-slate-muted" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            case 'declared':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
            default:
                return 'bg-muted text-slate-muted';
        }
    };

    const filteredDividends = dividends.filter(dividend =>
        dividend.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dividend.amount.toString().includes(searchTerm)
    );

    const filteredForSummary = useMemo(() => {
        const rows = dividendsSummaryPage?.data ?? [];
        const term = searchTerm.trim().toLowerCase();
        if (!term) return rows;
        return rows.filter(
            (dividend) =>
                dividend.notes?.toLowerCase().includes(term) ||
                dividend.amount.toString().includes(searchTerm)
        );
    }, [dividendsSummaryPage, searchTerm]);

    const totalDividends = filteredForSummary.reduce((sum, dividend) => sum + dividend.amount, 0);
    const paidDividends = filteredForSummary
        .filter((d) => d.status === 'paid')
        .reduce((sum, dividend) => sum + dividend.amount, 0);
    const declaredDividends = filteredForSummary
        .filter((d) => d.status === 'declared')
        .reduce((sum, dividend) => sum + dividend.amount, 0);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-emerald"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Dividends</h1>
                    <p className="text-slate-muted mt-2">Manage corporate dividend declarations and payments</p>
                </div>
                <Button
                    onClick={openModal}
                    icon={Plus}
                    className="w-full sm:w-auto"
                >
                    Create Dividend
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <Card className="p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 p-3 rounded-full bg-blue-100 dark:bg-blue-900/20">
                            <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-slate-muted truncate">
                                    Total Dividends
                                </dt>
                                <dd className="text-2xl font-bold text-white">
                                    {formatCurrency(totalDividends)}
                                </dd>
                            </dl>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 p-3 rounded-full bg-green-100 dark:bg-green-900/20">
                            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-slate-muted truncate">
                                    Paid Dividends
                                </dt>
                                <dd className="text-2xl font-bold text-white">
                                    {formatCurrency(paidDividends)}
                                </dd>
                            </dl>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/20">
                            <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-slate-muted truncate">
                                    Announced (Not Paid Yet)
                                </dt>
                                <dd className="text-2xl font-bold text-white">
                                    {formatCurrency(declaredDividends)}
                                </dd>
                            </dl>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-muted" />
                            <input
                                type="text"
                                placeholder="Search dividends..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>
                    </div>
                    <div className="sm:w-48">
                        <label htmlFor="dividend-year-filter" className="text-sm font-medium text-foreground mb-1 block">
                            Year
                        </label>
                        <select
                            id="dividend-year-filter"
                            value={yearFilter === 'all' ? 'all' : String(yearFilter)}
                            onChange={(e) => {
                                const v = e.target.value;
                                setYearFilter(v === 'all' ? 'all' : parseInt(v, 10));
                                setCurrentPage(1);
                            }}
                            className="input bg-card text-foreground"
                        >
                            <option value="all">All</option>
                            {yearOptions.map((y) => (
                                <option key={y} value={y}>
                                    {y}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="sm:w-48">
                        <label htmlFor="dividend-status-filter" className="text-sm font-medium text-foreground mb-1 block">
                            Status
                        </label>
                        <select
                            id="dividend-status-filter"
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="input bg-card text-foreground"
                        >
                            <option value="">All Status</option>
                            <option value="declared">Declared</option>
                            <option value="paid">Paid</option>
                        </select>
                    </div>
                </div>
            </Card>

            {/* Dividends Table */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-slate-muted uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Fiscal Year</th>
                                <th className="px-6 py-4">Declaration Date</th>
                                <th className="px-6 py-4">Payment Date</th>
                                <th className="px-6 py-4">Recipients</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredDividends.map((dividend) => (
                                <DividendTableRow
                                    key={dividend.id}
                                    dividend={dividend}
                                    formatCurrency={formatCurrency}
                                    formatDate={formatDate}
                                    getStatusIcon={getStatusIcon}
                                    getStatusColor={getStatusColor}
                                    getComplianceStatus={getComplianceStatus}
                                    handleEdit={handleEdit}
                                    handleDelete={handleDelete}
                                    handleGenerateT5Slip={handleGenerateT5Slip}
                                    handleGenerateMinutes={handleGenerateMinutes}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredDividends.length === 0 && (
                    <div className="text-center py-12">
                        <DollarSign className="mx-auto h-12 w-12 text-slate-muted" />
                        <h3 className="mt-2 text-sm font-medium text-white">No dividends found</h3>
                        <p className="mt-1 text-sm text-slate-muted">
                            {searchTerm || statusFilter || yearFilter !== 'all'
                                ? 'Try adjusting your search or filter criteria.'
                                : 'Get started by adding your first dividend.'}
                        </p>
                        {!searchTerm && !statusFilter && yearFilter === 'all' && (
                            <div className="mt-6">
                                <Button
                                    onClick={openModal}
                                    icon={Plus}
                                    className="mx-auto"
                                >
                                    Create Dividend
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="bg-card px-4 py-3 flex items-center justify-between border-t border-white/10 sm:px-6">
                        <div className="flex-1 flex justify-between sm:hidden">
                            <Button
                                variant="outline"
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                            >
                                Next
                            </Button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-slate-muted">
                                    Showing <span className="font-medium text-white">{(currentPage - 1) * 10 + 1}</span> to{' '}
                                    <span className="font-medium text-white">{Math.min(currentPage * 10, total)}</span> of{' '}
                                    <span className="font-medium text-white">{total}</span> results
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                        disabled={currentPage === 1}
                                        className="rounded-r-none"
                                    >
                                        Previous
                                    </Button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                        <Button
                                            key={page}
                                            variant={page === currentPage ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setCurrentPage(page)}
                                            className="rounded-none"
                                        >
                                            {page}
                                        </Button>
                                    ))}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                        disabled={currentPage === totalPages}
                                        className="rounded-l-none"
                                    >
                                        Next
                                    </Button>
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                    <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-lg border border-white/10 bg-card p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-white">
                                {editingDividend ? 'Edit Dividend' : 'Add New Dividend'}
                            </h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={closeModal}
                                className="h-8 w-8 rounded-full"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                    Amount *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="0.00"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                    Dividend Type *
                                </label>
                                <select
                                    required
                                    value={formData.dividend_type}
                                    onChange={(e) => setFormData({ ...formData, dividend_type: e.target.value as 'eligible' | 'non_eligible' })}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="non_eligible">Non-eligible</option>
                                    <option value="eligible">Eligible</option>
                                </select>
                                <p className="text-xs text-slate-muted mt-1">
                                    Eligible dividends receive a 38% gross-up; non-eligible receive 15%
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                    Declaration Date *
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={formData.declaration_date}
                                    onChange={(e) => {
                                        setFormData({ ...formData, declaration_date: e.target.value });
                                        // Auto-calculate fiscal year
                                        if (e.target.value && user?.company?.fiscal_year_end) {
                                            const fiscalYear = getFiscalYear(e.target.value, user.company.fiscal_year_end);
                                            setFormData(prev => ({ ...prev, fiscal_year: fiscalYear }));
                                        }
                                    }}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                    Fiscal Year *
                                </label>
                                <input
                                    type="number"
                                    required
                                    value={formData.fiscal_year}
                                    onChange={(e) => setFormData({ ...formData, fiscal_year: parseInt(e.target.value) })}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                    Payment Date
                                </label>
                                <input
                                    type="date"
                                    value={formData.payment_date}
                                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                    Status *
                                </label>
                                <select
                                    required
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'declared' | 'paid' })}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="declared">Declared</option>
                                    <option value="paid">Paid</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                    Notes
                                </label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    rows={3}
                                    placeholder="Optional notes about this dividend..."
                                />
                            </div>

                            {/* Recipients Section */}
                            <div className="pt-4 border-t border-white/10">
                                <div className="flex items-center justify-between mb-4">
                                    <label className="block text-sm font-medium text-white">
                                        Recipients *
                                    </label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleAddRecipient}
                                        icon={Plus}
                                    >
                                        Add Recipient
                                    </Button>
                                </div>
                                
                                {loadingRecipients ? (
                                    <div className="text-center py-4 text-slate-muted">
                                        Loading recipients...
                                    </div>
                                ) : (
                                    <DividendRecipientList
                                        recipients={recipients}
                                        dividendAmount={parseFloat(formData.amount) || 0}
                                        onEdit={handleEditRecipient}
                                        onDelete={handleDeleteRecipient}
                                    />
                                )}
                            </div>

                            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-white/10">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={closeModal}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                >
                                    {editingDividend ? 'Update' : 'Create'} Dividend
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Recipient Modal */}
            {showRecipientModal && (
                <DividendRecipientModal
                    recipient={editingRecipient}
                    dividendAmount={parseFloat(formData.amount) || 0}
                    existingRecipientsTotal={recipients
                        .filter(r => !editingRecipient || r.id !== editingRecipient.id)
                        .reduce((sum, r) => sum + r.amount, 0)}
                    onClose={() => {
                        setShowRecipientModal(false);
                        setEditingRecipient(null);
                    }}
                    onSave={handleSaveRecipient}
                />
            )}

            {/* T5 Summary Generation Button */}
            {user?.company && (
                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-semibold text-white">T5 Summary</h3>
                            <p className="text-xs text-slate-muted mt-1">
                                Generate T5 Summary for a fiscal year
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <select
                                value={selectedFiscalYear || new Date().getFullYear()}
                                onChange={(e) => setSelectedFiscalYear(parseInt(e.target.value))}
                                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                            <Button
                                onClick={() => handleGenerateT5Summary(selectedFiscalYear || new Date().getFullYear())}
                                icon={FileText}
                            >
                                Generate T5 Summary
                            </Button>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default Dividends;
