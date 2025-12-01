import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import Card from './Card';
import { cn } from '../../lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  gradient?: 'green' | 'blue' | 'purple' | 'orange' | 'emerald' | 'indigo' | 'red' | 'cyan' | 'amber' | 'golden' | 'none';
  className?: string;
  accent?: 'emerald' | 'golden' | 'default';
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  gradient = 'blue',
  className = '',
  accent = 'default',
}) => {
  // Map gradients to Cashual colors with meaningful context
  // Emerald: Money in, positive, completed
  // Golden/Amber: Wealth, assets, attention needed
  // Red: Money out, debt, negative
  // Cyan/Blue: Neutral information, calculated values
  const getAccentColor = () => {
    if (accent === 'emerald') return 'text-neon-emerald';
    if (accent === 'golden') return 'text-golden-hour';
    if (gradient === 'green' || gradient === 'emerald') return 'text-neon-emerald';
    if (gradient === 'amber' || gradient === 'golden') return 'text-golden-hour';
    if (gradient === 'red' || gradient === 'orange') return 'text-red-400';
    if (gradient === 'cyan' || gradient === 'blue') return 'text-cyan-400';
    return 'text-foreground';
  };

  const getIconBgColor = () => {
    if (accent === 'emerald') return 'bg-neon-emerald/20 border-neon-emerald/30';
    if (accent === 'golden') return 'bg-golden-hour/20 border-golden-hour/30';
    if (gradient === 'green' || gradient === 'emerald') return 'bg-neon-emerald/20 border-neon-emerald/30';
    if (gradient === 'amber' || gradient === 'golden') return 'bg-golden-hour/20 border-golden-hour/30';
    if (gradient === 'red' || gradient === 'orange') return 'bg-red-500/20 border-red-500/30';
    if (gradient === 'cyan' || gradient === 'blue') return 'bg-cyan-500/20 border-cyan-500/30';
    return 'bg-muted/50 border-border';
  };

  const accentColor = getAccentColor();
  const iconBg = getIconBgColor();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className={cn("flex flex-col justify-between", className)}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          <div className={cn("p-2 rounded-lg border", iconBg)}>
            <Icon className={cn("h-4 w-4", accentColor)} />
          </div>
        </div>
        <div>
          <div className={cn("text-3xl font-bold tabular-nums", accentColor)}>
            {value}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
      </Card>
    </motion.div>
  );
};

export default StatCard;
