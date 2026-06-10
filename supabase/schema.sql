-- Drop and rebuild everything
drop table if exists calls cascade;
drop table if exists settings cascade;
drop table if exists profiles cascade;

-- Profiles table (one per user)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null default 'rep' check (role in ('rep', 'owner'))
);

-- Calls table
create table calls (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
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
alter table profiles enable row level security;
alter table calls enable row level security;
alter table settings enable row level security;

-- Profiles: users can read/update their own, owners can read all
create policy "Users can read own profile"
  on profiles for select using (auth.uid() = id);

create policy "Owners can read all profiles"
  on profiles for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Calls: reps see own, owners see all
create policy "Reps can insert own calls"
  on calls for insert with check (auth.uid() = user_id);

create policy "Reps can read own calls"
  on calls for select using (auth.uid() = user_id);

create policy "Owners can read all calls"
  on calls for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );

-- Settings: anyone authenticated can read
create policy "Authenticated users can read settings"
  on settings for select using (auth.role() = 'authenticated');

-- Realtime
alter publication supabase_realtime add table calls;

-- Default settings
insert into settings (business_name, logo_url, brand_color, subdomain)
values ('Scale Solar', '', '#eab308', 'main');

-- Function to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'rep')
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
