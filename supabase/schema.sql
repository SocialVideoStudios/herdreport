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
  kind text not null check (kind in ('spotlight','presenting','ad','merch','store')),
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
    check (status in ('pending','approved','paid','live','completed','refund_requested','refunded','declined','cancelled')),
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
   where b.status in ('approved','paid','live','refund_requested') and b.placement is not null
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

-- Contact form messages
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  topic text, rating int check (rating between 1 and 5), name text not null, company text, email text not null, phone text, message text not null,
  status text not null default 'new' check (status in ('new','replied','closed')),
  created_at timestamptz not null default now()
);
alter table public.contact_messages enable row level security;
drop policy if exists "contact send" on public.contact_messages;
create policy "contact send" on public.contact_messages for insert to anon, authenticated with check (status = 'new');
drop policy if exists "contact admin" on public.contact_messages;
create policy "contact admin read" on public.contact_messages for select using (public.is_admin());
drop policy if exists "contact admin update" on public.contact_messages;
create policy "contact admin update" on public.contact_messages for update using (public.is_admin()) with check (public.is_admin());

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
 ('store','store','Hat order','Signature Hat order from the store.',array[]::text[],null,'',false,9),
 ('merch','merch','Merch partnership','Co-branded Herd Report gear for your sale, field day or customer appreciation event.',
   array['Co-branded Signature Hats','Giveaways for sale-day buyers','Mention on the show','Quantities and pricing on request'], null,'custom',true,4)
on conflict (id) do nothing;

insert into public.settings (key, value) values ('main',
 '{"rates":{"pre":500,"mid1":350,"mid2":350,"mid3":350,"post":250},"capacity":{"pre":1,"mid1":1,"mid2":1,"mid3":1,"post":1},"annualDiscount":10,"weeksAhead":16,"releaseDay":1,"stats":{"downloads":"","views":"","followers":""},"contactEmail":""}')
on conflict (key) do nothing;

-- Make Scott an admin: sign up on the site first, then run this with his email.
-- update public.profiles set role = 'admin' where email = 'scott@example.com';

-- Client portal: brand kit, creative files and talking points ---------------
alter table public.profiles add column if not exists brand jsonb not null default '{}';
alter table public.bookings add column if not exists assets jsonb not null default '[]';

-- Clients can update only the talking points and files on their own open orders.
create or replace function public.update_booking_creative(bid uuid, p_notes text, p_assets jsonb)
returns public.bookings language plpgsql security definer set search_path = public as $$
declare r public.bookings;
begin
  update public.bookings set notes = coalesce(p_notes, notes), assets = coalesce(p_assets, assets), updated_at = now()
   where id = bid and client_id = auth.uid() and status in ('pending','approved','paid','live')
   returning * into r;
  if not found then raise exception 'This order can no longer be changed.'; end if;
  return r;
end $$;
grant execute on function public.update_booking_creative(uuid, text, jsonb) to authenticated;

-- File storage for logos and ad files. Each client uploads into their own folder.
insert into storage.buckets (id, name, public) values ('creative', 'creative', true) on conflict (id) do nothing;
drop policy if exists "creative upload own" on storage.objects;
create policy "creative upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'creative' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "creative delete own" on storage.objects;
create policy "creative delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'creative' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- Listener reviews: anyone can submit, Scott approves before they show on the site --
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  rating int not null check (rating between 1 and 5),
  name text not null,
  place text,
  email text,
  text text not null,
  sample boolean not null default false,
  status text not null default 'pending' check (status in ('pending','approved','hidden')),
  created_at timestamptz not null default now()
);
alter table public.reviews enable row level security;
drop policy if exists "review submit" on public.reviews;
create policy "review submit" on public.reviews for insert to anon, authenticated with check (status = 'pending' and sample = false);
drop policy if exists "review public read" on public.reviews;
create policy "review public read" on public.reviews for select using (status = 'approved' or public.is_admin());
drop policy if exists "review admin" on public.reviews;
create policy "review admin" on public.reviews for all using (public.is_admin()) with check (public.is_admin());
insert into public.reviews (rating, name, place, text, sample, status)
select * from (values
 (5,'Sample review','Cow-calf operator','The ranch visits are the best part. You get to hear how breeders actually make their decisions, not just the sale catalog version.',true,'approved'),
 (5,'Sample review','Seedstock breeder','Scott asks the questions I would ask. Good conversations about cow families and sire selection, and he lets the guests talk.',true,'approved'),
 (5,'Sample review','Bull buyer','I listen before every sale season. The sale previews help me know which programs to watch.',true,'approved'),
 (4,'Sample review','Ranch hand and 4-H dad','Practical, down-to-earth and easy to listen to on the road. My kids have started asking about EPDs.',true,'approved'),
 (5,'Sample review','Commercial cattleman','Honest talk about genetics, management and marketing from people who live it. Let''s get to it!',true,'approved')
) v where not exists (select 1 from public.reviews);

-- Refunds: clients can request a refund on paid orders. Scott marks it refunded in the admin.
alter table public.bookings add column if not exists refund jsonb;
alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings add constraint bookings_status_check
  check (status in ('pending','approved','paid','live','completed','refund_requested','refunded','declined','cancelled'));
create or replace function public.request_refund(bid uuid, p_reason text)
returns public.bookings language plpgsql security definer set search_path = public as $$
declare r public.bookings;
begin
  update public.bookings set status = 'refund_requested', updated_at = now(),
    refund = jsonb_build_object('reason', p_reason, 'requested_at', now(), 'amount', greatest(0, coalesce(amount,0) - 50))
   where id = bid and client_id = auth.uid() and status in ('paid','live')
   returning * into r;
  if not found then raise exception 'This order can''t be refunded online. Contact Scott.'; end if;
  return r;
end $$;
grant execute on function public.request_refund(uuid, text) to authenticated;
