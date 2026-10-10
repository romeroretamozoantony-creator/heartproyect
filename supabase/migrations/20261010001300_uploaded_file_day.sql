begin;

-- Cada archivo pertenece al día del cronograma en el que se subió. Así, si una
-- misma rutina está en varios días, el documento solo aparece en ese día.
alter table public.uploaded_files
  add column day_of_week smallint;

alter table public.uploaded_files
  add constraint uploaded_files_day_range check (day_of_week is null or day_of_week between 0 and 6);

commit;
