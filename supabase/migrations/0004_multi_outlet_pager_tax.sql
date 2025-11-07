-- 0004_multi_outlet_pager_tax.sql
-- Multi-outlet pricing, tenant VAT settings, pager support, and product VAT kinds

-- Outlets
create table if not exists public.outlets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists outlets_tenant_idx on public.outlets(tenant_id);

-- Product↔Outlet (N:M) with outlet-specific pricing/activation
create table if not exists public.product_outlets (
  product_id uuid not null,
  outlet_id uuid not null,
  tenant_id uuid not null,
  price_cents integer not null,
  active boolean not null default true,
  primary key (product_id, outlet_id)
);
create index if not exists product_outlets_tenant_idx on public.product_outlets(tenant_id);
create index if not exists product_outlets_outlet_idx on public.product_outlets(outlet_id);

-- Tenant settings for VAT defaults
create table if not exists public.tenant_settings (
  tenant_id uuid primary key,
  vat_standard numeric(5,2) not null default 8.10,
  vat_reduced numeric(5,2) not null default 2.60,
  updated_at timestamptz not null default now()
);

-- Extend products with VAT kind and deposit VAT kind + optional category
alter table public.products
  add column if not exists vat_kind text not null default 'standard' check (vat_kind in ('standard','reduced')),
  add column if not exists deposit_vat_kind text not null default 'standard' check (deposit_vat_kind in ('standard','reduced')),
  add column if not exists category text;

-- Add pager and outlet on orders
alter table public.orders
  add column if not exists pager_number text,
  add column if not exists outlet_id uuid;
create index if not exists orders_outlet_idx on public.orders(outlet_id);

-- Pager tags (map NFC UID -> pager number), optional outlet scoping
create table if not exists public.pager_tags (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  outlet_id uuid,
  tag_uid text not null,
  pager_number text not null,
  unique(tenant_id, tag_uid)
);
create index if not exists pager_tags_outlet_idx on public.pager_tags(outlet_id);

-- RLS: enable and restrict new tables to service_role for now (we'll add tenant-aware policies next)
alter table public.outlets enable row level security;
alter table public.product_outlets enable row level security;
alter table public.tenant_settings enable row level security;
alter table public.pager_tags enable row level security;

create policy if not exists outlets_service_only on public.outlets for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy if not exists product_outlets_service_only on public.product_outlets for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy if not exists tenant_settings_service_only on public.tenant_settings for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy if not exists pager_tags_service_only on public.pager_tags for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- Notes:
-- * We intentionally scope product_outlets with a tenant_id column to simplify tenant-aware RLS later.
-- * Admin UI will manage tenant_settings.vat_standard/vat_reduced.
-- * POS will read outlet-specific price via product_outlets and bind device to a chosen outlet.
-- * orders.pager_number/outlet_id allow enforcing pager and outlet attribution at checkout.
