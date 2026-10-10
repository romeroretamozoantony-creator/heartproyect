begin;

create extension if not exists pgcrypto with schema extensions;

create type public.activity_category as enum (
  'academic',
  'work',
  'personal'
);

create type public.activity_priority as enum (
  'low',
  'medium',
  'high'
);

create type public.plan_status as enum (
  'draft',
  'confirmed',
  'restructured',
  'completed',
  'cancelled'
);

create type public.plan_block_type as enum (
  'study',
  'break',
  'review',
  'test',
  'analysis'
);

create type public.execution_status as enum (
  'pending',
  'running',
  'paused',
  'completed',
  'cancelled'
);

create type public.pomodoro_session_type as enum (
  'focus',
  'rest'
);

create type public.evaluation_status as enum (
  'pending',
  'generating',
  'ready',
  'in_progress',
  'completed',
  'failed'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  first_name text not null,
  last_name text not null,
  student_code text not null,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_length check (char_length(trim(username)) between 3 and 40),
  constraint profiles_first_name_length check (char_length(trim(first_name)) between 1 and 80),
  constraint profiles_last_name_length check (char_length(trim(last_name)) between 1 and 100),
  constraint profiles_student_code_length check (char_length(trim(student_code)) between 3 and 30),
  constraint profiles_email_format check (position('@' in email) > 1)
);

create unique index profiles_username_unique_idx on public.profiles (lower(username));
create unique index profiles_student_code_unique_idx on public.profiles (lower(student_code));
create unique index profiles_email_unique_idx on public.profiles (lower(email));

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  category public.activity_category not null,
  activity_date date not null,
  start_time time not null,
  end_time time not null,
  priority public.activity_priority not null default 'medium',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activities_title_length check (char_length(trim(title)) between 1 and 120),
  constraint activities_valid_time_range check (end_time > start_time),
  constraint activities_id_user_key unique (id, user_id)
);

create index activities_user_date_idx on public.activities (user_id, activity_date);
create index activities_user_priority_idx on public.activities (user_id, priority);

create table public.activity_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  activity_id uuid not null,
  day_of_week smallint not null,
  allocated_minutes integer not null,
  alert_before_start_minutes integer,
  alert_on_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activity_schedules_activity_owner_fk
    foreign key (activity_id, user_id)
    references public.activities (id, user_id)
    on delete cascade,
  constraint activity_schedules_day_range check (day_of_week between 0 and 6),
  constraint activity_schedules_duration_range check (allocated_minutes between 1 and 1440),
  constraint activity_schedules_alert_range check (
    alert_before_start_minutes is null
    or alert_before_start_minutes between 0 and 1440
  ),
  constraint activity_schedules_activity_day_key unique (activity_id, day_of_week),
  constraint activity_schedules_id_user_key unique (id, user_id)
);

create index activity_schedules_user_day_idx
  on public.activity_schedules (user_id, day_of_week);

create table public.uploaded_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  activity_id uuid not null,
  storage_bucket text not null default 'activity-files',
  object_path text not null,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  created_at timestamptz not null default now(),
  constraint uploaded_files_activity_owner_fk
    foreign key (activity_id, user_id)
    references public.activities (id, user_id)
    on delete cascade,
  constraint uploaded_files_bucket_check check (storage_bucket = 'activity-files'),
  constraint uploaded_files_path_length check (char_length(trim(object_path)) between 3 and 1024),
  constraint uploaded_files_name_length check (char_length(trim(original_name)) between 1 and 255),
  constraint uploaded_files_mime_length check (char_length(trim(mime_type)) between 3 and 255),
  constraint uploaded_files_size_limit check (size_bytes between 1 and 10485760),
  constraint uploaded_files_object_path_key unique (object_path),
  constraint uploaded_files_id_user_key unique (id, user_id)
);

create index uploaded_files_user_activity_idx
  on public.uploaded_files (user_id, activity_id);

create table public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null default 'Plan de estudio',
  status public.plan_status not null default 'draft',
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_plans_name_length check (char_length(trim(name)) between 1 and 120),
  constraint study_plans_confirmation_check check (
    (status = 'confirmed' and confirmed_at is not null)
    or status <> 'confirmed'
  ),
  constraint study_plans_id_user_key unique (id, user_id)
);

create index study_plans_user_status_idx on public.study_plans (user_id, status);

create table public.plan_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plan_id uuid not null,
  activity_id uuid,
  block_type public.plan_block_type not null,
  position integer not null,
  title text not null,
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  planned_minutes integer not null,
  status public.execution_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plan_blocks_plan_owner_fk
    foreign key (plan_id, user_id)
    references public.study_plans (id, user_id)
    on delete cascade,
  constraint plan_blocks_activity_owner_fk
    foreign key (activity_id, user_id)
    references public.activities (id, user_id)
    on delete cascade,
  constraint plan_blocks_position_check check (position >= 0),
  constraint plan_blocks_title_length check (char_length(trim(title)) between 1 and 160),
  constraint plan_blocks_time_range check (scheduled_end > scheduled_start),
  constraint plan_blocks_duration_range check (planned_minutes between 1 and 1440),
  constraint plan_blocks_plan_position_key unique (plan_id, position),
  constraint plan_blocks_id_user_key unique (id, user_id)
);

create index plan_blocks_user_start_idx on public.plan_blocks (user_id, scheduled_start);
create index plan_blocks_plan_idx on public.plan_blocks (plan_id, position);

create table public.pomodoro_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plan_block_id uuid not null,
  activity_id uuid,
  session_type public.pomodoro_session_type not null,
  status public.execution_status not null default 'pending',
  planned_seconds integer not null,
  elapsed_seconds integer not null default 0,
  started_at timestamptz,
  last_resumed_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pomodoro_sessions_block_owner_fk
    foreign key (plan_block_id, user_id)
    references public.plan_blocks (id, user_id)
    on delete cascade,
  constraint pomodoro_sessions_activity_owner_fk
    foreign key (activity_id, user_id)
    references public.activities (id, user_id)
    on delete cascade,
  constraint pomodoro_sessions_planned_range check (planned_seconds between 60 and 86400),
  constraint pomodoro_sessions_elapsed_range check (elapsed_seconds >= 0),
  constraint pomodoro_sessions_end_check check (ended_at is null or started_at is not null),
  constraint pomodoro_sessions_id_user_key unique (id, user_id)
);

create index pomodoro_sessions_user_status_idx
  on public.pomodoro_sessions (user_id, status);

create table public.activity_progress (
  activity_id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  completion_percentage smallint not null default 0,
  is_completed boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint activity_progress_activity_owner_fk
    foreign key (activity_id, user_id)
    references public.activities (id, user_id)
    on delete cascade,
  constraint activity_progress_percentage_range check (completion_percentage between 0 and 100),
  constraint activity_progress_completion_check check (
    (is_completed = false and completed_at is null)
    or (is_completed = true and completion_percentage = 100 and completed_at is not null)
  ),
  constraint activity_progress_activity_user_key unique (activity_id, user_id)
);

create index activity_progress_user_idx on public.activity_progress (user_id);

create table public.evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  activity_id uuid not null,
  file_id uuid not null,
  status public.evaluation_status not null default 'pending',
  score numeric(4, 2),
  feedback text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint evaluations_activity_owner_fk
    foreign key (activity_id, user_id)
    references public.activities (id, user_id)
    on delete cascade,
  constraint evaluations_file_owner_fk
    foreign key (file_id, user_id)
    references public.uploaded_files (id, user_id)
    on delete cascade,
  constraint evaluations_score_range check (score is null or score between 0 and 20),
  constraint evaluations_completion_check check (
    (status = 'completed' and score is not null and completed_at is not null)
    or (status <> 'completed' and score is null and completed_at is null)
  ),
  constraint evaluations_file_key unique (file_id),
  constraint evaluations_id_user_key unique (id, user_id)
);

create index evaluations_user_status_idx on public.evaluations (user_id, status);

create table public.evaluation_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  evaluation_id uuid not null,
  position integer not null,
  prompt text not null,
  question_type text not null,
  options jsonb not null default '[]'::jsonb,
  points numeric(5, 2) not null default 1,
  created_at timestamptz not null default now(),
  constraint evaluation_questions_evaluation_owner_fk
    foreign key (evaluation_id, user_id)
    references public.evaluations (id, user_id)
    on delete cascade,
  constraint evaluation_questions_position_check check (position >= 0),
  constraint evaluation_questions_prompt_length check (char_length(trim(prompt)) between 1 and 2000),
  constraint evaluation_questions_type_check check (
    question_type in ('multiple_choice', 'true_false', 'short_answer')
  ),
  constraint evaluation_questions_options_check check (jsonb_typeof(options) = 'array'),
  constraint evaluation_questions_points_check check (points > 0),
  constraint evaluation_questions_position_key unique (evaluation_id, position),
  constraint evaluation_questions_id_user_key unique (id, user_id)
);

create table public.evaluation_answer_keys (
  question_id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  correct_answer text not null,
  explanation text,
  created_at timestamptz not null default now(),
  constraint evaluation_answer_keys_question_owner_fk
    foreign key (question_id, user_id)
    references public.evaluation_questions (id, user_id)
    on delete cascade,
  constraint evaluation_answer_keys_answer_length check (
    char_length(trim(correct_answer)) between 1 and 4000
  )
);

create table public.evaluation_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  question_id uuid not null,
  answer text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint evaluation_responses_question_owner_fk
    foreign key (question_id, user_id)
    references public.evaluation_questions (id, user_id)
    on delete cascade,
  constraint evaluation_responses_answer_length check (char_length(trim(answer)) between 1 and 4000),
  constraint evaluation_responses_question_key unique (question_id)
);

create index evaluation_questions_evaluation_idx
  on public.evaluation_questions (evaluation_id, position);
create index evaluation_responses_user_idx on public.evaluation_responses (user_id);

comment on column public.activity_schedules.day_of_week is
  'Día ISO simplificado: 0 = lunes y 6 = domingo.';

comment on column public.uploaded_files.object_path is
  'Ruta privada con formato user_id/activity_id/nombre-seguro.';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger activities_set_updated_at
before update on public.activities
for each row execute function public.set_updated_at();

create trigger activity_schedules_set_updated_at
before update on public.activity_schedules
for each row execute function public.set_updated_at();

create trigger study_plans_set_updated_at
before update on public.study_plans
for each row execute function public.set_updated_at();

create trigger plan_blocks_set_updated_at
before update on public.plan_blocks
for each row execute function public.set_updated_at();

create trigger pomodoro_sessions_set_updated_at
before update on public.pomodoro_sessions
for each row execute function public.set_updated_at();

create trigger activity_progress_set_updated_at
before update on public.activity_progress
for each row execute function public.set_updated_at();

create trigger evaluation_responses_set_updated_at
before update on public.evaluation_responses
for each row execute function public.set_updated_at();

commit;
