-- Migration : statuts ARRIVE et COURSE COMMENCEE (accepted -> arrived -> started -> completed).
-- Idempotente. A executer dans Supabase > SQL Editor.

do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.rides'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%requested%'
  loop
    execute format('alter table public.rides drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.rides add constraint rides_status_check
  check (status in ('requested', 'accepted', 'arrived', 'started', 'completed', 'declined', 'cancelled'));

drop policy if exists wallets_select on public.driver_wallets;
create policy wallets_select on public.driver_wallets
  for select to authenticated
  using (
    driver_id = auth.uid()
    or public.is_union()
    or exists (
      select 1 from public.rides r
      where r.driver_id = driver_wallets.driver_id
        and r.client_id = auth.uid()
        and r.status in ('accepted', 'arrived', 'started', 'completed')
    )
  );

-- Actions possibles sur une course :
--   accept / decline / arrive / start / complete / confirm_paid : par le chauffeur
--   cancel : par le client ou le chauffeur (avant le depart de la course)
--   claim_paid : par le client (paiement mobile money annoncé)
-- Cycle : requested -> accepted -> arrived -> started -> completed
create or replace function public.ride_action(p_ride uuid, p_action text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rides;
  uid uuid := auth.uid();
begin
  select * into r from public.rides where id = p_ride for update;
  if r.id is null then
    raise exception 'Course introuvable';
  end if;

  if p_action = 'accept' then
    if uid is distinct from r.driver_id or r.status <> 'requested' then
      raise exception 'Action refusée';
    end if;
    update public.rides set status = 'accepted', updated_at = now() where id = r.id;
    update public.drivers set available = false where id = r.driver_id;

  elsif p_action = 'decline' then
    if uid is distinct from r.driver_id or r.status <> 'requested' then
      raise exception 'Action refusée';
    end if;
    update public.rides set status = 'declined', updated_at = now() where id = r.id;

  elsif p_action = 'arrive' then
    if uid is distinct from r.driver_id or r.status <> 'accepted' then
      raise exception 'Action refusée';
    end if;
    update public.rides set status = 'arrived', updated_at = now() where id = r.id;

  elsif p_action = 'start' then
    if uid is distinct from r.driver_id or r.status not in ('accepted', 'arrived') then
      raise exception 'Action refusée';
    end if;
    update public.rides set status = 'started', updated_at = now() where id = r.id;

  elsif p_action = 'complete' then
    if uid is distinct from r.driver_id or r.status not in ('accepted', 'arrived', 'started') then
      raise exception 'Action refusée';
    end if;
    update public.rides
    set status = 'completed',
        pay_status = case when payment = 'cash' then 'confirmed' else pay_status end,
        updated_at = now()
    where id = r.id;
    update public.drivers set available = true, rides_count = rides_count + 1 where id = r.driver_id;

  elsif p_action = 'cancel' then
    if uid not in (r.client_id, r.driver_id) or r.status not in ('requested', 'accepted', 'arrived') then
      raise exception 'Action refusée';
    end if;
    update public.rides set status = 'cancelled', updated_at = now() where id = r.id;
    if r.status in ('accepted', 'arrived') then
      update public.drivers set available = true where id = r.driver_id;
    end if;

  elsif p_action = 'claim_paid' then
    if uid is distinct from r.client_id or r.status <> 'completed'
       or r.payment <> 'mobile' or r.pay_status <> 'pending' then
      raise exception 'Action refusée';
    end if;
    update public.rides set pay_status = 'claimed', updated_at = now() where id = r.id;

  elsif p_action = 'confirm_paid' then
    if uid is distinct from r.driver_id or r.status <> 'completed'
       or r.payment <> 'mobile' or r.pay_status = 'confirmed' then
      raise exception 'Action refusée';
    end if;
    update public.rides set pay_status = 'confirmed', updated_at = now() where id = r.id;

  else
    raise exception 'Action inconnue';
  end if;
end;
$$;
