-- Le client écrit lui-même le nom de son point de départ et de sa destination.
-- À exécuter une fois dans Supabase (SQL Editor).

alter table public.rides add column if not exists pickup_text text;
alter table public.rides add column if not exists dest_text text;

grant insert (driver_id, pickup_zone, dest_zone, pickup_lat, pickup_lng, pickup_text, dest_text, payment, price)
  on public.rides to authenticated;
