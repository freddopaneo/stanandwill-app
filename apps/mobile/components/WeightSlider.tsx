import React, { useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import Slider from "@react-native-community/slider";
import * as Haptics from "expo-haptics";
import { colors, fonts } from "../lib/theme";

/**
 * Curseur de poids horizontal (@react-native-community/slider, natif et fluide), pas de 100 g,
 * retour haptique léger à chaque demi-kilo, poids affiché en gros au-dessus (vert foncé).
 */
export function WeightSlider({ value, min, max, onChange }: { value: number | null | undefined; min: number; max: number; onChange: (kg: number) => void }) {
  const lastHalf = useRef(-1);
  const v = value ?? null;
  return (
    <View>
      <Text style={s.num} accessibilityLiveRegion="polite">{v == null ? "—" : `${v.toFixed(1).replace(".", ",")} kg`}</Text>
      <Slider
        style={s.slider}
        minimumValue={min}
        maximumValue={max}
        step={0.1}
        value={v ?? 5}
        minimumTrackTintColor={colors.foret}
        maximumTrackTintColor={colors.ligne}
        thumbTintColor={colors.foret}
        accessibilityLabel="Poids du chien"
        onValueChange={(x) => {
          const kg = Math.round(x * 10) / 10;
          onChange(kg);
          const half = Math.round(kg * 2);
          if (half !== lastHalf.current) { lastHalf.current = half; Haptics.selectionAsync().catch(() => {}); }
        }}
      />
      <View style={s.labels}>
        <Text style={s.label}>{min} kg</Text>
        <Text style={s.label}>{Math.round((min + max) / 2)} kg</Text>
        <Text style={s.label}>{max} kg</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  num: { fontFamily: fonts.black, fontSize: 44, color: colors.foretFonce, textAlign: "center", marginBottom: 6 },
  slider: { width: "100%", height: 44 },
  labels: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 6 },
  label: { fontFamily: fonts.bold, fontSize: 11, color: colors.texteDoux },
});
