import { describe, expect, it } from "vitest";
import { dogWeather, wmoLabel } from "./weather";

const hourly = Array.from({ length: 24 }, (_, h) => (h >= 11 && h <= 18 ? 31 : 22));

describe("météo traduite pour le chien", () => {
  it("canicule : interdit pour un bouledogue dès 28 °C, créneau frais proposé", () => {
    const r = dogWeather({ tempC: 29, hourlyTempC: hourly, hour: 14 }, { breedId: "french_bulldog", sizeClass: "medium" });
    expect(r.level).toBe("avoid");
    expect(r.bestWindow).toMatch(/avant 11 h/);
  });
  it("29 °C : prudence pour un teckel adulte, pas d'interdiction", () => {
    const r = dogWeather({ tempC: 29, hourlyTempC: hourly }, { breedId: "dachshund", sizeClass: "small", ageMonths: 48 });
    expect(r.level).toBe("caution");
    expect(r.title).toContain("29 °C");
  });
  it("brachycéphale + humidité élevée à 26 °C = à éviter", () => {
    expect(dogWeather({ tempC: 26, humidity: 80 }, { breedId: "french_bulldog", sizeClass: "medium" }).level).toBe("avoid");
  });
  it("froid : manteau pour un chihuahua à 4 °C", () => {
    const r = dogWeather({ tempC: 4 }, { breedId: "chihuahua", sizeClass: "toy" });
    expect(r.level).toBe("caution"); expect(r.advice).toMatch(/Manteau/);
  });
  it("orage prime sur tout", () => {
    expect(dogWeather({ tempC: 18, weatherCode: 95 }, { sizeClass: "large" }).level).toBe("avoid");
  });
  it("beau temps : feu vert", () => {
    const r = dogWeather({ tempC: 17, weatherCode: 1, windKmh: 10, uvIndex: 3 }, { breedId: "labrador", sizeClass: "large" });
    expect(r.level).toBe("good"); expect(r.bestWindow).toBeNull();
  });
  it("libellés WMO", () => { expect(wmoLabel(0)).toBe("ciel dégagé"); expect(wmoLabel(95)).toBe("orage"); });
});
