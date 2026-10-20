-- Stan & Will — script d'installation complet (projet neuf) : 0001_init + seed + 0002_walks

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

-- Stan & Will — contenu de départ (teckel complet, autres races génériques).
-- Tout contenu santé est marqué « à valider » (vet_reviewed_at null) jusqu'à relecture du vétérinaire référent.

insert into public.breeds (id, name_fr, varieties, sizes, weight_ref, life_expectancy, worries, base_score, risk_window, content_status, sources) values
('dachshund', 'Teckel',
 '[{"id":"smooth","label":"Poil ras"},{"id":"long","label":"Poil long"},{"id":"wire","label":"Poil dur"}]',
 '[{"id":"mini","label":"Nain (jusqu''à 5 kg environ)"},{"id":"standard","label":"Standard (7 à 12 kg)"}]',
 '{"mini":{"male":[4,5.5],"female":[3.5,5]},"standard":{"male":[8,12],"female":[7,11]}}',
 '12 à 16 ans',
 '[{"id":"back","label":"Son dos"},{"id":"weight","label":"Son poids"},{"id":"food","label":"Ce qu''il mange"},{"id":"teeth","label":"Ses dents"},{"id":"other","label":"Autre chose"}]',
 70, '{"from_months":48,"to_months":96,"penalty":12}', 'full',
 '[{"label":"Dachshund IVDD UK — prévalence","url":"https://dachshund-ivdd.uk/what-is-ivdd/how-common-is-ivdd"},{"label":"Canine Genetics and Epidemiology 2018 — cohorte","url":"https://link.springer.com/content/pdf/10.1186/s40575-018-0067-7.pdf"},{"label":"HelloSafe — coûts de soins","url":"https://hellosafe.fr/assurance-animaux/teckel"}]'),
('french_bulldog','Bouledogue français','[]','[]','{"standard":{"male":[9,14],"female":[8,13]}}','10 à 12 ans','[{"id":"breath","label":"Sa respiration"},{"id":"weight","label":"Son poids"},{"id":"skin","label":"Sa peau"},{"id":"food","label":"Ce qu''il mange"},{"id":"other","label":"Autre chose"}]',72,null,'generic','[]'),
('chihuahua','Chihuahua','[]','[]','{"standard":{"male":[1.5,3],"female":[1.5,3]}}','12 à 18 ans','[{"id":"teeth","label":"Ses dents"},{"id":"weight","label":"Son poids"},{"id":"knees","label":"Ses rotules"},{"id":"food","label":"Ce qu''il mange"},{"id":"other","label":"Autre chose"}]',72,null,'generic','[]'),
('pomeranian','Spitz nain','[]','[]','{"standard":{"male":[1.8,3.5],"female":[1.8,3.5]}}','12 à 16 ans','[{"id":"trachea","label":"Sa trachée (toux)"},{"id":"weight","label":"Son poids"},{"id":"teeth","label":"Ses dents"},{"id":"food","label":"Ce qu''il mange"},{"id":"other","label":"Autre chose"}]',72,null,'generic','[]'),
('cavalier','Cavalier King Charles','[]','[]','{"standard":{"male":[5.5,8],"female":[5.5,8]}}','9 à 14 ans','[{"id":"heart","label":"Son cœur"},{"id":"weight","label":"Son poids"},{"id":"ears","label":"Ses oreilles"},{"id":"food","label":"Ce qu''il mange"},{"id":"other","label":"Autre chose"}]',72,null,'generic','[]'),
('shih_tzu','Shih tzu','[]','[]','{"standard":{"male":[4,7.5],"female":[4,7.5]}}','10 à 16 ans','[{"id":"eyes","label":"Ses yeux"},{"id":"teeth","label":"Ses dents"},{"id":"skin","label":"Sa peau"},{"id":"food","label":"Ce qu''il mange"},{"id":"other","label":"Autre chose"}]',72,null,'generic','[]'),
('labrador','Labrador','[]','[]','{"standard":{"male":[29,36],"female":[25,32]}}','10 à 12 ans','[{"id":"weight","label":"Son poids"},{"id":"joints","label":"Ses articulations"},{"id":"ears","label":"Ses oreilles"},{"id":"food","label":"Ce qu''il mange"},{"id":"other","label":"Autre chose"}]',72,null,'generic','[]'),
('golden','Golden retriever','[]','[]','{"standard":{"male":[29,34],"female":[25,29]}}','10 à 12 ans','[{"id":"weight","label":"Son poids"},{"id":"joints","label":"Ses articulations"},{"id":"skin","label":"Sa peau"},{"id":"food","label":"Ce qu''il mange"},{"id":"other","label":"Autre chose"}]',72,null,'generic','[]'),
('yorkshire','Yorkshire','[]','[]','{"standard":{"male":[2,3.2],"female":[2,3.2]}}','13 à 16 ans','[{"id":"teeth","label":"Ses dents"},{"id":"trachea","label":"Sa trachée (toux)"},{"id":"weight","label":"Son poids"},{"id":"food","label":"Ce qu''il mange"},{"id":"other","label":"Autre chose"}]',72,null,'generic','[]'),
('other','Croisé ou autre race','[]','[]','{}',null,'[{"id":"weight","label":"Son poids"},{"id":"teeth","label":"Ses dents"},{"id":"food","label":"Ce qu''il mange"},{"id":"joints","label":"Ses articulations"},{"id":"other","label":"Autre chose"}]',72,null,'generic','[]');

insert into public.breed_risks (breed_id, key, title_fr, prevalence_fr, typical_age_fr, cost_fr, early_signs, factors, variety_modifiers, source_url, version) values
('dachshund','ivdd','Hernie discale (IVDD)',
 'Environ 1 teckel sur 4 au cours de sa vie, 10 à 12 fois plus que les autres chiens',
 'Le plus souvent entre 4 et 8 ans (76 % des diagnostics), pic entre 4 et 6 ans',
 'Chirurgie et rééducation : 1 200 à 2 800 €, souvent davantage avec IRM',
 '["Dos voûté ou raide","Refus de sauter, de monter ou de descendre","Tremblements, halètement sans effort","Cri à la manipulation ou au portage","Démarche vacillante des pattes arrière","Incontinence soudaine"]',
 '[{"key":"weight_ideal","label_fr":"Poids de forme maintenu","evidence":"probable","score_delta":15,"modifiable":true,"source":"consensus clinique"},
   {"key":"weight_round","label_fr":"Surpoids modéré","evidence":"probable","score_delta":-8,"modifiable":true},
   {"key":"weight_very_round","label_fr":"Surpoids marqué","evidence":"probable","score_delta":-15,"modifiable":true},
   {"key":"neuter_early","label_fr":"Stérilisation avant 12 mois","evidence":"proven","score_delta":-6,"modifiable":false,"source":"cohorte 2018 : risque x2,1 femelles, x1,5 mâles"},
   {"key":"activity_regular","label_fr":"Activité régulière 30 min à 2 h par jour","evidence":"probable","score_delta":8,"modifiable":true},
   {"key":"activity_low","label_fr":"Moins de 30 min d''activité par jour","evidence":"probable","score_delta":-4,"modifiable":true},
   {"key":"harness","label_fr":"Harnais plutôt que collier","evidence":"common_opinion","score_delta":4,"modifiable":true},
   {"key":"no_high_jumps","label_fr":"Pas de sauts depuis une hauteur (rampe, portage)","evidence":"probable","score_delta":4,"modifiable":true},
   {"key":"knows_signs","label_fr":"Connaît les 5 signes d''alerte","evidence":"common_opinion","score_delta":4,"modifiable":true},
   {"key":"stairs_ban","label_fr":"Interdiction totale des escaliers","evidence":"myth","score_delta":0,"modifiable":true,"source":"cohorte 2018 : association inversée, pas de preuve d''effet préventif"},
   {"key":"supplements","label_fr":"Compléments glucosamine / chondroïtine","evidence":"unproven","score_delta":0,"modifiable":true},
   {"key":"history_back","label_fr":"Antécédent de problème de dos","evidence":"proven","score_delta":-10,"modifiable":false}]',
 '{"smooth":-4,"long":-2,"wire":0}',
 'https://dachshund-ivdd.uk/what-is-ivdd/how-common-is-ivdd', 1),
('dachshund','obesity','Surpoids','Fréquent chez les teckels adultes stérilisés','Dès 2 ans','Aggrave le risque de dos et d''arthrose','["Côtes difficiles à sentir","Taille non marquée vue de dessus","Essoufflement à l''effort"]','[]','{}',null,1),
('dachshund','dental','Maladie parodontale','Très fréquente chez les petites races','Dès 3 ans','Détartrage sous anesthésie : 300 à 800 € par an','["Mauvaise haleine","Tartre visible","Gencives rouges"]','[{"key":"brushing","label_fr":"Brossage dentaire quotidien","evidence":"proven","score_delta":4,"modifiable":true}]','{}',null,1);

insert into public.food_rules (name_fr, aliases, level, verdict_fr, why_fr, max_g_per_kg, if_eaten_fr) values
('Chocolat', '{chocolat,cacao,brownie,nutella}', 'emergency', 'Non, jamais', 'La théobromine est toxique pour le chien ; plus le chocolat est noir, plus c''est dangereux, et un teckel est petit.', null, 'Notez l''heure, le type et la quantité. Appelez un vétérinaire ou le centre antipoison animal (CAPAE Ouest : 02 40 68 77 40) sans attendre les symptômes.'),
('Raisin', '{raisin,raisins secs,"raisin sec"}', 'emergency', 'Non, jamais', 'Peut provoquer une insuffisance rénale aiguë, même en petite quantité, sans dose seuil connue.', null, 'Appelez un vétérinaire immédiatement, même pour quelques grains.'),
('Oignon', '{oignon,ail,échalote,poireau,ciboulette}', 'emergency', 'Non', 'Les alliacés détruisent les globules rouges ; les effets apparaissent plusieurs jours après.', null, 'Appelez un vétérinaire si la quantité dépasse une cuillère à soupe pour un petit chien.'),
('Xylitol', '{xylitol,"chewing-gum",édulcorant,"beurre de cacahuète light"}', 'emergency', 'Non, jamais', 'Chute brutale du sucre sanguin et atteinte du foie, en quelques minutes.', null, 'Urgence vétérinaire immédiate.'),
('Os cuits', '{"os cuit","os de poulet","os de lapin"}', 'emergency', 'Non', 'Les os cuits se brisent en esquilles et peuvent perforer.', null, 'Surveillez vomissements, abattement, sang dans les selles ; consultez au moindre signe.'),
('Avocat', '{avocat,guacamole}', 'watch', 'À éviter', 'La persine irrite le tube digestif ; le noyau est un risque d''occlusion.', null, 'Une petite quantité de chair : surveillez 24 h.'),
('Fromage', '{fromage,comté,emmental,camembert}', 'watch', 'Un tout petit morceau, rarement', 'Gras et salé ; beaucoup de chiens digèrent mal le lactose.', 1, null),
('Pain', '{pain,baguette,croûte}', 'watch', 'Un petit bout, sans habitude', 'Calories vides ; la pâte crue est dangereuse.', 2, null),
('Carotte', '{carotte}', 'none', 'Oui', 'Peu calorique, bonne à mâcher, crue ou cuite.', 10, null),
('Pomme', '{pomme}', 'none', 'Oui, sans pépins ni trognon', 'Les pépins contiennent des traces de cyanure ; la chair est sans danger.', 8, null),
('Courgette', '{courgette}', 'none', 'Oui', 'Légume idéal pour un chien qui doit perdre du poids.', 15, null),
('Poulet cuit', '{poulet,blanc de poulet,dinde}', 'none', 'Oui, nature et sans os', 'Protéine maigre ; jamais d''os, jamais assaisonné.', 10, null),
('Banane', '{banane}', 'none', 'Oui, en petite quantité', 'Sucrée : quelques rondelles, pas plus.', 5, null),
('Fraise', '{fraise,framboise,myrtille}', 'none', 'Oui', 'Sans danger, peu caloriques.', 8, null),
('Jambon', '{jambon,charcuterie,saucisson}', 'watch', 'À éviter', 'Très salé et gras ; risque de pancréatite chez un petit chien.', null, null),
('Noix de macadamia', '{macadamia}', 'emergency', 'Non', 'Toxique : faiblesse des pattes arrière, tremblements, fièvre.', null, 'Consultez un vétérinaire dans la journée.');

-- Semaine 1 du plan teckel (une carte par jour). Semaines 2 à 4 : à compléter avec le vétérinaire.
insert into public.lessons (breed_id, week, day, type, title_fr, body_fr, check_question_fr, check_answers, evidence, score_delta, source_url) values
('dachshund',1,1,'lesson','Pourquoi le dos du teckel est différent',
 'Le teckel a été sélectionné pour un corps long sur des pattes courtes. Ce profil s''accompagne d''une particularité des disques intervertébraux, qui vieillissent plus tôt que chez les autres chiens. Résultat : environ un teckel sur quatre connaîtra une hernie discale, le plus souvent entre 4 et 8 ans. Ce n''est pas une fatalité : le poids, l''activité régulière et la rapidité de réaction aux premiers signes changent l''issue. Cette semaine, vous apprenez à connaître son dos.',
 'À quel âge le risque est-il le plus élevé ?', '[{"label":"Avant 2 ans","correct":false},{"label":"Entre 4 et 8 ans","correct":true},{"label":"Après 10 ans","correct":false}]', 'proven', 2, 'https://dachshund-ivdd.uk/what-is-ivdd/how-common-is-ivdd'),
('dachshund',1,2,'weigh','La première pesée',
 'Montez sur votre balance avec votre teckel dans les bras, puis sans lui : la différence est son poids. Notez-le dans l''app. On recommence chaque dimanche : une courbe vaut mieux qu''un chiffre, et le poids est le levier numéro un que vous contrôlez.',
 null, null, 'probable', 3, null),
('dachshund',1,3,'lesson','Les 5 signes qui ne doivent jamais attendre',
 'Dos voûté ou raide. Refus soudain de sauter ou de monter. Tremblements et halètement sans effort. Cri quand on le porte. Démarche hésitante des pattes arrière. Un seul de ces signes chez un teckel : repos strict dans une pièce fermée ou une cage, aucun escalier, pas de manipulation du dos, vétérinaire sous 24 heures. Si les pattes arrière faiblissent, c''est immédiatement.',
 'Il refuse de sauter sur le canapé et tremble. Vous faites quoi ?', '[{"label":"J''attends de voir demain","correct":false},{"label":"Repos strict et vétérinaire sous 24 h","correct":true},{"label":"Je le fais courir pour vérifier","correct":false}]', 'common_opinion', 4, null),
('dachshund',1,4,'gesture','Harnais plutôt que collier',
 'Un harnais en Y qui dégage les épaules répartit la traction sur le poitrail au lieu du cou. Vérifiez qu''il ne frotte pas sous les pattes avant et que deux doigts passent sous les sangles. Ce n''est pas une preuve scientifique pour le dos, mais un consensus pour le cou et la trachée, et un confort réel pour un chien long.',
 null, null, 'common_opinion', 4, null),
('dachshund',1,5,'lesson','Les escaliers : ce que dit vraiment la science',
 'Tout le monde interdit les escaliers aux teckels. La seule grande étude sur le sujet (2 000 chiens, 2018) a trouvé l''inverse de ce qu''on attendait : les chiens à qui on interdisait les sauts avaient plus de hernies, parce que les maîtres avaient changé les règles après le diagnostic. Il n''y a pas de preuve que les escaliers provoquent la hernie. Par prudence, on évite les sauts depuis une hauteur et les sols glissants ; on n''a pas besoin de porter un teckel en pleine forme à chaque marche.',
 'Les escaliers provoquent-ils la hernie discale ?', '[{"label":"Oui, c''est prouvé","correct":false},{"label":"Aucune preuve ; prudence sur les sauts en hauteur","correct":true}]', 'myth', 2, 'https://link.springer.com/content/pdf/10.1186/s40575-018-0067-7.pdf'),
('dachshund',1,6,'check','Comment vous le portez',
 'Une main sous le poitrail, l''autre sous l''arrière-train, le dos horizontal. Jamais sous les aisselles seules : le dos pend et se plie. Montrez le geste à toute la famille, enfants compris.',
 'Qui porte votre teckel à la maison ? Tout le monde connaît le geste ?', '[{"label":"Oui","correct":true},{"label":"Pas encore","correct":false}]', 'common_opinion', 2, null),
('dachshund',1,7,'weigh','La pesée du dimanche',
 'Deuxième pesée. Si le chiffre bouge de plus de 300 g en une semaine chez un teckel nain, on regarde la ration. La zone cible de sa variété est affichée sur la courbe.',
 null, null, 'probable', 3, null);

insert into public.season_alerts (key, title_fr, body_fr, trigger) values
('heat', 'Chaleur demain', '{temp} °C annoncés : balades avant 9 h et après 20 h, pas de bitume chaud (testez 5 secondes avec la main), eau partout, jamais dans une voiture.', '{"type":"temp_gt","value":28}'),
('easter_chocolate', 'Pâques : le chocolat', 'Le chocolat est toxique pour {dog}. Les œufs cachés au jardin aussi. S''il en avale : notez l''heure et la quantité, appelez un vétérinaire sans attendre les symptômes.', '{"type":"date","from":"03-25","to":"04-25"}'),
('christmas_food', 'Noël : la table', 'Chocolat, raisins secs, os de volaille, foie gras : {dog} n''en a pas besoin. Une carotte crue fait un très bon cadeau.', '{"type":"date","from":"12-15","to":"12-31"}'),
('processionary', 'Chenilles processionnaires', 'De mars à mai, les chenilles descendent des pins. Contact avec la langue = urgence (gonflement, bave). Évitez les pinèdes et surveillez le sol.', '{"type":"date","from":"03-01","to":"05-31"}'),
('ticks', 'Saison des tiques', 'Printemps et automne : vérifiez oreilles, cou et aisselles après chaque sortie en herbe ; antiparasitaire à jour dans le carnet.', '{"type":"date","from":"03-15","to":"06-15"}'),
('fireworks', 'Feux d''artifice ce soir', 'Rentrez {dog} avant la nuit, fermez volets et fenêtres, musique douce, et ne le grondez pas s''il a peur.', '{"type":"date","from":"07-13","to":"07-14"}');

-- 0002 — Balades (activité). Résumés uniquement : jamais de trace GPS.

-- ---------- Balades ----------
create table public.walks (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_s integer not null check (duration_s >= 0 and duration_s < 86400),
  distance_m integer not null default 0 check (distance_m >= 0 and distance_m < 200000),
  steps_est integer not null default 0 check (steps_est >= 0),
  source text not null default 'gps' check (source in ('gps','manual','timer')),
  note text check (char_length(note) <= 280),
  created_at timestamptz not null default now()
);
create index walks_dog_started on public.walks (dog_id, started_at desc);
alter table public.walks enable row level security;
create policy "walks: owners" on public.walks for all
  using (public.owns_dog(dog_id)) with check (public.owns_dog(dog_id));


-- Export RGPD des balades
create or replace function public.export_my_walks() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'walks', coalesce((select jsonb_agg(w) from public.walks w where public.owns_dog(w.dog_id)), '[]'::jsonb)
  );
$$;
grant execute on function public.export_my_walks() to authenticated;
