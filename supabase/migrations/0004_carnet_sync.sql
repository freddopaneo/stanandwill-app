-- 0004 — Carnet cloud : synchronisation idempotente téléphone ↔ Supabase (sprint 3, 20 octobre 2026).
--
-- Principe : chaque élément créé sur le téléphone (chien, pesée, événement, balade) porte un identifiant
-- « client » stable (client_id). Le téléphone envoie ses éléments en « upsert » sur (dog_id, client_id) :
-- renvoyer deux fois la même pesée ne crée jamais de doublon, même après une coupure réseau.
-- À exécuter une fois : Supabase → SQL Editor → coller ce fichier → Run. Sans risque si relancé.

-- ---------- Identifiants client ----------
alter table public.dogs          add column if not exists client_id text;
alter table public.weights       add column if not exists client_id text;
alter table public.health_events add column if not exists client_id text;
alter table public.walks         add column if not exists client_id text;

-- Unicité par chien (les NULL des lignes historiques ne se gênent pas entre elles).
do $$ begin
  alter table public.weights       add constraint weights_dog_client_uniq       unique (dog_id, client_id);
exception when duplicate_object or duplicate_table then null; end $$;
do $$ begin
  alter table public.health_events add constraint health_events_dog_client_uniq unique (dog_id, client_id);
exception when duplicate_object or duplicate_table then null; end $$;
do $$ begin
  alter table public.walks         add constraint walks_dog_client_uniq         unique (dog_id, client_id);
exception when duplicate_object or duplicate_table then null; end $$;

-- Pesées : un poids à la décimale près, horodaté (le téléphone garde l'heure exacte).
alter table public.weights add column if not exists measured_ts timestamptz;
-- Événements : heure exacte et type libre côté app (vaccine, deworm, vet, symptom, gesture, note).
alter table public.health_events add column if not exists done_ts timestamptz;

-- ---------- Création de chien idempotente ----------
-- Même signature que 0001 (l'app existante continue de fonctionner) :
--  * si payload.client_id est fourni et qu'un chien de ce maître le porte déjà → renvoie son id, sans rien créer ;
--  * la pesée initiale n'est créée que pour les anciens appels (sans client_id) : la synchro envoie les pesées elle-même.
create or replace function public.create_dog(payload jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); new_id uuid; cid text := nullif(payload->>'client_id', '');
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if cid is not null then
    select d.id into new_id from public.dogs d join public.dog_owners o on o.dog_id = d.id
      where o.user_id = uid and d.client_id = cid limit 1;
    if new_id is not null then return new_id; end if;
  end if;
  insert into public.dogs (name, breed_id, variety, size, sex, neutered, neuter_age, birth_month, silhouette, activity, conditions, insurance, main_worry, client_id)
  values (
    payload->>'name', payload->>'breed_id', payload->>'variety', payload->>'size',
    nullif(payload->>'sex','')::public.sex,
    coalesce(nullif(payload->>'neutered','')::public.neuter_status, 'unknown'),
    nullif(payload->>'neuter_age','')::public.neuter_age,
    nullif(payload->>'birth_month','')::date,
    nullif(payload->>'silhouette','')::public.silhouette,
    nullif(payload->>'activity','')::public.activity_level,
    coalesce(array(select jsonb_array_elements_text(coalesce(payload->'conditions','[]'::jsonb))), '{}'),
    nullif(payload->>'insurance','')::public.insurance_status,
    payload->>'main_worry', cid)
  returning id into new_id;
  insert into public.dog_owners (dog_id, user_id) values (new_id, uid);
  if cid is null and payload ? 'weight_kg' and (payload->>'weight_kg') <> '' then
    insert into public.weights (dog_id, kg) values (new_id, (payload->>'weight_kg')::numeric);
  end if;
  return new_id;
end $$;
grant execute on function public.create_dog(jsonb) to authenticated;

-- ---------- Export RGPD : ajoute les balades (absentes de la version 0001) ----------
create or replace function public.export_my_data()
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); result jsonb;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select jsonb_build_object(
    'exported_at', now(),
    'profile', (select to_jsonb(p) - 'id' from public.profiles p where p.id = uid),
    'dogs', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'dog', to_jsonb(d),
        'weights', (select coalesce(jsonb_agg(to_jsonb(w) order by w.measured_at), '[]') from public.weights w where w.dog_id = d.id),
        'health_events', (select coalesce(jsonb_agg(to_jsonb(h) order by h.done_at), '[]') from public.health_events h where h.dog_id = d.id),
        'walks', (select coalesce(jsonb_agg(to_jsonb(k) order by k.started_at), '[]') from public.walks k where k.dog_id = d.id),
        'documents', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from public.documents x where x.dog_id = d.id),
        'scores', (select coalesce(jsonb_agg(to_jsonb(s) order by s.created_at), '[]') from public.vigilance_scores s where s.dog_id = d.id),
        'scans', (select coalesce(jsonb_agg(to_jsonb(sc) order by sc.created_at), '[]') from public.scans sc where sc.dog_id = d.id),
        'conversations', (select coalesce(jsonb_agg(jsonb_build_object('conversation', to_jsonb(c),
            'messages', (select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at), '[]') from public.messages m where m.conversation_id = c.id))), '[]')
          from public.conversations c where c.dog_id = d.id)
      )), '[]')
      from public.dogs d join public.dog_owners o on o.dog_id = d.id and o.user_id = uid
    )
  ) into result;
  return result;
end $$;
