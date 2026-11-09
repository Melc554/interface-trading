begin;
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create function public.cap_schedule_tick() returns void language plpgsql security definer set search_path='' as $$
declare cfg record; local_time timestamp := now() at time zone 'Europe/Paris'; secret text;
begin
 if extract(isodow from local_time)>5 or extract(hour from local_time) not in (8,15) then return; end if;
 for cfg in select user_id from public.cap_automation where enabled loop
  select decrypted_secret into secret from vault.decrypted_secrets where name='cap_scheduler_'||cfg.user_id::text;
  if secret is not null then
   perform net.http_post(url:='https://giekuuqqepfqxazmhtlt.supabase.co/functions/v1/cap-daily-analysis',headers:=jsonb_build_object('Content-Type','application/json','x-cap-scheduler',secret),body:='{}'::jsonb,timeout_milliseconds:=120000);
  end if;
 end loop;
end;
$$;
revoke all on function public.cap_schedule_tick() from public,anon,authenticated;
select cron.schedule('cap-daily-analysis','0 * * * *','select public.cap_schedule_tick()');
commit;
