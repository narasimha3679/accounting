import React from 'react';
import { FileText, Camera, Upload, X } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import { cn } from '../lib/utils';

export type EntryMethod = 'manual' | 'scan' | 'upload';

interface ExpenseEntrySelectorProps {
    onSelect: (method: EntryMethod) => void;
    onClose: () => void;
}

const ExpenseEntrySelector: React.FC<ExpenseEntrySelectorProps> = ({ onSelect, onClose }) => {
    const methods = [
        {
            id: 'manual' as EntryMethod,
            title: 'Manual Entry',
            description: 'Enter expense details manually using a form',
            icon: FileText,
            useCase: 'Best for: Single expenses, detailed entry, or when you don\'t have a receipt',
            color: 'emerald',
        },
        {
            id: 'scan' as EntryMethod,
            title: 'Scan Receipt',
            description: 'Take a photo or upload a receipt image to auto-fill details',
            icon: Camera,
            useCase: 'Best for: Physical receipts, invoices, or bills with clear text',
            color: 'golden',
        },
        {
            id: 'upload' as EntryMethod,
            title: 'Upload Bank Statement',
            description: 'Upload a bank statement (CSV, PDF, OFX) to import multiple transactions',
            icon: Upload,
            useCase: 'Best for: Bulk imports, monthly statements, or multiple expenses at once',
            color: 'default',
        },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg border border-white/10 bg-card p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-2xl font-bold tracking-tight text-white">Add Expense</h3>
                        <p className="text-sm text-muted-foreground mt-1">Choose how you'd like to add your expense</p>
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {methods.map((method) => {
                        const Icon = method.icon;
                        return (
                            <button
                                key={method.id}
                                onClick={() => onSelect(method.id)}
                                className={cn(
                                    "group relative text-left transition-all duration-200",
                                    "hover:scale-105 focus:outline-none focus:ring-2 focus:ring-neon-emerald focus:ring-offset-2 focus:ring-offset-deep-forest rounded-2xl"
                                )}
                            >
                                <Card
                                    glass={method.color as 'default' | 'emerald' | 'golden'}
                                    padding="lg"
                                    className={cn(
                                        "h-full flex flex-col",
                                        "hover:border-white/20 cursor-pointer"
                                    )}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={cn(
                                            "p-3 rounded-lg",
                                            method.color === 'emerald' && "bg-neon-emerald/20",
                                            method.color === 'golden' && "bg-golden-hour/20",
                                            method.color === 'default' && "bg-white/10"
                                        )}>
                                            <Icon className={cn(
                                                "h-6 w-6",
                                                method.color === 'emerald' && "text-neon-emerald",
                                                method.color === 'golden' && "text-golden-hour",
                                                method.color === 'default' && "text-white"
                                            )} />
                                        </div>
                                    </div>

                                    <h4 className="text-xl font-semibold text-white mb-2 group-hover:text-neon-emerald transition-colors">
                                        {method.title}
                                    </h4>

                                    <p className="text-sm text-muted-foreground mb-4 flex-1">
                                        {method.description}
                                    </p>

                                    <div className="pt-4 border-t border-white/10">
                                        <p className="text-xs text-muted-foreground">
                                            {method.useCase}
                                        </p>
                                    </div>
                                </Card>
                            </button>
                        );
                    })}
                </div>

                <div className="mt-6 flex justify-end">
                    <Button
                        variant="outline"
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ExpenseEntrySelector;
