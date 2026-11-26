-- Assertion-based security tests (run by scripts/test-sql.ts). Any failed assertion raises and aborts with a non-zero exit.
\set ON_ERROR_STOP on

create schema zm_test;
grant usage on schema zm_test to public;
create function zm_test.assert(cond boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'ASSERT FAILED: %', msg; end if; end $$;

-- expect a statement to fail with a given SQLSTATE (or any error if state is null) when run as the current role
create function zm_test.expect_error(stmt text, state text, msg text) returns void language plpgsql as $$
declare got text;
begin
  begin execute stmt; got := null;
  exception when others then got := sqlstate; end;
  if got is null then raise exception 'ASSERT FAILED (no error raised): %', msg; end if;
  if state is not null and got <> state then raise exception 'ASSERT FAILED (sqlstate % <> %): %', got, state, msg; end if;
end $$;
-- expect a write to affect zero rows (RLS filters it silently)
create function zm_test.expect_zero_rows(stmt text, msg text) returns void language plpgsql as $$
declare n int;
begin execute stmt; get diagnostics n = row_count; if n <> 0 then raise exception 'ASSERT FAILED (% rows affected): %', n, msg; end if; end $$;

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'admin@example.com'), ('22222222-2222-2222-2222-222222222222', 'visitor@example.com');
insert into public.admin_users (user_id) values ('11111111-1111-1111-1111-111111111111');
insert into public.manufacturers (id, slug, name, status) values
  ('aaaaaaaa-0000-4000-a000-000000000001', 'pub-mfr', 'Published', 'published'),
  ('aaaaaaaa-0000-4000-a000-000000000002', 'draft-mfr', 'Draft', 'draft');
insert into public.generators (id, slug, manufacturer_id, model, status, kva_prime) values
  ('bbbbbbbb-0000-4000-a000-000000000001', 'pub-gen', 'aaaaaaaa-0000-4000-a000-000000000001', 'P1', 'published', 100),
  ('bbbbbbbb-0000-4000-a000-000000000002', 'draft-gen', null, 'D1', 'draft', null);
insert into public.parts (id, slug, name, oem_code, status) values
  ('cccccccc-0000-4000-a000-000000000001', 'pub-part', '{"az":"Hissə"}', 'X-1', 'published'),
  ('cccccccc-0000-4000-a000-000000000002', 'draft-part', '{"az":"Qaralama"}', 'X-2', 'draft');
insert into public.part_compatibility values
  ('cccccccc-0000-4000-a000-000000000001', 'bbbbbbbb-0000-4000-a000-000000000001'),
  ('cccccccc-0000-4000-a000-000000000002', 'bbbbbbbb-0000-4000-a000-000000000001'),
  ('cccccccc-0000-4000-a000-000000000001', 'bbbbbbbb-0000-4000-a000-000000000002');
insert into public.inquiries (name, phone) values ('Existing Lead', '+994501234567');
insert into public.site_settings (key, value) values ('settings', '{"x":1}');

-- ══════════ anonymous visitor ══════════
set role anon;
select zm_test.assert((select count(*) from public.manufacturers) = 1, 'anon sees only published manufacturers');
select zm_test.assert((select count(*) from public.generators) = 1, 'anon sees only published generators');
select zm_test.assert((select count(*) from public.parts) = 1, 'anon sees only published parts');
select zm_test.assert((select count(*) from public.part_compatibility) = 1, 'anon sees compat only between published rows');
select zm_test.assert((select count(*) from public.site_settings) = 1, 'anon can read site settings');
select zm_test.assert(not public.is_admin(), 'anon is not admin');
select zm_test.expect_error($q$insert into public.generators (slug, model) values ('hack', 'X')$q$, '42501', 'anon cannot insert generators');
select zm_test.expect_error($q$update public.generators set featured = true$q$, '42501', 'anon cannot update generators');
select zm_test.expect_error($q$delete from public.manufacturers$q$, '42501', 'anon cannot delete manufacturers');
select zm_test.expect_error($q$insert into public.site_settings (key, value) values ('content', '{}')$q$, '42501', 'anon cannot write settings');
select zm_test.expect_error($q$select count(*) from public.inquiries$q$, '42501', 'anon cannot read inquiries');
select zm_test.expect_error($q$select * from public.admin_users$q$, '42501', 'anon cannot read admin_users');
select zm_test.expect_error($q$select * from public.media$q$, '42501', 'anon cannot list media rows (file names, usage)');
select zm_test.expect_error($q$insert into public.admin_users (user_id) values ('22222222-2222-2222-2222-222222222222')$q$, '42501', 'anon cannot add admins');
-- inquiries: valid insert ok; escalation / junk rejected
insert into public.inquiries (name, phone, product, message, locale) values ('Əli Vəliyev', '+994501234567', 'Perkins', 'Salam', 'az');
-- the server forces status / is_demo / timestamps (BEFORE INSERT trigger): attempts to pre-set them are silently normalised
insert into public.inquiries (name, phone, status, is_demo, created_at) values ('Escalation Try', '+994501234567', 'done', true, '2001-01-01');
select zm_test.expect_error($q$insert into public.inquiries (name, phone) values ('Əli Vəliyev', 'abc')$q$, '23514', 'bad phone rejected by CHECK');
select zm_test.expect_error($q$insert into public.inquiries (name, phone) values ('A', '+994501234567')$q$, '23514', 'short name rejected by CHECK');
select zm_test.expect_error($q$insert into public.inquiries (name, phone, message) values ('Əli Vəliyev', '+994501234567', repeat('x', 2001))$q$, '23514', 'oversized message rejected');
-- storage
select zm_test.expect_error($q$insert into storage.objects (bucket_id, name) values ('media', 'a/full.webp')$q$, '42501', 'anon cannot upload');
select zm_test.assert((select count(*) from storage.objects where bucket_id = 'media') = 0, 'anon can read media bucket (empty here)');
reset role;

-- ══════════ signed-in but NOT admin ══════════
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select zm_test.assert(not public.is_admin(), 'non-admin user is not admin');
select zm_test.assert((select count(*) from public.generators) = 1, 'non-admin sees only published generators');
select zm_test.expect_error($q$insert into public.manufacturers (slug, name) values ('sneaky', 'S')$q$, '42501', 'non-admin cannot insert manufacturers');
select zm_test.expect_zero_rows($q$update public.manufacturers set name = 'hijacked'$q$, 'non-admin update affects nothing');
select zm_test.expect_zero_rows($q$delete from public.generators$q$, 'non-admin delete affects nothing');
select zm_test.assert((select count(*) from public.inquiries) = 0, 'non-admin cannot read inquiries');
select zm_test.assert((select count(*) from public.media) = 0, 'non-admin sees no media rows');
select zm_test.assert((select count(*) from public.admin_users) = 0, 'non-admin cannot see admin_users');
select zm_test.expect_error($q$insert into public.admin_users (user_id) values ('22222222-2222-2222-2222-222222222222')$q$, '42501', 'user cannot make themselves admin');
select zm_test.expect_error($q$insert into storage.objects (bucket_id, name) values ('media', 'y/full.webp')$q$, '42501', 'non-admin cannot upload to storage');
reset role;

-- ══════════ admin ══════════
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select zm_test.assert(public.is_admin(), 'admin recognised');
select zm_test.assert((select count(*) from public.generators) = 2, 'admin sees drafts');
select zm_test.assert((select count(*) from public.part_compatibility) = 3, 'admin sees all compat');
select zm_test.assert((select count(*) from public.inquiries) = 3, 'admin reads inquiries (seeded + 2 submitted by an anon visitor)');
select zm_test.assert((select count(*) from public.inquiries where name = 'Escalation Try' and status = 'new' and is_demo = false and created_at > now() - interval '1 day') = 1, 'server forced status/is_demo/created_at on a visitor inquiry');
select zm_test.assert((select count(*) from public.admin_users) = 1, 'admin sees own membership row only');
insert into public.manufacturers (slug, name, status) values ('acme', 'Acme', 'published');
insert into public.media (name, url) values ('x.webp', 'https://x/y');
select zm_test.assert((select count(*) from public.media) = 1, 'admin can manage and read media rows');
select zm_test.expect_error($q$insert into public.manufacturers (slug, name) values ('acme', 'Dup')$q$, '23505', 'duplicate slug');
select zm_test.expect_error($q$insert into public.manufacturers (slug, name) values ('Bad Slug', 'B')$q$, '23514', 'bad slug');
select zm_test.expect_error($q$insert into public.generators (slug, model, status, kva_prime) values ('nm', 'N', 'published', 50)$q$, '23514', 'published generator needs manufacturer');
select zm_test.expect_error($q$insert into public.generators (slug, model, price) values ('bp', 'P', '{"type":"free"}')$q$, '23514', 'invalid price type');
select zm_test.expect_error($q$insert into public.generators (slug, model, kva_prime) values ('neg', 'P', -1)$q$, '23514', 'negative power');
select zm_test.expect_error($q$insert into public.generators (slug, model, fuel_type) values ('fu', 'P', 'water')$q$, '23514', 'invalid enum');
select zm_test.expect_error($q$delete from public.manufacturers where slug = 'pub-mfr'$q$, '23503', 'cannot delete manufacturer in use (FK restrict)');
select zm_test.expect_error($q$insert into public.admin_users (user_id) values ('22222222-2222-2222-2222-222222222222')$q$, '42501', 'even admins cannot add admins through the API');
update public.inquiries set status = 'read' where name = 'Existing Lead';
delete from public.generators where slug = 'pub-gen';
select zm_test.assert((select count(*) from public.part_compatibility where generator_id = 'bbbbbbbb-0000-4000-a000-000000000001') = 0, 'deleting a generator cascades its compatibility rows');
insert into storage.objects (bucket_id, name) values ('media', 'x/full.webp');
select zm_test.assert((select count(*) from storage.objects) = 1, 'admin can upload to (and read) the media bucket');
reset role;

-- ══════════ demo rows get no special privileges ══════════
-- A row flagged is_demo is protected exactly like any other row. Admins CAN edit the flag, which is why the app's demo tooling
-- never trusts the flag alone (it also requires a dataset id) and why this is asserted rather than assumed.
insert into public.manufacturers (id, slug, name, status, is_demo) values ('aaaaaaaa-0000-4000-a000-0000000000d1', 'demo-mfr', 'Demo', 'published', true);
insert into public.media (id, name, url, is_demo) values ('dddddddd-0000-4000-a000-0000000000d1', 'demo.webp', 'https://x/d', true);
set role anon;
select zm_test.expect_error($q$delete from public.manufacturers where is_demo$q$, '42501', 'anon cannot delete demo rows');
select zm_test.expect_error($q$update public.manufacturers set is_demo = false$q$, '42501', 'anon cannot un-flag demo rows');
select zm_test.expect_error($q$select count(*) from public.media$q$, '42501', 'anon cannot read media rows (demo or not)');
reset role;
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select zm_test.expect_zero_rows($q$delete from public.manufacturers where is_demo$q$, 'non-admin cannot delete demo rows');
select zm_test.expect_zero_rows($q$update public.manufacturers set is_demo = false where id = 'aaaaaaaa-0000-4000-a000-0000000000d1'$q$, 'non-admin cannot un-flag demo rows');
select zm_test.expect_zero_rows($q$delete from public.media$q$, 'non-admin cannot delete media rows');
reset role;
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
update public.manufacturers set is_demo = false where id = 'aaaaaaaa-0000-4000-a000-0000000000d1';
select zm_test.assert((select is_demo from public.manufacturers where id = 'aaaaaaaa-0000-4000-a000-0000000000d1') = false, 'admins can edit the flag (documented: tooling requires dataset ids too)');
reset role;

-- bucket configuration
select zm_test.assert((select public from storage.buckets where id = 'media'), 'media bucket is public-read');
select zm_test.assert((select file_size_limit from storage.buckets where id = 'media') <= 5242880, 'media bucket has a size limit');
select zm_test.assert(not exists (select 1 from storage.buckets where id = 'media' and 'image/svg+xml' = any (allowed_mime_types)), 'SVG uploads are not allowed in storage');
select zm_test.assert(not exists (select 1 from storage.buckets where id = 'media' and 'text/html' = any (allowed_mime_types)), 'HTML uploads are not allowed in storage');
\echo 'ALL SQL SECURITY ASSERTIONS PASSED'
