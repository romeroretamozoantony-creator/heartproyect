begin;

alter table public.profiles enable row level security;
alter table public.activities enable row level security;
alter table public.activity_schedules enable row level security;
alter table public.uploaded_files enable row level security;
alter table public.study_plans enable row level security;
alter table public.plan_blocks enable row level security;
alter table public.pomodoro_sessions enable row level security;
alter table public.activity_progress enable row level security;
alter table public.evaluations enable row level security;
alter table public.evaluation_questions enable row level security;
alter table public.evaluation_answer_keys enable row level security;
alter table public.evaluation_responses enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.activities from anon, authenticated;
revoke all on table public.activity_schedules from anon, authenticated;
revoke all on table public.uploaded_files from anon, authenticated;
revoke all on table public.study_plans from anon, authenticated;
revoke all on table public.plan_blocks from anon, authenticated;
revoke all on table public.pomodoro_sessions from anon, authenticated;
revoke all on table public.activity_progress from anon, authenticated;
revoke all on table public.evaluations from anon, authenticated;
revoke all on table public.evaluation_questions from anon, authenticated;
revoke all on table public.evaluation_answer_keys from anon, authenticated;
revoke all on table public.evaluation_responses from anon, authenticated;

grant usage on schema public to authenticated;
grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.activities to authenticated;
grant select, insert, update, delete on table public.activity_schedules to authenticated;
grant select, insert, update, delete on table public.uploaded_files to authenticated;
grant select, insert, update, delete on table public.study_plans to authenticated;
grant select, insert, update, delete on table public.plan_blocks to authenticated;
grant select, insert, update, delete on table public.pomodoro_sessions to authenticated;
grant select, insert, update, delete on table public.activity_progress to authenticated;
grant select, insert on table public.evaluations to authenticated;
grant select on table public.evaluation_questions to authenticated;
grant select, insert, update, delete on table public.evaluation_responses to authenticated;

create policy "Users manage their own profile"
on public.profiles
for all
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = id
)
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = id
);

create policy "Users manage their own activities"
on public.activities
for all
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
)
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
);

create policy "Users manage their own activity schedules"
on public.activity_schedules
for all
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
)
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
);

create policy "Users manage their own file metadata"
on public.uploaded_files
for all
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
)
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
);

create policy "Users manage their own study plans"
on public.study_plans
for all
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
)
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
);

create policy "Users manage their own plan blocks"
on public.plan_blocks
for all
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
)
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
);

create policy "Users manage their own pomodoro sessions"
on public.pomodoro_sessions
for all
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
)
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
);

create policy "Users manage their own activity progress"
on public.activity_progress
for all
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
)
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
);

create policy "Users view their own evaluations"
on public.evaluations
for select
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
);

create policy "Users request evaluations for their own files"
on public.evaluations
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and status = 'pending'
  and score is null
  and feedback is null
  and completed_at is null
);

create policy "Users view their own evaluation questions"
on public.evaluation_questions
for select
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
);

create policy "Users manage their own evaluation responses"
on public.evaluation_responses
for all
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
)
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit
)
values (
  'activity-files',
  'activity-files',
  false,
  10485760
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

create policy "Users read their own activity files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'activity-files'
  and (select auth.uid()) is not null
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Users upload their own activity files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'activity-files'
  and (select auth.uid()) is not null
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Users update their own activity files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'activity-files'
  and (select auth.uid()) is not null
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'activity-files'
  and (select auth.uid()) is not null
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Users delete their own activity files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'activity-files'
  and (select auth.uid()) is not null
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

do $$
declare
  unprotected_tables text;
begin
  select string_agg(expected.table_name, ', ' order by expected.table_name)
  into unprotected_tables
  from unnest(array[
    'profiles',
    'activities',
    'activity_schedules',
    'uploaded_files',
    'study_plans',
    'plan_blocks',
    'pomodoro_sessions',
    'activity_progress',
    'evaluations',
    'evaluation_questions',
    'evaluation_answer_keys',
    'evaluation_responses'
  ]) as expected(table_name)
  where not exists (
    select 1
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = expected.table_name
      and relation.relrowsecurity is true
  );

  if unprotected_tables is not null then
    raise exception 'RLS is missing for: %', unprotected_tables;
  end if;
end;
$$;

commit;
