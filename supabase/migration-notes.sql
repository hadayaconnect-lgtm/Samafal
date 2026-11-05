-- =====================================================================
-- Samafal : notes des taxis (avis clients + inspection du syndicat)
-- À exécuter UNE FOIS dans Supabase > SQL Editor, après schema.sql.
-- =====================================================================

-- 1. Moyennes affichées sur la fiche du chauffeur (modifiables seulement par les fonctions ci-dessous)
alter table public.drivers
  add column ratings_count integer not null default 0,
  add column rating_car numeric(2, 1),
  add column rating_clean numeric(2, 1),
  add column rating_ac numeric(2, 1),
  add column rating_drive numeric(2, 1),
  add column inspection_car smallint,
  add column inspection_clean smallint,
  add column inspection_ac smallint,
  add column inspected_at timestamptz;

-- 2. Avis des clients : un seul avis par course terminée
create table public.ride_ratings (
  ride_id uuid primary key references public.rides (id) on delete cascade,
  driver_id uuid not null references public.drivers (id) on delete cascade,
  client_id uuid not null references public.profiles (id),
  car_state smallint not null check (car_state between 1 and 5),
  cleanliness smallint not null check (cleanliness between 1 and 5),
  aircon smallint not null check (aircon between 1 and 5),
  driving smallint not null check (driving between 1 and 5),
  comment text check (char_length(comment) <= 300),
  created_at timestamptz not null default now()
);
create index ride_ratings_driver_idx on public.ride_ratings (driver_id);
alter table public.ride_ratings enable row level security;
create policy ride_ratings_select on public.ride_ratings
  for select to authenticated
  using (client_id = auth.uid() or driver_id = auth.uid() or public.is_union());
grant select on public.ride_ratings to authenticated;

-- 3. Inspections du syndicat (historique conservé)
create table public.driver_inspections (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers (id) on delete cascade,
  inspector_id uuid not null default auth.uid() references public.profiles (id),
  car_state smallint not null check (car_state between 1 and 5),
  cleanliness smallint not null check (cleanliness between 1 and 5),
  aircon smallint not null check (aircon between 1 and 5),
  notes text check (char_length(notes) <= 300),
  created_at timestamptz not null default now()
);
create index driver_inspections_driver_idx on public.driver_inspections (driver_id, created_at desc);
alter table public.driver_inspections enable row level security;
create policy driver_inspections_select on public.driver_inspections
  for select to authenticated
  using (driver_id = auth.uid() or public.is_union());
grant select on public.driver_inspections to authenticated;

-- 4. Recalcul des moyennes (interne)
--    Note globale = moyenne des avis clients s'il y en a, sinon moyenne de l'inspection, sinon 5.0 (nouveau).
create or replace function public.refresh_driver_rating(p_driver uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
  c numeric; h numeric; a numeric; v numeric;
  d public.drivers;
  overall numeric;
begin
  select count(*), avg(car_state), avg(cleanliness), avg(aircon), avg(driving)
    into n, c, h, a, v
  from public.ride_ratings where driver_id = p_driver;
  select * into d from public.drivers where id = p_driver;
  if n > 0 then
    overall := (c + h + a + v) / 4;
  elsif d.inspection_car is not null then
    overall := (d.inspection_car + d.inspection_clean + d.inspection_ac) / 3.0;
  else
    overall := 5.0;
  end if;
  update public.drivers
  set ratings_count = n,
      rating_car = round(c, 1),
      rating_clean = round(h, 1),
      rating_ac = round(a, 1),
      rating_drive = round(v, 1),
      rating = round(overall, 1)
  where id = p_driver;
end;
$$;

-- 5. Le client note une course terminée (une seule fois)
create or replace function public.rate_ride(
  p_ride uuid, p_car int, p_clean int, p_ac int, p_drive int, p_comment text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rides;
begin
  select * into r from public.rides where id = p_ride;
  if r.id is null or r.client_id is distinct from auth.uid() or r.status <> 'completed' then
    raise exception 'Action refusée';
  end if;
  if exists (select 1 from public.ride_ratings where ride_id = p_ride) then
    raise exception 'Course déjà notée';
  end if;
  insert into public.ride_ratings (ride_id, driver_id, client_id, car_state, cleanliness, aircon, driving, comment)
  values (p_ride, r.driver_id, r.client_id, p_car, p_clean, p_ac, p_drive, nullif(trim(p_comment), ''));
  perform public.refresh_driver_rating(r.driver_id);
end;
$$;

-- 6. Le syndicat enregistre une inspection du véhicule
create or replace function public.inspect_driver(
  p_driver uuid, p_car int, p_clean int, p_ac int, p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_union() then
    raise exception 'Réservé au syndicat';
  end if;
  insert into public.driver_inspections (driver_id, car_state, cleanliness, aircon, notes)
  values (p_driver, p_car, p_clean, p_ac, nullif(trim(p_notes), ''));
  update public.drivers
  set inspection_car = p_car, inspection_clean = p_clean, inspection_ac = p_ac, inspected_at = now()
  where id = p_driver;
  perform public.refresh_driver_rating(p_driver);
end;
$$;

revoke all on function public.refresh_driver_rating(uuid) from public, anon, authenticated;
revoke all on function public.rate_ride(uuid, int, int, int, int, text) from public, anon;
revoke all on function public.inspect_driver(uuid, int, int, int, text) from public, anon;
grant execute on function public.rate_ride(uuid, int, int, int, int, text) to authenticated;
grant execute on function public.inspect_driver(uuid, int, int, int, text) to authenticated;
