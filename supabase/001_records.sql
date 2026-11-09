begin;
create table public.cap_records (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 kind text not null check (kind in ('decision','valuation','trade','note','event','settings','reference')),
 data jsonb not null check (jsonb_typeof(data) = 'object'),
 created_at timestamptz not null default now()
);
create index cap_records_owner_kind on public.cap_records(user_id,kind);
alter table public.cap_records enable row level security;
revoke all on public.cap_records from anon;
grant select, insert, delete on public.cap_records to authenticated;
create policy own_read on public.cap_records for select to authenticated using ((select auth.uid()) = user_id);
create policy own_insert on public.cap_records for insert to authenticated with check ((select auth.uid()) = user_id);
create policy own_delete on public.cap_records for delete to authenticated using ((select auth.uid()) = user_id);
commit;
