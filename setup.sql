-- CHANGE UK V4 — SUPABASE BACKEND
-- Run this file once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Admin',
  created_at timestamptz not null default now()
);

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null check (role in ('mp','councillor','helper')),
  area text,
  title text,
  bio text,
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'PARTY NEWS',
  summary text,
  body text,
  image_url text,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.policies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'General',
  icon text default '●',
  summary text not null,
  detail text,
  bullet_points jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.party_stats (
  id integer primary key default 1 check (id = 1),
  mps integer not null default 0 check (mps >= 0),
  councillors integer not null default 0 check (councillors >= 0),
  helpers integer not null default 0 check (helpers >= 0),
  members integer not null default 0 check (members >= 0),
  updated_at timestamptz not null default now()
);

insert into public.party_stats (id) values (1) on conflict (id) do nothing;

create table if not exists public.interest_forms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  interest_type text,
  created_at timestamptz not null default now()
);

alter table public.admin_profiles enable row level security;
alter table public.people enable row level security;
alter table public.news enable row level security;
alter table public.policies enable row level security;
alter table public.party_stats enable row level security;
alter table public.interest_forms enable row level security;

create or replace function public.is_change_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.admin_profiles
    where user_id = auth.uid()
  );
$$;

-- Public reads
drop policy if exists "public read people" on public.people;
create policy "public read people" on public.people for select using (true);

drop policy if exists "public read news" on public.news;
create policy "public read news" on public.news for select using (published = true);

drop policy if exists "public read policies" on public.policies;
create policy "public read policies" on public.policies for select using (published = true);

drop policy if exists "public read stats" on public.party_stats;
create policy "public read stats" on public.party_stats for select using (true);

drop policy if exists "public submit interest" on public.interest_forms;
create policy "public submit interest" on public.interest_forms for insert with check (true);

-- Admin management
drop policy if exists "admins manage people" on public.people;
create policy "admins manage people" on public.people for all
using (public.is_change_admin()) with check (public.is_change_admin());

drop policy if exists "admins manage news" on public.news;
create policy "admins manage news" on public.news for all
using (public.is_change_admin()) with check (public.is_change_admin());

drop policy if exists "admins manage policies" on public.policies;
create policy "admins manage policies" on public.policies for all
using (public.is_change_admin()) with check (public.is_change_admin());

drop policy if exists "admins manage stats" on public.party_stats;
create policy "admins manage stats" on public.party_stats for all
using (public.is_change_admin()) with check (public.is_change_admin());

drop policy if exists "admins read interest" on public.interest_forms;
create policy "admins read interest" on public.interest_forms for select
using (public.is_change_admin());

drop policy if exists "admins read admin profiles" on public.admin_profiles;
create policy "admins read admin profiles" on public.admin_profiles for select
using (public.is_change_admin());

-- Storage bucket
insert into storage.buckets (id, name, public)
values ('party-images','party-images',true)
on conflict (id) do update set public = true;

drop policy if exists "public view party images" on storage.objects;
create policy "public view party images"
on storage.objects for select
using (bucket_id = 'party-images');

drop policy if exists "admins upload party images" on storage.objects;
create policy "admins upload party images"
on storage.objects for insert
with check (bucket_id = 'party-images' and public.is_change_admin());

drop policy if exists "admins update party images" on storage.objects;
create policy "admins update party images"
on storage.objects for update
using (bucket_id = 'party-images' and public.is_change_admin());

drop policy if exists "admins delete party images" on storage.objects;
create policy "admins delete party images"
on storage.objects for delete
using (bucket_id = 'party-images' and public.is_change_admin());

-- Starter policies. Safe to run repeatedly.
insert into public.policies (title, category, icon, summary, detail, bullet_points, sort_order)
select * from (values
('Economy & growth','Economy','£','Support productive investment, new businesses and stable public finances.','Change UK would publish costed economic proposals, set measurable growth objectives and regularly report progress against them.','["Encourage long-term investment","Support small and medium businesses","Review barriers to growth"]'::jsonb,10),
('NHS & public services','Public services','✚','Focus on access, reliability and measurable service standards.','Service plans would include published targets, workforce needs and regular performance reporting rather than relying on headline promises alone.','["Reduce avoidable waiting times","Improve workforce planning","Modernise public service technology"]'::jsonb,20),
('Housing & communities','Communities','⌂','Support sustainable housing delivery and stronger local decision-making.','Local plans would be expected to consider transport, schools, healthcare and community facilities alongside new homes.','["Increase housing supply","Prioritise infrastructure alongside development","Strengthen local accountability"]'::jsonb,30),
('Immigration','National','↘','Reduce net migration while maintaining clearly defined legal routes and effective border administration.','Any detailed immigration plan would need to set out proposed thresholds, legal routes, enforcement changes, economic impacts and protections required under UK law.','["Review legal migration routes","Improve enforcement and case processing","Publish transparent migration data"]'::jsonb,40),
('Energy & infrastructure','Economy','⚡','Plan for secure energy, modern transport and resilient national infrastructure.','Major projects would be accompanied by clear timelines, expected costs and public reporting on delivery.','["Improve grid resilience","Speed up strategic infrastructure","Support reliable transport networks"]'::jsonb,50),
('Local democracy','Communities','●','Make local representatives easier to scrutinise and local decisions easier to understand.','Local branches and representatives can later have dedicated manifesto and performance pages on this site.','["Clear councillor responsibilities","Transparent local performance","Stronger community consultation"]'::jsonb,60)
) as seed(title,category,icon,summary,detail,bullet_points,sort_order)
where not exists (select 1 from public.policies);
