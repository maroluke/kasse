-- tenants and users
create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

create table if not exists user_tenants (
  user_id uuid not null,
  tenant_id uuid not null references tenants(id) on delete cascade,
  role text not null,
  primary key (user_id, tenant_id)
);

-- products
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  price_cents int not null,
  deposit_cents int not null default 0,
  vat_rate numeric not null default 0,
  is_kitchen_item boolean not null default false,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

-- orders
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  status text not null default 'OPEN',
  total_cents int not null default 0,
  vat_total_cents int not null default 0,
  version int not null default 0
);

-- order_items
create type line_kind as enum ('SALE','DEPOSIT_CHARGE','DEPOSIT_REFUND');
create type prep_status as enum ('QUEUED','IN_PROGRESS','READY','SERVED');

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid,
  kind line_kind not null,
  qty int not null default 1,
  price_cents int not null default 0,
  deposit_cents int not null default 0,
  vat_rate numeric not null default 0,
  prep_status prep_status
);

-- payments
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  method text not null,
  amount_cents int not null,
  provider text,
  provider_tx_id text,
  status text not null default 'captured',
  created_at timestamptz not null default now()
);

-- audit
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  ts timestamptz not null default now(),
  actor text,
  action text not null,
  payload jsonb
);

-- RLS stubs
alter table tenants enable row level security;
alter table user_tenants enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table payments enable row level security;
alter table audit_log enable row level security;

-- Simplified policies (replace with auth.jwt() usage later)
create policy tenant_isolation_products on products using (true) with check (true);
create policy tenant_isolation_orders on orders using (true) with check (true);
create policy tenant_isolation_order_items on order_items using (true) with check (true);
create policy tenant_isolation_payments on payments using (true) with check (true);
create policy tenant_isolation_audit on audit_log using (true) with check (true);
