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

-- Zones de départ (repères Google Maps)
insert into public.zones (id, name_fr, lat, lng) values
  ('centre', 'Centre-ville', 11.5911, 43.1462),
  ('serpent', 'Plateau du Serpent', 11.6056, 43.1549),
  ('peltier', 'Hôpital Peltier', 11.6083, 43.1532),
  ('haramous', 'Haramous', 11.5638, 43.1661),
  ('port', 'Port', 11.6066, 43.1396),
  ('ambouli', 'Ambouli', 11.5589, 43.1464),
  ('quartier7', 'Quartiers 4 à 7', 11.5764, 43.1411),
  ('aeroport', 'Aéroport', 11.5521, 43.1497),
  ('balbala', 'Balbala', 11.5666, 43.1036),
  ('nagad', 'Cité Nagad', 11.517, 43.1398);

-- Prix provisoires en FDJ (symétriques, minimum 500), à ajuster dans /admin
insert into public.zone_prices (zone_a, zone_b, price) values
  ('aeroport','aeroport',500),
  ('aeroport','ambouli',500),
  ('aeroport','balbala',700),
  ('aeroport','centre',1000),
  ('aeroport','haramous',500),
  ('aeroport','nagad',700),
  ('aeroport','peltier',1000),
  ('aeroport','port',1000),
  ('aeroport','quartier7',500),
  ('aeroport','serpent',1000),
  ('ambouli','ambouli',500),
  ('ambouli','balbala',700),
  ('ambouli','centre',500),
  ('ambouli','haramous',500),
  ('ambouli','nagad',700),
  ('ambouli','peltier',1000),
  ('ambouli','port',500),
  ('ambouli','quartier7',500),
  ('ambouli','serpent',500),
  ('balbala','balbala',500),
  ('balbala','centre',1000),
  ('balbala','haramous',1000),
  ('balbala','nagad',700),
  ('balbala','peltier',1000),
  ('balbala','port',1000),
  ('balbala','quartier7',700),
  ('balbala','serpent',1000),
  ('centre','centre',500),
  ('centre','haramous',500),
  ('centre','nagad',1000),
  ('centre','peltier',500),
  ('centre','port',500),
  ('centre','quartier7',500),
  ('centre','serpent',500),
  ('haramous','haramous',500),
  ('haramous','nagad',1000),
  ('haramous','peltier',500),
  ('haramous','port',500),
  ('haramous','quartier7',500),
  ('haramous','serpent',500),
  ('nagad','nagad',500),
  ('nagad','peltier',1000),
  ('nagad','port',1000),
  ('nagad','quartier7',700),
  ('nagad','serpent',1000),
  ('peltier','peltier',500),
  ('peltier','port',500),
  ('peltier','quartier7',1000),
  ('peltier','serpent',500),
  ('port','port',500),
  ('port','quartier7',500),
  ('port','serpent',500),
  ('quartier7','quartier7',500),
  ('quartier7','serpent',500),
  ('serpent','serpent',500);

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
grant insert (driver_id, pickup_zone, dest_zone, pickup_lat, pickup_lng, payment, price) on public.rides to authenticated;

-- Le client propose son prix (500 à 5000 FDJ, par pas de 100) ; le chauffeur
-- accepte ou refuse. Le nom et le téléphone du client sont fixés côté serveur.
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
