-- 0005_categories.sql
-- Categories (tenant-scoped) and products.category_id FK

-- Categories table
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, name)
);
create index if not exists categories_tenant_idx on public.categories(tenant_id);

-- Add category_id to products (keep legacy products.category text for now)
alter table public.products
  add column if not exists category_id uuid;

alter table public.products
  add constraint products_category_fk foreign key (category_id) references public.categories(id) on delete set null;

create index if not exists products_category_idx on public.products(category_id);

-- Enable RLS and restrict for now (service_role). We'll add tenant-aware policies alongside others later.
alter table public.categories enable row level security;
create policy if not exists categories_service_only on public.categories for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- Note: Seeding of default categories (Kiosk, Küche, Getränke, Alkohol, Merch) should be performed per-tenant in Admin or a provisioning script.
