-- Herd Report ads: database setup for Supabase.
-- Run this once in your Supabase project: SQL Editor > New query > paste > Run.

-- Accounts --------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  company text,
  contact_name text,
  phone text,
  role text not null default 'client' check (role in ('client','admin')),
  created_at timestamptz not null default now()
);

-- Create a profile automatically when someone signs up.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, company, contact_name, phone)
  values (new.id, new.email,
          new.raw_user_meta_data->>'company',
          new.raw_user_meta_data->>'contact_name',
          new.raw_user_meta_data->>'phone');
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Packages and settings -------------------------------------------------
create table if not exists public.packages (
  id text primary key,
  kind text not null check (kind in ('spotlight','presenting','ad','merch')),
  name text not null,
  description text,
  features text[] not null default '{}',
  price numeric,
  unit text,
  active boolean not null default true,
  sort int not null default 0
);

create table if not exists public.settings (
  key text primary key,
  value jsonb not null
);

-- Bookings ----------------------------------------------------------------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  package_id text not null references public.packages(id),
  kind text not null,
  placement text check (placement in ('pre','mid1','mid2','mid3','post')),
  episode_dates date[] not null default '{}',
  sale_date date,
  location text,
  notes text,
  creative_url text,
  amount numeric,
  status text not null default 'pending'
    check (status in ('pending','approved','paid','live','completed','declined','cancelled')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Clients can't change a booking's fields directly, only cancel through this function.
create or replace function public.cancel_booking(bid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.bookings set status = 'cancelled', updated_at = now()
   where id = bid and client_id = auth.uid() and status = 'pending';
  if not found then raise exception 'Only pending requests can be cancelled.'; end if;
end $$;

-- Taken ad slots per episode, without exposing who booked them.
create or replace function public.slot_usage()
returns table (episode_date date, placement text, n bigint)
language sql stable security definer set search_path = public as $$
  select d, b.placement, count(*)
    from public.bookings b, unnest(b.episode_dates) d
   where b.status in ('approved','paid','live') and b.placement is not null
   group by d, b.placement;
$$;

-- Guest applications (no account needed to apply)
create table if not exists public.guest_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  operation text,
  role text,
  email text not null,
  phone text,
  location text,
  website text,
  socials text,
  breeds text[] not null default '{}',
  herd_type text,
  topics text,
  sale_date date,
  photo_url text,
  heard_from text,
  status text not null default 'new' check (status in ('new','contacted','scheduled','recorded','declined')),
  admin_note text,
  created_at timestamptz not null default now()
);

-- Row-level security ------------------------------------------------------
alter table public.guest_requests enable row level security;
drop policy if exists "guest apply" on public.guest_requests;
create policy "guest apply" on public.guest_requests for insert to anon, authenticated with check (status = 'new');
drop policy if exists "guest admin read" on public.guest_requests;
create policy "guest admin read" on public.guest_requests for select using (public.is_admin());
drop policy if exists "guest admin update" on public.guest_requests;
create policy "guest admin update" on public.guest_requests for update using (public.is_admin()) with check (public.is_admin());

alter table public.profiles enable row level security;
alter table public.packages enable row level security;
alter table public.settings enable row level security;
alter table public.bookings enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (public.is_admin() or (id = auth.uid() and role = 'client'));

drop policy if exists "packages public" on public.packages;
create policy "packages public" on public.packages for select using (true);
drop policy if exists "packages admin" on public.packages;
create policy "packages admin" on public.packages for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "settings public" on public.settings;
create policy "settings public" on public.settings for select using (true);
drop policy if exists "settings admin" on public.settings;
create policy "settings admin" on public.settings for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "bookings read" on public.bookings;
create policy "bookings read" on public.bookings for select using (client_id = auth.uid() or public.is_admin());
drop policy if exists "bookings create" on public.bookings;
create policy "bookings create" on public.bookings for insert
  with check (client_id = auth.uid() and status = 'pending');
drop policy if exists "bookings admin" on public.bookings;
create policy "bookings admin" on public.bookings for update using (public.is_admin()) with check (public.is_admin());

grant execute on function public.cancel_booking(uuid) to authenticated;
grant execute on function public.slot_usage() to anon, authenticated;

-- Starting packages and prices (edit them later in the admin dashboard) ------
insert into public.packages (id, kind, name, description, features, price, unit, active, sort) values
 ('spotlight','spotlight','Spotlight Series','A full Herd Report episode recorded at your operation ahead of your sale, released on YouTube and every podcast app.',
   array['Scott visits your ranch and walks the offering','Full episode on YouTube, Apple and Spotify','Shared on Herd Report social channels','Released ahead of your sale date'], null,'per episode',true,1),
 ('presenting','presenting','Presenting sponsor','Own the show for a year. Your brand opens every episode with a host-read "brought to you by" from Scott.',
   array['Pre-roll on 52 weekly episodes','"Brought to you by" from Scott','Logo on the Herd Report website','Annual discount on the weekly rate'], 23400,'per year',true,2),
 ('ads','ad','Episode ads','Host-read spots in the episodes you choose. Book a single week or a run of weeks from open slots.',
   array['Read by Scott, in his own words','Five spots per episode: pre-roll, three mid-rolls and post-roll','Pick your weeks from the live calendar','Great for sale announcements'], null,'per episode',true,3),
 ('merch','merch','Merch partnership','Co-branded Herd Report gear for your sale, field day or customer appreciation event.',
   array['Co-branded Signature Hats','Giveaways for sale-day buyers','Mention on the show','Quantities and pricing on request'], null,'custom',true,4)
on conflict (id) do nothing;

insert into public.settings (key, value) values ('main',
 '{"rates":{"pre":500,"mid1":350,"mid2":350,"mid3":350,"post":250},"capacity":{"pre":1,"mid1":1,"mid2":1,"mid3":1,"post":1},"annualDiscount":10,"weeksAhead":16,"releaseDay":1,"stats":{"downloads":"","views":"","followers":""},"contactEmail":""}')
on conflict (key) do nothing;

-- Make Scott an admin: sign up on the site first, then run this with his email.
-- update public.profiles set role = 'admin' where email = 'scott@example.com';
