import { describe, expect, it } from "vitest";
import { pending, addIds, removeIds, mergeById, stableHash, syncLabel, emptySyncState } from "./sync";

type W = { id: string; date: string; kg: number };
const id = (w: W) => w.id, date = (w: W) => w.date;

describe("éléments à envoyer", () => {
  it("n'envoie que ce qui n'est pas encore parti", () => {
    const ws: W[] = [{ id: "a", date: "1", kg: 8 }, { id: "b", date: "2", kg: 8.2 }];
    expect(pending(ws, ["a"], id).map(id)).toEqual(["b"]);
    expect(pending(ws, [], id)).toHaveLength(2);
  });
  it("addIds sans doublon, borné aux plus récents", () => {
    expect(addIds(["a", "b"], ["b", "c"])).toEqual(["a", "b", "c"]);
    expect(addIds(["a", "b", "c"], ["d"], 3)).toEqual(["b", "c", "d"]);
    expect(removeIds(["a", "b", "c"], ["b"])).toEqual(["a", "c"]);
  });
});

describe("fusion nouveau téléphone", () => {
  const local: W[] = [{ id: "a", date: "2026-10-01", kg: 8 }, { id: "c", date: "2026-10-03", kg: 8.4 }];
  const remote: W[] = [{ id: "a", date: "2026-10-01", kg: 7.9 }, { id: "b", date: "2026-10-02", kg: 8.1 }, { id: "z", date: "2026-09-30", kg: 8 }];
  it("union triée, la version locale l'emporte", () => {
    const m = mergeById(local, remote, id, date);
    expect(m.map(id)).toEqual(["z", "a", "b", "c"]);
    expect(m.find((x) => x.id === "a")!.kg).toBe(8);
  });
  it("un élément supprimé sur le téléphone ne revient pas", () => {
    expect(mergeById(local, remote, id, date, ["z"]).map(id)).toEqual(["a", "b", "c"]);
  });
  it("téléphone vide : tout revient du serveur", () => {
    expect(mergeById([], remote, id, date)).toHaveLength(3);
  });
});

describe("empreinte de profil", () => {
  it("indépendante de l'ordre des clés, sensible aux valeurs", () => {
    expect(stableHash({ a: 1, b: [1, 2] })).toBe(stableHash({ b: [1, 2], a: 1 }));
    expect(stableHash({ a: 1 })).not.toBe(stableHash({ a: 2 }));
    expect(stableHash({ a: undefined })).toBe(stableHash({ a: null }));
  });
});

describe("état affiché", () => {
  const now = new Date("2026-10-20T20:00:00Z");
  it("sans compte", () => expect(syncLabel(undefined, false)).toContain("ce téléphone"));
  it("sauvegardé récemment", () => {
    expect(syncLabel({ ...emptySyncState(), lastSyncAt: "2026-10-20T19:55:00Z" }, true, now)).toBe("Carnet sauvegardé il y a 5 min.");
    expect(syncLabel({ ...emptySyncState(), lastSyncAt: "2026-10-20T19:59:50Z" }, true, now)).toBe("Carnet sauvegardé à l'instant.");
  });
  it("erreur réseau", () => {
    expect(syncLabel({ ...emptySyncState(), lastError: "x" }, true, now)).toContain("en attente");
    expect(syncLabel({ ...emptySyncState(), lastSyncAt: "2026-10-20T17:00:00Z", lastError: "x" }, true, now)).toContain("il y a 3 h");
  });
});
