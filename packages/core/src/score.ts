/**
 * Stan & Will — moteur du score de vigilance (v1).
 * Pur, sans dépendance : tourne côté serveur et côté app (calcul local de secours).
 * Référence : cahier des charges v1, section « Le score de vigilance ».
 */

export type Evidence = "proven" | "probable" | "common_opinion" | "myth" | "unproven";

export interface BreedProfile {
  id: string;
  baseScore: number; // teckel 70, générique 72
  riskWindow?: { fromMonths: number; toMonths: number; penalty: number } | null;
  /** pénalité hors fenêtre pour une race à risque identifié (teckel : 4) */
  outOfWindowPenalty?: number;
  varietyModifiers?: Record<string, number>; // { smooth: -4, long: -2, wire: 0 }
  weightRef?: Record<string, { male: [number, number]; female: [number, number] }>;
}

export interface DogInput {
  breed: BreedProfile;
  variety?: string | null;
  size?: string | null;
  sex?: "male" | "female" | null;
  ageMonths: number | null;
  neutered: "yes" | "no" | "unknown";
  neuterAge?: "before_12m" | "after_12m" | "unknown" | null;
  weightKg?: number | null;
  silhouette?: "very_thin" | "thin" | "ideal" | "round" | "very_round" | null;
  activity?: "lt30" | "30_60" | "60_120" | "gt120" | null;
  conditions: string[]; // 'back' | 'dental' | 'overweight' | 'skin'
  /** gestes validés dans l'app : clés de facteurs */
  gestures?: string[]; // 'harness' | 'no_high_jumps' | 'knows_signs' | 'brushing'
  /** jours actifs consécutifs */
  streakDays?: number;
  /** carnet à jour (vaccins + vermifuge non échus) */
  recordsUpToDate?: boolean;
  /** jours depuis la dernière pesée */
  daysSinceWeigh?: number | null;
}

export interface ScoreComponent {
  key: string;
  label: string;
  delta: number;
  modifiable: boolean;
  evidence?: Evidence;
}

export interface ScoreResult {
  score: number;
  components: ScoreComponent[];
  algoVersion: string;
  mode: "prevention" | "post_episode";
}

export const ALGO_VERSION = "v1.0";
const MIN = 10;
const MAX = 98;

function clamp(n: number) {
  return Math.max(MIN, Math.min(MAX, Math.round(n)));
}

/** Zone de poids de référence pour la variété/sexe, si connue. */
export function weightZone(d: DogInput): [number, number] | null {
  const ref = d.breed.weightRef;
  if (!ref) return null;
  const size = d.size && ref[d.size] ? d.size : Object.keys(ref)[0];
  if (!size) return null;
  const bySex = ref[size];
  if (!bySex) return null;
  const sex = d.sex ?? "male";
  return bySex[sex] ?? null;
}

/** Classe la silhouette à partir du poids quand la zone est connue (sinon renvoie la silhouette déclarée). */
export function effectiveSilhouette(d: DogInput): DogInput["silhouette"] {
  const zone = weightZone(d);
  if (d.weightKg && zone) {
    const [lo, hi] = zone;
    if (d.weightKg < lo * 0.85) return "very_thin";
    if (d.weightKg < lo) return "thin";
    if (d.weightKg <= hi) return "ideal";
    if (d.weightKg <= hi * 1.15) return "round";
    return "very_round";
  }
  return d.silhouette ?? null;
}

export function computeScore(d: DogInput): ScoreResult {
  const c: ScoreComponent[] = [];
  let s = d.breed.baseScore;
  c.push({ key: "base", label: "Point de départ de la race", delta: d.breed.baseScore, modifiable: false });

  // Fenêtre d'âge
  const w = d.breed.riskWindow;
  if (w && d.ageMonths != null) {
    if (d.ageMonths >= w.fromMonths && d.ageMonths <= w.toMonths) {
      s -= w.penalty;
      c.push({ key: "age_window", label: "Dans la fenêtre d'âge à risque (4 à 8 ans)", delta: -w.penalty, modifiable: false, evidence: "proven" });
    } else if (d.breed.outOfWindowPenalty) {
      s -= d.breed.outOfWindowPenalty;
      c.push({ key: "age_out", label: "Race à risque, hors fenêtre d'âge", delta: -d.breed.outOfWindowPenalty, modifiable: false, evidence: "proven" });
    }
  }

  // Variété
  const vm = d.variety && d.breed.varietyModifiers ? d.breed.varietyModifiers[d.variety] ?? 0 : 0;
  if (vm) {
    s += vm;
    c.push({ key: "variety", label: "Variété de poil", delta: vm, modifiable: false, evidence: "proven" });
  }

  // Poids / silhouette
  const sil = effectiveSilhouette(d);
  const weightDelta = sil === "ideal" ? 15 : sil === "thin" ? 8 : sil === "very_thin" ? 0 : sil === "round" ? -8 : sil === "very_round" ? -15 : 0;
  if (sil) {
    s += weightDelta;
    c.push({ key: "weight", label: "Poids et silhouette", delta: weightDelta, modifiable: true, evidence: "probable" });
  }
  if (d.daysSinceWeigh != null && d.daysSinceWeigh <= 14) {
    s += 3;
    c.push({ key: "weigh_recent", label: "Pesée de moins de 14 jours", delta: 3, modifiable: true });
  }

  // Stérilisation précoce (information, non modifiable)
  if (d.neutered === "yes" && d.neuterAge === "before_12m") {
    s -= 6;
    c.push({ key: "neuter_early", label: "Stérilisation avant 12 mois", delta: -6, modifiable: false, evidence: "proven" });
  }

  // Activité
  const act = d.activity === "30_60" || d.activity === "60_120" ? 8 : d.activity === "lt30" ? -4 : 0;
  if (d.activity) {
    s += act;
    c.push({ key: "activity", label: "Activité quotidienne", delta: act, modifiable: true, evidence: "probable" });
  }

  // Gestes validés (max +12)
  const gestureValues: Record<string, { label: string; evidence: Evidence }> = {
    harness: { label: "Harnais plutôt que collier", evidence: "common_opinion" },
    no_high_jumps: { label: "Pas de sauts depuis une hauteur", evidence: "probable" },
    knows_signs: { label: "Connaît les 5 signes d'alerte", evidence: "common_opinion" },
  };
  let g = 0;
  for (const k of d.gestures ?? []) {
    if (gestureValues[k] && g < 12) {
      g += 4;
      c.push({ key: `gesture_${k}`, label: gestureValues[k].label, delta: 4, modifiable: true, evidence: gestureValues[k].evidence });
    }
  }
  s += g;

  // Suivi dans l'app (max +10)
  const streak = Math.min(6, Math.floor((d.streakDays ?? 0) / 5)); // +1 par tranche de 5 jours, max 6
  if (streak) {
    s += streak;
    c.push({ key: "streak", label: "Régularité dans l'app", delta: streak, modifiable: true });
  }
  if (d.recordsUpToDate) {
    s += 4;
    c.push({ key: "records", label: "Carnet à jour", delta: 4, modifiable: true });
  }

  // Antécédents
  let mode: ScoreResult["mode"] = "prevention";
  if (d.conditions.includes("back")) {
    s -= 10;
    mode = "post_episode";
    c.push({ key: "history_back", label: "Antécédent de problème de dos", delta: -10, modifiable: false });
  }

  return { score: clamp(s), components: c, algoVersion: ALGO_VERSION, mode };
}

/** Phrase d'explication d'une variation entre deux scores. */
export function explainDelta(prev: ScoreResult | null, next: ScoreResult): string {
  if (!prev) return `Score de départ : ${next.score}.`;
  const diff = next.score - prev.score;
  if (diff === 0) return "Score stable.";
  const prevMap = new Map(prev.components.map((x) => [x.key, x.delta]));
  const changed = next.components.filter((x) => (prevMap.get(x.key) ?? 0) !== x.delta).map((x) => x.label.toLowerCase());
  const sign = diff > 0 ? "+" : "";
  return `${sign}${diff} : ${changed.length ? changed.join(", ") : "mise à jour du profil"}.`;
}

export const DACHSHUND: BreedProfile = {
  id: "dachshund",
  baseScore: 70,
  riskWindow: { fromMonths: 48, toMonths: 96, penalty: 12 },
  outOfWindowPenalty: 4,
  varietyModifiers: { smooth: -4, long: -2, wire: 0 },
  weightRef: { mini: { male: [4, 5.5], female: [3.5, 5] }, standard: { male: [8, 12], female: [7, 11] } },
};

export const GENERIC: BreedProfile = { id: "other", baseScore: 72, riskWindow: null };
