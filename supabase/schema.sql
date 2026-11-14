-- StudyHub SA database setup
-- Run this entire file in Supabase Dashboard > SQL Editor.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'student' check (role in ('student','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text not null check (subject in ('Mathematics','Mathematical Literacy','Physical Sciences','Accounting','Life Sciences')),
  grade text not null check (grade in ('10','11','12')),
  year integer not null,
  term text,
  type text not null check (type in ('Question Paper','Memorandum','Notes')),
  description text,
  file_path text not null,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- Automatically create a student profile after signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Helper avoids recursive profile-policy checks.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.resources enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or public.is_admin());

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
on public.profiles for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Signed in users can read resources" on public.resources;
create policy "Signed in users can read resources"
on public.resources for select to authenticated
using (true);

drop policy if exists "Admins can insert resources" on public.resources;
create policy "Admins can insert resources"
on public.resources for insert to authenticated
with check (public.is_admin() and uploaded_by = (select auth.uid()));

drop policy if exists "Admins can update resources" on public.resources;
create policy "Admins can update resources"
on public.resources for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can delete resources" on public.resources;
create policy "Admins can delete resources"
on public.resources for delete to authenticated
using (public.is_admin());

-- Private bucket: PDFs are never publicly accessible.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('study-resources', 'study-resources', false, 20971520, array['application/pdf'])
on conflict (id) do update
set public = false, file_size_limit = 20971520, allowed_mime_types = array['application/pdf'];

drop policy if exists "Signed in users can read study PDFs" on storage.objects;
create policy "Signed in users can read study PDFs"
on storage.objects for select to authenticated
using (bucket_id = 'study-resources');

drop policy if exists "Admins can upload study PDFs" on storage.objects;
create policy "Admins can upload study PDFs"
on storage.objects for insert to authenticated
with check (bucket_id = 'study-resources' and public.is_admin());

drop policy if exists "Admins can update study PDFs" on storage.objects;
create policy "Admins can update study PDFs"
on storage.objects for update to authenticated
using (bucket_id = 'study-resources' and public.is_admin())
with check (bucket_id = 'study-resources' and public.is_admin());

drop policy if exists "Admins can delete study PDFs" on storage.objects;
create policy "Admins can delete study PDFs"
on storage.objects for delete to authenticated
using (bucket_id = 'study-resources' and public.is_admin());

-- IMPORTANT: After creating your own account, promote it to admin:
-- update public.profiles set role = 'admin' where id = 'YOUR-AUTH-USER-UUID';
-- Find your UUID in Supabase > Authentication > Users.
