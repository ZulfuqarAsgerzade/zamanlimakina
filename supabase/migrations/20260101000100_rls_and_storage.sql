-- Row-level security + storage policies.
-- Visitors (anon) can read PUBLISHED catalogue rows and send an inquiry. Everything else requires admin.

alter table public.admin_users enable row level security;
alter table public.manufacturers enable row level security;
alter table public.categories enable row level security;
alter table public.generators enable row level security;
alter table public.parts enable row level security;
alter table public.part_compatibility enable row level security;
alter table public.media enable row level security;
alter table public.inquiries enable row level security;
alter table public.site_settings enable row level security;

-- admins can see their own membership row (the app uses it to confirm admin status after sign-in)
create policy "admin_users: read own" on public.admin_users for select to authenticated using (user_id = auth.uid());

-- public read of published rows; admins see (and write) everything
create policy "manufacturers: public read" on public.manufacturers for select using (status = 'published' or (select public.is_admin()));
create policy "manufacturers: admin write" on public.manufacturers for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "categories: public read" on public.categories for select using (status = 'published' or (select public.is_admin()));
create policy "categories: admin write" on public.categories for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "generators: public read" on public.generators for select using (status = 'published' or (select public.is_admin()));
create policy "generators: admin write" on public.generators for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "parts: public read" on public.parts for select using (status = 'published' or (select public.is_admin()));
create policy "parts: admin write" on public.parts for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "compat: public read" on public.part_compatibility for select using (
  (select public.is_admin())
  or (
    exists (select 1 from public.generators g where g.id = generator_id and g.status = 'published')
    and exists (select 1 from public.parts p where p.id = part_id and p.status = 'published')
  )
);
create policy "compat: admin write" on public.part_compatibility for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- media rows (original file names, usage) are admin-only: the public site embeds image URLs in the product rows instead
create policy "media: admin write" on public.media for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "site_settings: public read" on public.site_settings for select using (true);
create policy "site_settings: admin write" on public.site_settings for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- inquiries: anyone may submit (constraints on the table validate the payload); only admins read / manage
create policy "inquiries: public insert" on public.inquiries for insert to anon, authenticated
  with check (status = 'new' and is_demo = false);
create policy "inquiries: admin manage" on public.inquiries for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- table privileges (RLS above is the actual gate). Supabase grants ALL on new public tables to anon/authenticated by default:
-- start from nothing and grant only what is needed (defence in depth if a policy is ever mis-written).
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.manufacturers, public.categories, public.generators, public.parts,
  public.part_compatibility, public.site_settings to anon;
grant insert on public.inquiries to anon;
grant select, insert, update, delete on public.manufacturers, public.categories, public.generators, public.parts,
  public.part_compatibility, public.media, public.site_settings, public.inquiries to authenticated;
grant select on public.admin_users to authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- inquiries: the server — not the visitor — decides these fields
create or replace function public.inquiries_force_defaults() returns trigger language plpgsql set search_path = public as $$
begin
  new.status := 'new';
  new.is_demo := false;
  new.created_at := now();
  new.updated_at := now();
  return new;
end $$;
create trigger inquiries_defaults before insert on public.inquiries for each row execute function public.inquiries_force_defaults();

-- ───────────────────────── storage: public "media" bucket, admin-only writes ─────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/webp', 'image/jpeg', 'image/png', 'image/avif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- no public SELECT policy: files of a PUBLIC bucket are served by URL without one, and omitting it keeps the bucket from being listable via the API
create policy "media bucket: admin read" on storage.objects for select to authenticated using (bucket_id = 'media' and (select public.is_admin()));
create policy "media bucket: admin insert" on storage.objects for insert to authenticated with check (bucket_id = 'media' and (select public.is_admin()));
create policy "media bucket: admin update" on storage.objects for update to authenticated using (bucket_id = 'media' and (select public.is_admin()));
create policy "media bucket: admin delete" on storage.objects for delete to authenticated using (bucket_id = 'media' and (select public.is_admin()));
