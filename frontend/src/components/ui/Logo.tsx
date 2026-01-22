import React from 'react';
import { cn } from '../../lib/utils';

interface LogoProps {
  variant?: 'icon' | 'icon-text' | 'text-only'; // Kept for backward compatibility, but always shows full logo
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showText?: boolean; // Kept for backward compatibility, but always shows full logo
}

const sizeMap = {
  sm: 'h-8 w-auto',  // 32px - compact/mobile
  md: 'h-10 w-auto', // 40px - navbar (2-3x nav link text-sm which is 14px)
  lg: 'h-12 w-auto', // 48px - sidebar header (fits in h-16/64px container)
};

export const Logo: React.FC<LogoProps> = ({
  variant: _variant = 'icon-text', // Kept for backward compatibility
  size = 'md',
  className,
  showText: _showText = true, // Kept for backward compatibility
}) => {
  return (
    <img
      src="/logo.svg"
      alt="Cashual logo"
      className={cn(sizeMap[size], 'flex-shrink-0', className)}
    />
  );
};
