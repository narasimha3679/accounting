import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  padding?: 'sm' | 'md' | 'lg';
  hover?: boolean;
  className?: string;
  // Legacy props to ignore
  gradient?: string;
}

const Card: React.FC<CardProps> = ({
  children,
  padding = 'md',
  hover = true,
  className = '',
}) => {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-all duration-200",
        hover && "hover:shadow-md",
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  );
};

export default Card;
