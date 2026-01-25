import React from 'react';
import { motion } from 'framer-motion';
import { User, Users, Briefcase, Building2 } from 'lucide-react';
import Card from '../ui/Card';
import type { BusinessType } from '../../lib/featureConfig';
import { BUSINESS_TYPE_LABELS, BUSINESS_TYPE_DESCRIPTIONS } from '../../lib/featureConfig';
import { cn } from '../../lib/utils';

interface BusinessTypeSelectorProps {
    selectedType: BusinessType | null;
    onSelect: (type: BusinessType) => void;
}

const businessTypeIcons = {
    solo_corporation: User,
    small_business: Users,
    professional_corporation: Briefcase,
    holding_company: Building2,
};

const businessTypeColors = {
    solo_corporation: 'from-neon-emerald/20 to-neon-emerald/10',
    small_business: 'from-golden-hour/20 to-golden-hour/10',
    professional_corporation: 'from-blue-500/20 to-blue-500/10',
    holding_company: 'from-purple-500/20 to-purple-500/10',
};

export const BusinessTypeSelector: React.FC<BusinessTypeSelectorProps> = ({ selectedType, onSelect }) => {
    const types: BusinessType[] = ['solo_corporation', 'small_business', 'professional_corporation', 'holding_company'];

    return (
        <div className="space-y-6">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-2">
                    What best describes your business?
                </h2>
                <p className="text-muted-foreground">
                    We'll customize your experience based on your needs
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {types.map((type) => {
                    const Icon = businessTypeIcons[type];
                    const isSelected = selectedType === type;

                    return (
                        <motion.div
                            key={type}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onSelect(type)}
                        >
                            <Card
                                className={cn(
                                    "p-6 cursor-pointer transition-all duration-200",
                                    isSelected
                                        ? "ring-2 ring-neon-emerald bg-neon-emerald/10 border-neon-emerald/50"
                                        : "hover:bg-card/50 border-border"
                                )}
                            >
                                <div className="flex items-start space-x-4">
                                    <div className={cn(
                                        "h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br",
                                        businessTypeColors[type]
                                    )}>
                                        <Icon className={cn(
                                            "h-6 w-6",
                                            isSelected ? "text-neon-emerald" : "text-muted-foreground"
                                        )} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className={cn(
                                            "text-lg font-semibold mb-1",
                                            isSelected ? "text-neon-emerald" : "text-foreground"
                                        )}>
                                            {BUSINESS_TYPE_LABELS[type]}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            {BUSINESS_TYPE_DESCRIPTIONS[type]}
                                        </p>
                                    </div>
                                    {isSelected && (
                                        <div className="flex-shrink-0">
                                            <div className="h-5 w-5 rounded-full bg-neon-emerald flex items-center justify-center">
                                                <svg className="h-3 w-3 text-deep-forest" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};
