/**
 * Photos de balade — version iOS / Android : copiées dans le dossier privé de l'app, sur le téléphone.
 * Elles ne sont jamais envoyées au serveur. Version navigateur : lib/photoStore.web.ts (même interface).
 */
import * as FileSystem from "expo-file-system/legacy";

export interface WalkPhoto { id: string; uri: string }

const ROOT = `${FileSystem.documentDirectory ?? ""}walk-photos/`;
const dirOf = (walkId: string) => `${ROOT}${walkId}/`;

/** Enregistre une photo (URI rendue par l'appareil photo) pour une balade. Retourne null en cas d'échec. */
export async function addPhoto(walkId: string, uri: string): Promise<WalkPhoto | null> {
  try {
    await FileSystem.makeDirectoryAsync(dirOf(walkId), { intermediates: true });
    const id = `p${Date.now()}`;
    const to = `${dirOf(walkId)}${id}.jpg`;
    await FileSystem.copyAsync({ from: uri, to });
    return { id, uri: to };
  } catch { return null; }
}

export async function listPhotos(walkId: string): Promise<WalkPhoto[]> {
  try {
    const names = (await FileSystem.readDirectoryAsync(dirOf(walkId))).sort();
    return names.map((n) => ({ id: n.replace(/\.jpg$/, ""), uri: dirOf(walkId) + n }));
  } catch { return []; }
}

export async function deletePhotos(walkId: string): Promise<void> {
  try { await FileSystem.deleteAsync(dirOf(walkId), { idempotent: true }); } catch {}
}

export async function deleteAllPhotos(): Promise<void> {
  try { await FileSystem.deleteAsync(ROOT, { idempotent: true }); } catch {}
}
