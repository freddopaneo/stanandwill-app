-- 0003 — Retrait de la fonction sociale « copains de balade » (décision du 20 octobre 2026).
-- L'app reste centrée sur la prévention et le bien-être du chien. Les balades (table walks) sont conservées.
-- Ordre : d'abord les tables (et leurs règles d'accès), ensuite les fonctions qu'elles utilisaient.
drop table if exists public.walk_meetup_members cascade;
drop table if exists public.walk_meetups cascade;
drop table if exists public.walk_reports cascade;
drop table if exists public.walk_requests cascade;
drop table if exists public.walk_dogs cascade;
drop table if exists public.walk_profiles cascade;
drop function if exists public.nearby_walk_profiles(integer);
drop function if exists public.linked_display_names();
drop function if exists public.are_friends(uuid, uuid);
create or replace function public.export_my_walks() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'walks', coalesce((select jsonb_agg(w) from public.walks w where public.owns_dog(w.dog_id)), '[]'::jsonb)
  );
$$;
