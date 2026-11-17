-- Notification à l'administrateur quand un chauffeur demande à s'inscrire.
-- Copie le webhook déjà utilisé pour les courses (même fonction, même mot de passe)
-- et l'applique à la table des chauffeurs (INSERT uniquement).
-- À exécuter une fois dans Supabase (SQL Editor).

drop trigger if exists drivers_push_webhook on public.drivers;

do $$
declare
  d text;
begin
  select pg_get_triggerdef(t.oid) into d
  from pg_trigger t
  where t.tgrelid = 'public.rides'::regclass
    and not t.tgisinternal
    and pg_get_triggerdef(t.oid) ilike '%http_request%'
  limit 1;

  if d is null then
    raise exception 'Webhook des courses introuvable : prévenir Claude';
  end if;

  d := regexp_replace(d, '^CREATE TRIGGER \S+', 'CREATE TRIGGER drivers_push_webhook');
  d := regexp_replace(d, ' AFTER [A-Z ]+ ON ', ' AFTER INSERT ON ');
  d := replace(d, ' ON public.rides ', ' ON public.drivers ');
  execute d;
end $$;
