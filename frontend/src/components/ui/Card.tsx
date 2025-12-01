import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  padding?: 'sm' | 'md' | 'lg';
  hover?: boolean;
  className?: string;
  glass?: 'default' | 'light' | 'heavy' | 'emerald' | 'golden';
  // Legacy props to ignore
  gradient?: string;
}

const Card: React.FC<CardProps> = ({
  children,
  padding = 'md',
  hover = true,
  className = '',
  glass = 'default',
}) => {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const glassClasses = {
    default: 'glass',
    light: 'glass-light',
    heavy: 'glass-heavy',
    emerald: 'glass-emerald',
    golden: 'glass-golden',
  };

  return (
    <div
      className={cn(
        "rounded-2xl text-white transition-all duration-200",
        glassClasses[glass],
        hover && "hover:bg-opacity-80",
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  );
};

export default Card;
