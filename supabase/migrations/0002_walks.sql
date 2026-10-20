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
