-- Migration : le client propose son prix (500 a 5000 FDJ, pas de 100).
-- Idempotente. La grille zone_prices n'est plus utilisee (elle reste en base, sans effet).

grant insert (driver_id, pickup_zone, dest_zone, pickup_lat, pickup_lng, payment, price) on public.rides to authenticated;

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
  if d.id is null or d.status <> 'verified' or not d.available then
    raise exception 'Ce chauffeur n''est pas disponible';
  end if;
  if new.driver_id = auth.uid() then
    raise exception 'Vous ne pouvez pas réserver votre propre taxi';
  end if;
  select * into p from public.profiles where id = auth.uid();
  new.client_id := auth.uid();
  new.client_name := coalesce(p.full_name, '');
  new.client_phone := coalesce(p.phone, '');
  if new.price is null or new.price < 500 or new.price > 5000 or new.price % 100 <> 0 then
    raise exception 'Prix proposé invalide (500 à 5000 FDJ, par pas de 100)';
  end if;
  new.status := 'requested';
  new.pay_status := 'pending';
  return new;
end;
$$;
