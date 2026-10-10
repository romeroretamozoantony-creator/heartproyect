begin;

select plan(23);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'profiles has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.activities'::regclass),
  'activities has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.activity_schedules'::regclass),
  'activity_schedules has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.uploaded_files'::regclass),
  'uploaded_files has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.study_plans'::regclass),
  'study_plans has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.plan_blocks'::regclass),
  'plan_blocks has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.pomodoro_sessions'::regclass),
  'pomodoro_sessions has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.activity_progress'::regclass),
  'activity_progress has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.evaluations'::regclass),
  'evaluations has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.evaluation_questions'::regclass),
  'evaluation_questions has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.evaluation_answer_keys'::regclass),
  'evaluation_answer_keys has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.evaluation_responses'::regclass),
  'evaluation_responses has RLS enabled'
);

select ok(
  exists(select 1 from storage.buckets where id = 'activity-files'),
  'activity-files bucket exists'
);
select is(
  (select public from storage.buckets where id = 'activity-files'),
  false,
  'activity-files bucket is private'
);
select is(
  (select file_size_limit from storage.buckets where id = 'activity-files'),
  10485760::bigint,
  'activity-files bucket limits files to 10 MB'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'public.evaluation_answer_keys',
    'select'
  ),
  'authenticated users cannot read evaluation answer keys'
);

select ok(
  exists(
    select 1
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname = 'handle_new_user'
  ),
  'new users create profiles through a database function'
);

select ok(
  exists(
    select 1
    from pg_trigger
    where tgname = 'on_auth_user_created'
      and not tgisinternal
  ),
  'auth user creation trigger exists'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.handle_new_user()',
    'execute'
  ),
  'authenticated users cannot call the profile trigger function directly'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.replace_activity_schedules(jsonb)',
    'execute'
  ),
  'authenticated users can replace their weekly schedule'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.replace_activity_schedules(jsonb)',
    'execute'
  ),
  'anonymous users cannot replace weekly schedules'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.create_study_plan(text,jsonb)',
    'execute'
  ),
  'authenticated users can create their own study plans'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.create_study_plan(text,jsonb)',
    'execute'
  ),
  'anonymous users cannot create study plans'
);

select * from finish();

rollback;
