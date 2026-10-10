-- Fase 8.2: operaciones controladas y aislamiento de documentos.
-- Ejecutar con el rol propietario de las tablas (postgres en Supabase).
-- Las restricciones validan los datos existentes; no se elimina ningún registro.
begin;

revoke create on schema public from public, anon, authenticated;

alter table public.uploaded_files add constraint uploaded_files_canonical_path check (
  split_part(object_path, '/', 1) = user_id::text
  and split_part(object_path, '/', 2) = activity_id::text
  and cardinality(string_to_array(object_path, '/')) = 3
  and split_part(object_path, '/', 3) ~ '^[A-Za-z0-9][A-Za-z0-9_.-]{0,254}$'
);

create or replace function public.owns_activity_file_path(object_name text)
returns boolean language sql stable security invoker set search_path = ''
as $$
  select auth.uid() is not null
    and split_part(object_name, '/', 1) = auth.uid()::text
    and cardinality(string_to_array(object_name, '/')) = 3
    and split_part(object_name, '/', 3) ~ '^[A-Za-z0-9][A-Za-z0-9_.-]{0,254}$'
    and exists (select 1 from public.activities
      where id::text = split_part(object_name, '/', 2) and user_id = auth.uid());
$$;
revoke all on function public.owns_activity_file_path(text) from public, anon;
grant execute on function public.owns_activity_file_path(text) to authenticated;

-- Lectura y borrado propios permiten limpiar objetos cuya actividad fue eliminada.
drop policy "Users read their own activity files" on storage.objects;
drop policy "Users upload their own activity files" on storage.objects;
drop policy "Users update their own activity files" on storage.objects;
drop policy "Users delete their own activity files" on storage.objects;

create policy "Users read their own activity files" on storage.objects for select to authenticated
using (bucket_id = 'activity-files' and owner_id = auth.uid()::text
  and split_part(name, '/', 1) = auth.uid()::text);
create policy "Users delete their own activity files" on storage.objects for delete to authenticated
using (bucket_id = 'activity-files' and owner_id = auth.uid()::text
  and split_part(name, '/', 1) = auth.uid()::text);
create policy "Users upload their own activity files" on storage.objects for insert to authenticated
with check (bucket_id = 'activity-files' and owner_id = auth.uid()::text
  and public.owns_activity_file_path(name));
create policy "Users update their own activity files" on storage.objects for update to authenticated
using (bucket_id = 'activity-files' and owner_id = auth.uid()::text
  and split_part(name, '/', 1) = auth.uid()::text)
with check (bucket_id = 'activity-files' and owner_id = auth.uid()::text
  and public.owns_activity_file_path(name));

drop policy "Users manage their own file metadata" on public.uploaded_files;
create policy "Users read their own file metadata" on public.uploaded_files for select to authenticated
using (user_id = auth.uid());
create policy "Users delete their own file metadata" on public.uploaded_files for delete to authenticated
using (user_id = auth.uid());
create policy "Users insert their own file metadata" on public.uploaded_files for insert to authenticated
with check (user_id = auth.uid() and exists (select 1 from storage.objects
  where bucket_id = storage_bucket and name = object_path and owner_id = auth.uid()::text));
create policy "Users update their own file metadata" on public.uploaded_files for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid() and exists (select 1 from storage.objects
  where bucket_id = storage_bucket and name = object_path and owner_id = auth.uid()::text));

create unique index pomodoro_one_active_session_per_user
on public.pomodoro_sessions(user_id) where status in ('running', 'paused');
create unique index schedule_one_activity_per_user_day
on public.activity_schedules(user_id, day_of_week);

-- El cliente solo consulta los resultados; las RPC validan y realizan escrituras.
revoke insert, update, delete on public.activity_schedules, public.study_plans,
  public.plan_blocks, public.pomodoro_sessions, public.activity_progress from authenticated;

create or replace function public.replace_activity_schedules(schedule_rows jsonb)
returns setof public.activity_schedules
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;

  -- Un único orden de bloqueo para todas las transiciones del usuario.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(current_user_id::text, 0));

  if schedule_rows is null or jsonb_typeof(schedule_rows) <> 'array' then
    raise exception 'schedule_rows must be a JSON array.' using errcode = '22023';
  end if;

  if jsonb_array_length(schedule_rows) > 7 then
    raise exception 'A weekly schedule cannot contain more than seven rows.'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(schedule_rows) as schedule(day_of_week smallint)
    group by schedule.day_of_week
    having count(*) > 1
  ) then
    raise exception 'Only one activity can be assigned to each day.'
      using errcode = '23505';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(schedule_rows) as schedule(activity_id uuid)
    where not exists (
      select 1
      from public.activities
      where activities.id = schedule.activity_id
        and activities.user_id = current_user_id
    )
  ) then
    raise exception 'The schedule contains an unavailable activity.'
      using errcode = '23503';
  end if;

  delete from public.activity_schedules
  where user_id = current_user_id;

  insert into public.activity_schedules (
    user_id,
    activity_id,
    day_of_week,
    allocated_minutes,
    alert_before_start_minutes,
    alert_on_end
  )
  select
    current_user_id,
    schedule.activity_id,
    schedule.day_of_week,
    schedule.allocated_minutes,
    schedule.alert_before_start_minutes,
    schedule.alert_on_end
  from jsonb_to_recordset(schedule_rows) as schedule(
    activity_id uuid,
    day_of_week smallint,
    allocated_minutes integer,
    alert_before_start_minutes integer,
    alert_on_end boolean
  );

  return query
  select activity_schedules.*
  from public.activity_schedules
  where activity_schedules.user_id = current_user_id
  order by activity_schedules.day_of_week;
end;
$$;

revoke all on function public.replace_activity_schedules(jsonb) from public;
revoke all on function public.replace_activity_schedules(jsonb) from anon;
grant execute on function public.replace_activity_schedules(jsonb) to authenticated;


create or replace function public.create_study_plan(
  plan_name text,
  plan_blocks jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  created_plan_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;

  -- Un único orden de bloqueo para todas las transiciones del usuario.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(current_user_id::text, 0));
  if exists (select 1 from public.pomodoro_sessions where user_id = current_user_id and status in ('running', 'paused')) then
    raise exception 'Complete or cancel the active session first.' using errcode = '23514';
  end if;

  if char_length(trim(plan_name)) not between 1 and 120 then
    raise exception 'The plan name is invalid.' using errcode = '23514';
  end if;

  if plan_blocks is null or jsonb_typeof(plan_blocks) <> 'array' then
    raise exception 'plan_blocks must be a JSON array.' using errcode = '22023';
  end if;

  if jsonb_array_length(plan_blocks) not between 1 and 1000 then
    raise exception 'A plan must contain between 1 and 1000 blocks.'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(plan_blocks) as block(position integer)
    group by block.position
    having count(*) > 1
  ) then
    raise exception 'Plan block positions must be unique.'
      using errcode = '23505';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(plan_blocks) as block(
      activity_id uuid,
      block_type public.plan_block_type
    )
    where (
      block.block_type = 'study'
      and block.activity_id is null
    )
    or (
      block.activity_id is not null
      and not exists (
        select 1
        from public.activities
        where activities.id = block.activity_id
          and activities.user_id = current_user_id
      )
    )
  ) then
    raise exception 'The plan contains an unavailable activity.'
      using errcode = '23503';
  end if;

  insert into public.study_plans (user_id, name, status)
  values (current_user_id, trim(plan_name), 'draft')
  returning id into created_plan_id;

  insert into public.plan_blocks (
    user_id,
    plan_id,
    activity_id,
    block_type,
    position,
    title,
    scheduled_start,
    scheduled_end,
    planned_minutes
  )
  select
    current_user_id,
    created_plan_id,
    block.activity_id,
    block.block_type,
    block.position,
    block.title,
    block.scheduled_start,
    block.scheduled_end,
    block.planned_minutes
  from jsonb_to_recordset(plan_blocks) as block(
    activity_id uuid,
    block_type public.plan_block_type,
    position integer,
    title text,
    scheduled_start timestamptz,
    scheduled_end timestamptz,
    planned_minutes integer
  );

  return created_plan_id;
end;
$$;

revoke all on function public.create_study_plan(text, jsonb) from public;
revoke all on function public.create_study_plan(text, jsonb) from anon;
grant execute on function public.create_study_plan(text, jsonb) to authenticated;


create or replace function public.transition_pomodoro_session(
  target_block_id uuid,
  session_transition text
)
returns public.pomodoro_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_block public.plan_blocks;
  current_plan public.study_plans;
  current_session public.pomodoro_sessions;
  transition_time timestamptz;
  next_elapsed integer;
begin
  if current_user_id is null then
    raise exception 'Authentication is required';
  end if;

  -- Un único orden de bloqueo para todas las transiciones del usuario.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(current_user_id::text, 0));

  transition_time := clock_timestamp();

  if session_transition is null or session_transition not in ('start', 'pause', 'resume', 'complete', 'cancel') then
    raise exception 'Unsupported Pomodoro transition';
  end if;

  select * into current_block
  from public.plan_blocks
  where id = target_block_id and user_id = current_user_id
  for update;

  if not found then
    raise exception 'Plan block not found';
  end if;

  select * into current_plan
  from public.study_plans
  where id = current_block.plan_id and user_id = current_user_id;

  if current_plan.status <> 'confirmed' then
    raise exception 'The study plan must be confirmed';
  end if;

  select * into current_session
  from public.pomodoro_sessions
  where plan_block_id = target_block_id
    and user_id = current_user_id
    and status in ('running', 'paused')
  order by created_at desc
  limit 1
  for update;

  if session_transition = 'start' then
    if current_block.status = 'completed' then
      raise exception 'The block is already completed';
    end if;
    if current_session.id is not null then
      return current_session;
    end if;

  if exists (select 1 from public.pomodoro_sessions where user_id = current_user_id and status in ('running', 'paused')) then
    raise exception 'Complete or cancel the active session first.' using errcode = '23514';
  end if;

    insert into public.pomodoro_sessions (
      user_id, plan_block_id, activity_id, session_type, status,
      planned_seconds, elapsed_seconds, started_at, last_resumed_at
    )
    values (
      current_user_id,
      current_block.id,
      current_block.activity_id,
      case
        when current_block.block_type = 'break' then 'rest'::public.pomodoro_session_type
        else 'focus'::public.pomodoro_session_type
      end,
      'running',
      current_block.planned_minutes * 60,
      0,
      transition_time,
      transition_time
    )
    returning * into current_session;

    update public.plan_blocks set status = 'running'
    where id = current_block.id and user_id = current_user_id;

    return current_session;
  end if;

  if current_session.id is null then
    raise exception 'There is no active Pomodoro session for this block';
  end if;

  next_elapsed := current_session.elapsed_seconds;
  if current_session.status = 'running' and current_session.last_resumed_at is not null then
    next_elapsed := least(
      current_session.planned_seconds,
      current_session.elapsed_seconds
        + greatest(
            0,
            floor(extract(epoch from (transition_time - current_session.last_resumed_at)))::integer
          )
    );
  end if;

  if session_transition = 'pause' then
    if current_session.status <> 'running' then
      raise exception 'Only a running session can be paused';
    end if;

    update public.pomodoro_sessions
    set status = 'paused', elapsed_seconds = next_elapsed
    where id = current_session.id and user_id = current_user_id
    returning * into current_session;
    update public.plan_blocks set status = 'paused'
    where id = current_block.id and user_id = current_user_id;
  elsif session_transition = 'resume' then
    if current_session.status <> 'paused' then
      raise exception 'Only a paused session can be resumed';
    end if;

    update public.pomodoro_sessions
    set status = 'running', last_resumed_at = transition_time
    where id = current_session.id and user_id = current_user_id
    returning * into current_session;
    update public.plan_blocks set status = 'running'
    where id = current_block.id and user_id = current_user_id;
  elsif session_transition = 'complete' then
    update public.pomodoro_sessions
    set
      status = 'completed',
      elapsed_seconds = next_elapsed,
      ended_at = transition_time
    where id = current_session.id and user_id = current_user_id
    returning * into current_session;
    update public.plan_blocks set status = 'completed'
    where id = current_block.id and user_id = current_user_id;
  elsif session_transition = 'cancel' then
    update public.pomodoro_sessions
    set status = 'cancelled', elapsed_seconds = next_elapsed, ended_at = transition_time
    where id = current_session.id and user_id = current_user_id
    returning * into current_session;
    update public.plan_blocks set status = 'cancelled'
    where id = current_block.id and user_id = current_user_id;
  end if;

  return current_session;
end;
$$;

revoke all on function public.transition_pomodoro_session(uuid, text) from public, anon;
grant execute on function public.transition_pomodoro_session(uuid, text) to authenticated;


create or replace function public.transition_study_plan(target_plan_id uuid, plan_transition text)
returns public.study_plans language plpgsql security definer set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_plan public.study_plans;
begin
  if current_user_id is null then raise exception 'Authentication is required.' using errcode = '28000'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(current_user_id::text, 0));
  if plan_transition is null or plan_transition not in ('confirm', 'restructure') then
    raise exception 'Unsupported plan transition.' using errcode = '22023';
  end if;
  select * into current_plan from public.study_plans
    where id = target_plan_id and user_id = current_user_id for update;
  if not found then raise exception 'Plan not found.' using errcode = 'P0002'; end if;
  if exists (select 1 from public.pomodoro_sessions where user_id = current_user_id and status in ('running', 'paused')) then
    raise exception 'Complete or cancel the active session first.' using errcode = '23514';
  end if;
  if plan_transition = 'confirm' then
    if current_plan.status <> 'draft' then raise exception 'Only a draft can be confirmed.' using errcode = '23514'; end if;
    update public.study_plans set status = 'confirmed', confirmed_at = clock_timestamp()
      where id = target_plan_id and user_id = current_user_id returning * into current_plan;
  else
    if current_plan.status not in ('draft', 'confirmed') then raise exception 'Plan cannot be restructured.' using errcode = '23514'; end if;
    update public.study_plans set status = 'restructured', confirmed_at = null
      where id = target_plan_id and user_id = current_user_id returning * into current_plan;
  end if;
  return current_plan;
end;
$$;
revoke all on function public.transition_study_plan(uuid, text) from public, anon;
grant execute on function public.transition_study_plan(uuid, text) to authenticated;

commit;
