/**
 * Carnet cloud — logique pure de synchronisation (aucun appel réseau ici).
 *
 * Modèle : le téléphone est la source de vérité immédiate (l'app marche hors connexion).
 * Les éléments du carnet sont « ajout seul » (une pesée ne se modifie pas, elle se remplace par une nouvelle),
 * ce qui permet une synchro simple et sûre :
 *  - on mémorise les identifiants déjà envoyés ;
 *  - on n'envoie que les nouveaux (upsert idempotent côté serveur) ;
 *  - les suppressions passent par une file d'attente, vidée à la prochaine connexion ;
 *  - à la connexion sur un nouveau téléphone, on fusionne par identifiant (union, jamais d'écrasement).
 */

export interface SyncState {
  /** identifiant du chien dans Supabase (uuid), absent tant que le chien n'est pas envoyé */
  cloudId?: string;
  /** identifiants client déjà présents côté serveur, par type */
  pushed: { weights: string[]; events: string[]; walks: string[] };
  /** suppressions à répercuter côté serveur */
  deletes: { walks: string[]; events: string[] };
  /** empreinte du profil du chien au dernier envoi (pour n'envoyer que les modifications) */
  profileHash?: string;
  lastSyncAt?: string;
  lastError?: string | null;
}

export const emptySyncState = (): SyncState => ({ pushed: { weights: [], events: [], walks: [] }, deletes: { walks: [], events: [] } });

/** Éléments pas encore envoyés. */
export function pending<T>(items: T[], pushedIds: string[], idOf: (t: T) => string): T[] {
  const done = new Set(pushedIds);
  return items.filter((t) => !done.has(idOf(t)));
}

/** Ajoute des identifiants à une liste sans doublon, en gardant une taille bornée (les plus récents). */
export function addIds(list: string[], ids: string[], max = 2000): string[] {
  const s = new Set(list);
  for (const id of ids) s.add(id);
  const out = [...s];
  return out.length > max ? out.slice(out.length - max) : out;
}

/** Retire des identifiants (après suppression confirmée). */
export function removeIds(list: string[], ids: string[]): string[] {
  const s = new Set(ids);
  return list.filter((x) => !s.has(x));
}

/**
 * Fusion local + serveur par identifiant : l'union des deux, la version locale l'emporte en cas de doublon,
 * les éléments supprimés localement (en attente) ne reviennent pas. Tri chronologique par `dateOf`.
 */
export function mergeById<T>(local: T[], remote: T[], idOf: (t: T) => string, dateOf: (t: T) => string, excluded: string[] = []): T[] {
  const ex = new Set(excluded);
  const map = new Map<string, T>();
  for (const r of remote) if (!ex.has(idOf(r))) map.set(idOf(r), r);
  for (const l of local) map.set(idOf(l), l);
  return [...map.values()].sort((a, b) => dateOf(a).localeCompare(dateOf(b)));
}

/** Empreinte stable d'un objet (clés triées) pour détecter un profil modifié. */
export function stableHash(o: unknown): string {
  const norm = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(norm);
    if (v && typeof v === "object") return Object.keys(v as object).sort().reduce((acc, k) => { (acc as any)[k] = norm((v as any)[k]); return acc; }, {} as Record<string, unknown>);
    return v ?? null;
  };
  const str = JSON.stringify(norm(o));
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Texte d'état affiché dans le Carnet. */
export function syncLabel(s: SyncState | undefined, signedIn: boolean, now = new Date()): string {
  if (!signedIn) return "Pas de compte : les données restent sur ce téléphone.";
  if (!s?.lastSyncAt) return s?.lastError ? "Sauvegarde en attente (connexion à vérifier)." : "Sauvegarde en cours…";
  const min = Math.max(0, Math.round((now.getTime() - new Date(s.lastSyncAt).getTime()) / 60000));
  const when = min < 1 ? "à l'instant" : min < 60 ? `il y a ${min} min` : min < 1440 ? `il y a ${Math.round(min / 60)} h` : `le ${new Date(s.lastSyncAt).toLocaleDateString("fr-FR")}`;
  return s.lastError ? `Dernière sauvegarde ${when} · nouvel essai à la prochaine ouverture.` : `Carnet sauvegardé ${when}.`;
}
