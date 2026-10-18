import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { ageMonthsFrom, dogWeather, sizeClass, type DogWeather } from "@stanandwill/core";
import { getWeather, type WeatherBundle } from "../lib/weather";
import type { Dog } from "../lib/store";
import { colors, fonts, radius } from "../lib/theme";
import { Small } from "./ui";

/** « Météo traduite pour le chien » : une carte compacte, couleur selon le niveau, créneau conseillé. */
export function WeatherCard({ dog, compact = false }: { dog: Dog; compact?: boolean }) {
  const [w, setW] = useState<WeatherBundle | null | undefined>(undefined);
  useEffect(() => { getWeather().then(setW); }, []);
  if (w === undefined) return null;
  if (w === null) {
    return (
      <Pressable onPress={() => getWeather(true).then(setW)} style={[s.card, { backgroundColor: colors.blanc, borderColor: colors.ligne }]}>
        <Small>Météo du chien indisponible : autorisez la localisation approximative pour savoir si c'est le bon moment pour sortir {dog.name}. Toucher pour réessayer.</Small>
      </Pressable>
    );
  }
  const r: DogWeather = dogWeather(w, { breedId: dog.breed_id, sizeClass: sizeClass({ breedId: dog.breed_id, size: dog.size, weightKg: dog.weightKg }), ageMonths: ageMonthsFrom(dog.birth_month ?? undefined), coat: (dog.variety as any) ?? null });
  const tone = r.level === "avoid" ? { bg: "#F6D5D1", fg: colors.urgence, border: "#EBB3AC" } : r.level === "caution" ? { bg: "#FCEBC2", fg: "#8A5A00", border: "#F2D48A" } : r.level === "watch" ? { bg: colors.saugeClair, fg: colors.foretFonce, border: colors.sauge } : { bg: "#DFF0E0", fg: colors.bon, border: "#BFE0C2" };
  return (
    <View style={[s.card, { backgroundColor: tone.bg, borderColor: tone.border }]} accessibilityRole="summary">
      <View style={s.row}>
        <Text style={{ fontSize: 26 }}>{r.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[s.title, { color: tone.fg }]}>{r.title}</Text>
          {w.city && <Small style={{ color: tone.fg, opacity: 0.8 }}>{w.city} · météo du chien</Small>}
        </View>
      </View>
      {!compact && <Text style={s.advice}>{r.advice}</Text>}
      {r.bestWindow && <Text style={[s.window, { color: tone.fg }]}>Meilleur moment pour sortir {dog.name} : {r.bestWindow}.</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, padding: 14, marginTop: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { fontFamily: fonts.black, fontSize: 15, lineHeight: 19 },
  advice: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.texte, marginTop: 8 },
  window: { fontFamily: fonts.bold, fontSize: 13, marginTop: 6 },
});
