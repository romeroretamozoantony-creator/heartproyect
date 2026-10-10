-- Fase 8.1: guardar tiempo real sin atribuir la duración planificada a un cierre inmediato.
begin;

create or replace function public.transition_pomodoro_session(
  target_block_id uuid,
  session_transition text
)
returns public.pomodoro_sessions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_block public.plan_blocks;
  current_plan public.study_plans;
  current_session public.pomodoro_sessions;
  transition_time timestamptz := clock_timestamp();
  next_elapsed integer;
begin
  if current_user_id is null then
    raise exception 'Authentication is required';
  end if;

  if session_transition not in ('start', 'pause', 'resume', 'complete', 'cancel') then
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

commit;
