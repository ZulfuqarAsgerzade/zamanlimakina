-- Run ONCE in the Supabase SQL editor after creating your admin user
-- (Authentication → Users → "Add user", with a strong password you choose).
-- Replace the e-mail below with that user's e-mail. No default account exists.
insert into public.admin_users (user_id)
select id from auth.users where lower(email) = lower('REPLACE-WITH-YOUR-ADMIN-EMAIL');

-- must say 'INSERT 0 1'. 'INSERT 0 0' means no user has that e-mail (check Authentication → Users) — nobody became admin.
select u.email, (a.user_id is not null) as is_admin from auth.users u left join public.admin_users a on a.user_id = u.id order by u.created_at;
