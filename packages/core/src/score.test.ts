import { describe, it, expect } from "vitest";
import { computeScore, explainDelta, DACHSHUND, GENERIC, type DogInput } from "./score";

const stan: DogInput = {
  breed: DACHSHUND, variety: "wire", size: "standard", sex: "male", ageMonths: 7 * 12,
  neutered: "yes", neuterAge: "after_12m", weightKg: 9.4, activity: "60_120", conditions: [], insuranceStatus: undefined,
} as any;

const will: DogInput = {
  breed: DACHSHUND, variety: "smooth", size: "mini", sex: "male", ageMonths: 3 * 12,
  neutered: "no", weightKg: 5.1, activity: "60_120", conditions: [],
};

describe("score de vigilance — teckel", () => {
  it("Stan (7 ans, poil dur, poids de forme) est dans la fenêtre de risque", () => {
    const r = computeScore(stan);
    // 70 -12 (fenêtre) +0 (poil dur) +15 (poids idéal 9,4 dans 8–12) +8 activité = 81
    expect(r.score).toBe(81);
    expect(r.components.find((c) => c.key === "age_window")?.delta).toBe(-12);
    expect(r.mode).toBe("prevention");
  });

  it("Will (3 ans, poil ras) démarre plus haut que Stan hors fenêtre", () => {
    const r = computeScore(will);
    // 70 -4 (hors fenêtre) -4 (poil ras) +15 (5,1 dans 4–5,5) +8 = 85
    expect(r.score).toBe(85);
    expect(r.score).toBeGreaterThan(computeScore(stan).score);
  });

  it("Will perd des points en entrant dans la fenêtre à 4 ans", () => {
    const at4 = computeScore({ ...will, ageMonths: 48 });
    // 70 -12 -4 +15 +8 = 77
    expect(at4.score).toBe(77);
    expect(at4.score).toBeLessThan(computeScore(will).score);
  });

  it("le surpoids marqué et la stérilisation précoce pèsent", () => {
    const r = computeScore({ ...will, weightKg: 6.8, neutered: "yes", neuterAge: "before_12m" });
    // 70 -4 -4 -15 (6,8 > 5,5*1,15=6,33) -6 +8 = 49
    expect(r.score).toBe(49);
    expect(r.components.find((c) => c.key === "neuter_early")?.modifiable).toBe(false);
  });

  it("les gestes sont plafonnés à +12 et le suivi à +10", () => {
    const r = computeScore({ ...stan, gestures: ["harness", "no_high_jumps", "knows_signs", "harness"], streakDays: 60, recordsUpToDate: true, daysSinceWeigh: 2 });
    // 81 +12 +6 +4 +3 = 106 -> borné à 98
    expect(r.score).toBe(98);
  });

  it("un antécédent de dos bascule en mode post-épisode", () => {
    const r = computeScore({ ...stan, conditions: ["back"] });
    expect(r.mode).toBe("post_episode");
    expect(r.score).toBe(71);
  });

  it("silhouette déclarée utilisée quand le poids est inconnu", () => {
    const r = computeScore({ ...will, weightKg: null, silhouette: "round" });
    // 70 -4 -4 -8 +8 = 62
    expect(r.score).toBe(62);
  });

  it("race générique : pas de fenêtre, base 72", () => {
    const r = computeScore({ breed: GENERIC, ageMonths: 60, neutered: "unknown", conditions: [], silhouette: "ideal", activity: "30_60" });
    expect(r.score).toBe(72 + 15 + 8);
  });

  it("explique une variation", () => {
    const a = computeScore(will);
    const b = computeScore({ ...will, daysSinceWeigh: 0 });
    expect(explainDelta(a, b)).toMatch(/^\+3 : pesée de moins de 14 jours\.$/);
    expect(explainDelta(a, a)).toBe("Score stable.");
  });
});

import { BREEDS, FRAGILE_BREEDS, breedInfo } from "./breeds";
describe("breeds", () => {
  it("5 races fragiles, teckel en premier, toutes avec plan dédié", () => {
    expect(FRAGILE_BREEDS).toHaveLength(5);
    expect(FRAGILE_BREEDS[0].id).toBe("dachshund");
    expect(FRAGILE_BREEDS.every((b) => b.status === "full")).toBe(true);
    expect(FRAGILE_BREEDS.slice(1).every((b) => b.headline)).toBe(true);
  });
  it("chaque race a un profil cohérent avec le moteur", () => {
    for (const b of BREEDS) {
      const r = computeScore({ breed: b.profile, ageMonths: 60, neutered: "no", conditions: [], sex: "male" });
      expect(r.score).toBeGreaterThanOrEqual(10); expect(r.score).toBeLessThanOrEqual(98);
    }
    expect(breedInfo("inconnu").id).toBe("other");
  });
});

import { LESSONS, buildPlan, todaysItem, planDayIndex } from "./lessons";
describe("lessons", () => {
  it("chaque race fragile a 9 leçons propres + 8 communes, ids uniques", () => {
    const ids = new Set(LESSONS.map((l) => l.id));
    expect(ids.size).toBe(LESSONS.length);
    for (const b of ["dachshund", "french_bulldog", "chihuahua", "pomeranian", "cavalier"]) {
      const plan = buildPlan(b);
      expect(plan.length).toBe(17);
      expect(plan.filter((p) => p.breedId === b).length).toBe(9);
      expect(plan.every((p) => p.body.length > 60)).toBe(true);
      expect(plan.filter((p) => p.type === "lesson" && p.check).length).toBeGreaterThanOrEqual(5);
    }
  });
  it("todaysItem avance avec les jours et les items faits", () => {
    const plan = buildPlan("dachshund");
    expect(todaysItem(plan, 0, new Set())!.id).toBe("d-w1-1");
    expect(todaysItem(plan, 0, new Set(["d-w1-1"]))!.id).toBe("d-w1-1"); // rien d'autre dû → dernier dû
    expect(todaysItem(plan, 1, new Set(["d-w1-1"]))!.id).toBe("c-w1-weigh");
    expect(todaysItem(plan, 10, new Set())!.id).toBe("d-w1-1"); // en retard : on reprend au début
    expect(planDayIndex(new Date(Date.now() - 3 * 86400000).toISOString())).toBe(3);
  });
});
