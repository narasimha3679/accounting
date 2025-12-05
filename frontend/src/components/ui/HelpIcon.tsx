import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface HelpIconProps {
  content: string;
  title?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const HelpIcon: React.FC<HelpIconProps> = ({
  content,
  title,
  className,
  size = 'md',
  position = 'top',
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);

  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const positionClasses = {
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2',
  };

  const showTooltip = isHovered || isClicked;

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        className={cn(
          "inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full",
          className
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => setIsClicked(!isClicked)}
        aria-label="Help"
      >
        <HelpCircle className={sizeClasses[size]} />
      </button>

      {showTooltip && (
        <div
          className={cn(
            "absolute z-50 w-64 p-3 bg-card border border-border rounded-lg shadow-lg text-xs text-foreground pointer-events-none",
            positionClasses[position]
          )}
          role="tooltip"
        >
          {title && (
            <p className="font-semibold text-foreground mb-1">{title}</p>
          )}
          <p className="text-muted-foreground leading-relaxed">{content}</p>
          {/* Arrow */}
          <div
            className={cn(
              "absolute w-2 h-2 bg-card border border-border rotate-45",
              position === 'top' && 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 border-t-0 border-l-0',
              position === 'bottom' && 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 border-b-0 border-r-0',
              position === 'left' && 'right-0 top-1/2 -translate-y-1/2 translate-x-1/2 border-l-0 border-b-0',
              position === 'right' && 'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 border-r-0 border-t-0'
            )}
          />
        </div>
      )}
    </div>
  );
};

export default HelpIcon;
