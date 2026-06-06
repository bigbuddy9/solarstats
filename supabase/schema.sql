-- Run this in each client's Supabase SQL editor to set up their project
-- Also enable Replication in Supabase Dashboard → Database → Replication → calls table (for real-time)

-- Calls table
create table if not exists calls (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  caller_name text not null,
  caller_phone text not null,
  call_date timestamptz not null,
  outcome text not null check (outcome in ('qualified','disqualified','no-show','cancelled','booked','closed')),
  monthly_revenue text not null,
  close_rate text not null,
  monthly_bookings text not null,
  notes text default ''
);

-- Settings table (one row per client)
create table if not exists settings (
  id uuid primary key default gen_random_uuid(),
  business_name text not null default 'Scale Solar',
  logo_url text default '',
  brand_color text default '#f97316',
  subdomain text default ''
);

-- Row-level security: only authenticated users can read/write
alter table calls enable row level security;
alter table settings enable row level security;

create policy "Authenticated users can read calls"
  on calls for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert calls"
  on calls for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update calls"
  on calls for update
  using (auth.role() = 'authenticated');

create policy "Authenticated users can read settings"
  on settings for select
  using (auth.role() = 'authenticated');

-- Enable realtime for the calls table
alter publication supabase_realtime add table calls;

-- Insert default settings row (edit values before running)
insert into settings (business_name, logo_url, brand_color, subdomain)
values ('Scale Solar', '', '#f97316', 'client1')
on conflict do nothing;
