import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api, { type Salary as SalaryRecord } from '../lib/api';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import {
    Plus,
    Edit,
    Trash2,
    DollarSign,
    CheckCircle,
    Clock,
    Search,
    X,
    Briefcase
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

const SalaryPage: React.FC = () => {
    const { user } = useAuth();
    const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingSalary, setEditingSalary] = useState<SalaryRecord | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Form state
    const [formData, setFormData] = useState({
        amount: '',
        payment_date: '',
        period_start: '',
        period_end: '',
        employee_id: '',
        status: 'pending' as 'pending' | 'paid',
        notes: '',
    });

    // Fetch employees for dropdown
    const { data: employees } = useQuery({
        queryKey: ['employees', user?.company_id],
        queryFn: async () => {
            const result = await api.getEmployees({
                company_id: user?.company_id,
                status: 'active',
                limit: 1000
            });
            return result.data;
        },
        enabled: !!user?.company_id,
    });

    useEffect(() => {
        if (user) {
            loadSalaries();
        }
    }, [user, currentPage, statusFilter]);

    const loadSalaries = async () => {
        try {
            setIsLoading(true);
            const response = await api.getSalaries({
                company_id: user?.company_id,
                page: currentPage,
                limit: 10,
                status: statusFilter || undefined,
            });
            setSalaries(response.data);
            setTotalPages(response.totalPages);
            setTotal(response.total);
        } catch (error) {
            console.error('Error loading salaries:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const salaryData = {
                amount: parseFloat(formData.amount),
                payment_date: formData.payment_date,
                period_start: formData.period_start,
                period_end: formData.period_end,
                employee_id: parseInt(formData.employee_id),
                status: formData.status,
                notes: formData.notes || undefined,
                company_id: user?.company_id!,
            };

            if (editingSalary) {
                await api.updateSalary(editingSalary.id, salaryData);
            } else {
                await api.createSalary(salaryData);
            }

            setShowModal(false);
            setEditingSalary(null);
            resetForm();
            loadSalaries();
        } catch (error) {
            console.error('Error saving salary:', error);
        }
    };

    const handleEdit = (salary: SalaryRecord) => {
        setEditingSalary(salary);
        setFormData({
            amount: salary.amount.toString(),
            payment_date: salary.payment_date.split('T')[0],
            period_start: salary.period_start.split('T')[0],
            period_end: salary.period_end.split('T')[0],
            employee_id: salary.employee_id.toString(),
            status: salary.status,
            notes: salary.notes || '',
        });
        setShowModal(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this salary record?')) {
            try {
                await api.deleteSalary(id);
                loadSalaries();
            } catch (error) {
                console.error('Error deleting salary:', error);
            }
        }
    };

    const resetForm = () => {
        setFormData({
            amount: '',
            payment_date: '',
            period_start: '',
            period_end: '',
            employee_id: '',
            status: 'pending',
            notes: '',
        });
    };

    const openModal = () => {
        setEditingSalary(null);
        resetForm();
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingSalary(null);
        resetForm();
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-CA');
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'paid':
                return <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400" />;
            case 'pending':
                return <Clock className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />;
            default:
                return <Clock className="h-4 w-4 text-slate-muted" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
            default:
                return 'bg-muted text-slate-muted';
        }
    };

    const filteredSalaries = salaries.filter((salary) => {
        const employeeName = salary.employee 
            ? `${salary.employee.first_name} ${salary.employee.last_name}`.toLowerCase()
            : '';
        return employeeName.includes(searchTerm.toLowerCase()) ||
            salary.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            salary.amount.toString().includes(searchTerm);
    });

    const totalSalaries = salaries.reduce((sum, salary) => sum + salary.amount, 0);
    const paidSalaries = salaries.filter(s => s.status === 'paid').reduce((sum, salary) => sum + salary.amount, 0);
    const pendingSalaries = salaries.filter(s => s.status === 'pending').reduce((sum, salary) => sum + salary.amount, 0);

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
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Salary</h1>
                    <p className="text-muted-foreground mt-2">Manage employee salary payments</p>
                </div>
                <Button
                    onClick={openModal}
                    icon={Plus}
                    className="w-full sm:w-auto"
                >
                    Create Salary
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
                                <dt className="text-sm font-medium text-muted-foreground truncate">
                                    Total Salaries
                                </dt>
                                <dd className="text-2xl font-bold text-foreground">
                                    {formatCurrency(totalSalaries)}
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
                                <dt className="text-sm font-medium text-muted-foreground truncate">
                                    Paid Salaries
                                </dt>
                                <dd className="text-2xl font-bold text-foreground">
                                    {formatCurrency(paidSalaries)}
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
                                <dt className="text-sm font-medium text-muted-foreground truncate">
                                    Pending Salaries
                                </dt>
                                <dd className="text-2xl font-bold text-foreground">
                                    {formatCurrency(pendingSalaries)}
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
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search salaries..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="input pl-10"
                            />
                        </div>
                    </div>
                    <div className="sm:w-48">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="input"
                        >
                            <option value="">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                        </select>
                    </div>
                </div>
            </Card>

            {/* Salaries Table */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-4">Employee</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4">Payment Date</th>
                                <th className="px-6 py-4">Period</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Notes</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredSalaries.map((salary) => (
                                <tr key={salary.id} className="hover:bg-muted/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-foreground">
                                        {salary.employee 
                                            ? `${salary.employee.first_name} ${salary.employee.last_name}`
                                            : 'Unknown Employee'}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-foreground">
                                        {formatCurrency(salary.amount)}
                                    </td>
                                    <td className="px-6 py-4 text-muted-foreground">
                                        {formatDate(salary.payment_date)}
                                    </td>
                                    <td className="px-6 py-4 text-muted-foreground">
                                        {formatDate(salary.period_start)} - {formatDate(salary.period_end)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(salary.status)}`}>
                                            {getStatusIcon(salary.status)}
                                            <span className="ml-1 capitalize">{salary.status}</span>
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-muted-foreground max-w-xs truncate">
                                        {salary.notes || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEdit(salary)}
                                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                                title="Edit"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(salary.id)}
                                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                title="Delete"
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

                {filteredSalaries.length === 0 && (
                    <div className="text-center py-12">
                        <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-2 text-sm font-medium text-foreground">No salaries found</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {searchTerm || statusFilter ? 'Try adjusting your search or filter criteria.' : 'Get started by adding your first salary record.'}
                        </p>
                        {!searchTerm && !statusFilter && (
                            <div className="mt-6">
                                <Button
                                    onClick={openModal}
                                    icon={Plus}
                                    className="mx-auto"
                                >
                                    Create Salary
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="bg-card px-4 py-3 flex items-center justify-between border-t border-border sm:px-6">
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
                                <p className="text-sm text-muted-foreground">
                                    Showing <span className="font-medium text-foreground">{(currentPage - 1) * 10 + 1}</span> to{' '}
                                    <span className="font-medium text-foreground">{Math.min(currentPage * 10, total)}</span> of{' '}
                                    <span className="font-medium text-foreground">{total}</span> results
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
                    <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-foreground">
                                {editingSalary ? 'Edit Salary' : 'Add New Salary'}
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
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Employee *
                                </label>
                                <select
                                    required
                                    value={formData.employee_id}
                                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                                    className="input"
                                >
                                    <option value="">Select an employee</option>
                                    {employees?.map((employee) => (
                                        <option key={employee.id} value={employee.id}>
                                            {employee.first_name} {employee.last_name} ({employee.employee_id})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Amount *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    className="input"
                                    placeholder="0.00"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Payment Date *
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={formData.payment_date}
                                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                                    className="input"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Period Start *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.period_start}
                                        onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                                        className="input"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Period End *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.period_end}
                                        onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                                        className="input"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Status *
                                </label>
                                <select
                                    required
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'pending' | 'paid' })}
                                    className="input"
                                >
                                    <option value="pending">Pending</option>
                                    <option value="paid">Paid</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Notes
                                </label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    rows={3}
                                    placeholder="Optional notes about this salary..."
                                />
                            </div>

                            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-border">
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
                                    {editingSalary ? 'Update' : 'Create'} Salary
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalaryPage;

