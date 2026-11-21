/**
 * Données de balade gardées UNIQUEMENT sur le téléphone (jamais envoyées au serveur, jamais synchronisées) :
 *   - la balade en cours, pour ne plus la perdre si l'app se ferme (reprise à la réouverture) ;
 *   - le tracé GPS des balades terminées, pour afficher la carte du parcours.
 * Le résumé d'une balade (durée, distance, pas) reste, lui, dans le carnet synchronisé.
 * Les photos sont rangées à part (lib/photoStore) car elles sont trop lourdes pour ce stockage.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

/** Point GPS compact : latitude, longitude, horodatage (ms). */
export type TracePoint = [number, number, number];

export interface WalkSession {
  walkId: string;
  dogId: string;
  /** Début de la balade (ms). */
  startedAt: number;
  useGps: boolean;
  pts: TracePoint[];
  /** Dernier instant où l'app était ouverte sur cette balade (ms) : sert de fin si la balade a été oubliée. */
  lastSeen: number;
}

const SESSION_KEY = "sw.walk.live.v1";
const TRACE_PREFIX = "sw.walk.trace.";
const INDEX_KEY = "sw.walk.traces.v1";
/** Nombre de tracés conservés (les plus anciens sont effacés) et de points par tracé. */
const MAX_TRACES = 60;
const MAX_POINTS = 400;

export async function loadSession(): Promise<WalkSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as WalkSession;
    return s && typeof s.startedAt === "number" && s.walkId ? s : null;
  } catch { return null; }
}

export async function saveSession(s: WalkSession): Promise<void> {
  try { await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch {}
}

export async function clearSession(): Promise<void> {
  try { await AsyncStorage.removeItem(SESSION_KEY); } catch {}
}

/** Réduit un tracé à MAX_POINTS points au plus, en gardant le premier et le dernier. */
export function thin(pts: TracePoint[], max = MAX_POINTS): TracePoint[] {
  if (pts.length <= max) return pts;
  const step = (pts.length - 1) / (max - 1);
  const out: TracePoint[] = [];
  for (let i = 0; i < max; i++) out.push(pts[Math.round(i * step)]);
  return out;
}

async function readIndex(): Promise<string[]> {
  try { return JSON.parse((await AsyncStorage.getItem(INDEX_KEY)) ?? "[]") as string[]; } catch { return []; }
}

export async function saveTrace(walkId: string, pts: TracePoint[]): Promise<void> {
  if (pts.length < 2) return;
  try {
    // 5 décimales ≈ 1 mètre : suffisant pour un tracé, et deux fois plus léger.
    const compact = thin(pts).map(([la, lo, t]) => [Math.round(la * 1e5) / 1e5, Math.round(lo * 1e5) / 1e5, t]);
    await AsyncStorage.setItem(TRACE_PREFIX + walkId, JSON.stringify(compact));
    const index = (await readIndex()).filter((id) => id !== walkId);
    index.push(walkId);
    const drop = index.splice(0, Math.max(0, index.length - MAX_TRACES));
    await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(index));
    if (drop.length) await AsyncStorage.multiRemove(drop.map((id) => TRACE_PREFIX + id));
  } catch {}
}

export async function loadTrace(walkId: string): Promise<TracePoint[]> {
  try { return JSON.parse((await AsyncStorage.getItem(TRACE_PREFIX + walkId)) ?? "[]") as TracePoint[]; } catch { return []; }
}

export async function deleteTrace(walkId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(TRACE_PREFIX + walkId);
    await AsyncStorage.setItem(INDEX_KEY, JSON.stringify((await readIndex()).filter((id) => id !== walkId)));
  } catch {}
}

/** Efface la balade en cours et tous les tracés (remise à zéro de l'app, suppression du compte). */
export async function clearAllWalkData(): Promise<string[]> {
  const index = await readIndex();
  try { await AsyncStorage.multiRemove([SESSION_KEY, INDEX_KEY, ...index.map((id) => TRACE_PREFIX + id)]); } catch {}
  return index;
}
