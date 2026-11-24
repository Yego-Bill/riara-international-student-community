-- =============================================================================
-- RISC portal: database setup
-- -----------------------------------------------------------------------------
-- Paste this whole file into Supabase > SQL Editor > New query, then click Run.
-- It is safe to run more than once.
--
-- What it creates:
--   staff_emails        who counts as staff (Rep + Kelvin)
--   profiles            one row per signed-up person, with their role
--   applications        Student Pass / Internship-Research Pass applications
--   documents           the files uploaded for each application
--   status_history      every status change, who made it and when
--   staff_notes         internal notes students never see
--   announcements       the banner on Home (managed from the staff dashboard)
--   events              the events list (managed from the staff dashboard)
--   checklist_progress  each student's ticks on the site's checklists
--   storage bucket "documents" (private, 5 MB per file, PDF/JPG/PNG only)
--
-- Security model (Row Level Security):
--   * Nothing is readable or writable unless a rule below allows it.
--   * Students see and change only their own rows and files.
--   * Only staff can change an application's status, assignment or notes.
--   * Roles are set by the database from staff_emails, never by the browser.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Staff list
--    To hand over to the real Kelvin later:
--      insert into public.staff_emails (email) values ('kelvin@...');
--      delete from public.staff_emails where email = 'yegobill1490@gmail.com';
--    then run the "sync roles" line at the bottom of this file.
-- -----------------------------------------------------------------------------
create table if not exists public.staff_emails (
  email text primary key check (email = lower(email))
);
alter table public.staff_emails enable row level security;
-- No policies: nobody can read or change this list through the website.

insert into public.staff_emails (email) values
  ('internationalstudents@riarauniversity.ac.ke'),  -- International Student Rep
  ('yegobill1490@gmail.com')                         -- "Kelvin" for Round 1 testing
on conflict do nothing;


-- -----------------------------------------------------------------------------
-- 2. Profiles
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text not null default '',
  student_id  text not null default '',
  country     text not null default '',
  phone       text not null default '',
  role        text not null default 'student' check (role in ('student', 'staff')),
  created_at  timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- Is the person making this request staff? Used by the rules below.
-- "security definer" lets it read profiles without tripping the rules itself.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'staff'
  );
$$;

-- Sign-up rules, enforced by the database (the website can't skip them):
--   1. BEFORE a user is created: only @stu.riarauniversity.ac.ke addresses,
--      or addresses on the staff list, are allowed.
--   2. AFTER a user is created: their profile row is made. The role comes
--      from staff_emails, never from anything the browser sends.
create or replace function public.check_signup_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.staff_emails where email = lower(new.email))
     and lower(new.email) not like '%@stu.riarauniversity.ac.ke' then
    raise exception 'Only Riara University student emails (@stu.riarauniversity.ac.ke) can sign up.';
  end if;
  return new;
end;
$$;

drop trigger if exists check_signup_email on auth.users;
create trigger check_signup_email
  before insert on auth.users
  for each row execute function public.check_signup_email();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, student_id, country, phone, role)
  values (
    new.id,
    lower(new.email),
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120),
    left(coalesce(new.raw_user_meta_data ->> 'student_id', ''), 40),
    left(coalesce(new.raw_user_meta_data ->> 'country', ''), 80),
    left(coalesce(new.raw_user_meta_data ->> 'phone', ''), 30),
    case when exists (select 1 from public.staff_emails where email = lower(new.email))
         then 'staff' else 'student' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Students can't change their own role: only these columns are editable.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
as $$
begin
  if not public.is_staff() then
    new.role  := old.role;
    new.email := old.email;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

drop policy if exists "profiles: read own or staff" on public.profiles;
create policy "profiles: read own or staff" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_staff());

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());


-- -----------------------------------------------------------------------------
-- 3. Applications
-- -----------------------------------------------------------------------------
create table if not exists public.applications (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references public.profiles (id) on delete cascade,
  pass_type        text not null check (pass_type in ('student_pass', 'internship_research_pass')),
  application_type text not null check (application_type in ('new', 'renewal')),
  status           text not null default 'submitted' check (status in (
                     'submitted', 'under_review', 'missing_documents',
                     'awaiting_payment', 'processing', 'ready_for_collection', 'completed')),
  student_message  text not null default '',   -- shown to the student (e.g. what's missing)
  assigned_to      uuid references public.profiles (id) on delete set null,
  submitted_at     timestamptz,               -- empty = student hasn't pressed Submit yet
  status_changed_at timestamptz not null default now(),
  docs_updated_at  timestamptz,               -- last time the student added a file
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
-- (for databases created by an earlier version of this script)
alter table public.applications add column if not exists submitted_at timestamptz;
alter table public.applications add column if not exists status_changed_at timestamptz not null default now();
alter table public.applications add column if not exists docs_updated_at timestamptz;
create index if not exists applications_student_idx on public.applications (student_id);
alter table public.applications enable row level security;

-- Students can create their own application, always starting as "submitted".
drop policy if exists "applications: student creates own" on public.applications;
create policy "applications: student creates own" on public.applications
  for insert to authenticated
  with check (
    student_id = auth.uid()
    and status = 'submitted'
    and assigned_to is null
    and student_message = ''
    and submitted_at is null
    and docs_updated_at is null
  );

-- Staff only see applications once the student has pressed Submit.
drop policy if exists "applications: read own or staff" on public.applications;
create policy "applications: read own or staff" on public.applications
  for select to authenticated
  using (student_id = auth.uid() or (public.is_staff() and submitted_at is not null));

-- Only staff can change an application (status, message, assignment).
drop policy if exists "applications: staff update" on public.applications;
create policy "applications: staff update" on public.applications
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Keep updated_at fresh and log every status change automatically.
create or replace function public.applications_touch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    new.status_changed_at := now();
    insert into public.status_history (application_id, status, changed_by)
    values (new.id, new.status, auth.uid());
  end if;
  return new;
end;
$$;


-- -----------------------------------------------------------------------------
-- 4. Status history (written automatically; nobody edits it by hand)
-- -----------------------------------------------------------------------------
create table if not exists public.status_history (
  id             bigint generated always as identity primary key,
  application_id uuid not null references public.applications (id) on delete cascade,
  status         text not null,
  changed_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists status_history_app_idx on public.status_history (application_id);
alter table public.status_history enable row level security;

drop policy if exists "history: read own or staff" on public.status_history;
create policy "history: read own or staff" on public.status_history
  for select to authenticated
  using (
    public.is_staff()
    or exists (select 1 from public.applications a
               where a.id = application_id and a.student_id = auth.uid())
  );

drop trigger if exists applications_touch on public.applications;
create trigger applications_touch
  before update on public.applications
  for each row execute function public.applications_touch();

drop trigger if exists applications_first_history on public.applications;
drop function if exists public.applications_first_history();

-- The student presses "Submit application". Checks it's theirs and not yet
-- submitted, stamps the time, and logs the first "submitted" entry.
create or replace function public.submit_application(app_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.applications
     set submitted_at = now(), status_changed_at = now()
   where id = app_id
     and student_id = auth.uid()
     and submitted_at is null;
  if not found then
    raise exception 'Application not found or already submitted.';
  end if;
  insert into public.status_history (application_id, status, changed_by)
  values (app_id, 'submitted', auth.uid());
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. Documents (the file itself lives in Storage; this row describes it)
-- -----------------------------------------------------------------------------
create table if not exists public.documents (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  owner_id       uuid not null references public.profiles (id) on delete cascade,
  doc_key        text not null,             -- which checklist item, e.g. 'passport'
  file_path      text not null unique,      -- path inside the "documents" bucket
  file_name      text not null,
  mime_type      text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
  size_bytes     integer not null check (size_bytes > 0 and size_bytes <= 5242880),
  uploaded_at    timestamptz not null default now()
);
create index if not exists documents_app_idx on public.documents (application_id);
alter table public.documents enable row level security;

-- Can the signed-in student still add/remove files on this application?
-- Only while it's "submitted" or "missing_documents".
create or replace function public.can_edit_documents(app_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.applications
    where id = app_id
      and student_id = auth.uid()
      and status in ('submitted', 'missing_documents')
  );
$$;

drop policy if exists "documents: read own or staff" on public.documents;
create policy "documents: read own or staff" on public.documents
  for select to authenticated
  using (owner_id = auth.uid() or public.is_staff());

drop policy if exists "documents: student adds own" on public.documents;
create policy "documents: student adds own" on public.documents
  for insert to authenticated
  with check (
    owner_id = auth.uid()
    and public.can_edit_documents(application_id)
    and file_path like auth.uid()::text || '/' || application_id::text || '/%'
  );

drop policy if exists "documents: student removes own" on public.documents;
create policy "documents: student removes own" on public.documents
  for delete to authenticated
  using (owner_id = auth.uid() and public.can_edit_documents(application_id));


-- When a student adds a file, mark the application so staff can see
-- "new documents" (e.g. after asking for a missing document).
create or replace function public.documents_mark_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.applications set docs_updated_at = now() where id = new.application_id;
  return new;
end;
$$;

drop trigger if exists documents_mark_updated on public.documents;
create trigger documents_mark_updated
  after insert on public.documents
  for each row execute function public.documents_mark_updated();

-- -----------------------------------------------------------------------------
-- 6. Staff notes (internal; students never see these)
-- -----------------------------------------------------------------------------
create table if not exists public.staff_notes (
  id             bigint generated always as identity primary key,
  application_id uuid not null references public.applications (id) on delete cascade,
  author_id      uuid not null default auth.uid() references public.profiles (id) on delete set null,
  body           text not null check (length(body) between 1 and 2000),
  created_at     timestamptz not null default now()
);
alter table public.staff_notes enable row level security;

drop policy if exists "notes: staff only" on public.staff_notes;
create policy "notes: staff only" on public.staff_notes
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff() and author_id = auth.uid());


-- -----------------------------------------------------------------------------
-- 7. Announcements and events (anyone can read; staff manage)
-- -----------------------------------------------------------------------------
create table if not exists public.announcements (
  id         bigint generated always as identity primary key,
  message    text not null check (length(message) between 1 and 300),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.announcements enable row level security;

drop policy if exists "announcements: public read active" on public.announcements;
create policy "announcements: public read active" on public.announcements
  for select to anon, authenticated
  using (active or public.is_staff());

drop policy if exists "announcements: staff manage" on public.announcements;
create policy "announcements: staff manage" on public.announcements
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create table if not exists public.events (
  id            bigint generated always as identity primary key,
  title         text not null check (length(title) between 1 and 120),
  event_date    date,                      -- empty = "To be announced"
  time_location text not null default '',
  description   text not null default '',
  created_at    timestamptz not null default now()
);
alter table public.events enable row level security;

drop policy if exists "events: public read" on public.events;
create policy "events: public read" on public.events
  for select to anon, authenticated
  using (true);

drop policy if exists "events: staff manage" on public.events;
create policy "events: staff manage" on public.events
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());


-- -----------------------------------------------------------------------------
-- 8. Checklist progress (each student's own ticks)
-- -----------------------------------------------------------------------------
create table if not exists public.checklist_progress (
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  item_id    text not null check (length(item_id) <= 40),
  checked    boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id)
);
alter table public.checklist_progress enable row level security;

drop policy if exists "checklist: own only" on public.checklist_progress;
create policy "checklist: own only" on public.checklist_progress
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- -----------------------------------------------------------------------------
-- 9. Table access for the website (the rules above still apply on top)
-- -----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select, insert, update on public.applications to authenticated;
grant select on public.status_history to authenticated;
grant select, insert, delete on public.documents to authenticated;
grant select, insert, update, delete on public.staff_notes to authenticated;
grant select on public.announcements, public.events to anon;
grant select, insert, update, delete on public.announcements, public.events to authenticated;
grant select, insert, update, delete on public.checklist_progress to authenticated;
grant usage, select on all sequences in schema public to authenticated;

grant execute on function public.is_staff() to authenticated;
grant execute on function public.can_edit_documents(uuid) to authenticated;
grant execute on function public.submit_application(uuid) to authenticated;


-- -----------------------------------------------------------------------------
-- 10. Live updates: the student's status bar changes without refreshing
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'applications'
  ) then
    alter publication supabase_realtime add table public.applications;
  end if;
end $$;


-- -----------------------------------------------------------------------------
-- 11. File storage: private "documents" bucket
--     Files are stored as  <user id>/<application id>/<file name>
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 5242880,
        array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "storage: student uploads own" on storage.objects;
create policy "storage: student uploads own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.can_edit_documents(((storage.foldername(name))[2])::uuid)
  );

drop policy if exists "storage: read own or staff" on storage.objects;
create policy "storage: read own or staff" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff())
  );

drop policy if exists "storage: student deletes own" on storage.objects;
create policy "storage: student deletes own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.can_edit_documents(((storage.foldername(name))[2])::uuid)
  );


-- -----------------------------------------------------------------------------
-- 12. Starting content: the current events (edit them later in the dashboard)
-- -----------------------------------------------------------------------------
insert into public.events (title, event_date, time_location, description)
select * from (values
  ('Graduation Dinner', null::date, 'Date not yet announced',
   'A celebration dinner for graduating international students.')
) v
where not exists (select 1 from public.events);


-- -----------------------------------------------------------------------------
-- Sync roles: if you change staff_emails later, run this line again.
-- -----------------------------------------------------------------------------
update public.profiles p
set role = case when exists (select 1 from public.staff_emails s where s.email = p.email)
                then 'staff' else 'student' end;
