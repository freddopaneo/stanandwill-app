/**
 * Synchronisation du chien local vers Supabase (après création de compte).
 * Utilise la RPC atomique `create_dog` (migration 0001) : insère le chien, le lien propriétaire et le poids initial.
 */
import { supabase, supabaseConfigured } from "./supabase";
import type { Dog } from "./store";
import type { WalkSummary } from "@stanandwill/core";

export async function syncDogToCloud(dog: Dog, premium: boolean): Promise<string | null> {
  if (!supabaseConfigured) return null;
  if (!dog.id.startsWith("local-")) return dog.id; // déjà en base
  const payload = {
    name: dog.name, breed_id: dog.breed_id, variety: dog.variety ?? null, size: dog.size ?? null,
    sex: dog.sex ?? null, neutered: dog.neutered, neuter_age: dog.neuter_age ?? null, birth_month: dog.birth_month ?? null,
    silhouette: dog.silhouette ?? null, activity: dog.activity ?? null, conditions: dog.conditions ?? [],
    insurance: dog.insurance ?? null, main_worry: dog.main_worry ?? null,
    weight_kg: dog.weightKg != null ? String(dog.weightKg) : "",
  };
  const { data, error } = await supabase.rpc("create_dog", { payload });
  if (error) throw error;
  // Le statut d'abonnement réel (profiles.subscription_status) est écrit par le webhook RevenueCat côté serveur,
  // jamais par l'app : `premium` local ne sert qu'à l'expérience immédiate avant la première synchro.
  void premium;
  return data as string;
}

/** Enregistre le résumé d'une balade (table `walks`, migration 0002). Silencieux hors connexion. */
export async function pushWalkToCloud(dogId: string, w: WalkSummary): Promise<void> {
  if (!supabaseConfigured) return;
  const { error } = await supabase.from("walks").insert({
    dog_id: dogId, started_at: w.startedAt, ended_at: w.endedAt, duration_s: w.durationS,
    distance_m: w.distanceM, steps_est: w.stepsEst, source: w.source, note: w.note ?? null,
  });
  if (error) throw error;
}
