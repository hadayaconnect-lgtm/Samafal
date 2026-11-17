-- Suppression d'un chauffeur par l'administrateur, en gardant l'historique des courses.
-- Le chauffeur passe au statut « deleted » : il disparaît des listes, ne peut plus se connecter,
-- et son adresse e-mail est libérée. Ses anciennes courses restent (avec son nom).
-- À exécuter une fois dans Supabase (SQL Editor).

-- 1. Nouveau statut « deleted »
do $$
declare
  c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.drivers'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.drivers drop constraint %I', c);
  end loop;
end $$;

alter table public.drivers
  add constraint drivers_status_check check (status in ('pending', 'verified', 'suspended', 'deleted'));

-- 2. Un chauffeur supprimé ne peut plus être revalidé par erreur
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
  where id = p_driver and status <> 'deleted';
end;
$$;

-- 3. Suppression (administrateur uniquement)
create or replace function public.delete_driver(p_driver uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_union() then
    raise exception 'Réservé au syndicat';
  end if;
  if p_driver = auth.uid() then
    raise exception 'Action impossible sur son propre compte';
  end if;

  update public.drivers set status = 'deleted', available = false where id = p_driver;
  if not found then
    raise exception 'Chauffeur introuvable';
  end if;

  delete from public.push_tokens where user_id = p_driver;

  -- Connexion interdite, sessions coupées, e-mail libéré pour une éventuelle nouvelle inscription.
  delete from auth.sessions where user_id = p_driver;
  delete from auth.identities where user_id = p_driver;
  update auth.users
  set email = 'supprime+' || id::text || '@taxibell.invalid',
      phone = null,
      banned_until = 'infinity'
  where id = p_driver;
  update public.profiles set email = null where id = p_driver;
end;
$$;

revoke all on function public.delete_driver(uuid) from public, anon;
grant execute on function public.delete_driver(uuid) to authenticated;
