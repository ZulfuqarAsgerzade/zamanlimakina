-- Zamanlı Makina — catalogue schema
-- Apply with the Supabase CLI (`supabase db push`) or paste into the SQL editor.

create extension if not exists pgcrypto;

-- ───────────────────────── admins ─────────────────────────
-- Only users listed here are administrators. Create the first one manually (see README).
create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ───────────────────────── manufacturers ─────────────────────────
create table public.manufacturers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  logo jsonb,
  cover jsonb,
  description jsonb not null default '{}'::jsonb,
  website text,
  seo jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('published', 'draft')),
  sort_order integer not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────────────────────── categories (generator + part) ─────────────────────────
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('generator', 'part')),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name jsonb not null default '{}'::jsonb,
  description jsonb not null default '{}'::jsonb,
  icon text,
  sort_order integer not null default 0,
  status text not null default 'published' check (status in ('published', 'draft')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, slug),
  check (coalesce(name ->> 'az', '') <> '')
);

-- ───────────────────────── generators ─────────────────────────
create table public.generators (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  manufacturer_id uuid references public.manufacturers (id) on delete restrict,
  category_id uuid references public.categories (id) on delete restrict,
  model text not null check (char_length(btrim(model)) between 1 and 80),
  title jsonb not null default '{}'::jsonb,
  short_description jsonb not null default '{}'::jsonb,
  description jsonb not null default '{}'::jsonb,
  advantages jsonb not null default '[]'::jsonb,
  applications jsonb not null default '[]'::jsonb,
  images jsonb not null default '[]'::jsonb,
  price jsonb not null default '{"type":"request"}'::jsonb
    check (price ->> 'type' in ('fixed', 'request', 'hidden')),
  availability text not null default 'on_order'
    check (availability in ('in_stock', 'on_order', 'out_of_stock', 'coming_soon')),
  featured boolean not null default false,
  status text not null default 'draft' check (status in ('published', 'draft')),
  kva_prime numeric check (kva_prime > 0),
  kva_standby numeric check (kva_standby > 0),
  generator_type text check (generator_type in ('open', 'canopy', 'container', 'trailer')),
  fuel_type text check (fuel_type in ('diesel', 'gas', 'petrol', 'dual')),
  phase smallint check (phase in (1, 3)),
  cooling_system text check (cooling_system in ('water', 'air')),
  spec_groups jsonb not null default '[]'::jsonb,
  seo jsonb not null default '{}'::jsonb,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- a published generator needs a manufacturer and a power rating
  check (status = 'draft' or (manufacturer_id is not null and kva_prime is not null))
);
create index generators_manufacturer_idx on public.generators (manufacturer_id);
create index generators_category_idx on public.generators (category_id);
create index generators_status_idx on public.generators (status);

-- ───────────────────────── spare parts ─────────────────────────
create table public.parts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name jsonb not null default '{}'::jsonb check (coalesce(name ->> 'az', '') <> ''),
  oem_code text not null check (char_length(btrim(oem_code)) between 1 and 60),
  manufacturer_id uuid references public.manufacturers (id) on delete restrict,
  category_id uuid references public.categories (id) on delete restrict,
  description jsonb not null default '{}'::jsonb,
  images jsonb not null default '[]'::jsonb,
  price jsonb not null default '{"type":"request"}'::jsonb
    check (price ->> 'type' in ('fixed', 'request', 'hidden')),
  availability text not null default 'on_order'
    check (availability in ('in_stock', 'on_order', 'out_of_stock', 'coming_soon')),
  featured boolean not null default false,
  status text not null default 'draft' check (status in ('published', 'draft')),
  spec_groups jsonb not null default '[]'::jsonb,
  seo jsonb not null default '{}'::jsonb,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index parts_manufacturer_idx on public.parts (manufacturer_id);
create index parts_category_idx on public.parts (category_id);
create index parts_oem_idx on public.parts (lower(oem_code));

-- many-to-many: a part fits many generators, a generator takes many parts
create table public.part_compatibility (
  part_id uuid not null references public.parts (id) on delete cascade,
  generator_id uuid not null references public.generators (id) on delete cascade,
  primary key (part_id, generator_id)
);
create index part_compat_generator_idx on public.part_compatibility (generator_id);

-- ───────────────────────── media library ─────────────────────────
create table public.media (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  thumb_url text,
  path text,
  width integer,
  height integer,
  size integer,
  alt jsonb not null default '{}'::jsonb,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────────────────────── general inquiries ─────────────────────────
create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120 and char_length(name) <= 200),
  phone text not null check (phone ~ '^[+0-9][0-9 ()-]{6,24}$'),
  product text not null default '' check (char_length(product) <= 200),
  message text not null default '' check (char_length(message) <= 2000),
  locale text not null default 'az' check (locale in ('az', 'ru', 'en')),
  status text not null default 'new' check (status in ('new', 'read', 'done')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────────────────────── site settings / content (two JSON documents) ─────────────────────────
create table public.site_settings (
  key text primary key check (key in ('settings', 'content')),
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array['manufacturers', 'categories', 'generators', 'parts', 'media', 'inquiries'] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.touch_updated_at()', t || '_touch', t);
  end loop;
end $$;
