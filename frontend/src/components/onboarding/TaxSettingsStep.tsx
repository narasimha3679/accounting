import React from 'react';
import { Percent, Info } from 'lucide-react';
import Card from '../ui/Card';

interface TaxSettingsStepProps {
    hstRegistered: boolean;
    hstFilingFrequency: 'monthly' | 'quarterly' | 'annual';
    smallBusinessRate: number;
    hstRate: number;
    onHstRegisteredChange: (value: boolean) => void;
    onHstFilingFrequencyChange: (value: 'monthly' | 'quarterly' | 'annual') => void;
    onSmallBusinessRateChange: (value: number) => void;
    onHstRateChange: (value: number) => void;
}

// Province-based tax rates (simplified - in production, this should be more comprehensive)
const getDefaultTaxRates = (province: string) => {
    switch (province) {
        case 'ON':
            return { hst: 0.13, smallBusiness: 0.125 };
        case 'BC':
            return { hst: 0.12, smallBusiness: 0.11 }; // GST 5% + PST 7%
        case 'AB':
            return { hst: 0.05, smallBusiness: 0.11 }; // GST only
        case 'QC':
            return { hst: 0.14975, smallBusiness: 0.11 }; // GST 5% + QST 9.975%
        default:
            return { hst: 0.13, smallBusiness: 0.125 };
    }
};

export const TaxSettingsStep: React.FC<TaxSettingsStepProps & { province?: string }> = ({
    hstRegistered,
    hstFilingFrequency,
    smallBusinessRate,
    hstRate,
    onHstRegisteredChange,
    onHstFilingFrequencyChange,
    onSmallBusinessRateChange,
    onHstRateChange,
    province,
}) => {
    // Auto-fill rates based on province if not set
    React.useEffect(() => {
        if (province && (hstRate === 0.13 || smallBusinessRate === 0.125)) {
            const rates = getDefaultTaxRates(province);
            if (hstRate === 0.13) {
                onHstRateChange(rates.hst);
            }
            if (smallBusinessRate === 0.125) {
                onSmallBusinessRateChange(rates.smallBusiness);
            }
        }
    }, [province, hstRate, smallBusinessRate, onHstRateChange, onSmallBusinessRateChange]);

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-2 pb-2 border-b border-border">
                <Percent className="h-5 w-5 text-golden-hour" />
                <h2 className="heading-3">Tax Settings</h2>
            </div>

            {/* HST Registration Toggle */}
            <Card className="p-6" glass="emerald">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                        <div className="flex items-center space-x-2">
                            <h3 className="text-base font-semibold text-foreground">HST Registration</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Enable if your business is HST/GST registered and can claim Input Tax Credits.
                        </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={hstRegistered}
                            onChange={(e) => onHstRegisteredChange(e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-card border border-border peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-neon-emerald peer-focus:ring-offset-2 peer-focus:ring-offset-deep-forest rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon-emerald" />
                    </label>
                </div>
            </Card>

            {/* HST Filing Frequency */}
            {hstRegistered && (
                <div className="space-y-2">
                    <label htmlFor="hst_filing_frequency" className="block text-sm font-semibold text-foreground">
                        HST Filing Frequency <span className="text-destructive">*</span>
                    </label>
                    <select
                        id="hst_filing_frequency"
                        value={hstFilingFrequency}
                        onChange={(e) => onHstFilingFrequencyChange(e.target.value as 'monthly' | 'quarterly' | 'annual')}
                        className="input"
                        required
                    >
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="annual">Annual</option>
                    </select>
                    <div className="flex items-start space-x-2 mt-2 p-3 rounded-lg bg-card/50 border border-border">
                        <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">
                            How often do you file HST returns with CRA? This affects how HST periods are calculated in reports.
                        </p>
                    </div>
                </div>
            )}

            {/* Tax Rates */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                    <label htmlFor="small_business_rate" className="block text-sm font-semibold text-foreground">
                        Small business tax rate (%) <span className="text-destructive">*</span>
                    </label>
                    <input
                        id="small_business_rate"
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={smallBusinessRate * 100}
                        onChange={(e) => onSmallBusinessRateChange((parseFloat(e.target.value) || 0) / 100)}
                        required
                        className="input"
                    />
                    <div className="flex items-start space-x-2 mt-2 p-3 rounded-lg bg-card/50 border border-border">
                        <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">
                            Small business tax rate for your province (default: 12.5% for Ontario).
                        </p>
                    </div>
                </div>

                <div className="space-y-2">
                    <label htmlFor="hst_rate" className="block text-sm font-semibold text-foreground">
                        HST/GST rate (%) <span className="text-destructive">*</span>
                    </label>
                    <input
                        id="hst_rate"
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={hstRate * 100}
                        onChange={(e) => onHstRateChange((parseFloat(e.target.value) || 0) / 100)}
                        required
                        className="input"
                    />
                    <div className="flex items-start space-x-2 mt-2 p-3 rounded-lg bg-card/50 border border-border">
                        <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">
                            HST/GST rate for your province (default: 13% for Ontario).
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
