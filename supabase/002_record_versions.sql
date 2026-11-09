begin;
alter table public.cap_records add column revision integer not null default 1;
create function public.cap_record_revision() returns trigger language plpgsql set search_path='' as $$
begin
 if new.user_id <> old.user_id or new.kind <> old.kind then raise exception 'Record identity is immutable'; end if;
 new.revision := old.revision + 1;
 new.created_at := old.created_at;
 return new;
end;
$$;
create trigger cap_record_revision before update on public.cap_records for each row execute function public.cap_record_revision();
grant update(data) on public.cap_records to authenticated;
create policy own_update on public.cap_records for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
commit;
