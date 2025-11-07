create table if not exists inbox_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text not null,
  type text not null,
  payload jsonb not null,
  processed_at timestamptz
);

create index if not exists inbox_events_created_at_idx on inbox_events(created_at desc);
