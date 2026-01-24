import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { type Employee } from '../../lib/api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Edit, Save, X, User, Mail, Phone, Briefcase, Calendar, DollarSign, MapPin } from 'lucide-react';
import { formatLocalDate } from '../../lib/utils';

interface EmployeePersonalInfoProps {
    employeeId: number;
}

export default function EmployeePersonalInfo({ employeeId }: EmployeePersonalInfoProps) {
    const [isEditingAddress, setIsEditingAddress] = useState(false);
    const [address, setAddress] = useState('');
    const queryClient = useQueryClient();

    const { data: employee, isLoading } = useQuery({
        queryKey: ['myInfo', employeeId],
        queryFn: () => api.getMyInfo(),
        enabled: !!employeeId,
    });

    React.useEffect(() => {
        if (employee?.address) {
            setAddress(employee.address);
        }
    }, [employee]);

    const updateMutation = useMutation({
        mutationFn: (newAddress: string) => api.updateMyAddress(newAddress),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['myInfo', employeeId] });
            setIsEditingAddress(false);
        },
    });

    const handleSaveAddress = () => {
        updateMutation.mutate(address);
    };

    const handleCancelAddress = () => {
        setAddress(employee?.address || '');
        setIsEditingAddress(false);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(amount);
    };

    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return 'N/A';
        return formatLocalDate(dateString, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const getPayRateDisplay = (employee: Employee) => {
        if (!employee.payrate) return 'N/A';
        const rate = formatCurrency(employee.payrate);
        const type = employee.payrate_type || 'hourly';
        const typeLabels: Record<string, string> = {
            hourly: '/ hour',
            salary: '/ year',
            monthly: '/ month',
            biweekly: '/ biweekly',
        };
        return `${rate} ${typeLabels[type] || ''}`;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-emerald"></div>
            </div>
        );
    }

    if (!employee) {
        return (
            <Card>
                <div className="text-center py-12">
                    <p className="text-muted-foreground">Employee information not found</p>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">My Information</h2>
            </div>

            {/* Personal Information */}
            <Card>
                <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
                    <User className="h-5 w-5" />
                    PERSONAL
                </h3>
                <div className="space-y-3">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Name</span>
                        <span className="font-medium text-foreground">
                            {employee.first_name} {employee.last_name}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Employee ID</span>
                        <span className="font-medium text-foreground">{employee.employee_id}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            Email
                        </span>
                        <span className="font-medium text-foreground">{employee.email}</span>
                    </div>
                    {employee.phone && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground flex items-center gap-1">
                                <Phone className="h-4 w-4" />
                                Phone
                            </span>
                            <span className="font-medium text-foreground">{employee.phone}</span>
                        </div>
                    )}
                </div>
            </Card>

            {/* Mailing Address */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        MAILING ADDRESS
                    </h3>
                    {!isEditingAddress && (
                        <Button
                            variant="outline"
                            size="sm"
                            icon={Edit}
                            onClick={() => setIsEditingAddress(true)}
                        >
                            Edit
                        </Button>
                    )}
                </div>
                {!isEditingAddress ? (
                    <div>
                        {employee.address ? (
                            <p className="text-foreground whitespace-pre-line">{employee.address}</p>
                        ) : (
                            <p className="text-muted-foreground">No address on file</p>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <textarea
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Enter your mailing address"
                            rows={4}
                            className="w-full glass border border-white/10 rounded-lg px-3 py-2 text-white bg-transparent focus:outline-none focus:ring-2 focus:ring-neon-emerald resize-none"
                        />
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                icon={X}
                                onClick={handleCancelAddress}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="default"
                                size="sm"
                                icon={Save}
                                onClick={handleSaveAddress}
                                disabled={updateMutation.isPending}
                            >
                                {updateMutation.isPending ? 'Saving...' : 'Save'}
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Employment Information */}
            <Card>
                <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    EMPLOYMENT
                </h3>
                <div className="space-y-3">
                    {employee.position && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Position</span>
                            <span className="font-medium text-foreground">{employee.position}</span>
                        </div>
                    )}
                    {employee.hire_date && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                Hire Date
                            </span>
                            <span className="font-medium text-foreground">{formatDate(employee.hire_date)}</span>
                        </div>
                    )}
                    {employee.payrate && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground flex items-center gap-1">
                                <DollarSign className="h-4 w-4" />
                                Pay Rate
                            </span>
                            <span className="font-medium text-foreground">{getPayRateDisplay(employee)}</span>
                        </div>
                    )}
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <span className="font-medium text-foreground capitalize">{employee.status}</span>
                    </div>
                </div>
            </Card>
        </div>
    );
}
