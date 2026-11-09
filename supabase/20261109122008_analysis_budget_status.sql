begin;
drop function public.cap_automation_status();
create function public.cap_automation_status()
returns table(enabled boolean, monthly_limit_usd numeric, accounted_usd numeric, remaining_usd numeric, budget_available boolean, resets_on date)
language sql stable security definer set search_path='' as $$
 with current_month as (
  select date_trunc('month',now() at time zone 'Europe/Paris')::date as starts
 ), usage as (
  select coalesce(sum(r.budget_charge_usd),0) as total
  from public.cap_analysis_runs r,current_month m
  where r.user_id=(select auth.uid()) and r.day>=m.starts and r.day<(m.starts+interval '1 month')::date
 )
 select c.enabled,c.monthly_limit_usd,u.total,greatest(0,c.monthly_limit_usd-u.total),
        u.total+1.50<=c.monthly_limit_usd,(m.starts+interval '1 month')::date
 from public.cap_automation c cross join usage u cross join current_month m
 where c.user_id=(select auth.uid())
$$;
revoke all on function public.cap_automation_status() from public,anon;
grant execute on function public.cap_automation_status() to authenticated;
commit;
