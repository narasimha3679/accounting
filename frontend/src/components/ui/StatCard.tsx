import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  gradient: 'green' | 'blue' | 'purple' | 'orange' | 'emerald' | 'indigo' | 'red' | 'cyan' | 'amber';
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  gradient,
  className = '',
}) => {
  const gradientClasses = {
    green: {
      card: 'bg-gradient-to-br from-green-50 to-emerald-100 border-green-200',
      icon: 'bg-green-200 text-green-700',
      title: 'text-green-600',
      value: 'text-green-800',
      subtitle: 'text-green-600',
    },
    blue: {
      card: 'bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200',
      icon: 'bg-blue-200 text-blue-700',
      title: 'text-blue-600',
      value: 'text-blue-800',
      subtitle: 'text-blue-600',
    },
    purple: {
      card: 'bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200',
      icon: 'bg-purple-200 text-purple-700',
      title: 'text-purple-600',
      value: 'text-purple-800',
      subtitle: 'text-purple-600',
    },
    orange: {
      card: 'bg-gradient-to-br from-orange-50 to-amber-100 border-orange-200',
      icon: 'bg-orange-200 text-orange-700',
      title: 'text-orange-600',
      value: 'text-orange-800',
      subtitle: 'text-orange-600',
    },
    emerald: {
      card: 'bg-gradient-to-br from-emerald-50 to-green-100 border-emerald-200',
      icon: 'bg-emerald-200 text-emerald-700',
      title: 'text-emerald-600',
      value: 'text-emerald-800',
      subtitle: 'text-emerald-600',
    },
    indigo: {
      card: 'bg-gradient-to-br from-indigo-50 to-blue-100 border-indigo-200',
      icon: 'bg-indigo-200 text-indigo-700',
      title: 'text-indigo-600',
      value: 'text-indigo-800',
      subtitle: 'text-indigo-600',
    },
    red: {
      card: 'bg-gradient-to-br from-red-50 to-rose-100 border-red-200',
      icon: 'bg-red-200 text-red-700',
      title: 'text-red-600',
      value: 'text-red-800',
      subtitle: 'text-red-600',
    },
    cyan: {
      card: 'bg-gradient-to-br from-cyan-50 to-teal-100 border-cyan-200',
      icon: 'bg-cyan-200 text-cyan-700',
      title: 'text-cyan-600',
      value: 'text-cyan-800',
      subtitle: 'text-cyan-600',
    },
    amber: {
      card: 'bg-gradient-to-br from-amber-50 to-yellow-100 border-amber-200',
      icon: 'bg-amber-200 text-amber-700',
      title: 'text-amber-600',
      value: 'text-amber-800',
      subtitle: 'text-amber-600',
    },
  };

  const colors = gradientClasses[gradient];

  return (
    <div
      className={`rounded-2xl border ${colors.card} p-6 shadow-card transition-shadow duration-200 hover:shadow-card-hover ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className={`text-sm font-medium ${colors.title} mb-1`}>{title}</p>
          <p className={`text-2xl font-bold ${colors.value}`}>{value}</p>
          {subtitle && (
            <p className={`text-xs ${colors.subtitle} mt-1`}>{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-full ${colors.icon}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
};

export default StatCard;

