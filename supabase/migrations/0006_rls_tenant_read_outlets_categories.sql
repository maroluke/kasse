-- 0006_rls_tenant_read_outlets_categories.sql
-- Allow anon (POS) to SELECT tenant-scoped rows for outlets and categories when 'x-tenant-id' header matches row.tenant_id

-- Safety: keep existing service_role-only policies for write operations. We only add read access.

-- Helper: extract x-tenant-id from request headers (Supabase exposes request.headers JSON)
-- We inline the expression to avoid creating a function.

-- Outlets: read policy for anon/auth with header match
create policy if not exists outlets_tenant_read
on public.outlets
for select
using (
  (current_setting('request.headers', true)::jsonb ->> 'x-tenant-id') is not null
  and ((current_setting('request.headers', true)::jsonb ->> 'x-tenant-id')::uuid = tenant_id)
);

-- Categories: read policy for anon/auth with header match
create policy if not exists categories_tenant_read
on public.categories
for select
using (
  (current_setting('request.headers', true)::jsonb ->> 'x-tenant-id') is not null
  and ((current_setting('request.headers', true)::jsonb ->> 'x-tenant-id')::uuid = tenant_id)
);

-- Optional: product_outlets read policy, useful when POS joins product_outlets
create policy if not exists product_outlets_tenant_read
on public.product_outlets
for select
using (
  (current_setting('request.headers', true)::jsonb ->> 'x-tenant-id') is not null
  and ((current_setting('request.headers', true)::jsonb ->> 'x-tenant-id')::uuid = tenant_id)
);
