begin;
alter table public.cap_automation add column monthly_limit_usd numeric not null default 6 check(monthly_limit_usd between 0 and 6);
alter table public.cap_analysis_runs add column budget_charge_usd numeric not null default 0 check(budget_charge_usd>=0);
update public.cap_automation set model='gpt-5.4-mini-2026-03-17';
alter table public.cap_automation alter column model set default 'gpt-5.4-mini-2026-03-17';
create function public.cap_begin_analysis(p_user uuid,p_day date,p_slot text) returns uuid language plpgsql security definer set search_path='' as $$
declare cfg public.cap_automation; spent numeric; run_id uuid;
begin
 select * into cfg from public.cap_automation where user_id=p_user for update;
 if not found or not cfg.enabled then return null; end if;
 if p_day<>(now() at time zone 'Europe/Paris')::date then raise exception 'Wrong day'; end if;
 if exists(select 1 from public.cap_analysis_runs where user_id=p_user and day=p_day and slot=p_slot) then return null; end if;
 select coalesce(sum(budget_charge_usd),0) into spent from public.cap_analysis_runs where user_id=p_user and date_trunc('month',day)=date_trunc('month',p_day);
 if spent+1.50>cfg.monthly_limit_usd then return null; end if;
 insert into public.cap_analysis_runs(user_id,day,slot,status,budget_charge_usd) values(p_user,p_day,p_slot,'running',1.50) returning id into run_id;
 return run_id;
end;
$$;
revoke all on function public.cap_begin_analysis(uuid,date,text) from public,anon,authenticated;
grant execute on function public.cap_begin_analysis(uuid,date,text) to service_role;
commit;
