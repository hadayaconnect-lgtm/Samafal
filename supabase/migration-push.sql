-- Migration : notifications push (application Android fermée).
-- Idempotente. A executer dans Supabase > SQL Editor.

create table if not exists public.push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null default 'android',
  updated_at timestamptz not null default now()
);
create index if not exists push_tokens_user_idx on public.push_tokens (user_id);

-- Personne ne lit la table directement : tout passe par les fonctions ci-dessous
-- et par la fonction serveur d'envoi (clé service).
alter table public.push_tokens enable row level security;

create or replace function public.save_push_token(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or p_token is null or length(p_token) < 20 then
    raise exception 'Action refusée';
  end if;
  insert into public.push_tokens (token, user_id, updated_at)
  values (p_token, auth.uid(), now())
  on conflict (token) do update set user_id = auth.uid(), updated_at = now();
end;
$$;

create or replace function public.delete_push_token(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.push_tokens where token = p_token and user_id = auth.uid();
end;
$$;

revoke all on function public.save_push_token(text) from public, anon;
revoke all on function public.delete_push_token(text) from public, anon;
grant execute on function public.save_push_token(text) to authenticated;
grant execute on function public.delete_push_token(text) to authenticated;
