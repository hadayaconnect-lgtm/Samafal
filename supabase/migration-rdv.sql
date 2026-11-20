-- Rendez-vous planifiés : le client réserve un taxi à l'avance (date et heure).
-- À exécuter une fois dans Supabase (SQL Editor).

alter table public.rides add column if not exists scheduled_at timestamptz;
grant insert (scheduled_at) on public.rides to authenticated;

-- Réservation : pour une course planifiée, le chauffeur n'a pas besoin d'être en ligne maintenant.
create or replace function public.rides_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.drivers;
  p public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Connexion requise';
  end if;
  select * into d from public.drivers where id = new.driver_id;
  if d.id is null or d.status <> 'verified' then
    raise exception 'Ce chauffeur n''est pas disponible';
  end if;
  if new.scheduled_at is null then
    if not d.available then
      raise exception 'Ce chauffeur n''est pas disponible';
    end if;
  elsif new.scheduled_at < now() + interval '30 minutes' or new.scheduled_at > now() + interval '14 days' then
    raise exception 'Date invalide (de 30 minutes à 14 jours)';
  end if;
  if new.driver_id = auth.uid() then
    raise exception 'Vous ne pouvez pas réserver votre propre taxi';
  end if;
  select * into p from public.profiles where id = auth.uid();
  new.client_id := auth.uid();
  new.client_name := coalesce(p.full_name, '');
  new.client_phone := coalesce(p.phone, '');
  if new.price is null or new.price < 500 or new.price > 50000 or new.price % 100 <> 0 then
    raise exception 'Prix proposé invalide (500 à 50 000 FDJ, par pas de 100)';
  end if;
  new.status := 'requested';
  new.pay_status := 'pending';
  return new;
end;
$$;

-- Actions : une course planifiée acceptée ne rend pas le chauffeur indisponible avant son départ.
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
    if r.scheduled_at is null then
      update public.drivers set available = false where id = r.driver_id;
    end if;

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
    if r.scheduled_at is not null then
      update public.drivers set available = false where id = r.driver_id;
    end if;

  elsif p_action = 'start' then
    if uid is distinct from r.driver_id or r.status not in ('accepted', 'arrived') then
      raise exception 'Action refusée';
    end if;
    update public.rides set status = 'started', updated_at = now() where id = r.id;
    if r.scheduled_at is not null then
      update public.drivers set available = false where id = r.driver_id;
    end if;

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
    if r.status = 'arrived' or (r.status = 'accepted' and r.scheduled_at is null) then
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
