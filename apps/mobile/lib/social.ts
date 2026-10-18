/**
 * Copains de balade — couche données Supabase (migration 0002).
 * Confidentialité : la position est arrondie à 2 décimales (≈ 1 km) AVANT d'être envoyée ;
 * seuls les profils `visible` sont renvoyés par la RPC `nearby_walk_profiles`.
 */
import { supabase, supabaseConfigured } from "./supabase";
import { sizeClass, ageMonthsFrom } from "@stanandwill/core";
import type { Dog } from "./store";

export type Slot = "morning" | "noon" | "evening" | "weekend";
export const SLOTS: { id: Slot; label: string }[] = [
  { id: "morning", label: "Matin" }, { id: "noon", label: "Midi" }, { id: "evening", label: "Soir" }, { id: "weekend", label: "Week-end" },
];
export const TEMPERAMENTS: { id: string; label: string }[] = [
  { id: "calm", label: "Calme" }, { id: "playful", label: "Joueur" }, { id: "shy", label: "Timide" },
  { id: "sociable", label: "Sociable" }, { id: "reactive_dogs", label: "Réactif aux chiens" }, { id: "ok_puppies", label: "OK chiots" },
];

export interface WalkProfile {
  user_id: string; display_name: string; bio: string | null; city: string | null;
  lat_approx: number | null; lng_approx: number | null; radius_km: number; slots: Slot[]; visible: boolean;
}
export interface NearbyDog { dog_id: string; name: string; breed_id: string; size_class: string; sex: string | null; age_band: string | null; temperament: string[] }
export interface Nearby {
  user_id: string; display_name: string; bio: string | null; city: string | null; distance_km: number; slots: Slot[];
  dogs: NearbyDog[]; friend_status: "pending" | "accepted" | "declined" | "blocked" | null;
}
export interface WalkRequest { id: string; from_user: string; to_user: string; message: string | null; status: string; created_at: string; from_name?: string; to_name?: string }
export interface Meetup { id: string; host_user: string; title: string; place_label: string; starts_at: string; open_to: "friends" | "nearby"; max_dogs: number | null; going?: number; mine?: boolean; joined?: boolean }

export const roundCoord = (v: number) => Math.round(v * 100) / 100;

/** Position approximative actuelle (arrondie) + ville, via expo-location. null si refusé. */
export async function approximateLocation(): Promise<{ lat: number; lng: number; city: string | null } | null> {
  try {
    const L = await import("expo-location");
    const perm = await L.requestForegroundPermissionsAsync();
    if (perm.status !== "granted") return null;
    const pos = await L.getCurrentPositionAsync({ accuracy: L.Accuracy.Low });
    let city: string | null = null;
    try { const g = await L.reverseGeocodeAsync(pos.coords); city = g[0]?.city ?? g[0]?.subregion ?? null; } catch {}
    return { lat: roundCoord(pos.coords.latitude), lng: roundCoord(pos.coords.longitude), city };
  } catch { return null; }
}

export async function getMyProfile(): Promise<WalkProfile | null> {
  if (!supabaseConfigured) return null;
  const { data } = await supabase.from("walk_profiles").select("*").maybeSingle();
  return (data as WalkProfile | null) ?? null;
}

export async function saveProfile(p: Omit<WalkProfile, "user_id">): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Connexion requise");
  const { error } = await supabase.from("walk_profiles").upsert({ user_id: u.user.id, ...p, updated_at: new Date().toISOString() });
  if (error) throw error;
}

/** Publie (ou retire) la fiche publique d'un chien. Le chien doit déjà être synchronisé (id cloud). */
export async function publishDog(dog: Dog, temperament: string[], visible = true): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Connexion requise");
  if (dog.id.startsWith("local-")) throw new Error("Ce chien n'est pas encore synchronisé");
  const age = ageMonthsFrom(dog.birth_month ?? undefined);
  const { error } = await supabase.from("walk_dogs").upsert({
    dog_id: dog.id, user_id: u.user.id, public_name: dog.name, breed_id: dog.breed_id,
    size_class: sizeClass({ breedId: dog.breed_id, size: dog.size, weightKg: dog.weightKg }),
    sex: dog.sex ?? null, age_band: age == null ? null : age < 12 ? "puppy" : age >= 108 ? "senior" : "adult",
    temperament, visible,
  });
  if (error) throw error;
}

export async function myPublishedDogs(): Promise<Record<string, { visible: boolean; temperament: string[] }>> {
  const { data } = await supabase.from("walk_dogs").select("dog_id, visible, temperament");
  const out: Record<string, { visible: boolean; temperament: string[] }> = {};
  (data ?? []).forEach((d: any) => { out[d.dog_id] = { visible: d.visible, temperament: d.temperament ?? [] }; });
  return out;
}

export async function nearby(radiusKm: number): Promise<Nearby[]> {
  const { data, error } = await supabase.rpc("nearby_walk_profiles", { radius_km: radiusKm });
  if (error) throw error;
  return (data ?? []) as Nearby[];
}

export async function sendRequest(toUser: string, message: string): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Connexion requise");
  const { error } = await supabase.from("walk_requests").insert({ from_user: u.user.id, to_user: toUser, message: message.slice(0, 200) || null });
  if (error) throw error;
}

export async function respondRequest(id: string, status: "accepted" | "declined" | "blocked"): Promise<void> {
  const { error } = await supabase.from("walk_requests").update({ status, responded_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

/** Demandes reçues/envoyées, avec le prénom public de l'autre partie. */
export async function listRequests(): Promise<{ me: string; items: WalkRequest[] }> {
  const { data: u } = await supabase.auth.getUser();
  const me = u.user?.id ?? "";
  const { data } = await supabase.from("walk_requests").select("*").order("created_at", { ascending: false });
  const items = (data ?? []) as WalkRequest[];
  const ids = Array.from(new Set(items.flatMap((r) => [r.from_user, r.to_user])));
  if (ids.length) {
    const { data: names } = await supabase.rpc("linked_display_names");
    const map: Record<string, string> = {};
    (names ?? []).forEach((n: any) => { map[n.user_id] = n.display_name; });
    items.forEach((r) => { r.from_name = map[r.from_user] ?? "Un maître"; r.to_name = map[r.to_user] ?? "Un maître"; });
  }
  return { me, items };
}

export async function listMeetups(): Promise<Meetup[]> {
  const { data: u } = await supabase.auth.getUser();
  const me = u.user?.id;
  const { data } = await supabase.from("walk_meetups").select("*, walk_meetup_members(user_id, status)").gte("starts_at", new Date(Date.now() - 3600_000).toISOString()).order("starts_at");
  return ((data ?? []) as any[]).map((m) => ({
    id: m.id, host_user: m.host_user, title: m.title, place_label: m.place_label, starts_at: m.starts_at, open_to: m.open_to, max_dogs: m.max_dogs,
    going: (m.walk_meetup_members ?? []).filter((x: any) => x.status === "going").length,
    mine: m.host_user === me, joined: (m.walk_meetup_members ?? []).some((x: any) => x.user_id === me && x.status === "going"),
  }));
}

export async function createMeetup(m: { title: string; place_label: string; starts_at: string; open_to: "friends" | "nearby"; lat?: number | null; lng?: number | null }): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Connexion requise");
  const { data, error } = await supabase.from("walk_meetups").insert({ host_user: u.user.id, title: m.title, place_label: m.place_label, starts_at: m.starts_at, open_to: m.open_to, lat_approx: m.lat ?? null, lng_approx: m.lng ?? null }).select("id").single();
  if (error) throw error;
  await supabase.from("walk_meetup_members").upsert({ meetup_id: data.id, user_id: u.user.id, status: "going" });
}

export async function joinMeetup(id: string, going: boolean): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Connexion requise");
  const { error } = await supabase.from("walk_meetup_members").upsert({ meetup_id: id, user_id: u.user.id, status: going ? "going" : "left" });
  if (error) throw error;
}

export async function reportUser(reported: string, reason: "spam" | "harassment" | "fake" | "other", details?: string): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Connexion requise");
  await supabase.from("walk_reports").insert({ reporter: u.user.id, reported, reason, details: details ?? null });
}
