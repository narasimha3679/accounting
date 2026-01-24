import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api, { type Employee } from '../lib/api';
import { Plus, Edit, Trash2, X, Users, UserCheck, UserX, Search, Key } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmployeeBenefitsAssignment from '../components/employees/EmployeeBenefitsAssignment';
import { formatLocalDate } from '../lib/utils';

const Employees: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    // Fetch employees
    const { data: employees, isLoading } = useQuery({
        queryKey: ['employees', user?.company_id, statusFilter],
        queryFn: async () => {
            const result = await api.getEmployees({
                company_id: user?.company_id,
                status: statusFilter || undefined,
                limit: 1000
            });
            return result.data;
        },
        enabled: !!user?.company_id,
    });

    // Delete employee mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            return api.deleteEmployee(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
        },
    });

    // Reset password mutation
    const resetPasswordMutation = useMutation({
        mutationFn: async (id: number) => {
            return api.resetEmployeePassword(id);
        },
        onSuccess: (password) => {
            setGeneratedPassword(password);
            setShowPasswordModal(true);
        },
    });

    const handleDelete = (employee: Employee) => {
        if (confirm(`Are you sure you want to delete employee "${employee.first_name} ${employee.last_name}"?`)) {
            deleteMutation.mutate(employee.id);
        }
    };

    const handleResetPassword = (employee: Employee) => {
        if (confirm(`Reset password for "${employee.first_name} ${employee.last_name}"?`)) {
            resetPasswordMutation.mutate(employee.id);
        }
    };

    const filteredEmployees = employees?.filter((employee) => {
        const matchesSearch = !searchTerm || 
            `${employee.first_name} ${employee.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            employee.employee_id.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    }) || [];

    const totalEmployees = employees?.length || 0;
    const activeEmployees = employees?.filter(e => e.status === 'active').length || 0;
    const inactiveEmployees = employees?.filter(e => e.status !== 'active').length || 0;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            case 'inactive':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
            case 'terminated':
                return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
            default:
                return 'bg-muted text-slate-muted';
        }
    };

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
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Employees</h1>
                    <p className="text-muted-foreground mt-2">Manage your company employees</p>
                </div>
                <Button
                    onClick={() => setShowCreateModal(true)}
                    icon={Plus}
                    className="w-full sm:w-auto"
                >
                    Add Employee
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <Card className="p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 p-3 rounded-full bg-blue-100 dark:bg-blue-900/20">
                            <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-muted-foreground truncate">
                                    Total Employees
                                </dt>
                                <dd className="text-2xl font-bold text-foreground">
                                    {totalEmployees}
                                </dd>
                            </dl>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 p-3 rounded-full bg-green-100 dark:bg-green-900/20">
                            <UserCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-muted-foreground truncate">
                                    Active Employees
                                </dt>
                                <dd className="text-2xl font-bold text-foreground">
                                    {activeEmployees}
                                </dd>
                            </dl>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/20">
                            <UserX className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-muted-foreground truncate">
                                    Inactive Employees
                                </dt>
                                <dd className="text-2xl font-bold text-foreground">
                                    {inactiveEmployees}
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
                                placeholder="Search employees..."
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
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="terminated">Terminated</option>
                        </select>
                    </div>
                </div>
            </Card>

            {/* Employees Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredEmployees.map((employee) => (
                    <Card key={employee.id} className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-medium text-foreground">
                                    {employee.first_name} {employee.last_name}
                                </h3>
                                <p className="text-sm text-muted-foreground">{employee.employee_id}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setEditingEmployee(employee)}
                                    className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                    title="Edit"
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleResetPassword(employee)}
                                    className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/20"
                                    title="Reset Password"
                                >
                                    <Key className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(employee)}
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    title="Delete"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2 text-sm text-muted-foreground">
                            <p>
                                <span className="font-medium text-foreground">Email:</span> {employee.email}
                            </p>
                            {employee.phone && (
                                <p>
                                    <span className="font-medium text-foreground">Phone:</span> {employee.phone}
                                </p>
                            )}
                            {employee.position && (
                                <p>
                                    <span className="font-medium text-foreground">Position:</span> {employee.position}
                                </p>
                            )}
                            {employee.hire_date && (
                                <p>
                                    <span className="font-medium text-foreground">Hire Date:</span>{' '}
                                    {formatLocalDate(employee.hire_date)}
                                </p>
                            )}
                            <p>
                                <span className="font-medium text-foreground">Status:</span>{' '}
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(employee.status)}`}>
                                    {employee.status}
                                </span>
                            </p>
                        </div>
                    </Card>
                ))}
            </div>

            {filteredEmployees.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-muted-foreground text-lg">No employees found</p>
                    <p className="text-muted-foreground/60">Add your first employee to get started</p>
                </div>
            )}

            {/* Create/Edit Employee Modal */}
            {(showCreateModal || editingEmployee) && (
                <EmployeeModal
                    employee={editingEmployee}
                    onClose={() => {
                        setShowCreateModal(false);
                        setEditingEmployee(null);
                        setGeneratedPassword(null);
                    }}
                    onSave={(password) => {
                        queryClient.invalidateQueries({ queryKey: ['employees'] });
                        setShowCreateModal(false);
                        setEditingEmployee(null);
                        if (password) {
                            setGeneratedPassword(password);
                            setShowPasswordModal(true);
                        }
                    }}
                />
            )}

            {/* Password Display Modal */}
            {showPasswordModal && generatedPassword && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                    <div className="relative w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-foreground">Employee Password</h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    setShowPasswordModal(false);
                                    setGeneratedPassword(null);
                                }}
                                className="h-8 w-8 rounded-full"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                This password was generated for the employee. Please share it securely. You will not be able to retrieve it again.
                            </p>
                            <div className="p-4 bg-muted rounded-md">
                                <p className="text-sm font-medium text-foreground mb-2">Password:</p>
                                <p className="text-lg font-mono text-foreground break-all">{generatedPassword}</p>
                            </div>
                            <Button
                                onClick={() => {
                                    navigator.clipboard.writeText(generatedPassword);
                                }}
                                className="w-full"
                            >
                                Copy Password
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Employee Modal Component
interface EmployeeModalProps {
    employee?: Employee | null;
    onClose: () => void;
    onSave: (password?: string) => void;
}

function EmployeeModal({ employee, onClose, onSave }: EmployeeModalProps) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        first_name: employee?.first_name || '',
        last_name: employee?.last_name || '',
        email: employee?.email || '',
        phone: employee?.phone || '',
        position: employee?.position || '',
        hire_date: employee?.hire_date ? employee.hire_date.split('T')[0] : '',
        status: (employee?.status || 'active') as 'active' | 'inactive' | 'terminated',
        address: employee?.address || '',
        sin: employee?.sin || '',
        payrate: employee?.payrate?.toString() || '',
        payrate_type: (employee?.payrate_type || '') as 'hourly' | 'salary' | 'monthly' | 'biweekly' | '',
        initialPassword: '',
    });

    const createEmployeeMutation = useMutation({
        mutationFn: async (data: any) => {
            return api.createEmployee(data);
        },
        onSuccess: () => {
            onSave();
        },
    });

    const updateEmployeeMutation = useMutation({
        mutationFn: async (data: any) => {
            return api.updateEmployee(employee!.id, data);
        },
        onSuccess: () => {
            onSave();
        },
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user?.company_id) return;

        const employeeData: any = {
            ...formData,
            company_id: user.company_id,
        };

        // Convert payrate to number if provided
        if (employeeData.payrate) {
            employeeData.payrate = parseFloat(employeeData.payrate);
        } else {
            employeeData.payrate = null;
        }

        // Remove empty strings and convert to null for optional fields
        if (!employeeData.sin) employeeData.sin = null;
        if (!employeeData.payrate_type) employeeData.payrate_type = null;

        if (employee) {
            const { initialPassword, ...updateData } = employeeData;
            const statusChanged = employee.status !== updateData.status;
            const newStatusIsTerminatedOrInactive =
                (updateData.status === 'terminated' || updateData.status === 'inactive') &&
                employee.status !== 'terminated' &&
                employee.status !== 'inactive';

            // Update employee status first
            updateEmployeeMutation.mutate(updateData, {
                onSuccess: () => {
                    // If status changed to terminated or inactive, prompt for ROE
                    if (statusChanged && newStatusIsTerminatedOrInactive) {
                        const generateROE = window.confirm(
                            `Generate ROE for ${employee.first_name} ${employee.last_name}?`
                        );
                        if (generateROE) {
                            onSave();
                            navigate(`/payroll/roe/new?employee=${employee.id}`);
                        } else {
                            onSave();
                        }
                    } else {
                        onSave();
                    }
                },
            });
        } else {
            if (!formData.initialPassword) {
                alert('Please provide an initial password for the employee');
                return;
            }
            createEmployeeMutation.mutate(employeeData);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-foreground">
                        {employee ? 'Edit Employee' : 'Add New Employee'}
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
                        {employee && (
                            <div>
                                <label htmlFor="employee_id" className="block text-sm font-medium text-foreground mb-2">
                                    Employee ID
                                </label>
                                <input
                                    id="employee_id"
                                    type="text"
                                    value={employee.employee_id}
                                    className="input bg-muted"
                                    disabled
                                    readOnly
                                />
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Employee ID is auto-generated and cannot be changed
                                </p>
                            </div>
                        )}

                        <div>
                            <label htmlFor="status" className="block text-sm font-medium text-foreground mb-2">
                                Status *
                            </label>
                            <select
                                id="status"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                className="input"
                                required
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="terminated">Terminated</option>
                            </select>
                        </div>

                        <div>
                            <label htmlFor="first_name" className="block text-sm font-medium text-foreground mb-2">
                                First Name *
                            </label>
                            <input
                                id="first_name"
                                type="text"
                                value={formData.first_name}
                                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                className="input"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="last_name" className="block text-sm font-medium text-foreground mb-2">
                                Last Name *
                            </label>
                            <input
                                id="last_name"
                                type="text"
                                value={formData.last_name}
                                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                className="input"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                                Email *
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="input"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">
                                Phone
                            </label>
                            <input
                                id="phone"
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="input"
                            />
                        </div>

                        <div>
                            <label htmlFor="position" className="block text-sm font-medium text-foreground mb-2">
                                Position
                            </label>
                            <input
                                id="position"
                                type="text"
                                value={formData.position}
                                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                                className="input"
                            />
                        </div>

                        <div>
                            <label htmlFor="hire_date" className="block text-sm font-medium text-foreground mb-2">
                                Hire Date
                            </label>
                            <input
                                id="hire_date"
                                type="date"
                                value={formData.hire_date}
                                onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                                className="input"
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <label htmlFor="address" className="block text-sm font-medium text-foreground mb-2">
                                Address
                            </label>
                            <textarea
                                id="address"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                className="input min-h-[80px]"
                                rows={3}
                            />
                        </div>

                        <div>
                            <label htmlFor="sin" className="block text-sm font-medium text-foreground mb-2">
                                SIN (Social Insurance Number)
                            </label>
                            <input
                                id="sin"
                                type="text"
                                value={formData.sin}
                                onChange={(e) => setFormData({ ...formData, sin: e.target.value })}
                                className="input"
                                placeholder="123-456-789"
                            />
                        </div>

                        <div>
                            <label htmlFor="payrate_type" className="block text-sm font-medium text-foreground mb-2">
                                Pay Rate Type
                            </label>
                            <select
                                id="payrate_type"
                                value={formData.payrate_type}
                                onChange={(e) => setFormData({ ...formData, payrate_type: e.target.value as any })}
                                className="input"
                            >
                                <option value="">Select type...</option>
                                <option value="hourly">Hourly</option>
                                <option value="salary">Salary (Annual)</option>
                                <option value="monthly">Monthly</option>
                                <option value="biweekly">Biweekly</option>
                            </select>
                        </div>

                        <div>
                            <label htmlFor="payrate" className="block text-sm font-medium text-foreground mb-2">
                                Pay Rate
                            </label>
                            <input
                                id="payrate"
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.payrate}
                                onChange={(e) => setFormData({ ...formData, payrate: e.target.value })}
                                className="input"
                                placeholder="0.00"
                            />
                            {formData.payrate_type && (
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {formData.payrate_type === 'hourly' && 'Per hour'}
                                    {formData.payrate_type === 'salary' && 'Annual salary'}
                                    {formData.payrate_type === 'monthly' && 'Per month'}
                                    {formData.payrate_type === 'biweekly' && 'Per biweekly period'}
                                </p>
                            )}
                        </div>

                        {!employee && (
                            <div className="sm:col-span-2">
                                <label htmlFor="initialPassword" className="block text-sm font-medium text-foreground mb-2">
                                    Initial Password *
                                </label>
                                <input
                                    id="initialPassword"
                                    type="password"
                                    value={formData.initialPassword}
                                    onChange={(e) => setFormData({ ...formData, initialPassword: e.target.value })}
                                    className="input"
                                    required
                                    placeholder="Set initial password for employee login"
                                />
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Employee will use this password to log in. They can change it after first login.
                                </p>
                            </div>
                        )}
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
                            disabled={createEmployeeMutation.isPending || updateEmployeeMutation.isPending}
                        >
                            {createEmployeeMutation.isPending || updateEmployeeMutation.isPending
                                ? 'Saving...'
                                : employee
                                    ? 'Update Employee'
                                    : 'Create Employee'
                            }
                        </Button>
                    </div>
                </form>

                {/* Benefits Section - Only show for existing employees */}
                {employee && user?.company_id && (
                    <div className="mt-6 pt-6 border-t border-border">
                        <EmployeeBenefitsAssignment
                            employeeId={employee.id}
                            companyId={user.company_id}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

export default Employees;
