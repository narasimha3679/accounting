import React from 'react';
import { Building2, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface CompanyInfoStepProps {
    name: string;
    businessNumber: string;
    hstNumber: string;
    fiscalYearEnd: string;
    province: string;
    onNameChange: (value: string) => void;
    onBusinessNumberChange: (value: string) => void;
    onHstNumberChange: (value: string) => void;
    onFiscalYearEndChange: (value: string) => void;
    onProvinceChange: (value: string) => void;
    businessNumberError?: string;
}

const PROVINCES = [
    { value: 'ON', label: 'Ontario' },
    { value: 'BC', label: 'British Columbia' },
    { value: 'AB', label: 'Alberta' },
    { value: 'SK', label: 'Saskatchewan' },
    { value: 'MB', label: 'Manitoba' },
    { value: 'QC', label: 'Quebec' },
    { value: 'NB', label: 'New Brunswick' },
    { value: 'NS', label: 'Nova Scotia' },
    { value: 'PE', label: 'Prince Edward Island' },
    { value: 'NL', label: 'Newfoundland and Labrador' },
    { value: 'YT', label: 'Yukon' },
    { value: 'NT', label: 'Northwest Territories' },
    { value: 'NU', label: 'Nunavut' },
];

export const CompanyInfoStep: React.FC<CompanyInfoStepProps> = ({
    name,
    businessNumber,
    hstNumber,
    fiscalYearEnd,
    province,
    onNameChange,
    onBusinessNumberChange,
    onHstNumberChange,
    onFiscalYearEndChange,
    onProvinceChange,
    businessNumberError,
}) => {
    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-2 pb-2 border-b border-border">
                <Building2 className="h-5 w-5 text-neon-emerald" />
                <h2 className="heading-3">Company Information</h2>
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
                    <select
                        id="province"
                        value={province}
                        onChange={(e) => onProvinceChange(e.target.value)}
                        required
                        className="input"
                    >
                        <option value="">Select province</option>
                        {PROVINCES.map((p) => (
                            <option key={p.value} value={p.value}>
                                {p.label}
                            </option>
                        ))}
                    </select>
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
