begin;

-- Cada día del cronograma guarda la hora de inicio de la rutina elegida.
-- Las actividades de registro siguen usando su propio horario (start_time nullo).
alter table public.activity_schedules
  add column start_time time;

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

  -- El cronograma solo admite opciones de rutina del propio usuario.
  if exists (
    select 1
    from jsonb_to_recordset(schedule_rows) as schedule(activity_id uuid)
    where not exists (
      select 1
      from public.activities
      where activities.id = schedule.activity_id
        and activities.user_id = current_user_id
        and activities.kind = 'rutina'
    )
  ) then
    raise exception 'The schedule contains an unavailable routine option.'
      using errcode = '23503';
  end if;

  -- Toda rutina necesita la hora en la que se realiza ese día.
  if exists (
    select 1
    from jsonb_to_recordset(schedule_rows) as schedule(start_time time)
    where schedule.start_time is null
  ) then
    raise exception 'Each routine needs a start time.'
      using errcode = '23514';
  end if;

  delete from public.activity_schedules
  where user_id = current_user_id;

  insert into public.activity_schedules (
    user_id,
    activity_id,
    day_of_week,
    allocated_minutes,
    start_time,
    alert_before_start_minutes,
    alert_on_end
  )
  select
    current_user_id,
    schedule.activity_id,
    schedule.day_of_week,
    schedule.allocated_minutes,
    schedule.start_time,
    schedule.alert_before_start_minutes,
    schedule.alert_on_end
  from jsonb_to_recordset(schedule_rows) as schedule(
    activity_id uuid,
    day_of_week smallint,
    allocated_minutes integer,
    start_time time,
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

commit;
