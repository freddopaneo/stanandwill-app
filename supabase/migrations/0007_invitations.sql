-- 0007 — Codes d'invitation limités dans le temps (22 novembre 2026).
-- À exécuter une fois : Supabase → SQL Editor → coller ce fichier → Run. Sans risque si relancé.

-- Date de fin de l'accès offert par un code d'invitation. Vide pour les abonnés et pour les comptes sans code.
alter table public.profiles add column if not exists invite_expires_at timestamptz;
comment on column public.profiles.invite_expires_at is
  'Fin de l''accès offert par un code d''invitation (statut « founder »). Écrit uniquement par le serveur.';

-- Compter rapidement combien de comptes ont utilisé un code (limite d'utilisations par code).
create index if not exists profiles_founder_code on public.profiles (founder_code) where founder_code is not null;

-- Verrou : comme le statut d'abonnement, la date de fin n'est modifiable que par le serveur.
-- Sans cela, un utilisateur pourrait prolonger lui-même son accès offert.
create or replace function public.protect_billing_columns() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.role() in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.subscription_status := 'none';
      new.founder_code := null;
      new.stripe_customer_id := null;
      new.invite_expires_at := null;
    else
      new.subscription_status := old.subscription_status;
      new.founder_code := old.founder_code;
      new.stripe_customer_id := old.stripe_customer_id;
      new.invite_expires_at := old.invite_expires_at;
    end if;
  end if;
  return new;
end $$;
