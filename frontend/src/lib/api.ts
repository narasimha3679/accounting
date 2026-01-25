import { supabase, SUPABASE_STORAGE_BUCKET } from './supabaseClient';
import { getFiscalYear, isDateInFiscalYear } from './fiscalYear';
import type { TaxConstants, TaxBracket, ProvincialTaxConstants, EmployeeYTD } from './payrollTypes';
import type { BusinessType, EnabledFeatures } from './featureConfig';

// Backend server URL - defaults to localhost in development
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export interface User {
    id: number;
    email: string;
    name: string;
    role: 'owner' | 'admin' | 'manager' | 'accountant' | 'viewer' | 'employee';
    company_id: number; // Backward compatibility - current company
    company?: Company;
    // Multi-company support
    companies?: CompanyMembership[];
    currentCompanyId?: number | null;
    currentCompany?: Company;
    permissions?: ManagerPermissions;
    isEmployee?: boolean;
    employee?: Employee;
    created_at: string;
    updated_at: string;
}

export interface CompanyMembership {
    id: number;
    user_id: number;
    company_id: number;
    role: 'owner' | 'manager' | 'accountant' | 'viewer';
    permissions: ManagerPermissions | null;
    is_primary: boolean;
    invite_status: 'pending' | 'accepted';
    created_at: string;
    updated_at: string;
    company: Company;
}

export interface ManagerPermissions {
    can_schedule_employees?: boolean;
    can_approve_timesheets?: boolean;
    can_view_reports?: boolean;
    can_manage_expenses?: boolean;
    can_manage_invoices?: boolean;
    can_manage_clients?: boolean;
    can_manage_employees?: boolean;
    can_view_financials?: boolean;
}

export interface Company {
    id: number;
    name: string;
    business_number: string;
    hst_number?: string | null;
    hst_registered: boolean;
    time_entry_mode?: 'allotted' | 'submitted' | null;
    fiscal_year_end: string;
    hst_filing_frequency?: 'monthly' | 'quarterly' | 'annual' | null;
    hst_filing_period_start?: string | null;
    small_business_rate: number;
    hst_rate: number;
    rdtoh_balance?: number;
    capital_loss_carryforward?: number; // Unused capital losses from previous years (50% included amount)
    business_type?: BusinessType | null;
    enabled_features?: EnabledFeatures | null;
    created_at: string;
    updated_at: string;
}

export interface Client {
    id: number;
    name: string;
    contact_person?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    hst_exempt: boolean;
    company_id: number;
    company?: Company;
    created_at: string;
    updated_at: string;
}

export interface Employee {
    id: number;
    company_id: number;
    auth_user_id?: string | null;
    employee_id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string | null;
    position?: string | null;
    hire_date?: string | null;
    status: 'active' | 'inactive' | 'terminated';
    address?: string | null;
    sin?: string | null;
    payrate?: number | null;
    payrate_type?: 'hourly' | 'salary' | 'monthly' | 'biweekly' | null;
    province?: string | null;
    created_at: string;
    updated_at: string;
    company?: Company;
}

export interface EmployeeSchedule {
    id: number;
    company_id: number;
    employee_id: number;
    schedule_date: string;
    start_time: string;
    end_time: string;
    break_duration_minutes: number;
    notes?: string | null;
    status: 'scheduled' | 'cancelled' | 'completed';
    created_by?: number | null;
    created_at: string;
    updated_at: string;
    employee?: Employee;
}

export interface Timesheet {
    id: number;
    company_id: number;
    employee_id: number;
    timesheet_date: string;
    start_time: string;
    end_time: string;
    break_duration_minutes: number;
    notes?: string | null;
    status: 'draft' | 'pending' | 'approved' | 'rejected';
    submitted_by?: number | null;
    approved_by?: number | null;
    approved_at?: string | null;
    rejection_reason?: string | null;
    created_at: string;
    updated_at: string;
    employee?: Employee;
}

export interface TimeEntry {
    id: number;
    company_id: number;
    employee_id: number;
    entry_date: string;
    start_time: string;
    end_time: string;
    break_duration_minutes: number;
    notes?: string | null;
    entry_type: 'allotted' | 'submitted';
    status: 'scheduled' | 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
    created_by?: number | null;
    submitted_by?: number | null;
    approved_by?: number | null;
    approved_at?: string | null;
    rejection_reason?: string | null;
    allotted_entry_id?: number | null;
    created_at: string;
    updated_at: string;
    employee?: Employee;
    allotted_entry?: TimeEntry;
}

export interface InvoiceItem {
    id: number;
    invoice_id: number;
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
    created_at: string;
    updated_at: string;
}

export interface Invoice {
    id: number;
    invoice_number: string;
    client_id: number;
    client?: Client;
    issue_date: string;
    due_date: string;
    subtotal: number;
    hst_amount: number;
    total: number;
    status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
    paid_date?: string | null;
    description?: string | null;
    company_id: number;
    company?: Company;
    items?: InvoiceItem[];
    created_at: string;
    updated_at: string;
}

export interface RecurringInvoice {
    id: number;
    company_id: number;
    client_id: number;
    client?: Client;
    template_name: string;
    description?: string | null;
    items: Array<{ description: string; quantity: number; unit_price: number }>;
    frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
    day_of_month?: number | null;
    next_generation_date: string;
    end_date?: string | null;
    is_active: boolean;
    last_generated_invoice_id?: number | null;
    created_at: string;
    updated_at: string;
}

export interface ExpenseCategory {
    id: number;
    name: string;
    description?: string | null;
    company_id?: number | null;
    default_deduction_percentage: number;
    created_at: string;
    updated_at: string;
}

export interface ExpenseFile {
    id: number;
    expense_id: number;
    file_name: string;
    original_name: string;
    file_path: string;
    file_size: number;
    mime_type: string;
    company_id: number;
    created_at: string;
}

export interface Expense {
    id: number;
    description: string;
    category_id: number;
    category?: ExpenseCategory;
    amount: number;
    hst_paid: number;
    deduction_percentage: number;
    expense_date: string;
    receipt_attached: boolean;
    paid_by: 'corp' | 'owner';
    company_id: number;
    company?: Company;
    files?: ExpenseFile[];
    created_at: string;
    updated_at: string;
    // Mileage-specific fields (optional, only populated for mileage expenses)
    distance_km?: number | null;
    start_location?: string | null;
    end_location?: string | null;
    vehicle_description?: string | null;
    mileage_rate_per_km?: number | null;
}

export interface Dividend {
    id: number;
    amount: number;
    declaration_date: string;
    payment_date?: string | null;
    status: 'declared' | 'paid';
    notes?: string | null;
    company_id: number;
    company?: Company;
    dividend_type: 'eligible' | 'non_eligible';
    fiscal_year: number;
    is_capital_dividend?: boolean;
    created_at: string;
    updated_at: string;
}

export interface DividendRecipient {
    id: number;
    dividend_id: number;
    recipient_name: string;
    recipient_sin?: string | null;
    recipient_type: 'individual' | 'corporation' | 'trust';
    business_number?: string | null;
    amount: number;
    mailing_address?: string | null;
    created_at: string;
    updated_at: string;
}

export interface Salary {
    id: number;
    amount: number;
    payment_date: string;
    period_start: string;
    period_end: string;
    employee_id: number;
    employee?: Employee;
    status: 'pending' | 'paid';
    notes?: string | null;
    company_id: number;
    company?: Company;
    created_at: string;
    updated_at: string;
}

export interface IncomeEntry {
    id: number;
    description: string;
    amount: number;
    hst_amount: number;
    total: number;
    income_type: 'client' | 'capital' | 'other';
    client_id?: number | null;
    client?: Client;
    income_date: string;
    company_id: number;
    company?: Company;
    created_at: string;
    updated_at: string;
}

export interface HSTPayment {
    id: number;
    amount: number;
    payment_date: string;
    period_start: string;
    period_end: string;
    reference?: string | null;
    notes?: string | null;
    company_id: number;
    company?: Company;
    created_at: string;
    updated_at: string;
}

export interface TaxReturn {
    id: number;
    fiscal_year: number;
    gross_income: number;
    total_expenses: number;
    net_income_before_tax: number;
    small_business_tax: number;
    net_income_after_tax: number;
    hst_collected: number;
    hst_paid: number;
    hst_remittance: number;
    retained_earnings: number;
    company_id: number;
    company?: Company;
    created_at: string;
    updated_at: string;
}

export interface DepreciationEntry {
    id: number;
    capital_asset_id: number;
    capital_asset?: CapitalAsset;
    fiscal_year: number;
    depreciation_amount: number;
    is_half_year_rule: boolean;
    entry_date: string;
    company_id: number;
    company?: Company;
    created_at: string;
    updated_at: string;
}

export interface CapitalAsset {
    id: number;
    description: string;
    category_id: number;
    category?: ExpenseCategory;
    purchase_date: string;
    purchase_amount: number;
    hst_paid: number;
    total_cost: number;
    cca_class: string;
    cca_rate: number;
    depreciable_amount: number;
    accumulated_depreciation: number;
    book_value: number;
    disposal_date?: string | null;
    disposal_amount?: number | null;
    paid_by: 'corp' | 'owner';
    receipt_attached: boolean;
    company_id: number;
    company?: Company;
    depreciation_entries?: DepreciationEntry[];
    created_at: string;
    updated_at: string;
}

export interface OwnerPayment {
    id: number;
    description: string;
    amount: number;
    payment_date: string;
    payment_type: 'reimbursement' | 'loan_repayment' | 'other';
    reference?: string | null;
    notes?: string | null;
    company_id: number;
    company?: Company;
    created_at: string;
    updated_at: string;
}

export interface CCAClass {
    id: number;
    class_number: string;
    description: string;
    rate: number;
    created_at: string;
    updated_at: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// Payroll Interfaces
export interface PayrollSettings {
    id: number;
    company_id: number;
    pay_frequency: 'weekly' | 'biweekly' | 'semi_monthly' | 'monthly';
    province: string;
    overtime_enabled: boolean;
    overtime_threshold_weekly: number;
    overtime_multiplier: number;
    vacation_tracking_enabled: boolean;
    vacation_rate_under_5_years: number;
    vacation_rate_5_plus_years: number;
    vacation_accrual_method: 'per_pay' | 'anniversary' | 'calendar_year';
    remitter_type: 'quarterly' | 'regular' | 'threshold1' | 'threshold2';
    default_work_hours_per_day: number;
    default_work_days_per_week: number;
    created_at: string;
    updated_at: string;
}

export interface BenefitType {
    id: number;
    company_id: number;
    name: string;
    description?: string | null;
    category: 'taxable_benefit' | 'pre_tax_deduction' | 'post_tax_deduction';
    calculation_type: 'fixed' | 'percentage' | 'hourly';
    default_amount?: number | null;
    default_percentage?: number | null;
    default_hourly_rate?: number | null;
    annual_maximum?: number | null;
    t4_box?: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface EmployeeBenefit {
    id: number;
    employee_id: number;
    benefit_type_id: number;
    amount?: number | null;
    percentage?: number | null;
    hourly_rate?: number | null;
    effective_date: string;
    end_date?: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    benefit_type?: BenefitType;
}

export interface EmployeeTaxCredits {
    id: number;
    employee_id: number;
    tax_year: number;
    federal_basic_personal: number;
    federal_additional_claims: number;
    federal_total_claim: number;
    provincial_basic_personal: number;
    provincial_additional_claims: number;
    provincial_total_claim: number;
    claim_tax_exempt: boolean;
    additional_tax_per_pay: number;
    effective_date: string;
    created_at: string;
    updated_at: string;
}

export interface T4Slip {
    id: number;
    company_id: number;
    employee_id: number;
    tax_year: number;
    status: 'draft' | 'generated' | 'amended' | 'filed';
    employee_name: string;
    employee_sin: string;
    employee_address?: string | null;
    employer_name: string;
    employer_bn: string;
    employer_address?: string | null;
    box_14_employment_income: number;
    box_16_cpp_contributions: number;
    box_16a_cpp2_contributions: number;
    box_18_ei_premiums: number;
    box_22_income_tax_deducted: number;
    box_24_ei_insurable_earnings: number;
    box_26_cpp_pensionable_earnings: number;
    box_44_union_dues: number;
    box_46_charitable_donations: number;
    box_50_rpp_contributions: number;
    box_52_pension_adjustment: number;
    other_info?: any;
    generated_at?: string | null;
    generated_by?: number | null;
    amended_at?: string | null;
    filed_at?: string | null;
    created_at: string;
    updated_at: string;
}

export interface ROERecord {
    id: number;
    company_id: number;
    employee_id: number;
    status: 'draft' | 'generated' | 'submitted';
    roe_serial_number?: string | null;
    first_day_worked: string;
    last_day_paid: string;
    final_pay_period_end: string;
    total_insurable_hours: number;
    total_insurable_earnings: number;
    reason_code: string;
    pay_period_earnings: Array<{
        period_end: string;
        earnings: number;
        hours: number;
    }>;
    vacation_pay: number;
    other_monies?: Array<{ type: string; amount: number }> | null;
    comments?: string | null;
    generated_at?: string | null;
    generated_by?: number | null;
    submitted_at?: string | null;
    created_at: string;
    updated_at: string;
}

export interface ROEInput {
    employeeId: number;
    reasonCode: string;
    lastDayPaid: string;
    finalPayPeriodEnd: string;
    vacationPay?: number;
    otherMonies?: Array<{ type: string; amount: number }>;
    comments?: string;
}

export interface PayRun {
    id: number;
    company_id: number;
    pay_period_start: string;
    pay_period_end: string;
    pay_date: string;
    status: 'draft' | 'pending_approval' | 'approved' | 'finalized' | 'void';
    total_gross: number;
    total_cpp: number;
    total_cpp2: number;
    total_ei: number;
    total_federal_tax: number;
    total_provincial_tax: number;
    total_other_deductions: number;
    total_net: number;
    total_employer_cpp: number;
    total_employer_ei: number;
    total_employer_cost: number;
    created_by?: number | null;
    approved_by?: number | null;
    approved_at?: string | null;
    finalized_at?: string | null;
    voided_at?: string | null;
    void_reason?: string | null;
    notes?: string | null;
    created_at: string;
    updated_at: string;
}

export interface PayRunItem {
    id: number;
    pay_run_id: number;
    employee_id: number;
    regular_hours: number;
    overtime_hours: number;
    vacation_hours_used: number;
    sick_hours_used: number;
    statutory_holiday_hours: number;
    hourly_rate?: number | null;
    overtime_rate?: number | null;
    regular_pay: number;
    overtime_pay: number;
    vacation_pay: number;
    statutory_holiday_pay: number;
    other_earnings: number;
    taxable_benefits: number;
    gross_pay: number;
    cpp_employee: number;
    cpp2_employee: number;
    ei_employee: number;
    federal_tax: number;
    provincial_tax: number;
    pre_tax_deductions: number;
    post_tax_deductions: number;
    total_deductions: number;
    net_pay: number;
    cpp_employer: number;
    ei_employer: number;
    employer_total_cost: number;
    vacation_accrued: number;
    vacation_rate_used?: number | null;
    ytd_gross_before?: number | null;
    ytd_cpp_before?: number | null;
    ytd_ei_before?: number | null;
    calculation_notes?: any;
    created_at: string;
    updated_at: string;
    employee?: Employee; // Joined data
}

export interface PayRunItemDeduction {
    id: number;
    pay_run_item_id: number;
    benefit_type_id?: number | null;
    description: string;
    category: 'taxable_benefit' | 'pre_tax_deduction' | 'post_tax_deduction' | 'statutory';
    amount: number;
    created_at: string;
}

// Payroll Reports Types
export interface PayrollSummaryReport {
    period_start: string;
    period_end: string;
    group_by: string;
    earnings: {
        regular: number;
        overtime: number;
        vacation: number;
        taxable_benefits: number;
        total_gross: number;
    };
    deductions: {
        cpp: number;
        cpp2: number;
        ei: number;
        federal_tax: number;
        provincial_tax: number;
        pre_tax: number;
        post_tax: number;
        total: number;
    };
    employer_costs: {
        cpp: number;
        ei: number;
        total: number;
    };
    remittance: {
        cpp_total: number;
        ei_total: number;
        income_tax: number;
        total: number;
    };
    pay_run_count: number;
    employee_count: number;
}

export interface EmployeeEarningsReport {
    period_start: string;
    period_end: string;
    employees: Array<{
        employee_id: number;
        employee_name: string;
        employee_id_code: string;
        regular_hours: number;
        overtime_hours: number;
        regular_pay: number;
        overtime_pay: number;
        gross_pay: number;
        net_pay: number;
        total_hours: number;
    }>;
    totals: {
        regular_hours: number;
        overtime_hours: number;
        regular_pay: number;
        overtime_pay: number;
        gross_pay: number;
        net_pay: number;
        total_hours: number;
    };
}

export interface DeductionsReport {
    period_start: string;
    period_end: string;
    statutory_deductions: Array<{
        employee_id: number;
        employee_name: string;
        cpp: number;
        cpp2: number;
        ei: number;
        federal_tax: number;
        provincial_tax: number;
    }>;
    other_deductions: Array<{
        deduction_type: string;
        employee_count: number;
        total_amount: number;
    }>;
    totals: {
        cpp: number;
        cpp2: number;
        ei: number;
        federal_tax: number;
        provincial_tax: number;
        other: number;
        total: number;
    };
}

export interface JournalEntry {
    pay_run_id: number;
    pay_period_start: string;
    pay_period_end: string;
    pay_date: string;
    entries: Array<{
        account: string;
        debit: number;
        credit: number;
    }>;
    total_debit: number;
    total_credit: number;
}

export interface RemittancePeriod {
    id: number;
    company_id: number;
    period_start: string;
    period_end: string;
    due_date: string;
    cpp_employee: number;
    cpp_employer: number;
    cpp2_employee: number;
    ei_employee: number;
    ei_employer: number;
    income_tax: number;
    total_owing: number;
    status: 'pending' | 'paid' | 'overdue';
    paid_amount?: number | null;
    paid_date?: string | null;
    confirmation_number?: string | null;
    notes?: string | null;
    created_at: string;
    updated_at: string;
}

type QueryModifier = (query: any) => any;

const DEFAULT_PAGE_SIZE = 50;

// CRA Mileage Rate (update annually per CRA guidelines)
export const CRA_MILEAGE_RATE = 0.70; // $0.70/km for 2024

const toPaginatedResponse = <T>(data: T[], count: number | null, page: number, limit: number): PaginatedResponse<T> => ({
    data,
    total: count ?? data.length,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil((count ?? data.length) / limit)),
});

const uuid = () => crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);

class SupabaseApi {
    private mapUser(row: any): User {
        if (!row) {
            throw new Error('Profile not found');
        }

        return {
            id: row.id,
            email: row.email,
            name: row.full_name ?? '',
            role: row.role,
            company_id: row.company_id ?? 0,
            company: row.company ?? undefined,
            created_at: row.created_at,
            updated_at: row.updated_at,
        };
    }

    private ensureCompanyId(companyId?: number | null) {
        if (!companyId) {
            throw new Error('Company ID is required for this operation.');
        }
        return companyId;
    }

    private async paginatedSelect<T>(table: string, options: {
        columns?: string;
        page?: number;
        limit?: number;
        order?: { column: string; ascending?: boolean };
        modify?: QueryModifier;
    } = {}): Promise<PaginatedResponse<T>> {
        const page = options.page ?? 1;
        const limit = options.limit ?? DEFAULT_PAGE_SIZE;
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabase.from(table).select(options.columns ?? '*', { count: 'exact' });
        if (options.modify) {
            query = options.modify(query);
        }
        if (options.order) {
            query = query.order(options.order.column, { ascending: options.order.ascending ?? true });
        }

        const { data, error, count } = await query.range(from, to);
        if (error) throw new Error(error.message);
        return toPaginatedResponse((data ?? []) as T[], count, page, limit);
    }

    private mapExpenseFile(row: any): ExpenseFile {
        return {
            id: row.id,
            expense_id: row.expense_id,
            file_name: row.storage_path,
            original_name: row.original_name,
            file_path: row.storage_path,
            file_size: row.file_size,
            mime_type: row.mime_type,
            company_id: row.company_id,
            created_at: row.created_at,
        };
    }

    private async fetchProfileByAuthUser(): Promise<User | null> {
        const { data: auth } = await supabase.auth.getUser();
        const authUser = auth.user;
        if (!authUser) return null;

        const { data, error } = await supabase
            .from('profiles')
            .select(`
                id,
                auth_user_id,
                email,
                full_name,
                role,
                company_id,
                created_at,
                updated_at,
                company:companies (*)
            `)
            .eq('auth_user_id', authUser.id)
            .maybeSingle();

        if (error) throw new Error(error.message);
        return data ? this.mapUser(data) : null;
    }

    // Auth helpers --------------------------------------------------------
    async getProfile(): Promise<User> {
        const profile = await this.fetchProfileByAuthUser();
        if (!profile) throw new Error('Not authenticated');
        return profile;
    }

    async assignCurrentUserCompany(companyId: number): Promise<void> {
        const { data: auth } = await supabase.auth.getUser();
        const authUser = auth.user;
        if (!authUser) {
            throw new Error('Not authenticated');
        }

        const { error } = await supabase
            .from('profiles')
            .update({ company_id: companyId })
            .eq('auth_user_id', authUser.id);
        if (error) {
            throw new Error(error.message);
        }
    }

    // Companies -----------------------------------------------------------
    async getCompanies(params?: { page?: number; limit?: number; search?: string }): Promise<PaginatedResponse<Company>> {
        return this.paginatedSelect<Company>('companies', {
            page: params?.page,
            limit: params?.limit,
            order: { column: 'created_at', ascending: false },
            modify: (query) => {
                if (params?.search) {
                    query = query.or(`name.ilike.%${params.search}%,business_number.ilike.%${params.search}%`);
                }
                return query;
            },
        });
    }

    async getCompany(id: number): Promise<Company> {
        const { data, error } = await supabase.from('companies').select('*').eq('id', id).maybeSingle<Company>();
        if (error) throw new Error(error.message);
        if (!data) throw new Error('Company not found');
        return data;
    }

    async checkBusinessNumberExists(businessNumber: string): Promise<boolean> {
        const { data, error } = await supabase
            .from('companies')
            .select('id')
            .eq('business_number', businessNumber)
            .maybeSingle();
        if (error) {
            // If error is due to RLS (no access), assume it doesn't exist for this user's context
            if (error.code === 'PGRST116' || error.message.includes('row-level security')) {
                return false;
            }
            throw new Error(error.message);
        }
        return data !== null;
    }

    async createCompany(company: Omit<Company, 'id' | 'created_at' | 'updated_at'>): Promise<Company> {
        const { data, error } = await supabase.from('companies').insert(company).select('*').single<Company>();
        if (error) {
            // Provide user-friendly error messages for common constraint violations
            if (error.code === '23505') { // Unique constraint violation
                if (error.message.includes('business_number')) {
                    throw new Error(`A company with business number "${company.business_number}" already exists. Please use a different business number.`);
                }
                throw new Error('This company information already exists. Please check your details and try again.');
            }
            throw new Error(error.message);
        }
        return data;
    }

    async updateCompany(id: number, company: Partial<Company>): Promise<Company> {
        // Update the company - don't use select() as RLS WITH CHECK might block it
        const { data: updateResult, error: updateError } = await supabase
            .from('companies')
            .update(company)
            .eq('id', id)
            .select('id'); // Just select id to verify update happened

        if (updateError) {
            throw new Error(`Failed to update company: ${updateError.message}`);
        }

        // Check if update actually affected any rows
        if (!updateResult || updateResult.length === 0) {
            throw new Error('Update did not affect any rows. You may not have permission to update this company, or the company does not exist.');
        }

        // Fetch the updated company using getCompany which we know works with RLS
        // This avoids RLS issues with select after update
        return await this.getCompany(id);
    }

    async deleteCompany(id: number): Promise<void> {
        const { error } = await supabase.from('companies').delete().eq('id', id);
        if (error) throw new Error(error.message);
    }

    // User Company Memberships (Multi-Ownership) ------------------------------

    async createUserCompanyMembership(data: {
        company_id: number;
        role: 'owner' | 'manager' | 'accountant' | 'viewer';
        is_primary?: boolean;
        invite_status?: 'pending' | 'accepted';
    }): Promise<void> {
        // Get current user's profile ID
        const { data: auth } = await supabase.auth.getUser();
        const authUser = auth.user;
        if (!authUser) {
            throw new Error('Not authenticated');
        }

        // Get profile ID
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('auth_user_id', authUser.id)
            .single();

        if (profileError || !profile) {
            throw new Error('Profile not found');
        }

        // Create user_companies entry
        const { error } = await supabase.from('user_companies').insert({
            user_id: profile.id,
            company_id: data.company_id,
            role: data.role,
            is_primary: data.is_primary ?? true,
            invite_status: data.invite_status ?? 'accepted',
        });

        if (error) {
            if (error.code === '23505') { // Unique constraint violation
                throw new Error('You are already a member of this company');
            }
            throw new Error(error.message);
        }

        // Also update the profile's company_id for backward compatibility
        await supabase
            .from('profiles')
            .update({ company_id: data.company_id })
            .eq('auth_user_id', authUser.id);
    }

    async inviteShareholder(data: {
        company_id: number;
        email: string;
        name: string;
        role: 'owner' | 'manager' | 'accountant' | 'viewer';
        permissions?: ManagerPermissions;
    }): Promise<{ invite_token: string }> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        // Call backend to handle invitation (DB insert + Email)
        const response = await fetch(`${BACKEND_URL}/api/company-members/invite`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to send invitation');
        }

        const result = await response.json();
        return { invite_token: result.invite?.invite_token || '' };
    }

    async sendInvitationEmail(data: {
        email: string;
        name: string;
        role: 'owner' | 'manager' | 'accountant' | 'viewer';
        company_id: number;
        invite_token: string;
    }): Promise<void> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const response = await fetch(`${BACKEND_URL}/api/company-members/send-invitation`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to send invitation email');
        }
    }

    async updateManagerPermissions(
        membershipId: number,
        permissions: ManagerPermissions
    ): Promise<void> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const response = await fetch(`${BACKEND_URL}/api/company-members/${membershipId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ permissions }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update permissions');
        }
    }

    async getUserCompanies(): Promise<Array<{
        id: number;
        company_id: number;
        role: string;
        is_primary: boolean;
        invite_status: string;
        company: Company;
    }>> {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) throw new Error('Not authenticated');

        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('auth_user_id', auth.user.id)
            .single();

        if (!profile) return [];

        const { data, error } = await supabase
            .from('user_companies')
            .select(`
                id,
                company_id,
                role,
                is_primary,
                invite_status,
                company:companies (*)
            `)
            .eq('user_id', profile.id)
            .eq('invite_status', 'accepted')
            .order('is_primary', { ascending: false });

        if (error) throw new Error(error.message);
        // Cast to fix type inference from Supabase's nested select
        return (data ?? []).map((item: any) => ({
            ...item,
            company: Array.isArray(item.company) ? item.company[0] : item.company,
        }));
    }

    async getCompanyMembers(companyId: number): Promise<Array<{
        id: number;
        user_id: number;
        role: string;
        is_primary: boolean;
        invite_status: string;
        created_at: string;
        permissions?: ManagerPermissions | null;
        user: { id: number; email: string; full_name: string };
    }>> {
        const { data, error } = await supabase
            .from('user_companies')
            .select(`
                id,
                user_id,
                role,
                is_primary,
                invite_status,
                created_at,
                permissions,
                user:profiles!user_companies_user_id_fkey (id, email, full_name)
            `)
            .eq('company_id', companyId)
            .order('is_primary', { ascending: false });

        if (error) throw new Error(error.message);
        return (data ?? []).map((item: any) => ({
            ...item,
            user: Array.isArray(item.user) ? item.user[0] : item.user,
        }));
    }

    async updateMemberRole(membershipId: number, role: 'owner' | 'manager' | 'accountant' | 'viewer'): Promise<void> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const response = await fetch(`${BACKEND_URL}/api/company-members/${membershipId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ role }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update role');
        }
    }

    async removeMember(membershipId: number): Promise<void> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const response = await fetch(`${BACKEND_URL}/api/company-members/${membershipId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to remove member');
        }
    }

    async acceptInvitation(inviteToken: string): Promise<void> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const response = await fetch(`${BACKEND_URL}/api/company-members/accept`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ invite_token: inviteToken }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to accept invitation');
        }
    }

    async getPendingInvitations(companyId: number): Promise<Array<{
        id: number;
        email: string;
        name: string;
        role: string;
        created_at: string;
        expires_at: string;
    }>> {
        const { data, error } = await supabase
            .from('pending_shareholder_invites')
            .select('id, email, name, role, created_at, expires_at')
            .eq('company_id', companyId)
            .is('claimed_at', null)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        return data ?? [];
    }

    async cancelInvitation(inviteId: number): Promise<void> {
        const { error } = await supabase
            .from('pending_shareholder_invites')
            .delete()
            .eq('id', inviteId);

        if (error) throw new Error(error.message);
    }

    // Clients -------------------------------------------------------------
    async getClients(params?: { page?: number; limit?: number; search?: string; company_id?: number }): Promise<PaginatedResponse<Client>> {
        return this.paginatedSelect<Client>('clients', {
            columns: '*, company:companies(*)',
            page: params?.page,
            limit: params?.limit,
            order: { column: 'created_at', ascending: false },
            modify: (query) => {
                if (params?.company_id) query = query.eq('company_id', params.company_id);
                if (params?.search) {
                    query = query.or(`name.ilike.%${params.search}%,email.ilike.%${params.search}%`);
                }
                return query;
            },
        });
    }

    async getClient(id: number): Promise<Client> {
        const { data, error } = await supabase
            .from('clients')
            .select('*, company:companies(*)')
            .eq('id', id)
            .maybeSingle<Client>();
        if (error) throw new Error(error.message);
        if (!data) throw new Error('Client not found');
        return data;
    }

    async createClient(client: Omit<Client, 'id' | 'created_at' | 'updated_at' | 'company'>): Promise<Client> {
        const { data, error } = await supabase
            .from('clients')
            .insert(client)
            .select('*, company:companies(*)')
            .single<Client>();
        if (error) throw new Error(error.message);
        return data;
    }

    async updateClient(id: number, client: Partial<Client>): Promise<Client> {
        const { data, error } = await supabase
            .from('clients')
            .update(client)
            .eq('id', id)
            .select('*, company:companies(*)')
            .single<Client>();
        if (error) throw new Error(error.message);
        return data;
    }

    async deleteClient(id: number): Promise<void> {
        const { error } = await supabase.from('clients').delete().eq('id', id);
        if (error) throw new Error(error.message);
    }

    // Employees -----------------------------------------------------------
    async getEmployees(params?: { page?: number; limit?: number; search?: string; company_id?: number; status?: string }): Promise<PaginatedResponse<Employee>> {
        return this.paginatedSelect<Employee>('employees', {
            columns: '*, company:companies(*)',
            page: params?.page,
            limit: params?.limit,
            order: { column: 'created_at', ascending: false },
            modify: (query) => {
                if (params?.company_id) query = query.eq('company_id', params.company_id);
                if (params?.status) query = query.eq('status', params.status);
                if (params?.search) {
                    query = query.or(`first_name.ilike.%${params.search}%,last_name.ilike.%${params.search}%,email.ilike.%${params.search}%,employee_id.ilike.%${params.search}%`);
                }
                return query;
            },
        });
    }

    async getEmployee(id: number): Promise<Employee> {
        const { data, error } = await supabase
            .from('employees')
            .select('*, company:companies(*)')
            .eq('id', id)
            .maybeSingle<Employee>();
        if (error) throw new Error(error.message);
        if (!data) throw new Error('Employee not found');
        return data;
    }

    async createEmployee(employee: Omit<Employee, 'id' | 'created_at' | 'updated_at' | 'company' | 'auth_user_id' | 'employee_id'> & { employee_id?: string; initialPassword: string }): Promise<Employee> {
        const { initialPassword, ...employeeData } = employee;

        // Call Node server to create employee with auth user
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${BACKEND_URL}/api/employees`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
                ...employeeData,
                initialPassword,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create employee');
        }

        const createdEmployee = await response.json();
        return createdEmployee;
    }

    async updateEmployee(id: number, employee: Partial<Employee> & { newEmail?: string }): Promise<Employee> {
        const { newEmail, ...employeeData } = employee;
        const currentEmployee = await this.getEmployee(id);

        // If email changed, update auth user email via Node server
        if (newEmail && newEmail !== currentEmployee.email) {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error('Not authenticated');
            }

            const response = await fetch(`${BACKEND_URL}/api/employees/${id}/email`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    newEmail,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update employee email');
            }
        }

        // Update employee record
        const { data, error } = await supabase
            .from('employees')
            .update(employeeData)
            .eq('id', id)
            .select('*, company:companies(*)')
            .single<Employee>();
        if (error) throw new Error(error.message);
        return data;
    }

    async deleteEmployee(id: number, deleteAuthUser: boolean = true): Promise<void> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${BACKEND_URL}/api/employees/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
                deleteAuthUser,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete employee');
        }
    }

    async updateEmployeePassword(id: number, newPassword: string): Promise<void> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${BACKEND_URL}/api/employees/${id}/password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
                newPassword,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update employee password');
        }
    }

    async resetEmployeePassword(id: number): Promise<string> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${BACKEND_URL}/api/employees/${id}/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to reset employee password');
        }

        const result = await response.json();
        return result.password;
    }

    // Employee Schedules ---------------------------------------------------
    async getSchedules(params?: {
        page?: number;
        limit?: number;
        company_id?: number;
        employee_id?: number;
        start_date?: string;
        end_date?: string;
        status?: string;
    }): Promise<PaginatedResponse<EmployeeSchedule>> {
        // Only select needed employee fields to reduce query size and improve performance
        return this.paginatedSelect<EmployeeSchedule>('employee_schedules', {
            columns: '*, employee:employees(id, first_name, last_name, email)',
            page: params?.page,
            limit: params?.limit,
            order: { column: 'schedule_date', ascending: true },
            modify: (query) => {
                if (params?.company_id) query = query.eq('company_id', params.company_id);
                if (params?.employee_id) query = query.eq('employee_id', params.employee_id);
                if (params?.start_date) query = query.gte('schedule_date', params.start_date);
                if (params?.end_date) query = query.lte('schedule_date', params.end_date);
                if (params?.status) query = query.eq('status', params.status);
                return query;
            },
        });
    }

    async getSchedule(id: number): Promise<EmployeeSchedule> {
        const { data, error } = await supabase
            .from('employee_schedules')
            .select('*, employee:employees(id, first_name, last_name, email)')
            .eq('id', id)
            .maybeSingle<EmployeeSchedule>();
        if (error) throw new Error(error.message);
        if (!data) throw new Error('Schedule not found');
        return data;
    }

    async createSchedule(schedule: Omit<EmployeeSchedule, 'id' | 'created_at' | 'updated_at' | 'employee'>): Promise<EmployeeSchedule> {
        // Get current user's profile to set created_by
        const profile = await this.fetchProfileByAuthUser();
        const scheduleData: any = {
            ...schedule,
            created_by: profile?.id || null,
        };

        const { data, error } = await supabase
            .from('employee_schedules')
            .insert(scheduleData)
            .select('*, employee:employees(id, first_name, last_name, email)')
            .single<EmployeeSchedule>();
        if (error) throw new Error(error.message);
        return data;
    }

    async updateSchedule(id: number, schedule: Partial<EmployeeSchedule>): Promise<EmployeeSchedule> {
        const { data, error } = await supabase
            .from('employee_schedules')
            .update(schedule)
            .eq('id', id)
            .select('*, employee:employees(id, first_name, last_name, email)')
            .single<EmployeeSchedule>();
        if (error) throw new Error(error.message);
        return data;
    }

    async deleteSchedule(id: number): Promise<void> {
        const { error } = await supabase.from('employee_schedules').delete().eq('id', id);
        if (error) throw new Error(error.message);
    }

    // Timesheets -----------------------------------------------------------
    async getTimesheets(params?: {
        page?: number;
        limit?: number;
        company_id?: number;
        employee_id?: number;
        start_date?: string;
        end_date?: string;
        status?: string;
    }): Promise<PaginatedResponse<Timesheet>> {
        // Only select needed employee fields to reduce query size and improve performance
        return this.paginatedSelect<Timesheet>('timesheets', {
            columns: '*, employee:employees(id, first_name, last_name, email)',
            page: params?.page,
            limit: params?.limit,
            order: { column: 'timesheet_date', ascending: false },
            modify: (query) => {
                if (params?.company_id) query = query.eq('company_id', params.company_id);
                if (params?.employee_id) query = query.eq('employee_id', params.employee_id);
                if (params?.start_date) query = query.gte('timesheet_date', params.start_date);
                if (params?.end_date) query = query.lte('timesheet_date', params.end_date);
                if (params?.status) query = query.eq('status', params.status);
                return query;
            },
        });
    }

    async getTimesheet(id: number): Promise<Timesheet> {
        const { data, error } = await supabase
            .from('timesheets')
            .select('*, employee:employees(id, first_name, last_name, email)')
            .eq('id', id)
            .maybeSingle<Timesheet>();
        if (error) throw new Error(error.message);
        if (!data) throw new Error('Timesheet not found');
        return data;
    }

    async createTimesheet(timesheet: Omit<Timesheet, 'id' | 'created_at' | 'updated_at' | 'employee' | 'submitted_by' | 'approved_by' | 'approved_at' | 'rejection_reason'>): Promise<Timesheet> {
        // If created by owner, default status to 'approved', otherwise 'draft'
        const profile = await this.fetchProfileByAuthUser();
        const isOwner = profile && !profile.isEmployee;
        const timesheetData: any = {
            ...timesheet,
            status: isOwner ? (timesheet.status || 'approved') : (timesheet.status || 'draft'),
        };

        const { data, error } = await supabase
            .from('timesheets')
            .insert(timesheetData)
            .select('*, employee:employees(id, first_name, last_name, email)')
            .single<Timesheet>();
        if (error) throw new Error(error.message);
        return data;
    }

    async updateTimesheet(id: number, timesheet: Partial<Timesheet>): Promise<Timesheet> {
        const { data, error } = await supabase
            .from('timesheets')
            .update(timesheet)
            .eq('id', id)
            .select('*, employee:employees(id, first_name, last_name, email)')
            .single<Timesheet>();
        if (error) throw new Error(error.message);
        return data;
    }

    async submitTimesheet(id: number): Promise<Timesheet> {
        // Get current employee to set submitted_by
        const { data: auth } = await supabase.auth.getUser();
        const authUser = auth.user;
        if (!authUser) throw new Error('Not authenticated');

        const { data: employee } = await supabase
            .from('employees')
            .select('id')
            .eq('auth_user_id', authUser.id)
            .maybeSingle();

        if (!employee) throw new Error('Employee record not found');

        const { data, error } = await supabase
            .from('timesheets')
            .update({
                status: 'pending',
                submitted_by: employee.id,
            })
            .eq('id', id)
            .select('*, employee:employees(id, first_name, last_name, email)')
            .single<Timesheet>();
        if (error) throw new Error(error.message);
        return data;
    }

    async approveTimesheet(id: number): Promise<Timesheet> {
        const profile = await this.fetchProfileByAuthUser();
        if (!profile) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('timesheets')
            .update({
                status: 'approved',
                approved_by: profile.id,
                approved_at: new Date().toISOString(),
                rejection_reason: null,
            })
            .eq('id', id)
            .select('*, employee:employees(id, first_name, last_name, email)')
            .single<Timesheet>();
        if (error) throw new Error(error.message);
        return data;
    }

    async rejectTimesheet(id: number, reason: string): Promise<Timesheet> {
        const profile = await this.fetchProfileByAuthUser();
        if (!profile) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('timesheets')
            .update({
                status: 'rejected',
                approved_by: profile.id,
                approved_at: new Date().toISOString(),
                rejection_reason: reason,
            })
            .eq('id', id)
            .select('*, employee:employees(id, first_name, last_name, email)')
            .single<Timesheet>();
        if (error) throw new Error(error.message);
        return data;
    }

    async deleteTimesheet(id: number): Promise<void> {
        const { error } = await supabase.from('timesheets').delete().eq('id', id);
        if (error) throw new Error(error.message);
    }

    // Time Entries (Unified) ------------------------------------------------
    async getTimeEntries(params?: {
        page?: number;
        limit?: number;
        company_id?: number;
        employee_id?: number;
        start_date?: string;
        end_date?: string;
        status?: string;
        entry_type?: 'allotted' | 'submitted';
    }): Promise<PaginatedResponse<TimeEntry>> {
        return this.paginatedSelect<TimeEntry>('time_entries', {
            columns: '*, employee:employees(id, first_name, last_name, email), allotted_entry:time_entries!allotted_entry_id(*)',
            page: params?.page,
            limit: params?.limit,
            order: { column: 'entry_date', ascending: false },
            modify: (query) => {
                if (params?.company_id) query = query.eq('company_id', params.company_id);
                if (params?.employee_id) query = query.eq('employee_id', params.employee_id);
                if (params?.start_date) query = query.gte('entry_date', params.start_date);
                if (params?.end_date) query = query.lte('entry_date', params.end_date);
                if (params?.status) query = query.eq('status', params.status);
                if (params?.entry_type) query = query.eq('entry_type', params.entry_type);
                return query;
            },
        });
    }

    async getTimeEntry(id: number): Promise<TimeEntry> {
        const { data, error } = await supabase
            .from('time_entries')
            .select('*, employee:employees(id, first_name, last_name, email), allotted_entry:time_entries!allotted_entry_id(*)')
            .eq('id', id)
            .maybeSingle<TimeEntry>();
        if (error) throw new Error(error.message);
        if (!data) throw new Error('Time entry not found');
        return data;
    }

    async createTimeEntry(timeEntry: Omit<TimeEntry, 'id' | 'created_at' | 'updated_at' | 'employee' | 'allotted_entry'>): Promise<TimeEntry> {
        const profile = await this.fetchProfileByAuthUser();
        const timeEntryData: any = {
            ...timeEntry,
            created_by: profile?.id || null,
        };

        const { data, error } = await supabase
            .from('time_entries')
            .insert(timeEntryData)
            .select('*, employee:employees(id, first_name, last_name, email), allotted_entry:time_entries!allotted_entry_id(*)')
            .single<TimeEntry>();
        if (error) throw new Error(error.message);
        return data;
    }

    async updateTimeEntry(id: number, timeEntry: Partial<TimeEntry>): Promise<TimeEntry> {
        const { data, error } = await supabase
            .from('time_entries')
            .update(timeEntry)
            .eq('id', id)
            .select('*, employee:employees(id, first_name, last_name, email), allotted_entry:time_entries!allotted_entry_id(*)')
            .single<TimeEntry>();
        if (error) throw new Error(error.message);
        return data;
    }

    async deleteTimeEntry(id: number): Promise<void> {
        const { error } = await supabase.from('time_entries').delete().eq('id', id);
        if (error) throw new Error(error.message);
    }

    async submitTimeEntry(id: number): Promise<TimeEntry> {
        const { data: auth } = await supabase.auth.getUser();
        const authUser = auth.user;
        if (!authUser) throw new Error('Not authenticated');

        const { data: employee } = await supabase
            .from('employees')
            .select('id')
            .eq('auth_user_id', authUser.id)
            .maybeSingle();

        if (!employee) throw new Error('Employee record not found');

        const { data, error } = await supabase
            .from('time_entries')
            .update({
                status: 'pending',
                submitted_by: employee.id,
            })
            .eq('id', id)
            .select('*, employee:employees(id, first_name, last_name, email), allotted_entry:time_entries!allotted_entry_id(*)')
            .single<TimeEntry>();
        if (error) throw new Error(error.message);
        return data;
    }

    async approveTimeEntry(id: number): Promise<TimeEntry> {
        const profile = await this.fetchProfileByAuthUser();
        if (!profile) throw new Error('Not authenticated');

        // First get the entry to check if it has an allotted_entry_id
        const entry = await this.getTimeEntry(id);

        const updateData: any = {
            status: 'approved',
            approved_by: profile.id,
            approved_at: new Date().toISOString(),
            rejection_reason: null,
        };

        // If this is a submitted entry with an allotted entry, mark the allotted entry as completed
        if (entry.entry_type === 'submitted' && entry.allotted_entry_id) {
            await supabase
                .from('time_entries')
                .update({ status: 'completed' })
                .eq('id', entry.allotted_entry_id);
        }

        const { data, error } = await supabase
            .from('time_entries')
            .update(updateData)
            .eq('id', id)
            .select('*, employee:employees(id, first_name, last_name, email), allotted_entry:time_entries!allotted_entry_id(*)')
            .single<TimeEntry>();
        if (error) throw new Error(error.message);
        return data;
    }

    async rejectTimeEntry(id: number, reason: string): Promise<TimeEntry> {
        const profile = await this.fetchProfileByAuthUser();
        if (!profile) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('time_entries')
            .update({
                status: 'rejected',
                approved_by: profile.id,
                approved_at: new Date().toISOString(),
                rejection_reason: reason,
            })
            .eq('id', id)
            .select('*, employee:employees(id, first_name, last_name, email), allotted_entry:time_entries!allotted_entry_id(*)')
            .single<TimeEntry>();
        if (error) throw new Error(error.message);
        return data;
    }

    async getAllottedEntryForDate(employeeId: number, date: string): Promise<TimeEntry | null> {
        const { data, error } = await supabase
            .from('time_entries')
            .select('*, employee:employees(id, first_name, last_name, email)')
            .eq('employee_id', employeeId)
            .eq('entry_date', date)
            .eq('entry_type', 'allotted')
            .eq('status', 'scheduled')
            .maybeSingle<TimeEntry>();
        if (error) throw new Error(error.message);
        return data;
    }

    async getCompanyTimeMode(companyId: number): Promise<'allotted' | 'submitted' | null> {
        const { data, error } = await supabase
            .from('companies')
            .select('time_entry_mode')
            .eq('id', companyId)
            .maybeSingle();
        if (error) throw new Error(error.message);
        return (data?.time_entry_mode as 'allotted' | 'submitted' | null) ?? null;
    }

    async updateCompanyTimeMode(companyId: number, mode: 'allotted' | 'submitted'): Promise<void> {
        const { error } = await supabase
            .from('companies')
            .update({ time_entry_mode: mode })
            .eq('id', companyId);
        if (error) throw new Error(error.message);
    }

    // Invoices ------------------------------------------------------------
    async getInvoices(params?: { page?: number; limit?: number; search?: string; company_id?: number; client_id?: number; status?: string }): Promise<PaginatedResponse<Invoice>> {
        return this.paginatedSelect<Invoice>('invoices', {
            columns: '*, client:clients(*), items:invoice_items(*)',
            page: params?.page,
            limit: params?.limit,
            order: { column: 'issue_date', ascending: false },
            modify: (query) => {
                if (params?.company_id) query = query.eq('company_id', params.company_id);
                if (params?.client_id) query = query.eq('client_id', params.client_id);
                if (params?.status) query = query.eq('status', params.status);
                if (params?.search) {
                    query = query.ilike('invoice_number', `%${params.search}%`);
                }
                return query;
            },
        });
    }

    async getInvoice(id: number): Promise<Invoice> {
        const { data, error } = await supabase
            .from('invoices')
            .select('*, client:clients(*), items:invoice_items(*)')
            .eq('id', id)
            .maybeSingle<Invoice>();
        if (error) throw new Error(error.message);
        if (!data) throw new Error('Invoice not found');
        return data;
    }

    async createInvoice(payload: {
        client_id: number;
        issue_date: string;
        due_date: string;
        description?: string;
        company_id: number;
        items: Array<{ description: string; quantity: number; unit_price: number; }>;
    }): Promise<Invoice> {
        const { client_id, issue_date, due_date, description, company_id, items } = payload;
        const subtotal = items.reduce((total, item) => total + item.quantity * item.unit_price, 0);
        const company = await this.getCompany(company_id);
        const hst_amount = company.hst_registered ? subtotal * company.hst_rate : 0;
        const total = subtotal + hst_amount;

        // Generate invoice number: INV-FY-NNNN format (using fiscal year)
        const fiscalYear = company.fiscal_year_end
            ? getFiscalYear(new Date(issue_date), company.fiscal_year_end)
            : new Date(issue_date).getFullYear();
        const { data: existingInvoices, error: countError } = await supabase
            .from('invoices')
            .select('invoice_number')
            .eq('company_id', company_id)
            .like('invoice_number', `INV-${fiscalYear}-%`)
            .order('invoice_number', { ascending: false })
            .limit(1);

        if (countError) throw new Error(countError.message);

        let invoiceNumber: string;
        if (existingInvoices && existingInvoices.length > 0) {
            // Extract the number from the last invoice and increment
            const lastNumber = existingInvoices[0].invoice_number.match(/\d+$/);
            const nextNumber = lastNumber ? parseInt(lastNumber[0], 10) + 1 : 1;
            invoiceNumber = `INV-${fiscalYear}-${String(nextNumber).padStart(4, '0')}`;
        } else {
            // First invoice for this fiscal year
            invoiceNumber = `INV-${fiscalYear}-0001`;
        }

        const { data: invoice, error } = await supabase
            .from('invoices')
            .insert({
                invoice_number: invoiceNumber,
                client_id,
                issue_date,
                due_date,
                description,
                company_id,
                subtotal,
                hst_amount,
                total,
            })
            .select('*')
            .single<Invoice>();
        if (error) throw new Error(error.message);

        if (items.length > 0) {
            const itemPayload = items.map((item) => ({
                ...item,
                invoice_id: invoice.id,
                total: item.quantity * item.unit_price,
            }));
            const { error: itemError } = await supabase.from('invoice_items').insert(itemPayload);
            if (itemError) {
                await supabase.from('invoices').delete().eq('id', invoice.id);
                throw new Error(itemError.message);
            }
        }

        return this.getInvoice(invoice.id);
    }

    async updateInvoice(id: number, invoice: Partial<Invoice> & { items?: Array<{ description: string; quantity: number; unit_price: number; }> }): Promise<Invoice> {
        const { items, ...rest } = invoice;

        if (Object.keys(rest).length > 0) {
            const { error } = await supabase.from('invoices').update(rest).eq('id', id);
            if (error) throw new Error(error.message);
        }

        if (items) {
            const { error: deleteError } = await supabase.from('invoice_items').delete().eq('invoice_id', id);
            if (deleteError) throw new Error(deleteError.message);

            if (items.length > 0) {
                const payload = items.map((item) => ({
                    ...item,
                    invoice_id: id,
                    total: item.quantity * item.unit_price,
                }));
                const { error: insertError } = await supabase.from('invoice_items').insert(payload);
                if (insertError) throw new Error(insertError.message);
            }
        }

        return this.getInvoice(id);
    }

    async deleteInvoice(id: number): Promise<void> {
        const { error } = await supabase.from('invoices').delete().eq('id', id);
        if (error) throw new Error(error.message);
    }

    // Recurring Invoices --------------------------------------------------
    async getRecurringInvoices(companyId: number): Promise<RecurringInvoice[]> {
        const { data, error } = await supabase
            .from('recurring_invoices')
            .select('*, client:clients(*)')
            .eq('company_id', companyId)
            .order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        if (!data) return [];
        return data.map((item) => ({
            ...item,
            items: (item.items as any) || [],
        }));
    }

    async createRecurringInvoice(payload: {
        company_id: number;
        client_id: number;
        template_name: string;
        description?: string;
        items: Array<{ description: string; quantity: number; unit_price: number }>;
        frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
        day_of_month?: number;
        next_generation_date: string;
        end_date?: string;
    }): Promise<RecurringInvoice> {
        const { data, error } = await supabase
            .from('recurring_invoices')
            .insert({
                ...payload,
                is_active: true,
            })
            .select('*, client:clients(*)')
            .single<RecurringInvoice>();
        if (error) throw new Error(error.message);
        if (!data) throw new Error('Failed to create recurring invoice');
        return {
            ...data,
            items: (data.items as any) || [],
        };
    }

    async updateRecurringInvoice(id: number, payload: Partial<RecurringInvoice>): Promise<RecurringInvoice> {
        const { data, error } = await supabase
            .from('recurring_invoices')
            .update(payload)
            .eq('id', id)
            .select('*, client:clients(*)')
            .single<RecurringInvoice>();
        if (error) throw new Error(error.message);
        if (!data) throw new Error('Recurring invoice not found');
        return {
            ...data,
            items: (data.items as any) || [],
        };
    }

    async deleteRecurringInvoice(id: number): Promise<void> {
        const { error } = await supabase.from('recurring_invoices').delete().eq('id', id);
        if (error) throw new Error(error.message);
    }

    async toggleRecurringInvoice(id: number, is_active: boolean): Promise<RecurringInvoice> {
        return this.updateRecurringInvoice(id, { is_active });
    }

    // Expense categories --------------------------------------------------
    /**
     * Returns a global list of expense categories shared across all companies.
     * Categories are treated as generic; no company_id scoping is applied.
     */
    async getExpenseCategories(params?: { page?: number; limit?: number; search?: string }): Promise<PaginatedResponse<ExpenseCategory>> {
        return this.paginatedSelect<ExpenseCategory>('expense_categories', {
            page: params?.page,
            limit: params?.limit,
            order: { column: 'name', ascending: true },
            modify: (query) => {
                if (params?.search) query = query.ilike('name', `%${params.search}%`);
                return query;
            },
        });
    }

    async getExpenseCategory(id: number): Promise<ExpenseCategory> {
        const { data, error } = await supabase.from('expense_categories').select('*').eq('id', id).maybeSingle<ExpenseCategory>();
        if (error) throw new Error(error.message);
        if (!data) throw new Error('Expense category not found');
        return data;
    }

    async createExpenseCategory(category: Omit<ExpenseCategory, 'id' | 'created_at' | 'updated_at'>): Promise<ExpenseCategory> {
        const { data, error } = await supabase.from('expense_categories').insert(category).select('*').single<ExpenseCategory>();
        if (error) throw new Error(error.message);
        return data;
    }

    async updateExpenseCategory(id: number, category: Partial<ExpenseCategory>): Promise<ExpenseCategory> {
        const { data, error } = await supabase.from('expense_categories').update(category).eq('id', id).select('*').single<ExpenseCategory>();
        if (error) throw new Error(error.message);
        return data;
    }

    async deleteExpenseCategory(id: number): Promise<void> {
        const { error } = await supabase.from('expense_categories').delete().eq('id', id);
        if (error) throw new Error(error.message);
    }

    // Expenses ------------------------------------------------------------
    async getExpenses(params?: { page?: number; limit?: number; search?: string; company_id?: number; category_id?: number; start_date?: string; end_date?: string }): Promise<PaginatedResponse<Expense>> {
        return this.paginatedSelect<Expense>('expenses', {
            columns: '*, category:expense_categories(*), files:expense_files(*)',
            page: params?.page,
            limit: params?.limit,
            order: { column: 'expense_date', ascending: false },
            modify: (query) => {
                if (params?.company_id) query = query.eq('company_id', params.company_id);
                if (params?.category_id) query = query.eq('category_id', params.category_id);
                if (params?.start_date) query = query.gte('expense_date', params.start_date);
                if (params?.end_date) query = query.lte('expense_date', params.end_date);
                if (params?.search) query = query.ilike('description', `%${params.search}%`);
                return query;
            },
        }).then((response) => ({
            ...response,
            data: response.data.map((expense) => ({
                ...expense,
                files: expense.files?.map(this.mapExpenseFile.bind(this)),
            })),
        }));
    }

    async getExpense(id: number): Promise<Expense> {
        const { data, error } = await supabase
            .from('expenses')
            .select('*, category:expense_categories(*), files:expense_files(*)')
            .eq('id', id)
            .maybeSingle<Expense>();
        if (error) throw new Error(error.message);
        if (!data) throw new Error('Expense not found');
        return {
            ...data,
            files: data.files?.map(this.mapExpenseFile.bind(this)),
        };
    }

    async createExpense(expense: Omit<Expense, 'id' | 'company' | 'files' | 'created_at' | 'updated_at'>): Promise<Expense> {
        const payload = {
            ...expense,
            receipt_attached: expense.receipt_attached ?? false,
        };
        const { data, error } = await supabase
            .from('expenses')
            .insert(payload)
            .select('*, category:expense_categories(*), files:expense_files(*)')
            .single<Expense>();
        if (error) throw new Error(error.message);
        return {
            ...data,
            files: data.files?.map(this.mapExpenseFile.bind(this)),
        };
    }

    async updateExpense(id: number, expense: Partial<Expense>): Promise<Expense> {
        const { data, error } = await supabase
            .from('expenses')
            .update(expense)
            .eq('id', id)
            .select('*, category:expense_categories(*), files:expense_files(*)')
            .single<Expense>();
        if (error) throw new Error(error.message);
        return {
            ...data,
            files: data.files?.map(this.mapExpenseFile.bind(this)),
        };
    }

    async createExpensesBulk(expenses: Array<Omit<Expense, 'id' | 'company' | 'files' | 'created_at' | 'updated_at'>>): Promise<Expense[]> {
        // Validate all expenses have company_id
        const companyId = this.ensureCompanyId(expenses[0]?.company_id);

        // Prepare payloads
        const payloads = expenses.map(expense => ({
            ...expense,
            company_id: companyId,
            receipt_attached: expense.receipt_attached ?? false,
        }));

        // Insert all expenses in a single transaction
        const { data, error } = await supabase
            .from('expenses')
            .insert(payloads)
            .select('*, category:expense_categories(*), files:expense_files(*)');

        if (error) {
            throw new Error(`Failed to create expenses: ${error.message}`);
        }

        if (!data) {
            return [];
        }

        return data.map(expense => ({
            ...expense,
            files: expense.files?.map(this.mapExpenseFile.bind(this)),
        }));
    }

    async deleteExpense(id: number): Promise<void> {
        // First, get all files associated with this expense
        const { data: files, error: filesError } = await supabase
            .from('expense_files')
            .select('*')
            .eq('expense_id', id);

        if (filesError) throw new Error(filesError.message);

        // Delete all files from storage
        if (files && files.length > 0) {
            const storagePaths = files.map(file => file.storage_path);
            const { error: storageError } = await supabase.storage
                .from(SUPABASE_STORAGE_BUCKET)
                .remove(storagePaths);

            if (storageError) throw new Error(storageError.message);

            // Delete all file records from the database
            const { error: deleteFilesError } = await supabase
                .from('expense_files')
                .delete()
                .eq('expense_id', id);

            if (deleteFilesError) throw new Error(deleteFilesError.message);
        }

        // Finally, delete the expense record
        const { error } = await supabase.from('expenses').delete().eq('id', id);
        if (error) throw new Error(error.message);
    }

    // Mileage expense helper method
    async createMileageExpense(data: {
        company_id: number;
        trip_date: string;
        start_location: string;
        end_location: string;
        distance_km: number;
        purpose?: string;
        vehicle_description?: string;
        mileage_rate_per_km?: number;
        paid_by?: 'corp' | 'owner';
    }): Promise<Expense> {
        const rate = data.mileage_rate_per_km ?? CRA_MILEAGE_RATE;
        const amount = parseFloat((data.distance_km * rate).toFixed(2));

        // Generate description
        const description = data.purpose
            ? data.purpose
            : `Mileage: ${data.start_location} to ${data.end_location} - ${data.distance_km}km`;

        // Find Vehicle & Automobile category (id: 13)
        const { data: vehicleCategory, error: categoryError } = await supabase
            .from('expense_categories')
            .select('id')
            .eq('name', 'Vehicle & Automobile')
            .maybeSingle();

        if (categoryError) throw new Error(categoryError.message);
        if (!vehicleCategory) throw new Error('Vehicle & Automobile category not found');

        // Create expense with mileage fields
        return this.createExpense({
            description,
            category_id: vehicleCategory.id,
            amount,
            hst_paid: 0, // Mileage allowance is not subject to HST
            deduction_percentage: 1.0, // Business mileage is fully deductible
            expense_date: data.trip_date,
            receipt_attached: false,
            paid_by: data.paid_by ?? 'corp',
            company_id: data.company_id,
            // Mileage-specific fields
            distance_km: data.distance_km,
            start_location: data.start_location,
            end_location: data.end_location,
            vehicle_description: data.vehicle_description ?? null,
            mileage_rate_per_km: rate,
        });
    }

    // Expense files -------------------------------------------------------
    async uploadExpenseFile(expenseId: number, file: File): Promise<ExpenseFile> {
        const expense = await this.getExpense(expenseId);
        const companyId = this.ensureCompanyId(expense.company_id);
        const extension = file.name.split('.').pop();
        const objectPath = `${companyId}/${expenseId}/${uuid()}.${extension}`;

        const { error: uploadError } = await supabase.storage
            .from(SUPABASE_STORAGE_BUCKET)
            .upload(objectPath, file, { upsert: false, contentType: file.type });
        if (uploadError) throw new Error(uploadError.message);

        const { data, error } = await supabase
            .from('expense_files')
            .insert({
                expense_id: expenseId,
                storage_path: objectPath,
                original_name: file.name,
                file_size: file.size,
                mime_type: file.type,
                company_id: companyId,
            })
            .select('*')
            .single();
        if (error) throw new Error(error.message);
        return this.mapExpenseFile(data);
    }

    async getExpenseFiles(expenseId: number): Promise<ExpenseFile[]> {
        const { data, error } = await supabase
            .from('expense_files')
            .select('*')
            .eq('expense_id', expenseId);
        if (error) throw new Error(error.message);
        return (data ?? []).map(this.mapExpenseFile.bind(this));
    }

    async downloadExpenseFile(fileId: number): Promise<Blob> {
        const { data, error } = await supabase.from('expense_files').select('*').eq('id', fileId).maybeSingle();
        if (error) throw new Error(error.message);
        if (!data) throw new Error('File not found');

        const { data: file, error: downloadError } = await supabase.storage
            .from(SUPABASE_STORAGE_BUCKET)
            .download(data.storage_path);
        if (downloadError) throw new Error(downloadError.message);
        return file;
    }

    async deleteExpenseFile(fileId: number): Promise<void> {
        const { data, error } = await supabase.from('expense_files').select('*').eq('id', fileId).maybeSingle();
        if (error) throw new Error(error.message);
        if (!data) throw new Error('File not found');

        const { error: storageError } = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).remove([data.storage_path]);
        if (storageError) throw new Error(storageError.message);

        const { error: deleteError } = await supabase.from('expense_files').delete().eq('id', fileId);
        if (deleteError) throw new Error(deleteError.message);
    }

    // Dividends -----------------------------------------------------------
    async getDividends(params?: { page?: number; limit?: number; company_id?: number; status?: string; start_date?: string; end_date?: string }): Promise<PaginatedResponse<Dividend>> {
        return this.paginatedSelect<Dividend>('dividends', {
            columns: '*, company:companies(*)',
            page: params?.page,
            limit: params?.limit,
            order: { column: 'declaration_date', ascending: false },
            modify: (query) => {
                if (params?.company_id) query = query.eq('company_id', params.company_id);
                if (params?.status) query = query.eq('status', params.status);
                if (params?.start_date) query = query.gte('declaration_date', params.start_date);
                if (params?.end_date) query = query.lte('declaration_date', params.end_date);
                return query;
            },
        });
    }

    async getDividend(id: number): Promise<Dividend> {
        const { data, error } = await supabase
            .from('dividends')
            .select('*, company:companies(*)')
            .eq('id', id)
            .maybeSingle<Dividend>();
        if (error) throw new Error(error.message);
        if (!data) throw new Error('Dividend not found');
        return data;
    }

    async createDividend(dividend: Omit<Dividend, 'id' | 'company' | 'created_at' | 'updated_at'>): Promise<Dividend> {
        const { data, error } = await supabase
            .from('dividends')
            .insert(dividend)
            .select('*, company:companies(*)')
            .single<Dividend>();
        if (error) throw new Error(error.message);
        return data;
    }

    async updateDividend(id: number, dividend: Partial<Dividend>): Promise<Dividend> {
        const { data, error } = await supabase
            .from('dividends')
            .update(dividend)
            .eq('id', id)
            .select('*, company:companies(*)')
            .single<Dividend>();
        if (error) throw new Error(error.message);
        return data;
    }

    async deleteDividend(id: number): Promise<void> {
        const { error } = await supabase.from('dividends').delete().eq('id', id);
        if (error) throw new Error(error.message);
    }

    // Dividend Recipients ---------------------------------------------------
    async getDividendRecipients(dividend_id: number): Promise<DividendRecipient[]> {
        const { data, error } = await supabase
            .from('dividend_recipients')
            .select('*')
            .eq('dividend_id', dividend_id)
            .order('created_at', { ascending: true });
        if (error) throw new Error(error.message);
        return data || [];
    }

    async createDividendRecipient(recipient: Omit<DividendRecipient, 'id' | 'created_at' | 'updated_at'>): Promise<DividendRecipient> {
        const { data, error } = await supabase
            .from('dividend_recipients')
            .insert(recipient)
            .select()
            .single<DividendRecipient>();
        if (error) throw new Error(error.message);
        return data;
    }

    async updateDividendRecipient(id: number, recipient: Partial<DividendRecipient>): Promise<DividendRecipient> {
        const { data, error } = await supabase
            .from('dividend_recipients')
            .update(recipient)
            .eq('id', id)
            .select()
            .single<DividendRecipient>();
        if (error) throw new Error(error.message);
        return data;
    }

    async deleteDividendRecipient(id: number): Promise<void> {
        const { error } = await supabase.from('dividend_recipients').delete().eq('id', id);
        if (error) throw new Error(error.message);
    }

    // Dividend Document Generation ------------------------------------------
    // Note: These methods are placeholders. Document generation is handled directly
    // in the UI components using the generator functions from t5Generator.ts
    // and dividendMinutesGenerator.ts

    // Salaries -----------------------------------------------------------
    async getSalaries(params?: { page?: number; limit?: number; company_id?: number; status?: string; start_date?: string; end_date?: string; employee_id?: number }): Promise<PaginatedResponse<Salary>> {
        return this.paginatedSelect<Salary>('salaries', {
            columns: '*, company:companies(*), employee:employees(*)',
            page: params?.page,
            limit: params?.limit,
            order: { column: 'payment_date', ascending: false },
            modify: (query) => {
                if (params?.company_id) query = query.eq('company_id', params.company_id);
                if (params?.status) query = query.eq('status', params.status);
                if (params?.employee_id) query = query.eq('employee_id', params.employee_id);
                if (params?.start_date) query = query.gte('payment_date', params.start_date);
                if (params?.end_date) query = query.lte('payment_date', params.end_date);
                return query;
            },
        });
    }

    async getSalary(id: number): Promise<Salary> {
        const { data, error } = await supabase
            .from('salaries')
            .select('*, company:companies(*), employee:employees(*)')
            .eq('id', id)
            .maybeSingle<Salary>();
        if (error) throw new Error(error.message);
        if (!data) throw new Error('Salary not found');
        return data;
    }

    async createSalary(salary: Omit<Salary, 'id' | 'company' | 'employee' | 'created_at' | 'updated_at'>): Promise<Salary> {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { employee, ...salaryData } = salary as any;
        const { data, error } = await supabase
            .from('salaries')
            .insert(salaryData)
            .select('*, company:companies(*), employee:employees(*)')
            .single<Salary>();
        if (error) throw new Error(error.message);
        return data;
    }

    async updateSalary(id: number, salary: Partial<Salary>): Promise<Salary> {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { employee, ...salaryData } = salary as any;
        const { data, error } = await supabase
            .from('salaries')
            .update(salaryData)
            .eq('id', id)
            .select('*, company:companies(*), employee:employees(*)')
            .single<Salary>();
        if (error) throw new Error(error.message);
        return data;
    }

    async deleteSalary(id: number): Promise<void> {
        const { error } = await supabase.from('salaries').delete().eq('id', id);
        if (error) throw new Error(error.message);
    }

    // Tax returns ---------------------------------------------------------
    async getTaxReturns(params?: { page?: number; limit?: number; company_id?: number; fiscal_year?: number }): Promise<PaginatedResponse<TaxReturn>> {
        return this.paginatedSelect<TaxReturn>('tax_returns', {
            columns: '*, company:companies(*)',
            page: params?.page,
            limit: params?.limit,
            order: { column: 'fiscal_year', ascending: false },
            modify: (query) => {
                if (params?.company_id) query = query.eq('company_id', params.company_id);
                if (params?.fiscal_year) query = query.eq('fiscal_year', params.fiscal_year);
                return query;
            },
        });
    }

    async getTaxReturn(id: number): Promise<TaxReturn> {
        const { data, error } = await supabase
            .from('tax_returns')
            .select('*, company:companies(*)')
            .eq('id', id)
            .maybeSingle<TaxReturn>();
        if (error) throw new Error(error.message);
        if (!data) throw new Error('Tax return not found');
        return data;
    }


    async createTaxReturn(taxReturn: Omit<TaxReturn, 'id' | 'company' | 'created_at' | 'updated_at'>): Promise<TaxReturn> {
        const { data, error } = await supabase
            .from('tax_returns')
            .insert(taxReturn)
            .select('*, company:companies(*)')
            .single<TaxReturn>();
        if (error) throw new Error(error.message);
        return data;
    }

    async updateTaxReturn(id: number, taxReturn: Partial<TaxReturn>): Promise<TaxReturn> {
        const { data, error } = await supabase
            .from('tax_returns')
            .update(taxReturn)
            .eq('id', id)
            .select('*, company:companies(*)')
            .single<TaxReturn>();
        if (error) throw new Error(error.message);
        return data;
    }

    async deleteTaxReturn(id: number): Promise<void> {
        const { error } = await supabase.from('tax_returns').delete().eq('id', id);
        if (error) throw new Error(error.message);
    }

    // Income entries ------------------------------------------------------
    async getIncomeEntries(params?: { page?: number; limit?: number; company_id?: number; income_type?: string; start_date?: string; end_date?: string }): Promise<PaginatedResponse<IncomeEntry>> {
        return this.paginatedSelect<IncomeEntry>('income_entries', {
            columns: '*, client:clients(*)',
            page: params?.page,
            limit: params?.limit,
            order: { column: 'income_date', ascending: false },
            modify: (query) => {
                if (params?.company_id) query = query.eq('company_id', params.company_id);
                if (params?.income_type) query = query.eq('income_type', params.income_type);
                if (params?.start_date) query = query.gte('income_date', params.start_date);
                if (params?.end_date) query = query.lte('income_date', params.end_date);
                return query;
            },
        });
    }

    async getIncomeEntry(id: number): Promise<IncomeEntry> {
        const { data, error } = await supabase
            .from('income_entries')
            .select('*, client:clients(*)')
            .eq('id', id)
            .maybeSingle<IncomeEntry>();
        if (error) throw new Error(error.message);
        if (!data) throw new Error('Income entry not found');
        return data;
    }

    async createIncomeEntry(entry: {
        description: string;
        amount: number;
        income_type: 'client' | 'capital' | 'other';
        client_id?: number;
        income_date: string;
        company_id: number;
        hst_amount?: number;
    }): Promise<IncomeEntry> {
        const payload = {
            ...entry,
            hst_amount: entry.hst_amount ?? 0,
            total: entry.amount + (entry.hst_amount ?? 0),
        };
        const { data, error } = await supabase
            .from('income_entries')
            .insert(payload)
            .select('*, client:clients(*)')
            .single<IncomeEntry>();
        if (error) throw new Error(error.message);
        return data;
    }

    async updateIncomeEntry(id: number, entry: Partial<IncomeEntry>): Promise<IncomeEntry> {
        const { data, error } = await supabase
            .from('income_entries')
            .update(entry)
            .eq('id', id)
            .select('*, client:clients(*)')
            .single<IncomeEntry>();
        if (error) throw new Error(error.message);
        return data;
    }

    async deleteIncomeEntry(id: number): Promise<void> {
        const { error } = await supabase.from('income_entries').delete().eq('id', id);
        if (error) throw new Error(error.message);
    }

    // HST payments --------------------------------------------------------
    async getHSTPayments(params?: { page?: number; limit?: number; company_id?: number; start_date?: string; end_date?: string }): Promise<PaginatedResponse<HSTPayment>> {
        return this.paginatedSelect<HSTPayment>('hst_payments', {
            columns: '*, company:companies(*)',
            page: params?.page,
            limit: params?.limit,
            order: { column: 'payment_date', ascending: false },
            modify: (query) => {
                if (params?.company_id) query = query.eq('company_id', params.company_id);
                if (params?.start_date) query = query.gte('payment_date', params.start_date);
                if (params?.end_date) query = query.lte('payment_date', params.end_date);
                return query;
            },
        });
    }

    async getHSTPayment(id: number): Promise<HSTPayment> {
        const { data, error } = await supabase
            .from('hst_payments')
            .select('*, company:companies(*)')
            .eq('id', id)
            .maybeSingle<HSTPayment>();
        if (error) throw new Error(error.message);
        if (!data) throw new Error('HST payment not found');
        return data;
    }

    async createHSTPayment(payment: {
        amount: number;
        payment_date: string;
        period_start: string;
        period_end: string;
        reference?: string;
        notes?: string;
        company_id: number;
    }): Promise<HSTPayment> {
        const { data, error } = await supabase
            .from('hst_payments')
            .insert(payment)
            .select('*, company:companies(*)')
            .single<HSTPayment>();
        if (error) throw new Error(error.message);
        return data;
    }

    async updateHSTPayment(id: number, payment: Partial<HSTPayment>): Promise<HSTPayment> {
        const { data, error } = await supabase
            .from('hst_payments')
            .update(payment)
            .eq('id', id)
            .select('*, company:companies(*)')
            .single<HSTPayment>();
        if (error) throw new Error(error.message);
        return data;
    }

    async deleteHSTPayment(id: number): Promise<void> {
        const { error } = await supabase.from('hst_payments').delete().eq('id', id);
        if (error) throw new Error(error.message);
    }

    // Capital assets ------------------------------------------------------
    private computeAssetDerivedFields(asset: {
        purchase_amount: number;
        hst_paid: number;
        accumulated_depreciation?: number;
    }) {
        const total_cost = asset.purchase_amount + asset.hst_paid;
        const accumulated_depreciation = asset.accumulated_depreciation ?? 0;
        const depreciable_amount = total_cost;
        const book_value = Math.max(0, total_cost - accumulated_depreciation);
        return { total_cost, depreciable_amount, accumulated_depreciation, book_value };
    }

    async getCapitalAssets(params?: { page?: number; limit?: number; search?: string; company_id?: number; category_id?: number; cca_class?: string; start_date?: string; end_date?: string }): Promise<PaginatedResponse<CapitalAsset>> {
        return this.paginatedSelect<CapitalAsset>('capital_assets', {
            // Include depreciation entries so CCA flows through to reports and tax calculator
            columns: '*, category:expense_categories(*), depreciation_entries:depreciation_entries(*)',
            page: params?.page,
            limit: params?.limit,
            order: { column: 'purchase_date', ascending: false },
            modify: (query) => {
                if (params?.company_id) query = query.eq('company_id', params.company_id);
                if (params?.category_id) query = query.eq('category_id', params.category_id);
                if (params?.cca_class) query = query.eq('cca_class', params.cca_class);
                if (params?.search) query = query.ilike('description', `%${params.search}%`);
                if (params?.start_date) query = query.gte('purchase_date', params.start_date);
                if (params?.end_date) query = query.lte('purchase_date', params.end_date);
                return query;
            },
        });
    }


    async getCapitalAsset(id: number): Promise<CapitalAsset> {
        const { data, error } = await supabase
            .from('capital_assets')
            .select('*, category:expense_categories(*), depreciation_entries:depreciation_entries(*)')
            .eq('id', id)
            .maybeSingle<CapitalAsset>();
        if (error) throw new Error(error.message);
        if (!data) throw new Error('Capital asset not found');
        return data;
    }

    async createCapitalAsset(asset: {
        description: string;
        category_id: number;
        purchase_date: string;
        purchase_amount: number;
        hst_paid: number;
        cca_class: string;
        paid_by: 'corp' | 'owner';
        receipt_attached: boolean;
        company_id: number;
    }): Promise<CapitalAsset> {
        const { data: cca, error: ccaError } = await supabase
            .from('cca_classes')
            .select('rate')
            .eq('class_number', asset.cca_class)
            .maybeSingle();
        if (ccaError) throw new Error(ccaError.message);
        const derived = {
            ...this.computeAssetDerivedFields({
                purchase_amount: asset.purchase_amount,
                hst_paid: asset.hst_paid,
            }),
            cca_rate: cca?.rate ?? 0,
        };
        const { data, error } = await supabase
            .from('capital_assets')
            .insert({ ...asset, ...derived })
            .select('*, category:expense_categories(*)')
            .single<CapitalAsset>();
        if (error) throw new Error(error.message);
        return data;
    }

    async updateCapitalAsset(id: number, asset: Partial<CapitalAsset>): Promise<CapitalAsset> {
        let payload = { ...asset };
        if (asset.purchase_amount !== undefined || asset.hst_paid !== undefined || asset.accumulated_depreciation !== undefined) {
            const current = await this.getCapitalAsset(id);
            payload = {
                ...payload,
                ...this.computeAssetDerivedFields({
                    purchase_amount: asset.purchase_amount ?? current.purchase_amount,
                    hst_paid: asset.hst_paid ?? current.hst_paid,
                    accumulated_depreciation: asset.accumulated_depreciation ?? current.accumulated_depreciation,
                }),
            };
        }
        if (asset.cca_class) {
            const { data: cca, error: ccaError } = await supabase
                .from('cca_classes')
                .select('rate')
                .eq('class_number', asset.cca_class)
                .maybeSingle();
            if (ccaError) throw new Error(ccaError.message);
            payload.cca_rate = cca?.rate ?? 0;
        }
        const { data, error } = await supabase
            .from('capital_assets')
            .update(payload)
            .eq('id', id)
            .select('*, category:expense_categories(*)')
            .single<CapitalAsset>();
        if (error) throw new Error(error.message);
        return data;
    }

    async deleteCapitalAsset(id: number): Promise<void> {
        const { error } = await supabase.from('capital_assets').delete().eq('id', id);
        if (error) throw new Error(error.message);
    }

    async calculateDepreciation(id: number, fiscalYear: number): Promise<{
        capital_asset_id: number;
        fiscal_year: number;
        depreciation_amount: number;
        is_half_year_rule: boolean;
        remaining_book_value: number;
    }> {
        const asset = await this.getCapitalAsset(id);
        const purchaseYear = new Date(asset.purchase_date).getFullYear();
        const isHalfYear = fiscalYear === purchaseYear;
        const rate = isHalfYear ? asset.cca_rate * 0.5 : asset.cca_rate;
        const depreciation_amount = Math.min(asset.book_value * rate, asset.book_value);
        const remaining_book_value = asset.book_value - depreciation_amount;
        return {
            capital_asset_id: id,
            fiscal_year: fiscalYear,
            depreciation_amount,
            is_half_year_rule: isHalfYear,
            remaining_book_value,
        };
    }

    async createDepreciationEntry(id: number, entry: { fiscal_year: number; entry_date: string; depreciation_amount?: number }): Promise<DepreciationEntry> {
        // Always use calculateDepreciation to determine half-year rule correctly,
        // but allow the caller to override the amount if they provided one.
        const baseCalculation = await this.calculateDepreciation(id, entry.fiscal_year);
        const calculation = {
            ...baseCalculation,
            depreciation_amount: entry.depreciation_amount ?? baseCalculation.depreciation_amount,
        };
        const { data, error } = await supabase
            .from('depreciation_entries')
            .insert({
                capital_asset_id: id,
                company_id: (await this.getCapitalAsset(id)).company_id,
                fiscal_year: entry.fiscal_year,
                entry_date: entry.entry_date,
                depreciation_amount: calculation.depreciation_amount,
                is_half_year_rule: calculation.is_half_year_rule,
            })
            .select('*')
            .single<DepreciationEntry>();
        if (error) throw new Error(error.message);
        return data;
    }

    // Owner payments ------------------------------------------------------
    async getOwnerPayments(params?: { page?: number; limit?: number; company_id?: number; start_date?: string; end_date?: string; payment_type?: string }): Promise<PaginatedResponse<OwnerPayment>> {
        return this.paginatedSelect<OwnerPayment>('owner_payments', {
            page: params?.page,
            limit: params?.limit,
            order: { column: 'payment_date', ascending: false },
            modify: (query) => {
                if (params?.company_id) query = query.eq('company_id', params.company_id);
                if (params?.payment_type) query = query.eq('payment_type', params.payment_type);
                if (params?.start_date) query = query.gte('payment_date', params.start_date);
                if (params?.end_date) query = query.lte('payment_date', params.end_date);
                return query;
            },
        });
    }

    async getOwnerPayment(id: number): Promise<OwnerPayment> {
        const { data, error } = await supabase
            .from('owner_payments')
            .select('*')
            .eq('id', id)
            .maybeSingle<OwnerPayment>();
        if (error) throw new Error(error.message);
        if (!data) throw new Error('Owner payment not found');
        return data;
    }

    async createOwnerPayment(payment: {
        description: string;
        amount: number;
        payment_date: string;
        payment_type: 'reimbursement' | 'loan_repayment' | 'other';
        reference?: string;
        notes?: string;
        company_id: number;
    }): Promise<OwnerPayment> {
        const { data, error } = await supabase
            .from('owner_payments')
            .insert(payment)
            .select('*')
            .single<OwnerPayment>();
        if (error) throw new Error(error.message);
        return data;
    }

    async updateOwnerPayment(id: number, payment: Partial<OwnerPayment>): Promise<OwnerPayment> {
        const { data, error } = await supabase
            .from('owner_payments')
            .update(payment)
            .eq('id', id)
            .select('*')
            .single<OwnerPayment>();
        if (error) throw new Error(error.message);
        return data;
    }

    async deleteOwnerPayment(id: number): Promise<void> {
        const { error } = await supabase.from('owner_payments').delete().eq('id', id);
        if (error) throw new Error(error.message);
    }

    async getOwnerPaymentStats(params?: { company_id?: number; start_date?: string; end_date?: string }): Promise<{
        total_paid: number;
        reimbursement_total: number;
        loan_repayment_total: number;
        other_total: number;
        payment_count: number;
        start_date: string;
        end_date: string;
    }> {
        let query = supabase.from('owner_payments').select('*');
        if (params?.company_id) query = query.eq('company_id', params.company_id);
        if (params?.start_date) query = query.gte('payment_date', params.start_date);
        if (params?.end_date) query = query.lte('payment_date', params.end_date);

        const { data, error } = await query;
        if (error) throw new Error(error.message);
        const payments: OwnerPayment[] = (data ?? []) as OwnerPayment[];
        const stats = payments.reduce<{
            total_paid: number;
            reimbursement_total: number;
            loan_repayment_total: number;
            other_total: number;
            payment_count: number;
        }>(
            (acc, payment) => {
                acc.total_paid += payment.amount;
                acc.payment_count += 1;
                if (payment.payment_type === 'reimbursement') acc.reimbursement_total += payment.amount;
                else if (payment.payment_type === 'loan_repayment') acc.loan_repayment_total += payment.amount;
                else acc.other_total += payment.amount;
                return acc;
            },
            {
                total_paid: 0,
                reimbursement_total: 0,
                loan_repayment_total: 0,
                other_total: 0,
                payment_count: 0,
            }
        );
        return {
            ...stats,
            start_date: params?.start_date ?? '',
            end_date: params?.end_date ?? '',
        };
    }

    // CCA classes ---------------------------------------------------------
    async getCCAClasses(): Promise<CCAClass[]> {
        const { data, error } = await supabase.from('cca_classes').select('*').order('class_number', { ascending: true });
        if (error) throw new Error(error.message);
        return data ?? [];
    }

    // Reports -------------------------------------------------------------
    async generateTaxReport(request: {
        company_id: number;
        fiscal_year: number;
        start_date?: string;
        end_date?: string;
        report_type: 'comprehensive' | 'pandl' | 'hst' | 'retained';
    }): Promise<Blob> {
        const company = await this.getCompany(request.company_id);
        const invoices = await this.getInvoices({ company_id: request.company_id, limit: 1000 });
        const expenses = await this.getExpenses({ company_id: request.company_id, limit: 1000 });
        const dividends = await this.getDividends({ company_id: request.company_id, limit: 1000 });

        // Filter by fiscal year using company's fiscal year end date
        const fiscalYearEnd = company.fiscal_year_end;
        const filterByFiscalYear = (date: string): boolean => {
            if (fiscalYearEnd) {
                return isDateInFiscalYear(new Date(date), request.fiscal_year, fiscalYearEnd);
            } else {
                // Fallback to calendar year if no fiscal year end is set
                return new Date(date).getFullYear() === request.fiscal_year;
            }
        };

        const paidInvoices = invoices.data.filter((inv) => inv.status === 'paid' && filterByFiscalYear(inv.issue_date));
        const filteredExpenses = expenses.data.filter((exp) => filterByFiscalYear(exp.expense_date));
        const filteredDividends = dividends.data.filter((div) => filterByFiscalYear(div.declaration_date));

        const grossIncome = paidInvoices.reduce((sum, inv) => sum + inv.subtotal, 0);
        const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        // Calculate deductible expenses using deduction percentage
        const totalDeductibleExpenses = filteredExpenses.reduce((sum, exp) => {
            const deductionPercentage = exp.deduction_percentage ?? 1.0;
            return sum + (exp.amount * deductionPercentage);
        }, 0);
        const hstCollected = paidInvoices.reduce((sum, inv) => sum + inv.hst_amount, 0);
        const hstPaid = filteredExpenses.reduce((sum, exp) => sum + exp.hst_paid, 0);
        const netIncomeBeforeTax = grossIncome - totalDeductibleExpenses;
        const smallBusinessTax = netIncomeBeforeTax * company.small_business_rate;
        const netIncomeAfterTax = netIncomeBeforeTax - smallBusinessTax;
        const hstRemittance = hstCollected - hstPaid;
        const totalDividends = filteredDividends.reduce((sum, div) => sum + div.amount, 0);
        const retainedEarnings = netIncomeAfterTax - totalDividends;

        const content = [
            `Company: ${company.name}`,
            `Fiscal Year: ${request.fiscal_year}`,
            `Report Type: ${request.report_type}`,
            '',
            `Gross Income: ${grossIncome.toFixed(2)}`,
            `Total Expenses: ${totalExpenses.toFixed(2)}`,
            `Net Income Before Tax: ${netIncomeBeforeTax.toFixed(2)}`,
            `Small Business Tax (${(company.small_business_rate * 100).toFixed(2)}%): ${smallBusinessTax.toFixed(2)}`,
            `Net Income After Tax: ${netIncomeAfterTax.toFixed(2)}`,
            `HST Collected: ${hstCollected.toFixed(2)}`,
            `HST Paid: ${hstPaid.toFixed(2)}`,
            `HST Remittance: ${hstRemittance.toFixed(2)}`,
            `Total Dividends: ${totalDividends.toFixed(2)}`,
            `Retained Earnings: ${retainedEarnings.toFixed(2)}`,
        ].join('\\n');

        return new Blob([content], { type: 'text/plain' });
    }

    // Push Notification methods --------------------------------------------------------

    /**
     * Subscribe to push notifications
     */
    async subscribeToPushNotifications(subscription: {
        endpoint: string;
        keys: {
            p256dh: string;
            auth: string;
        };
    }): Promise<void> {
        const { data: auth } = await supabase.auth.getUser();
        const authUser = auth.user;
        if (!authUser) {
            throw new Error('Not authenticated');
        }

        const { error } = await supabase
            .from('push_subscriptions')
            .upsert(
                {
                    user_id: authUser.id,
                    endpoint: subscription.endpoint,
                    p256dh: subscription.keys.p256dh,
                    auth: subscription.keys.auth,
                    enabled: true,
                },
                {
                    onConflict: 'endpoint',
                }
            );

        if (error) {
            throw new Error(`Failed to subscribe: ${error.message}`);
        }
    }

    /**
     * Unsubscribe from push notifications
     */
    async unsubscribeFromPushNotifications(): Promise<void> {
        const { data: auth } = await supabase.auth.getUser();
        const authUser = auth.user;
        if (!authUser) {
            throw new Error('Not authenticated');
        }

        const { error } = await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', authUser.id);

        if (error) {
            throw new Error(`Failed to unsubscribe: ${error.message}`);
        }
    }

    /**
     * Get push subscription status
     */
    async getPushSubscriptionStatus(): Promise<{ subscribed: boolean; enabled: boolean }> {
        const { data: auth } = await supabase.auth.getUser();
        const authUser = auth.user;
        if (!authUser) {
            return { subscribed: false, enabled: false };
        }

        const { data, error } = await supabase
            .from('push_subscriptions')
            .select('id, enabled')
            .eq('user_id', authUser.id)
            .eq('enabled', true)
            .maybeSingle();

        if (error) {
            console.error('Error getting push subscription status:', error);
            return { subscribed: false, enabled: false };
        }

        return {
            subscribed: !!data,
            enabled: data?.enabled ?? false,
        };
    }

    /**
     * Toggle push notification enabled status
     */
    async togglePushNotifications(enabled: boolean): Promise<void> {
        const { data: auth } = await supabase.auth.getUser();
        const authUser = auth.user;
        if (!authUser) {
            throw new Error('Not authenticated');
        }

        const { error } = await supabase
            .from('push_subscriptions')
            .update({ enabled })
            .eq('user_id', authUser.id);

        if (error) {
            throw new Error(`Failed to toggle notifications: ${error.message}`);
        }
    }

    /**
     * Trigger a test notification (calls Node server)
     */
    async triggerTestNotification(): Promise<void> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${BACKEND_URL}/api/push-notifications/test`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `Failed to send test notification: ${error.message || 'Unknown error'}`);
        }
    }

    // Payroll Settings methods --------------------------------------------------------

    /**
     * Get payroll settings for a company
     */
    async getPayrollSettings(companyId: number): Promise<PayrollSettings | null> {
        this.ensureCompanyId(companyId);
        const { data, error } = await supabase
            .from('payroll_settings')
            .select('*')
            .eq('company_id', companyId)
            .maybeSingle<PayrollSettings>();

        if (error) throw new Error(error.message);
        return data;
    }

    /**
     * Create payroll settings for a company
     */
    async createPayrollSettings(companyId: number, settings: Omit<PayrollSettings, 'id' | 'company_id' | 'created_at' | 'updated_at'>): Promise<PayrollSettings> {
        this.ensureCompanyId(companyId);
        const { data, error } = await supabase
            .from('payroll_settings')
            .insert({
                company_id: companyId,
                ...settings,
            })
            .select('*')
            .single<PayrollSettings>();

        if (error) throw new Error(error.message);
        return data;
    }

    /**
     * Update payroll settings for a company
     */
    async updatePayrollSettings(companyId: number, settings: Partial<Omit<PayrollSettings, 'id' | 'company_id' | 'created_at' | 'updated_at'>>): Promise<PayrollSettings> {
        this.ensureCompanyId(companyId);
        const { data, error } = await supabase
            .from('payroll_settings')
            .update(settings)
            .eq('company_id', companyId)
            .select('*')
            .single<PayrollSettings>();

        if (error) throw new Error(error.message);
        if (!data) throw new Error('Payroll settings not found');
        return data;
    }

    // Benefit Types methods --------------------------------------------------------

    /**
     * Get all benefit types for a company
     */
    async getBenefitTypes(companyId: number): Promise<BenefitType[]> {
        this.ensureCompanyId(companyId);
        const { data, error } = await supabase
            .from('benefit_types')
            .select('*')
            .eq('company_id', companyId)
            .order('name', { ascending: true });

        if (error) throw new Error(error.message);
        return data || [];
    }

    /**
     * Create a new benefit type
     */
    async createBenefitType(benefitType: Omit<BenefitType, 'id' | 'created_at' | 'updated_at'>): Promise<BenefitType> {
        this.ensureCompanyId(benefitType.company_id);
        const { data, error } = await supabase
            .from('benefit_types')
            .insert(benefitType)
            .select('*')
            .single<BenefitType>();

        if (error) {
            if (error.code === '23505') {
                throw new Error(`A benefit type with name "${benefitType.name}" already exists for this company.`);
            }
            throw new Error(error.message);
        }
        return data;
    }

    /**
     * Update a benefit type
     */
    async updateBenefitType(id: number, updates: Partial<Omit<BenefitType, 'id' | 'company_id' | 'created_at' | 'updated_at'>>): Promise<BenefitType> {
        const { data, error } = await supabase
            .from('benefit_types')
            .update(updates)
            .eq('id', id)
            .select('*')
            .single<BenefitType>();

        if (error) {
            if (error.code === '23505') {
                throw new Error('A benefit type with this name already exists for this company.');
            }
            throw new Error(error.message);
        }
        if (!data) throw new Error('Benefit type not found');
        return data;
    }

    /**
     * Delete a benefit type
     */
    async deleteBenefitType(id: number): Promise<void> {
        const { error } = await supabase
            .from('benefit_types')
            .delete()
            .eq('id', id);

        if (error) throw new Error(error.message);
    }

    // Employee Benefits methods --------------------------------------------------------

    /**
     * Get all benefits assigned to an employee
     */
    async getEmployeeBenefits(employeeId: number): Promise<EmployeeBenefit[]> {
        const { data, error } = await supabase
            .from('employee_benefits')
            .select(`
                *,
                benefit_type:benefit_types (*)
            `)
            .eq('employee_id', employeeId)
            .order('effective_date', { ascending: false });

        if (error) throw new Error(error.message);
        return (data || []).map((row: any) => ({
            ...row,
            benefit_type: row.benefit_type || undefined,
        }));
    }

    /**
     * Assign a benefit to an employee
     */
    async assignBenefit(employeeId: number, benefit: Omit<EmployeeBenefit, 'id' | 'employee_id' | 'created_at' | 'updated_at' | 'benefit_type'>): Promise<EmployeeBenefit> {
        const { data, error } = await supabase
            .from('employee_benefits')
            .insert({
                employee_id: employeeId,
                ...benefit,
            })
            .select(`
                *,
                benefit_type:benefit_types (*)
            `)
            .single();

        if (error) throw new Error(error.message);
        return {
            ...data,
            benefit_type: data.benefit_type || undefined,
        };
    }

    /**
     * Update an employee benefit assignment
     */
    async updateEmployeeBenefit(id: number, updates: Partial<Omit<EmployeeBenefit, 'id' | 'employee_id' | 'created_at' | 'updated_at' | 'benefit_type'>>): Promise<EmployeeBenefit> {
        const { data, error } = await supabase
            .from('employee_benefits')
            .update(updates)
            .eq('id', id)
            .select(`
                *,
                benefit_type:benefit_types (*)
            `)
            .single();

        if (error) throw new Error(error.message);
        if (!data) throw new Error('Employee benefit not found');
        return {
            ...data,
            benefit_type: data.benefit_type || undefined,
        };
    }

    /**
     * Remove a benefit assignment from an employee
     */
    async removeEmployeeBenefit(id: number): Promise<void> {
        const { error } = await supabase
            .from('employee_benefits')
            .delete()
            .eq('id', id);

        if (error) throw new Error(error.message);
    }

    // Employee Tax Credits methods --------------------------------------------------------

    /**
     * Get employee tax credits (TD1 form data) for a specific tax year
     */
    async getEmployeeTaxCredits(employeeId: number, taxYear: number): Promise<EmployeeTaxCredits | null> {
        const { data, error } = await supabase
            .from('employee_tax_credits')
            .select('*')
            .eq('employee_id', employeeId)
            .eq('tax_year', taxYear)
            .maybeSingle<EmployeeTaxCredits>();

        if (error) throw new Error(error.message);
        return data;
    }

    /**
     * Update employee tax credits (TD1 form data) for a specific tax year
     */
    async updateEmployeeTaxCredits(employeeId: number, taxYear: number, credits: Omit<EmployeeTaxCredits, 'id' | 'employee_id' | 'tax_year' | 'created_at' | 'updated_at'>): Promise<EmployeeTaxCredits> {
        // Check if record exists
        const existing = await this.getEmployeeTaxCredits(employeeId, taxYear);

        if (existing) {
            // Update existing
            const { data, error } = await supabase
                .from('employee_tax_credits')
                .update(credits)
                .eq('employee_id', employeeId)
                .eq('tax_year', taxYear)
                .select('*')
                .single<EmployeeTaxCredits>();

            if (error) throw new Error(error.message);
            if (!data) throw new Error('Tax credits not found');
            return data;
        } else {
            // Create new
            const { data, error } = await supabase
                .from('employee_tax_credits')
                .insert({
                    employee_id: employeeId,
                    tax_year: taxYear,
                    ...credits,
                })
                .select('*')
                .single<EmployeeTaxCredits>();

            if (error) throw new Error(error.message);
            return data;
        }
    }

    // Tax Data methods --------------------------------------------------------

    /**
     * Get tax constants for a specific tax year
     */
    async getTaxConstants(taxYear: number): Promise<TaxConstants | null> {
        const { data, error } = await supabase
            .from('tax_constants')
            .select('*')
            .eq('tax_year', taxYear)
            .maybeSingle();

        if (error) {
            // PGRST116 means no rows found - this is expected for missing data
            if (error.code === 'PGRST116') {
                return null;
            }
            // Handle 406 or RLS errors - these are permission issues, not missing data
            // Check for 406 in various possible locations
            const is406Error =
                error.code === 'PGRST301' ||
                error.message?.includes('row-level security') ||
                error.message?.includes('406') ||
                (error as any).status === 406 ||
                (error as any).statusCode === 406 ||
                (error as any).response?.status === 406;

            if (is406Error) {
                console.error(`Permission/RLS issue fetching tax constants for year ${taxYear}:`, error);
                // Throw a specific error that indicates a permissions issue
                const permissionError = new Error(`Unable to access tax rate data for year ${taxYear}. This may be a permissions issue.`);
                (permissionError as any).isPermissionError = true;
                (permissionError as any).originalError = error;
                throw permissionError;
            }
            throw new Error(error.message);
        }
        if (!data) return null;

        // Convert database NUMERIC values to numbers
        return {
            cpp_rate: Number(data.cpp_rate),
            cpp_employer_rate: Number(data.cpp_employer_rate),
            cpp_basic_exemption: Number(data.cpp_basic_exemption),
            cpp_ympe: Number(data.cpp_ympe),
            cpp_max_contribution: Number(data.cpp_max_contribution),
            cpp2_rate: Number(data.cpp2_rate),
            cpp2_yampe: Number(data.cpp2_yampe),
            cpp2_max_contribution: Number(data.cpp2_max_contribution),
            ei_employee_rate: Number(data.ei_employee_rate),
            ei_employer_multiplier: Number(data.ei_employer_multiplier),
            ei_max_insurable: Number(data.ei_max_insurable),
            ei_max_premium: Number(data.ei_max_premium),
            federal_basic_personal_amount: Number(data.federal_basic_personal_amount),
            federal_employment_amount: Number(data.federal_employment_amount),
        };
    }

    /**
     * Get tax brackets for a specific tax year and jurisdiction (federal or province)
     */
    async getTaxRates(taxYear: number, jurisdiction: string): Promise<TaxBracket[]> {
        const { data, error } = await supabase
            .from('tax_rates')
            .select('min_income, max_income, rate')
            .eq('tax_year', taxYear)
            .eq('jurisdiction', jurisdiction)
            .order('bracket_number', { ascending: true });

        if (error) {
            // Handle 406 or RLS errors - these are permission issues
            const is406Error =
                error.code === 'PGRST301' ||
                error.message?.includes('row-level security') ||
                error.message?.includes('406') ||
                (error as any).status === 406 ||
                (error as any).statusCode === 406 ||
                (error as any).response?.status === 406;

            if (is406Error) {
                console.error(`Permission/RLS issue fetching tax rates for year ${taxYear} and jurisdiction ${jurisdiction}:`, error);
                const permissionError = new Error(`Unable to access tax rate data for year ${taxYear} and jurisdiction ${jurisdiction}. This may be a permissions issue.`);
                (permissionError as any).isPermissionError = true;
                (permissionError as any).originalError = error;
                throw permissionError;
            }
            throw new Error(error.message);
        }

        // Return empty array if no data (don't throw error for missing data)
        if (!data || data.length === 0) {
            return [];
        }

        return data.map(row => ({
            min_income: Number(row.min_income),
            max_income: row.max_income ? Number(row.max_income) : null,
            rate: Number(row.rate),
        }));
    }

    /**
     * Get provincial tax constants for a specific tax year and province
     */
    async getProvincialTaxConstants(taxYear: number, province: string): Promise<ProvincialTaxConstants | null> {
        const { data, error } = await supabase
            .from('provincial_tax_constants')
            .select('*')
            .eq('tax_year', taxYear)
            .eq('province', province)
            .maybeSingle<ProvincialTaxConstants>();

        if (error) {
            // PGRST116 means no rows found - this is expected for missing data
            if (error.code === 'PGRST116') {
                return null;
            }
            // Handle 406 or RLS errors - these are permission issues, not missing data
            // Check for 406 in various possible locations
            const is406Error =
                error.code === 'PGRST301' ||
                error.message?.includes('row-level security') ||
                error.message?.includes('406') ||
                (error as any).status === 406 ||
                (error as any).statusCode === 406 ||
                (error as any).response?.status === 406;

            if (is406Error) {
                console.error(`Permission/RLS issue fetching provincial tax constants for year ${taxYear} and province ${province}:`, error);
                // Throw a specific error that indicates a permissions issue
                const permissionError = new Error(`Unable to access provincial tax rate data for year ${taxYear} and province ${province}. This may be a permissions issue.`);
                (permissionError as any).isPermissionError = true;
                (permissionError as any).originalError = error;
                throw permissionError;
            }
            throw new Error(error.message);
        }
        if (!data) return null;
        return {
            basic_personal_amount: Number(data.basic_personal_amount),
            surtax_threshold_1: data.surtax_threshold_1 ? Number(data.surtax_threshold_1) : null,
            surtax_rate_1: data.surtax_rate_1 ? Number(data.surtax_rate_1) : null,
            surtax_threshold_2: data.surtax_threshold_2 ? Number(data.surtax_threshold_2) : null,
            surtax_rate_2: data.surtax_rate_2 ? Number(data.surtax_rate_2) : null,
            health_premium_enabled: data.health_premium_enabled,
        };
    }

    /**
     * Get or create employee YTD record for a specific tax year
     */
    async getEmployeeYTD(employeeId: number, taxYear: number): Promise<EmployeeYTD> {
        // Try to get existing record
        const { data: existing, error: fetchError } = await supabase
            .from('employee_ytd')
            .select('*')
            .eq('employee_id', employeeId)
            .eq('tax_year', taxYear)
            .maybeSingle();

        if (fetchError) throw new Error(fetchError.message);

        if (existing) {
            return {
                gross_earnings: Number(existing.gross_earnings),
                pensionable_earnings: Number(existing.pensionable_earnings),
                insurable_earnings: Number(existing.insurable_earnings),
                taxable_earnings: Number(existing.taxable_earnings || 0),
                cpp_contributions: Number(existing.cpp_contributions),
                cpp2_contributions: Number(existing.cpp2_contributions),
                ei_premiums: Number(existing.ei_premiums),
                federal_tax_withheld: Number(existing.federal_tax_withheld),
                provincial_tax_withheld: Number(existing.provincial_tax_withheld),
                taxable_benefits: Number(existing.taxable_benefits || 0),
                rrsp_contributions: Number(existing.rrsp_contributions || 0),
                union_dues: Number(existing.union_dues || 0),
                charitable_donations: Number(existing.charitable_donations || 0),
                vacation_earned: Number(existing.vacation_earned),
                vacation_used: Number(existing.vacation_used),
                vacation_balance: Number(existing.vacation_balance || 0),
                employer_cpp: Number(existing.employer_cpp),
                employer_ei: Number(existing.employer_ei),
                cpp_maxed_out: existing.cpp_maxed_out || false,
                cpp2_maxed_out: existing.cpp2_maxed_out || false,
                ei_maxed_out: existing.ei_maxed_out || false,
            };
        }

        // Create new record with zeros
        const { data: newRecord, error: createError } = await supabase
            .from('employee_ytd')
            .insert({
                employee_id: employeeId,
                tax_year: taxYear,
                gross_earnings: 0,
                pensionable_earnings: 0,
                insurable_earnings: 0,
                cpp_contributions: 0,
                cpp2_contributions: 0,
                ei_premiums: 0,
                federal_tax_withheld: 0,
                provincial_tax_withheld: 0,
                vacation_earned: 0,
                vacation_used: 0,
                employer_cpp: 0,
                employer_ei: 0,
            })
            .select('*')
            .single();

        if (createError) throw new Error(createError.message);
        if (!newRecord) throw new Error('Failed to create employee YTD record');

        return {
            gross_earnings: Number(newRecord.gross_earnings),
            pensionable_earnings: Number(newRecord.pensionable_earnings),
            insurable_earnings: Number(newRecord.insurable_earnings),
            taxable_earnings: Number(newRecord.taxable_earnings || 0),
            cpp_contributions: Number(newRecord.cpp_contributions),
            cpp2_contributions: Number(newRecord.cpp2_contributions),
            ei_premiums: Number(newRecord.ei_premiums),
            federal_tax_withheld: Number(newRecord.federal_tax_withheld),
            provincial_tax_withheld: Number(newRecord.provincial_tax_withheld),
            taxable_benefits: Number(newRecord.taxable_benefits || 0),
            rrsp_contributions: Number(newRecord.rrsp_contributions || 0),
            union_dues: Number(newRecord.union_dues || 0),
            charitable_donations: Number(newRecord.charitable_donations || 0),
            vacation_earned: Number(newRecord.vacation_earned),
            vacation_used: Number(newRecord.vacation_used),
            vacation_balance: Number(newRecord.vacation_balance || 0),
            employer_cpp: Number(newRecord.employer_cpp),
            employer_ei: Number(newRecord.employer_ei),
            cpp_maxed_out: newRecord.cpp_maxed_out || false,
            cpp2_maxed_out: newRecord.cpp2_maxed_out || false,
            ei_maxed_out: newRecord.ei_maxed_out || false,
        };
    }

    /**
     * Update employee YTD record
     */
    async updateEmployeeYTD(employeeId: number, taxYear: number, ytd: Partial<EmployeeYTD>): Promise<EmployeeYTD> {
        // Convert to database format
        const updateData: any = {};
        if (ytd.gross_earnings !== undefined) updateData.gross_earnings = ytd.gross_earnings;
        if (ytd.pensionable_earnings !== undefined) updateData.pensionable_earnings = ytd.pensionable_earnings;
        if (ytd.insurable_earnings !== undefined) updateData.insurable_earnings = ytd.insurable_earnings;
        if (ytd.cpp_contributions !== undefined) updateData.cpp_contributions = ytd.cpp_contributions;
        if (ytd.cpp2_contributions !== undefined) updateData.cpp2_contributions = ytd.cpp2_contributions;
        if (ytd.ei_premiums !== undefined) updateData.ei_premiums = ytd.ei_premiums;
        if (ytd.federal_tax_withheld !== undefined) updateData.federal_tax_withheld = ytd.federal_tax_withheld;
        if (ytd.provincial_tax_withheld !== undefined) updateData.provincial_tax_withheld = ytd.provincial_tax_withheld;
        if (ytd.vacation_earned !== undefined) updateData.vacation_earned = ytd.vacation_earned;
        if (ytd.vacation_used !== undefined) updateData.vacation_used = ytd.vacation_used;
        if (ytd.employer_cpp !== undefined) updateData.employer_cpp = ytd.employer_cpp;
        if (ytd.employer_ei !== undefined) updateData.employer_ei = ytd.employer_ei;

        const { data, error } = await supabase
            .from('employee_ytd')
            .update(updateData)
            .eq('employee_id', employeeId)
            .eq('tax_year', taxYear)
            .select('*')
            .single();

        if (error) throw new Error(error.message);
        if (!data) throw new Error('Employee YTD record not found');

        return {
            gross_earnings: Number(data.gross_earnings),
            pensionable_earnings: Number(data.pensionable_earnings),
            insurable_earnings: Number(data.insurable_earnings),
            taxable_earnings: Number(data.taxable_earnings || 0),
            cpp_contributions: Number(data.cpp_contributions),
            cpp2_contributions: Number(data.cpp2_contributions),
            ei_premiums: Number(data.ei_premiums),
            federal_tax_withheld: Number(data.federal_tax_withheld),
            provincial_tax_withheld: Number(data.provincial_tax_withheld),
            taxable_benefits: Number(data.taxable_benefits || 0),
            rrsp_contributions: Number(data.rrsp_contributions || 0),
            union_dues: Number(data.union_dues || 0),
            charitable_donations: Number(data.charitable_donations || 0),
            vacation_earned: Number(data.vacation_earned),
            vacation_used: Number(data.vacation_used),
            vacation_balance: Number(data.vacation_balance || 0),
            employer_cpp: Number(data.employer_cpp),
            employer_ei: Number(data.employer_ei),
            cpp_maxed_out: Boolean(data.cpp_maxed_out || false),
            cpp2_maxed_out: Boolean(data.cpp2_maxed_out || false),
            ei_maxed_out: Boolean(data.ei_maxed_out || false),
        };
    }

    // Pay Run methods --------------------------------------------------------

    /**
     * Get pay runs with optional filters
     */
    async getPayRuns(params: {
        company_id: number;
        status?: string;
        start_date?: string;
        end_date?: string;
    }): Promise<PayRun[]> {
        this.ensureCompanyId(params.company_id);
        let query = supabase
            .from('pay_runs')
            .select('*')
            .eq('company_id', params.company_id);

        if (params.status) {
            query = query.eq('status', params.status);
        }
        if (params.start_date) {
            query = query.gte('pay_period_start', params.start_date);
        }
        if (params.end_date) {
            query = query.lte('pay_period_end', params.end_date);
        }

        query = query.order('pay_period_start', { ascending: false });

        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return (data || []).map((row: any) => ({
            ...row,
            total_gross: Number(row.total_gross),
            total_cpp: Number(row.total_cpp),
            total_cpp2: Number(row.total_cpp2),
            total_ei: Number(row.total_ei),
            total_federal_tax: Number(row.total_federal_tax),
            total_provincial_tax: Number(row.total_provincial_tax),
            total_other_deductions: Number(row.total_other_deductions),
            total_net: Number(row.total_net),
            total_employer_cpp: Number(row.total_employer_cpp),
            total_employer_ei: Number(row.total_employer_ei),
            total_employer_cost: Number(row.total_employer_cost),
        }));
    }

    /**
     * Get single pay run with items
     */
    async getPayRun(id: number): Promise<PayRun & { items: PayRunItem[] }> {
        const { data: payRun, error: payRunError } = await supabase
            .from('pay_runs')
            .select('*')
            .eq('id', id)
            .single();

        if (payRunError) throw new Error(payRunError.message);
        if (!payRun) throw new Error('Pay run not found');

        const { data: items, error: itemsError } = await supabase
            .from('pay_run_items')
            .select(`
                *,
                employee:employees (*)
            `)
            .eq('pay_run_id', id)
            .order('created_at', { ascending: true });

        if (itemsError) throw new Error(itemsError.message);

        return {
            ...payRun,
            total_gross: Number(payRun.total_gross),
            total_cpp: Number(payRun.total_cpp),
            total_cpp2: Number(payRun.total_cpp2),
            total_ei: Number(payRun.total_ei),
            total_federal_tax: Number(payRun.total_federal_tax),
            total_provincial_tax: Number(payRun.total_provincial_tax),
            total_other_deductions: Number(payRun.total_other_deductions),
            total_net: Number(payRun.total_net),
            total_employer_cpp: Number(payRun.total_employer_cpp),
            total_employer_ei: Number(payRun.total_employer_ei),
            total_employer_cost: Number(payRun.total_employer_cost),
            items: (items || []).map((item: any) => ({
                ...item,
                regular_hours: Number(item.regular_hours),
                overtime_hours: Number(item.overtime_hours),
                vacation_hours_used: Number(item.vacation_hours_used),
                sick_hours_used: Number(item.sick_hours_used),
                statutory_holiday_hours: Number(item.statutory_holiday_hours),
                hourly_rate: item.hourly_rate ? Number(item.hourly_rate) : null,
                overtime_rate: item.overtime_rate ? Number(item.overtime_rate) : null,
                regular_pay: Number(item.regular_pay),
                overtime_pay: Number(item.overtime_pay),
                vacation_pay: Number(item.vacation_pay),
                statutory_holiday_pay: Number(item.statutory_holiday_pay),
                other_earnings: Number(item.other_earnings),
                taxable_benefits: Number(item.taxable_benefits),
                gross_pay: Number(item.gross_pay),
                cpp_employee: Number(item.cpp_employee),
                cpp2_employee: Number(item.cpp2_employee),
                ei_employee: Number(item.ei_employee),
                federal_tax: Number(item.federal_tax),
                provincial_tax: Number(item.provincial_tax),
                pre_tax_deductions: Number(item.pre_tax_deductions),
                post_tax_deductions: Number(item.post_tax_deductions),
                total_deductions: Number(item.total_deductions),
                net_pay: Number(item.net_pay),
                cpp_employer: Number(item.cpp_employer),
                ei_employer: Number(item.ei_employer),
                employer_total_cost: Number(item.employer_total_cost),
                vacation_accrued: Number(item.vacation_accrued),
                vacation_rate_used: item.vacation_rate_used ? Number(item.vacation_rate_used) : null,
                ytd_gross_before: item.ytd_gross_before ? Number(item.ytd_gross_before) : null,
                ytd_cpp_before: item.ytd_cpp_before ? Number(item.ytd_cpp_before) : null,
                ytd_ei_before: item.ytd_ei_before ? Number(item.ytd_ei_before) : null,
                employee: item.employee || undefined,
            })),
        };
    }

    /**
     * Create new draft pay run
     */
    async createPayRun(payRun: {
        company_id: number;
        pay_period_start: string;
        pay_period_end: string;
        pay_date: string;
    }): Promise<PayRun> {
        this.ensureCompanyId(payRun.company_id);

        // Get current user for created_by
        const profile = await this.getProfile();

        // Check for overlapping pay runs
        const { data: overlapping } = await supabase
            .from('pay_runs')
            .select('id')
            .eq('company_id', payRun.company_id)
            .neq('status', 'void')
            .or(
                `and(pay_period_start.lte.${payRun.pay_period_end},pay_period_end.gte.${payRun.pay_period_start})`
            );

        if (overlapping && overlapping.length > 0) {
            throw new Error('A pay run already exists for this period');
        }

        // Validate pay date is on or after period end
        if (new Date(payRun.pay_date) < new Date(payRun.pay_period_end)) {
            throw new Error('Pay date must be on or after the pay period end date');
        }

        const { data, error } = await supabase
            .from('pay_runs')
            .insert({
                ...payRun,
                status: 'draft',
                created_by: profile.id,
            })
            .select('*')
            .single();

        if (error) throw new Error(error.message);
        return {
            ...data,
            total_gross: Number(data.total_gross),
            total_cpp: Number(data.total_cpp),
            total_cpp2: Number(data.total_cpp2),
            total_ei: Number(data.total_ei),
            total_federal_tax: Number(data.total_federal_tax),
            total_provincial_tax: Number(data.total_provincial_tax),
            total_other_deductions: Number(data.total_other_deductions),
            total_net: Number(data.total_net),
            total_employer_cpp: Number(data.total_employer_cpp),
            total_employer_ei: Number(data.total_employer_ei),
            total_employer_cost: Number(data.total_employer_cost),
        };
    }

    /**
     * Update pay run
     */
    async updatePayRun(id: number, data: Partial<PayRun>): Promise<PayRun> {
        const { data: updated, error } = await supabase
            .from('pay_runs')
            .update(data)
            .eq('id', id)
            .select('*')
            .single();

        if (error) throw new Error(error.message);
        if (!updated) throw new Error('Pay run not found');
        return {
            ...updated,
            total_gross: Number(updated.total_gross),
            total_cpp: Number(updated.total_cpp),
            total_cpp2: Number(updated.total_cpp2),
            total_ei: Number(updated.total_ei),
            total_federal_tax: Number(updated.total_federal_tax),
            total_provincial_tax: Number(updated.total_provincial_tax),
            total_other_deductions: Number(updated.total_other_deductions),
            total_net: Number(updated.total_net),
            total_employer_cpp: Number(updated.total_employer_cpp),
            total_employer_ei: Number(updated.total_employer_ei),
            total_employer_cost: Number(updated.total_employer_cost),
        };
    }

    /**
     * Delete draft pay run
     */
    async deletePayRun(id: number): Promise<void> {
        // Only allow deletion of draft pay runs
        const { data: payRun } = await supabase
            .from('pay_runs')
            .select('status')
            .eq('id', id)
            .single();

        if (!payRun) throw new Error('Pay run not found');
        if (payRun.status !== 'draft') {
            throw new Error('Only draft pay runs can be deleted');
        }

        const { error } = await supabase.from('pay_runs').delete().eq('id', id);
        if (error) throw new Error(error.message);
    }

    /**
     * Add employee to pay run
     */
    async addEmployeeToPayRun(
        payRunId: number,
        employeeId: number,
        hours?: { regular: number; overtime: number }
    ): Promise<PayRunItem> {
        // Check if employee already in pay run
        const { data: existing } = await supabase
            .from('pay_run_items')
            .select('id')
            .eq('pay_run_id', payRunId)
            .eq('employee_id', employeeId)
            .maybeSingle();

        if (existing) {
            throw new Error('Employee already added to this pay run');
        }

        // Get employee data
        const employee = await this.getEmployee(employeeId);
        if (!employee) throw new Error('Employee not found');

        // Calculate default hours if not provided
        const regularHours = hours?.regular ?? 0;
        const overtimeHours = hours?.overtime ?? 0;

        const { data, error } = await supabase
            .from('pay_run_items')
            .insert({
                pay_run_id: payRunId,
                employee_id: employeeId,
                regular_hours: regularHours,
                overtime_hours: overtimeHours,
            })
            .select(`
                *,
                employee:employees (*)
            `)
            .single();

        if (error) throw new Error(error.message);
        return {
            ...data,
            regular_hours: Number(data.regular_hours),
            overtime_hours: Number(data.overtime_hours),
            vacation_hours_used: Number(data.vacation_hours_used),
            sick_hours_used: Number(data.sick_hours_used),
            statutory_holiday_hours: Number(data.statutory_holiday_hours),
            hourly_rate: data.hourly_rate ? Number(data.hourly_rate) : null,
            overtime_rate: data.overtime_rate ? Number(data.overtime_rate) : null,
            regular_pay: Number(data.regular_pay),
            overtime_pay: Number(data.overtime_pay),
            vacation_pay: Number(data.vacation_pay),
            statutory_holiday_pay: Number(data.statutory_holiday_pay),
            other_earnings: Number(data.other_earnings),
            taxable_benefits: Number(data.taxable_benefits),
            gross_pay: Number(data.gross_pay),
            cpp_employee: Number(data.cpp_employee),
            cpp2_employee: Number(data.cpp2_employee),
            ei_employee: Number(data.ei_employee),
            federal_tax: Number(data.federal_tax),
            provincial_tax: Number(data.provincial_tax),
            pre_tax_deductions: Number(data.pre_tax_deductions),
            post_tax_deductions: Number(data.post_tax_deductions),
            total_deductions: Number(data.total_deductions),
            net_pay: Number(data.net_pay),
            cpp_employer: Number(data.cpp_employer),
            ei_employer: Number(data.ei_employer),
            employer_total_cost: Number(data.employer_total_cost),
            vacation_accrued: Number(data.vacation_accrued),
            vacation_rate_used: data.vacation_rate_used ? Number(data.vacation_rate_used) : null,
            ytd_gross_before: data.ytd_gross_before ? Number(data.ytd_gross_before) : null,
            ytd_cpp_before: data.ytd_cpp_before ? Number(data.ytd_cpp_before) : null,
            ytd_ei_before: data.ytd_ei_before ? Number(data.ytd_ei_before) : null,
            employee: data.employee || undefined,
        };
    }

    /**
     * Update pay run item
     */
    async updatePayRunItem(itemId: number, data: Partial<PayRunItem>): Promise<PayRunItem> {
        const { data: updated, error } = await supabase
            .from('pay_run_items')
            .update(data)
            .eq('id', itemId)
            .select(`
                *,
                employee:employees (*)
            `)
            .single();

        if (error) throw new Error(error.message);
        if (!updated) throw new Error('Pay run item not found');
        return {
            ...updated,
            regular_hours: Number(updated.regular_hours),
            overtime_hours: Number(updated.overtime_hours),
            vacation_hours_used: Number(updated.vacation_hours_used),
            sick_hours_used: Number(updated.sick_hours_used),
            statutory_holiday_hours: Number(updated.statutory_holiday_hours),
            hourly_rate: updated.hourly_rate ? Number(updated.hourly_rate) : null,
            overtime_rate: updated.overtime_rate ? Number(updated.overtime_rate) : null,
            regular_pay: Number(updated.regular_pay),
            overtime_pay: Number(updated.overtime_pay),
            vacation_pay: Number(updated.vacation_pay),
            statutory_holiday_pay: Number(updated.statutory_holiday_pay),
            other_earnings: Number(updated.other_earnings),
            taxable_benefits: Number(updated.taxable_benefits),
            gross_pay: Number(updated.gross_pay),
            cpp_employee: Number(updated.cpp_employee),
            cpp2_employee: Number(updated.cpp2_employee),
            ei_employee: Number(updated.ei_employee),
            federal_tax: Number(updated.federal_tax),
            provincial_tax: Number(updated.provincial_tax),
            pre_tax_deductions: Number(updated.pre_tax_deductions),
            post_tax_deductions: Number(updated.post_tax_deductions),
            total_deductions: Number(updated.total_deductions),
            net_pay: Number(updated.net_pay),
            cpp_employer: Number(updated.cpp_employer),
            ei_employer: Number(updated.ei_employer),
            employer_total_cost: Number(updated.employer_total_cost),
            vacation_accrued: Number(updated.vacation_accrued),
            vacation_rate_used: updated.vacation_rate_used ? Number(updated.vacation_rate_used) : null,
            ytd_gross_before: updated.ytd_gross_before ? Number(updated.ytd_gross_before) : null,
            ytd_cpp_before: updated.ytd_cpp_before ? Number(updated.ytd_cpp_before) : null,
            ytd_ei_before: updated.ytd_ei_before ? Number(updated.ytd_ei_before) : null,
            employee: updated.employee || undefined,
        };
    }

    /**
     * Remove employee from pay run
     */
    async removePayRunItem(itemId: number): Promise<void> {
        const { error } = await supabase.from('pay_run_items').delete().eq('id', itemId);
        if (error) throw new Error(error.message);
    }

    /**
     * Calculate pay run item using PayrollCalculator
     */
    async calculatePayRunItem(itemId: number): Promise<PayRunItem> {
        // Get pay run item
        const { data: item, error: itemError } = await supabase
            .from('pay_run_items')
            .select(`
                *,
                employee:employees (*),
                pay_run:pay_runs (*)
            `)
            .eq('id', itemId)
            .single();

        if (itemError) throw new Error(itemError.message);
        if (!item) throw new Error('Pay run item not found');

        const employee = item.employee;
        const payRun = item.pay_run;

        if (!employee || !payRun) {
            throw new Error('Employee or pay run data missing');
        }

        // Get required data
        const taxYear = new Date(payRun.pay_period_start).getFullYear();
        const [ytd, taxCredits, benefits, payrollSettings] = await Promise.all([
            this.getEmployeeYTD(employee.id, taxYear),
            this.getEmployeeTaxCredits(employee.id, taxYear),
            this.getEmployeeBenefits(employee.id),
            this.getPayrollSettings(payRun.company_id),
        ]);

        if (!payrollSettings) {
            throw new Error('Payroll settings not found');
        }

        // Get default tax credits if not set
        const defaultTaxCredits: EmployeeTaxCredits = taxCredits || {
            id: 0,
            employee_id: employee.id,
            tax_year: taxYear,
            federal_basic_personal: payrollSettings.province === 'ON' ? 15705 : 15705,
            federal_additional_claims: 0,
            federal_total_claim: payrollSettings.province === 'ON' ? 15705 : 15705, // 2026 federal basic
            provincial_basic_personal: payrollSettings.province === 'ON' ? 12866 : 12866,
            provincial_additional_claims: 0,
            provincial_total_claim: payrollSettings.province === 'ON' ? 12866 : 12866, // 2026 ON basic
            claim_tax_exempt: false,
            additional_tax_per_pay: 0,
            effective_date: new Date().toISOString().split('T')[0],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        // Calculate benefit totals
        const { calculateBenefitTotals } = await import('./payrollHelpers');
        const benefitTotals = calculateBenefitTotals(benefits, 0); // Will be recalculated with gross

        // Create calculator
        const { createPayrollCalculator } = await import('./payrollCalculations');
        const calculator = await createPayrollCalculator(
            payRun.company_id,
            taxYear,
            employee.province || payrollSettings.province
        );

        // Calculate earnings first to get gross pay for benefits
        const hours = {
            regular: Number(item.regular_hours),
            overtime: Number(item.overtime_hours),
            vacation: Number(item.vacation_hours_used),
            statutory_holiday: Number(item.statutory_holiday_hours),
            sick: Number(item.sick_hours_used),
        };

        // Recalculate benefits with actual gross (will be updated after calculation)
        const tempResult = calculator.calculate({
            employee: {
                id: employee.id,
                province: employee.province || payrollSettings.province,
                hire_date: employee.hire_date || new Date().toISOString(),
                payrate: employee.payrate || 0,
                payrate_type: (employee.payrate_type as any) || 'hourly',
            },
            payPeriod: {
                start: payRun.pay_period_start,
                end: payRun.pay_period_end,
                payDate: payRun.pay_date,
            },
            hours,
            benefits: benefitTotals,
            ytd,
            taxCredits: defaultTaxCredits,
            settings: payrollSettings,
        });

        // Recalculate benefits with actual gross
        const finalBenefitTotals = calculateBenefitTotals(benefits, tempResult.grossPay);

        // Final calculation
        const result = calculator.calculate({
            employee: {
                id: employee.id,
                province: employee.province || payrollSettings.province,
                hire_date: employee.hire_date || new Date().toISOString(),
                payrate: employee.payrate || 0,
                payrate_type: (employee.payrate_type as any) || 'hourly',
            },
            payPeriod: {
                start: payRun.pay_period_start,
                end: payRun.pay_period_end,
                payDate: payRun.pay_date,
            },
            hours,
            benefits: finalBenefitTotals,
            ytd,
            taxCredits: defaultTaxCredits,
            settings: payrollSettings,
        });

        // Calculate hourly rate for storage
        let hourlyRate: number | null = null;
        if (employee.payrate_type === 'hourly') {
            hourlyRate = employee.payrate || null;
        } else if (employee.payrate && hours.regular > 0) {
            hourlyRate = result.regularPay / hours.regular;
        }

        // Update pay run item
        const updatedItem = await this.updatePayRunItem(itemId, {
            hourly_rate: hourlyRate,
            overtime_rate: hourlyRate ? hourlyRate * payrollSettings.overtime_multiplier : null,
            regular_pay: result.regularPay,
            overtime_pay: result.overtimePay,
            vacation_pay: result.vacationPay,
            statutory_holiday_pay: result.statutoryHolidayPay,
            other_earnings: result.otherEarnings,
            taxable_benefits: result.taxableBenefits,
            gross_pay: result.grossPay,
            cpp_employee: result.cpp.contribution,
            cpp2_employee: result.cpp2.contribution,
            ei_employee: result.ei.premium,
            federal_tax: result.federalTax,
            provincial_tax: result.provincialTax,
            pre_tax_deductions: result.preTaxDeductions,
            post_tax_deductions: result.postTaxDeductions,
            total_deductions: result.totalDeductions,
            net_pay: result.netPay,
            cpp_employer: result.cpp.employerContribution,
            ei_employer: result.ei.employerPremium,
            employer_total_cost: result.employerTotalCost,
            vacation_accrued: result.vacationAccrued,
            vacation_rate_used: result.vacationRate,
            ytd_gross_before: ytd.gross_earnings,
            ytd_cpp_before: ytd.cpp_contributions,
            ytd_ei_before: ytd.ei_premiums,
            calculation_notes: {
                cpp_maxed: result.cpp.maxedOut,
                cpp2_maxed: result.cpp2.maxedOut,
                ei_maxed: result.ei.maxedOut,
            },
        });

        // Update pay run totals
        await this.recalculatePayRunTotals(payRun.id);

        return updatedItem;
    }

    /**
     * Calculate all pay run items
     */
    async calculateAllPayRunItems(payRunId: number): Promise<PayRunItem[]> {
        const payRun = await this.getPayRun(payRunId);
        const results: PayRunItem[] = [];

        for (const item of payRun.items) {
            try {
                const calculated = await this.calculatePayRunItem(item.id);
                results.push(calculated);
            } catch (error) {
                console.error(`Error calculating item ${item.id}:`, error);
                throw error;
            }
        }

        return results;
    }

    /**
     * Recalculate pay run totals from items
     */
    async recalculatePayRunTotals(payRunId: number): Promise<void> {
        const { data: items } = await supabase
            .from('pay_run_items')
            .select('*')
            .eq('pay_run_id', payRunId);

        if (!items || items.length === 0) {
            // Reset totals to zero
            await this.updatePayRun(payRunId, {
                total_gross: 0,
                total_cpp: 0,
                total_cpp2: 0,
                total_ei: 0,
                total_federal_tax: 0,
                total_provincial_tax: 0,
                total_other_deductions: 0,
                total_net: 0,
                total_employer_cpp: 0,
                total_employer_ei: 0,
                total_employer_cost: 0,
            });
            return;
        }

        const totals = items.reduce(
            (acc, item) => ({
                total_gross: acc.total_gross + Number(item.gross_pay),
                total_cpp: acc.total_cpp + Number(item.cpp_employee),
                total_cpp2: acc.total_cpp2 + Number(item.cpp2_employee),
                total_ei: acc.total_ei + Number(item.ei_employee),
                total_federal_tax: acc.total_federal_tax + Number(item.federal_tax),
                total_provincial_tax: acc.total_provincial_tax + Number(item.provincial_tax),
                total_other_deductions:
                    acc.total_other_deductions +
                    Number(item.pre_tax_deductions) +
                    Number(item.post_tax_deductions),
                total_net: acc.total_net + Number(item.net_pay),
                total_employer_cpp: acc.total_employer_cpp + Number(item.cpp_employer),
                total_employer_ei: acc.total_employer_ei + Number(item.ei_employer),
            }),
            {
                total_gross: 0,
                total_cpp: 0,
                total_cpp2: 0,
                total_ei: 0,
                total_federal_tax: 0,
                total_provincial_tax: 0,
                total_other_deductions: 0,
                total_net: 0,
                total_employer_cpp: 0,
                total_employer_ei: 0,
            }
        );

        totals.total_employer_cost =
            totals.total_gross + totals.total_employer_cpp + totals.total_employer_ei;

        await this.updatePayRun(payRunId, totals);
    }

    /**
     * Submit pay run for approval
     */
    async submitPayRunForApproval(id: number): Promise<PayRun> {
        const payRun = await this.getPayRun(id);
        if (payRun.status !== 'draft') {
            throw new Error('Only draft pay runs can be submitted for approval');
        }

        // Validate all items are calculated
        const uncalculated = payRun.items.filter((item) => item.gross_pay === 0 && item.regular_hours === 0);
        if (uncalculated.length > 0) {
            throw new Error('All employees must have hours entered and calculated');
        }

        return this.updatePayRun(id, { status: 'pending_approval' });
    }

    /**
     * Approve pay run
     */
    async approvePayRun(id: number): Promise<PayRun> {
        const payRun = await this.getPayRun(id);
        if (payRun.status !== 'pending_approval') {
            throw new Error('Only pending pay runs can be approved');
        }

        const profile = await this.getProfile();

        return this.updatePayRun(id, {
            status: 'approved',
            approved_by: profile.id,
            approved_at: new Date().toISOString(),
        });
    }

    /**
     * Return pay run to draft
     */
    async returnPayRunToDraft(id: number): Promise<PayRun> {
        const payRun = await this.getPayRun(id);
        if (payRun.status !== 'pending_approval') {
            throw new Error('Only pending pay runs can be returned to draft');
        }

        return this.updatePayRun(id, {
            status: 'draft',
            approved_by: null,
            approved_at: null,
        });
    }

    /**
     * Finalize pay run (updates YTD, locks run)
     */
    async finalizePayRun(id: number): Promise<PayRun> {
        const payRun = await this.getPayRun(id);
        if (payRun.status !== 'approved') {
            throw new Error('Only approved pay runs can be finalized');
        }

        const taxYear = new Date(payRun.pay_period_start).getFullYear();

        // Update YTD for all employees
        for (const item of payRun.items) {
            if (!item.employee_id) continue;

            const currentYTD = await this.getEmployeeYTD(item.employee_id, taxYear);

            await this.updateEmployeeYTD(item.employee_id, taxYear, {
                gross_earnings: currentYTD.gross_earnings + item.gross_pay,
                pensionable_earnings: currentYTD.pensionable_earnings + item.gross_pay,
                insurable_earnings: currentYTD.insurable_earnings + item.gross_pay,
                taxable_earnings: currentYTD.taxable_earnings + item.gross_pay,
                cpp_contributions: currentYTD.cpp_contributions + item.cpp_employee,
                cpp2_contributions: currentYTD.cpp2_contributions + item.cpp2_employee,
                ei_premiums: currentYTD.ei_premiums + item.ei_employee,
                federal_tax_withheld: currentYTD.federal_tax_withheld + item.federal_tax,
                provincial_tax_withheld: currentYTD.provincial_tax_withheld + item.provincial_tax,
                vacation_earned: currentYTD.vacation_earned + item.vacation_accrued,
                employer_cpp: currentYTD.employer_cpp + item.cpp_employer,
                employer_ei: currentYTD.employer_ei + item.ei_employer,
            });
        }

        // Update remittance period
        await this.updateRemittancePeriodOnFinalize(payRun);

        return this.updatePayRun(id, {
            status: 'finalized',
            finalized_at: new Date().toISOString(),
        });
    }

    /**
     * Void finalized pay run (reverses YTD)
     */
    async voidPayRun(id: number, reason: string): Promise<PayRun> {
        const payRun = await this.getPayRun(id);
        if (payRun.status !== 'finalized') {
            throw new Error('Only finalized pay runs can be voided');
        }

        if (!reason.trim()) {
            throw new Error('Void reason is required');
        }

        const taxYear = new Date(payRun.pay_period_start).getFullYear();

        // Reverse YTD updates for all employees
        for (const item of payRun.items) {
            if (!item.employee_id) continue;

            const currentYTD = await this.getEmployeeYTD(item.employee_id, taxYear);

            await this.updateEmployeeYTD(item.employee_id, taxYear, {
                gross_earnings: Math.max(0, currentYTD.gross_earnings - item.gross_pay),
                pensionable_earnings: Math.max(0, currentYTD.pensionable_earnings - item.gross_pay),
                insurable_earnings: Math.max(0, currentYTD.insurable_earnings - item.gross_pay),
                taxable_earnings: Math.max(0, currentYTD.taxable_earnings - item.gross_pay),
                cpp_contributions: Math.max(0, currentYTD.cpp_contributions - item.cpp_employee),
                cpp2_contributions: Math.max(0, currentYTD.cpp2_contributions - item.cpp2_employee),
                ei_premiums: Math.max(0, currentYTD.ei_premiums - item.ei_employee),
                federal_tax_withheld: Math.max(0, currentYTD.federal_tax_withheld - item.federal_tax),
                provincial_tax_withheld: Math.max(0, currentYTD.provincial_tax_withheld - item.provincial_tax),
                vacation_earned: Math.max(0, currentYTD.vacation_earned - item.vacation_accrued),
                employer_cpp: Math.max(0, currentYTD.employer_cpp - item.cpp_employer),
                employer_ei: Math.max(0, currentYTD.employer_ei - item.ei_employer),
            });
        }

        return this.updatePayRun(id, {
            status: 'void',
            voided_at: new Date().toISOString(),
            void_reason: reason,
        });
    }

    /**
     * Get pay run item deductions
     */
    async getPayRunItemDeductions(payRunItemId: number): Promise<PayRunItemDeduction[]> {
        const { data, error } = await supabase
            .from('pay_run_item_deductions')
            .select('*')
            .eq('pay_run_item_id', payRunItemId)
            .order('created_at', { ascending: true });

        if (error) throw new Error(error.message);
        return (data || []).map((ded) => ({
            ...ded,
            amount: Number(ded.amount),
        }));
    }

    /**
     * Calculate due date based on remitter type
     */
    private calculateDueDate(periodEnd: Date, remitterType: string): Date {
        const nextMonth = new Date(periodEnd.getFullYear(), periodEnd.getMonth() + 1, 1);

        switch (remitterType) {
            case 'quarterly':
                // Due by end of month following quarter
                return new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0);
            case 'regular':
                // Due by 15th of following month
                return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 15);
            case 'threshold1':
                // Due by 25th of same month (for payments before 16th)
                return new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 25);
            case 'threshold2':
                // Multiple due dates per month
                return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 10);
            default:
                return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 15);
        }
    }

    /**
     * Update remittance period when pay run is finalized
     */
    private async updateRemittancePeriodOnFinalize(payRun: PayRun): Promise<void> {
        // Determine remittance period based on pay date
        const payDate = new Date(payRun.pay_date);
        const periodStart = new Date(payDate.getFullYear(), payDate.getMonth(), 1);
        const periodEnd = new Date(payDate.getFullYear(), payDate.getMonth() + 1, 0);

        // Get payroll settings for remitter type
        const settings = await this.getPayrollSettings(payRun.company_id);
        if (!settings) {
            throw new Error('Payroll settings not found');
        }

        const dueDate = this.calculateDueDate(periodEnd, settings.remitter_type);

        // Get or create remittance period
        const { data: existingPeriod } = await supabase
            .from('remittance_periods')
            .select('*')
            .eq('company_id', payRun.company_id)
            .eq('period_start', periodStart.toISOString().split('T')[0])
            .eq('period_end', periodEnd.toISOString().split('T')[0])
            .maybeSingle();

        let period: RemittancePeriod;

        if (existingPeriod) {
            // Update existing period
            const newCppEmployee = Number(existingPeriod.cpp_employee) + payRun.total_cpp;
            const newCppEmployer = Number(existingPeriod.cpp_employer) + payRun.total_employer_cpp;
            const newCpp2Employee = Number(existingPeriod.cpp2_employee || 0) + (payRun.total_cpp2 || 0);
            const newEiEmployee = Number(existingPeriod.ei_employee) + payRun.total_ei;
            const newEiEmployer = Number(existingPeriod.ei_employer) + payRun.total_employer_ei;
            const newIncomeTax = Number(existingPeriod.income_tax) + payRun.total_federal_tax + payRun.total_provincial_tax;
            const newTotalOwing = newCppEmployee + newCppEmployer + newCpp2Employee + newEiEmployee + newEiEmployer + newIncomeTax;

            const { data: updated, error } = await supabase
                .from('remittance_periods')
                .update({
                    cpp_employee: newCppEmployee,
                    cpp_employer: newCppEmployer,
                    cpp2_employee: newCpp2Employee,
                    ei_employee: newEiEmployee,
                    ei_employer: newEiEmployer,
                    income_tax: newIncomeTax,
                    total_owing: newTotalOwing,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', existingPeriod.id)
                .select()
                .single();

            if (error) throw new Error(error.message);
            period = updated as RemittancePeriod;
        } else {
            // Create new period
            const cppEmployee = payRun.total_cpp;
            const cppEmployer = payRun.total_employer_cpp;
            const cpp2Employee = payRun.total_cpp2 || 0;
            const eiEmployee = payRun.total_ei;
            const eiEmployer = payRun.total_employer_ei;
            const incomeTax = payRun.total_federal_tax + payRun.total_provincial_tax;
            const totalOwing = cppEmployee + cppEmployer + cpp2Employee + eiEmployee + eiEmployer + incomeTax;

            const { data: created, error } = await supabase
                .from('remittance_periods')
                .insert({
                    company_id: payRun.company_id,
                    period_start: periodStart.toISOString().split('T')[0],
                    period_end: periodEnd.toISOString().split('T')[0],
                    due_date: dueDate.toISOString().split('T')[0],
                    cpp_employee: cppEmployee,
                    cpp_employer: cppEmployer,
                    cpp2_employee: cpp2Employee,
                    ei_employee: eiEmployee,
                    ei_employer: eiEmployer,
                    income_tax: incomeTax,
                    total_owing: totalOwing,
                    status: 'pending',
                })
                .select()
                .single();

            if (error) throw new Error(error.message);
            period = created as RemittancePeriod;
        }

        // Update status to overdue if past due date and not paid
        if (period.status === 'pending' && new Date(period.due_date) < new Date()) {
            await supabase
                .from('remittance_periods')
                .update({ status: 'overdue' })
                .eq('id', period.id);
        }
    }

    // Payroll Reports --------------------------------------------------------
    /**
     * Get payroll summary report
     */
    async getPayrollSummaryReport(params: {
        company_id: number;
        start_date: string;
        end_date: string;
        group_by?: 'period' | 'month' | 'quarter' | 'year';
    }): Promise<PayrollSummaryReport> {
        const { data: payRuns, error } = await supabase
            .from('pay_runs')
            .select('*, items:pay_run_items(*)')
            .eq('company_id', params.company_id)
            .eq('status', 'finalized')
            .gte('pay_period_start', params.start_date)
            .lte('pay_period_end', params.end_date)
            .order('pay_period_start', { ascending: true });

        if (error) throw new Error(error.message);

        const runs = payRuns || [];
        const allItems: PayRunItem[] = [];
        runs.forEach((run: any) => {
            if (run.items) {
                allItems.push(...run.items);
            }
        });

        // Calculate totals
        const earnings = {
            regular: allItems.reduce((sum, item) => sum + Number(item.regular_pay || 0), 0),
            overtime: allItems.reduce((sum, item) => sum + Number(item.overtime_pay || 0), 0),
            vacation: allItems.reduce((sum, item) => sum + Number(item.vacation_pay || 0), 0),
            taxable_benefits: allItems.reduce((sum, item) => sum + Number(item.taxable_benefits || 0), 0),
            total_gross: allItems.reduce((sum, item) => sum + Number(item.gross_pay || 0), 0),
        };

        const deductions = {
            cpp: allItems.reduce((sum, item) => sum + Number(item.cpp_employee || 0), 0),
            cpp2: allItems.reduce((sum, item) => sum + Number(item.cpp2_employee || 0), 0),
            ei: allItems.reduce((sum, item) => sum + Number(item.ei_employee || 0), 0),
            federal_tax: allItems.reduce((sum, item) => sum + Number(item.federal_tax || 0), 0),
            provincial_tax: allItems.reduce((sum, item) => sum + Number(item.provincial_tax || 0), 0),
            pre_tax: allItems.reduce((sum, item) => sum + Number(item.pre_tax_deductions || 0), 0),
            post_tax: allItems.reduce((sum, item) => sum + Number(item.post_tax_deductions || 0), 0),
            total: allItems.reduce((sum, item) => sum + Number(item.total_deductions || 0), 0),
        };

        const employer_costs = {
            cpp: allItems.reduce((sum, item) => sum + Number(item.cpp_employer || 0), 0),
            ei: allItems.reduce((sum, item) => sum + Number(item.ei_employer || 0), 0),
            total: allItems.reduce((sum, item) => sum + Number(item.employer_total_cost || 0), 0),
        };

        const remittance = {
            cpp_total: deductions.cpp + employer_costs.cpp,
            ei_total: deductions.ei + employer_costs.ei,
            income_tax: deductions.federal_tax + deductions.provincial_tax,
            total: deductions.cpp + employer_costs.cpp + deductions.cpp2 + deductions.ei + employer_costs.ei + deductions.federal_tax + deductions.provincial_tax,
        };

        const uniqueEmployeeIds = new Set(allItems.map((item) => item.employee_id));

        return {
            period_start: params.start_date,
            period_end: params.end_date,
            group_by: params.group_by || 'period',
            earnings,
            deductions,
            employer_costs,
            remittance,
            pay_run_count: runs.length,
            employee_count: uniqueEmployeeIds.size,
        };
    }

    /**
     * Get employee earnings report
     */
    async getEmployeeEarningsReport(params: {
        company_id: number;
        start_date: string;
        end_date: string;
        employee_id?: number;
    }): Promise<EmployeeEarningsReport> {
        let query = supabase
            .from('pay_run_items')
            .select('*, employee:employees(id, first_name, last_name, employee_id), pay_run:pay_runs!inner(pay_period_start, pay_period_end, status, company_id)')
            .eq('pay_run.status', 'finalized')
            .eq('pay_run.company_id', params.company_id)
            .gte('pay_run.pay_period_start', params.start_date)
            .lte('pay_run.pay_period_end', params.end_date);

        if (params.employee_id) {
            query = query.eq('employee_id', params.employee_id);
        }

        const { data: items, error } = await query;

        if (error) throw new Error(error.message);

        // Group by employee
        const employeeMap = new Map<number, {
            employee_id: number;
            employee_name: string;
            employee_id_code: string;
            regular_hours: number;
            overtime_hours: number;
            regular_pay: number;
            overtime_pay: number;
            gross_pay: number;
            net_pay: number;
            total_hours: number;
        }>();

        (items || []).forEach((item: any) => {
            const empId = item.employee_id;
            if (!employeeMap.has(empId)) {
                employeeMap.set(empId, {
                    employee_id: empId,
                    employee_name: `${item.employee?.first_name || ''} ${item.employee?.last_name || ''}`.trim(),
                    employee_id_code: item.employee?.employee_id || '',
                    regular_hours: 0,
                    overtime_hours: 0,
                    regular_pay: 0,
                    overtime_pay: 0,
                    gross_pay: 0,
                    net_pay: 0,
                    total_hours: 0,
                });
            }

            const emp = employeeMap.get(empId)!;
            emp.regular_hours += Number(item.regular_hours || 0);
            emp.overtime_hours += Number(item.overtime_hours || 0);
            emp.regular_pay += Number(item.regular_pay || 0);
            emp.overtime_pay += Number(item.overtime_pay || 0);
            emp.gross_pay += Number(item.gross_pay || 0);
            emp.net_pay += Number(item.net_pay || 0);
            emp.total_hours += Number(item.regular_hours || 0) + Number(item.overtime_hours || 0);
        });

        const employees = Array.from(employeeMap.values()).sort((a, b) => a.employee_name.localeCompare(b.employee_name));

        const totals = {
            regular_hours: employees.reduce((sum, emp) => sum + emp.regular_hours, 0),
            overtime_hours: employees.reduce((sum, emp) => sum + emp.overtime_hours, 0),
            regular_pay: employees.reduce((sum, emp) => sum + emp.regular_pay, 0),
            overtime_pay: employees.reduce((sum, emp) => sum + emp.overtime_pay, 0),
            gross_pay: employees.reduce((sum, emp) => sum + emp.gross_pay, 0),
            net_pay: employees.reduce((sum, emp) => sum + emp.net_pay, 0),
            total_hours: employees.reduce((sum, emp) => sum + emp.total_hours, 0),
        };

        return {
            period_start: params.start_date,
            period_end: params.end_date,
            employees,
            totals,
        };
    }

    /**
     * Get deductions report
     */
    async getDeductionsReport(params: {
        company_id: number;
        start_date: string;
        end_date: string;
    }): Promise<DeductionsReport> {
        const { data: items, error } = await supabase
            .from('pay_run_items')
            .select('*, employee:employees(id, first_name, last_name), pay_run:pay_runs!inner(pay_period_start, pay_period_end, status, company_id)')
            .eq('pay_run.status', 'finalized')
            .eq('pay_run.company_id', params.company_id)
            .gte('pay_run.pay_period_start', params.start_date)
            .lte('pay_run.pay_period_end', params.end_date);

        if (error) throw new Error(error.message);

        const statutoryDeductions = (items || []).map((item: any) => ({
            employee_id: item.employee_id,
            employee_name: `${item.employee?.first_name || ''} ${item.employee?.last_name || ''}`.trim(),
            cpp: Number(item.cpp_employee || 0),
            cpp2: Number(item.cpp2_employee || 0),
            ei: Number(item.ei_employee || 0),
            federal_tax: Number(item.federal_tax || 0),
            provincial_tax: Number(item.provincial_tax || 0),
        }));

        // Get other deductions from pay_run_item_deductions
        const { data: otherDeductions, error: dedError } = await supabase
            .from('pay_run_item_deductions')
            .select('*, pay_run_item:pay_run_items!inner(pay_run:pay_runs!inner(pay_period_start, pay_period_end, status, company_id))')
            .eq('pay_run_item.pay_run.status', 'finalized')
            .eq('pay_run_item.pay_run.company_id', params.company_id)
            .gte('pay_run_item.pay_run.pay_period_start', params.start_date)
            .lte('pay_run_item.pay_run.pay_period_end', params.end_date)
            .neq('category', 'statutory');

        if (dedError) throw new Error(dedError.message);

        // Group other deductions by type
        const deductionMap = new Map<string, { employee_count: Set<number>; total_amount: number }>();
        (otherDeductions || []).forEach((ded: any) => {
            const type = ded.description;
            if (!deductionMap.has(type)) {
                deductionMap.set(type, { employee_count: new Set(), total_amount: 0 });
            }
            const dedData = deductionMap.get(type)!;
            dedData.employee_count.add(ded.pay_run_item.employee_id);
            dedData.total_amount += Number(ded.amount || 0);
        });

        const otherDeductionsList = Array.from(deductionMap.entries()).map(([deduction_type, data]) => ({
            deduction_type,
            employee_count: data.employee_count.size,
            total_amount: data.total_amount,
        }));

        const totals = {
            cpp: statutoryDeductions.reduce((sum, emp) => sum + emp.cpp, 0),
            cpp2: statutoryDeductions.reduce((sum, emp) => sum + emp.cpp2, 0),
            ei: statutoryDeductions.reduce((sum, emp) => sum + emp.ei, 0),
            federal_tax: statutoryDeductions.reduce((sum, emp) => sum + emp.federal_tax, 0),
            provincial_tax: statutoryDeductions.reduce((sum, emp) => sum + emp.provincial_tax, 0),
            other: otherDeductionsList.reduce((sum, ded) => sum + ded.total_amount, 0),
            total: 0,
        };
        totals.total = totals.cpp + totals.cpp2 + totals.ei + totals.federal_tax + totals.provincial_tax + totals.other;

        return {
            period_start: params.start_date,
            period_end: params.end_date,
            statutory_deductions: statutoryDeductions,
            other_deductions: otherDeductionsList,
            totals,
        };
    }

    /**
     * Get payroll journal entry for a pay run
     */
    async getPayrollJournalEntry(payRunId: number): Promise<JournalEntry> {
        const payRun = await this.getPayRun(payRunId);

        const entries: Array<{ account: string; debit: number; credit: number }> = [];

        // Wages Expense
        entries.push({
            account: 'Wages Expense',
            debit: payRun.total_gross,
            credit: 0,
        });

        // Overtime Expense (if any)
        const overtimeTotal = payRun.items.reduce((sum, item) => sum + Number(item.overtime_pay || 0), 0);
        if (overtimeTotal > 0) {
            entries.push({
                account: 'Overtime Expense',
                debit: overtimeTotal,
                credit: 0,
            });
        }

        // Vacation Pay Expense (if any)
        const vacationTotal = payRun.items.reduce((sum, item) => sum + Number(item.vacation_pay || 0), 0);
        if (vacationTotal > 0) {
            entries.push({
                account: 'Vacation Pay Expense',
                debit: vacationTotal,
                credit: 0,
            });
        }

        // Benefits Expense (if any)
        const benefitsTotal = payRun.items.reduce((sum, item) => sum + Number(item.taxable_benefits || 0), 0);
        if (benefitsTotal > 0) {
            entries.push({
                account: 'Benefits Expense',
                debit: benefitsTotal,
                credit: 0,
            });
        }

        // Employer CPP Expense
        entries.push({
            account: 'CPP Expense (Employer)',
            debit: payRun.total_employer_cpp,
            credit: 0,
        });

        // Employer EI Expense
        entries.push({
            account: 'EI Expense (Employer)',
            debit: payRun.total_employer_ei,
            credit: 0,
        });

        // CPP Payable
        entries.push({
            account: 'CPP Payable',
            debit: 0,
            credit: payRun.total_cpp + payRun.total_employer_cpp + (payRun.total_cpp2 || 0),
        });

        // EI Payable
        entries.push({
            account: 'EI Payable',
            debit: 0,
            credit: payRun.total_ei + payRun.total_employer_ei,
        });

        // Federal Tax Payable
        entries.push({
            account: 'Federal Tax Payable',
            debit: 0,
            credit: payRun.total_federal_tax,
        });

        // Provincial Tax Payable
        entries.push({
            account: 'Provincial Tax Payable',
            debit: 0,
            credit: payRun.total_provincial_tax,
        });

        // Other Deductions Payable (pre-tax and post-tax)
        const otherDeductionsTotal = payRun.items.reduce((sum, item) => sum + Number(item.pre_tax_deductions || 0) + Number(item.post_tax_deductions || 0), 0);
        if (otherDeductionsTotal > 0) {
            entries.push({
                account: 'Other Deductions Payable',
                debit: 0,
                credit: otherDeductionsTotal,
            });
        }

        // Wages Payable / Cash
        entries.push({
            account: 'Wages Payable / Cash',
            debit: 0,
            credit: payRun.total_net,
        });

        const totalDebit = entries.reduce((sum, entry) => sum + entry.debit, 0);
        const totalCredit = entries.reduce((sum, entry) => sum + entry.credit, 0);

        return {
            pay_run_id: payRunId,
            pay_period_start: payRun.pay_period_start,
            pay_period_end: payRun.pay_period_end,
            pay_date: payRun.pay_date,
            entries,
            total_debit: totalDebit,
            total_credit: totalCredit,
        };
    }

    // Remittances ------------------------------------------------------------
    /**
     * Get remittance periods
     */
    async getRemittancePeriods(companyId: number, params?: {
        status?: 'pending' | 'paid' | 'overdue';
        start_date?: string;
        end_date?: string;
    }): Promise<RemittancePeriod[]> {
        let query = supabase
            .from('remittance_periods')
            .select('*')
            .eq('company_id', companyId)
            .order('period_start', { ascending: false });

        if (params?.status) {
            query = query.eq('status', params.status);
        }
        if (params?.start_date) {
            query = query.gte('period_start', params.start_date);
        }
        if (params?.end_date) {
            query = query.lte('period_end', params.end_date);
        }

        const { data, error } = await query;

        if (error) throw new Error(error.message);

        // Update overdue status for pending periods past due date
        const now = new Date();
        const periods = (data || []).map((period: any) => {
            if (period.status === 'pending' && new Date(period.due_date) < now) {
                // Update in database
                supabase
                    .from('remittance_periods')
                    .update({ status: 'overdue' })
                    .eq('id', period.id)
                    .then(() => { });
                return { ...period, status: 'overdue' as const };
            }
            return period;
        });

        return periods.map((p: any) => ({
            ...p,
            cpp_employee: Number(p.cpp_employee || 0),
            cpp_employer: Number(p.cpp_employer || 0),
            cpp2_employee: Number(p.cpp2_employee || 0),
            ei_employee: Number(p.ei_employee || 0),
            ei_employer: Number(p.ei_employer || 0),
            income_tax: Number(p.income_tax || 0),
            total_owing: Number(p.total_owing || 0),
            paid_amount: p.paid_amount ? Number(p.paid_amount) : null,
        }));
    }

    /**
     * Get a single remittance period by ID
     */
    async getRemittancePeriod(id: number): Promise<RemittancePeriod> {
        const { data, error } = await supabase
            .from('remittance_periods')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw new Error(error.message);
        if (!data) throw new Error('Remittance period not found');

        // Update overdue status if needed
        if (data.status === 'pending' && new Date(data.due_date) < new Date()) {
            const { data: updated } = await supabase
                .from('remittance_periods')
                .update({ status: 'overdue' })
                .eq('id', id)
                .select()
                .single();

            if (updated) {
                return {
                    ...updated,
                    cpp_employee: Number(updated.cpp_employee || 0),
                    cpp_employer: Number(updated.cpp_employer || 0),
                    cpp2_employee: Number(updated.cpp2_employee || 0),
                    ei_employee: Number(updated.ei_employee || 0),
                    ei_employer: Number(updated.ei_employer || 0),
                    income_tax: Number(updated.income_tax || 0),
                    total_owing: Number(updated.total_owing || 0),
                    paid_amount: updated.paid_amount ? Number(updated.paid_amount) : null,
                } as RemittancePeriod;
            }
        }

        return {
            ...data,
            cpp_employee: Number(data.cpp_employee || 0),
            cpp_employer: Number(data.cpp_employer || 0),
            cpp2_employee: Number(data.cpp2_employee || 0),
            ei_employee: Number(data.ei_employee || 0),
            ei_employer: Number(data.ei_employer || 0),
            income_tax: Number(data.income_tax || 0),
            total_owing: Number(data.total_owing || 0),
            paid_amount: data.paid_amount ? Number(data.paid_amount) : null,
        } as RemittancePeriod;
    }

    /**
     * Get current remittance period
     */
    async getCurrentRemittancePeriod(companyId: number): Promise<RemittancePeriod | null> {
        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const { data, error } = await supabase
            .from('remittance_periods')
            .select('*')
            .eq('company_id', companyId)
            .eq('period_start', periodStart.toISOString().split('T')[0])
            .eq('period_end', periodEnd.toISOString().split('T')[0])
            .maybeSingle();

        if (error) throw new Error(error.message);

        if (!data) return null;

        // Update overdue status if needed
        if (data.status === 'pending' && new Date(data.due_date) < now) {
            const { data: updated } = await supabase
                .from('remittance_periods')
                .update({ status: 'overdue' })
                .eq('id', data.id)
                .select()
                .single();

            if (updated) {
                return {
                    ...updated,
                    cpp_employee: Number(updated.cpp_employee || 0),
                    cpp_employer: Number(updated.cpp_employer || 0),
                    cpp2_employee: Number(updated.cpp2_employee || 0),
                    ei_employee: Number(updated.ei_employee || 0),
                    ei_employer: Number(updated.ei_employer || 0),
                    income_tax: Number(updated.income_tax || 0),
                    total_owing: Number(updated.total_owing || 0),
                    paid_amount: updated.paid_amount ? Number(updated.paid_amount) : null,
                } as RemittancePeriod;
            }
        }

        return {
            ...data,
            cpp_employee: Number(data.cpp_employee || 0),
            cpp_employer: Number(data.cpp_employer || 0),
            cpp2_employee: Number(data.cpp2_employee || 0),
            ei_employee: Number(data.ei_employee || 0),
            ei_employer: Number(data.ei_employer || 0),
            income_tax: Number(data.income_tax || 0),
            total_owing: Number(data.total_owing || 0),
            paid_amount: data.paid_amount ? Number(data.paid_amount) : null,
        } as RemittancePeriod;
    }

    /**
     * Record remittance payment
     */
    async recordRemittancePayment(id: number, payment: {
        paid_amount: number;
        paid_date: string;
        confirmation_number?: string;
        notes?: string;
    }): Promise<RemittancePeriod> {
        const { data, error } = await supabase
            .from('remittance_periods')
            .update({
                status: 'paid',
                paid_amount: payment.paid_amount,
                paid_date: payment.paid_date,
                confirmation_number: payment.confirmation_number || null,
                notes: payment.notes || null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);

        return {
            ...data,
            cpp_employee: Number(data.cpp_employee || 0),
            cpp_employer: Number(data.cpp_employer || 0),
            cpp2_employee: Number(data.cpp2_employee || 0),
            ei_employee: Number(data.ei_employee || 0),
            ei_employer: Number(data.ei_employer || 0),
            income_tax: Number(data.income_tax || 0),
            total_owing: Number(data.total_owing || 0),
            paid_amount: data.paid_amount ? Number(data.paid_amount) : null,
        } as RemittancePeriod;
    }

    /**
     * Get all data needed for pay stub generation
     */
    async getPayStubData(payRunItemId: number): Promise<{
        payRun: PayRun;
        item: PayRunItem;
        employee: Employee;
        company: Company;
        ytd: EmployeeYTD;
        deductions: PayRunItemDeduction[];
    }> {
        // Get pay run item with related data
        const { data: item, error: itemError } = await supabase
            .from('pay_run_items')
            .select(`
                *,
                employee:employees (*),
                pay_run:pay_runs (*)
            `)
            .eq('id', payRunItemId)
            .single();

        if (itemError) throw new Error(itemError.message);
        if (!item) throw new Error('Pay run item not found');

        const employee = item.employee;
        const payRun = item.pay_run;

        if (!employee || !payRun) {
            throw new Error('Employee or pay run data missing');
        }

        // Get company
        const company = await this.getCompany(payRun.company_id);

        // Get YTD data
        const taxYear = new Date(payRun.pay_period_start).getFullYear();
        const ytd = await this.getEmployeeYTD(employee.id, taxYear);

        // Get deductions
        const deductions = await this.getPayRunItemDeductions(payRunItemId);

        // Map pay run item
        const mappedItem: PayRunItem = {
            ...item,
            regular_hours: Number(item.regular_hours),
            overtime_hours: Number(item.overtime_hours),
            vacation_hours_used: Number(item.vacation_hours_used),
            sick_hours_used: Number(item.sick_hours_used),
            statutory_holiday_hours: Number(item.statutory_holiday_hours),
            hourly_rate: item.hourly_rate ? Number(item.hourly_rate) : null,
            overtime_rate: item.overtime_rate ? Number(item.overtime_rate) : null,
            regular_pay: Number(item.regular_pay),
            overtime_pay: Number(item.overtime_pay),
            vacation_pay: Number(item.vacation_pay),
            statutory_holiday_pay: Number(item.statutory_holiday_pay),
            other_earnings: Number(item.other_earnings),
            taxable_benefits: Number(item.taxable_benefits),
            gross_pay: Number(item.gross_pay),
            cpp_employee: Number(item.cpp_employee),
            cpp2_employee: Number(item.cpp2_employee),
            ei_employee: Number(item.ei_employee),
            federal_tax: Number(item.federal_tax),
            provincial_tax: Number(item.provincial_tax),
            pre_tax_deductions: Number(item.pre_tax_deductions),
            post_tax_deductions: Number(item.post_tax_deductions),
            total_deductions: Number(item.total_deductions),
            net_pay: Number(item.net_pay),
            cpp_employer: Number(item.cpp_employer),
            ei_employer: Number(item.ei_employer),
            employer_total_cost: Number(item.employer_total_cost),
            vacation_accrued: Number(item.vacation_accrued),
            vacation_rate_used: item.vacation_rate_used ? Number(item.vacation_rate_used) : null,
            ytd_gross_before: item.ytd_gross_before ? Number(item.ytd_gross_before) : null,
            ytd_cpp_before: item.ytd_cpp_before ? Number(item.ytd_cpp_before) : null,
            ytd_ei_before: item.ytd_ei_before ? Number(item.ytd_ei_before) : null,
            employee: employee,
        };

        // Map pay run
        const mappedPayRun: PayRun = {
            ...payRun,
            total_gross: Number(payRun.total_gross),
            total_cpp: Number(payRun.total_cpp),
            total_cpp2: Number(payRun.total_cpp2),
            total_ei: Number(payRun.total_ei),
            total_federal_tax: Number(payRun.total_federal_tax),
            total_provincial_tax: Number(payRun.total_provincial_tax),
            total_other_deductions: Number(payRun.total_other_deductions),
            total_net: Number(payRun.total_net),
            total_employer_cpp: Number(payRun.total_employer_cpp),
            total_employer_ei: Number(payRun.total_employer_ei),
            total_employer_cost: Number(payRun.total_employer_cost),
        };

        return {
            payRun: mappedPayRun,
            item: mappedItem,
            employee,
            company,
            ytd,
            deductions,
        };
    }

    // Employee Self-Service methods --------------------------------------------------------

    /**
     * Get employee's own pay stubs (from finalized pay runs)
     * Uses RLS to ensure employees only see their own data
     */
    async getMyPayStubs(params?: { year?: number; limit?: number }): Promise<(PayRunItem & { pay_run?: PayRun })[]> {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session?.user) {
            throw new Error('Not authenticated');
        }

        // Get current employee
        const { data: employee, error: empError } = await supabase
            .from('employees')
            .select('id')
            .eq('auth_user_id', sessionData.session.user.id)
            .single();

        if (empError || !employee) {
            throw new Error('Employee record not found');
        }

        // First get finalized pay runs for the employee
        let payRunQuery = supabase
            .from('pay_runs')
            .select('id, pay_period_start, pay_period_end, pay_date, status')
            .eq('status', 'finalized')
            .order('pay_date', { ascending: false });

        // Filter by year if provided
        if (params?.year) {
            const yearStart = `${params.year}-01-01`;
            const yearEnd = `${params.year}-12-31`;
            payRunQuery = payRunQuery
                .gte('pay_date', yearStart)
                .lte('pay_date', yearEnd);
        }

        const { data: payRuns, error: payRunError } = await payRunQuery;

        if (payRunError) throw new Error(payRunError.message);
        if (!payRuns || payRuns.length === 0) return [];

        const payRunIds = payRuns.map(pr => pr.id);

        // Now get pay run items for this employee from those pay runs
        let itemsQuery = supabase
            .from('pay_run_items')
            .select('*')
            .eq('employee_id', employee.id)
            .in('pay_run_id', payRunIds)
            .order('created_at', { ascending: false });

        // Apply limit if provided
        if (params?.limit) {
            itemsQuery = itemsQuery.limit(params.limit);
        }

        const { data: items, error: itemsError } = await itemsQuery;

        if (itemsError) throw new Error(itemsError.message);
        if (!items) return [];

        // Create a map of pay runs for quick lookup
        const payRunMap = new Map(payRuns.map(pr => [pr.id, pr]));

        // Map the data and include pay_run info
        return items.map((item: any) => {
            const payRun = payRunMap.get(item.pay_run_id);
            return {
                ...item,
                regular_hours: Number(item.regular_hours),
                overtime_hours: Number(item.overtime_hours),
                vacation_hours_used: Number(item.vacation_hours_used),
                sick_hours_used: Number(item.sick_hours_used),
                statutory_holiday_hours: Number(item.statutory_holiday_hours),
                hourly_rate: item.hourly_rate ? Number(item.hourly_rate) : null,
                overtime_rate: item.overtime_rate ? Number(item.overtime_rate) : null,
                regular_pay: Number(item.regular_pay),
                overtime_pay: Number(item.overtime_pay),
                vacation_pay: Number(item.vacation_pay),
                statutory_holiday_pay: Number(item.statutory_holiday_pay),
                other_earnings: Number(item.other_earnings),
                taxable_benefits: Number(item.taxable_benefits),
                gross_pay: Number(item.gross_pay),
                cpp_employee: Number(item.cpp_employee),
                cpp2_employee: Number(item.cpp2_employee),
                ei_employee: Number(item.ei_employee),
                federal_tax: Number(item.federal_tax),
                provincial_tax: Number(item.provincial_tax),
                pre_tax_deductions: Number(item.pre_tax_deductions),
                post_tax_deductions: Number(item.post_tax_deductions),
                total_deductions: Number(item.total_deductions),
                net_pay: Number(item.net_pay),
                cpp_employer: Number(item.cpp_employer),
                ei_employer: Number(item.ei_employer),
                employer_total_cost: Number(item.employer_total_cost),
                vacation_accrued: Number(item.vacation_accrued),
                vacation_rate_used: item.vacation_rate_used ? Number(item.vacation_rate_used) : null,
                ytd_gross_before: item.ytd_gross_before ? Number(item.ytd_gross_before) : null,
                ytd_cpp_before: item.ytd_cpp_before ? Number(item.ytd_cpp_before) : null,
                ytd_ei_before: item.ytd_ei_before ? Number(item.ytd_ei_before) : null,
                pay_run: payRun ? {
                    ...payRun,
                    total_gross: 0,
                    total_cpp: 0,
                    total_cpp2: 0,
                    total_ei: 0,
                    total_federal_tax: 0,
                    total_provincial_tax: 0,
                    total_other_deductions: 0,
                    total_net: 0,
                    total_employer_cpp: 0,
                    total_employer_ei: 0,
                    total_employer_cost: 0,
                    company_id: 0,
                    created_at: '',
                    updated_at: '',
                } : undefined,
            };
        });
    }

    /**
     * Get employee's YTD summary for a tax year
     * Uses RLS to ensure employees only see their own data
     */
    async getMyYTD(year?: number): Promise<EmployeeYTD> {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session?.user) {
            throw new Error('Not authenticated');
        }

        // Get current employee
        const { data: employee, error: empError } = await supabase
            .from('employees')
            .select('id')
            .eq('auth_user_id', sessionData.session.user.id)
            .single();

        if (empError || !employee) {
            throw new Error('Employee record not found');
        }

        const taxYear = year || new Date().getFullYear();
        return this.getEmployeeYTD(employee.id, taxYear);
    }

    /**
     * Get employee's tax credits (TD1)
     * Uses RLS to ensure employees only see their own data
     */
    async getMyTaxCredits(year?: number): Promise<EmployeeTaxCredits | null> {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session?.user) {
            throw new Error('Not authenticated');
        }

        // Get current employee
        const { data: employee, error: empError } = await supabase
            .from('employees')
            .select('id')
            .eq('auth_user_id', sessionData.session.user.id)
            .single();

        if (empError || !employee) {
            throw new Error('Employee record not found');
        }

        const taxYear = year || new Date().getFullYear();
        return this.getEmployeeTaxCredits(employee.id, taxYear);
    }

    /**
     * Update employee's tax credits (TD1)
     * Uses RLS to ensure employees only update their own data
     */
    async updateMyTaxCredits(year: number, credits: Partial<Omit<EmployeeTaxCredits, 'id' | 'employee_id' | 'tax_year' | 'created_at' | 'updated_at'>>): Promise<EmployeeTaxCredits> {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session?.user) {
            throw new Error('Not authenticated');
        }

        // Get current employee
        const { data: employee, error: empError } = await supabase
            .from('employees')
            .select('id')
            .eq('auth_user_id', sessionData.session.user.id)
            .single();

        if (empError || !employee) {
            throw new Error('Employee record not found');
        }

        // Get existing credits to fill in missing fields
        const existing = await this.getEmployeeTaxCredits(employee.id, year);
        const fullCredits: Omit<EmployeeTaxCredits, 'id' | 'employee_id' | 'tax_year' | 'created_at' | 'updated_at'> = {
            federal_basic_personal: credits.federal_basic_personal ?? existing?.federal_basic_personal ?? 15705,
            federal_additional_claims: credits.federal_additional_claims ?? existing?.federal_additional_claims ?? 0,
            federal_total_claim: credits.federal_total_claim ?? existing?.federal_total_claim ?? 15705,
            provincial_basic_personal: credits.provincial_basic_personal ?? existing?.provincial_basic_personal ?? 12866,
            provincial_additional_claims: credits.provincial_additional_claims ?? existing?.provincial_additional_claims ?? 0,
            provincial_total_claim: credits.provincial_total_claim ?? existing?.provincial_total_claim ?? 12866,
            claim_tax_exempt: credits.claim_tax_exempt ?? existing?.claim_tax_exempt ?? false,
            additional_tax_per_pay: credits.additional_tax_per_pay ?? existing?.additional_tax_per_pay ?? 0,
            effective_date: credits.effective_date ?? existing?.effective_date ?? new Date().toISOString().split('T')[0],
        };

        return this.updateEmployeeTaxCredits(employee.id, year, fullCredits);
    }

    /**
     * Get employee's T4 slips
     * Uses RLS to ensure employees only see their own data
     */
    async getMyT4s(): Promise<T4Slip[]> {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session?.user) {
            throw new Error('Not authenticated');
        }

        // Get current employee
        const { data: employee, error: empError } = await supabase
            .from('employees')
            .select('id')
            .eq('auth_user_id', sessionData.session.user.id)
            .single();

        if (empError || !employee) {
            throw new Error('Employee record not found');
        }

        const { data, error } = await supabase
            .from('t4_slips')
            .select('*')
            .eq('employee_id', employee.id)
            .order('tax_year', { ascending: false });

        if (error) throw new Error(error.message);
        if (!data) return [];

        return data.map((t4) => ({
            ...t4,
            box_14_employment_income: Number(t4.box_14_employment_income),
            box_16_cpp_contributions: Number(t4.box_16_cpp_contributions),
            box_16a_cpp2_contributions: Number(t4.box_16a_cpp2_contributions),
            box_18_ei_premiums: Number(t4.box_18_ei_premiums),
            box_22_income_tax_deducted: Number(t4.box_22_income_tax_deducted),
            box_24_ei_insurable_earnings: Number(t4.box_24_ei_insurable_earnings),
            box_26_cpp_pensionable_earnings: Number(t4.box_26_cpp_pensionable_earnings),
            box_44_union_dues: Number(t4.box_44_union_dues),
            box_46_charitable_donations: Number(t4.box_46_charitable_donations),
            box_50_rpp_contributions: Number(t4.box_50_rpp_contributions),
            box_52_pension_adjustment: Number(t4.box_52_pension_adjustment),
        }));
    }

    /**
     * Get employee's own info
     * Uses RLS to ensure employees only see their own data
     */
    async getMyInfo(): Promise<Employee> {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session?.user) {
            throw new Error('Not authenticated');
        }

        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .eq('auth_user_id', sessionData.session.user.id)
            .single();

        if (error) throw new Error(error.message);
        if (!data) throw new Error('Employee record not found');

        return {
            ...data,
            payrate: data.payrate ? Number(data.payrate) : null,
        };
    }

    /**
     * Update employee's address
     * Uses RLS to ensure employees only update their own data
     */
    async updateMyAddress(address: string): Promise<Employee> {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session?.user) {
            throw new Error('Not authenticated');
        }

        // Get current employee
        const { data: employee, error: empError } = await supabase
            .from('employees')
            .select('id')
            .eq('auth_user_id', sessionData.session.user.id)
            .single();

        if (empError || !employee) {
            throw new Error('Employee record not found');
        }

        const { data, error } = await supabase
            .from('employees')
            .update({ address })
            .eq('id', employee.id)
            .select('*')
            .single();

        if (error) throw new Error(error.message);
        if (!data) throw new Error('Employee record not found');

        return {
            ...data,
            payrate: data.payrate ? Number(data.payrate) : null,
        };
    }

    /**
     * Generate T4 for a single employee
     */
    async generateT4(employeeId: number, taxYear: number): Promise<T4Slip> {
        // Validation: Tax year must be complete (can only generate after Dec 31)
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        if (taxYear >= currentYear) {
            throw new Error(`T4s can only be generated for completed tax years. Current year is ${currentYear}.`);
        }

        // Get employee info
        const employee = await this.getEmployee(employeeId);
        if (!employee.sin) {
            throw new Error('Employee SIN is required for T4 generation');
        }
        if (!employee.address) {
            throw new Error('Employee address is required for T4 generation');
        }

        // Get company info
        const company = await this.getCompany(employee.company_id);
        if (!company.business_number) {
            throw new Error('Company business number is required for T4 generation');
        }

        // Get YTD data (may not exist if no pay runs yet)
        let ytd;
        try {
            ytd = await this.getEmployeeYTD(employeeId, taxYear);
        } catch (error) {
            // YTD doesn't exist - check if pay runs exist
            ytd = null;
        }

        // Validation: YTD data must exist and have earnings
        if (!ytd || ytd.gross_earnings === 0) {
            // Check if at least one finalized pay run exists for this employee in this year
            const { data: payRuns, error: payRunError } = await supabase
                .from('pay_run_items')
                .select('pay_run_id, pay_runs!inner(pay_date, status)')
                .eq('employee_id', employeeId)
                .eq('pay_runs.status', 'finalized')
                .gte('pay_runs.pay_date', `${taxYear}-01-01`)
                .lte('pay_runs.pay_date', `${taxYear}-12-31`)
                .limit(1);

            if (payRunError) {
                throw new Error(`Error checking pay runs: ${payRunError.message}`);
            }

            if (!payRuns || payRuns.length === 0) {
                throw new Error(`No finalized pay runs found for employee for tax year ${taxYear}. Ensure pay runs are finalized before generating T4s.`);
            }

            // Pay runs exist but YTD is missing or zero - this shouldn't happen but handle gracefully
            throw new Error(`No payroll data found for employee for tax year ${taxYear}. YTD data may not be up to date. Please ensure pay runs are finalized.`);
        }

        // Get current user for generated_by
        const { data: sessionData } = await supabase.auth.getSession();
        const profile = sessionData.session?.user
            ? await supabase
                .from('profiles')
                .select('id')
                .eq('auth_user_id', sessionData.session.user.id)
                .single()
            : { data: null };

        // Calculate T4 boxes from YTD
        const t4Data = {
            company_id: company.id,
            employee_id: employeeId,
            tax_year: taxYear,
            status: 'generated' as const,
            employee_name: `${employee.last_name}, ${employee.first_name}`,
            employee_sin: employee.sin,
            employee_address: employee.address,
            employer_name: company.name,
            employer_bn: company.business_number,
            employer_address: null, // Company address not stored in Company table
            box_14_employment_income: ytd.gross_earnings || 0,
            box_16_cpp_contributions: ytd.cpp_contributions || 0,
            box_16a_cpp2_contributions: ytd.cpp2_contributions || 0,
            box_18_ei_premiums: ytd.ei_premiums || 0,
            box_22_income_tax_deducted:
                (ytd.federal_tax_withheld || 0) + (ytd.provincial_tax_withheld || 0),
            box_24_ei_insurable_earnings: ytd.insurable_earnings || 0,
            box_26_cpp_pensionable_earnings: ytd.pensionable_earnings || 0,
            box_44_union_dues: ytd.union_dues || 0,
            box_46_charitable_donations: ytd.charitable_donations || 0,
            box_50_rpp_contributions: ytd.rrsp_contributions || 0,
            box_52_pension_adjustment: 0, // Would need additional data
            other_info: {
                box_40_taxable_benefits: ytd.taxable_benefits || 0,
            },
            generated_at: new Date().toISOString(),
            generated_by: profile.data?.id || null,
        };

        // Upsert T4 (update if exists, create if not)
        const { data, error } = await supabase
            .from('t4_slips')
            .upsert(t4Data, {
                onConflict: 'company_id,employee_id,tax_year',
            })
            .select('*')
            .single();

        if (error) throw new Error(error.message);
        if (!data) throw new Error('Failed to generate T4');

        return {
            ...data,
            box_14_employment_income: Number(data.box_14_employment_income),
            box_16_cpp_contributions: Number(data.box_16_cpp_contributions),
            box_16a_cpp2_contributions: Number(data.box_16a_cpp2_contributions),
            box_18_ei_premiums: Number(data.box_18_ei_premiums),
            box_22_income_tax_deducted: Number(data.box_22_income_tax_deducted),
            box_24_ei_insurable_earnings: Number(data.box_24_ei_insurable_earnings),
            box_26_cpp_pensionable_earnings: Number(data.box_26_cpp_pensionable_earnings),
            box_44_union_dues: Number(data.box_44_union_dues),
            box_46_charitable_donations: Number(data.box_46_charitable_donations),
            box_50_rpp_contributions: Number(data.box_50_rpp_contributions),
            box_52_pension_adjustment: Number(data.box_52_pension_adjustment),
        };
    }

    /**
     * Generate T4s for all employees in a company for a tax year
     */
    async generateAllT4s(companyId: number, taxYear: number): Promise<T4Slip[]> {
        // Get all active employees
        const { data: employees, error: empError } = await supabase
            .from('employees')
            .select('id')
            .eq('company_id', companyId)
            .eq('status', 'active');

        if (empError) throw new Error(empError.message);
        if (!employees || employees.length === 0) return [];

        // Generate T4 for each employee
        const results: T4Slip[] = [];
        const errors: string[] = [];

        for (const employee of employees) {
            try {
                const t4 = await this.generateT4(employee.id, taxYear);
                results.push(t4);
            } catch (error) {
                errors.push(`Employee ${employee.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }

        if (errors.length > 0 && results.length === 0) {
            throw new Error(`Failed to generate any T4s: ${errors.join('; ')}`);
        }

        return results;
    }

    /**
     * Regenerate an existing T4
     */
    async regenerateT4(t4Id: number): Promise<T4Slip> {
        // Get existing T4
        const t4 = await this.getT4(t4Id);
        return this.generateT4(t4.employee_id, t4.tax_year);
    }

    /**
     * Get T4s for a company and tax year
     */
    async getT4s(params: { company_id: number; tax_year: number }): Promise<T4Slip[]> {
        const { data, error } = await supabase
            .from('t4_slips')
            .select('*')
            .eq('company_id', params.company_id)
            .eq('tax_year', params.tax_year)
            .order('employee_name');

        if (error) throw new Error(error.message);
        if (!data) return [];

        return data.map((t4) => ({
            ...t4,
            box_14_employment_income: Number(t4.box_14_employment_income),
            box_16_cpp_contributions: Number(t4.box_16_cpp_contributions),
            box_16a_cpp2_contributions: Number(t4.box_16a_cpp2_contributions),
            box_18_ei_premiums: Number(t4.box_18_ei_premiums),
            box_22_income_tax_deducted: Number(t4.box_22_income_tax_deducted),
            box_24_ei_insurable_earnings: Number(t4.box_24_ei_insurable_earnings),
            box_26_cpp_pensionable_earnings: Number(t4.box_26_cpp_pensionable_earnings),
            box_44_union_dues: Number(t4.box_44_union_dues),
            box_46_charitable_donations: Number(t4.box_46_charitable_donations),
            box_50_rpp_contributions: Number(t4.box_50_rpp_contributions),
            box_52_pension_adjustment: Number(t4.box_52_pension_adjustment),
        }));
    }

    /**
     * Get a single T4 by ID
     */
    async getT4(id: number): Promise<T4Slip> {
        const { data, error } = await supabase
            .from('t4_slips')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw new Error(error.message);
        if (!data) throw new Error('T4 not found');

        return {
            ...data,
            box_14_employment_income: Number(data.box_14_employment_income),
            box_16_cpp_contributions: Number(data.box_16_cpp_contributions),
            box_16a_cpp2_contributions: Number(data.box_16a_cpp2_contributions),
            box_18_ei_premiums: Number(data.box_18_ei_premiums),
            box_22_income_tax_deducted: Number(data.box_22_income_tax_deducted),
            box_24_ei_insurable_earnings: Number(data.box_24_ei_insurable_earnings),
            box_26_cpp_pensionable_earnings: Number(data.box_26_cpp_pensionable_earnings),
            box_44_union_dues: Number(data.box_44_union_dues),
            box_46_charitable_donations: Number(data.box_46_charitable_donations),
            box_50_rpp_contributions: Number(data.box_50_rpp_contributions),
            box_52_pension_adjustment: Number(data.box_52_pension_adjustment),
        };
    }

    /**
     * Get T4 for a specific employee and tax year
     */
    async getEmployeeT4(employeeId: number, taxYear: number): Promise<T4Slip | null> {
        const { data, error } = await supabase
            .from('t4_slips')
            .select('*')
            .eq('employee_id', employeeId)
            .eq('tax_year', taxYear)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No rows returned
                return null;
            }
            throw new Error(error.message);
        }
        if (!data) return null;

        return {
            ...data,
            box_14_employment_income: Number(data.box_14_employment_income),
            box_16_cpp_contributions: Number(data.box_16_cpp_contributions),
            box_16a_cpp2_contributions: Number(data.box_16a_cpp2_contributions),
            box_18_ei_premiums: Number(data.box_18_ei_premiums),
            box_22_income_tax_deducted: Number(data.box_22_income_tax_deducted),
            box_24_ei_insurable_earnings: Number(data.box_24_ei_insurable_earnings),
            box_26_cpp_pensionable_earnings: Number(data.box_26_cpp_pensionable_earnings),
            box_44_union_dues: Number(data.box_44_union_dues),
            box_46_charitable_donations: Number(data.box_46_charitable_donations),
            box_50_rpp_contributions: Number(data.box_50_rpp_contributions),
            box_52_pension_adjustment: Number(data.box_52_pension_adjustment),
        };
    }

    /**
     * Mark T4 as filed
     */
    async markT4AsFiled(id: number): Promise<T4Slip> {
        const { data, error } = await supabase
            .from('t4_slips')
            .update({
                status: 'filed',
                filed_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select('*')
            .single();

        if (error) throw new Error(error.message);
        if (!data) throw new Error('T4 not found');

        return {
            ...data,
            box_14_employment_income: Number(data.box_14_employment_income),
            box_16_cpp_contributions: Number(data.box_16_cpp_contributions),
            box_16a_cpp2_contributions: Number(data.box_16a_cpp2_contributions),
            box_18_ei_premiums: Number(data.box_18_ei_premiums),
            box_22_income_tax_deducted: Number(data.box_22_income_tax_deducted),
            box_24_ei_insurable_earnings: Number(data.box_24_ei_insurable_earnings),
            box_26_cpp_pensionable_earnings: Number(data.box_26_cpp_pensionable_earnings),
            box_44_union_dues: Number(data.box_44_union_dues),
            box_46_charitable_donations: Number(data.box_46_charitable_donations),
            box_50_rpp_contributions: Number(data.box_50_rpp_contributions),
            box_52_pension_adjustment: Number(data.box_52_pension_adjustment),
        };
    }

    /**
     * Amend a T4 with corrections
     */
    async amendT4(id: number, changes: Partial<{
        box_14_employment_income: number;
        box_16_cpp_contributions: number;
        box_16a_cpp2_contributions: number;
        box_18_ei_premiums: number;
        box_22_income_tax_deducted: number;
        box_24_ei_insurable_earnings: number;
        box_26_cpp_pensionable_earnings: number;
        box_44_union_dues: number;
        box_46_charitable_donations: number;
        box_50_rpp_contributions: number;
        box_52_pension_adjustment: number;
    }>): Promise<T4Slip> {
        const { data, error } = await supabase
            .from('t4_slips')
            .update({
                ...changes,
                status: 'amended',
                amended_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select('*')
            .single();

        if (error) throw new Error(error.message);
        if (!data) throw new Error('T4 not found');

        return {
            ...data,
            box_14_employment_income: Number(data.box_14_employment_income),
            box_16_cpp_contributions: Number(data.box_16_cpp_contributions),
            box_16a_cpp2_contributions: Number(data.box_16a_cpp2_contributions),
            box_18_ei_premiums: Number(data.box_18_ei_premiums),
            box_22_income_tax_deducted: Number(data.box_22_income_tax_deducted),
            box_24_ei_insurable_earnings: Number(data.box_24_ei_insurable_earnings),
            box_26_cpp_pensionable_earnings: Number(data.box_26_cpp_pensionable_earnings),
            box_44_union_dues: Number(data.box_44_union_dues),
            box_46_charitable_donations: Number(data.box_46_charitable_donations),
            box_50_rpp_contributions: Number(data.box_50_rpp_contributions),
            box_52_pension_adjustment: Number(data.box_52_pension_adjustment),
        };
    }

    /**
     * Generate Invoice PDF (client-side)
     * Returns a Blob that can be downloaded
     */
    async getInvoicePDF(invoiceId: number): Promise<Blob> {
        const invoice = await this.getInvoice(invoiceId);
        if (!invoice.client) {
            throw new Error('Invoice client not found');
        }
        const company = await this.getCompany(invoice.company_id);

        // Dynamic import to avoid SSR issues
        const { InvoiceDocument } = await import('./invoiceGenerator');
        const { pdf } = await import('@react-pdf/renderer');
        const React = await import('react');

        const doc = React.createElement(InvoiceDocument, { invoice, client: invoice.client, company }) as any;
        const blob = await pdf(doc).toBlob();
        return blob;
    }

    /**
     * Send invoice via email
     * Generates PDF and sends it via edge function
     */
    async sendInvoiceEmail(invoiceId: number, recipientEmail: string, message?: string): Promise<{ success: boolean; message: string }> {
        try {
            // Get the current session token
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session) {
                throw new Error('Not authenticated. Please log in again.');
            }

            // Generate PDF
            const pdfBlob = await this.getInvoicePDF(invoiceId);

            // Convert blob to base64
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64String = (reader.result as string).split(',')[1];
                    resolve(base64String);
                };
                reader.onerror = reject;
                reader.readAsDataURL(pdfBlob);
            });

            // Call Node server with user's session token
            const response = await fetch(`${BACKEND_URL}/api/emails/invoice`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    invoiceId,
                    recipientEmail,
                    pdfBase64: base64,
                    message,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send invoice email');
            }

            return {
                success: true,
                message: data.message || 'Invoice sent successfully',
            };
        } catch (error: any) {
            console.error('Error sending invoice email:', error);
            return {
                success: false,
                message: error.message || 'Failed to send invoice email',
            };
        }
    }

    /**
     * Generate T4 PDF (client-side)
     * Returns a Blob that can be downloaded
     */
    async getT4PDF(t4Id: number): Promise<Blob> {
        const t4 = await this.getT4(t4Id);
        const company = await this.getCompany(t4.company_id);

        // Dynamic import to avoid SSR issues
        const { T4Document } = await import('./t4Generator');
        const { pdf } = await import('@react-pdf/renderer');
        const React = await import('react');

        const doc = React.createElement(T4Document, { t4, company }) as any;
        const blob = await pdf(doc).toBlob();
        return blob;
    }

    /**
     * Get all ROEs for a company
     */
    async getROEs(companyId: number): Promise<ROERecord[]> {
        const { data, error } = await supabase
            .from('roe_records')
            .select('*')
            .eq('company_id', companyId)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        if (!data) return [];

        return data.map((roe) => ({
            ...roe,
            total_insurable_hours: Number(roe.total_insurable_hours),
            total_insurable_earnings: Number(roe.total_insurable_earnings),
            vacation_pay: Number(roe.vacation_pay),
            pay_period_earnings: (roe.pay_period_earnings as any) || [],
            other_monies: (roe.other_monies as any) || null,
        }));
    }

    /**
     * Get a single ROE by ID
     */
    async getROE(id: number): Promise<ROERecord> {
        const { data, error } = await supabase
            .from('roe_records')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw new Error(error.message);
        if (!data) throw new Error('ROE not found');

        return {
            ...data,
            total_insurable_hours: Number(data.total_insurable_hours),
            total_insurable_earnings: Number(data.total_insurable_earnings),
            vacation_pay: Number(data.vacation_pay),
            pay_period_earnings: (data.pay_period_earnings as any) || [],
            other_monies: (data.other_monies as any) || null,
        };
    }

    /**
     * Collect ROE data for an employee from pay run history
     */
    async collectROEDataForEmployee(employeeId: number): Promise<Partial<ROERecord>> {
        const employee = await this.getEmployee(employeeId);
        if (!employee.hire_date) {
            throw new Error('Employee hire date is required');
        }

        // Get all finalized pay runs for the company
        const payRuns = await this.getPayRuns({
            company_id: employee.company_id,
        });

        // Get all pay run items for this employee from finalized pay runs
        const allItems: PayRunItem[] = [];
        for (const payRun of payRuns) {
            if (payRun.status === 'finalized') {
                const fullPayRun = await this.getPayRun(payRun.id);
                const employeeItems = (fullPayRun.items || []).filter(
                    (item) => item.employee_id === employeeId
                );
                allItems.push(...employeeItems);
            }
        }

        // Sort by pay date descending and take first 27
        allItems.sort((a, b) => {
            const payRunA = payRuns.find((pr) => pr.id === a.pay_run_id);
            const payRunB = payRuns.find((pr) => pr.id === b.pay_run_id);
            if (!payRunA || !payRunB) return 0;
            return new Date(payRunB.pay_date).getTime() - new Date(payRunA.pay_date).getTime();
        });

        const last27Items = allItems.slice(0, 27);

        // Calculate totals
        let totalHours = 0;
        let totalInsurableEarnings = 0;
        const payPeriodEarnings: Array<{ period_end: string; earnings: number; hours: number }> =
            [];

        for (const item of last27Items) {
            const payRun = payRuns.find((pr) => pr.id === item.pay_run_id);
            if (!payRun) continue;

            const hours =
                item.regular_hours + item.overtime_hours + item.vacation_hours_used;
            const earnings = item.gross_pay; // Insurable earnings = gross pay

            totalHours += hours;
            totalInsurableEarnings += earnings;

            payPeriodEarnings.push({
                period_end: payRun.pay_period_end,
                earnings,
                hours,
            });
        }

        // Get vacation balance from YTD
        const currentYear = new Date().getFullYear();
        const ytd = await this.getEmployeeYTD(employeeId, currentYear);

        // Determine last day paid and final pay period end
        const lastItem = last27Items[0];
        const lastPayRun = lastItem
            ? payRuns.find((pr) => pr.id === lastItem.pay_run_id)
            : null;

        return {
            first_day_worked: employee.hire_date,
            last_day_paid: lastPayRun?.pay_date || new Date().toISOString().split('T')[0],
            final_pay_period_end:
                lastPayRun?.pay_period_end || new Date().toISOString().split('T')[0],
            total_insurable_hours: totalHours,
            total_insurable_earnings: totalInsurableEarnings,
            pay_period_earnings: payPeriodEarnings.reverse(), // Reverse to chronological order
            vacation_pay: ytd.vacation_balance || 0,
        };
    }

    /**
     * Create a new ROE record
     */
    async createROE(input: ROEInput): Promise<ROERecord> {
        const employee = await this.getEmployee(input.employeeId);
        const collectedData = await this.collectROEDataForEmployee(input.employeeId);

        // Get current user for created_by
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.user) {
            await supabase
                .from('profiles')
                .select('id')
                .eq('auth_user_id', sessionData.session.user.id)
                .single();
        }

        const roeData = {
            company_id: employee.company_id,
            employee_id: input.employeeId,
            status: 'draft' as const,
            first_day_worked: collectedData.first_day_worked || employee.hire_date!,
            last_day_paid: input.lastDayPaid,
            final_pay_period_end: input.finalPayPeriodEnd,
            total_insurable_hours: collectedData.total_insurable_hours || 0,
            total_insurable_earnings: collectedData.total_insurable_earnings || 0,
            reason_code: input.reasonCode,
            pay_period_earnings: collectedData.pay_period_earnings || [],
            vacation_pay: input.vacationPay ?? collectedData.vacation_pay ?? 0,
            other_monies: input.otherMonies || null,
            comments: input.comments || null,
        };

        const { data, error } = await supabase
            .from('roe_records')
            .insert(roeData)
            .select('*')
            .single();

        if (error) throw new Error(error.message);
        if (!data) throw new Error('Failed to create ROE');

        return {
            ...data,
            total_insurable_hours: Number(data.total_insurable_hours),
            total_insurable_earnings: Number(data.total_insurable_earnings),
            vacation_pay: Number(data.vacation_pay),
            pay_period_earnings: (data.pay_period_earnings as any) || [],
            other_monies: (data.other_monies as any) || null,
        };
    }

    /**
     * Update an existing ROE record (only if status is 'draft')
     */
    async updateROE(id: number, data: Partial<ROERecord>): Promise<ROERecord> {
        // Check current status
        const currentROE = await this.getROE(id);
        if (currentROE.status !== 'draft') {
            throw new Error('Can only update ROE records with status "draft"');
        }

        const updateData: any = {};
        if (data.first_day_worked !== undefined) updateData.first_day_worked = data.first_day_worked;
        if (data.last_day_paid !== undefined) updateData.last_day_paid = data.last_day_paid;
        if (data.final_pay_period_end !== undefined)
            updateData.final_pay_period_end = data.final_pay_period_end;
        if (data.total_insurable_hours !== undefined)
            updateData.total_insurable_hours = data.total_insurable_hours;
        if (data.total_insurable_earnings !== undefined)
            updateData.total_insurable_earnings = data.total_insurable_earnings;
        if (data.reason_code !== undefined) updateData.reason_code = data.reason_code;
        if (data.pay_period_earnings !== undefined)
            updateData.pay_period_earnings = data.pay_period_earnings;
        if (data.vacation_pay !== undefined) updateData.vacation_pay = data.vacation_pay;
        if (data.other_monies !== undefined) updateData.other_monies = data.other_monies;
        if (data.comments !== undefined) updateData.comments = data.comments;
        if (data.roe_serial_number !== undefined)
            updateData.roe_serial_number = data.roe_serial_number;

        const { data: updated, error } = await supabase
            .from('roe_records')
            .update(updateData)
            .eq('id', id)
            .select('*')
            .single();

        if (error) throw new Error(error.message);
        if (!updated) throw new Error('Failed to update ROE');

        return {
            ...updated,
            total_insurable_hours: Number(updated.total_insurable_hours),
            total_insurable_earnings: Number(updated.total_insurable_earnings),
            vacation_pay: Number(updated.vacation_pay),
            pay_period_earnings: (updated.pay_period_earnings as any) || [],
            other_monies: (updated.other_monies as any) || null,
        };
    }

    /**
     * Mark ROE as generated
     */
    async generateROE(id: number): Promise<ROERecord> {
        // Get current user for generated_by
        const { data: sessionData } = await supabase.auth.getSession();
        const profile = sessionData.session?.user
            ? await supabase
                .from('profiles')
                .select('id')
                .eq('auth_user_id', sessionData.session.user.id)
                .single()
            : { data: null };

        const { data, error } = await supabase
            .from('roe_records')
            .update({
                status: 'generated',
                generated_at: new Date().toISOString(),
                generated_by: profile.data?.id || null,
            })
            .eq('id', id)
            .select('*')
            .single();

        if (error) throw new Error(error.message);
        if (!data) throw new Error('Failed to generate ROE');

        return {
            ...data,
            total_insurable_hours: Number(data.total_insurable_hours),
            total_insurable_earnings: Number(data.total_insurable_earnings),
            vacation_pay: Number(data.vacation_pay),
            pay_period_earnings: (data.pay_period_earnings as any) || [],
            other_monies: (data.other_monies as any) || null,
        };
    }

    /**
     * Mark ROE as submitted
     */
    async submitROE(id: number): Promise<ROERecord> {
        const { data, error } = await supabase
            .from('roe_records')
            .update({
                status: 'submitted',
                submitted_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select('*')
            .single();

        if (error) throw new Error(error.message);
        if (!data) throw new Error('Failed to submit ROE');

        return {
            ...data,
            total_insurable_hours: Number(data.total_insurable_hours),
            total_insurable_earnings: Number(data.total_insurable_earnings),
            vacation_pay: Number(data.vacation_pay),
            pay_period_earnings: (data.pay_period_earnings as any) || [],
            other_monies: (data.other_monies as any) || null,
        };
    }

    /**
     * Generate all T4 PDFs for a company and tax year as a zip file
     * Returns a Blob containing the zip file
     */
    async getAllT4PDFs(companyId: number, taxYear: number): Promise<Blob> {
        const t4s = await this.getT4s({ company_id: companyId, tax_year: taxYear });
        const company = await this.getCompany(companyId);

        // Dynamic imports
        const { T4Document } = await import('./t4Generator');
        const { pdf } = await import('@react-pdf/renderer');
        const React = await import('react');
        const JSZip = (await import('jszip')).default;

        const zip = new JSZip();

        // Generate PDF for each T4
        for (const t4 of t4s) {
            const doc = React.createElement(T4Document, { t4, company }) as any;
            const blob = await pdf(doc).toBlob();
            const fileName = `T4_${t4.employee_name.replace(/[^a-zA-Z0-9]/g, '_')}_${taxYear}.pdf`;
            zip.file(fileName, blob);
        }

        // Generate zip file
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        return zipBlob;
    }
}

export const api = new SupabaseApi();
export default api;
