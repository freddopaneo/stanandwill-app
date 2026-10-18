/**
 * Météo traduite pour le chien (v1). Entrée : météo brute (Open-Meteo), profil du chien.
 * Sortie : un niveau, un titre, un conseil et le meilleur créneau de sortie.
 * Repères : bitume brûlant dès ~26 °C à l'air (test des 7 secondes du dos de la main) ; brachycéphales
 * en difficulté dès 24–26 °C et par forte humidité ; petits chiens / poil ras frileux sous 5 °C ;
 * vent > 50 km/h et orage = sortie courte ; UV ≥ 7 = chiens clairs / nez roses à protéger.
 */
import type { SizeClass } from "./walks";

export interface WeatherNow {
  tempC: number;
  feelsLikeC?: number | null;
  humidity?: number | null;      // %
  windKmh?: number | null;
  uvIndex?: number | null;
  precipitationMm?: number | null;
  weatherCode?: number | null;   // code WMO
  /** températures horaires du jour (index = heure locale), pour le meilleur créneau */
  hourlyTempC?: number[] | null;
  hour?: number | null;          // heure locale actuelle
}

export interface DogWeatherInput {
  breedId?: string | null;
  sizeClass: SizeClass;
  ageMonths?: number | null;
  coat?: "smooth" | "long" | "wire" | null;
}

export type WeatherLevel = "good" | "watch" | "caution" | "avoid";

export interface DogWeather {
  level: WeatherLevel;
  title: string;
  advice: string;
  /** créneau conseillé, ex. "avant 10 h" / "entre 12 h et 15 h" / null si tout va bien */
  bestWindow: string | null;
  emoji: string;
}

const BRACHY = new Set(["french_bulldog", "pug", "english_bulldog", "boston_terrier", "shih_tzu", "pekingese", "boxer"]);

export const wmoLabel = (code?: number | null): string => {
  if (code == null) return "";
  if (code === 0) return "ciel dégagé";
  if (code <= 2) return "peu nuageux";
  if (code === 3) return "couvert";
  if (code <= 48) return "brouillard";
  if (code <= 57) return "bruine";
  if (code <= 67) return "pluie";
  if (code <= 77) return "neige";
  if (code <= 82) return "averses";
  if (code <= 86) return "averses de neige";
  return "orage";
};

function coolWindow(hourly: number[] | null | undefined, limit: number): string | null {
  if (!hourly || hourly.length < 24) return null;
  const okMorning = hourly.slice(6, 12).findIndex((t) => t > limit); // première heure trop chaude le matin
  const lastHot = [...hourly].map((t, h) => ({ t, h })).filter((x) => x.h >= 12 && x.t > limit).pop()?.h;
  const morningEnd = okMorning === -1 ? 12 : 6 + okMorning;
  const eveningStart = lastHot != null ? lastHot + 1 : 17;
  return `avant ${morningEnd} h ou après ${Math.min(21, eveningStart)} h`;
}

export function dogWeather(w: WeatherNow, d: DogWeatherInput): DogWeather {
  const t = w.feelsLikeC ?? w.tempC;
  const brachy = BRACHY.has(d.breedId ?? "");
  const small = d.sizeClass === "toy" || d.sizeClass === "small";
  const senior = (d.ageMonths ?? 36) >= 108;
  const puppy = (d.ageMonths ?? 36) < 12;
  const storm = (w.weatherCode ?? 0) >= 95;
  const heavyRain = (w.precipitationMm ?? 0) >= 4 || ((w.weatherCode ?? 0) >= 63 && (w.weatherCode ?? 0) <= 67) || ((w.weatherCode ?? 0) >= 80);
  const wind = w.windKmh ?? 0;

  // Chaleur : seuils par profil
  const hotLimit = brachy ? 24 : senior || puppy ? 26 : 28;
  const dangerLimit = brachy ? 28 : 32;
  if (t >= dangerLimit || (brachy && t >= 26 && (w.humidity ?? 0) >= 70)) {
    return {
      level: "avoid", emoji: "🥵",
      title: `${Math.round(w.tempC)} °C : trop chaud pour ${brachy ? "un brachycéphale" : "une vraie balade"}`,
      advice: brachy
        ? "Pas de sortie aux heures chaudes : museau court = refroidissement difficile. Sortie pipi à l'ombre, eau fraîche, et surveillez le halètement."
        : "Bitume brûlant (test des 7 secondes avec le dos de la main). Sortie courte à l'ombre, eau à portée, jamais dans la voiture.",
      bestWindow: coolWindow(w.hourlyTempC, hotLimit) ?? "tôt le matin ou tard le soir",
    };
  }
  if (t >= hotLimit) {
    return {
      level: "caution", emoji: "☀️",
      title: `${Math.round(w.tempC)} °C : chaud, sortez ${d.breedId === "dachshund" ? "aux heures fraîches" : "malin"}`,
      advice: brachy
        ? "Rythme lent, pauses, eau. Si la langue devient très large et le souffle bruyant, on rentre."
        : "Préférez l'herbe au bitume, raccourcissez un peu, eau à mi-parcours.",
      bestWindow: coolWindow(w.hourlyTempC, hotLimit) ?? "avant 10 h ou après 19 h",
    };
  }
  if (storm) {
    return { level: "avoid", emoji: "⛈️", title: "Orage : on attend", advice: "Sortie pipi rapide seulement. Beaucoup de chiens paniquent au tonnerre : laisse courte et retour calme.", bestWindow: "dès l'accalmie" };
  }
  if (heavyRain && wind >= 50) {
    return { level: "caution", emoji: "🌧️", title: "Pluie et vent fort", advice: `Sortie courte${small ? ", manteau pour un petit gabarit" : ""} ; séchez bien le ventre et les oreilles au retour.`, bestWindow: null };
  }
  if (t <= 0 || (small && t <= 5) || (d.coat === "smooth" && t <= 3)) {
    return {
      level: "caution", emoji: "🥶",
      title: `${Math.round(w.tempC)} °C : froid pour ${small ? "un petit gabarit" : "lui"}`,
      advice: `${d.coat === "smooth" || small ? "Manteau conseillé" : "Rythme soutenu"} ; attention au sel de déneigement sur les coussinets, rincez les pattes au retour.`,
      bestWindow: "aux heures les plus douces, en début d'après-midi",
    };
  }
  if ((w.uvIndex ?? 0) >= 7) {
    return { level: "watch", emoji: "😎", title: "UV élevés", advice: "Nez rose, oreilles fines, ventre clair : un peu d'ombre et, si besoin, un écran solaire spécial chien.", bestWindow: null };
  }
  if (heavyRain) {
    return { level: "watch", emoji: "🌧️", title: "Pluie", advice: "Rien n'empêche la balade : serviette à la porte, et on sèche entre les doigts pour éviter les irritations.", bestWindow: null };
  }
  if (wind >= 50) {
    return { level: "watch", emoji: "💨", title: "Vent fort", advice: "Évitez les sous-bois (chutes de branches) et les plages exposées ; sortie un peu plus courte.", bestWindow: null };
  }
  return {
    level: "good", emoji: t >= 20 ? "🌤️" : "🌿",
    title: `${Math.round(w.tempC)} °C, ${wmoLabel(w.weatherCode) || "temps idéal"}`,
    advice: d.breedId === "dachshund" ? "Temps parfait pour une balade régulière, bonne pour le dos. Allez-y." : "Temps parfait pour sortir. Profitez-en.",
    bestWindow: null,
  };
}
