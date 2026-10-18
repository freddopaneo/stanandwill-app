-- 0002 — Balades (activité) et Copains de balade (social de proximité)
-- Principes : RLS partout ; la position des maîtres n'est JAMAIS stockée précisément
-- (arrondie à ~1 km, 2 décimales) et n'est visible que des membres opt-in.

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

-- ---------- Copains de balade ----------
-- Profil public du maître : uniquement ce qu'il choisit de montrer.
create table public.walk_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 24),
  bio text check (char_length(bio) <= 140),
  -- position arrondie (2 décimales ≈ 1,1 km) : jamais l'adresse
  lat_approx numeric(5,2),
  lng_approx numeric(5,2),
  city text check (char_length(city) <= 60),
  radius_km integer not null default 5 check (radius_km between 1 and 30),
  -- créneaux habituels : 'morning' | 'noon' | 'evening' | 'weekend'
  slots text[] not null default '{}',
  visible boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.walk_profiles enable row level security;
create policy "walk_profiles: self" on public.walk_profiles for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Fiche publique de chaque chien proposé aux copains (opt-in par chien).
create table public.walk_dogs (
  dog_id uuid primary key references public.dogs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  public_name text not null check (char_length(public_name) between 1 and 24),
  breed_id text not null references public.breeds(id),
  size_class text not null check (size_class in ('toy','small','medium','large')),
  sex public.sex,
  age_band text check (age_band in ('puppy','adult','senior')),
  temperament text[] not null default '{}',  -- 'calm','playful','shy','sociable','reactive_dogs','ok_puppies'
  photo_path text,
  visible boolean not null default true
);
alter table public.walk_dogs enable row level security;
create policy "walk_dogs: owner manages" on public.walk_dogs for all
  using (user_id = auth.uid() and public.owns_dog(dog_id)) with check (user_id = auth.uid() and public.owns_dog(dog_id));

-- Demandes de contact (« coucou »), puis amitié acceptée.
create table public.walk_requests (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references auth.users(id) on delete cascade,
  to_user uuid not null references auth.users(id) on delete cascade,
  message text check (char_length(message) <= 200),
  status text not null default 'pending' check (status in ('pending','accepted','declined','blocked')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (from_user, to_user)
);
alter table public.walk_requests enable row level security;
create policy "walk_requests: parties read" on public.walk_requests for select using (from_user = auth.uid() or to_user = auth.uid());
create policy "walk_requests: send" on public.walk_requests for insert with check (from_user = auth.uid() and from_user <> to_user);
create policy "walk_requests: recipient answers" on public.walk_requests for update using (to_user = auth.uid());
create policy "walk_requests: sender cancels" on public.walk_requests for delete using (from_user = auth.uid() and status = 'pending');

create or replace function public.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.walk_requests r where r.status = 'accepted'
    and ((r.from_user = a and r.to_user = b) or (r.from_user = b and r.to_user = a)));
$$;

-- Rendez-vous de balade proposés entre copains (ou ouverts à proximité).
create table public.walk_meetups (
  id uuid primary key default gen_random_uuid(),
  host_user uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 80),
  place_label text not null check (char_length(place_label) <= 120),  -- « Parc de la Tête d'Or, entrée nord »
  lat_approx numeric(5,2),
  lng_approx numeric(5,2),
  starts_at timestamptz not null,
  open_to text not null default 'friends' check (open_to in ('friends','nearby')),
  max_dogs integer check (max_dogs between 2 and 30),
  created_at timestamptz not null default now()
);
create index walk_meetups_starts on public.walk_meetups (starts_at);
alter table public.walk_meetups enable row level security;
create policy "meetups: host manages" on public.walk_meetups for all using (host_user = auth.uid()) with check (host_user = auth.uid());
create policy "meetups: friends or nearby read" on public.walk_meetups for select
  using (host_user = auth.uid() or public.are_friends(host_user, auth.uid())
         or (open_to = 'nearby' and exists (select 1 from public.walk_profiles p where p.user_id = auth.uid() and p.visible)));

create table public.walk_meetup_members (
  meetup_id uuid not null references public.walk_meetups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'going' check (status in ('going','maybe','left')),
  joined_at timestamptz not null default now(),
  primary key (meetup_id, user_id)
);
alter table public.walk_meetup_members enable row level security;
create policy "members: self" on public.walk_meetup_members for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "members: visible to meetup readers" on public.walk_meetup_members for select
  using (exists (select 1 from public.walk_meetups m where m.id = meetup_id));

-- Signalement / blocage (modération minimale obligatoire pour un espace social).
create table public.walk_reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid not null references auth.users(id) on delete cascade,
  reported uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('spam','harassment','fake','other')),
  details text check (char_length(details) <= 500),
  created_at timestamptz not null default now()
);
alter table public.walk_reports enable row level security;
create policy "reports: insert self" on public.walk_reports for insert with check (reporter = auth.uid());

-- ---------- Recherche de copains à proximité ----------
-- Ne renvoie que des profils visibles, à position arrondie, dans le rayon demandé (max 30 km),
-- avec leurs chiens publics. Jamais d'e-mail, jamais de position exacte.
create or replace function public.nearby_walk_profiles(radius_km integer default 5)
returns table (
  user_id uuid, display_name text, bio text, city text, distance_km numeric, slots text[],
  dogs jsonb, friend_status text
)
language sql stable security definer set search_path = public as $$
  with me as (
    select p.lat_approx, p.lng_approx from public.walk_profiles p where p.user_id = auth.uid() and p.visible and p.lat_approx is not null
  )
  select p.user_id, p.display_name, p.bio, p.city,
    round((6371 * acos(least(1, greatest(-1,
      cos(radians(me.lat_approx)) * cos(radians(p.lat_approx)) * cos(radians(p.lng_approx) - radians(me.lng_approx))
      + sin(radians(me.lat_approx)) * sin(radians(p.lat_approx))))))::numeric, 1) as distance_km,
    p.slots,
    coalesce((select jsonb_agg(jsonb_build_object('dog_id', d.dog_id, 'name', d.public_name, 'breed_id', d.breed_id,
        'size_class', d.size_class, 'sex', d.sex, 'age_band', d.age_band, 'temperament', d.temperament))
      from public.walk_dogs d where d.user_id = p.user_id and d.visible), '[]'::jsonb) as dogs,
    (select r.status from public.walk_requests r
      where (r.from_user = auth.uid() and r.to_user = p.user_id) or (r.from_user = p.user_id and r.to_user = auth.uid())
      limit 1) as friend_status
  from public.walk_profiles p, me
  where p.user_id <> auth.uid() and p.visible and p.lat_approx is not null
    and not exists (select 1 from public.walk_requests b where b.status = 'blocked'
      and ((b.from_user = auth.uid() and b.to_user = p.user_id) or (b.from_user = p.user_id and b.to_user = auth.uid())))
    and 6371 * acos(least(1, greatest(-1,
      cos(radians(me.lat_approx)) * cos(radians(p.lat_approx)) * cos(radians(p.lng_approx) - radians(me.lng_approx))
      + sin(radians(me.lat_approx)) * sin(radians(p.lat_approx))))) <= least(coalesce(radius_km, 5), 30)
  order by distance_km asc
  limit 50;
$$;
grant execute on function public.nearby_walk_profiles(integer) to authenticated;

-- ---------- Export / suppression RGPD : inclure les nouvelles tables ----------
-- (export_my_data et request_account_deletion de 0001 suppriment via cascade sur auth.users / dogs ;
--  on ajoute les balades à l'export.)
create or replace function public.export_my_walks() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'walks', coalesce((select jsonb_agg(w) from public.walks w where public.owns_dog(w.dog_id)), '[]'::jsonb),
    'walk_profile', (select to_jsonb(p) from public.walk_profiles p where p.user_id = auth.uid()),
    'walk_requests', coalesce((select jsonb_agg(r) from public.walk_requests r where r.from_user = auth.uid() or r.to_user = auth.uid()), '[]'::jsonb)
  );
$$;
grant execute on function public.export_my_walks() to authenticated;

-- Prénoms publics des maîtres avec qui j'ai un lien (demande ou amitié) : pour afficher les demandes.
create or replace function public.linked_display_names()
returns table (user_id uuid, display_name text)
language sql stable security definer set search_path = public as $$
  select p.user_id, p.display_name from public.walk_profiles p
  where exists (select 1 from public.walk_requests r
    where (r.from_user = auth.uid() and r.to_user = p.user_id) or (r.to_user = auth.uid() and r.from_user = p.user_id))
  or exists (select 1 from public.walk_meetups m where m.host_user = p.user_id and (public.are_friends(m.host_user, auth.uid()) or m.open_to = 'nearby'));
$$;
grant execute on function public.linked_display_names() to authenticated;
