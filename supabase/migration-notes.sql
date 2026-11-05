-- =====================================================================
-- Samafal : notes des taxis
--   - La NOTE (sur 5) vient uniquement de l'inspection du syndicat.
--   - Les clients laissent seulement un COMMENTAIRE, visible de tous.
-- À exécuter dans Supabase > SQL Editor, après schema.sql.
-- Ce script peut être relancé sans risque, et remplace la version précédente.
-- =====================================================================

-- 0. Nettoyage de la version précédente (notes par les clients)
drop function if exists public.rate_ride(uuid, int, int, int, int, text);
drop function if exists public.refresh_driver_rating(uuid);
drop table if exists public.ride_ratings;
alter table public.drivers
  drop column if exists ratings_count,
  drop column if exists rating_car,
  drop column if exists rating_clean,
  drop column if exists rating_ac,
  drop column if exists rating_drive;

-- 1. Inspection affichée sur la fiche du chauffeur
alter table public.drivers
  add column if not exists inspection_car smallint,
  add column if not exists inspection_clean smallint,
  add column if not exists inspection_ac smallint,
  add column if not exists inspected_at timestamptz;

-- 2. Historique des inspections (visible du chauffeur et du syndicat)
create table if not exists public.driver_inspections (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers (id) on delete cascade,
  inspector_id uuid not null default auth.uid() references public.profiles (id),
  car_state smallint not null check (car_state between 1 and 5),
  cleanliness smallint not null check (cleanliness between 1 and 5),
  aircon smallint not null check (aircon between 1 and 5),
  notes text check (char_length(notes) <= 300),
  created_at timestamptz not null default now()
);
create index if not exists driver_inspections_driver_idx on public.driver_inspections (driver_id, created_at desc);
alter table public.driver_inspections enable row level security;
drop policy if exists driver_inspections_select on public.driver_inspections;
create policy driver_inspections_select on public.driver_inspections
  for select to authenticated
  using (driver_id = auth.uid() or public.is_union());
grant select on public.driver_inspections to authenticated;

-- 3. Commentaires des clients : un par course terminée, lisibles par tout utilisateur connecté.
--    Seul le prénom est conservé. Le syndicat peut supprimer un commentaire abusif.
create table if not exists public.ride_comments (
  ride_id uuid primary key references public.rides (id) on delete cascade,
  driver_id uuid not null references public.drivers (id) on delete cascade,
  client_id uuid not null references public.profiles (id),
  author text not null,
  comment text not null check (char_length(comment) between 2 and 300),
  created_at timestamptz not null default now()
);
create index if not exists ride_comments_driver_idx on public.ride_comments (driver_id, created_at desc);
alter table public.ride_comments enable row level security;
drop policy if exists ride_comments_select on public.ride_comments;
create policy ride_comments_select on public.ride_comments for select to authenticated using (true);
drop policy if exists ride_comments_delete on public.ride_comments;
create policy ride_comments_delete on public.ride_comments for delete to authenticated using (public.is_union());
grant select, delete on public.ride_comments to authenticated;

-- 4. Le client commente une course terminée (une seule fois)
create or replace function public.comment_ride(p_ride uuid, p_comment text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rides;
  p public.profiles;
  first_name text;
begin
  select * into r from public.rides where id = p_ride;
  if r.id is null or r.client_id is distinct from auth.uid() or r.status <> 'completed' then
    raise exception 'Action refusée';
  end if;
  if exists (select 1 from public.ride_comments where ride_id = p_ride) then
    raise exception 'Course déjà commentée';
  end if;
  select * into p from public.profiles where id = auth.uid();
  first_name := coalesce(nullif(split_part(trim(coalesce(p.full_name, '')), ' ', 1), ''), 'Client');
  insert into public.ride_comments (ride_id, driver_id, client_id, author, comment)
  values (p_ride, r.driver_id, r.client_id, first_name, trim(p_comment));
end;
$$;

-- 5. Le syndicat enregistre une inspection : la note globale = moyenne des 3 critères
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
  set inspection_car = p_car,
      inspection_clean = p_clean,
      inspection_ac = p_ac,
      inspected_at = now(),
      rating = round((p_car + p_clean + p_ac) / 3.0, 1)
  where id = p_driver;
end;
$$;

revoke all on function public.comment_ride(uuid, text) from public, anon;
revoke all on function public.inspect_driver(uuid, int, int, int, text) from public, anon;
grant execute on function public.comment_ride(uuid, text) to authenticated;
grant execute on function public.inspect_driver(uuid, int, int, int, text) to authenticated;
