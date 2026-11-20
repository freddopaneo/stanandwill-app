-- 0006 — Paiement web (Stripe) et verrouillage du statut d'abonnement (20 novembre 2026).
-- À exécuter une fois : Supabase → SQL Editor → coller ce fichier → Run. Sans risque si relancé.

-- Identifiant du client Stripe : rattache un compte à ses abonnements payés sur le web (PWA).
alter table public.profiles add column if not exists stripe_customer_id text;
create unique index if not exists profiles_stripe_customer on public.profiles (stripe_customer_id) where stripe_customer_id is not null;

comment on column public.profiles.subscription_status is
  'none | trial | active | expired | founder — écrit uniquement par le serveur : webhook RevenueCat (iOS/Android), webhook Stripe (web), route des codes fondateurs.';

-- Verrou : la politique « profile: self » laisse chaque utilisateur modifier sa propre ligne (consentements, réglages).
-- Sans ce garde-fou, elle lui permettrait aussi de s'écrire subscription_status = 'active' et d'obtenir le plan sans payer.
-- Les colonnes de facturation ne sont donc modifiables que par le serveur (clé de service) ou depuis le SQL Editor.
create or replace function public.protect_billing_columns() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.role() in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.subscription_status := 'none';
      new.founder_code := null;
      new.stripe_customer_id := null;
    else
      new.subscription_status := old.subscription_status;
      new.founder_code := old.founder_code;
      new.stripe_customer_id := old.stripe_customer_id;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists protect_billing_columns on public.profiles;
create trigger protect_billing_columns before insert or update on public.profiles
  for each row execute procedure public.protect_billing_columns();
