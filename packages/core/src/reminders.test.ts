import { describe, expect, it } from "vitest";
import { walkReminderDates, walkReminderText } from "./reminders";

const at = (s: string) => new Date(s);

describe("rappel « pas encore sorti »", () => {
  it("désactivé → aucun rappel", () => expect(walkReminderDates([], null)).toEqual([]));
  it("pas de balade aujourd'hui, heure à venir → rappel aujourd'hui + 6 jours", () => {
    const ds = walkReminderDates([], 18, at("2026-10-20T10:00:00"));
    expect(ds).toHaveLength(7);
    expect(ds[0].getDate()).toBe(20);
    expect(ds[0].getHours()).toBe(18);
    expect(new Set(ds.map((d) => d.toDateString())).size).toBe(7); // au plus 1 par jour
  });
  it("balade déjà faite aujourd'hui → rien aujourd'hui, demain oui", () => {
    const ds = walkReminderDates([{ startedAt: at("2026-10-20T08:00:00").toISOString() }], 18, at("2026-10-20T10:00:00"));
    expect(ds).toHaveLength(6);
    expect(ds[0].getDate()).toBe(21);
  });
  it("heure passée → commence demain", () => {
    expect(walkReminderDates([], 12, at("2026-10-20T15:00:00"))[0].getDate()).toBe(21);
  });
  it("jamais la nuit", () => {
    expect(walkReminderDates([], 23, at("2026-10-20T06:00:00"))[0].getHours()).toBe(21);
    expect(walkReminderDates([], 5, at("2026-10-20T06:00:00"))[0].getHours()).toBe(7);
  });
  it("texte adapté au chien", () => {
    const t = walkReminderText("Stan", 50);
    expect(t.title).toBe("Stan n'est pas encore sorti aujourd'hui");
    expect(t.body).toContain("17 minutes");
  });
});
