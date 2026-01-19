import React from 'react';
import { cn } from '../../lib/utils';
import type { PayRun } from '../../lib/api';

interface PayRunStatusBadgeProps {
    status: PayRun['status'];
    className?: string;
}

const PayRunStatusBadge: React.FC<PayRunStatusBadgeProps> = ({ status, className }) => {
    const statusConfig = {
        draft: {
            label: 'Draft',
            className: 'bg-slate-600 text-white',
        },
        pending_approval: {
            label: 'Pending Approval',
            className: 'bg-yellow-600 text-white',
        },
        approved: {
            label: 'Approved',
            className: 'bg-blue-600 text-white',
        },
        finalized: {
            label: 'Finalized',
            className: 'bg-green-600 text-white',
        },
        void: {
            label: 'Void',
            className: 'bg-red-600 text-white',
        },
    };

    const config = statusConfig[status];

    return (
        <span
            className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                config.className,
                className
            )}
        >
            {config.label}
        </span>
    );
};

export default PayRunStatusBadge;
