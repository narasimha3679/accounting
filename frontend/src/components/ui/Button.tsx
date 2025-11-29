import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'gradient';
  gradientFrom?: string;
  gradientTo?: string;
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  gradientFrom,
  gradientTo,
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  children,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const baseClasses = 'rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  let variantClasses = '';
  if (variant === 'primary') {
    variantClasses = 'bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800 focus:ring-primary-500 shadow-md hover:shadow-lg';
  } else if (variant === 'secondary') {
    variantClasses = 'bg-white text-gray-700 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 focus:ring-gray-500 shadow-sm hover:shadow-md';
  } else if (variant === 'danger') {
    variantClasses = 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 focus:ring-red-500 shadow-md hover:shadow-lg';
  } else if (variant === 'gradient') {
    const fromColor = gradientFrom || 'from-primary-600';
    const toColor = gradientTo || 'to-primary-700';
    variantClasses = `bg-gradient-to-r ${fromColor} ${toColor} text-white shadow-md hover:shadow-lg`;
  }

  const iconSize = size === 'sm' ? 16 : size === 'md' ? 20 : 24;
  const iconClasses = iconPosition === 'left' ? 'mr-2' : 'ml-2';

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses} ${className}`}
      disabled={disabled}
      {...props}
    >
      <span className="flex items-center justify-center">
        {Icon && iconPosition === 'left' && (
          <Icon size={iconSize} className={iconClasses} />
        )}
        {children}
        {Icon && iconPosition === 'right' && (
          <Icon size={iconSize} className={iconClasses} />
        )}
      </span>
    </button>
  );
};

export default Button;

