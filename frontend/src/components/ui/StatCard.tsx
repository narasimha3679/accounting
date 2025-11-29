import React from 'react';
import type { LucideIcon } from 'lucide-react';
import Card from './Card';
import { cn } from '../../lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  gradient?: string; // Legacy prop, used for icon color mapping
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  gradient = 'blue',
  className = '',
}) => {
  // Map legacy gradients to semantic colors for icons
  const colorMap: Record<string, string> = {
    green: "text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400",
    blue: "text-blue-600 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400",
    purple: "text-purple-600 bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400",
    orange: "text-orange-600 bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400",
    emerald: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400",
    indigo: "text-indigo-600 bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400",
    red: "text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400",
    cyan: "text-cyan-600 bg-cyan-100 dark:bg-cyan-900/20 dark:text-cyan-400",
    amber: "text-amber-600 bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400",
    none: "text-primary bg-primary/10",
  };

  const iconColorClass = colorMap[gradient] || colorMap.blue;

  return (
    <Card className={cn("flex flex-col justify-between", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <div className={cn("p-2 rounded-full", iconColorClass)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
    </Card>
  );
};

export default StatCard;
