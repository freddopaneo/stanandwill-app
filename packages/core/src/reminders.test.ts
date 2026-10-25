import { describe, expect, it } from "vitest";
import { walkReminderDates, walkReminderText, clampTime, fmtTime } from "./reminders";

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
    const late = walkReminderDates([], { hour: 23, minute: 30 }, at("2026-10-20T06:00:00"))[0];
    expect([late.getHours(), late.getMinutes()]).toEqual([21, 45]);
    expect(walkReminderDates([], 5, at("2026-10-20T06:00:00"))[0].getHours()).toBe(7);
  });
  it("heure personnalisée à la minute", () => {
    const d = walkReminderDates([], { hour: 18, minute: 35 }, at("2026-10-20T18:20:00"))[0];
    expect([d.getDate(), d.getHours(), d.getMinutes()]).toEqual([20, 18, 35]);
    expect(walkReminderDates([], { hour: 18, minute: 35 }, at("2026-10-20T18:40:00"))[0].getDate()).toBe(21);
  });
  it("format et bornes", () => {
    expect(fmtTime({ hour: 18, minute: 0 })).toBe("18 h");
    expect(fmtTime({ hour: 7, minute: 5 })).toBe("7 h 05");
    expect(clampTime({ hour: 4, minute: 10 }, 300, 1320)).toEqual({ hour: 5, minute: 0 });
    expect(clampTime(8)).toEqual({ hour: 8, minute: 0 });
  });
  it("texte adapté au chien", () => {
    const t = walkReminderText("Stan", 50);
    expect(t.title).toBe("Stan n'est pas encore sorti aujourd'hui");
    expect(t.body).toContain("17 minutes");
  });
});
