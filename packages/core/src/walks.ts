/**
 * Balades — estimation d'activité du chien (v1).
 *
 * Principe : on mesure la distance de la balade (GPS du téléphone du maître) et on
 * convertit en « pas du chien » selon sa classe de taille. Un petit chien fait
 * beaucoup plus de pas qu'un grand pour la même distance. Les valeurs sont des
 * estimations affichées comme telles (« pas estimés »), jamais une mesure.
 *
 * Sources d'ordre de grandeur : longueur de foulée au pas ≈ 0,8 × hauteur au garrot
 * (biomécanique canine), hauteurs au garrot moyennes par race (standards FCI).
 */

export type SizeClass = "toy" | "small" | "medium" | "large";

export interface WalkInput {
  breedId?: string | null;
  /** variété/taille déclarée dans le quiz (ex. teckel `mini`/`standard`) */
  size?: string | null;
  weightKg?: number | null;
  ageMonths?: number | null;
}

export interface WalkSummary {
  id: string;
  dogId: string;
  startedAt: string;   // ISO
  endedAt: string;     // ISO
  durationS: number;
  distanceM: number;
  stepsEst: number;
  /** gps = distance mesurée ; manual = saisie du maître ; timer = durée seule */
  source: "gps" | "manual" | "timer";
  note?: string | null;
}

/** Hauteur au garrot approximative (cm) par race, utilisée pour la foulée. */
const WITHERS_CM: Record<string, number> = {
  dachshund: 22, french_bulldog: 30, chihuahua: 18, pomeranian: 20, cavalier: 32,
  shih_tzu: 25, yorkshire: 20, jack_russell: 30, beagle: 36, cocker: 39,
  border_collie: 52, labrador: 56, golden: 56, german_shepherd: 60, australian_shepherd: 52,
};

/** Classe de taille : le poids déclaré prime, sinon la race. */
export function sizeClass(i: WalkInput): SizeClass {
  const kg = i.weightKg ?? null;
  if (kg != null && kg > 0) {
    if (kg < 5) return "toy";
    if (kg < 12) return "small";
    if (kg < 26) return "medium";
    return "large";
  }
  const h = WITHERS_CM[i.breedId ?? ""] ?? 40;
  if (h < 22) return "toy";
  if (h < 33) return "small";
  if (h < 50) return "medium";
  return "large";
}

/** Longueur de foulée au pas (m) : 0,8 × hauteur au garrot, ajustée par la classe/poids. */
export function strideM(i: WalkInput): number {
  let h = WITHERS_CM[i.breedId ?? ""] ?? null;
  if (i.breedId === "dachshund" && i.size === "mini") h = 17;
  if (h == null) {
    const c = sizeClass(i);
    h = c === "toy" ? 20 : c === "small" ? 28 : c === "medium" ? 42 : 58;
  }
  return Math.max(0.12, Math.round(h * 0.8) / 100);
}

/** Pas estimés du chien pour une distance donnée. Le chien zigzague : +12 % par rapport au tracé GPS du maître. */
export function estimateSteps(distanceM: number, i: WalkInput): number {
  if (!distanceM || distanceM <= 0) return 0;
  const wander = 1.12;
  return Math.round((distanceM * wander) / strideM(i));
}

/** Distance estimée (m) à partir d'une durée seule, à l'allure « balade en laisse » (3,5 km/h). */
export function distanceFromDuration(durationS: number): number {
  return Math.round((durationS / 3600) * 3500);
}

export interface DailyGoal {
  minutes: number;
  stepsEst: number;
  distanceM: number;
  /** une phrase de contexte, par race / âge */
  note: string;
}

/**
 * Objectif quotidien de balade. Repères vétérinaires courants :
 * chiot ≈ 5 min par mois d'âge, 2 fois/jour ; adulte 45–90 min selon le gabarit ;
 * races brachycéphales : sorties courtes, jamais aux heures chaudes ; teckel : régulier, sans escaliers ni sauts.
 */
export function dailyGoal(i: WalkInput): DailyGoal {
  const age = i.ageMonths ?? 36;
  const c = sizeClass(i);
  let minutes: number;
  let note: string;
  if (age < 12) {
    minutes = Math.min(60, Math.max(10, age * 5 * 2));
    note = `Chiot : environ ${Math.round(minutes / 2)} min, deux fois par jour. Le jeu compte aussi.`;
  } else if (age >= 108) {
    minutes = c === "large" ? 45 : 35;
    note = "Senior : plusieurs sorties courtes valent mieux qu'une longue.";
  } else {
    minutes = c === "toy" ? 35 : c === "small" ? 50 : c === "medium" ? 60 : 75;
    note = c === "large" ? "Adulte de grand gabarit : une vraie sortie active par jour." : "Adulte : une sortie principale plus deux courtes suffisent.";
  }
  if (i.breedId === "french_bulldog") {
    minutes = Math.min(minutes, 40);
    note = "Brachycéphale : sorties courtes et fraîches, jamais entre 12 h et 17 h en été.";
  }
  if (i.breedId === "dachshund") {
    note = age < 12 ? note : "Teckel : marche régulière pour le dos, évitez escaliers et sauts.";
  }
  const distanceM = distanceFromDuration(minutes * 60);
  return { minutes, stepsEst: estimateSteps(distanceM, i), distanceM, note };
}

/** Clé de jour locale (AAAA-MM-JJ) pour regrouper les balades. */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export interface DayStats { day: string; walks: number; durationS: number; distanceM: number; stepsEst: number }

/** Totaux par jour, sur les `days` derniers jours (le plus ancien d'abord), jours vides inclus. */
export function dailyStats(walks: WalkSummary[], days = 7, now = new Date()): DayStats[] {
  const out: DayStats[] = [];
  for (let k = days - 1; k >= 0; k--) {
    const d = new Date(now); d.setDate(d.getDate() - k);
    const key = dayKey(d.toISOString());
    const todays = walks.filter((w) => dayKey(w.startedAt) === key);
    out.push({
      day: key, walks: todays.length,
      durationS: todays.reduce((a, w) => a + w.durationS, 0),
      distanceM: todays.reduce((a, w) => a + w.distanceM, 0),
      stepsEst: todays.reduce((a, w) => a + w.stepsEst, 0),
    });
  }
  return out;
}

/** Série de jours consécutifs (en remontant depuis aujourd'hui) avec au moins une balade. */
export function streakDays(walks: WalkSummary[], now = new Date()): number {
  const keys = new Set(walks.map((w) => dayKey(w.startedAt)));
  let n = 0;
  const d = new Date(now);
  while (keys.has(dayKey(d.toISOString()))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

export function fmtDuration(s: number): string {
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;
}

export function fmtDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1).replace(".", ",")} km`;
}

/** Distance haversine entre deux points GPS (m). */
export function haversineM(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const R = 6371000, toR = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * toR, dLon = (b.longitude - a.longitude) * toR;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * toR) * Math.cos(b.latitude * toR) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Accumule une trace GPS en distance, en filtrant le bruit : points imprécis (> 30 m) ignorés,
 * micro-déplacements (< 4 m) ignorés, sauts irréalistes (> 6 m/s) ignorés.
 */
export function accumulateDistance(points: { latitude: number; longitude: number; accuracy?: number | null; t: number }[]): number {
  let total = 0;
  let last: (typeof points)[number] | null = null;
  for (const p of points) {
    if (p.accuracy != null && p.accuracy > 30) continue;
    if (!last) { last = p; continue; }
    const d = haversineM(last, p);
    const dt = Math.max(0.001, (p.t - last.t) / 1000);
    if (d < 4) continue;
    if (d / dt > 6) { last = p; continue; }
    total += d; last = p;
  }
  return Math.round(total);
}
