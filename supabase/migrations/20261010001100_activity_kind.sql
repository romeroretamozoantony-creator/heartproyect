begin;

-- Separa los registros diarios (kind = 'registro') de las opciones de rutina
-- (kind = 'rutina') que se usan en el cronograma. Las opciones de rutina no
-- tienen fecha ni horario.
alter table public.activities
  add column kind text not null default 'registro',
  alter column activity_date drop not null,
  alter column start_time drop not null,
  alter column end_time drop not null;

alter table public.activities
  add constraint activities_kind_check check (kind in ('registro', 'rutina'));

alter table public.activities
  drop constraint activities_valid_time_range;

alter table public.activities
  add constraint activities_kind_shape_check check (
    (
      kind = 'registro'
      and activity_date is not null
      and start_time is not null
      and end_time is not null
      and end_time > start_time
    )
    or (
      kind = 'rutina'
      and activity_date is null
      and start_time is null
      and end_time is null
    )
  );

create or replace function public.seed_routine_activities(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.activities (user_id, title, category, priority, kind)
  select p_user_id, options.title, 'personal', 'medium', 'rutina'
  from (
    values
      ('Hacer ejercicio'),
      ('Bailar'),
      ('Ir al cine'),
      ('Salir de paseo'),
      ('Cocinar'),
      ('Leer un libro'),
      ('Jugar deporte')
  ) as options(title)
  where not exists (
    select 1
    from public.activities existing
    where existing.user_id = p_user_id
      and existing.kind = 'rutina'
      and existing.title = options.title
  );
end;
$$;

revoke all on function public.seed_routine_activities(uuid) from public, anon, authenticated;

create or replace function public.handle_new_profile_routines()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.seed_routine_activities(new.id);
  return new;
end;
$$;

revoke all on function public.handle_new_profile_routines() from public, anon, authenticated;

drop trigger if exists on_profile_created_routines on public.profiles;

create trigger on_profile_created_routines
  after insert on public.profiles
  for each row execute procedure public.handle_new_profile_routines();

-- Cuentas que ya existían reciben las mismas opciones de rutina.
select public.seed_routine_activities(id) from public.profiles;

commit;
