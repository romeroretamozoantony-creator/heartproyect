begin;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    username,
    first_name,
    last_name,
    student_code,
    email
  )
  values (
    new.id,
    btrim(new.raw_user_meta_data ->> 'username'),
    btrim(new.raw_user_meta_data ->> 'first_name'),
    btrim(new.raw_user_meta_data ->> 'last_name'),
    btrim(new.raw_user_meta_data ->> 'student_code'),
    lower(btrim(new.email))
  );

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

commit;
