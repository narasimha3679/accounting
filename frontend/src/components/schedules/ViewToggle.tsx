import React from 'react';
import { Calendar, CalendarDays } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export type CalendarView = 'month' | 'week';

interface ViewToggleProps {
    view: CalendarView;
    onChange: (view: CalendarView) => void;
    className?: string;
}

const ViewToggle: React.FC<ViewToggleProps> = ({ view, onChange, className }) => {
    const views: { value: CalendarView; label: string; icon: typeof Calendar }[] = [
        { value: 'month', label: 'Month', icon: Calendar },
        { value: 'week', label: 'Week', icon: CalendarDays },
    ];

    return (
        <div className={cn('flex items-center gap-2 glass rounded-lg p-1', className)}>
            {views.map((v) => {
                const Icon = v.icon;
                const isActive = view === v.value;
                
                return (
                    <motion.button
                        key={v.value}
                        onClick={() => onChange(v.value)}
                        className={cn(
                            'relative flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200',
                            isActive
                                ? 'text-neon-emerald'
                                : 'text-muted-foreground hover:text-foreground'
                        )}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <Icon className="h-4 w-4" />
                        <span className="hidden sm:inline">{v.label}</span>
                        {isActive && (
                            <motion.div
                                className="absolute inset-0 bg-neon-emerald/10 border border-neon-emerald/30 rounded-md"
                                layoutId="activeView"
                                initial={false}
                                transition={{
                                    type: 'spring',
                                    stiffness: 500,
                                    damping: 30,
                                }}
                            />
                        )}
                    </motion.button>
                );
            })}
        </div>
    );
};

export default ViewToggle;
