export type BusinessType = 'solo_corporation' | 'small_business';

export interface EnabledFeatures {
    invoices: boolean;
    income: boolean;
    expenses: boolean;
    capital_assets: boolean;
    dividends: boolean;
    clients: boolean;
    reports: boolean;
    tax_calculator: boolean;
    salary_dividend_optimizer: boolean;
    owner_reimbursement: boolean;
    employees: boolean;
    time_management: boolean;
    payroll: boolean;
    salary: boolean;
}

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
    solo_corporation: 'Solo Corporation',
    small_business: 'Small Business with Employees',
};

export const BUSINESS_TYPE_DESCRIPTIONS: Record<BusinessType, string> = {
    solo_corporation: 'Perfect for contractors, consultants, freelancers, and professionals (doctors, lawyers, engineers) with no employees to manage.',
    small_business: 'Manage payroll, employees, time tracking, and all business operations.',
};

export const DEFAULT_FEATURES_BY_TYPE: Record<BusinessType, EnabledFeatures> = {
    solo_corporation: {
        invoices: true,
        income: true,
        expenses: true,
        capital_assets: true,
        dividends: true,
        clients: true,
        reports: true,
        tax_calculator: true,
        salary_dividend_optimizer: true,
        owner_reimbursement: true,
        employees: false,
        time_management: false,
        payroll: false,
        salary: false,
    },
    small_business: {
        invoices: true,
        income: true,
        expenses: true,
        capital_assets: true,
        dividends: true,
        clients: true,
        reports: true,
        tax_calculator: true,
        salary_dividend_optimizer: true,
        owner_reimbursement: true,
        employees: true,
        time_management: true,
        payroll: true,
        salary: false, // Deprecated: use Pay Runs instead
    },
};

export const FEATURE_LABELS: Record<keyof EnabledFeatures, string> = {
    invoices: 'Invoices',
    income: 'Income',
    expenses: 'Expenses',
    capital_assets: 'Capital Assets',
    dividends: 'Dividends',
    clients: 'Clients',
    reports: 'Reports',
    tax_calculator: 'Tax Summary',
    salary_dividend_optimizer: 'Salary vs Dividend Optimizer',
    owner_reimbursement: 'Owner Reimbursement',
    employees: 'Employee Management',
    time_management: 'Time Management',
    payroll: 'Payroll',
    salary: 'Salary (deprecated)',
};

export const FEATURE_GROUPS = {
    financial: ['invoices', 'income', 'expenses', 'capital_assets', 'dividends', 'clients'] as const,
    payroll: ['employees', 'time_management', 'payroll'] as const,
    tools: ['reports', 'tax_calculator', 'salary_dividend_optimizer', 'owner_reimbursement'] as const,
} as const;
