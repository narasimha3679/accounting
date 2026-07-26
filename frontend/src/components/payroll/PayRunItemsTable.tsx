import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { PayRunItem } from '../../lib/api';
import Button from '../ui/Button';
import { Eye, X } from 'lucide-react';

/** Save + calc on blur, or after 2s idle — whichever comes first */
const HOURS_COMMIT_IDLE_MS = 2_000;

interface PayRunItemsTableProps {
    items: PayRunItem[];
    isEditable: boolean;
    onHoursChange: (itemId: number, field: string, value: number) => void;
    onViewDetails: (item: PayRunItem) => void;
    onRemove: (itemId: number) => void;
}

interface EditableNumberCellProps {
    itemId: number;
    field: string;
    committedValue: number;
    onCommit: (itemId: number, field: string, value: number) => void;
    title?: string;
}

const EditableNumberCell: React.FC<EditableNumberCellProps> = ({
    itemId,
    field,
    committedValue,
    onCommit,
    title,
}) => {
    const [draft, setDraft] = useState(String(committedValue));
    const [focused, setFocused] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const draftRef = useRef(draft);
    const committedRef = useRef(committedValue);
    draftRef.current = draft;
    committedRef.current = committedValue;

    useEffect(() => {
        if (!focused) {
            setDraft(String(committedValue));
        }
    }, [committedValue, focused]);

    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const commit = useCallback(() => {
        clearTimer();
        const parsed = parseFloat(draftRef.current);
        const value = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
        setDraft(String(value));
        if (value !== committedRef.current) {
            onCommit(itemId, field, value);
        }
    }, [clearTimer, field, itemId, onCommit]);

    useEffect(() => () => clearTimer(), [clearTimer]);

    return (
        <input
            type="number"
            step="0.01"
            min="0"
            title={title}
            value={draft}
            onFocus={() => setFocused(true)}
            onChange={(e) => {
                const next = e.target.value;
                draftRef.current = next;
                setDraft(next);
                clearTimer();
                timerRef.current = setTimeout(() => {
                    timerRef.current = null;
                    commit();
                }, HOURS_COMMIT_IDLE_MS);
            }}
            onBlur={() => {
                setFocused(false);
                commit();
            }}
            className="w-20 text-right rounded-md border border-input bg-background px-2 py-1 text-sm"
        />
    );
};

const PayRunItemsTable: React.FC<PayRunItemsTableProps> = ({
    items,
    isEditable,
    onHoursChange,
    onViewDetails,
    onRemove,
}) => {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(amount);
    };

    const getEmployeeName = (item: PayRunItem) => {
        if (item.employee) {
            return `${item.employee.first_name} ${item.employee.last_name}`;
        }
        return `Employee #${item.employee_id}`;
    };

    const numberInput = (
        itemId: number,
        field: string,
        value: number,
        opts?: { title?: string }
    ) => (
        <EditableNumberCell
            itemId={itemId}
            field={field}
            committedValue={value}
            onCommit={onHoursChange}
            title={opts?.title}
        />
    );

    if (items.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">No employees added to this pay run</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-sm font-medium text-foreground">
                            Employee
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-foreground">
                            Regular
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-foreground">
                            OT
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-foreground">
                            Vacation hrs
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-foreground">
                            Stat hrs
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-foreground">
                            Other $
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-foreground">
                            Gross Pay
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-foreground">
                            CPP
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-foreground">
                            EI
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-foreground">
                            Tax
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-foreground">
                            Other Ded.
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-foreground">
                            Net Pay
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-foreground">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item) => (
                        <tr key={item.id} className="border-b border-border hover:bg-muted/30">
                            <td className="py-3 px-4 text-sm text-foreground">
                                {getEmployeeName(item)}
                            </td>
                            <td className="py-3 px-4">
                                {isEditable ? (
                                    numberInput(item.id, 'regular_hours', item.regular_hours)
                                ) : (
                                    <span className="text-sm text-foreground text-right block">
                                        {item.regular_hours.toFixed(2)}
                                    </span>
                                )}
                            </td>
                            <td className="py-3 px-4">
                                {isEditable ? (
                                    numberInput(item.id, 'overtime_hours', item.overtime_hours)
                                ) : (
                                    <span className="text-sm text-foreground text-right block">
                                        {item.overtime_hours.toFixed(2)}
                                    </span>
                                )}
                            </td>
                            <td className="py-3 px-4">
                                {isEditable ? (
                                    numberInput(
                                        item.id,
                                        'vacation_hours_used',
                                        item.vacation_hours_used
                                    )
                                ) : (
                                    <span className="text-sm text-foreground text-right block">
                                        {item.vacation_hours_used.toFixed(2)}
                                    </span>
                                )}
                            </td>
                            <td className="py-3 px-4">
                                {isEditable ? (
                                    numberInput(
                                        item.id,
                                        'statutory_holiday_hours',
                                        item.statutory_holiday_hours
                                    )
                                ) : (
                                    <span className="text-sm text-foreground text-right block">
                                        {item.statutory_holiday_hours.toFixed(2)}
                                    </span>
                                )}
                            </td>
                            <td className="py-3 px-4">
                                {isEditable ? (
                                    numberInput(item.id, 'other_earnings', item.other_earnings, {
                                        title: 'Bonus, commission, or other dollar earnings',
                                    })
                                ) : (
                                    <span className="text-sm text-foreground text-right block">
                                        {formatCurrency(item.other_earnings)}
                                    </span>
                                )}
                            </td>
                            <td className="py-3 px-4 text-sm text-foreground text-right">
                                {formatCurrency(item.gross_pay)}
                            </td>
                            <td className="py-3 px-4 text-sm text-foreground text-right">
                                {formatCurrency(item.cpp_employee + item.cpp2_employee)}
                            </td>
                            <td className="py-3 px-4 text-sm text-foreground text-right">
                                {formatCurrency(item.ei_employee)}
                            </td>
                            <td className="py-3 px-4 text-sm text-foreground text-right">
                                {formatCurrency(item.federal_tax + item.provincial_tax)}
                            </td>
                            <td className="py-3 px-4 text-sm text-foreground text-right">
                                {formatCurrency(
                                    item.pre_tax_deductions + item.post_tax_deductions
                                )}
                            </td>
                            <td className="py-3 px-4 text-sm font-semibold text-foreground text-right">
                                {formatCurrency(item.net_pay)}
                            </td>
                            <td className="py-3 px-4">
                                <div className="flex justify-end gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onViewDetails(item)}
                                        className="h-8 w-8"
                                        title="View Details"
                                    >
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                    {isEditable && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onRemove(item.id)}
                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                            title="Remove"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="border-t-2 border-border font-semibold">
                        <td className="py-3 px-4 text-sm text-foreground">Totals</td>
                        <td className="py-3 px-4 text-sm text-foreground text-right">
                            {items.reduce((sum, item) => sum + item.regular_hours, 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-sm text-foreground text-right">
                            {items.reduce((sum, item) => sum + item.overtime_hours, 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-sm text-foreground text-right">
                            {items
                                .reduce((sum, item) => sum + item.vacation_hours_used, 0)
                                .toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-sm text-foreground text-right">
                            {items
                                .reduce((sum, item) => sum + item.statutory_holiday_hours, 0)
                                .toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-sm text-foreground text-right">
                            {formatCurrency(
                                items.reduce((sum, item) => sum + item.other_earnings, 0)
                            )}
                        </td>
                        <td className="py-3 px-4 text-sm text-foreground text-right">
                            {formatCurrency(items.reduce((sum, item) => sum + item.gross_pay, 0))}
                        </td>
                        <td className="py-3 px-4 text-sm text-foreground text-right">
                            {formatCurrency(
                                items.reduce(
                                    (sum, item) => sum + item.cpp_employee + item.cpp2_employee,
                                    0
                                )
                            )}
                        </td>
                        <td className="py-3 px-4 text-sm text-foreground text-right">
                            {formatCurrency(
                                items.reduce((sum, item) => sum + item.ei_employee, 0)
                            )}
                        </td>
                        <td className="py-3 px-4 text-sm text-foreground text-right">
                            {formatCurrency(
                                items.reduce(
                                    (sum, item) => sum + item.federal_tax + item.provincial_tax,
                                    0
                                )
                            )}
                        </td>
                        <td className="py-3 px-4 text-sm text-foreground text-right">
                            {formatCurrency(
                                items.reduce(
                                    (sum, item) =>
                                        sum + item.pre_tax_deductions + item.post_tax_deductions,
                                    0
                                )
                            )}
                        </td>
                        <td className="py-3 px-4 text-sm text-foreground text-right">
                            {formatCurrency(items.reduce((sum, item) => sum + item.net_pay, 0))}
                        </td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
            {isEditable && (
                <p className="text-xs text-muted-foreground mt-3">
                    Hours save and recalculate when you leave the field, or after 2 seconds of no
                    typing. Sick hours are tracked on the item detail view but unpaid in this
                    version.
                </p>
            )}
        </div>
    );
};

export default PayRunItemsTable;
