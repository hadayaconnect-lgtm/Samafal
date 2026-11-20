-- Ajoute les portefeuilles mobile money : CAC Pay, Sabapay, Dahab Plus, Eximpay, BCI-Pay.
-- À exécuter une fois dans Supabase (SQL Editor). Sans danger : on élargit seulement la liste autorisée.
do $$
declare
  c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.driver_wallets'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%operator%'
  loop
    execute format('alter table public.driver_wallets drop constraint %I', c);
  end loop;
end $$;

alter table public.driver_wallets
  add constraint driver_wallets_operator_check
  check (operator in ('D-Money', 'Waafi', 'CAC Pay', 'Sabapay', 'Dahab Plus', 'Eximpay', 'BCI-Pay'));
