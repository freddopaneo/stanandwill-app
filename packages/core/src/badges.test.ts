import { describe, expect, it } from "vitest";
import { evaluateBadges, newlyEarned, longestStreak, longestGoalStreak, weeklyChallenge, weekStart, isoWeek, tenKName } from "./badges";
import type { WalkSummary } from "./walks";

let n = 0;
/** Balade à une date locale donnée (AAAA-MM-JJ), heure h, durée en minutes. */
function walk(day: string, min: number, opts: { h?: number; steps?: number; m?: number } = {}): WalkSummary {
  const start = new Date(`${day}T${String(opts.h ?? 10).padStart(2, "0")}:00:00`);
  const end = new Date(start.getTime() + min * 60000);
  return { id: "w" + n++, dogId: "d", startedAt: start.toISOString(), endedAt: end.toISOString(), durationS: min * 60, distanceM: opts.m ?? min * 58, stepsEst: opts.steps ?? min * 300, source: "gps" };
}
const ctx = { breedId: "dachshund", goalMinutes: 50 };
const get = (bs: ReturnType<typeof evaluateBadges>, id: string) => bs.find((b) => b.id === id)!;

describe("séries", () => {
  it("plus longue série sur tout l'historique, même interrompue depuis", () => {
    const ws = ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-07", "2026-10-08"].map((d) => walk(d, 20));
    expect(longestStreak(ws)).toBe(4);
  });
  it("traverse un changement de mois et le passage à l'heure d'hiver", () => {
    const ws = ["2026-10-24", "2026-10-25", "2026-10-26", "2026-10-31", "2026-11-01"].map((d) => walk(d, 20));
    expect(longestStreak(ws)).toBe(3);
  });
  it("deux balades le même jour comptent pour un jour", () => {
    expect(longestStreak([walk("2026-10-01", 10), walk("2026-10-01", 10, { h: 18 })])).toBe(1);
  });
  it("série d'objectif : additionne les sorties d'une même journée", () => {
    const ws = [walk("2026-10-01", 30), walk("2026-10-01", 25, { h: 18 }), walk("2026-10-02", 50), walk("2026-10-03", 20)];
    expect(longestGoalStreak(ws, 50)).toBe(2);
  });
  it("aucune balade : 0", () => expect(longestStreak([])).toBe(0));
});

describe("badges", () => {
  it("aucun badge sans données, progression nulle", () => {
    const bs = evaluateBadges([], ctx);
    expect(bs.every((b) => !b.earned)).toBe(true);
    expect(get(bs, "km_10").progress).toBe(0);
  });
  it("première balade et objectif du jour", () => {
    const bs = evaluateBadges([walk("2026-10-01", 55)], ctx);
    expect(get(bs, "first_walk").earned).toBe(true);
    expect(get(bs, "goal_day").earned).toBe(true);
    expect(get(bs, "streak_3").earned).toBe(false);
    expect(get(bs, "streak_3").progress).toBeCloseTo(1 / 3);
  });
  it("10 000 pas : cumul de la journée, nom adapté à la race", () => {
    const ws = [walk("2026-10-01", 20, { steps: 6000 }), walk("2026-10-01", 20, { h: 17, steps: 4200 })];
    const b = get(evaluateBadges(ws, ctx), "ten_k");
    expect(b.earned).toBe(true);
    expect(b.title).toBe("10 000 pas de teckel");
    expect(tenKName("labrador")).toBe("10 000 pas en un jour");
  });
  it("kilomètres cumulés", () => {
    const ws = Array.from({ length: 5 }, (_, i) => walk(`2026-10-0${i + 1}`, 40, { m: 2100 }));
    const bs = evaluateBadges(ws, ctx);
    expect(get(bs, "km_10").earned).toBe(true);
    expect(get(bs, "km_50").earned).toBe(false);
    expect(get(bs, "km_50").progress).toBeCloseTo(0.21);
  });
  it("badges du Carnet : pesées et gestes", () => {
    const bs = evaluateBadges([], { ...ctx, weighCount: 4, gestureCount: 2 });
    expect(get(bs, "weigh_4").earned).toBe(true);
    expect(get(bs, "gestures_5").earned).toBe(false);
  });
  it("newlyEarned ne renvoie que les nouveautés", () => {
    const before = evaluateBadges([walk("2026-10-01", 20)], ctx);
    const after = evaluateBadges([walk("2026-10-01", 20), walk("2026-10-02", 20), walk("2026-10-03", 20)], ctx);
    expect(newlyEarned(before, after).map((b) => b.id)).toEqual(["streak_3"]);
  });
});

describe("défi de la semaine", () => {
  it("la semaine commence le lundi", () => {
    const ws = weekStart(new Date("2026-10-22T15:00:00")); // jeudi
    expect(ws.getDay()).toBe(1);
    expect(ws.getDate()).toBe(19);
    expect(weekStart(new Date("2026-10-25T20:00:00")).getDate()).toBe(19); // dimanche → même semaine
  });
  it("numéro de semaine ISO", () => {
    expect(isoWeek(new Date("2026-01-01T12:00:00"))).toBe(1);
    expect(isoWeek(new Date("2026-10-20T12:00:00"))).toBe(43);
  });
  it("tourne entre 4 défis distincts sur 4 semaines", () => {
    const ids = new Set([0, 7, 14, 21].map((k) => weeklyChallenge([], ctx, new Date(2026, 9, 19 + k, 12)).id));
    expect(ids.size).toBe(4);
  });
  it("ne compte que les balades de la semaine en cours", () => {
    // trouver une semaine où le défi est « Matinal »
    let now = new Date(2026, 9, 19, 12);
    while (weeklyChallenge([], ctx, now).id !== "morning") now = new Date(now.getTime() + 7 * 86400000);
    const mon = weekStart(now);
    const d = (k: number) => { const x = new Date(mon); x.setDate(x.getDate() + k); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
    const ws = [walk(d(-1), 20, { h: 7 }), walk(d(0), 20, { h: 7 }), walk(d(1), 20, { h: 8 }), walk(d(2), 20, { h: 12 })];
    const c = weeklyChallenge(ws, ctx, now);
    expect(c.current).toBe(2);
    expect(c.target).toBe(4);
    expect(c.done).toBe(false);
  });
  it("le seuil « Explorateur » s'adapte au chien (jamais moins de 15 min)", () => {
    let now = new Date(2026, 9, 19, 12);
    while (weeklyChallenge([], ctx, now).id !== "explorer") now = new Date(now.getTime() + 7 * 86400000);
    expect(weeklyChallenge([], { goalMinutes: 20 }, now).description).toContain("15 min");
    expect(weeklyChallenge([], { goalMinutes: 75 }, now).description).toContain("38 min");
  });
});
