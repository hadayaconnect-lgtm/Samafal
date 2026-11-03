-- =====================================================================
-- Allô Taxi / Samafal : schéma de base de données (version 1)
-- À coller dans Supabase > SQL Editor > New query, puis cliquer sur Run.
-- Hypothèses : connexion par téléphone (SMS), compte client obligatoire,
-- "Automatically expose new tables" désactivé, RLS automatique activé.
-- Aucun accès n'est donné au rôle "anon" : il faut être connecté.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Profils (un par compte). Rôles : client (défaut) ou union (syndicat).
--    Un chauffeur est un client qui a une fiche dans "drivers".
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  phone text,
  full_name text,
  role text not null default 'client' check (role in ('client', 'union')),
  created_at timestamptz not null default now()
);

create or replace function public.is_union()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'union');
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, phone) values (new.id, new.phone)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
create policy profiles_select on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_union());
create policy profiles_update on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- 2. Zones et prix (modifiables par le syndicat)
-- ---------------------------------------------------------------------
create table public.zones (
  id text primary key,
  name_fr text not null,
  lat double precision not null,
  lng double precision not null
);

create table public.zone_prices (
  zone_a text not null references public.zones (id),
  zone_b text not null references public.zones (id),
  price integer not null check (price > 0),
  primary key (zone_a, zone_b),
  check (zone_a <= zone_b)
);

create or replace function public.zone_price(a text, b text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select price from public.zone_prices where zone_a = least(a, b) and zone_b = greatest(a, b);
$$;

alter table public.zones enable row level security;
alter table public.zone_prices enable row level security;
create policy zones_read on public.zones for select to authenticated using (true);
create policy zones_write on public.zones for all to authenticated
  using (public.is_union()) with check (public.is_union());
create policy zone_prices_read on public.zone_prices for select to authenticated using (true);
create policy zone_prices_write on public.zone_prices for all to authenticated
  using (public.is_union()) with check (public.is_union());
grant select, insert, update, delete on public.zones to authenticated;
grant select, insert, update, delete on public.zone_prices to authenticated;

-- Zones de départ (coordonnées approximatives, à corriger avec le syndicat)
insert into public.zones (id, name_fr, lat, lng) values
  ('centre',   'Centre-ville',       11.5886, 43.1450),
  ('serpent',  'Plateau du Serpent', 11.5985, 43.1520),
  ('haramous', 'Haramous',           11.6075, 43.1620),
  ('port',     'Port',               11.6010, 43.1370),
  ('aeroport', 'Aéroport Ambouli',   11.5473, 43.1595),
  ('balbala',  'Balbala',            11.5320, 43.1000),
  ('gabode',   'Gabode',             11.5730, 43.1250);

-- Prix provisoires en FDJ (symétriques), à valider avec le syndicat
insert into public.zone_prices (zone_a, zone_b, price)
select least(a, b), greatest(a, b), p
from (values
  ('centre','centre',300), ('serpent','serpent',300), ('haramous','haramous',300),
  ('port','port',300), ('aeroport','aeroport',300), ('balbala','balbala',300), ('gabode','gabode',300),
  ('centre','serpent',400), ('centre','haramous',600), ('centre','port',500),
  ('centre','aeroport',1000), ('centre','balbala',800), ('centre','gabode',500),
  ('serpent','haramous',400), ('serpent','port',500), ('serpent','aeroport',1100),
  ('serpent','balbala',900), ('serpent','gabode',600),
  ('haramous','port',700), ('haramous','aeroport',1200), ('haramous','balbala',1000),
  ('haramous','gabode',800),
  ('port','aeroport',1100), ('port','balbala',800), ('port','gabode',600),
  ('aeroport','balbala',800), ('aeroport','gabode',700),
  ('balbala','gabode',600)
) as v (a, b, p);

-- ---------------------------------------------------------------------
-- 3. Chauffeurs
--    Le chauffeur crée sa fiche (statut "pending"). Seul le syndicat peut
--    la valider ou la suspendre (fonction set_driver_status).
-- ---------------------------------------------------------------------
create table public.drivers (
  id uuid primary key references public.profiles (id) on delete cascade,
  full_name text not null,
  phone text not null,
  plate text not null,
  vehicle text not null default '',
  status text not null default 'pending' check (status in ('pending', 'verified', 'suspended')),
  available boolean not null default false,
  lat double precision not null default 11.5886,
  lng double precision not null default 43.1450,
  location_updated_at timestamptz not null default now(),
  rating numeric(2, 1) not null default 5.0,
  rides_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index drivers_status_available_idx on public.drivers (status, available);

alter table public.drivers enable row level security;
create policy drivers_select on public.drivers
  for select to authenticated
  using (status = 'verified' or id = auth.uid() or public.is_union());
create policy drivers_insert on public.drivers
  for insert to authenticated with check (id = auth.uid());
create policy drivers_update on public.drivers
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and (available = false or status = 'verified'));
grant select on public.drivers to authenticated;
grant insert (id, full_name, phone, plate, vehicle) on public.drivers to authenticated;
grant update (available, lat, lng, location_updated_at) on public.drivers to authenticated;

create or replace function public.set_driver_status(p_driver uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_union() then
    raise exception 'Réservé au syndicat';
  end if;
  if p_status not in ('pending', 'verified', 'suspended') then
    raise exception 'Statut inconnu';
  end if;
  update public.drivers
  set status = p_status,
      available = case when p_status = 'verified' then available else false end
  where id = p_driver;
end;
$$;

-- Numéro mobile money : visible du chauffeur, du syndicat, et du client
-- seulement pendant une course acceptée ou terminée.
create table public.driver_wallets (
  driver_id uuid primary key references public.drivers (id) on delete cascade,
  operator text not null check (operator in ('D-Money', 'Waafi')),
  number text not null
);
alter table public.driver_wallets enable row level security;
grant select, insert, update on public.driver_wallets to authenticated;

-- ---------------------------------------------------------------------
-- 4. Courses
--    Création directe par le client. Tout changement d'état passe par la
--    fonction ride_action (aucun UPDATE direct autorisé).
-- ---------------------------------------------------------------------
create table public.rides (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null default auth.uid() references public.profiles (id),
  driver_id uuid not null references public.drivers (id),
  client_name text not null default '',
  client_phone text not null default '',
  pickup_zone text not null references public.zones (id),
  dest_zone text not null references public.zones (id),
  pickup_lat double precision not null,
  pickup_lng double precision not null,
  price integer not null default 0,
  payment text not null check (payment in ('cash', 'mobile')),
  pay_status text not null default 'pending' check (pay_status in ('pending', 'claimed', 'confirmed')),
  status text not null default 'requested'
    check (status in ('requested', 'accepted', 'completed', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index rides_driver_status_idx on public.rides (driver_id, status);
create index rides_client_idx on public.rides (client_id, created_at desc);

alter table public.rides enable row level security;
create policy rides_select on public.rides
  for select to authenticated
  using (client_id = auth.uid() or driver_id = auth.uid() or public.is_union());
create policy rides_insert on public.rides
  for insert to authenticated with check (client_id = auth.uid());
grant select on public.rides to authenticated;
grant insert (driver_id, pickup_zone, dest_zone, pickup_lat, pickup_lng, payment) on public.rides to authenticated;

-- Le prix, le nom et le téléphone du client sont fixés côté serveur.
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
  new.price := public.zone_price(new.pickup_zone, new.dest_zone);
  if new.price is null then
    raise exception 'Prix inconnu pour ce trajet';
  end if;
  new.status := 'requested';
  new.pay_status := 'pending';
  return new;
end;
$$;
create trigger rides_before_insert
  before insert on public.rides
  for each row execute function public.rides_before_insert();

create policy wallets_select on public.driver_wallets
  for select to authenticated
  using (
    driver_id = auth.uid()
    or public.is_union()
    or exists (
      select 1 from public.rides r
      where r.driver_id = driver_wallets.driver_id
        and r.client_id = auth.uid()
        and r.status in ('accepted', 'completed')
    )
  );
create policy wallets_insert on public.driver_wallets
  for insert to authenticated with check (driver_id = auth.uid());
create policy wallets_update on public.driver_wallets
  for update to authenticated using (driver_id = auth.uid()) with check (driver_id = auth.uid());

-- Actions possibles sur une course :
--   accept / decline / complete / confirm_paid : par le chauffeur
--   cancel : par le client ou le chauffeur
--   claim_paid : par le client (paiement mobile money annoncé)
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

  elsif p_action = 'complete' then
    if uid is distinct from r.driver_id or r.status <> 'accepted' then
      raise exception 'Action refusée';
    end if;
    update public.rides
    set status = 'completed',
        pay_status = case when payment = 'cash' then 'confirmed' else pay_status end,
        updated_at = now()
    where id = r.id;
    update public.drivers set available = true, rides_count = rides_count + 1 where id = r.driver_id;

  elsif p_action = 'cancel' then
    if uid not in (r.client_id, r.driver_id) or r.status not in ('requested', 'accepted') then
      raise exception 'Action refusée';
    end if;
    update public.rides set status = 'cancelled', updated_at = now() where id = r.id;
    if r.status = 'accepted' then
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

-- ---------------------------------------------------------------------
-- 5. Droits d'exécution des fonctions (réservés aux utilisateurs connectés)
-- ---------------------------------------------------------------------
revoke all on function public.is_union() from public, anon;
revoke all on function public.zone_price(text, text) from public, anon;
revoke all on function public.set_driver_status(uuid, text) from public, anon;
revoke all on function public.ride_action(uuid, text) from public, anon;
grant execute on function public.is_union() to authenticated;
grant execute on function public.zone_price(text, text) to authenticated;
grant execute on function public.set_driver_status(uuid, text) to authenticated;
grant execute on function public.ride_action(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- 6. Temps réel : les changements de courses et de chauffeurs arrivent
--    en direct dans l'application (les règles d'accès s'appliquent).
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.rides, public.drivers;

-- ---------------------------------------------------------------------
-- 7. Pour nommer un compte "syndicat" (à faire une fois, après sa première
--    connexion, en remplaçant le numéro) :
--      update public.profiles set role = 'union' where phone = '253770000000';
-- ---------------------------------------------------------------------
