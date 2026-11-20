-- Le client indique avec quel portefeuille mobile money il paie (D-Money, Waafi, CAC Pay, etc.).
-- À exécuter une fois dans Supabase (SQL Editor), après migration-operateurs.sql.
alter table public.rides add column if not exists pay_operator text;
alter table public.rides drop constraint if exists rides_pay_operator_check;
alter table public.rides add constraint rides_pay_operator_check
  check (pay_operator is null or pay_operator in ('D-Money', 'Waafi', 'CAC Pay', 'Sabapay', 'Dahab Plus', 'Eximpay', 'BCI-Pay'));
grant insert (pay_operator) on public.rides to authenticated;
