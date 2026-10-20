/**
 * Carnet cloud — moteur de synchronisation téléphone ↔ Supabase (migration 0004 requise).
 *
 * - `pushRecord` envoie un chien et ses nouveautés (profil, pesées, événements, balades) et répercute les suppressions.
 *   Tout est idempotent (upsert sur dog_id + client_id) : un envoi interrompu peut être rejoué sans doublon.
 * - `pullAll` récupère les carnets du compte (nouveau téléphone, réinstallation) ; la fusion se fait dans le store.
 * - Aucune trace GPS : les balades ne sont que des résumés (durée, distance, pas).
 */
import { supabase, supabaseConfigured } from "./supabase";
import type { Dog, DogRecord, HealthEvent, WeightEntry } from "./store";
import { dayKey, pending, stableHash, emptySyncState, type SyncState, type WalkSummary } from "@stanandwill/core";

export const weightId = (w: WeightEntry) => w.id ?? "wt-" + w.date;

/** Champs du profil envoyés au serveur (sans la photo, qui reste sur le téléphone en v1). */
export function dogPayload(dog: Dog) {
  return {
    name: dog.name, breed_id: dog.breed_id, variety: dog.variety ?? null, size: dog.size ?? null,
    sex: dog.sex ?? null, neutered: dog.neutered, neuter_age: dog.neuter_age ?? null, birth_month: dog.birth_month ?? null,
    silhouette: dog.silhouette ?? null, activity: dog.activity ?? null, conditions: dog.conditions ?? [],
    insurance: dog.insurance ?? null, main_worry: dog.main_worry ?? null,
  };
}

/** Résultat d'un envoi, appliqué ensuite au store (sans écraser ce qui a changé entre-temps). */
export interface PushDelta {
  dogId: string;
  cloudId?: string;
  profileHash?: string;
  pushedAdd: { weights: string[]; events: string[]; walks: string[] };
  deletesDone: { walks: string[]; events: string[] };
  error?: string;
}

const CHUNK = 200;
async function upsertChunks(table: string, rows: Record<string, unknown>[]) {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await supabase.from(table).upsert(rows.slice(i, i + CHUNK), { onConflict: "dog_id,client_id", ignoreDuplicates: true });
    if (error) throw error;
  }
}

export async function isSignedIn(): Promise<boolean> {
  if (!supabaseConfigured) return false;
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session);
}

/** Envoie un chien et ses nouveautés. Ne lève jamais : l'erreur est renvoyée dans le delta. */
export async function pushRecord(r: DogRecord): Promise<PushDelta> {
  const st: SyncState = r.sync ?? emptySyncState();
  const delta: PushDelta = { dogId: r.dog.id, pushedAdd: { weights: [], events: [], walks: [] }, deletesDone: { walks: [], events: [] } };
  try {
    const profile = dogPayload(r.dog);
    const hash = stableHash(profile);
    let cloudId = st.cloudId;

    // 1. Le chien lui-même (création idempotente grâce à client_id = identifiant local)
    if (!cloudId) {
      const { data, error } = await supabase.rpc("create_dog", { payload: { ...profile, client_id: r.dog.id } });
      if (error) throw error;
      cloudId = data as string;
      delta.cloudId = cloudId; delta.profileHash = hash;
    } else if (st.profileHash !== hash) {
      const { error } = await supabase.from("dogs").update(profile).eq("id", cloudId);
      if (error) throw error;
      delta.profileHash = hash;
    }

    // 2. Suppressions en attente
    if (st.deletes.walks.length) {
      const { error } = await supabase.from("walks").delete().eq("dog_id", cloudId).in("client_id", st.deletes.walks);
      if (error) throw error;
      delta.deletesDone.walks = [...st.deletes.walks];
    }
    if (st.deletes.events.length) {
      const { error } = await supabase.from("health_events").delete().eq("dog_id", cloudId).in("client_id", st.deletes.events);
      if (error) throw error;
      delta.deletesDone.events = [...st.deletes.events];
    }

    // 3. Nouveautés
    const ws = pending(r.weights, st.pushed.weights, weightId);
    if (ws.length) {
      await upsertChunks("weights", ws.map((w) => ({ dog_id: cloudId, client_id: weightId(w), kg: w.kg, measured_at: dayKey(w.date), measured_ts: w.date })));
      delta.pushedAdd.weights = ws.map(weightId);
    }
    const es = pending(r.events, st.pushed.events, (e) => e.id);
    if (es.length) {
      await upsertChunks("health_events", es.map((e) => ({ dog_id: cloudId, client_id: e.id, kind: e.kind, label: e.title, done_at: dayKey(e.date), done_ts: e.date, notes: e.note ?? null })));
      delta.pushedAdd.events = es.map((e) => e.id);
    }
    const ks = pending(r.walks ?? [], st.pushed.walks, (w) => w.id);
    if (ks.length) {
      await upsertChunks("walks", ks.map((w) => ({
        dog_id: cloudId, client_id: w.id, started_at: w.startedAt, ended_at: w.endedAt, duration_s: w.durationS,
        distance_m: Math.min(w.distanceM, 199999), steps_est: w.stepsEst, source: w.source, note: w.note ?? null,
      })));
      delta.pushedAdd.walks = ks.map((w) => w.id);
    }
  } catch (e: any) {
    delta.error = e?.message ?? String(e);
  }
  return delta;
}

/** Archive le chien côté serveur (retiré du foyer). Silencieux hors connexion. */
export async function archiveCloudDog(cloudId: string): Promise<void> {
  await supabase.from("dogs").update({ archived_at: new Date().toISOString() }).eq("id", cloudId);
}

// ——— Récupération (nouveau téléphone) ———

export interface RemoteRecord {
  cloudId: string;
  dog: Dog;
  weights: WeightEntry[];
  events: HealthEvent[];
  walks: WalkSummary[];
}

const EVENT_KINDS = new Set(["vaccine", "deworm", "vet", "symptom", "gesture", "note"]);
const noon = (d: string) => `${d}T12:00:00`;

/** Récupère tous les chiens actifs du compte avec leur carnet. Renvoie null hors connexion ou en cas d'erreur. */
export async function pullAll(): Promise<RemoteRecord[] | null> {
  if (!(await isSignedIn())) return null;
  const { data, error } = await supabase
    .from("dogs")
    .select("id, client_id, name, breed_id, variety, size, sex, neutered, neuter_age, birth_month, silhouette, activity, conditions, insurance, main_worry, " +
      "weights(id, client_id, kg, measured_at, measured_ts), health_events(id, client_id, kind, label, done_at, done_ts, notes), " +
      "walks(id, client_id, started_at, ended_at, duration_s, distance_m, steps_est, source, note)")
    .is("archived_at", null)
    .order("created_at");
  if (error || !data) return null;
  return (data as any[]).map((d) => {
    const weights: WeightEntry[] = (d.weights ?? []).map((w: any) => ({ id: w.client_id ?? "srv-" + w.id, date: w.measured_ts ?? noon(w.measured_at), kg: Number(w.kg) }))
      .sort((a: WeightEntry, b: WeightEntry) => a.date.localeCompare(b.date));
    const events: HealthEvent[] = (d.health_events ?? []).map((e: any) => ({
      id: e.client_id ?? "srv-" + e.id, date: e.done_ts ?? noon(e.done_at),
      kind: EVENT_KINDS.has(e.kind) ? e.kind : "note", title: e.label, note: e.notes ?? undefined,
    }));
    const walks: WalkSummary[] = (d.walks ?? []).map((k: any) => ({
      id: k.client_id ?? "srv-" + k.id, dogId: d.client_id ?? d.id, startedAt: k.started_at, endedAt: k.ended_at,
      durationS: k.duration_s, distanceM: k.distance_m, stepsEst: k.steps_est, source: k.source, note: k.note,
    }));
    const dog: Dog = {
      id: d.client_id ?? "cloud-" + d.id, name: d.name, breed_id: d.breed_id, variety: d.variety, size: d.size, sex: d.sex,
      neutered: d.neutered ?? "unknown", neuter_age: d.neuter_age, birth_month: d.birth_month, silhouette: d.silhouette,
      activity: d.activity, conditions: d.conditions ?? [], insurance: d.insurance, main_worry: d.main_worry,
      weightKg: weights.length ? weights[weights.length - 1].kg : null,
    };
    return { cloudId: d.id, dog, weights, events, walks };
  });
}
