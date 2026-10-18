/**
 * Suivi d'une balade en cours : GPS (expo-location) → distance filtrée → pas estimés.
 * Fonctionne aussi sans GPS (mode « minuteur », distance estimée à l'allure de balade).
 * La trace GPS reste en mémoire pendant la balade et n'est PAS conservée : seul le résumé
 * (durée, distance, pas) est enregistré. Aucune position n'est envoyée au serveur.
 */
import { accumulateDistance, distanceFromDuration, estimateSteps, type WalkInput, type WalkSummary } from "@stanandwill/core";

type Pt = { latitude: number; longitude: number; accuracy?: number | null; t: number };

export interface LiveWalk {
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

export class WalkTracker {
  private pts: Pt[] = [];
  private sub: { remove: () => void } | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private startedAt = 0;
  private gps: LiveWalk["gps"] = "off";
  private listeners = new Set<Listener>();
  constructor(private input: WalkInput, private useGps: boolean) {}

  on(l: Listener) { this.listeners.add(l); return () => { this.listeners.delete(l); }; }

  private emit() { const s = this.snapshot(); this.listeners.forEach((l) => l(s)); }

  snapshot(): LiveWalk {
    const durationS = this.startedAt ? Math.floor((Date.now() - this.startedAt) / 1000) : 0;
    const gpsDist = accumulateDistance(this.pts);
    // Sans GPS exploitable, on estime la distance à l'allure « balade en laisse ».
    const distanceM = this.gps === "on" && this.pts.length >= 2 ? gpsDist : distanceFromDuration(durationS);
    return { startedAt: new Date(this.startedAt).toISOString(), durationS, distanceM, stepsEst: estimateSteps(distanceM, this.input), gps: this.gps, points: this.pts.length };
  }

  async start() {
    this.startedAt = Date.now(); this.pts = [];
    this.timer = setInterval(() => this.emit(), 1000);
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
          this.emit();
        },
      );
    } catch { this.gps = "unavailable"; }
    this.emit();
  }

  /** Arrête le suivi et renvoie le résumé à enregistrer (ou null si trop court pour compter). */
  stop(dogId: string): WalkSummary | null {
    if (this.timer) clearInterval(this.timer); this.timer = null;
    this.sub?.remove(); this.sub = null;
    const s = this.snapshot();
    this.pts = []; // la trace est oubliée immédiatement
    if (s.durationS < 60) return null;
    return {
      id: "walk-" + Date.now(), dogId, startedAt: s.startedAt, endedAt: new Date().toISOString(),
      durationS: s.durationS, distanceM: s.distanceM, stepsEst: s.stepsEst,
      source: s.gps === "on" ? "gps" : "timer",
    };
  }
}

/** Balade saisie à la main (« j'ai oublié de lancer le suivi »). */
export function manualWalk(dogId: string, minutes: number, input: WalkInput, distanceM?: number | null): WalkSummary {
  const durationS = Math.round(minutes * 60);
  const d = distanceM && distanceM > 0 ? Math.round(distanceM) : distanceFromDuration(durationS);
  const end = new Date(); const start = new Date(end.getTime() - durationS * 1000);
  return { id: "walk-" + Date.now(), dogId, startedAt: start.toISOString(), endedAt: end.toISOString(), durationS, distanceM: d, stepsEst: estimateSteps(d, input), source: "manual" };
}
