import { describe, it, expect } from "vitest";
import { computeScore, DACHSHUND, breedInfo } from "@stanandwill/core";
import { bilanPoints } from "./content";

const stan = { id: "local-1", name: "Stan", breed_id: "dachshund", variety: "wire", size: "standard", sex: "male" as const, neutered: "no" as const, birth_month: "2019-06-01", silhouette: "ideal" as const, activity: "60_120" as const, conditions: [], weightKg: 9.5 };

describe("bilanPoints", () => {
  it("teckel 7 ans → dos en fenêtre, poids ok, dents", () => {
    const score = computeScore({ breed: DACHSHUND, variety: "wire", size: "standard", sex: "male", ageMonths: 87, neutered: "no", weightKg: 9.5, silhouette: "ideal", activity: "60_120", conditions: [] });
    const pts = bilanPoints(stan as any, score);
    expect(pts.map((p) => p.key)).toEqual(["back_window", "weight_ok", "dental"]);
    expect(pts[0].title).toContain("Stan");
  });
  it("antécédent de dos → suivi post-épisode en premier", () => {
    const score = computeScore({ breed: DACHSHUND, variety: "smooth", size: "standard", sex: "male", ageMonths: 40, neutered: "yes", neuterAge: "before_12m", weightKg: 12.5, silhouette: "round", activity: "lt30", conditions: ["back"] });
    const pts = bilanPoints({ ...stan, conditions: ["back"], silhouette: "round" } as any, score);
    expect(pts[0].key).toBe("back_post");
    expect(pts[1].key).toBe("weight_high");
    expect(pts[2].key).toBe("neuter");
    expect(pts).toHaveLength(3);
  });
});

describe("bilanPoints — races fragiles annoncées", () => {
  it("bouledogue → respiration, chihuahua → dents, cavalier → cœur", () => {
    for (const [id, key] of [["french_bulldog", "breed_french_bulldog"], ["chihuahua", "breed_chihuahua"], ["cavalier", "breed_cavalier"], ["pomeranian", "breed_pomeranian"]] as const) {
      const info = breedInfo(id);
      const score = computeScore({ breed: info.profile, ageMonths: 60, neutered: "no", sex: "male", conditions: [] });
      const pts = bilanPoints({ ...stan, breed_id: id, name: "Gaston" } as any, score);
      expect(pts[0].key).toBe(key);
      expect(pts[0].title).toContain("Gaston");
      expect(pts[0].body).not.toContain("{n}");
    }
  });
});
