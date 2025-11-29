import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  gradient?: 'green' | 'blue' | 'purple' | 'orange' | 'emerald' | 'indigo' | 'red' | 'cyan' | 'amber' | 'none';
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  gradient = 'none',
  hover = true,
  padding = 'md',
}) => {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const gradientClasses = {
    green: 'bg-gradient-to-br from-green-50 to-emerald-100 border-green-200',
    blue: 'bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200',
    purple: 'bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200',
    orange: 'bg-gradient-to-br from-orange-50 to-amber-100 border-orange-200',
    emerald: 'bg-gradient-to-br from-emerald-50 to-green-100 border-emerald-200',
    indigo: 'bg-gradient-to-br from-indigo-50 to-blue-100 border-indigo-200',
    red: 'bg-gradient-to-br from-red-50 to-rose-100 border-red-200',
    cyan: 'bg-gradient-to-br from-cyan-50 to-teal-100 border-cyan-200',
    amber: 'bg-gradient-to-br from-amber-50 to-yellow-100 border-amber-200',
    none: 'bg-white border-gray-200',
  };

  const baseClasses = 'rounded-2xl border shadow-card transition-all duration-200';
  const hoverClass = hover ? 'hover:shadow-card-hover' : '';

  return (
    <div
      className={`${baseClasses} ${gradientClasses[gradient]} ${paddingClasses[padding]} ${hoverClass} ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;

