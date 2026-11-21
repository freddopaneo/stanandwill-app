/**
 * Photos de balade — version navigateur (PWA) : rangées dans la base locale du navigateur (IndexedDB),
 * sur l'appareil uniquement. Chaque photo est réduite (1 600 px au plus) avant d'être enregistrée.
 * Même interface que lib/photoStore.ts (iOS / Android).
 */
export interface WalkPhoto { id: string; uri: string }

const DB = "sw-walk-photos";
const STORE = "photos";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const s = req.result.createObjectStore(STORE, { keyPath: "key" });
      s.createIndex("walkId", "walkId");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
}

/** Réduit l'image et la convertit en JPEG. */
async function shrink(uri: string): Promise<Blob | null> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = uri;
  });
  const ratio = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * ratio);
  canvas.height = Math.round(img.naturalHeight * ratio);
  canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.82));
}

export async function addPhoto(walkId: string, uri: string): Promise<WalkPhoto | null> {
  try {
    const blob = await shrink(uri);
    if (!blob) return null;
    const id = `p${Date.now()}`;
    const db = await open();
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ key: `${walkId}/${id}`, walkId, id, blob });
    await done(tx);
    db.close();
    return { id, uri: URL.createObjectURL(blob) };
  } catch { return null; }
}

export async function listPhotos(walkId: string): Promise<WalkPhoto[]> {
  try {
    const db = await open();
    const rows: { id: string; blob: Blob }[] = await new Promise((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).index("walkId").getAll(walkId);
      req.onsuccess = () => resolve(req.result as any);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return rows.sort((a, b) => a.id.localeCompare(b.id)).map((r) => ({ id: r.id, uri: URL.createObjectURL(r.blob) }));
  } catch { return []; }
}

export async function deletePhotos(walkId: string): Promise<void> {
  try {
    const db = await open();
    const tx = db.transaction(STORE, "readwrite");
    const idx = tx.objectStore(STORE).index("walkId");
    await new Promise<void>((resolve, reject) => {
      const req = idx.openKeyCursor(IDBKeyRange.only(walkId));
      req.onsuccess = () => { const c = req.result; if (c) { tx.objectStore(STORE).delete(c.primaryKey); c.continue(); } else resolve(); };
      req.onerror = () => reject(req.error);
    });
    await done(tx);
    db.close();
  } catch {}
}

export async function deleteAllPhotos(): Promise<void> {
  try {
    const db = await open();
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    await done(tx);
    db.close();
  } catch {}
}
