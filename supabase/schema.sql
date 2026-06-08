-- Drop old tables and recreate with new schema
drop table if exists calls cascade;
drop table if exists settings cascade;

-- Calls table (new schema)
create table calls (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  rep_name text not null,
  homeowner_name text not null,
  address text not null,
  phone text default '',
  email text default '',
  appointment_date timestamptz not null,
  outcome text not null check (outcome in ('no-show','disqualified','no-sale','follow-up','closed')),
  disqualified_reason text default '',
  system_size text default '',
  deal_value text default ''
);

-- Settings table
create table settings (
  id uuid primary key default gen_random_uuid(),
  business_name text not null default 'Scale Solar',
  logo_url text default '',
  brand_color text default '#eab308',
  subdomain text default ''
);

-- RLS
alter table calls enable row level security;
alter table settings enable row level security;

create policy "Anyone can insert calls"
  on calls for insert with check (true);

create policy "Authenticated users can read calls"
  on calls for select using (auth.role() = 'authenticated');

create policy "Authenticated users can update calls"
  on calls for update using (auth.role() = 'authenticated');

create policy "Authenticated users can read settings"
  on settings for select using (auth.role() = 'authenticated');

-- Realtime
alter publication supabase_realtime add table calls;

-- Default settings
insert into settings (business_name, logo_url, brand_color, subdomain)
values ('Scale Solar', '', '#eab308', 'main');
