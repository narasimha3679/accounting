import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import Button from '../ui/Button';
import { BusinessTypeSelector } from './BusinessTypeSelector';
import { CompanyInfoStep } from './CompanyInfoStep';
import { ShareholderStep, type Shareholder } from './ShareholderStep';
import { TaxSettingsStep } from './TaxSettingsStep';
import { FeatureConfirmation } from './FeatureConfirmation';
import type { BusinessType, EnabledFeatures } from '../../lib/featureConfig';
import { DEFAULT_FEATURES_BY_TYPE, BUSINESS_TYPE_LABELS } from '../../lib/featureConfig';

export interface OnboardingData {
    businessType: BusinessType;
    name: string;
    businessNumber: string;
    hstNumber: string;
    province: string;
    fiscalYearEnd: string;
    hstRegistered: boolean;
    hstFilingFrequency: 'monthly' | 'quarterly' | 'annual';
    smallBusinessRate: number;
    hstRate: number;
    shareholders: Shareholder[];
}

interface OnboardingWizardProps {
    onSubmit: (data: OnboardingData, enabledFeatures: EnabledFeatures) => Promise<void>;
    isSubmitting?: boolean;
    businessNumberError?: string;
    currentUserEmail: string;
    currentUserName: string;
}

const STEPS = [
    { id: 1, title: 'Business Type' },
    { id: 2, title: 'Company Info' },
    { id: 3, title: 'Shareholders' },
    { id: 4, title: 'Tax Settings' },
    { id: 5, title: 'Review' },
];

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
    onSubmit,
    isSubmitting = false,
    businessNumberError,
    currentUserEmail,
    currentUserName,
}) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [businessType, setBusinessType] = useState<BusinessType | null>(null);
    const [name, setName] = useState('');
    const [businessNumber, setBusinessNumber] = useState('');
    const [hstNumber, setHstNumber] = useState('');
    // Cashual currently only supports Ontario businesses
    const province = 'ON';
    const [fiscalYearEnd, setFiscalYearEnd] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });
    const [hstRegistered, setHstRegistered] = useState(false);
    const [hstFilingFrequency, setHstFilingFrequency] = useState<'monthly' | 'quarterly' | 'annual'>('annual');
    const [smallBusinessRate, setSmallBusinessRate] = useState(0.125);
    const [hstRate, setHstRate] = useState(0.13);
    const [internalBusinessNumberError, setInternalBusinessNumberError] = useState('');
    const [shareholders, setShareholders] = useState<Shareholder[]>([]);

    const enabledFeatures = businessType ? DEFAULT_FEATURES_BY_TYPE[businessType] : DEFAULT_FEATURES_BY_TYPE.solo_corporation;

    const canProceed = () => {
        switch (currentStep) {
            case 1:
                return businessType !== null;
            case 2:
                return name.trim() !== '' && businessNumber.trim() !== '' && fiscalYearEnd !== '';
            case 3:
                return shareholders.length >= 1; // At least current user
            case 4:
                return true; // Tax settings are optional or have defaults
            case 5:
                return true; // Review step
            default:
                return false;
        }
    };

    const handleNext = () => {
        if (canProceed() && currentStep < STEPS.length) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSubmit = async () => {
        if (!businessType) return;

        const data: OnboardingData = {
            businessType,
            name,
            businessNumber,
            hstNumber,
            province,
            fiscalYearEnd,
            hstRegistered,
            hstFilingFrequency: hstRegistered ? hstFilingFrequency : 'annual',
            smallBusinessRate,
            hstRate,
            shareholders,
        };

        try {
            await onSubmit(data, enabledFeatures);
        } catch (error) {
            // Error handling is done in parent component
        }
    };

    // Update internal error when prop changes and go back to step 2
    React.useEffect(() => {
        if (businessNumberError) {
            setInternalBusinessNumberError(businessNumberError);
            setCurrentStep(2); // Go back to company info step
        }
    }, [businessNumberError]);

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <BusinessTypeSelector
                        selectedType={businessType}
                        onSelect={setBusinessType}
                    />
                );
            case 2:
                return (
                    <CompanyInfoStep
                        name={name}
                        businessNumber={businessNumber}
                        hstNumber={hstNumber}
                        fiscalYearEnd={fiscalYearEnd}
                        onNameChange={setName}
                        onBusinessNumberChange={(value) => {
                            setBusinessNumber(value);
                            setInternalBusinessNumberError('');
                        }}
                        onHstNumberChange={setHstNumber}
                        onFiscalYearEndChange={setFiscalYearEnd}
                        businessNumberError={businessNumberError || internalBusinessNumberError}
                    />
                );
            case 3:
                return (
                    <ShareholderStep
                        shareholders={shareholders}
                        currentUserEmail={currentUserEmail}
                        currentUserName={currentUserName}
                        onShareholdersChange={setShareholders}
                    />
                );
            case 4:
                return (
                    <TaxSettingsStep
                        hstRegistered={hstRegistered}
                        hstFilingFrequency={hstFilingFrequency}
                        smallBusinessRate={smallBusinessRate}
                        hstRate={hstRate}
                        onHstRegisteredChange={setHstRegistered}
                        onHstFilingFrequencyChange={setHstFilingFrequency}
                        onSmallBusinessRateChange={setSmallBusinessRate}
                        onHstRateChange={setHstRate}
                        province={province}
                    />
                );
            case 5:
                return (
                    <FeatureConfirmation
                        enabledFeatures={enabledFeatures}
                        businessTypeLabel={businessType ? BUSINESS_TYPE_LABELS[businessType] : ''}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            {/* Progress Indicator */}
            <div className="flex items-center justify-between mb-8">
                {STEPS.map((step, index) => (
                    <React.Fragment key={step.id}>
                        <div className="flex items-center">
                            <div
                                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${currentStep >= step.id
                                    ? 'bg-neon-emerald border-neon-emerald text-deep-forest'
                                    : 'border-border text-muted-foreground'
                                    }`}
                            >
                                {currentStep > step.id ? (
                                    <CheckCircle2 className="h-5 w-5" />
                                ) : (
                                    <span className="text-sm font-semibold">{step.id}</span>
                                )}
                            </div>
                            <span className={`ml-2 text-sm font-medium hidden sm:block ${currentStep >= step.id ? 'text-foreground' : 'text-muted-foreground'
                                }`}>
                                {step.title}
                            </span>
                        </div>
                        {index < STEPS.length - 1 && (
                            <div className={`flex-1 h-0.5 mx-4 ${currentStep > step.id ? 'bg-neon-emerald' : 'bg-border'
                                }`} />
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* Step Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                >
                    {renderStep()}
                </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t border-border">
                <Button
                    type="button"
                    onClick={handleBack}
                    disabled={currentStep === 1 || isSubmitting}
                    variant="outline"
                    icon={ChevronLeft}
                    iconPosition="left"
                >
                    Back
                </Button>

                {currentStep < STEPS.length ? (
                    <Button
                        type="button"
                        onClick={handleNext}
                        disabled={!canProceed() || isSubmitting}
                        icon={ChevronRight}
                        iconPosition="right"
                    >
                        Next
                    </Button>
                ) : (
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!canProceed() || isSubmitting}
                    >
                        {isSubmitting ? 'Creating company...' : 'Get Started'}
                    </Button>
                )}
            </div>
        </div>
    );
};
