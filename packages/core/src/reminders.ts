/**
 * Rappel « pas encore sorti » — planning pur (testé), la planification réelle est faite par l'app.
 *
 * Règles :
 *  - au plus UNE notification par jour, à l'heure choisie par le maître ;
 *  - aujourd'hui : seulement si aucune balade n'est enregistrée et que l'heure n'est pas passée ;
 *  - les jours suivants sont planifiés d'avance (l'app peut ne pas être rouverte) et
 *    recalculés à chaque ouverture et à chaque balade enregistrée ;
 *  - pas de rappel la nuit : heure bornée entre 7 h 00 et 21 h 45, réglable à la minute.
 */
import { dayKey, type WalkSummary } from "./walks";

/** Heure de rappel choisie par le maître (minutes : 0–59). */
export interface ReminderTime { hour: number; minute: number }

/** Plage autorisée du rappel de balade : 7 h 00 → 21 h 45 (pas de rappel la nuit). */
export const WALK_REMINDER_MIN = 7 * 60;
export const WALK_REMINDER_MAX = 21 * 60 + 45;

/** Normalise une heure (nombre d'heures ou {hour, minute}) dans une plage, en minutes depuis minuit. */
export function clampTime(t: number | ReminderTime, min = 0, max = 24 * 60 - 1): ReminderTime {
  const total = typeof t === "number" ? Math.round(t) * 60 : Math.round(t.hour) * 60 + Math.round(t.minute);
  const c = Math.min(max, Math.max(min, total));
  return { hour: Math.floor(c / 60), minute: c % 60 };
}

/** « 18 h », « 18 h 30 », « 7 h 05 » */
export function fmtTime(t: ReminderTime): string {
  return t.minute ? `${t.hour} h ${String(t.minute).padStart(2, "0")}` : `${t.hour} h`;
}

export function walkReminderDates(walks: Pick<WalkSummary, "startedAt">[], time: number | ReminderTime | null, now = new Date(), days = 7): Date[] {
  if (time == null) return [];
  const { hour: h, minute: m } = clampTime(time, WALK_REMINDER_MIN, WALK_REMINDER_MAX);
  const walkedToday = walks.some((w) => dayKey(w.startedAt) === dayKey(now.toISOString()));
  const out: Date[] = [];
  for (let k = 0; k < days; k++) {
    const d = new Date(now);
    d.setDate(d.getDate() + k);
    d.setHours(h, m, 0, 0);
    if (k === 0 && (walkedToday || d.getTime() <= now.getTime())) continue;
    out.push(d);
  }
  return out;
}

/** Texte du rappel, adapté à l'objectif du chien. */
export function walkReminderText(dogName: string, goalMinutes: number): { title: string; body: string } {
  const short = Math.max(10, Math.round(goalMinutes / 3));
  return {
    title: `${dogName} n'est pas encore sorti aujourd'hui`,
    body: `Même ${short} minutes comptent : le nez au vent, c'est bon pour le corps et pour la tête.`,
  };
}
