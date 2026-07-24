import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import api, { type Employee } from '../../lib/api';
import Button from '../ui/Button';

interface SelectEmployeeForROEModalProps {
    companyId: number;
    onSelect: (employeeId: number) => void;
    onClose: () => void;
}

function statusRank(status: Employee['status']): number {
    switch (status) {
        case 'terminated':
            return 0;
        case 'inactive':
            return 1;
        case 'active':
            return 2;
        default: {
            const _exhaustive: never = status;
            void _exhaustive;
            return 3;
        }
    }
}

const SelectEmployeeForROEModal: React.FC<SelectEmployeeForROEModalProps> = ({
    companyId,
    onSelect,
    onClose,
}) => {
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [search, setSearch] = useState('');

    const { data: employees = [], isLoading } = useQuery({
        queryKey: ['employees', companyId, 'roe-picker'],
        queryFn: async () => {
            const result = await api.getEmployees({
                company_id: companyId,
                limit: 1000,
            });
            return result.data;
        },
        enabled: !!companyId,
    });

    const sortedEmployees = useMemo(() => {
        const q = search.trim().toLowerCase();
        return [...employees]
            .filter((emp) => {
                if (!q) return true;
                const name = `${emp.first_name} ${emp.last_name}`.toLowerCase();
                return (
                    name.includes(q) ||
                    emp.employee_id.toLowerCase().includes(q) ||
                    emp.email.toLowerCase().includes(q)
                );
            })
            .sort((a, b) => {
                const rankDiff = statusRank(a.status) - statusRank(b.status);
                if (rankDiff !== 0) return rankDiff;
                return `${a.last_name} ${a.first_name}`.localeCompare(
                    `${b.last_name} ${b.first_name}`
                );
            });
    }, [employees, search]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-lg max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold tracking-tight text-foreground">
                        Select Employee for ROE
                    </h2>
                    <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <p className="text-sm text-muted-foreground mb-3">
                    Terminated and inactive employees are listed first.
                </p>

                <input
                    type="search"
                    className="input w-full mb-3"
                    placeholder="Search by name, ID, or email"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <div className="flex-1 overflow-y-auto border border-border rounded-md mb-4 min-h-[200px]">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-emerald" />
                        </div>
                    ) : sortedEmployees.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-12">
                            No employees found
                        </p>
                    ) : (
                        <ul className="divide-y divide-border">
                            {sortedEmployees.map((emp) => (
                                <li key={emp.id}>
                                    <button
                                        type="button"
                                        className={`w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors ${
                                            selectedId === emp.id ? 'bg-primary/10' : ''
                                        }`}
                                        onClick={() => setSelectedId(emp.id)}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-medium text-foreground">
                                                    {emp.first_name} {emp.last_name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {emp.employee_id} · {emp.email}
                                                </p>
                                            </div>
                                            <span className="text-xs capitalize text-muted-foreground shrink-0">
                                                {emp.status}
                                            </span>
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        disabled={!selectedId}
                        onClick={() => selectedId && onSelect(selectedId)}
                    >
                        Continue
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default SelectEmployeeForROEModal;
