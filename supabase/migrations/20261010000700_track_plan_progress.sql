begin;

create or replace function public.refresh_progress_after_plan_block()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  total_activity_blocks integer;
  completed_activity_blocks integer;
  completion_percentage smallint;
begin
  if new.activity_id is not null and new.block_type <> 'break' then
    select
      count(*),
      count(*) filter (where status = 'completed')
    into total_activity_blocks, completed_activity_blocks
    from public.plan_blocks
    where plan_id = new.plan_id
      and user_id = new.user_id
      and activity_id = new.activity_id
      and block_type <> 'break';

    completion_percentage := case
      when total_activity_blocks = 0 then 0
      else floor(
        completed_activity_blocks::numeric * 100 / total_activity_blocks
      )::smallint
    end;

    insert into public.activity_progress (
      activity_id,
      user_id,
      completion_percentage,
      is_completed,
      completed_at
    )
    values (
      new.activity_id,
      new.user_id,
      completion_percentage,
      completion_percentage = 100,
      case when completion_percentage = 100 then now() else null end
    )
    on conflict (activity_id) do update
    set
      completion_percentage = excluded.completion_percentage,
      is_completed = excluded.is_completed,
      completed_at = excluded.completed_at;
  end if;

  if not exists (
    select 1
    from public.plan_blocks
    where plan_id = new.plan_id
      and user_id = new.user_id
      and status <> 'completed'
  ) then
    update public.study_plans
    set status = 'completed'
    where id = new.plan_id
      and user_id = new.user_id
      and status = 'confirmed';
  end if;

  return new;
end;
$$;

revoke all on function public.refresh_progress_after_plan_block() from public;

create trigger plan_blocks_refresh_progress
after update of status on public.plan_blocks
for each row
when (old.status is distinct from new.status)
execute function public.refresh_progress_after_plan_block();

commit;
