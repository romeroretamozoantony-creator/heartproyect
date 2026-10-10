begin;

create or replace function public.create_study_plan(
  plan_name text,
  plan_blocks jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  created_plan_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication is required.' using errcode = '28000';
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

commit;
