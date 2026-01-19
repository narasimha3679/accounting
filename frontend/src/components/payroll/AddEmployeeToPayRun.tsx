import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import Button from '../ui/Button';
import { X, Check } from 'lucide-react';
import { pullHoursFromTimeEntries } from '../../lib/payrollHelpers';

interface AddEmployeeToPayRunProps {
    companyId: number;
    payRunId: number;
    existingEmployeeIds: number[];
    periodStart: string;
    periodEnd: string;
    onAdd: (employeeId: number, hours?: { regular: number; overtime: number }) => Promise<void>;
    onClose: () => void;
}

const AddEmployeeToPayRun: React.FC<AddEmployeeToPayRunProps> = ({
    companyId,
    existingEmployeeIds,
    periodStart,
    periodEnd,
    onAdd,
    onClose,
}) => {
    const [selectedEmployees, setSelectedEmployees] = useState<Set<number>>(new Set());
    const [loadingEmployees, setLoadingEmployees] = useState<Set<number>>(new Set());
    const [useTimeEntries, setUseTimeEntries] = useState(true);

    // Fetch active employees
    const { data: employeesData, isLoading } = useQuery({
        queryKey: ['employees', companyId, 'active'],
        queryFn: async () => {
            const result = await api.getEmployees({
                company_id: companyId,
                status: 'active',
                limit: 1000,
            });
            return result.data;
        },
        enabled: !!companyId,
    });

    const availableEmployees = employeesData?.filter((emp) => !existingEmployeeIds.includes(emp.id)) || [];

    const toggleEmployee = (employeeId: number) => {
        const newSet = new Set(selectedEmployees);
        if (newSet.has(employeeId)) {
            newSet.delete(employeeId);
        } else {
            newSet.add(employeeId);
        }
        setSelectedEmployees(newSet);
    };

    const handleAdd = async () => {
        if (selectedEmployees.size === 0) return;

        for (const employeeId of selectedEmployees) {
            setLoadingEmployees((prev) => new Set(prev).add(employeeId));
            try {
                if (useTimeEntries) {
                    try {
                        const hours = await pullHoursFromTimeEntries(employeeId, periodStart, periodEnd);
                        await onAdd(employeeId, { regular: hours.regularHours, overtime: hours.overtimeHours });
                    } catch (error) {
                        // If time entries fail, add with default hours
                        console.warn(`Failed to pull hours for employee ${employeeId}:`, error);
                        await onAdd(employeeId);
                    }
                } else {
                    await onAdd(employeeId);
                }
            } catch (error) {
                console.error(`Failed to add employee ${employeeId}:`, error);
            } finally {
                setLoadingEmployees((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(employeeId);
                    return newSet;
                });
            }
        }

        onClose();
    };

    if (isLoading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                <div className="relative w-full max-w-2xl rounded-lg border border-border bg-card p-6 shadow-lg">
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-emerald"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-foreground">Add Employees to Pay Run</h3>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {availableEmployees.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">All active employees are already in this pay run</p>
                    </div>
                ) : (
                    <>
                        <div className="mb-4 p-4 bg-muted/30 rounded-lg">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={useTimeEntries}
                                    onChange={(e) => setUseTimeEntries(e.target.checked)}
                                    className="rounded"
                                />
                                <span className="text-sm text-foreground">
                                    Pull hours from approved time entries
                                </span>
                            </label>
                            <p className="text-xs text-muted-foreground mt-1 ml-6">
                                If enabled, hours will be automatically pulled from approved time entries for the pay
                                period. Otherwise, employees will be added with zero hours.
                            </p>
                        </div>

                        <div className="mb-4 max-h-96 overflow-y-auto border border-border rounded-lg">
                            <table className="w-full">
                                <thead className="sticky top-0 bg-card border-b border-border">
                                    <tr>
                                        <th className="text-left py-2 px-4 text-sm font-medium text-foreground w-12"></th>
                                        <th className="text-left py-2 px-4 text-sm font-medium text-foreground">
                                            Employee
                                        </th>
                                        <th className="text-left py-2 px-4 text-sm font-medium text-foreground">
                                            Email
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {availableEmployees.map((employee) => (
                                        <tr
                                            key={employee.id}
                                            className="border-b border-border hover:bg-muted/30 cursor-pointer"
                                            onClick={() => toggleEmployee(employee.id)}
                                        >
                                            <td className="py-2 px-4">
                                                {selectedEmployees.has(employee.id) ? (
                                                    <div className="w-5 h-5 rounded border-2 border-primary bg-primary flex items-center justify-center">
                                                        <Check className="h-3 w-3 text-white" />
                                                    </div>
                                                ) : (
                                                    <div className="w-5 h-5 rounded border-2 border-border"></div>
                                                )}
                                            </td>
                                            <td className="py-2 px-4 text-sm text-foreground">
                                                {employee.first_name} {employee.last_name}
                                            </td>
                                            <td className="py-2 px-4 text-sm text-muted-foreground">{employee.email}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-border">
                            <Button variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleAdd}
                                disabled={selectedEmployees.size === 0 || loadingEmployees.size > 0}
                            >
                                {loadingEmployees.size > 0
                                    ? `Adding ${loadingEmployees.size}...`
                                    : `Add ${selectedEmployees.size} Employee${selectedEmployees.size !== 1 ? 's' : ''}`}
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default AddEmployeeToPayRun;
