import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api, { type Expense, type OwnerPayment, type CapitalAsset } from '../lib/api';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import {
    Plus,
    Edit,
    Trash2,
    Search,
    Calendar,
    DollarSign,
    FileText,
    CreditCard,
    CheckCircle,
    AlertCircle,
    X
} from 'lucide-react';

const currencyFormatter = new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD'
});

const formatCurrency = (amount: number) => currencyFormatter.format(amount);

const formatDate = (dateString: string) => {
    if (!dateString) {
        return '';
    }
    return new Date(dateString).toLocaleDateString('en-CA');
};

interface OwnerPaymentModalProps {
    ownerPayment?: OwnerPayment;
    ownerExpenses: Expense[];
    ownerExpensesLoading: boolean;
    ownerCapitalAssets: CapitalAsset[];
    ownerCapitalAssetsLoading: boolean;
    onClose: () => void;
    onSave: (ownerPayment: OwnerPayment, linkedExpenseId?: number, linkedCapitalAssetId?: number) => void;
}

function OwnerPaymentModal({
    ownerPayment,
    ownerExpenses,
    ownerExpensesLoading,
    ownerCapitalAssets,
    ownerCapitalAssetsLoading,
    onClose,
    onSave
}: OwnerPaymentModalProps) {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        payment_date: '',
        payment_type: 'reimbursement' as 'reimbursement' | 'loan_repayment' | 'other',
        reference: '',
        notes: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [linkedExpenseId, setLinkedExpenseId] = useState<number | ''>('');
    const [linkedCapitalAssetId, setLinkedCapitalAssetId] = useState<number | ''>('');
    const [linkType, setLinkType] = useState<'expense' | 'capital_asset' | ''>('');

    const orderedOwnerExpenses = useMemo(() => {
        if (!ownerExpenses) return [];
        // Double-check: filter out any company-paid expenses as a safeguard
        const filtered = ownerExpenses.filter(expense => expense.paid_by === 'owner');
        return [...filtered].sort((a, b) => {
            const dateA = new Date(a.expense_date).getTime();
            const dateB = new Date(b.expense_date).getTime();
            return dateB - dateA;
        });
    }, [ownerExpenses]);

    const orderedOwnerCapitalAssets = useMemo(() => {
        if (!ownerCapitalAssets) return [];
        // Double-check: filter out any company-paid assets as a safeguard
        const filtered = ownerCapitalAssets.filter(asset => asset.paid_by === 'owner');
        return [...filtered].sort((a, b) => {
            const dateA = new Date(a.purchase_date).getTime();
            const dateB = new Date(b.purchase_date).getTime();
            return dateB - dateA;
        });
    }, [ownerCapitalAssets]);

    const selectedExpense = useMemo(() => {
        if (typeof linkedExpenseId !== 'number' || linkType !== 'expense') {
            return undefined;
        }
        return orderedOwnerExpenses.find(expense => expense.id === linkedExpenseId);
    }, [linkedExpenseId, orderedOwnerExpenses, linkType]);

    const selectedCapitalAsset = useMemo(() => {
        if (typeof linkedCapitalAssetId !== 'number' || linkType !== 'capital_asset') {
            return undefined;
        }
        return orderedOwnerCapitalAssets.find(asset => asset.id === linkedCapitalAssetId);
    }, [linkedCapitalAssetId, orderedOwnerCapitalAssets, linkType]);

    useEffect(() => {
        setLinkedExpenseId('');
        setLinkedCapitalAssetId('');
        setLinkType('');
        if (ownerPayment) {
            setFormData({
                description: ownerPayment.description,
                amount: ownerPayment.amount.toString(),
                payment_date: ownerPayment.payment_date.split('T')[0],
                payment_type: ownerPayment.payment_type,
                reference: ownerPayment.reference || '',
                notes: ownerPayment.notes || ''
            });
        }
    }, [ownerPayment]);

    const handleLinkedExpenseChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const { value } = event.target;
        if (!value) {
            setLinkedExpenseId('');
            setLinkType('');
            setLinkedCapitalAssetId('');
            return;
        }

        const expenseId = Number(value);
        setLinkedExpenseId(expenseId);
        setLinkType('expense');
        setLinkedCapitalAssetId('');

        const expense = orderedOwnerExpenses.find(item => item.id === expenseId);
        if (!expense) {
            return;
        }

        const totalWithHst = expense.amount + (expense.hst_paid ?? 0);
        const formattedDate = formatDate(expense.expense_date);
        setFormData(prev => ({
            ...prev,
            description: expense.description,
            amount: totalWithHst.toFixed(2),
            payment_type: 'reimbursement',
            // Don't auto-fill payment_date - it should be when owner got paid, not expense date
            // payment_date will remain as is (empty for new, or existing value for edit)
            notes: `Reimbursement for ${expense.description} (expense date: ${formattedDate})`
        }));
    };

    const handleLinkedCapitalAssetChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const { value } = event.target;
        if (!value) {
            setLinkedCapitalAssetId('');
            setLinkType('');
            setLinkedExpenseId('');
            return;
        }

        const assetId = Number(value);
        setLinkedCapitalAssetId(assetId);
        setLinkType('capital_asset');
        setLinkedExpenseId('');

        const asset = orderedOwnerCapitalAssets.find(item => item.id === assetId);
        if (!asset) {
            return;
        }

        const formattedDate = formatDate(asset.purchase_date);
        setFormData(prev => ({
            ...prev,
            description: asset.description,
            amount: asset.total_cost.toFixed(2),
            payment_type: 'reimbursement',
            // Don't auto-fill payment_date - it should be when owner got paid, not purchase date
            // payment_date will remain as is (empty for new, or existing value for edit)
            notes: `Reimbursement for capital asset: ${asset.description} (purchase date: ${formattedDate})`
        }));
    };

    const handleLinkedExpenseClear = () => {
        setLinkedExpenseId('');
        setLinkType('');
    };

    const handleLinkedCapitalAssetClear = () => {
        setLinkedCapitalAssetId('');
        setLinkType('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.company_id) return;

        setIsSubmitting(true);
        try {
            const paymentData = {
                description: formData.description,
                amount: parseFloat(formData.amount),
                payment_date: formData.payment_date,
                payment_type: formData.payment_type,
                reference: formData.reference || undefined,
                notes: formData.notes || undefined,
                company_id: user.company_id
            };

            let savedPayment: OwnerPayment;
            if (ownerPayment) {
                savedPayment = await api.updateOwnerPayment(ownerPayment.id, paymentData);
            } else {
                savedPayment = await api.createOwnerPayment(paymentData);
            }

            onSave(
                savedPayment,
                typeof linkedExpenseId === 'number' ? linkedExpenseId : undefined,
                typeof linkedCapitalAssetId === 'number' ? linkedCapitalAssetId : undefined
            );
            onClose();
        } catch (error) {
            console.error('Error saving owner payment:', error);
            alert('Error saving owner payment. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-xl font-semibold text-foreground">
                        {ownerPayment ? 'Edit Owner Payment' : 'Add Owner Payment'}
                    </h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-8 w-8 rounded-full"
                    >
                        <X className="h-6 w-6" />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-foreground mb-2">
                                Description *
                            </label>
                            <input
                                type="text"
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="input"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="amount" className="block text-sm font-medium text-foreground mb-2">
                                Amount *
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <input
                                    type="number"
                                    id="amount"
                                    step="0.01"
                                    min="0"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    className="input pl-10"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="payment_date" className="block text-sm font-medium text-foreground mb-2">
                                Payment Date *
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Calendar className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <input
                                    type="date"
                                    id="payment_date"
                                    value={formData.payment_date}
                                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                                    className="input pl-10"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="payment_type" className="block text-sm font-medium text-foreground mb-2">
                                Payment Type *
                            </label>
                            <select
                                id="payment_type"
                                value={formData.payment_type}
                                onChange={(e) => setFormData({ ...formData, payment_type: e.target.value as any })}
                                className="input"
                                required
                            >
                                <option value="reimbursement">Reimbursement</option>
                                <option value="loan_repayment">Loan Repayment</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <div className="flex items-center justify-between mb-2">
                                <label htmlFor="linked_expense" className="block text-sm font-medium text-foreground">
                                    Link Owner Expense (Optional)
                                </label>
                                {typeof linkedExpenseId === 'number' && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleLinkedExpenseClear}
                                    >
                                        Clear
                                    </Button>
                                )}
                            </div>
                            <select
                                id="linked_expense"
                                value={linkedExpenseId === '' ? '' : linkedExpenseId.toString()}
                                onChange={handleLinkedExpenseChange}
                                disabled={ownerExpensesLoading || orderedOwnerExpenses.length === 0 || linkType === 'capital_asset'}
                                className="input"
                            >
                                <option value="">
                                    {ownerExpensesLoading
                                        ? 'Loading owner-paid expenses...'
                                        : orderedOwnerExpenses.length > 0
                                            ? 'Select an owner-paid expense to reimburse'
                                            : 'No unpaid owner expenses available'}
                                </option>
                                {orderedOwnerExpenses.map(expense => {
                                    const totalWithHst = expense.amount + (expense.hst_paid ?? 0);
                                    return (
                                        <option key={expense.id} value={expense.id}>
                                            {`${expense.description} • ${formatCurrency(totalWithHst)} • ${formatDate(expense.expense_date)}`}
                                        </option>
                                    );
                                })}
                            </select>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Selecting an expense pre-fills the reimbursement details, but you can still edit the fields
                                before saving.
                            </p>
                            {selectedExpense && (
                                <div className="mt-3 rounded-md border border-blue-100 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3 text-sm">
                                    <div className="font-semibold text-blue-900 dark:text-blue-200">{selectedExpense.description}</div>
                                    <div className="mt-1 flex flex-wrap gap-4 text-blue-800 dark:text-blue-300">
                                        <span>{formatCurrency(selectedExpense.amount + (selectedExpense.hst_paid ?? 0))} total</span>
                                        <span>Expense date: {formatDate(selectedExpense.expense_date)}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="md:col-span-2">
                            <div className="flex items-center justify-between mb-2">
                                <label htmlFor="linked_capital_asset" className="block text-sm font-medium text-foreground">
                                    Link Capital Asset Paid by Owner (Optional)
                                </label>
                                {typeof linkedCapitalAssetId === 'number' && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleLinkedCapitalAssetClear}
                                    >
                                        Clear
                                    </Button>
                                )}
                            </div>
                            <select
                                id="linked_capital_asset"
                                value={linkedCapitalAssetId === '' ? '' : linkedCapitalAssetId.toString()}
                                onChange={handleLinkedCapitalAssetChange}
                                disabled={ownerCapitalAssetsLoading || orderedOwnerCapitalAssets.length === 0 || linkType === 'expense'}
                                className="input"
                            >
                                <option value="">
                                    {ownerCapitalAssetsLoading
                                        ? 'Loading owner-paid capital assets...'
                                        : orderedOwnerCapitalAssets.length > 0
                                            ? 'Select a capital asset paid by owner to reimburse'
                                            : 'No unpaid owner capital assets available'}
                                </option>
                                {orderedOwnerCapitalAssets.map(asset => (
                                    <option key={asset.id} value={asset.id}>
                                        {`${asset.description} • ${formatCurrency(asset.total_cost)} • ${formatDate(asset.purchase_date)}`}
                                    </option>
                                ))}
                            </select>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Selecting a capital asset pre-fills the reimbursement details, but you can still edit the fields
                                before saving.
                            </p>
                            {selectedCapitalAsset && (
                                <div className="mt-3 rounded-md border border-orange-100 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 p-3 text-sm">
                                    <div className="font-semibold text-orange-900 dark:text-orange-200">{selectedCapitalAsset.description}</div>
                                    <div className="mt-1 flex flex-wrap gap-4 text-orange-800 dark:text-orange-300">
                                        <span>{formatCurrency(selectedCapitalAsset.total_cost)} total cost</span>
                                        <span>Purchase date: {formatDate(selectedCapitalAsset.purchase_date)}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <label htmlFor="reference" className="block text-sm font-medium text-foreground mb-2">
                                Reference (Optional)
                            </label>
                            <input
                                type="text"
                                id="reference"
                                value={formData.reference}
                                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                                placeholder="Check number, transfer reference, etc."
                                className="input"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-foreground mb-2">
                            Notes (Optional)
                        </label>
                        <textarea
                            id="notes"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={3}
                            className="input min-h-[80px]"
                            placeholder="Additional notes about this payment..."
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Saving...' : (ownerPayment ? 'Update Payment' : 'Add Payment')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

const OwnerPayments: React.FC = () => {
    const { user } = useAuth();
    const [ownerPayments, setOwnerPayments] = useState<OwnerPayment[]>([]);
    const [ownerExpenses, setOwnerExpenses] = useState<Expense[]>([]);
    const [ownerCapitalAssets, setOwnerCapitalAssets] = useState<CapitalAsset[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [ownerExpensesLoading, setOwnerExpensesLoading] = useState(false);
    const [ownerCapitalAssetsLoading, setOwnerCapitalAssetsLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingPayment, setEditingPayment] = useState<OwnerPayment | undefined>();
    const [searchTerm, setSearchTerm] = useState('');
    const [paymentTypeFilter, setPaymentTypeFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('');

    useEffect(() => {
        if (!user) {
            // No authenticated user – nothing to load
            setIsLoading(false);
            setOwnerExpenses([]);
            setOwnerExpensesLoading(false);
            return;
        }

        if (!user.company_id) {
            // Authenticated but no company configured – stop loading and show message
            setIsLoading(false);
            setOwnerExpenses([]);
            setOwnerExpensesLoading(false);
            setOwnerCapitalAssets([]);
            setOwnerCapitalAssetsLoading(false);
            return;
        }

        loadOwnerPayments();
        loadOwnerExpenses();
        loadOwnerCapitalAssets();
    }, [user]);

    const loadOwnerPayments = async () => {
        if (!user?.company_id) {
            return;
        }

        try {
            setIsLoading(true);
            const response = await api.getOwnerPayments({
                company_id: user.company_id,
                limit: 1000
            });
            setOwnerPayments(response.data);
        } catch (error) {
            console.error('Error loading owner payments:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadOwnerExpenses = async () => {
        if (!user?.company_id) {
            setOwnerExpenses([]);
            setOwnerExpensesLoading(false);
            return;
        }

        try {
            setOwnerExpensesLoading(true);
            const [expensesResponse, paymentsResponse] = await Promise.all([
                api.getExpenses({
                    company_id: user.company_id,
                    limit: 1000
                }),
                api.getOwnerPayments({
                    company_id: user.company_id,
                    limit: 1000
                })
            ]);

            // Get all reimbursement payments
            const reimbursementPayments = paymentsResponse.data.filter(
                payment => payment.payment_type === 'reimbursement'
            );

            // Filter expenses: only show owner-paid expenses that haven't been reimbursed yet
            const allExpenses = expensesResponse.data || [];

            // First, get all owner-paid expenses
            const ownerPaidExpensesList = allExpenses.filter(expense => expense.paid_by === 'owner');

            // Create a map to track which payments have been matched to expenses
            // This prevents one payment from matching multiple expenses
            const matchedPaymentIds = new Set<number>();
            const matchedExpenseIds = new Set<number>();

            // For each payment, find the best matching expense (one-to-one matching)
            reimbursementPayments.forEach(payment => {
                const paymentDate = new Date(payment.payment_date);

                // Find the best matching expense (by date proximity)
                const matchingExpense = ownerPaidExpensesList
                    .filter(expense => {
                        // Skip if already matched
                        if (matchedExpenseIds.has(expense.id) || matchedPaymentIds.has(payment.id)) {
                            return false;
                        }

                        const expenseTotal = expense.amount + (expense.hst_paid ?? 0);
                        const descriptionMatch = payment.description.trim().toLowerCase() === expense.description.trim().toLowerCase();
                        const amountMatch = Math.abs(payment.amount - expenseTotal) < 0.01;
                        const expenseDate = new Date(expense.expense_date);
                        const dateMatch = paymentDate >= expenseDate; // Payment should be on or after expense date

                        return descriptionMatch && amountMatch && dateMatch;
                    })
                    .sort((a, b) => {
                        // Prefer expenses with dates closest to payment date
                        const dateDiffA = Math.abs(paymentDate.getTime() - new Date(a.expense_date).getTime());
                        const dateDiffB = Math.abs(paymentDate.getTime() - new Date(b.expense_date).getTime());
                        return dateDiffA - dateDiffB;
                    })[0]; // Get the closest match

                if (matchingExpense) {
                    matchedExpenseIds.add(matchingExpense.id);
                    matchedPaymentIds.add(payment.id);
                }
            });

            // Filter out matched expenses
            const ownerPaidExpenses = ownerPaidExpensesList
                .filter(expense => !matchedExpenseIds.has(expense.id))
                .sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime());

            // Debug: Log if we find any company-paid expenses in the filtered list
            const companyPaidInFiltered = ownerPaidExpenses.filter(e => e.paid_by !== 'owner');
            if (companyPaidInFiltered.length > 0) {
                console.warn('Found company-paid expenses in filtered list:', companyPaidInFiltered);
            }

            setOwnerExpenses(ownerPaidExpenses);
        } catch (error) {
            console.error('Error loading owner-paid expenses:', error);
        } finally {
            setOwnerExpensesLoading(false);
        }
    };

    const loadOwnerCapitalAssets = async () => {
        if (!user?.company_id) {
            setOwnerCapitalAssets([]);
            setOwnerCapitalAssetsLoading(false);
            return;
        }

        try {
            setOwnerCapitalAssetsLoading(true);
            const [assetsResponse, paymentsResponse] = await Promise.all([
                api.getCapitalAssets({
                    company_id: user.company_id,
                    limit: 1000
                }),
                api.getOwnerPayments({
                    company_id: user.company_id,
                    limit: 1000
                })
            ]);

            // Get all reimbursement payments
            const reimbursementPayments = paymentsResponse.data.filter(
                payment => payment.payment_type === 'reimbursement'
            );

            // First, get all owner-paid capital assets
            const ownerPaidAssetsList = assetsResponse.data.filter(asset => asset.paid_by === 'owner');

            // Create a map to track which payments have been matched to assets
            // This prevents one payment from matching multiple assets
            const matchedPaymentIds = new Set<number>();
            const matchedAssetIds = new Set<number>();

            // For each payment, find the best matching asset (one-to-one matching)
            reimbursementPayments.forEach(payment => {
                const paymentDate = new Date(payment.payment_date);

                // Find the best matching asset (by date proximity)
                const matchingAsset = ownerPaidAssetsList
                    .filter(asset => {
                        // Skip if already matched
                        if (matchedAssetIds.has(asset.id) || matchedPaymentIds.has(payment.id)) {
                            return false;
                        }

                        const descriptionMatch = payment.description.trim().toLowerCase() === asset.description.trim().toLowerCase();
                        const amountMatch = Math.abs(payment.amount - asset.total_cost) < 0.01;
                        const assetDate = new Date(asset.purchase_date);
                        const dateMatch = paymentDate >= assetDate; // Payment should be on or after purchase date

                        return descriptionMatch && amountMatch && dateMatch;
                    })
                    .sort((a, b) => {
                        // Prefer assets with dates closest to payment date
                        const dateDiffA = Math.abs(paymentDate.getTime() - new Date(a.purchase_date).getTime());
                        const dateDiffB = Math.abs(paymentDate.getTime() - new Date(b.purchase_date).getTime());
                        return dateDiffA - dateDiffB;
                    })[0]; // Get the closest match

                if (matchingAsset) {
                    matchedAssetIds.add(matchingAsset.id);
                    matchedPaymentIds.add(payment.id);
                }
            });

            // Filter out matched assets
            const ownerPaidAssets = ownerPaidAssetsList
                .filter(asset => !matchedAssetIds.has(asset.id))
                .sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime());

            setOwnerCapitalAssets(ownerPaidAssets);
        } catch (error) {
            console.error('Error loading owner-paid capital assets:', error);
        } finally {
            setOwnerCapitalAssetsLoading(false);
        }
    };

    const handleSave = (savedPayment: OwnerPayment, _linkedExpenseId?: number, _linkedCapitalAssetId?: number) => {
        if (editingPayment) {
            setOwnerPayments(prev =>
                prev.map(payment =>
                    payment.id === savedPayment.id ? savedPayment : payment
                )
            );
        } else {
            setOwnerPayments(prev => [savedPayment, ...prev]);
        }
        setEditingPayment(undefined);

        // Reload expenses and capital assets to ensure the lists are up-to-date
        // This will automatically filter out any items that have been reimbursed
        loadOwnerExpenses();
        loadOwnerCapitalAssets();
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this owner payment?')) return;

        try {
            await api.deleteOwnerPayment(id);
            setOwnerPayments(prev => prev.filter(payment => payment.id !== id));
            // Reload expenses and capital assets in case the deleted payment was a reimbursement
            // This will make previously reimbursed items available again
            loadOwnerExpenses();
            loadOwnerCapitalAssets();
        } catch (error) {
            console.error('Error deleting owner payment:', error);
            alert('Error deleting owner payment. Please try again.');
        }
    };

    const getPaymentTypeIcon = (type: string) => {
        switch (type) {
            case 'reimbursement':
                return <CreditCard className="h-4 w-4" />;
            case 'loan_repayment':
                return <FileText className="h-4 w-4" />;
            default:
                return <CheckCircle className="h-4 w-4" />;
        }
    };

    const getPaymentTypeColor = (type: string) => {
        switch (type) {
            case 'reimbursement':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
            case 'loan_repayment':
                return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
            default:
                return 'bg-muted text-muted-foreground';
        }
    };

    const filteredPayments = ownerPayments.filter(payment => {
        const matchesSearch = payment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (payment.reference && payment.reference.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesType = !paymentTypeFilter || payment.payment_type === paymentTypeFilter;
        const matchesDate = !dateFilter || payment.payment_date.startsWith(dateFilter);

        return matchesSearch && matchesType && matchesDate;
    });

    const totalAmount = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-emerald"></div>
            </div>
        );
    }

    if (!user?.company_id) {
        return (
            <div className="space-y-4">
                <h1 className="text-3xl font-bold tracking-tight text-white">Owner Reimbursement</h1>
                <Card className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                        To track owner payments, please first set up your company details in the{' '}
                        <span className="font-semibold">Settings</span> page.
                    </p>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Owner Reimbursement</h1>
                    <p className="text-muted-foreground mt-2">Track payments made by the corporation to the owner</p>
                </div>
                <Button
                    onClick={() => {
                        setEditingPayment(undefined);
                        setShowModal(true);
                    }}
                    icon={Plus}
                    className="w-full sm:w-auto"
                >
                    Add Payment
                </Button>
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="search" className="block text-sm font-medium text-foreground mb-2">
                            Search
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <input
                                type="text"
                                id="search"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by description or reference..."
                                className="input pl-10"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="payment_type_filter" className="block text-sm font-medium text-foreground mb-2">
                            Payment Type
                        </label>
                        <select
                            id="payment_type_filter"
                            value={paymentTypeFilter}
                            onChange={(e) => setPaymentTypeFilter(e.target.value)}
                            className="input"
                        >
                            <option value="">All Types</option>
                            <option value="reimbursement">Reimbursement</option>
                            <option value="loan_repayment">Loan Repayment</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="date_filter" className="block text-sm font-medium text-foreground mb-2">
                            Year
                        </label>
                        <select
                            id="date_filter"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="input"
                        >
                            <option value="">All Years</option>
                            <option value="2024">2024</option>
                            <option value="2025">2025</option>
                            <option value="2026">2026</option>
                        </select>
                    </div>
                </div>
            </Card>

            {/* Summary */}
            <Card className="p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">Summary</h3>
                        <p className="text-muted-foreground">{filteredPayments.length} payments found</p>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-foreground tabular-nums">{formatCurrency(totalAmount)}</div>
                        <div className="text-sm text-muted-foreground">Total Amount</div>
                    </div>
                </div>
            </Card>

            {/* Payments List */}
            <Card className="overflow-hidden">
                {filteredPayments.length === 0 ? (
                    <div className="text-center py-12">
                        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">No payments found</h3>
                        <p className="text-muted-foreground mb-4">
                            {searchTerm || paymentTypeFilter || dateFilter
                                ? 'Try adjusting your filters to see more results.'
                                : 'Get started by adding your first owner payment.'}
                        </p>
                        {!searchTerm && !paymentTypeFilter && !dateFilter && (
                            <Button
                                onClick={() => setShowModal(true)}
                                icon={Plus}
                            >
                                Add Payment
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Description</th>
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4">Amount</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Reference</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredPayments.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-foreground">
                                                {payment.description}
                                            </div>
                                            {payment.notes && (
                                                <div className="text-sm text-muted-foreground truncate max-w-xs">
                                                    {payment.notes}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentTypeColor(payment.payment_type)}`}>
                                                {getPaymentTypeIcon(payment.payment_type)}
                                                <span className="ml-1 capitalize">{payment.payment_type.replace('_', ' ')}</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-foreground tabular-nums">
                                            {formatCurrency(payment.amount)}
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">
                                            {formatDate(payment.payment_date)}
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">
                                            {payment.reference || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        setEditingPayment(payment);
                                                        setShowModal(true);
                                                    }}
                                                    className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(payment.id)}
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
                )}
            </Card>

            {showModal && (
                <OwnerPaymentModal
                    ownerPayment={editingPayment}
                    ownerExpenses={ownerExpenses}
                    ownerExpensesLoading={ownerExpensesLoading}
                    ownerCapitalAssets={ownerCapitalAssets}
                    ownerCapitalAssetsLoading={ownerCapitalAssetsLoading}
                    onClose={() => {
                        setShowModal(false);
                        setEditingPayment(undefined);
                    }}
                    onSave={handleSave}
                />
            )}
        </div>
    );
};

export default OwnerPayments;
