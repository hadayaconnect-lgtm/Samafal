-- Espace (client ou chauffeur) choisi à la première connexion : enregistré dans le compte et verrouillé.
-- À exécuter une fois dans Supabase (SQL Editor).

alter table public.profiles
  add column if not exists space text check (space in ('client', 'driver'));

-- Les chauffeurs déjà inscrits sont rattachés à l'espace chauffeur.
update public.profiles set space = 'driver'
where space is null
  and role <> 'union'
  and id in (select id from public.drivers);

-- Enregistre l'espace une seule fois : une fois défini, il ne change plus.
create or replace function public.set_my_space(p_space text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  cur text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if p_space not in ('client', 'driver') then
    raise exception 'bad space';
  end if;
  update public.profiles set space = p_space where id = auth.uid() and space is null and role <> 'union';
  select space into cur from public.profiles where id = auth.uid();
  return cur;
end;
$$;

revoke all on function public.set_my_space(text) from public, anon;
grant execute on function public.set_my_space(text) to authenticated;
