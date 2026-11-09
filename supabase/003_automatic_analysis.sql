begin;
create table public.cap_automation (
 user_id uuid primary key references auth.users(id) on delete cascade,
 enabled boolean not null default false,
 scheduler_hash text not null,
 model text not null default 'gpt-6-astra'
);
alter table public.cap_automation enable row level security;
revoke all on public.cap_automation from anon,authenticated;
create table public.cap_analysis_runs (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 day date not null,
 slot text not null check(slot in ('08:00','15:00')),
 status text not null check(status in ('running','completed','failed')),
 message text,
 created_at timestamptz not null default now(),
 completed_at timestamptz,
 unique(user_id,day,slot)
);
alter table public.cap_analysis_runs enable row level security;
revoke all on public.cap_analysis_runs from anon,authenticated;
grant select on public.cap_analysis_runs to authenticated;
create policy own_analysis_runs on public.cap_analysis_runs for select to authenticated using ((select auth.uid())=user_id);
create function public.cap_finish_analysis(p_run uuid,p_decisions jsonb) returns void language plpgsql security definer set search_path='' as $$
declare r public.cap_analysis_runs; item jsonb;
begin
 select * into r from public.cap_analysis_runs where id=p_run for update;
 if not found or r.status<>'running' then raise exception 'Run unavailable'; end if;
 if jsonb_typeof(p_decisions)<>'array' or jsonb_array_length(p_decisions)<1 or jsonb_array_length(p_decisions)>6 then raise exception 'Invalid decisions'; end if;
 for item in select value from jsonb_array_elements(p_decisions) loop
  if item->>'status' is distinct from 'À étudier' or item->>'date' is distinct from r.day::text then raise exception 'Invalid decision'; end if;
  insert into public.cap_records(user_id,kind,data) values(r.user_id,'decision',item||jsonb_build_object('analysisRun',r.id,'origin','automatic','generatedAt',now()));
 end loop;
 update public.cap_analysis_runs set status='completed',completed_at=now(),message='Analyse enregistrée' where id=r.id;
end;
$$;
revoke all on function public.cap_finish_analysis(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.cap_finish_analysis(uuid,jsonb) to service_role;
grant all on public.cap_automation,public.cap_analysis_runs to service_role;
create function public.cap_automation_status() returns table(enabled boolean) language sql security definer set search_path='' as $$ select enabled from public.cap_automation where user_id=(select auth.uid()) $$;
revoke all on function public.cap_automation_status() from public,anon;
grant execute on function public.cap_automation_status() to authenticated;
commit;
