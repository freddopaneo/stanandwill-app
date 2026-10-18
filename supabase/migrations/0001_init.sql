-- Stan & Will — schéma v1 (Supabase / Postgres, région eu-central-1)
-- Principe : minimisation. L'identité du maître (auth.users + profiles) est séparée des chiens.
-- Toutes les tables liées à un chien portent une politique RLS « propriétaire seulement ».

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------
create type public.sex as enum ('male', 'female');
create type public.neuter_status as enum ('yes', 'no', 'unknown');
create type public.neuter_age as enum ('before_12m', 'after_12m', 'unknown');
create type public.silhouette as enum ('very_thin', 'thin', 'ideal', 'round', 'very_round');
create type public.activity_level as enum ('lt30', '30_60', '60_120', 'gt120');
create type public.insurance_status as enum ('yes', 'no', 'thinking');
create type public.evidence_level as enum ('proven', 'probable', 'common_opinion', 'myth', 'unproven');
create type public.triage_level as enum ('watch', 'consult', 'emergency', 'none');
create type public.scan_type as enum ('barcode', 'label_photo', 'human_food', 'health_photo');
create type public.plan_item_status as enum ('todo', 'done', 'skipped');
create type public.plan_item_type as enum ('lesson', 'gesture', 'check', 'weigh');

-- ---------------------------------------------------------------
-- Profils (1 ligne par utilisateur auth) — données minimales
-- ---------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  locale text not null default 'fr',
  country text,
  consent_analytics boolean not null default false,
  consent_marketing boolean not null default false,
  consent_ai_notice_at timestamptz,          -- acceptation de la mention IA (AI Act art. 50)
  consents_updated_at timestamptz not null default now(),
  subscription_status text not null default 'none',  -- miroir RevenueCat : none | trial | active | expired | founder
  founder_code text,
  notif_hour smallint not null default 8 check (notif_hour between 5 and 22),
  created_at timestamptz not null default now(),
  deletion_requested_at timestamptz
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------
-- Connaissance par race (contenu, modifiable sans déploiement)
-- ---------------------------------------------------------------
create table public.breeds (
  id text primary key,                 -- 'dachshund', 'french_bulldog', 'other'
  name_fr text not null,
  varieties jsonb not null default '[]'::jsonb,   -- [{id:'smooth', label:'Poil ras'}, ...]
  sizes jsonb not null default '[]'::jsonb,       -- [{id:'mini', label:'Nain'}, {id:'standard', ...}]
  weight_ref jsonb not null default '{}'::jsonb,  -- { "mini": {"male":[4,5.5], "female":[3.5,5]}, "standard": {...} }
  life_expectancy text,
  worries jsonb not null default '[]'::jsonb,     -- options de la question 13, libellés par race
  base_score smallint not null default 72,
  risk_window jsonb,                              -- {"from_months":48,"to_months":96,"penalty":12}
  content_status text not null default 'generic', -- generic | full
  sources jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.breed_risks (
  id uuid primary key default gen_random_uuid(),
  breed_id text not null references public.breeds(id) on delete cascade,
  key text not null,                   -- 'ivdd', 'obesity', 'dental', ...
  title_fr text not null,
  prevalence_fr text,                  -- « 1 sur 4 au cours de la vie »
  typical_age_fr text,
  cost_fr text,
  early_signs jsonb not null default '[]'::jsonb,
  factors jsonb not null default '[]'::jsonb,   -- [{key, label_fr, evidence:'proven', score_delta, modifiable:bool, source}]
  variety_modifiers jsonb not null default '{}'::jsonb, -- {"smooth": -4, "wire": 0, "long": -2}
  source_url text,
  vet_reviewed_at timestamptz,
  vet_reviewer text,
  version smallint not null default 1,
  unique (breed_id, key)
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  breed_id text references public.breeds(id) on delete cascade,   -- null = toutes races
  week smallint not null,
  day smallint not null,
  type public.plan_item_type not null default 'lesson',
  title_fr text not null,
  body_fr text not null,               -- 80 à 120 mots
  check_question_fr text,
  check_answers jsonb,                 -- [{label, correct}]
  evidence public.evidence_level,
  source_url text,
  score_delta smallint not null default 0,
  min_age_months smallint, max_age_months smallint,
  mode text not null default 'prevention',  -- prevention | post_episode
  vet_reviewed_at timestamptz,
  active boolean not null default true
);

create table public.food_rules (
  id uuid primary key default gen_random_uuid(),
  name_fr text not null,
  aliases text[] not null default '{}',
  level public.triage_level not null,          -- none = vert, watch = ambre, emergency = rouge
  verdict_fr text not null,                    -- « Oui, en petite quantité »
  why_fr text not null,
  max_g_per_kg numeric,                        -- quantité tolérée par kg (vert)
  if_eaten_fr text,                            -- conduite à tenir (rouge)
  vet_reviewed_at timestamptz
);

create table public.products (
  barcode text primary key,
  name text, brand text,
  ingredients_text text,
  analysis jsonb,                              -- {grade:'A'..'E', pros:[], cons:[], kcal_per_100g, protein_pct, ...}
  source text not null default 'opff',         -- opff | ai | manual
  verified boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.faq (
  id uuid primary key default gen_random_uuid(),
  breed_id text references public.breeds(id),
  question_fr text not null,
  answer_fr text not null,
  triage public.triage_level not null default 'none',
  evidence public.evidence_level,
  embedding_keywords text[] not null default '{}',
  vet_reviewed_at timestamptz
);

create table public.season_alerts (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,                    -- 'easter_chocolate', 'heat', 'ticks_spring', ...
  title_fr text not null, body_fr text not null,
  trigger jsonb not null                       -- {"type":"date","from":"03-20","to":"05-31"} | {"type":"temp_gt","value":28}
);

-- ---------------------------------------------------------------
-- Chiens et données du maître (RLS stricte)
-- ---------------------------------------------------------------
create table public.dogs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 24),
  breed_id text not null references public.breeds(id),
  variety text, size text,
  sex public.sex,
  neutered public.neuter_status not null default 'unknown',
  neuter_age public.neuter_age,
  birth_month date,                            -- 1er du mois de naissance
  silhouette public.silhouette,
  activity public.activity_level,
  conditions text[] not null default '{}',     -- 'back','dental','overweight','skin'
  insurance public.insurance_status,
  main_worry text,
  photo_path text,                             -- chemin dans le bucket privé
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.dog_owners (
  dog_id uuid not null references public.dogs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner',
  primary key (dog_id, user_id)
);

create table public.weights (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs(id) on delete cascade,
  kg numeric(4,1) not null check (kg > 0 and kg < 100),
  measured_at date not null default current_date,
  created_at timestamptz not null default now()
);

create table public.health_events (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs(id) on delete cascade,
  kind text not null,                          -- vaccine | deworming | antiparasitic | visit | treatment
  label text not null,
  done_at date not null,
  next_due date,
  notes text,
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs(id) on delete cascade,
  title text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table public.vigilance_scores (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs(id) on delete cascade,
  score smallint not null check (score between 0 and 100),
  components jsonb not null,                   -- [{key,label,delta,modifiable,evidence}]
  algo_version text not null,
  reason_fr text,                              -- « +3 : pesée faite, poids stable »
  created_at timestamptz not null default now()
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs(id) on delete cascade,
  mode text not null default 'prevention',
  started_on date not null default current_date,
  created_at timestamptz not null default now()
);

create table public.plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  lesson_id uuid references public.lessons(id),
  type public.plan_item_type not null,
  due_on date not null,
  status public.plan_item_status not null default 'todo',
  done_at timestamptz,
  answer jsonb
);

create table public.scans (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs(id) on delete cascade,
  type public.scan_type not null,
  input jsonb not null,                        -- {barcode} | {text} | {photo_path}
  result jsonb not null,                       -- structuré selon le type
  triage public.triage_level not null default 'none',
  photo_path text,
  photo_expires_at timestamptz,                -- purge à 30 jours
  created_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs(id) on delete cascade,
  title text,
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  triage public.triage_level,
  evidence public.evidence_level,
  helpful boolean,
  created_at timestamptz not null default now()
);

create table public.partner_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  partner text not null,                       -- 'insurer_x', 'televet_y'
  event text not null,                         -- 'card_shown' | 'click' | 'conversion'
  dog_breed text,
  created_at timestamptz not null default now()
);

-- Compteur d'usage (limites gratuites et quotas assistant)
create table public.usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  scans int not null default 0,
  messages int not null default 0,
  primary key (user_id, day)
);

-- ---------------------------------------------------------------
-- Index
-- ---------------------------------------------------------------
create index on public.dog_owners (user_id);
create index on public.weights (dog_id, measured_at desc);
create index on public.health_events (dog_id, next_due);
create index on public.vigilance_scores (dog_id, created_at desc);
create index on public.plan_items (plan_id, due_on);
create index on public.scans (dog_id, created_at desc);
create index on public.messages (conversation_id, created_at);
create index on public.lessons (breed_id, week, day);

-- ---------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.dogs enable row level security;
alter table public.dog_owners enable row level security;
alter table public.weights enable row level security;
alter table public.health_events enable row level security;
alter table public.documents enable row level security;
alter table public.vigilance_scores enable row level security;
alter table public.plans enable row level security;
alter table public.plan_items enable row level security;
alter table public.scans enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.partner_events enable row level security;
alter table public.usage enable row level security;
-- Contenu : lecture publique authentifiée, écriture réservée au service
alter table public.breeds enable row level security;
alter table public.breed_risks enable row level security;
alter table public.lessons enable row level security;
alter table public.food_rules enable row level security;
alter table public.products enable row level security;
alter table public.faq enable row level security;
alter table public.season_alerts enable row level security;

create or replace function public.owns_dog(d uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.dog_owners where dog_id = d and user_id = auth.uid());
$$;

create policy "profile: self" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());

create policy "dogs: owners" on public.dogs for select using (public.owns_dog(id));
create policy "dogs: insert by anyone authenticated" on public.dogs for insert with check (auth.uid() is not null);
create policy "dogs: update owners" on public.dogs for update using (public.owns_dog(id));
create policy "dogs: delete owners" on public.dogs for delete using (public.owns_dog(id));

create policy "dog_owners: read own" on public.dog_owners for select using (user_id = auth.uid());
create or replace function public.dog_has_owner(d uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.dog_owners where dog_id = d);
$$;
-- On ne peut se rattacher qu'à un chien qui n'a pas encore de propriétaire (création) ; le partage entre maîtres passera par une invitation serveur (v2).
create policy "dog_owners: insert self on new dog" on public.dog_owners for insert
  with check (user_id = auth.uid() and not public.dog_has_owner(dog_id));
create policy "dog_owners: delete self" on public.dog_owners for delete using (user_id = auth.uid());

create policy "weights: owners" on public.weights for all using (public.owns_dog(dog_id)) with check (public.owns_dog(dog_id));
create policy "health_events: owners" on public.health_events for all using (public.owns_dog(dog_id)) with check (public.owns_dog(dog_id));
create policy "documents: owners" on public.documents for all using (public.owns_dog(dog_id)) with check (public.owns_dog(dog_id));
create policy "scores: owners read" on public.vigilance_scores for select using (public.owns_dog(dog_id));
create policy "plans: owners" on public.plans for all using (public.owns_dog(dog_id)) with check (public.owns_dog(dog_id));
create policy "plan_items: owners" on public.plan_items for all
  using (exists (select 1 from public.plans p where p.id = plan_id and public.owns_dog(p.dog_id)))
  with check (exists (select 1 from public.plans p where p.id = plan_id and public.owns_dog(p.dog_id)));
create policy "scans: owners read" on public.scans for select using (public.owns_dog(dog_id));
create policy "conversations: owners" on public.conversations for all using (public.owns_dog(dog_id)) with check (public.owns_dog(dog_id));
create policy "messages: owners" on public.messages for select
  using (exists (select 1 from public.conversations c where c.id = conversation_id and public.owns_dog(c.dog_id)));
create policy "messages: owners insert user role" on public.messages for insert
  with check (role = 'user' and exists (select 1 from public.conversations c where c.id = conversation_id and public.owns_dog(c.dog_id)));
create policy "messages: owners rate" on public.messages for update
  using (exists (select 1 from public.conversations c where c.id = conversation_id and public.owns_dog(c.dog_id)));
create policy "partner_events: insert self" on public.partner_events for insert with check (user_id = auth.uid());
create policy "usage: self read" on public.usage for select using (user_id = auth.uid());

create policy "content read" on public.breeds for select using (true);
create policy "content read" on public.breed_risks for select using (true);
create policy "content read" on public.lessons for select using (active);
create policy "content read" on public.food_rules for select using (true);
create policy "content read" on public.products for select using (true);
create policy "content read" on public.faq for select using (true);
create policy "content read" on public.season_alerts for select using (true);
-- Les écritures sur le contenu, les scores, les scans et les messages 'assistant' passent par le serveur (clé de service).

-- Création atomique chien + propriétaire (utilisée par l'app à la fin du quiz)
create or replace function public.create_dog(payload jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); new_id uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  insert into public.dogs (name, breed_id, variety, size, sex, neutered, neuter_age, birth_month, silhouette, activity, conditions, insurance, main_worry)
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
    payload->>'main_worry')
  returning id into new_id;
  insert into public.dog_owners (dog_id, user_id) values (new_id, uid);
  if payload ? 'weight_kg' and (payload->>'weight_kg') <> '' then
    insert into public.weights (dog_id, kg) values (new_id, (payload->>'weight_kg')::numeric);
  end if;
  return new_id;
end $$;

-- ---------------------------------------------------------------
-- Stockage : bucket privé pour photos et documents
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('dog-media', 'dog-media', false) on conflict do nothing;
-- Chemin imposé : dog-media/<dog_id>/<fichier>
create policy "media: owners read" on storage.objects for select
  using (bucket_id = 'dog-media' and public.owns_dog((storage.foldername(name))[1]::uuid));
create policy "media: owners write" on storage.objects for insert
  with check (bucket_id = 'dog-media' and public.owns_dog((storage.foldername(name))[1]::uuid));
create policy "media: owners delete" on storage.objects for delete
  using (bucket_id = 'dog-media' and public.owns_dog((storage.foldername(name))[1]::uuid));

-- ---------------------------------------------------------------
-- RGPD : export et suppression
-- ---------------------------------------------------------------
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

-- Suppression : marque la demande ; la purge effective (données + fichiers + auth.users) est faite par une tâche serveur
-- sous 30 jours, après e-mail de confirmation. Les chiens dont l'utilisateur est le seul propriétaire sont supprimés.
create or replace function public.request_account_deletion()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set deletion_requested_at = now() where id = auth.uid();
end $$;

create or replace function public.purge_user(target uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.dogs d where exists (select 1 from public.dog_owners o where o.dog_id = d.id and o.user_id = target)
    and not exists (select 1 from public.dog_owners o2 where o2.dog_id = d.id and o2.user_id <> target);
  delete from public.dog_owners where user_id = target;
  delete from public.profiles where id = target;
  delete from auth.users where id = target;
end $$;
revoke all on function public.purge_user(uuid) from public, anon, authenticated;

-- Purge des photos d'analyse expirées (appelée par une tâche planifiée)
create or replace function public.expire_scan_photos()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with e as (update public.scans set photo_path = null, photo_expires_at = null
             where photo_expires_at is not null and photo_expires_at < now() returning 1)
  select count(*) into n from e;
  return n;
end $$;

-- ---------------------------------------------------------------
-- Quotas : incrément atomique de l'usage du jour (appelé par le serveur avec la clé service)
-- ---------------------------------------------------------------
create or replace function public.bump_usage(p_user uuid, p_messages int default 0, p_scans int default 0)
returns void language sql security definer set search_path = public as $$
  insert into public.usage (user_id, day, messages, scans) values (p_user, current_date, p_messages, p_scans)
  on conflict (user_id, day) do update set messages = usage.messages + excluded.messages, scans = usage.scans + excluded.scans;
$$;
revoke all on function public.bump_usage(uuid, int, int) from public;
