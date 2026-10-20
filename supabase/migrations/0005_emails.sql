-- 0005 — E-mails (Resend) : bienvenue unique, récap du dimanche avec désinscription (sprint 3, 20 octobre 2026).
-- À exécuter une fois : Supabase → SQL Editor → coller ce fichier → Run. Sans risque si relancé.

alter table public.profiles add column if not exists recap_opt_in boolean not null default true;
alter table public.profiles add column if not exists welcome_sent_at timestamptz;
alter table public.profiles add column if not exists last_recap_at timestamptz;

-- Les colonnes d'envoi ne sont écrites que par les fonctions serveur (clé de service) : si l'app tente de les modifier,
-- l'ancienne valeur est conservée. L'app peut, elle, changer recap_opt_in (politique « profile: self »).
create or replace function public.protect_email_columns() returns trigger
language plpgsql set search_path = public as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    new.welcome_sent_at := old.welcome_sent_at;
    new.last_recap_at := old.last_recap_at;
  end if;
  return new;
end $$;
drop trigger if exists protect_email_columns on public.profiles;
create trigger protect_email_columns before update on public.profiles
  for each row execute function public.protect_email_columns();
