-- =====================================================================
-- SolarStats — canonical database schema (multi-tenant)
-- =====================================================================
-- This file reflects the LIVE schema after all migrations.
-- Tenancy model: each business = one row in `settings`. Every other
-- table carries a `tenant_id` referencing settings(id). Isolation is
-- enforced by RLS via get_tenant_id(), which resolves the current
-- user's tenant from their profile row.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

-- Settings doubles as the "tenants" table — one row per business.
create table if not exists settings (
  id uuid primary key default gen_random_uuid(),
  business_name text not null default 'Scale Solar',
  logo_url text default '',
  brand_color text default '#eab308',
  color_theme text default 'cyan-aurora',
  subdomain text unique,
  show_leaderboard_to_reps boolean default false
);

-- Profiles (one per auth user), scoped to a tenant.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null default 'rep' check (role in ('rep', 'owner')),
  tenant_id uuid references settings(id) on delete cascade
);

-- Calls (appointments logged by reps), scoped to a tenant.
create table if not exists calls (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  tenant_id uuid references settings(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  rep_name text not null,
  homeowner_first_name text not null,
  homeowner_last_name text not null,
  address text not null,
  phone text not null default '',
  email text not null default '',
  appointment_date timestamptz not null,
  outcome text not null check (outcome in ('no-show','disqualified','no-sale','follow-up','closed')),
  disqualified_reason text default '',
  no_sale_reason text default '',
  follow_up_reason text default '',
  follow_up_intent text default '',
  system_size text default '',
  battery_size text default '0',
  deal_value text default '',
  sale_type text default 'same-week' check (sale_type in ('same-week','follow-up')),
  payment_type text default 'finance' check (payment_type in ('cash','finance'))
);

-- Goals (monthly targets), scoped to a tenant. scope = 'team' | 'rep'.
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references settings(id) on delete cascade,
  metric text not null,
  target numeric not null,
  scope text not null default 'team',
  unique (metric, scope, tenant_id)
);

-- ---------------------------------------------------------------------
-- Indexes (matter once data grows)
-- ---------------------------------------------------------------------
create index if not exists idx_calls_tenant         on calls(tenant_id);
create index if not exists idx_calls_user           on calls(user_id);
create index if not exists idx_calls_tenant_appt    on calls(tenant_id, appointment_date);
create index if not exists idx_profiles_tenant      on profiles(tenant_id);
create index if not exists idx_goals_tenant         on goals(tenant_id);

-- ---------------------------------------------------------------------
-- Tenant resolver — current user's tenant_id from their profile
-- ---------------------------------------------------------------------
create or replace function get_tenant_id() returns uuid as $$
  select tenant_id from profiles where id = auth.uid()
$$ language sql security definer stable;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table settings enable row level security;
alter table profiles enable row level security;
alter table calls    enable row level security;
alter table goals    enable row level security;

-- Settings: read own tenant; owners update own tenant.
drop policy if exists "Users read own tenant settings" on settings;
create policy "Users read own tenant settings" on settings
  for select using (id = get_tenant_id());

drop policy if exists "Owners update own tenant settings" on settings;
create policy "Owners update own tenant settings" on settings
  for update using (
    id = get_tenant_id() and
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );

-- Profiles: read tenant profiles; update own; owners insert into tenant.
drop policy if exists "Users read own tenant profiles" on profiles;
create policy "Users read own tenant profiles" on profiles
  for select using (tenant_id = get_tenant_id());

drop policy if exists "Users update own profile" on profiles;
create policy "Users update own profile" on profiles
  for update using (id = auth.uid());

drop policy if exists "Owners insert profiles" on profiles;
create policy "Owners insert profiles" on profiles
  for insert with check (
    tenant_id = get_tenant_id() and
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );

-- Calls: reps insert/read/update/delete own; owners full access within tenant.
drop policy if exists "Reps insert own calls" on calls;
create policy "Reps insert own calls" on calls
  for insert with check (auth.uid() = user_id and tenant_id = get_tenant_id());

drop policy if exists "Users read tenant calls" on calls;
create policy "Users read tenant calls" on calls
  for select using (
    tenant_id = get_tenant_id() and
    (auth.uid() = user_id or exists (
      select 1 from profiles where id = auth.uid() and role = 'owner' and tenant_id = get_tenant_id()
    ))
  );

drop policy if exists "Reps update own calls" on calls;
create policy "Reps update own calls" on calls
  for update using (auth.uid() = user_id and tenant_id = get_tenant_id());

drop policy if exists "Owners update tenant calls" on calls;
create policy "Owners update tenant calls" on calls
  for update using (
    tenant_id = get_tenant_id() and
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );

drop policy if exists "Reps delete own calls" on calls;
create policy "Reps delete own calls" on calls
  for delete using (auth.uid() = user_id and tenant_id = get_tenant_id());

drop policy if exists "Owners delete tenant calls" on calls;
create policy "Owners delete tenant calls" on calls
  for delete using (
    tenant_id = get_tenant_id() and
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );

-- Goals: read tenant goals; owners manage tenant goals.
drop policy if exists "Users read tenant goals" on goals;
create policy "Users read tenant goals" on goals
  for select using (tenant_id = get_tenant_id());

drop policy if exists "Owners manage tenant goals" on goals;
create policy "Owners manage tenant goals" on goals
  for all using (
    tenant_id = get_tenant_id() and
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  ) with check (
    tenant_id = get_tenant_id() and
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );

-- ---------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table calls;

-- ---------------------------------------------------------------------
-- Storage: create a `logos` bucket (public read) in the Supabase
-- dashboard. Logos are stored under `<tenant_id>/logo-<timestamp>.<ext>`.
-- ---------------------------------------------------------------------

-- =====================================================================
-- Onboarding a new business (run as service role):
--   1. insert into settings (business_name, subdomain, ...) returning id;
--   2. create the owner auth user (Supabase admin API);
--   3. insert into profiles (id, name, role, tenant_id)
--      values (<auth uid>, '<name>', 'owner', <settings id>);
--   4. owner logs in and sets goals / branding from the app.
-- =====================================================================
