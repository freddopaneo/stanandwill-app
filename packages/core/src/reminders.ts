/**
 * Rappel « pas encore sorti » — planning pur (testé), la planification réelle est faite par l'app.
 *
 * Règles :
 *  - au plus UNE notification par jour, à l'heure choisie par le maître ;
 *  - aujourd'hui : seulement si aucune balade n'est enregistrée et que l'heure n'est pas passée ;
 *  - les jours suivants sont planifiés d'avance (l'app peut ne pas être rouverte) et
 *    recalculés à chaque ouverture et à chaque balade enregistrée ;
 *  - pas de rappel la nuit : heure bornée entre 7 h et 21 h.
 */
import { dayKey, type WalkSummary } from "./walks";

export const WALK_REMINDER_HOURS = [12, 17, 18, 19] as const;

export function walkReminderDates(walks: Pick<WalkSummary, "startedAt">[], hour: number | null, now = new Date(), days = 7): Date[] {
  if (hour == null) return [];
  const h = Math.min(21, Math.max(7, Math.round(hour)));
  const walkedToday = walks.some((w) => dayKey(w.startedAt) === dayKey(now.toISOString()));
  const out: Date[] = [];
  for (let k = 0; k < days; k++) {
    const d = new Date(now);
    d.setDate(d.getDate() + k);
    d.setHours(h, 0, 0, 0);
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
