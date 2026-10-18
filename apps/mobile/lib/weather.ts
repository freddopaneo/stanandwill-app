/**
 * Météo locale via Open-Meteo (gratuit, sans clé, serveurs en Europe). Position approximative (expo-location, précision basse),
 * arrondie à 2 décimales avant l'appel : Open-Meteo ne reçoit jamais votre adresse exacte. Cache 30 min en mémoire + AsyncStorage.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { WeatherNow } from "@stanandwill/core";

const KEY = "sw.weather.v1";
const TTL = 30 * 60 * 1000;

export interface WeatherBundle extends WeatherNow { city?: string | null; fetchedAt: number }

async function approxPosition(): Promise<{ lat: number; lng: number; city: string | null } | null> {
  try {
    const L = await import("expo-location");
    const perm = await L.getForegroundPermissionsAsync();
    const granted = perm.status === "granted" ? true : (await L.requestForegroundPermissionsAsync()).status === "granted";
    if (!granted) return null;
    const pos = await L.getCurrentPositionAsync({ accuracy: L.Accuracy.Low });
    let city: string | null = null;
    try { const g = await L.reverseGeocodeAsync(pos.coords); city = g[0]?.city ?? g[0]?.subregion ?? null; } catch {}
    return { lat: Math.round(pos.coords.latitude * 100) / 100, lng: Math.round(pos.coords.longitude * 100) / 100, city };
  } catch { return null; }
}

export async function getWeather(force = false): Promise<WeatherBundle | null> {
  try {
    if (!force) {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) { const c: WeatherBundle = JSON.parse(raw); if (Date.now() - c.fetchedAt < TTL) return c; }
    }
    const p = await approxPosition();
    if (!p) return null;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lng}` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation,weather_code,uv_index` +
      `&hourly=temperature_2m&forecast_days=1&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const j = await res.json();
    const c = j.current ?? {};
    const b: WeatherBundle = {
      tempC: c.temperature_2m, feelsLikeC: c.apparent_temperature ?? null, humidity: c.relative_humidity_2m ?? null,
      windKmh: c.wind_speed_10m ?? null, precipitationMm: c.precipitation ?? null, weatherCode: c.weather_code ?? null, uvIndex: c.uv_index ?? null,
      hourlyTempC: Array.isArray(j.hourly?.temperature_2m) ? j.hourly.temperature_2m.slice(0, 24) : null,
      hour: new Date().getHours(), city: p.city, fetchedAt: Date.now(),
    };
    await AsyncStorage.setItem(KEY, JSON.stringify(b)).catch(() => {});
    return b;
  } catch { return null; }
}
