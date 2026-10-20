import { describe, expect, it } from "vitest";
import { computeRecap, renderRecap, renderWelcome, seasonTip, signUser, verifyUser } from "./emails";

const now = new Date("2026-10-25T17:00:00Z"); // dimanche
const iso = (daysAgo: number, h = 9) => new Date(now.getTime() - daysAgo * 86400000 + (h - 17) * 3600000).toISOString();

describe("récap du dimanche", () => {
  const stan = {
    name: "Stan",
    walks: [
      { startedAt: iso(1), durationS: 1800, distanceM: 1700, stepsEst: 10800 },
      { startedAt: iso(1, 18), durationS: 1200, distanceM: 1100, stepsEst: 7000 },
      { startedAt: iso(3), durationS: 2400, distanceM: 2300, stepsEst: 14600 },
      { startedAt: iso(9), durationS: 3600, distanceM: 3400, stepsEst: 21600 }, // semaine précédente
    ],
    weights: [{ date: iso(40), kg: 9.4 }],
  };
  it("chiffres de la semaine et tendance", () => {
    const r = computeRecap(stan, now);
    expect(r.walks).toBe(3);
    expect(r.minutes).toBe(90);
    expect(r.steps).toBe(32400);
    expect(r.activeDays).toBe(2);
    expect(r.trendPct).toBe(50);
    expect(r.km).toBe(5.1);
    expect(r.weighDue).toBe(true);
  });
  it("semaine vide : pas de tendance inventée", () => {
    const r = computeRecap({ name: "Will", walks: [], weights: [] }, now);
    expect(r.walks).toBe(0);
    expect(r.trendPct).toBeNull();
    expect(r.bestDay).toBeNull();
  });
  it("e-mail : objet, désinscription, échappement HTML", async () => {
    const m = renderRecap([computeRecap({ ...stan, name: "Stan <b>" }, now)], { appUrl: "https://x", unsubscribeUrl: "https://u?t=1&u=2", now });
    expect(m.subject).toContain("90 min");
    expect(m.html).toContain("Stan &lt;b&gt;");
    expect(m.html).toContain("https://u?t=1&amp;u=2");
    expect(m.text).toContain("Ne plus recevoir ce récap : https://u?t=1&u=2");
    expect(m.html).toContain("Eureca Design SRL");
  });
  it("plusieurs chiens", () => {
    const m = renderRecap([computeRecap(stan, now), computeRecap({ name: "Will", walks: [], weights: [] }, now)], { appUrl: "a", unsubscribeUrl: "u", now });
    expect(m.subject).toBe("Votre semaine : 3 balades pour Stan et Will");
  });
  it("conseil de saison selon le mois", () => {
    expect(seasonTip(new Date("2026-10-20T12:00:00Z"))).toContain("Automne");
    expect(seasonTip(new Date("2026-02-10T12:00:00Z"))).toContain("processionnaires");
    expect(seasonTip(new Date("2026-07-10T12:00:00Z"))).toContain("Chaleur");
  });
});

describe("bienvenue", () => {
  it("prénoms des chiens", () => {
    const m = renderWelcome(["Stan", "Will"], "https://app");
    expect(m.subject).toContain("vos carnets");
    expect(m.html).toContain("Stan et Will");
    expect(renderWelcome(["Stan"], "x").subject).toContain("le carnet de Stan");
  });
});

describe("lien de désinscription signé", () => {
  it("valide uniquement pour le bon utilisateur et le bon secret", async () => {
    const t = await signUser("user-1", "secret");
    expect(await verifyUser("user-1", t, "secret")).toBe(true);
    expect(await verifyUser("user-2", t, "secret")).toBe(false);
    expect(await verifyUser("user-1", t, "autre")).toBe(false);
    expect(await verifyUser("user-1", t.slice(1), "secret")).toBe(false);
  });
});
