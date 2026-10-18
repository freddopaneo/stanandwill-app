import { describe, expect, it } from "vitest";
import { sizeClass, estimateSteps, dailyGoal, dailyStats, streakDays, accumulateDistance, strideM, type WalkSummary } from "./walks";

const teckel = { breedId: "dachshund", size: "standard", weightKg: 9, ageMonths: 48 };
const labrador = { breedId: "labrador", weightKg: 32, ageMonths: 48 };

describe("classe de taille", () => {
  it("le poids prime", () => {
    expect(sizeClass(teckel)).toBe("small");
    expect(sizeClass({ breedId: "chihuahua", weightKg: 2.5 })).toBe("toy");
    expect(sizeClass(labrador)).toBe("large");
  });
  it("sans poids, la race décide", () => {
    expect(sizeClass({ breedId: "dachshund" })).toBe("small");
    expect(sizeClass({ breedId: "labrador" })).toBe("large");
    expect(sizeClass({})).toBe("medium");
  });
});

describe("pas estimés", () => {
  it("un petit chien fait plus de pas qu'un grand sur 1 km", () => {
    const t = estimateSteps(1000, teckel), l = estimateSteps(1000, labrador);
    expect(t).toBeGreaterThan(l * 1.8);
    expect(t).toBeGreaterThan(5000); expect(t).toBeLessThan(7500);
    expect(l).toBeGreaterThan(2000); expect(l).toBeLessThan(3000);
  });
  it("teckel nain : foulée plus courte", () => {
    expect(strideM({ breedId: "dachshund", size: "mini" })).toBeLessThan(strideM(teckel));
  });
  it("0 pour 0 m", () => expect(estimateSteps(0, teckel)).toBe(0));
});

describe("objectif du jour", () => {
  it("chiot : 5 min par mois d'âge, deux fois", () => {
    expect(dailyGoal({ ...teckel, ageMonths: 4 }).minutes).toBe(40);
  });
  it("bouledogue plafonné à 40 min", () => {
    expect(dailyGoal({ breedId: "french_bulldog", weightKg: 12, ageMonths: 36 }).minutes).toBe(40);
  });
  it("senior réduit", () => {
    expect(dailyGoal({ ...labrador, ageMonths: 120 }).minutes).toBe(45);
  });
  it("adulte petit gabarit 50 min, pas estimés cohérents", () => {
    const g = dailyGoal(teckel);
    expect(g.minutes).toBe(50);
    expect(g.stepsEst).toBeGreaterThan(15000);
  });
});

function w(daysAgo: number, min: number, m: number): WalkSummary {
  const d = new Date(); d.setDate(d.getDate() - daysAgo); d.setHours(9, 0, 0, 0);
  const e = new Date(d.getTime() + min * 60000);
  return { id: `w${daysAgo}-${min}`, dogId: "d", startedAt: d.toISOString(), endedAt: e.toISOString(), durationS: min * 60, distanceM: m, stepsEst: 100, source: "gps" };
}

describe("statistiques", () => {
  it("7 jours, jours vides inclus, totaux par jour", () => {
    const s = dailyStats([w(0, 20, 1200), w(0, 10, 500), w(2, 30, 2000)], 7);
    expect(s).toHaveLength(7);
    expect(s[6].walks).toBe(2); expect(s[6].distanceM).toBe(1700);
    expect(s[4].walks).toBe(1); expect(s[5].walks).toBe(0);
  });
  it("série de jours consécutifs", () => {
    expect(streakDays([w(0, 10, 1), w(1, 10, 1), w(3, 10, 1)])).toBe(2);
    expect(streakDays([w(1, 10, 1)])).toBe(0);
  });
});

describe("distance GPS filtrée", () => {
  it("ignore le bruit et accumule les vrais déplacements", () => {
    const base = { latitude: 46.19, longitude: -1.37 };
    const pts = [
      { ...base, accuracy: 5, t: 0 },
      { latitude: 46.19001, longitude: -1.37, accuracy: 5, t: 1000 },        // ~1 m : ignoré
      { latitude: 46.1901, longitude: -1.37, accuracy: 5, t: 20000 },         // ~11 m
      { latitude: 46.1902, longitude: -1.37, accuracy: 80, t: 40000 },        // imprécis : ignoré
      { latitude: 46.1911, longitude: -1.37, accuracy: 5, t: 60000 },         // ~111 m
      { latitude: 46.30, longitude: -1.37, accuracy: 5, t: 61000 },           // saut irréaliste : ignoré
    ];
    const d = accumulateDistance(pts);
    expect(d).toBeGreaterThan(115); expect(d).toBeLessThan(130);
  });
});
