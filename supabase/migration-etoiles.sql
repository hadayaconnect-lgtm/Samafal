-- Migration : notes en etoiles (1 a 5) donnees par le client apres une course terminee.
-- La note de l'inspection du syndicat (drivers.rating) n'est PAS modifiee :
-- la moyenne des clients est stockee a part (client_rating).
-- Idempotente. A executer dans Supabase > SQL Editor.

alter table public.drivers
  add column if not exists client_rating numeric(2, 1),
  add column if not exists client_ratings_count integer not null default 0;

create table if not exists public.ride_stars (
  ride_id uuid primary key references public.rides (id) on delete cascade,
  driver_id uuid not null references public.drivers (id) on delete cascade,
  client_id uuid not null references public.profiles (id),
  stars smallint not null check (stars between 1 and 5),
  created_at timestamptz not null default now()
);
create index if not exists ride_stars_driver_idx on public.ride_stars (driver_id);

alter table public.ride_stars enable row level security;
drop policy if exists ride_stars_select on public.ride_stars;
create policy ride_stars_select on public.ride_stars
  for select to authenticated
  using (client_id = auth.uid() or driver_id = auth.uid() or public.is_union());
grant select on public.ride_stars to authenticated;

create or replace function public.rate_ride(p_ride uuid, p_stars int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rides;
begin
  if p_stars is null or p_stars < 1 or p_stars > 5 then
    raise exception 'Note invalide';
  end if;
  select * into r from public.rides where id = p_ride;
  if r.id is null or r.client_id is distinct from auth.uid() or r.status <> 'completed' then
    raise exception 'Action refusée';
  end if;
  if exists (select 1 from public.ride_stars where ride_id = p_ride) then
    raise exception 'Course déjà notée';
  end if;
  insert into public.ride_stars (ride_id, driver_id, client_id, stars)
  values (p_ride, r.driver_id, r.client_id, p_stars);
  update public.drivers d
  set client_rating = (select round(avg(stars)::numeric, 1) from public.ride_stars where driver_id = r.driver_id),
      client_ratings_count = (select count(*) from public.ride_stars where driver_id = r.driver_id)
  where d.id = r.driver_id;
end;
$$;

revoke all on function public.rate_ride(uuid, int) from public, anon;
grant execute on function public.rate_ride(uuid, int) to authenticated;
