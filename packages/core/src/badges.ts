/**
 * Badges et défis — la motivation au service de la prévention.
 *
 * Tout est DÉRIVÉ des données déjà enregistrées (balades, pesées, gestes) : rien à stocker,
 * rien à tricher, et un badge ne peut jamais « disparaître » tant que l'historique existe.
 *
 * - Badges : acquis une fois pour toutes (première balade, séries, kilomètres cumulés…).
 * - Défi de la semaine : un objectif par semaine (lundi → dimanche), qui tourne
 *   automatiquement selon le numéro de semaine. Les seuils s'adaptent à l'objectif
 *   quotidien du chien (chiot, senior, brachycéphale) : on ne pousse jamais un chien
 *   au-delà de ce qui est bon pour lui.
 */
import { dayKey, type WalkSummary } from "./walks";

export interface BadgeContext {
  breedId?: string | null;
  /** objectif quotidien de balade en minutes (dailyGoal().minutes) */
  goalMinutes: number;
  /** nombre de pesées enregistrées */
  weighCount?: number;
  /** nombre de gestes de prévention appris (événements « gesture ») */
  gestureCount?: number;
}

export interface Badge {
  id: string;
  emoji: string;
  title: string;
  /** comment l'obtenir (affiché quand le badge est verrouillé) */
  how: string;
  earned: boolean;
  /** progression 0–1 vers le badge */
  progress: number;
}

/** Totaux par jour (toutes balades confondues). */
function byDay(walks: WalkSummary[]): Map<string, { durationS: number; stepsEst: number }> {
  const m = new Map<string, { durationS: number; stepsEst: number }>();
  for (const w of walks) {
    const k = dayKey(w.startedAt);
    const cur = m.get(k) ?? { durationS: 0, stepsEst: 0 };
    cur.durationS += w.durationS; cur.stepsEst += w.stepsEst;
    m.set(k, cur);
  }
  return m;
}

/** Jour suivant d'une clé AAAA-MM-JJ (midi local pour éviter les pièges du changement d'heure). */
function nextDay(key: string): string {
  const d = new Date(key + "T12:00:00");
  d.setDate(d.getDate() + 1);
  return dayKey(d.toISOString());
}

/** Plus longue suite de jours consécutifs présents dans `keys`. */
function longestRun(keys: string[]): number {
  const set = new Set(keys);
  let best = 0;
  for (const k of set) {
    // ne compter qu'à partir du début d'une suite
    const d = new Date(k + "T12:00:00"); d.setDate(d.getDate() - 1);
    if (set.has(dayKey(d.toISOString()))) continue;
    let n = 1, cur = k;
    while (set.has(nextDay(cur))) { n++; cur = nextDay(cur); }
    best = Math.max(best, n);
  }
  return best;
}

/** Plus longue série de jours consécutifs avec au moins une balade (tout l'historique). */
export function longestStreak(walks: WalkSummary[]): number {
  return longestRun(walks.map((w) => dayKey(w.startedAt)));
}

/** Plus longue série de jours consécutifs où l'objectif quotidien est atteint. */
export function longestGoalStreak(walks: WalkSummary[], goalMinutes: number): number {
  const days = byDay(walks);
  return longestRun([...days].filter(([, v]) => v.durationS >= goalMinutes * 60).map(([k]) => k));
}

/** Nom du défi « 10 000 pas » : clin d'œil aux teckels, la race fondatrice de l'app. */
export function tenKName(breedId?: string | null): string {
  return breedId === "dachshund" ? "10 000 pas de teckel" : "10 000 pas en un jour";
}

const ratio = (v: number, target: number) => Math.max(0, Math.min(1, target > 0 ? v / target : 0));

/** Liste complète des badges, acquis ou non, dans l'ordre d'affichage. */
export function evaluateBadges(walks: WalkSummary[], ctx: BadgeContext): Badge[] {
  const days = byDay(walks);
  const totalKm = walks.reduce((a, w) => a + w.distanceM, 0) / 1000;
  const bestSteps = Math.max(0, ...[...days.values()].map((d) => d.stepsEst));
  const streak = longestStreak(walks);
  const goalStreak = longestGoalStreak(walks, ctx.goalMinutes);
  const goalDays = [...days.values()].filter((d) => d.durationS >= ctx.goalMinutes * 60).length;
  const early = walks.filter((w) => new Date(w.startedAt).getHours() < 8).length;
  const weighs = ctx.weighCount ?? 0;
  const gestures = ctx.gestureCount ?? 0;

  const b = (id: string, emoji: string, title: string, how: string, value: number, target: number): Badge =>
    ({ id, emoji, title, how, earned: value >= target, progress: ratio(value, target) });

  return [
    b("first_walk", "🐾", "Première balade", "Enregistrez une première balade.", walks.length, 1),
    b("goal_day", "🎯", "Objectif atteint", "Atteignez l'objectif de balade d'une journée.", goalDays, 1),
    b("ten_k", "🌭", tenKName(ctx.breedId), "Cumulez 10 000 pas estimés en une seule journée.", bestSteps, 10000),
    b("streak_3", "🔥", "3 jours d'affilée", "Sortez 3 jours de suite.", streak, 3),
    b("streak_7", "🔥", "Une semaine complète", "Sortez 7 jours de suite.", streak, 7),
    b("goal_week", "🏅", "Semaine parfaite", "Atteignez l'objectif 7 jours de suite.", goalStreak, 7),
    b("streak_30", "👑", "Un mois sans manquer", "Sortez 30 jours de suite.", streak, 30),
    b("km_10", "🥾", "10 km parcourus", "Cumulez 10 km de balades.", totalKm, 10),
    b("km_50", "🗺️", "50 km parcourus", "Cumulez 50 km de balades.", totalKm, 50),
    b("km_100", "🌍", "100 km parcourus", "Cumulez 100 km de balades.", totalKm, 100),
    b("early_5", "🌅", "Lève-tôt", "Faites 5 balades avant 8 h (idéal par temps chaud).", early, 5),
    b("weigh_4", "⚖️", "Poids sous contrôle", "Enregistrez 4 pesées dans le Carnet.", weighs, 4),
    b("gestures_5", "🩺", "Maître vigilant", "Apprenez 5 gestes de prévention.", gestures, 5),
  ];
}

/** Badges acquis dans `after` mais pas dans `before` (pour féliciter juste après une balade). */
export function newlyEarned(before: Badge[], after: Badge[]): Badge[] {
  const had = new Set(before.filter((x) => x.earned).map((x) => x.id));
  return after.filter((x) => x.earned && !had.has(x.id));
}

// ——— Défi de la semaine ———

export interface WeeklyChallenge {
  id: string;
  emoji: string;
  title: string;
  description: string;
  current: number;
  target: number;
  unit: string;
  done: boolean;
  progress: number;
  /** lundi de la semaine (AAAA-MM-JJ) */
  weekStart: string;
  daysLeft: number;
}

/** Lundi 00:00 (heure locale) de la semaine de `now`. */
export function weekStart(now = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7; // lundi = 0
  d.setDate(d.getDate() - dow);
  return d;
}

/** Numéro de semaine ISO 8601. */
export function isoWeek(now = new Date()): number {
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dow);
  const y0 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - y0.getTime()) / 86400000 + 1) / 7);
}

/** Défi de la semaine en cours : tourne chaque lundi parmi 4 défis, seuils adaptés au chien. */
export function weeklyChallenge(walks: WalkSummary[], ctx: BadgeContext, now = new Date()): WeeklyChallenge {
  const start = weekStart(now);
  const end = new Date(start); end.setDate(end.getDate() + 7);
  const week = walks.filter((w) => { const t = new Date(w.startedAt).getTime(); return t >= start.getTime() && t < end.getTime(); });
  const days = byDay(week);
  const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000));
  const base = { weekStart: dayKey(new Date(start.getTime() + 12 * 3600000).toISOString()), daysLeft };
  const mk = (id: string, emoji: string, title: string, description: string, current: number, target: number, unit: string): WeeklyChallenge =>
    ({ id, emoji, title, description, current, target, unit, done: current >= target, progress: ratio(current, target), ...base });

  const longMin = Math.max(15, Math.round(ctx.goalMinutes / 2));
  switch (isoWeek(now) % 4) {
    case 0: {
      const best = Math.max(0, ...[...days.values()].map((d) => d.stepsEst));
      return mk("ten_k", "🌭", tenKName(ctx.breedId), "Une journée à 10 000 pas estimés, en plusieurs sorties si besoin.", best, 10000, "pas");
    }
    case 1: {
      const hit = [...days.values()].filter((d) => d.durationS >= ctx.goalMinutes * 60).length;
      return mk("goal_5", "🎯", "5 jours à l'objectif", `Atteignez les ${ctx.goalMinutes} min de balade 5 jours cette semaine.`, hit, 5, "jours");
    }
    case 2: {
      const n = week.filter((w) => w.durationS >= longMin * 60).length;
      return mk("explorer", "🧭", "Explorateur", `3 balades d'au moins ${longMin} min : nouveaux chemins, nouvelles odeurs.`, n, 3, "balades");
    }
    default: {
      const n = week.filter((w) => new Date(w.startedAt).getHours() < 9).length;
      return mk("morning", "🌅", "Matinal", "4 balades avant 9 h : l'air est frais et les chemins calmes.", n, 4, "balades");
    }
  }
}
