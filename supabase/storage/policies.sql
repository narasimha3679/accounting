-- Storage bucket + policies for expense receipts

insert into storage.buckets (id, name, public)
values ('expense-files', 'expense-files', false)
on conflict (id) do nothing;

/*
    Object naming convention:
    <company_id>/<expense_id>/<uuid-filename>.pdf
*/

create or replace function public.ensure_company_prefix(object_name text)
returns bigint
language sql
stable
as $$
    select nullif(split_part(object_name, '/', 1), '')::bigint;
$$;

drop policy if exists "Receipt readers limited to their company" on storage.objects;
create policy "Receipt readers limited to their company"
    on storage.objects
    for select
    using (
        bucket_id = 'expense-files'
        and public.has_company_access(public.ensure_company_prefix(name))
    );

drop policy if exists "Receipt writers limited to their company" on storage.objects;
create policy "Receipt writers limited to their company"
    on storage.objects
    for insert
    with check (
        bucket_id = 'expense-files'
        and public.has_company_access(public.ensure_company_prefix(name))
    );

drop policy if exists "Receipt deleters limited to their company" on storage.objects;
create policy "Receipt deleters limited to their company"
    on storage.objects
    for delete
    using (
        bucket_id = 'expense-files'
        and public.has_company_access(public.ensure_company_prefix(name))
    );

