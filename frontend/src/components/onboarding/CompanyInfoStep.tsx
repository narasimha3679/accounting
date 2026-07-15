import React from 'react';
import { Building2, AlertCircle, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

interface CompanyInfoStepProps {
    name: string;
    businessNumber: string;
    hstNumber: string;
    fiscalYearEnd: string;
    onNameChange: (value: string) => void;
    onBusinessNumberChange: (value: string) => void;
    onHstNumberChange: (value: string) => void;
    onFiscalYearEndChange: (value: string) => void;
    businessNumberError?: string;
}

export const CompanyInfoStep: React.FC<CompanyInfoStepProps> = ({
    name,
    businessNumber,
    hstNumber,
    fiscalYearEnd,
    onNameChange,
    onBusinessNumberChange,
    onHstNumberChange,
    onFiscalYearEndChange,
    businessNumberError,
}) => {
    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-2 pb-2 border-b border-border">
                <Building2 className="h-5 w-5 text-neon-emerald" />
                <h2 className="heading-3">Company Information</h2>
            </div>

            <div className="rounded-lg border border-border bg-muted/40 p-4 flex items-start space-x-3">
                <Info className="h-5 w-5 text-neon-emerald flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                    For now, Cashual only works for businesses registered in{' '}
                    <span className="font-semibold text-foreground">Ontario</span>. Support for other provinces is coming later.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                    <label htmlFor="name" className="block text-sm font-semibold text-foreground">
                        Company name <span className="text-destructive">*</span>
                    </label>
                    <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => onNameChange(e.target.value)}
                        required
                        placeholder="Enter company name"
                        className="input"
                    />
                </div>

                <div className="space-y-2">
                    <label htmlFor="business_number" className="block text-sm font-semibold text-foreground">
                        Business number <span className="text-destructive">*</span>
                    </label>
                    <input
                        id="business_number"
                        type="text"
                        value={businessNumber}
                        onChange={(e) => onBusinessNumberChange(e.target.value)}
                        required
                        placeholder="123456789"
                        className={cn(
                            "input",
                            businessNumberError && "border-destructive focus-visible:ring-destructive"
                        )}
                    />
                    {businessNumberError && (
                        <p className="text-sm text-destructive flex items-center space-x-1 mt-1">
                            <AlertCircle className="h-4 w-4" />
                            <span>{businessNumberError}</span>
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <label htmlFor="province" className="block text-sm font-semibold text-foreground">
                        Province <span className="text-destructive">*</span>
                    </label>
                    <input
                        id="province"
                        type="text"
                        value="Ontario"
                        readOnly
                        aria-readonly="true"
                        className="input bg-muted/50 cursor-not-allowed"
                    />
                </div>

                <div className="space-y-2">
                    <label htmlFor="hst_number" className="block text-sm font-semibold text-foreground">
                        HST number <span className="text-muted-foreground text-xs">(optional)</span>
                    </label>
                    <input
                        id="hst_number"
                        type="text"
                        value={hstNumber}
                        onChange={(e) => onHstNumberChange(e.target.value)}
                        placeholder="Enter HST number"
                        className="input"
                    />
                </div>

                <div className="space-y-2 sm:col-span-2">
                    <label htmlFor="fiscal_year_end" className="block text-sm font-semibold text-foreground">
                        Fiscal year end <span className="text-destructive">*</span>
                    </label>
                    <input
                        id="fiscal_year_end"
                        type="date"
                        value={fiscalYearEnd}
                        onChange={(e) => onFiscalYearEndChange(e.target.value)}
                        required
                        className="input"
                    />
                </div>
            </div>
        </div>
    );
};
