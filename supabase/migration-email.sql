-- Migration : connexion par e-mail (code a 6 chiffres) en plus du telephone.
-- Idempotente.

alter table public.profiles add column if not exists email text;

-- Les nouveaux comptes gardent leur e-mail et/ou leur telephone.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, phone, email) values (new.id, new.phone, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

update public.profiles p set email = u.email
from auth.users u where u.id = p.id and p.email is null and u.email is not null;

-- Un compte e-mail peut renseigner son numero (une seule fois, non verifie).
-- Un numero deja verifie par SMS ne peut pas etre remplace.
grant update (full_name, phone) on public.profiles to authenticated;

create or replace function public.profiles_keep_phone()
returns trigger
language plpgsql
as $$
begin
  if old.phone is not null and old.phone <> '' then
    new.phone := old.phone;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_keep_phone on public.profiles;
create trigger profiles_keep_phone
  before update on public.profiles
  for each row execute function public.profiles_keep_phone();
