-- Row-Level Security policies and helper functions

create or replace function public.current_profile()
    returns public.profiles
    language sql
    stable
as $$
    select *
    from public.profiles
    where auth_user_id = auth.uid();
$$;

create or replace function public.has_company_access(target_company_id bigint)
    returns boolean
    language sql
    stable
as $$
    select exists (
        select 1
        from public.profiles p
        where p.auth_user_id = auth.uid()
          and p.company_id = target_company_id
    );
$$;

create or replace function public.is_company_admin(target_company_id bigint)
    returns boolean
    language sql
    stable
as $$
    select exists (
        select 1
        from public.profiles p
        where p.auth_user_id = auth.uid()
          and p.company_id = target_company_id
          and p.role = 'admin'
    );
$$;

create or replace function public.is_global_admin()
    returns boolean
    language sql
    stable
as $$
    select exists (
        select 1
        from public.profiles p
        where p.auth_user_id = auth.uid()
          and p.role = 'admin'
    );
$$;

alter table public.profiles enable row level security;
drop policy if exists "View own profile" on public.profiles;
create policy "View own profile" on public.profiles
    for select using (auth.uid() = auth_user_id);
drop policy if exists "Insert own profile" on public.profiles;
create policy "Insert own profile" on public.profiles
    for insert with check (auth.uid() = auth_user_id);
drop policy if exists "Update own profile" on public.profiles;
create policy "Update own profile" on public.profiles
    for update using (auth.uid() = auth_user_id) with check (auth.uid() = auth_user_id);

alter table public.companies enable row level security;
drop policy if exists "View company you belong to" on public.companies;
create policy "View company you belong to" on public.companies
    for select using (public.has_company_access(id));
drop policy if exists "Admins manage company" on public.companies;
create policy "Admins manage company" on public.companies
    using (public.is_company_admin(id))
    with check (public.is_company_admin(id));

alter table public.clients enable row level security;
drop policy if exists "Clients scoped by company" on public.clients;
create policy "Clients scoped by company" on public.clients
    using (public.has_company_access(company_id))
    with check (public.has_company_access(company_id));

alter table public.invoices enable row level security;
drop policy if exists "Invoices scoped by company" on public.invoices;
create policy "Invoices scoped by company" on public.invoices
    using (public.has_company_access(company_id))
    with check (public.has_company_access(company_id));

alter table public.invoice_items enable row level security;
drop policy if exists "Invoice items follow parent invoice company" on public.invoice_items;
create policy "Invoice items follow parent invoice company" on public.invoice_items
    using (
        public.has_company_access(
            (select company_id from public.invoices where public.invoices.id = invoice_id)
        )
    )
    with check (
        public.has_company_access(
            (select company_id from public.invoices where public.invoices.id = invoice_id)
        )
    );

alter table public.expense_categories enable row level security;
drop policy if exists "Expense categories scoped by company" on public.expense_categories;
create policy "Expense categories scoped by company" on public.expense_categories
    using (public.has_company_access(company_id))
    with check (public.has_company_access(company_id));

alter table public.expenses enable row level security;
drop policy if exists "Expenses scoped by company" on public.expenses;
create policy "Expenses scoped by company" on public.expenses
    using (public.has_company_access(company_id))
    with check (public.has_company_access(company_id));

alter table public.expense_files enable row level security;
drop policy if exists "Expense files scoped by company" on public.expense_files;
create policy "Expense files scoped by company" on public.expense_files
    using (public.has_company_access(company_id))
    with check (public.has_company_access(company_id));

alter table public.dividends enable row level security;
drop policy if exists "Dividends scoped by company" on public.dividends;
create policy "Dividends scoped by company" on public.dividends
    using (public.has_company_access(company_id))
    with check (public.has_company_access(company_id));

alter table public.income_entries enable row level security;
drop policy if exists "Income scoped by company" on public.income_entries;
create policy "Income scoped by company" on public.income_entries
    using (public.has_company_access(company_id))
    with check (public.has_company_access(company_id));

alter table public.hst_payments enable row level security;
drop policy if exists "HST payments scoped by company" on public.hst_payments;
create policy "HST payments scoped by company" on public.hst_payments
    using (public.has_company_access(company_id))
    with check (public.has_company_access(company_id));

alter table public.tax_returns enable row level security;
drop policy if exists "Tax returns scoped by company" on public.tax_returns;
create policy "Tax returns scoped by company" on public.tax_returns
    using (public.has_company_access(company_id))
    with check (public.has_company_access(company_id));

alter table public.capital_assets enable row level security;
drop policy if exists "Capital assets scoped by company" on public.capital_assets;
create policy "Capital assets scoped by company" on public.capital_assets
    using (public.has_company_access(company_id))
    with check (public.has_company_access(company_id));

alter table public.depreciation_entries enable row level security;
drop policy if exists "Depreciation scoped by company" on public.depreciation_entries;
create policy "Depreciation scoped by company" on public.depreciation_entries
    using (public.has_company_access(company_id))
    with check (public.has_company_access(company_id));

alter table public.owner_payments enable row level security;
drop policy if exists "Owner payments scoped by company" on public.owner_payments;
create policy "Owner payments scoped by company" on public.owner_payments
    using (public.has_company_access(company_id))
    with check (public.has_company_access(company_id));

alter table public.cca_classes enable row level security;
drop policy if exists "Read-only access to CCA classes" on public.cca_classes;
create policy "Read-only access to CCA classes" on public.cca_classes
    for select using (auth.role() = 'authenticated');
drop policy if exists "Admins manage CCA classes" on public.cca_classes;
create policy "Admins manage CCA classes" on public.cca_classes
    using (public.is_global_admin())
    with check (public.is_global_admin());

alter table public.personal_finance_configs enable row level security;
drop policy if exists "Users manage their finance config" on public.personal_finance_configs;
create policy "Users manage their finance config" on public.personal_finance_configs
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

