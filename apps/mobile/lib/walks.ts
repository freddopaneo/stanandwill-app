/**
 * Suivi d'une balade en cours : GPS (expo-location) → distance filtrée → pas estimés.
 * Fonctionne aussi sans GPS (mode « minuteur », distance estimée à l'allure de balade).
 *
 * La balade en cours est sauvegardée sur le téléphone au fil de l'eau : si l'app se ferme, elle est proposée
 * à la reprise (ou à l'enregistrement) à la réouverture. À la fin, le tracé est conservé sur le téléphone
 * uniquement, pour la carte du parcours. Seul le résumé (durée, distance, pas) part dans le carnet synchronisé :
 * aucune position n'est envoyée au serveur.
 */
import { accumulateDistance, distanceFromDuration, estimateSteps, type WalkInput, type WalkSummary } from "@stanandwill/core";
import { clearSession, saveSession, saveTrace, type TracePoint, type WalkSession } from "./walkMedia";

type Pt = { latitude: number; longitude: number; accuracy?: number | null; t: number };

export interface LiveWalk {
  walkId: string;
  startedAt: string;
  durationS: number;
  distanceM: number;
  stepsEst: number;
  gps: "on" | "denied" | "unavailable" | "off";
  points: number;
}

type Listener = (w: LiveWalk) => void;

let Location: typeof import("expo-location") | null = null;
async function loadLocation() {
  if (Location) return Location;
  try { Location = await import("expo-location"); } catch { Location = null; }
  return Location;
}

const toPt = (p: TracePoint): Pt => ({ latitude: p[0], longitude: p[1], t: p[2] });
const toTrace = (pts: Pt[]): TracePoint[] => pts.map((p) => [p.latitude, p.longitude, p.t]);

/** Résumé d'une balade à partir de son début, de sa fin et de ses points (commun au suivi et à la reprise). */
function summarize(walkId: string, dogId: string, startedAt: number, endedAt: number, pts: Pt[], gpsOn: boolean, input: WalkInput): WalkSummary | null {
  const durationS = Math.max(0, Math.floor((endedAt - startedAt) / 1000));
  if (durationS < 60) return null;
  const measured = gpsOn && pts.length >= 2;
  const distanceM = measured ? accumulateDistance(pts) : distanceFromDuration(durationS);
  return {
    id: walkId, dogId, startedAt: new Date(startedAt).toISOString(), endedAt: new Date(endedAt).toISOString(),
    durationS, distanceM, stepsEst: estimateSteps(distanceM, input), source: measured ? "gps" : "timer",
  };
}

/**
 * Enregistre une balade restée ouverte (app fermée sans « Terminer ») : elle s'arrête au dernier instant où
 * l'app était ouverte, pas à l'heure actuelle, pour ne pas compter des heures de balade imaginaires.
 */
export function finishSavedWalk(session: WalkSession, input: WalkInput): WalkSummary | null {
  const pts = session.pts.map(toPt);
  const w = summarize(session.walkId, session.dogId, session.startedAt, session.lastSeen, pts, session.useGps, input);
  if (w) saveTrace(session.walkId, session.pts);
  clearSession();
  return w;
}

export class WalkTracker {
  private pts: Pt[] = [];
  private sub: { remove: () => void } | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private startedAt = 0;
  private gps: LiveWalk["gps"] = "off";
  private listeners = new Set<Listener>();
  private lastSave = 0;
  readonly walkId: string;
  /** `resume` : balade retrouvée à la réouverture de l'app, à poursuivre telle quelle. */
  constructor(private input: WalkInput, private useGps: boolean, private dogId: string, resume?: WalkSession) {
    if (resume) { this.startedAt = resume.startedAt; this.pts = resume.pts.map(toPt); this.walkId = resume.walkId; }
    else this.walkId = "walk-" + Date.now();
  }

  on(l: Listener) { this.listeners.add(l); return () => { this.listeners.delete(l); }; }

  private emit() { const s = this.snapshot(); this.listeners.forEach((l) => l(s)); }

  /** Sauvegarde la balade en cours (au plus toutes les 5 secondes, sauf `force`). */
  private persist(force = false) {
    const now = Date.now();
    if (!force && now - this.lastSave < 5000) return;
    this.lastSave = now;
    saveSession({ walkId: this.walkId, dogId: this.dogId, startedAt: this.startedAt, useGps: this.useGps, pts: toTrace(this.pts), lastSeen: now });
  }

  snapshot(): LiveWalk {
    const durationS = this.startedAt ? Math.floor((Date.now() - this.startedAt) / 1000) : 0;
    const gpsDist = accumulateDistance(this.pts);
    // Sans GPS exploitable, on estime la distance à l'allure « balade en laisse ».
    const distanceM = this.gps === "on" && this.pts.length >= 2 ? gpsDist : distanceFromDuration(durationS);
    return { walkId: this.walkId, startedAt: new Date(this.startedAt).toISOString(), durationS, distanceM, stepsEst: estimateSteps(distanceM, this.input), gps: this.gps, points: this.pts.length };
  }

  async start() {
    if (!this.startedAt) { this.startedAt = Date.now(); this.pts = []; }
    this.persist(true);
    this.timer = setInterval(() => { this.emit(); this.persist(); }, 1000);
    if (!this.useGps) { this.gps = "off"; this.emit(); return; }
    const L = await loadLocation();
    if (!L) { this.gps = "unavailable"; this.emit(); return; }
    try {
      const perm = await L.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") { this.gps = "denied"; this.emit(); return; }
      this.gps = "on";
      this.sub = await L.watchPositionAsync(
        { accuracy: L.Accuracy.High, timeInterval: 3000, distanceInterval: 5 },
        (loc) => {
          this.pts.push({ latitude: loc.coords.latitude, longitude: loc.coords.longitude, accuracy: loc.coords.accuracy, t: loc.timestamp || Date.now() });
          this.emit(); this.persist();
        },
      );
    } catch { this.gps = "unavailable"; }
    this.emit();
  }

  /** Met le suivi en pause sans rien effacer (l'écran se ferme) : la balade reste proposée à la reprise. */
  suspend() {
    if (this.timer) clearInterval(this.timer); this.timer = null;
    this.sub?.remove(); this.sub = null;
    if (this.startedAt) this.persist(true);
  }

  /** Arrête le suivi et renvoie le résumé à enregistrer (ou null si trop court pour compter). */
  stop(): WalkSummary | null {
    if (this.timer) clearInterval(this.timer); this.timer = null;
    this.sub?.remove(); this.sub = null;
    const w = summarize(this.walkId, this.dogId, this.startedAt, Date.now(), this.pts, this.gps === "on", this.input);
    if (w) saveTrace(this.walkId, toTrace(this.pts)); // tracé gardé sur le téléphone, pour la carte du parcours
    clearSession();
    this.pts = []; this.startedAt = 0;
    return w;
  }
}

/** Balade saisie à la main (« j'ai oublié de lancer le suivi »). */
export function manualWalk(dogId: string, minutes: number, input: WalkInput, distanceM?: number | null): WalkSummary {
  const durationS = Math.round(minutes * 60);
  const d = distanceM && distanceM > 0 ? Math.round(distanceM) : distanceFromDuration(durationS);
  const end = new Date(); const start = new Date(end.getTime() - durationS * 1000);
  return { id: "walk-" + Date.now(), dogId, startedAt: start.toISOString(), endedAt: end.toISOString(), durationS, distanceM: d, stepsEst: estimateSteps(d, input), source: "manual" };
}
