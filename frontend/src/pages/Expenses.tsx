import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api, { type Expense, type ExpenseCategory, type ExpenseFile } from '../lib/api';
import { loadDashboardPreferences, updateDashboardPreference } from '../lib/preferences';
import { Plus, Edit, Trash2, Receipt, Upload, Download, X, FileText, Calendar, Info, Car } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import HelpIcon from '../components/ui/HelpIcon';
import { cn } from '../lib/utils';
import { getFiscalYearRange, getFiscalYear, formatFiscalYear, getCurrentFiscalYear } from '../lib/fiscalYear';
import { CRA_MILEAGE_RATE } from '../lib/api';

const Expenses: React.FC = () => {
    const { user } = useAuth();
    const _queryClient = useQueryClient();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showMileageModal, setShowMileageModal] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [timePeriod, setTimePeriod] = useState<'month' | 'year'>(() => {
        // Load saved preference on component mount
        const preferences = loadDashboardPreferences();
        return preferences.timePeriod;
    });
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Calculate date range based on time period and fiscal year
    const getDateRange = () => {
        const fiscalYearEnd = user?.company?.fiscal_year_end;
        let startDate: Date;
        let endDate: Date;

        if (timePeriod === 'month') {
            // For monthly view, use calendar month
            startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
            endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
        } else {
            // For yearly view, use fiscal year
            if (fiscalYearEnd) {
                const fiscalYear = getFiscalYear(selectedDate, fiscalYearEnd);
                const fiscalYearRange = getFiscalYearRange(fiscalYear, fiscalYearEnd);
                startDate = fiscalYearRange.start;
                endDate = fiscalYearRange.end;
            } else {
                // Fallback to calendar year if no fiscal year end is set
                startDate = new Date(selectedDate.getFullYear(), 0, 1);
                endDate = new Date(selectedDate.getFullYear(), 11, 31);
            }
        }

        return {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
        };
    };

    const { startDate, endDate } = getDateRange();

    // Fetch expenses
    const { data: expenses, isLoading } = useQuery({
        queryKey: ['expenses', user?.company_id, timePeriod, startDate, endDate],
        queryFn: async () => {
            const result = await api.getExpenses({
                company_id: user?.company_id,
                start_date: startDate,
                end_date: endDate,
                limit: 1000
            });
            return result.data;
        },
        enabled: !!user?.company_id,
    });

    // Fetch expense categories (global list, shared across companies)
    const { data: categories } = useQuery({
        queryKey: ['expense_categories'],
        queryFn: async () => {
            const result = await api.getExpenseCategories({
                limit: 1000,
            });
            return result.data;
        },
    });

    // Delete expense mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            return api.deleteExpense(id);
        },
        onSuccess: () => {
            _queryClient.invalidateQueries({ queryKey: ['expenses'] });
        },
    });

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-CA');
    };

    const handleDelete = (expense: Expense) => {
        if (confirm(`Are you sure you want to delete this expense?`)) {
            deleteMutation.mutate(expense.id);
        }
    };

    // Filter expenses by category
    const filteredExpenses = expenses?.filter(expense => {
        if (selectedCategory === 'all') return true;
        return expense.category_id === parseInt(selectedCategory);
    });

    // Calculate totals
    const totalExpenses = filteredExpenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0;
    const totalHSTPaid = filteredExpenses?.reduce((sum, expense) => sum + expense.hst_paid, 0) || 0;

    // Calculate mileage statistics
    const mileageExpenses = filteredExpenses?.filter(expense => expense.distance_km != null) || [];
    const totalMileageKm = mileageExpenses.reduce((sum, expense) => sum + (expense.distance_km || 0), 0);
    const totalMileageAmount = mileageExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const mileageTripCount = mileageExpenses.length;
    const averageDistance = mileageTripCount > 0 ? totalMileageKm / mileageTripCount : 0;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-emerald"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Expenses</h1>
                    <p className="text-slate-muted mt-2">Track your business expenses</p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Time Period Selector */}
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                        <div className="flex rounded-lg shadow-sm border border-white/10 overflow-hidden">
                            <button
                                type="button"
                                onClick={() => {
                                    setTimePeriod('month');
                                    updateDashboardPreference('timePeriod', 'month');
                                }}
                                className={cn(
                                    "px-4 py-2 text-sm font-medium transition-colors duration-200",
                                    timePeriod === 'month'
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-card text-slate-muted hover:bg-muted"
                                )}
                            >
                                Month
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setTimePeriod('year');
                                    updateDashboardPreference('timePeriod', 'year');
                                }}
                                className={cn(
                                    "px-4 py-2 text-sm font-medium transition-colors duration-200",
                                    timePeriod === 'year'
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-card text-slate-muted hover:bg-muted"
                                )}
                            >
                                Year
                            </button>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Calendar className="h-5 w-5 text-slate-muted" />
                            {timePeriod === 'month' ? (
                                <input
                                    type="month"
                                    value={`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`}
                                    onChange={(e) => {
                                        const [year, month] = e.target.value.split('-');
                                        setSelectedDate(new Date(parseInt(year), parseInt(month) - 1, 1));
                                    }}
                                    className="flex h-10 w-full rounded-md glass border border-white/10 bg-transparent text-white placeholder:text-slate-muted focus-visible:ring-neon-emerald px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            ) : (
                                <div className="flex items-center gap-2">
                                    <select
                                        value={user?.company?.fiscal_year_end ? getFiscalYear(selectedDate, user.company.fiscal_year_end) : selectedDate.getFullYear()}
                                        onChange={(e) => {
                                            const fiscalYear = parseInt(e.target.value);
                                            if (user?.company?.fiscal_year_end) {
                                                const range = getFiscalYearRange(fiscalYear, user.company.fiscal_year_end);
                                                setSelectedDate(range.start);
                                            } else {
                                                setSelectedDate(new Date(fiscalYear, 0, 1));
                                            }
                                        }}
                                        className="flex h-10 w-full rounded-md glass border border-white/10 bg-transparent text-white placeholder:text-slate-muted focus-visible:ring-neon-emerald px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {user?.company?.fiscal_year_end ? (
                                            Array.from({ length: 6 }, (_, i) => {
                                                const currentFY = getCurrentFiscalYear(user.company!.fiscal_year_end);
                                                const fy = currentFY - i;
                                                return (
                                                    <option key={fy} value={fy}>
                                                        {formatFiscalYear(fy)}
                                                    </option>
                                                );
                                            })
                                        ) : (
                                            Array.from({ length: 6 }, (_, i) => {
                                                const year = new Date().getFullYear() - i;
                                                return (
                                                    <option key={year} value={year}>
                                                        {year}
                                                    </option>
                                                );
                                            })
                                        )}
                                    </select>
                                    {user?.company?.fiscal_year_end && (
                                        <span className="text-sm text-muted-foreground">
                                            ({formatFiscalYear(getFiscalYear(selectedDate, user.company.fiscal_year_end))})
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <Button
                            onClick={() => setShowMileageModal(true)}
                            icon={Car}
                            variant="secondary"
                            className="w-full sm:w-auto"
                        >
                            Log Mileage
                        </Button>
                        <Button
                            onClick={() => setShowCreateModal(true)}
                            icon={Plus}
                            className="w-full sm:w-auto"
                        >
                            Add Expense
                        </Button>
                    </div>
                </div>
            </div>

            {/* Category Filter */}
            <Card className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <label className="text-sm font-medium text-white">Filter by category:</label>
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="flex h-10 w-full sm:w-auto rounded-md glass border border-white/10 bg-card text-white placeholder:text-slate-muted focus-visible:ring-neon-emerald px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="all">All Categories</option>
                        {categories?.map(category => (
                            <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                    </select>
                </div>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 lg:grid-cols-4">
                <Card className="p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 p-3 rounded-full bg-red-100 dark:bg-red-900/20">
                            <Receipt className="h-6 w-6 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-slate-muted truncate">
                                    Total Expenses
                                </dt>
                                <dd className="text-2xl font-bold text-white">
                                    {formatCurrency(totalExpenses)}
                                </dd>
                            </dl>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 p-3 rounded-full bg-blue-100 dark:bg-blue-900/20">
                            <Receipt className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-slate-muted truncate">
                                    HST Paid
                                </dt>
                                <dd className="text-2xl font-bold text-white">
                                    {formatCurrency(totalHSTPaid)}
                                </dd>
                            </dl>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 p-3 rounded-full bg-green-100 dark:bg-green-900/20">
                            <Receipt className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-slate-muted truncate">
                                    Total with HST
                                </dt>
                                <dd className="text-2xl font-bold text-white">
                                    {formatCurrency(totalExpenses + totalHSTPaid)}
                                </dd>
                            </dl>
                        </div>
                    </div>
                </Card>

                {mileageTripCount > 0 && (
                    <Card className="p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 p-3 rounded-full bg-blue-100 dark:bg-blue-900/20">
                                <Car className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-slate-muted truncate">
                                        Mileage ({mileageTripCount} trips)
                                    </dt>
                                    <dd className="text-2xl font-bold text-white">
                                        {formatCurrency(totalMileageAmount)}
                                    </dd>
                                    <dd className="text-xs text-slate-muted mt-1">
                                        {totalMileageKm.toFixed(1)} km (avg: {averageDistance.toFixed(1)} km/trip)
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </Card>
                )}
            </div>

            {/* Expenses Table */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-slate-muted uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Description</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4">HST Paid</th>
                                <th className="px-6 py-4">Deduction</th>
                                <th className="px-6 py-4">Total</th>
                                <th className="px-6 py-4">Who Paid</th>
                                <th className="px-6 py-4">Receipt</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredExpenses?.map((expense) => (
                                <tr key={expense.id} className="hover:bg-muted/50 transition-colors">
                                    <td className="px-6 py-4 text-slate-muted">{formatDate(expense.expense_date)}</td>
                                    <td className="px-6 py-4 font-medium text-white">
                                        <div className="flex items-center gap-2">
                                            {expense.distance_km != null && (
                                                <Car className="h-4 w-4 text-blue-400" title="Mileage expense" />
                                            )}
                                            <span>{expense.description}</span>
                                            {expense.distance_km != null && expense.start_location && expense.end_location && (
                                                <span className="text-xs text-slate-muted">
                                                    ({expense.distance_km}km: {expense.start_location} → {expense.end_location})
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-muted">{expense.category?.name || 'Uncategorized'}</td>
                                    <td className="px-6 py-4 font-medium text-white">{formatCurrency(expense.amount)}</td>
                                    <td className="px-6 py-4 text-slate-muted">{formatCurrency(expense.hst_paid)}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-white">
                                                {((expense.deduction_percentage ?? 1.0) * 100).toFixed(0)}%
                                            </span>
                                            {(expense.deduction_percentage ?? 1.0) < 1.0 && (
                                                <span
                                                    className="inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                                                    title={`Only ${formatCurrency(expense.amount * (expense.deduction_percentage ?? 1.0))} is deductible`}
                                                >
                                                    ⚠
                                                </span>
                                            )}
                                        </div>
                                        {(expense.deduction_percentage ?? 1.0) < 1.0 && (
                                            <div className="text-xs text-slate-muted mt-1">
                                                {formatCurrency(expense.amount * (expense.deduction_percentage ?? 1.0))} deductible
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-green-600 dark:text-green-400">{formatCurrency(expense.amount + expense.hst_paid)}</td>
                                    <td className="px-6 py-4">
                                        {expense.paid_by === 'corp' ? (
                                            <span className="inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                Business Account
                                            </span>
                                        ) : (
                                            <span className="inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                                                Personal Account
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {expense.receipt_attached ? (
                                            <span className="inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                                Yes
                                            </span>
                                        ) : (
                                            <span className="inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full bg-muted text-slate-muted">
                                                No
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setEditingExpense(expense)}
                                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(expense)}
                                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
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
            </Card>

            {filteredExpenses?.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-slate-muted text-lg">No expenses found</p>
                    <p className="text-slate-muted/60">Add your first expense to get started</p>
                </div>
            )}

            {/* Mileage Modal */}
            {showMileageModal && (
                <MileageModal
                    onClose={() => setShowMileageModal(false)}
                    onSave={() => {
                        _queryClient.invalidateQueries({ queryKey: ['expenses'] });
                        setShowMileageModal(false);
                    }}
                />
            )}

            {/* Create/Edit Expense Modal */}
            {(showCreateModal || editingExpense) && (
                <ExpenseModal
                    expense={editingExpense}
                    categories={categories || []}
                    onClose={() => {
                        setShowCreateModal(false);
                        setEditingExpense(null);
                    }}
                    onSave={() => {
                        _queryClient.invalidateQueries({ queryKey: ['expenses'] });
                        setShowCreateModal(false);
                        setEditingExpense(null);
                    }}
                />
            )}
        </div>
    );
};

// Mileage Modal Component
interface MileageModalProps {
    onClose: () => void;
    onSave: () => void;
}

function MileageModal({ onClose, onSave }: MileageModalProps) {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        trip_date: new Date().toISOString().split('T')[0],
        start_location: '',
        end_location: '',
        distance_km: 0,
        purpose: '',
        vehicle_description: '',
    });

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(amount);
    };

    const createMileageMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            if (!user?.company_id) throw new Error('Company ID is required');
            return api.createMileageExpense({
                company_id: user.company_id,
                trip_date: data.trip_date,
                start_location: data.start_location,
                end_location: data.end_location,
                distance_km: data.distance_km,
                purpose: data.purpose || undefined,
                vehicle_description: data.vehicle_description || undefined,
            });
        },
        onSuccess: () => {
            onSave();
        },
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.distance_km <= 0) {
            alert('Please enter a valid distance greater than 0');
            return;
        }
        if (!formData.start_location.trim() || !formData.end_location.trim()) {
            alert('Please enter both starting location and destination');
            return;
        }
        createMileageMutation.mutate(formData);
    };

    const calculatedAmount = formData.distance_km * CRA_MILEAGE_RATE;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-white/10 bg-card p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-semibold text-white">Log Mileage</h3>
                        <p className="text-sm text-slate-muted mt-1">Track business mileage using CRA standard rates</p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-8 w-8 rounded-full"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* CRA Guidance */}
                <Card className="p-4 mb-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-blue-800 dark:text-blue-300">
                            <p className="font-medium mb-2">CRA Mileage Rules:</p>
                            <ul className="list-disc list-inside space-y-1 text-xs">
                                <li>Only business-related trips are deductible</li>
                                <li>Commuting from home to regular workplace is NOT deductible</li>
                                <li>Keep a log of all business trips for CRA compliance</li>
                                <li>Current rate: ${CRA_MILEAGE_RATE.toFixed(2)}/km (2024 CRA standard)</li>
                            </ul>
                        </div>
                    </div>
                </Card>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-white mb-2">Trip Date *</label>
                            <input
                                type="date"
                                value={formData.trip_date}
                                onChange={(e) => setFormData({ ...formData, trip_date: e.target.value })}
                                className="input"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white mb-2">Distance (km) *</label>
                            <input
                                type="number"
                                value={formData.distance_km || ''}
                                onChange={(e) => setFormData({ ...formData, distance_km: parseFloat(e.target.value) || 0 })}
                                className="input"
                                min="0.01"
                                step="0.01"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white mb-2">Starting Location *</label>
                            <input
                                type="text"
                                value={formData.start_location}
                                onChange={(e) => setFormData({ ...formData, start_location: e.target.value })}
                                className="input"
                                placeholder="e.g., Office, Home, Client Site"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white mb-2">Destination *</label>
                            <input
                                type="text"
                                value={formData.end_location}
                                onChange={(e) => setFormData({ ...formData, end_location: e.target.value })}
                                className="input"
                                placeholder="e.g., Client Site, Meeting Location"
                                required
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-white mb-2">Purpose (Optional)</label>
                            <textarea
                                value={formData.purpose}
                                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                                className="input min-h-[80px]"
                                placeholder="e.g., Client meeting, Site visit, Business errand"
                            />
                            <p className="text-xs text-slate-muted mt-1">This will be used as the expense description if provided</p>
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-white mb-2">Vehicle Description (Optional)</label>
                            <input
                                type="text"
                                value={formData.vehicle_description}
                                onChange={(e) => setFormData({ ...formData, vehicle_description: e.target.value })}
                                className="input"
                                placeholder="e.g., 2020 Honda Civic"
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <Card className="p-4 bg-muted/50">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-white">Rate per km</p>
                                        <p className="text-xs text-slate-muted">CRA Standard Rate (2024)</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-white">${CRA_MILEAGE_RATE.toFixed(2)}/km</p>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        <div className="sm:col-span-2">
                            <Card className="p-4 bg-primary/10 border-primary/30">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-white">Calculated Amount</p>
                                        <p className="text-xs text-slate-muted">
                                            {formData.distance_km > 0 ? `${formData.distance_km} km × $${CRA_MILEAGE_RATE.toFixed(2)}/km` : 'Enter distance to calculate'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-primary">
                                            {formData.distance_km > 0 ? formatCurrency(calculatedAmount) : '$0.00'}
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={createMileageMutation.isPending || formData.distance_km <= 0}
                        >
                            {createMileageMutation.isPending ? 'Saving...' : 'Save Mileage'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Expense Modal Component
interface ExpenseModalProps {
    expense?: Expense | null;
    categories: ExpenseCategory[];
    onClose: () => void;
    onSave: () => void;
}

function ExpenseModal({ expense, categories, onClose, onSave }: ExpenseModalProps) {
    const { user } = useAuth();
    const HST_RATE = 0.13; // 13% default HST rate

    // Determine if tax applies: if editing, check if hst_paid > 0; if new, default to true
    const initialTaxApplies = expense ? (expense.hst_paid > 0) : true;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(amount);
    };

    // Helper function to get deduction guidance for a category based on Canadian CRA rules
    const getDeductionGuidance = (categoryName: string | undefined): { default: number; explanation: string } => {
        if (!categoryName) return {
            default: 1.0,
            explanation: 'Most business expenses are 100% deductible. If this expense has personal use, enter the business use percentage (0-100%).'
        };

        const name = categoryName.toLowerCase();

        // Meals & Entertainment - 50% deductible per CRA rules
        if (name.includes('meal') || name.includes('entertainment')) {
            return {
                default: 0.5,
                explanation: 'CRA Rule: Meals and entertainment are 50% deductible. This includes client meals, business lunches, and event tickets. Only business-related meals during meetings or events qualify. Personal entertainment is not deductible.'
            };
        }

        // Vehicle/Automobile - Based on business use percentage
        if (name.includes('vehicle') || name.includes('automobile') || name.includes('car') || name.includes('travel')) {
            return {
                default: 1.0,
                explanation: 'CRA Rule: Vehicle expenses are deductible based on business use percentage. Calculate by dividing business km by total km. If used 100% for business, enter 100%. Commuting from home to regular workplace is NOT deductible. Keep a log of business vs personal use.'
            };
        }

        // Home Office - Proportional to business use
        if (name.includes('home office') || (name.includes('office') && name.includes('home'))) {
            return {
                default: 1.0,
                explanation: 'CRA Rule: Home office expenses are deductible based on the percentage of your home used exclusively and regularly for business. Calculate by: (Office square footage ÷ Total home square footage) × 100. Must be your principal place of business or used exclusively for meeting clients.'
            };
        }

        // Travel - 100% for transport/accommodation, 50% for meals
        if (name.includes('travel')) {
            return {
                default: 1.0,
                explanation: 'CRA Rule: Transportation and accommodation for business travel are 100% deductible. However, meals during travel are only 50% deductible. If this entry includes meals, adjust accordingly.'
            };
        }

        // Rent - 100% if business premises
        if (name.includes('rent')) {
            return {
                default: 1.0,
                explanation: 'CRA Rule: Rent for business premises (office, retail space, warehouse) is 100% deductible. If you rent part of your home for business, use the home office calculation method instead.'
            };
        }

        // Utilities - 100% if business-only, or proportional for home office
        if (name.includes('utilit')) {
            return {
                default: 1.0,
                explanation: 'CRA Rule: Utilities for business premises are 100% deductible. If for a home office, deduct the percentage of home used for business. Business phone lines are 100% deductible; personal phone lines are not.'
            };
        }

        // Insurance - 100% for business insurance
        if (name.includes('insurance')) {
            return {
                default: 1.0,
                explanation: 'CRA Rule: Business insurance premiums (liability, property, professional) are 100% deductible. Personal insurance (life, health, auto for personal use) is not deductible.'
            };
        }

        // Advertising & Marketing - 100% deductible
        if (name.includes('advertis') || name.includes('market')) {
            return {
                default: 1.0,
                explanation: 'CRA Rule: Advertising and marketing expenses are 100% deductible if incurred to earn business income. This includes online ads, print ads, promotional materials, and website costs. Keep copies of advertisements.'
            };
        }

        // Legal Fees - 100% deductible for business matters (check before professional)
        if (name.includes('legal')) {
            return {
                default: 1.0,
                explanation: 'CRA Rule: Legal fees for business matters are 100% deductible. This includes contract review, business disputes, incorporation fees. Personal legal fees (divorce, wills) are not deductible.'
            };
        }

        // Accounting Fees - 100% deductible (check before professional)
        if (name.includes('accounting') || name.includes('bookkeeping')) {
            return {
                default: 1.0,
                explanation: 'CRA Rule: Accounting, bookkeeping, and tax preparation fees are 100% deductible. This includes professional services for business financial records and tax filing. Keep detailed invoices.'
            };
        }

        // Professional Fees - 100% deductible (general catch-all)
        if (name.includes('professional') || name.includes('consultant')) {
            return {
                default: 1.0,
                explanation: 'CRA Rule: Professional fees (consultants, advisors) for business services are 100% deductible. Keep detailed invoices. Personal professional fees are generally not deductible.'
            };
        }

        // Bank Charges - 100% for business accounts
        if (name.includes('bank') || name.includes('fee')) {
            return {
                default: 1.0,
                explanation: 'CRA Rule: Bank fees and interest on business loans are 100% deductible. Personal bank fees and interest on personal loans are not deductible. Ensure this is for a business account.'
            };
        }

        // Office Supplies - 100% deductible
        if (name.includes('supply') || name.includes('stationery')) {
            return {
                default: 1.0,
                explanation: 'CRA Rule: Office supplies (paper, pens, printer ink, postage) used in the tax year are 100% deductible. Keep receipts. Items over $500 may need to be capitalized as assets.'
            };
        }

        // Software & Subscriptions - 100% deductible
        if (name.includes('software') || name.includes('subscription') || name.includes('saas')) {
            return {
                default: 1.0,
                explanation: 'CRA Rule: Business software and subscriptions are 100% deductible. This includes cloud services, accounting software, CRM tools, and business apps. Personal software subscriptions are not deductible. Software over $500 may need to be capitalized.'
            };
        }

        // Subscriptions & Memberships - 100% deductible
        if (name.includes('membership')) {
            return {
                default: 1.0,
                explanation: 'CRA Rule: Business subscriptions and memberships (trade associations, professional organizations, business publications) are 100% deductible. Personal memberships are not deductible.'
            };
        }

        // Internet & Phone - 100% for business lines
        if (name.includes('internet') || name.includes('phone') || name.includes('telephone')) {
            return {
                default: 1.0,
                explanation: 'CRA Rule: Business internet and phone services are 100% deductible. If you have a dedicated business line, deduct 100%. If shared with personal use, deduct only the business portion. Keep detailed records of business vs personal usage.'
            };
        }

        // Training & Education - 100% if business-related
        if (name.includes('training') || name.includes('education') || name.includes('course') || name.includes('conference') || name.includes('seminar')) {
            return {
                default: 1.0,
                explanation: 'CRA Rule: Business training, courses, conferences, and seminars are 100% deductible if they maintain or improve skills for your business. Personal education or courses that lead to a new career are not deductible.'
            };
        }

        // Equipment & Tools - 100% deductible (under $500)
        if (name.includes('equipment') || name.includes('tool')) {
            return {
                default: 1.0,
                explanation: 'CRA Rule: Business equipment and tools are 100% deductible if under $500. Items over $500 may need to be capitalized as assets and depreciated. Keep receipts and note the purchase date.'
            };
        }

        // Postage & Shipping - 100% deductible
        if (name.includes('postage') || name.includes('shipping') || name.includes('courier')) {
            return {
                default: 1.0,
                explanation: 'CRA Rule: Postage, shipping, and courier costs for business purposes are 100% deductible. This includes mail, packages, and delivery services. Personal shipping costs are not deductible.'
            };
        }

        // Legal Fees - 100% deductible for business matters
        if (name.includes('legal')) {
            return {
                default: 1.0,
                explanation: 'CRA Rule: Legal fees for business matters are 100% deductible. This includes contract review, business disputes, incorporation fees. Personal legal fees (divorce, wills) are not deductible.'
            };
        }

        // Accounting Fees - 100% deductible
        if (name.includes('accounting') || name.includes('bookkeeping')) {
            return {
                default: 1.0,
                explanation: 'CRA Rule: Accounting, bookkeeping, and tax preparation fees are 100% deductible. This includes professional services for business financial records and tax filing. Keep detailed invoices.'
            };
        }

        // Business Licenses & Permits - 100% deductible
        if (name.includes('license') || name.includes('permit')) {
            return {
                default: 1.0,
                explanation: 'CRA Rule: Business licenses, permits, and registrations required to operate your business are 100% deductible. This includes municipal licenses, professional licenses, and regulatory permits.'
            };
        }

        // Interest Expense - 100% deductible for business loans
        if (name.includes('interest')) {
            return {
                default: 1.0,
                explanation: 'CRA Rule: Interest on business loans, credit lines, and business credit cards is 100% deductible. Personal interest (mortgage, personal loans) is not deductible. Ensure the loan is used for business purposes.'
            };
        }

        // Charitable Donations - 100% deductible with limits
        if (name.includes('charitable') || name.includes('donation')) {
            return {
                default: 1.0,
                explanation: 'CRA Rule: Charitable donations made by corporations are 100% deductible up to 75% of net income. Keep receipts from registered charities. Political donations have different rules.'
            };
        }

        // Bad Debts - 100% deductible when written off
        if (name.includes('bad debt')) {
            return {
                default: 1.0,
                explanation: 'CRA Rule: Bad debts (uncollectible accounts receivable) are 100% deductible when written off. You must have made reasonable efforts to collect and have documentation. Can only deduct if previously included in income.'
            };
        }

        // Cleaning Services - 100% deductible
        if (name.includes('cleaning') || name.includes('janitorial')) {
            return {
                default: 1.0,
                explanation: 'CRA Rule: Office cleaning and janitorial services are 100% deductible. This includes regular cleaning, deep cleaning, and maintenance cleaning for business premises.'
            };
        }

        // Security Services - 100% deductible
        if (name.includes('security')) {
            return {
                default: 1.0,
                explanation: 'CRA Rule: Security systems, monitoring services, and guard services for business premises are 100% deductible. This includes alarm systems, security cameras, and security personnel.'
            };
        }

        // Printing & Copying - 100% deductible
        if (name.includes('printing') || name.includes('copying')) {
            return {
                default: 1.0,
                explanation: 'CRA Rule: Printing, copying, and document services for business purposes are 100% deductible. This includes business cards, marketing materials, reports, and document services.'
            };
        }

        // Repairs & Maintenance - 100% deductible
        if (name.includes('repair') || name.includes('maintenance')) {
            return {
                default: 1.0,
                explanation: 'CRA Rule: Repairs and maintenance to business property are 100% deductible. This includes fixing equipment, painting, cleaning services. Major improvements that extend asset life may need to be capitalized.'
            };
        }

        // Default for other categories
        return {
            default: 1.0,
            explanation: 'CRA Rule: Most business expenses are 100% deductible if incurred to earn business income. If this expense has personal use, enter the business use percentage (0-100%). Personal expenses, fines, and penalties are not deductible.'
        };
    };

    const [formData, setFormData] = useState({
        description: expense?.description || '',
        category_id: expense?.category_id || 0,
        amount: expense?.amount || 0,
        hst_paid: expense?.hst_paid || 0,
        deduction_percentage: expense?.deduction_percentage ?? 1.0,
        expense_date: expense?.expense_date || new Date().toISOString().split('T')[0],
        receipt_attached: expense?.receipt_attached || false,
        paid_by: expense?.paid_by || 'corp',
        // Mileage fields
        distance_km: expense?.distance_km ?? null,
        start_location: expense?.start_location ?? null,
        end_location: expense?.end_location ?? null,
        vehicle_description: expense?.vehicle_description ?? null,
        mileage_rate_per_km: expense?.mileage_rate_per_km ?? null,
    });
    const [taxApplies, setTaxApplies] = useState(initialTaxApplies);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploadingFiles, setUploadingFiles] = useState(false);

    const createExpenseMutation = useMutation({
        mutationFn: async (data: any) => {
            return api.createExpense(data);
        },
        onSuccess: async (newExpense) => {
            // Upload files if any were selected
            if (selectedFiles.length > 0) {
                setUploadingFiles(true);
                try {
                    for (const file of selectedFiles) {
                        await uploadFileMutation.mutateAsync({ expenseId: newExpense.id, file });
                    }
                    setSelectedFiles([]);
                } catch (error) {
                    console.error('Failed to upload files:', error);
                } finally {
                    setUploadingFiles(false);
                }
            }
            onSave();
        },
    });

    const updateExpenseMutation = useMutation({
        mutationFn: async (data: any) => {
            return api.updateExpense(expense!.id, data);
        },
        onSuccess: () => {
            onSave();
        },
    });

    const uploadFileMutation = useMutation({
        mutationFn: async ({ expenseId, file }: { expenseId: number; file: File }) => {
            return api.uploadExpenseFile(expenseId, file);
        },
    });

    const deleteFileMutation = useMutation({
        mutationFn: async (fileId: number) => {
            return api.deleteExpenseFile(fileId);
        },
        onSuccess: () => {
            onSave(); // Refresh the expense data
        },
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const expenseData: any = {
            ...formData,
            company_id: user?.company_id,
        };

        // Include mileage fields if they exist
        if (formData.distance_km != null) {
            expenseData.distance_km = formData.distance_km;
            expenseData.start_location = formData.start_location;
            expenseData.end_location = formData.end_location;
            expenseData.vehicle_description = formData.vehicle_description;
            expenseData.mileage_rate_per_km = formData.mileage_rate_per_km;
        }

        if (expense) {
            updateExpenseMutation.mutate(expenseData);
        } else {
            createExpenseMutation.mutate(expenseData);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        setSelectedFiles(prev => [...prev, ...files]);
    };

    const handleFileRemove = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleFileUpload = async (expenseId: number) => {
        if (selectedFiles.length === 0) return;

        setUploadingFiles(true);
        try {
            for (const file of selectedFiles) {
                await uploadFileMutation.mutateAsync({ expenseId, file });
            }
            setSelectedFiles([]);
            onSave(); // Refresh the expense data
        } catch (error) {
            console.error('Failed to upload files:', error);
        } finally {
            setUploadingFiles(false);
        }
    };

    const handleFileDownload = async (file: ExpenseFile) => {
        try {
            const blob = await api.downloadExpenseFile(file.id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.original_name;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Failed to download file:', error);
        }
    };

    const handleFileDelete = (fileId: number) => {
        if (confirm('Are you sure you want to delete this file?')) {
            deleteFileMutation.mutate(fileId);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-white/10 bg-card p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-white">
                        {expense ? 'Edit Expense' : 'Add New Expense'}
                    </h3>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-8 w-8 rounded-full"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-white mb-2">Description *</label>
                            <input
                                type="text"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="flex h-10 w-full rounded-md glass border border-white/10 bg-transparent text-white placeholder:text-slate-muted focus-visible:ring-neon-emerald px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white mb-2">Category *</label>
                            <select
                                value={formData.category_id}
                                onChange={(e) => {
                                    const selectedCategoryId = parseInt(e.target.value);
                                    const selectedCategory = categories.find(cat => cat.id === selectedCategoryId);
                                    const guidance = getDeductionGuidance(selectedCategory?.name);
                                    setFormData({
                                        ...formData,
                                        category_id: selectedCategoryId,
                                        deduction_percentage: selectedCategory?.default_deduction_percentage ?? guidance.default
                                    });
                                }}
                                className="flex h-10 w-full rounded-md glass border border-white/10 bg-card text-white placeholder:text-slate-muted focus-visible:ring-neon-emerald px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                required
                            >
                                <option value={0}>Select a category</option>
                                {categories.map(category => (
                                    <option key={category.id} value={category.id}>{category.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white mb-2">Expense Date *</label>
                            <input
                                type="date"
                                value={formData.expense_date}
                                onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                                className="flex h-10 w-full rounded-md glass border border-white/10 bg-transparent text-white placeholder:text-slate-muted focus-visible:ring-neon-emerald px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white mb-2">Amount (before HST) *</label>
                            <input
                                type="number"
                                value={formData.amount}
                                onChange={(e) => {
                                    const newAmount = parseFloat(e.target.value) || 0;
                                    const newHstPaid = taxApplies ? parseFloat((newAmount * HST_RATE).toFixed(2)) : formData.hst_paid;
                                    setFormData({ ...formData, amount: newAmount, hst_paid: newHstPaid });
                                }}
                                className="flex h-10 w-full rounded-md glass border border-white/10 bg-transparent text-white placeholder:text-slate-muted focus-visible:ring-neon-emerald px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                min="0"
                                step="0.01"
                                required
                            />
                            {formData.amount > 500 && (
                                <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                                                Capital Asset Alert
                                            </h3>
                                            <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-400">
                                                <p>
                                                    This expense is over $500 CAD and may be considered a capital asset that requires depreciation.
                                                    Consider creating a capital asset entry instead of a regular expense.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-white">HST Paid</label>
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="tax_applies"
                                        checked={taxApplies}
                                        onChange={(e) => {
                                            const applies = e.target.checked;
                                            setTaxApplies(applies);
                                            if (applies) {
                                                // Auto-calculate HST when tax applies is checked
                                                const calculatedHst = parseFloat((formData.amount * HST_RATE).toFixed(2));
                                                setFormData({ ...formData, hst_paid: calculatedHst });
                                            } else {
                                                // Set to 0 when tax doesn't apply
                                                setFormData({ ...formData, hst_paid: 0 });
                                            }
                                        }}
                                        className="h-4 w-4 text-primary focus:ring-primary border-input rounded"
                                    />
                                    <label htmlFor="tax_applies" className="ml-2 block text-sm text-white">
                                        Tax applies (13%)
                                    </label>
                                </div>
                            </div>
                            <input
                                type="number"
                                value={formData.hst_paid}
                                onChange={(e) => setFormData({ ...formData, hst_paid: parseFloat(e.target.value) || 0 })}
                                className={cn(
                                    "flex h-10 w-full rounded-md glass border border-white/10 bg-transparent text-white placeholder:text-slate-muted focus-visible:ring-neon-emerald px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                                    taxApplies && "bg-muted cursor-not-allowed"
                                )}
                                min="0"
                                step="0.01"
                                readOnly={taxApplies}
                            />
                            {taxApplies && formData.amount > 0 && (
                                <p className="mt-1 text-xs text-slate-muted">
                                    Calculated: {formatCurrency(formData.amount)} × 13% = {formatCurrency(formData.hst_paid)}
                                </p>
                            )}
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <label className="block text-sm font-medium text-white">
                                    Tax Deductible % *
                                </label>
                                <HelpIcon
                                    content="The percentage of this expense that can be deducted from your taxable income. Most business expenses are 100% deductible, but some (like meals) are only partially deductible."
                                    size="sm"
                                />
                                {formData.deduction_percentage < 1.0 && (
                                    <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                                        Not Fully Deductible
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={(formData.deduction_percentage * 100).toFixed(0)}
                                    onChange={(e) => {
                                        const percentage = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)) / 100;
                                        setFormData({ ...formData, deduction_percentage: percentage });
                                    }}
                                    className="flex h-10 w-24 rounded-md glass border border-white/10 bg-transparent text-white placeholder:text-slate-muted focus-visible:ring-neon-emerald px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    min="0"
                                    max="100"
                                    step="1"
                                    required
                                />
                                <span className="flex items-center text-sm text-slate-muted">%</span>
                                <div className="flex gap-1 flex-1">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, deduction_percentage: 1.0 })}
                                        className={cn(
                                            "px-3 py-2 text-xs rounded-md border transition-colors",
                                            formData.deduction_percentage === 1.0
                                                ? "bg-primary text-primary-foreground border-primary"
                                                : "bg-card text-white border-white/10 hover:bg-muted"
                                        )}
                                    >
                                        100%
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, deduction_percentage: 0.5 })}
                                        className={cn(
                                            "px-3 py-2 text-xs rounded-md border transition-colors",
                                            formData.deduction_percentage === 0.5
                                                ? "bg-primary text-primary-foreground border-primary"
                                                : "bg-card text-white border-white/10 hover:bg-muted"
                                        )}
                                    >
                                        50%
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, deduction_percentage: 0.0 })}
                                        className={cn(
                                            "px-3 py-2 text-xs rounded-md border transition-colors",
                                            formData.deduction_percentage === 0.0
                                                ? "bg-primary text-primary-foreground border-primary"
                                                : "bg-card text-white border-white/10 hover:bg-muted"
                                        )}
                                    >
                                        0%
                                    </button>
                                </div>
                            </div>
                            {(() => {
                                const selectedCategory = categories.find(cat => cat.id === formData.category_id);
                                const guidance = getDeductionGuidance(selectedCategory?.name);
                                return (
                                    <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                                        <div className="flex items-start">
                                            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
                                            <div className="text-xs text-blue-800 dark:text-blue-300">
                                                <p className="font-medium mb-1">Category Guidance:</p>
                                                <p>{guidance.explanation}</p>
                                                {formData.amount > 0 && (
                                                    <p className="mt-2 font-medium">
                                                        Deductible amount: {formatCurrency(formData.amount * formData.deduction_percentage)} of {formatCurrency(formData.amount)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                            {formData.deduction_percentage < 1.0 && formData.amount > 0 && (
                                <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                                                Partial Deduction
                                            </h3>
                                            <div className="mt-1 text-sm text-yellow-700 dark:text-yellow-400">
                                                <p>
                                                    Only {(formData.deduction_percentage * 100).toFixed(0)}% ({formatCurrency(formData.amount * formData.deduction_percentage)}) of this expense will reduce your taxable income.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="sm:col-span-2">
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="receipt_attached"
                                    checked={formData.receipt_attached}
                                    onChange={(e) => setFormData({ ...formData, receipt_attached: e.target.checked })}
                                    className="h-4 w-4 text-primary focus:ring-primary border-input rounded"
                                />
                                <label htmlFor="receipt_attached" className="ml-2 block text-sm text-white">
                                    Receipt attached
                                </label>
                            </div>
                        </div>

                        {/* Mileage Fields Section - Only show if editing a mileage expense */}
                        {expense && expense.distance_km != null && (
                            <>
                                <div className="sm:col-span-2 border-t border-white/10 pt-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Car className="h-5 w-5 text-blue-400" />
                                        <h4 className="text-lg font-medium text-white">Mileage Details</h4>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-white mb-2">Distance (km)</label>
                                    <input
                                        type="number"
                                        value={formData.distance_km ?? ''}
                                        onChange={(e) => {
                                            const distance = parseFloat(e.target.value) || 0;
                                            const rate = formData.mileage_rate_per_km ?? CRA_MILEAGE_RATE;
                                            const newAmount = distance * rate;
                                            setFormData({ 
                                                ...formData, 
                                                distance_km: distance,
                                                amount: newAmount
                                            });
                                        }}
                                        className="input"
                                        min="0.01"
                                        step="0.01"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-white mb-2">Rate per km</label>
                                    <input
                                        type="number"
                                        value={formData.mileage_rate_per_km ?? CRA_MILEAGE_RATE}
                                        onChange={(e) => {
                                            const rate = parseFloat(e.target.value) || CRA_MILEAGE_RATE;
                                            const distance = formData.distance_km ?? 0;
                                            const newAmount = distance * rate;
                                            setFormData({ 
                                                ...formData, 
                                                mileage_rate_per_km: rate,
                                                amount: newAmount
                                            });
                                        }}
                                        className="input"
                                        min="0"
                                        step="0.01"
                                    />
                                    <p className="text-xs text-slate-muted mt-1">CRA Standard: ${CRA_MILEAGE_RATE.toFixed(2)}/km (2024)</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-white mb-2">Starting Location</label>
                                    <input
                                        type="text"
                                        value={formData.start_location ?? ''}
                                        onChange={(e) => setFormData({ ...formData, start_location: e.target.value })}
                                        className="input"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-white mb-2">Destination</label>
                                    <input
                                        type="text"
                                        value={formData.end_location ?? ''}
                                        onChange={(e) => setFormData({ ...formData, end_location: e.target.value })}
                                        className="input"
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-white mb-2">Vehicle Description</label>
                                    <input
                                        type="text"
                                        value={formData.vehicle_description ?? ''}
                                        onChange={(e) => setFormData({ ...formData, vehicle_description: e.target.value })}
                                        className="input"
                                        placeholder="e.g., 2020 Honda Civic"
                                    />
                                </div>
                            </>
                        )}

                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-white mb-2">Who Paid *</label>
                            <div className="flex gap-6">
                                <div className="flex items-center">
                                    <input
                                        type="radio"
                                        id="paid_by_corp"
                                        name="paid_by"
                                        value="corp"
                                        checked={formData.paid_by === 'corp'}
                                        onChange={(e) => setFormData({ ...formData, paid_by: e.target.value as 'corp' | 'owner' })}
                                        className="h-4 w-4 text-primary focus:ring-primary border-input"
                                    />
                                    <label htmlFor="paid_by_corp" className="ml-2 block text-sm text-white">
                                        Business Account
                                    </label>
                                </div>
                                <div className="flex items-center">
                                    <input
                                        type="radio"
                                        id="paid_by_owner"
                                        name="paid_by"
                                        value="owner"
                                        checked={formData.paid_by === 'owner'}
                                        onChange={(e) => setFormData({ ...formData, paid_by: e.target.value as 'corp' | 'owner' })}
                                        className="h-4 w-4 text-primary focus:ring-primary border-input"
                                    />
                                    <label htmlFor="paid_by_owner" className="ml-2 block text-sm text-white">
                                        Personal Account (to be reimbursed)
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* File Upload Section */}
                    <div className="border-t border-white/10 pt-6">
                        <h4 className="text-lg font-medium text-white mb-4">Files & Receipts</h4>

                        {/* Existing Files */}
                        {expense?.files && expense.files.length > 0 && (
                            <div className="mb-6">
                                <h5 className="text-sm font-medium text-slate-muted mb-3">Uploaded Files</h5>
                                <div className="space-y-2">
                                    {expense.files.map((file) => (
                                        <div key={file.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-white/10">
                                            <div className="flex items-center gap-3">
                                                <FileText className="h-5 w-5 text-slate-muted" />
                                                <div>
                                                    <p className="text-sm font-medium text-white">{file.original_name}</p>
                                                    <p className="text-xs text-slate-muted">{formatFileSize(file.file_size)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleFileDownload(file)}
                                                    className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                                    title="Download"
                                                >
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleFileDelete(file.id)}
                                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    title="Delete"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* File Upload */}
                        <div>
                            <label className="block text-sm font-medium text-white mb-2">Upload Files</label>
                            <div className="border-2 border-dashed border-white/10 rounded-lg p-6 hover:bg-muted/50 transition-colors">
                                <input
                                    type="file"
                                    multiple
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    id="file-upload"
                                    accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.rar"
                                />
                                <label htmlFor="file-upload" className="cursor-pointer w-full h-full block">
                                    <div className="text-center">
                                        <Upload className="mx-auto h-12 w-12 text-slate-muted" />
                                        <div className="mt-2">
                                            <p className="text-sm text-slate-muted">
                                                <span className="font-medium text-primary hover:text-primary/90">
                                                    Click to upload
                                                </span>
                                                {' '}or drag and drop
                                            </p>
                                            <p className="text-xs text-slate-muted mt-1">PDF, images, documents up to 10MB each</p>
                                        </div>
                                    </div>
                                </label>
                            </div>

                            {/* Selected Files */}
                            {selectedFiles.length > 0 && (
                                <div className="mt-4">
                                    <h6 className="text-sm font-medium text-white mb-2">Selected Files</h6>
                                    <div className="space-y-2">
                                        {selectedFiles.map((file, index) => (
                                            <div key={index} className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-100 dark:border-blue-800">
                                                <span className="text-sm text-white">{file.name}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleFileRemove(index)}
                                                    className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                    {expense && (
                                        <Button
                                            type="button"
                                            onClick={() => handleFileUpload(expense.id)}
                                            disabled={uploadingFiles}
                                            className="mt-3"
                                            size="sm"
                                        >
                                            {uploadingFiles ? 'Uploading...' : 'Upload Files'}
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={createExpenseMutation.isPending || updateExpenseMutation.isPending || uploadingFiles}
                        >
                            {createExpenseMutation.isPending || updateExpenseMutation.isPending || uploadingFiles
                                ? 'Saving...'
                                : expense
                                    ? 'Update Expense'
                                    : 'Create Expense'
                            }
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Expenses;
