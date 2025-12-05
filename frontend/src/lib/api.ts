import { supabase, SUPABASE_STORAGE_BUCKET } from './supabaseClient';

export interface User {
    id: number;
    email: string;
    name: string;
    role: 'admin' | 'accountant' | 'viewer';
    company_id: number;
    company?: Company;
    created_at: string;
    updated_at: string;
}

export interface Company {
    id: number;
    name: string;
    business_number: string;
    hst_number?: string | null;
    hst_registered: boolean;
    fiscal_year_end: string;
    small_business_rate: number;
    hst_rate: number;
    rdtoh_balance?: number;
    investment_interest_tax_rate?: number;
    investment_eligible_dividend_tax_rate?: number;
    investment_noneligible_dividend_tax_rate?: number;
    investment_capital_gain_tax_rate?: number;
    capital_loss_carryforward?: number; // Unused capital losses from previous years (50% included amount)
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
    created_at: string;
    updated_at: string;
}

export interface Salary {
    id: number;
    amount: number;
    payment_date: string;
    period_start: string;
    period_end: string;
    employee_name: string;
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

export interface Investment {
    id: number;
    company_id: number;
    company?: Company;
    investment_type: 'stock' | 'gic';
    description: string;
    symbol?: string | null;
    institution?: string | null;
    purchase_date: string;
    purchase_amount: number;
    funding_source: 'retained_earnings' | 'total_cash';
    current_value?: number | null;
    maturity_date?: string | null;
    status: 'active' | 'sold' | 'matured';
    notes?: string | null;
    interest_rate?: number | null;
    current_balance?: number | null;
    created_at: string;
    updated_at: string;
}

export interface InvestmentIncome {
    id: number;
    investment_id: number;
    investment?: Investment;
    company_id: number;
    company?: Company;
    income_type: 'dividend' | 'interest' | 'capital_gain' | 'capital_loss';
    amount: number;
    income_date: string;
    fiscal_year: number;
    is_eligible_dividend: boolean;
    notes?: string | null;
    created_at: string;
    updated_at: string;
}

export interface InvestmentSale {
    id: number;
    investment_id: number;
    investment?: Investment;
    company_id: number;
    company?: Company;
    sale_date: string;
    sale_amount: number;
    cost_basis: number;
    realized_gain_loss: number;
    fiscal_year: number;
    notes?: string | null;
    created_at: string;
    updated_at: string;
}

export interface InvestmentTransaction {
    id: number;
    investment_id: number;
    investment?: Investment;
    company_id: number;
    company?: Company;
    transaction_type: 'contribution' | 'interest' | 'withdrawal' | 'dividend_reinvested' | 'price_update';
    amount: number;
    transaction_date: string;
    balance_after: number;
    linked_income_id?: number | null;
    linked_income?: InvestmentIncome | null;
    notes?: string | null;
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

type QueryModifier = (query: any) => any;

const DEFAULT_PAGE_SIZE = 50;

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
        const { data, error } = await supabase.from('companies').update(company).eq('id', id).select('*').single<Company>();
        if (error) throw new Error(error.message);
        return data;
    }

    async deleteCompany(id: number): Promise<void> {
        const { error } = await supabase.from('companies').delete().eq('id', id);
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

        // Generate invoice number: INV-YYYY-NNNN format
        const year = new Date(issue_date).getFullYear();
        const { data: existingInvoices, error: countError } = await supabase
            .from('invoices')
            .select('invoice_number')
            .eq('company_id', company_id)
            .like('invoice_number', `INV-${year}-%`)
            .order('invoice_number', { ascending: false })
            .limit(1);

        if (countError) throw new Error(countError.message);

        let invoiceNumber: string;
        if (existingInvoices && existingInvoices.length > 0) {
            // Extract the number from the last invoice and increment
            const lastNumber = existingInvoices[0].invoice_number.match(/\d+$/);
            const nextNumber = lastNumber ? parseInt(lastNumber[0], 10) + 1 : 1;
            invoiceNumber = `INV-${year}-${String(nextNumber).padStart(4, '0')}`;
        } else {
            // First invoice for this year
            invoiceNumber = `INV-${year}-0001`;
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

    // Salaries -----------------------------------------------------------
    async getSalaries(params?: { page?: number; limit?: number; company_id?: number; status?: string; start_date?: string; end_date?: string }): Promise<PaginatedResponse<Salary>> {
        return this.paginatedSelect<Salary>('salaries', {
            columns: '*, company:companies(*)',
            page: params?.page,
            limit: params?.limit,
            order: { column: 'payment_date', ascending: false },
            modify: (query) => {
                if (params?.company_id) query = query.eq('company_id', params.company_id);
                if (params?.status) query = query.eq('status', params.status);
                if (params?.start_date) query = query.gte('payment_date', params.start_date);
                if (params?.end_date) query = query.lte('payment_date', params.end_date);
                return query;
            },
        });
    }

    async getSalary(id: number): Promise<Salary> {
        const { data, error } = await supabase
            .from('salaries')
            .select('*, company:companies(*)')
            .eq('id', id)
            .maybeSingle<Salary>();
        if (error) throw new Error(error.message);
        if (!data) throw new Error('Salary not found');
        return data;
    }

    async createSalary(salary: Omit<Salary, 'id' | 'company' | 'created_at' | 'updated_at'>): Promise<Salary> {
        const { data, error } = await supabase
            .from('salaries')
            .insert(salary)
            .select('*, company:companies(*)')
            .single<Salary>();
        if (error) throw new Error(error.message);
        return data;
    }

    async updateSalary(id: number, salary: Partial<Salary>): Promise<Salary> {
        const { data, error } = await supabase
            .from('salaries')
            .update(salary)
            .eq('id', id)
            .select('*, company:companies(*)')
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

    async getCapitalAssets(params?: { page?: number; limit?: number; search?: string; company_id?: number; category_id?: number; cca_class?: string }): Promise<PaginatedResponse<CapitalAsset>> {
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

    // Investments ---------------------------------------------------------
    async getInvestments(params?: { page?: number; limit?: number; company_id?: number; status?: string; investment_type?: string }): Promise<PaginatedResponse<Investment>> {
        return this.paginatedSelect<Investment>('investments', {
            columns: '*, company:companies(*)',
            page: params?.page,
            limit: params?.limit,
            order: { column: 'purchase_date', ascending: false },
            modify: (query) => {
                if (params?.company_id) query = query.eq('company_id', params.company_id);
                if (params?.status) query = query.eq('status', params.status);
                if (params?.investment_type) query = query.eq('investment_type', params.investment_type);
                return query;
            },
        });
    }

    async getInvestment(id: number): Promise<Investment> {
        const { data, error } = await supabase
            .from('investments')
            .select('*, company:companies(*)')
            .eq('id', id)
            .maybeSingle<Investment>();
        if (error) throw new Error(error.message);
        if (!data) throw new Error('Investment not found');
        return data;
    }

    async createInvestment(investment: {
        company_id: number;
        investment_type: 'stock' | 'gic';
        description: string;
        symbol?: string;
        institution?: string;
        purchase_date: string;
        purchase_amount: number;
        funding_source: 'retained_earnings' | 'total_cash';
        current_value?: number;
        maturity_date?: string;
        status?: 'active' | 'sold' | 'matured';
        notes?: string;
    }): Promise<Investment> {
        const { data, error } = await supabase
            .from('investments')
            .insert({
                ...investment,
                status: investment.status || 'active',
            })
            .select('*, company:companies(*)')
            .single<Investment>();
        if (error) throw new Error(error.message);
        return data;
    }

    async updateInvestment(id: number, investment: Partial<Investment>): Promise<Investment> {
        const { data, error } = await supabase
            .from('investments')
            .update(investment)
            .eq('id', id)
            .select('*, company:companies(*)')
            .single<Investment>();
        if (error) throw new Error(error.message);
        return data;
    }

    async deleteInvestment(id: number): Promise<void> {
        const { error } = await supabase.from('investments').delete().eq('id', id);
        if (error) throw new Error(error.message);
    }

    // Investment Income ---------------------------------------------------
    async getInvestmentIncome(params?: { page?: number; limit?: number; company_id?: number; investment_id?: number; fiscal_year?: number }): Promise<PaginatedResponse<InvestmentIncome>> {
        return this.paginatedSelect<InvestmentIncome>('investment_income', {
            columns: '*, investment:investments(*), company:companies(*)',
            page: params?.page,
            limit: params?.limit,
            order: { column: 'income_date', ascending: false },
            modify: (query) => {
                if (params?.company_id) query = query.eq('company_id', params.company_id);
                if (params?.investment_id) query = query.eq('investment_id', params.investment_id);
                if (params?.fiscal_year) query = query.eq('fiscal_year', params.fiscal_year);
                return query;
            },
        });
    }

    async createInvestmentIncome(income: {
        investment_id: number;
        company_id: number;
        income_type: 'dividend' | 'interest' | 'capital_gain' | 'capital_loss';
        amount: number;
        income_date: string;
        fiscal_year: number;
        is_eligible_dividend?: boolean;
        notes?: string;
    }): Promise<InvestmentIncome> {
        const { data, error } = await supabase
            .from('investment_income')
            .insert({
                ...income,
                is_eligible_dividend: income.is_eligible_dividend || false,
            })
            .select('*, investment:investments(*), company:companies(*)')
            .single<InvestmentIncome>();
        if (error) throw new Error(error.message);
        return data;
    }

    async updateInvestmentIncome(id: number, income: Partial<InvestmentIncome>): Promise<InvestmentIncome> {
        const { data, error } = await supabase
            .from('investment_income')
            .update(income)
            .eq('id', id)
            .select('*, investment:investments(*), company:companies(*)')
            .single<InvestmentIncome>();
        if (error) throw new Error(error.message);
        return data;
    }

    async deleteInvestmentIncome(id: number): Promise<void> {
        const { error } = await supabase.from('investment_income').delete().eq('id', id);
        if (error) throw new Error(error.message);
    }

    // Investment Sales ----------------------------------------------------
    async getInvestmentSales(params?: { page?: number; limit?: number; company_id?: number; investment_id?: number; fiscal_year?: number }): Promise<PaginatedResponse<InvestmentSale>> {
        return this.paginatedSelect<InvestmentSale>('investment_sales', {
            columns: '*, investment:investments(*), company:companies(*)',
            page: params?.page,
            limit: params?.limit,
            order: { column: 'sale_date', ascending: false },
            modify: (query) => {
                if (params?.company_id) query = query.eq('company_id', params.company_id);
                if (params?.investment_id) query = query.eq('investment_id', params.investment_id);
                if (params?.fiscal_year) query = query.eq('fiscal_year', params.fiscal_year);
                return query;
            },
        });
    }

    async createInvestmentSale(sale: {
        investment_id: number;
        company_id: number;
        sale_date: string;
        sale_amount: number;
        cost_basis?: number; // Optional - will be calculated if not provided
        fiscal_year: number;
        notes?: string;
    }): Promise<InvestmentSale> {
        // Calculate cost basis if not provided (includes reinvested amounts)
        let costBasis = sale.cost_basis;
        if (costBasis === undefined) {
            costBasis = await this.calculateInvestmentCostBasis(sale.investment_id);
        }

        const realizedGainLoss = sale.sale_amount - costBasis;
        const { data, error } = await supabase
            .from('investment_sales')
            .insert({
                ...sale,
                cost_basis: costBasis,
                realized_gain_loss: realizedGainLoss,
            })
            .select('*, investment:investments(*), company:companies(*)')
            .single<InvestmentSale>();
        if (error) throw new Error(error.message);

        // Update investment status to 'sold'
        await this.updateInvestment(sale.investment_id, { status: 'sold' });

        return data;
    }

    async updateInvestmentSale(id: number, sale: Partial<InvestmentSale>): Promise<InvestmentSale> {
        // Recalculate realized_gain_loss if sale_amount or cost_basis changed
        if (sale.sale_amount !== undefined || sale.cost_basis !== undefined) {
            const existing = await this.getInvestmentSale(id);
            const saleAmount = sale.sale_amount ?? existing.sale_amount;
            const costBasis = sale.cost_basis ?? existing.cost_basis;
            sale.realized_gain_loss = saleAmount - costBasis;
        }

        const { data, error } = await supabase
            .from('investment_sales')
            .update(sale)
            .eq('id', id)
            .select('*, investment:investments(*), company:companies(*)')
            .single<InvestmentSale>();
        if (error) throw new Error(error.message);
        return data;
    }

    async getInvestmentSale(id: number): Promise<InvestmentSale> {
        const { data, error } = await supabase
            .from('investment_sales')
            .select('*, investment:investments(*), company:companies(*)')
            .eq('id', id)
            .maybeSingle<InvestmentSale>();
        if (error) throw new Error(error.message);
        if (!data) throw new Error('Investment sale not found');
        return data;
    }

    async deleteInvestmentSale(id: number): Promise<void> {
        const { error } = await supabase.from('investment_sales').delete().eq('id', id);
        if (error) throw new Error(error.message);
    }

    // Investment Transactions -------------------------------------------------
    async getInvestmentTransactions(params?: {
        page?: number;
        limit?: number;
        investment_id?: number;
        company_id?: number;
        transaction_type?: string;
    }): Promise<PaginatedResponse<InvestmentTransaction>> {
        return this.paginatedSelect<InvestmentTransaction>('investment_transactions', {
            columns: '*, investment:investments(*), company:companies(*), linked_income:investment_income!linked_income_id(*)',
            page: params?.page,
            limit: params?.limit,
            order: { column: 'transaction_date', ascending: false },
            modify: (query) => {
                if (params?.investment_id) query = query.eq('investment_id', params.investment_id);
                if (params?.company_id) query = query.eq('company_id', params.company_id);
                if (params?.transaction_type) query = query.eq('transaction_type', params.transaction_type);
                return query;
            },
        });
    }

    async getInvestmentTransaction(id: number): Promise<InvestmentTransaction> {
        const { data, error } = await supabase
            .from('investment_transactions')
            .select('*, investment:investments(*), company:companies(*), linked_income:investment_income!linked_income_id(*)')
            .eq('id', id)
            .maybeSingle<InvestmentTransaction>();
        if (error) throw new Error(error.message);
        if (!data) throw new Error('Investment transaction not found');
        return data;
    }

    async createInvestmentTransaction(transaction: {
        investment_id: number;
        company_id: number;
        transaction_type: 'contribution' | 'interest' | 'withdrawal' | 'dividend_reinvested' | 'price_update';
        amount: number;
        transaction_date: string;
        balance_after: number;
        linked_income_id?: number | null;
        notes?: string;
    }): Promise<InvestmentTransaction> {
        const { data, error } = await supabase
            .from('investment_transactions')
            .insert(transaction)
            .select('*, investment:investments(*), company:companies(*), linked_income:investment_income!linked_income_id(*)')
            .single<InvestmentTransaction>();
        if (error) throw new Error(error.message);
        return data;
    }

    async updateInvestmentTransaction(id: number, transaction: Partial<InvestmentTransaction>): Promise<InvestmentTransaction> {
        const { data, error } = await supabase
            .from('investment_transactions')
            .update(transaction)
            .eq('id', id)
            .select('*, investment:investments(*), company:companies(*), linked_income:investment_income!linked_income_id(*)')
            .single<InvestmentTransaction>();
        if (error) throw new Error(error.message);
        return data;
    }

    async deleteInvestmentTransaction(id: number): Promise<void> {
        const { error } = await supabase.from('investment_transactions').delete().eq('id', id);
        if (error) throw new Error(error.message);
    }

    // Helper method to calculate balance from transactions
    async calculateInvestmentBalance(investment_id: number): Promise<number> {
        const { data, error } = await supabase
            .from('investment_transactions')
            .select('amount')
            .eq('investment_id', investment_id)
            .order('transaction_date', { ascending: true });

        if (error) throw new Error(error.message);

        // Sum all transaction amounts
        return data?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    }

    // Helper method to calculate cost basis for an investment
    // Cost basis includes: initial purchase + contributions + reinvested interest + reinvested dividends
    // Cost basis excludes: withdrawals
    async calculateInvestmentCostBasis(investment_id: number): Promise<number> {
        const { data, error } = await supabase
            .from('investment_transactions')
            .select('transaction_type, amount')
            .eq('investment_id', investment_id);

        if (error) throw new Error(error.message);

        if (!data || data.length === 0) {
            // If no transactions, use purchase_amount from investment
            const investment = await this.getInvestment(investment_id);
            return Number(investment.purchase_amount);
        }

        // Sum contributions (includes initial purchase)
        const contributions = data
            .filter(t => t.transaction_type === 'contribution')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        // Sum reinvested interest
        const reinvestedInterest = data
            .filter(t => t.transaction_type === 'interest')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        // Sum reinvested dividends
        const reinvestedDividends = data
            .filter(t => t.transaction_type === 'dividend_reinvested')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        // Subtract withdrawals
        const withdrawals = Math.abs(data
            .filter(t => t.transaction_type === 'withdrawal')
            .reduce((sum, t) => sum + Number(t.amount), 0));

        // Cost basis = contributions + reinvested interest + reinvested dividends - withdrawals
        return contributions + reinvestedInterest + reinvestedDividends - withdrawals;
    }

    // Get investment detail with calculated stats
    async getInvestmentDetail(id: number): Promise<{
        investment: Investment;
        transactions: InvestmentTransaction[];
        totalInvested: number;
        currentBalance: number;
        totalInterest: number;
        totalDividends: number;
        totalContributions: number;
        totalWithdrawals: number;
    }> {
        const investment = await this.getInvestment(id);
        const transactionsResult = await this.getInvestmentTransactions({
            investment_id: id,
            limit: 10000
        });
        const transactions = transactionsResult.data;

        // Fetch investment income to calculate total dividends
        const incomeResult = await this.getInvestmentIncome({
            investment_id: id,
            limit: 10000
        });
        const investmentIncome = incomeResult.data;

        // Calculate stats
        const totalContributions = transactions
            .filter(t => t.transaction_type === 'contribution')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const totalWithdrawals = Math.abs(transactions
            .filter(t => t.transaction_type === 'withdrawal')
            .reduce((sum, t) => sum + Number(t.amount), 0));

        // If no transactions exist, use purchase_amount as the initial investment
        const totalInvested = transactions.length > 0
            ? totalContributions - totalWithdrawals
            : Number(investment.purchase_amount);

        const totalInterest = transactions
            .filter(t => t.transaction_type === 'interest')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        // Calculate total dividends from investment_income (includes both reinvested and non-reinvested)
        const totalDividends = investmentIncome
            .filter(inc => inc.income_type === 'dividend')
            .reduce((sum, inc) => sum + Number(inc.amount), 0);

        // Current balance: prioritize transaction-based calculation for savings accounts
        // For savings accounts, always use transactions when available
        // For stocks, allow manual override but prefer transactions
        let currentBalance = 0;
        if (transactions.length > 0) {
            // Get the most recent balance from transactions (sorted by date desc, then by id desc for same dates)
            const sortedTransactions = [...transactions].sort((a, b) => {
                const dateA = new Date(a.transaction_date).getTime();
                const dateB = new Date(b.transaction_date).getTime();
                if (dateA !== dateB) return dateB - dateA; // Most recent first
                return b.id - a.id; // If same date, higher ID first (more recent)
            });
            currentBalance = Number(sortedTransactions[0].balance_after);
        } else if (investment.current_balance !== null) {
            // No transactions, but manual override is set
            currentBalance = Number(investment.current_balance);
        } else {
            // No transactions yet - use purchase_amount as starting balance
            // For stocks, also check current_value if set
            if (investment.investment_type === 'stock' && investment.current_value !== null) {
                currentBalance = Number(investment.current_value);
            } else {
                currentBalance = Number(investment.purchase_amount);
            }
        }

        return {
            investment,
            transactions,
            totalInvested,
            currentBalance,
            totalInterest,
            totalDividends,
            totalContributions,
            totalWithdrawals,
        };
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

        const paidInvoices = invoices.data.filter((inv) => inv.status === 'paid' && new Date(inv.issue_date).getFullYear() === request.fiscal_year);
        const filteredExpenses = expenses.data.filter((exp) => new Date(exp.expense_date).getFullYear() === request.fiscal_year);
        const filteredDividends = dividends.data.filter((div) => new Date(div.declaration_date).getFullYear() === request.fiscal_year);

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
}

export const api = new SupabaseApi();
export default api;
