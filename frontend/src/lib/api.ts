// API client for the Go backend
// Use environment variable if set, otherwise dynamically determine the API URL based on current host
const getApiBaseUrl = () => {
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }

    // Get the current host (localhost or Tailscale IP)
    const currentHost = window.location.hostname;
    const apiPort = '8090';

    return `http://${currentHost}:${apiPort}/api/v1`;
};

const API_BASE_URL = getApiBaseUrl();

// Types for our API responses
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
    hst_number?: string;
    hst_registered: boolean;
    fiscal_year_end: string;
    small_business_rate: number;
    hst_rate: number;
    created_at: string;
    updated_at: string;
}

export interface Client {
    id: number;
    name: string;
    contact_person?: string;
    email?: string;
    phone?: string;
    address?: string;
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
    paid_date?: string;
    description?: string;
    company_id: number;
    company?: Company;
    items?: InvoiceItem[];
    created_at: string;
    updated_at: string;
}

export interface ExpenseCategory {
    id: number;
    name: string;
    description?: string;
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
    uploaded_at: string;
    created_at: string;
    updated_at: string;
}

export interface Expense {
    id: number;
    description: string;
    category_id: number;
    category?: ExpenseCategory;
    amount: number;
    hst_paid: number;
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
    payment_date?: string;
    status: 'declared' | 'paid';
    notes?: string;
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
    client_id?: number;
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
    reference?: string;
    notes?: string;
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
    disposal_date?: string;
    disposal_amount?: number;
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
    reference?: string;
    notes?: string;
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

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    name: string;
}

export interface LoginResponse {
    token: string;
    user: User;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// API client class
class ApiClient {
    private baseURL: string;
    private token: string | null = null;

    constructor(baseURL: string) {
        this.baseURL = baseURL;
        this.token = localStorage.getItem('auth_token');
    }

    getToken(): string | null {
        return this.token;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.baseURL}${endpoint}`;

        // For FormData, don't set Content-Type to let browser set it with boundary
        const isFormData = options.body instanceof FormData;
        const headers: Record<string, string> = isFormData
            ? { ...(options.headers as Record<string, string>) }
            : {
                'Content-Type': 'application/json',
                ...(options.headers as Record<string, string>),
            };

        if (this.token) {
            headers.Authorization = `Bearer ${this.token}`;
        }

        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(error.error || `HTTP ${response.status}`);
        }

        return response.json();
    }

    // Authentication
    async login(credentials: LoginRequest): Promise<LoginResponse> {
        const response = await this.request<LoginResponse>('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });

        this.token = response.token;
        localStorage.setItem('auth_token', response.token);
        return response;
    }

    async register(credentials: RegisterRequest): Promise<LoginResponse> {
        const response = await this.request<LoginResponse>('/auth/register', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });

        this.token = response.token;
        localStorage.setItem('auth_token', response.token);
        return response;
    }

    async getProfile(): Promise<User> {
        return this.request<User>('/auth/profile');
    }

    logout(): void {
        this.token = null;
        localStorage.removeItem('auth_token');
    }

    // Companies
    async getCompanies(params?: { page?: number; limit?: number; search?: string }): Promise<PaginatedResponse<Company>> {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.set('page', params.page.toString());
        if (params?.limit) searchParams.set('limit', params.limit.toString());
        if (params?.search) searchParams.set('search', params.search);

        const query = searchParams.toString();
        return this.request<PaginatedResponse<Company>>(`/admin/companies${query ? `?${query}` : ''}`);
    }

    async getCompany(id: number): Promise<Company> {
        return this.request<Company>(`/admin/companies/${id}`);
    }

    async createCompany(company: Omit<Company, 'id' | 'created_at' | 'updated_at'>): Promise<Company> {
        return this.request<Company>('/admin/companies', {
            method: 'POST',
            body: JSON.stringify(company),
        });
    }

    async updateCompany(id: number, company: Partial<Company>): Promise<Company> {
        return this.request<Company>(`/admin/companies/${id}`, {
            method: 'PUT',
            body: JSON.stringify(company),
        });
    }

    async deleteCompany(id: number): Promise<void> {
        await this.request(`/admin/companies/${id}`, {
            method: 'DELETE',
        });
    }

    // Clients
    async getClients(params?: { page?: number; limit?: number; search?: string; company_id?: number }): Promise<PaginatedResponse<Client>> {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.set('page', params.page.toString());
        if (params?.limit) searchParams.set('limit', params.limit.toString());
        if (params?.search) searchParams.set('search', params.search);
        if (params?.company_id) searchParams.set('company_id', params.company_id.toString());

        const query = searchParams.toString();
        return this.request<PaginatedResponse<Client>>(`/clients${query ? `?${query}` : ''}`);
    }

    async getClient(id: number): Promise<Client> {
        return this.request<Client>(`/clients/${id}`);
    }

    async createClient(client: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Promise<Client> {
        return this.request<Client>('/clients', {
            method: 'POST',
            body: JSON.stringify(client),
        });
    }

    async updateClient(id: number, client: Partial<Client>): Promise<Client> {
        return this.request<Client>(`/clients/${id}`, {
            method: 'PUT',
            body: JSON.stringify(client),
        });
    }

    async deleteClient(id: number): Promise<void> {
        await this.request(`/clients/${id}`, {
            method: 'DELETE',
        });
    }

    // Invoices
    async getInvoices(params?: { page?: number; limit?: number; search?: string; company_id?: number; client_id?: number; status?: string }): Promise<PaginatedResponse<Invoice>> {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.set('page', params.page.toString());
        if (params?.limit) searchParams.set('limit', params.limit.toString());
        if (params?.search) searchParams.set('search', params.search);
        if (params?.company_id) searchParams.set('company_id', params.company_id.toString());
        if (params?.client_id) searchParams.set('client_id', params.client_id.toString());
        if (params?.status) searchParams.set('status', params.status);

        const query = searchParams.toString();
        return this.request<PaginatedResponse<Invoice>>(`/invoices${query ? `?${query}` : ''}`);
    }

    async getInvoice(id: number): Promise<Invoice> {
        return this.request<Invoice>(`/invoices/${id}`);
    }

    async createInvoice(invoice: {
        client_id: number;
        issue_date: string;
        due_date: string;
        description?: string;
        company_id: number;
        items: Array<{
            description: string;
            quantity: number;
            unit_price: number;
        }>;
    }): Promise<Invoice> {
        return this.request<Invoice>('/invoices', {
            method: 'POST',
            body: JSON.stringify(invoice),
        });
    }

    async updateInvoice(id: number, invoice: Partial<Invoice> & { items?: Array<{ description: string; quantity: number; unit_price: number; }> }): Promise<Invoice> {
        return this.request<Invoice>(`/invoices/${id}`, {
            method: 'PUT',
            body: JSON.stringify(invoice),
        });
    }

    async deleteInvoice(id: number): Promise<void> {
        await this.request(`/invoices/${id}`, {
            method: 'DELETE',
        });
    }

    // Expense Categories
    async getExpenseCategories(params?: { page?: number; limit?: number; search?: string }): Promise<PaginatedResponse<ExpenseCategory>> {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.set('page', params.page.toString());
        if (params?.limit) searchParams.set('limit', params.limit.toString());
        if (params?.search) searchParams.set('search', params.search);

        const query = searchParams.toString();
        return this.request<PaginatedResponse<ExpenseCategory>>(`/expense-categories${query ? `?${query}` : ''}`);
    }

    async getExpenseCategory(id: number): Promise<ExpenseCategory> {
        return this.request<ExpenseCategory>(`/expense-categories/${id}`);
    }

    async createExpenseCategory(category: Omit<ExpenseCategory, 'id' | 'created_at' | 'updated_at'>): Promise<ExpenseCategory> {
        return this.request<ExpenseCategory>('/expense-categories', {
            method: 'POST',
            body: JSON.stringify(category),
        });
    }

    async updateExpenseCategory(id: number, category: Partial<ExpenseCategory>): Promise<ExpenseCategory> {
        return this.request<ExpenseCategory>(`/expense-categories/${id}`, {
            method: 'PUT',
            body: JSON.stringify(category),
        });
    }

    async deleteExpenseCategory(id: number): Promise<void> {
        await this.request(`/expense-categories/${id}`, {
            method: 'DELETE',
        });
    }

    // Expenses
    async getExpenses(params?: { page?: number; limit?: number; search?: string; company_id?: number; category_id?: number; start_date?: string; end_date?: string }): Promise<PaginatedResponse<Expense>> {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.set('page', params.page.toString());
        if (params?.limit) searchParams.set('limit', params.limit.toString());
        if (params?.search) searchParams.set('search', params.search);
        if (params?.company_id) searchParams.set('company_id', params.company_id.toString());
        if (params?.category_id) searchParams.set('category_id', params.category_id.toString());
        if (params?.start_date) searchParams.set('start_date', params.start_date);
        if (params?.end_date) searchParams.set('end_date', params.end_date);

        const query = searchParams.toString();
        return this.request<PaginatedResponse<Expense>>(`/expenses${query ? `?${query}` : ''}`);
    }

    async getExpense(id: number): Promise<Expense> {
        return this.request<Expense>(`/expenses/${id}`);
    }

    async createExpense(expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'> & { expense_date: string }): Promise<Expense> {
        return this.request<Expense>('/expenses', {
            method: 'POST',
            body: JSON.stringify(expense),
        });
    }

    async updateExpense(id: number, expense: Partial<Expense> & { expense_date?: string }): Promise<Expense> {
        return this.request<Expense>(`/expenses/${id}`, {
            method: 'PUT',
            body: JSON.stringify(expense),
        });
    }

    async deleteExpense(id: number): Promise<void> {
        await this.request(`/expenses/${id}`, {
            method: 'DELETE',
        });
    }

    // Expense Files
    async uploadExpenseFile(expenseId: number, file: File): Promise<ExpenseFile> {
        const formData = new FormData();
        formData.append('file', file);

        return this.request<ExpenseFile>(`/expenses/${expenseId}/files`, {
            method: 'POST',
            body: formData,
        });
    }

    async getExpenseFiles(expenseId: number): Promise<ExpenseFile[]> {
        return this.request<ExpenseFile[]>(`/expenses/${expenseId}/files`);
    }

    async downloadExpenseFile(fileId: number): Promise<Blob> {
        const response = await fetch(`${API_BASE_URL}/expenses/files/${fileId}/download`, {
            headers: {
                'Authorization': `Bearer ${this.getToken()}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to download file: ${response.statusText}`);
        }

        return response.blob();
    }

    async deleteExpenseFile(fileId: number): Promise<void> {
        await this.request(`/expenses/files/${fileId}`, {
            method: 'DELETE',
        });
    }

    // Dividends
    async getDividends(params?: { page?: number; limit?: number; company_id?: number; status?: string; start_date?: string; end_date?: string }): Promise<PaginatedResponse<Dividend>> {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.set('page', params.page.toString());
        if (params?.limit) searchParams.set('limit', params.limit.toString());
        if (params?.company_id) searchParams.set('company_id', params.company_id.toString());
        if (params?.status) searchParams.set('status', params.status);
        if (params?.start_date) searchParams.set('start_date', params.start_date);
        if (params?.end_date) searchParams.set('end_date', params.end_date);

        const query = searchParams.toString();
        return this.request<PaginatedResponse<Dividend>>(`/dividends${query ? `?${query}` : ''}`);
    }

    async getDividend(id: number): Promise<Dividend> {
        return this.request<Dividend>(`/dividends/${id}`);
    }

    async createDividend(dividend: Omit<Dividend, 'id' | 'created_at' | 'updated_at'> & { declaration_date: string; payment_date?: string }): Promise<Dividend> {
        return this.request<Dividend>('/dividends', {
            method: 'POST',
            body: JSON.stringify(dividend),
        });
    }

    async updateDividend(id: number, dividend: Partial<Dividend> & { declaration_date?: string; payment_date?: string }): Promise<Dividend> {
        return this.request<Dividend>(`/dividends/${id}`, {
            method: 'PUT',
            body: JSON.stringify(dividend),
        });
    }

    async deleteDividend(id: number): Promise<void> {
        await this.request(`/dividends/${id}`, {
            method: 'DELETE',
        });
    }

    // Tax Returns
    async getTaxReturns(params?: { page?: number; limit?: number; company_id?: number; fiscal_year?: number }): Promise<PaginatedResponse<TaxReturn>> {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.set('page', params.page.toString());
        if (params?.limit) searchParams.set('limit', params.limit.toString());
        if (params?.company_id) searchParams.set('company_id', params.company_id.toString());
        if (params?.fiscal_year) searchParams.set('fiscal_year', params.fiscal_year.toString());

        const query = searchParams.toString();
        return this.request<PaginatedResponse<TaxReturn>>(`/tax-returns${query ? `?${query}` : ''}`);
    }

    async getTaxReturn(id: number): Promise<TaxReturn> {
        return this.request<TaxReturn>(`/tax-returns/${id}`);
    }

    async createTaxReturn(taxReturn: Omit<TaxReturn, 'id' | 'created_at' | 'updated_at'>): Promise<TaxReturn> {
        return this.request<TaxReturn>('/tax-returns', {
            method: 'POST',
            body: JSON.stringify(taxReturn),
        });
    }

    async updateTaxReturn(id: number, taxReturn: Partial<TaxReturn>): Promise<TaxReturn> {
        return this.request<TaxReturn>(`/tax-returns/${id}`, {
            method: 'PUT',
            body: JSON.stringify(taxReturn),
        });
    }

    async deleteTaxReturn(id: number): Promise<void> {
        await this.request(`/tax-returns/${id}`, {
            method: 'DELETE',
        });
    }

    // Income Entries
    async getIncomeEntries(params?: { page?: number; limit?: number; company_id?: number; income_type?: string; start_date?: string; end_date?: string }): Promise<PaginatedResponse<IncomeEntry>> {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.set('page', params.page.toString());
        if (params?.limit) searchParams.set('limit', params.limit.toString());
        if (params?.company_id) searchParams.set('company_id', params.company_id.toString());
        if (params?.income_type) searchParams.set('income_type', params.income_type);
        if (params?.start_date) searchParams.set('start_date', params.start_date);
        if (params?.end_date) searchParams.set('end_date', params.end_date);

        const query = searchParams.toString();
        return this.request<PaginatedResponse<IncomeEntry>>(`/income-entries${query ? `?${query}` : ''}`);
    }

    async getIncomeEntry(id: number): Promise<IncomeEntry> {
        return this.request<IncomeEntry>(`/income-entries/${id}`);
    }

    async createIncomeEntry(incomeEntry: {
        description: string;
        amount: number;
        income_type: 'client' | 'capital' | 'other';
        client_id?: number;
        income_date: string;
        company_id: number;
    }): Promise<IncomeEntry> {
        return this.request<IncomeEntry>('/income-entries', {
            method: 'POST',
            body: JSON.stringify(incomeEntry),
        });
    }

    async updateIncomeEntry(id: number, incomeEntry: Partial<IncomeEntry> & { income_date?: string }): Promise<IncomeEntry> {
        return this.request<IncomeEntry>(`/income-entries/${id}`, {
            method: 'PUT',
            body: JSON.stringify(incomeEntry),
        });
    }

    async deleteIncomeEntry(id: number): Promise<void> {
        await this.request(`/income-entries/${id}`, {
            method: 'DELETE',
        });
    }

    // HST Payments
    async getHSTPayments(params?: { page?: number; limit?: number; company_id?: number; start_date?: string; end_date?: string }): Promise<PaginatedResponse<HSTPayment>> {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.set('page', params.page.toString());
        if (params?.limit) searchParams.set('limit', params.limit.toString());
        if (params?.company_id) searchParams.set('company_id', params.company_id.toString());
        if (params?.start_date) searchParams.set('start_date', params.start_date);
        if (params?.end_date) searchParams.set('end_date', params.end_date);

        const query = searchParams.toString();
        return this.request<PaginatedResponse<HSTPayment>>(`/hst-payments${query ? `?${query}` : ''}`);
    }

    async getHSTPayment(id: number): Promise<HSTPayment> {
        return this.request<HSTPayment>(`/hst-payments/${id}`);
    }

    async createHSTPayment(hstPayment: {
        amount: number;
        payment_date: string;
        period_start: string;
        period_end: string;
        reference?: string;
        notes?: string;
        company_id: number;
    }): Promise<HSTPayment> {
        return this.request<HSTPayment>('/hst-payments', {
            method: 'POST',
            body: JSON.stringify(hstPayment),
        });
    }

    async updateHSTPayment(id: number, hstPayment: Partial<HSTPayment> & { payment_date?: string; period_start?: string; period_end?: string }): Promise<HSTPayment> {
        return this.request<HSTPayment>(`/hst-payments/${id}`, {
            method: 'PUT',
            body: JSON.stringify(hstPayment),
        });
    }

    async deleteHSTPayment(id: number): Promise<void> {
        await this.request(`/hst-payments/${id}`, {
            method: 'DELETE',
        });
    }

    // Capital Assets
    async getCapitalAssets(params?: { page?: number; limit?: number; search?: string; company_id?: number; category_id?: number; cca_class?: string }): Promise<PaginatedResponse<CapitalAsset>> {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.set('page', params.page.toString());
        if (params?.limit) searchParams.set('limit', params.limit.toString());
        if (params?.search) searchParams.set('search', params.search);
        if (params?.company_id) searchParams.set('company_id', params.company_id.toString());
        if (params?.category_id) searchParams.set('category_id', params.category_id.toString());
        if (params?.cca_class) searchParams.set('cca_class', params.cca_class);

        const query = searchParams.toString();
        return this.request<PaginatedResponse<CapitalAsset>>(`/capital-assets${query ? `?${query}` : ''}`);
    }

    async getCapitalAsset(id: number): Promise<CapitalAsset> {
        return this.request<CapitalAsset>(`/capital-assets/${id}`);
    }

    async createCapitalAsset(capitalAsset: {
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
        return this.request<CapitalAsset>('/capital-assets', {
            method: 'POST',
            body: JSON.stringify(capitalAsset),
        });
    }

    async updateCapitalAsset(id: number, capitalAsset: Partial<CapitalAsset> & { purchase_date?: string; disposal_date?: string }): Promise<CapitalAsset> {
        return this.request<CapitalAsset>(`/capital-assets/${id}`, {
            method: 'PUT',
            body: JSON.stringify(capitalAsset),
        });
    }

    async deleteCapitalAsset(id: number): Promise<void> {
        await this.request(`/capital-assets/${id}`, {
            method: 'DELETE',
        });
    }

    async calculateDepreciation(id: number, fiscalYear: number): Promise<{
        capital_asset_id: number;
        fiscal_year: number;
        depreciation_amount: number;
        is_half_year_rule: boolean;
        remaining_book_value: number;
    }> {
        return this.request(`/capital-assets/${id}/calculate-depreciation?fiscal_year=${fiscalYear}`);
    }

    async createDepreciationEntry(id: number, entry: {
        fiscal_year: number;
        entry_date: string;
    }): Promise<DepreciationEntry> {
        return this.request<DepreciationEntry>(`/capital-assets/${id}/depreciation-entries`, {
            method: 'POST',
            body: JSON.stringify(entry),
        });
    }

    // Owner Payments
    async getOwnerPayments(params?: { page?: number; limit?: number; company_id?: number; start_date?: string; end_date?: string; payment_type?: string }): Promise<PaginatedResponse<OwnerPayment>> {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.set('page', params.page.toString());
        if (params?.limit) searchParams.set('limit', params.limit.toString());
        if (params?.company_id) searchParams.set('company_id', params.company_id.toString());
        if (params?.start_date) searchParams.set('start_date', params.start_date);
        if (params?.end_date) searchParams.set('end_date', params.end_date);
        if (params?.payment_type) searchParams.set('payment_type', params.payment_type);

        const query = searchParams.toString();
        return this.request<PaginatedResponse<OwnerPayment>>(`/owner-payments${query ? `?${query}` : ''}`);
    }

    async getOwnerPayment(id: number): Promise<OwnerPayment> {
        return this.request<OwnerPayment>(`/owner-payments/${id}`);
    }

    async createOwnerPayment(ownerPayment: {
        description: string;
        amount: number;
        payment_date: string;
        payment_type: 'reimbursement' | 'loan_repayment' | 'other';
        reference?: string;
        notes?: string;
        company_id: number;
    }): Promise<OwnerPayment> {
        return this.request<OwnerPayment>('/owner-payments', {
            method: 'POST',
            body: JSON.stringify(ownerPayment),
        });
    }

    async updateOwnerPayment(id: number, ownerPayment: {
        description?: string;
        amount?: number;
        payment_date?: string;
        payment_type?: 'reimbursement' | 'dividend' | 'loan_repayment' | 'other';
        reference?: string;
        notes?: string;
    }): Promise<OwnerPayment> {
        return this.request<OwnerPayment>(`/owner-payments/${id}`, {
            method: 'PUT',
            body: JSON.stringify(ownerPayment),
        });
    }

    async deleteOwnerPayment(id: number): Promise<void> {
        return this.request<void>(`/owner-payments/${id}`, {
            method: 'DELETE',
        });
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
        const searchParams = new URLSearchParams();
        if (params?.company_id) searchParams.set('company_id', params.company_id.toString());
        if (params?.start_date) searchParams.set('start_date', params.start_date);
        if (params?.end_date) searchParams.set('end_date', params.end_date);

        const query = searchParams.toString();
        return this.request(`/owner-payments/stats${query ? `?${query}` : ''}`);
    }

    // CCA Classes
    async getCCAClasses(): Promise<CCAClass[]> {
        return this.request<CCAClass[]>('/cca-classes');
    }

    // Tax Reports
    async generateTaxReport(request: {
        company_id: number;
        fiscal_year: number;
        start_date?: string;
        end_date?: string;
        report_type: 'comprehensive' | 'pandl' | 'hst' | 'retained';
    }): Promise<Blob> {
        const response = await fetch(`${this.baseURL}/reports/tax-report`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`,
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to generate tax report');
        }

        return response.blob();
    }
}

// Create and export the API client instance
export const api = new ApiClient(API_BASE_URL);
export default api;
