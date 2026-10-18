import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, fonts } from "../lib/theme";

/** Jauge du score dans l'écusson du logo (dessinée en vues natives, sans dépendance SVG). */
export function ScoreGauge({ score, label }: { score: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, score));
  const tone = pct >= 75 ? colors.bon : pct >= 50 ? colors.miel : colors.urgence;
  return (
    <View style={s.wrap} accessibilityLabel={`Score de vigilance ${pct} sur 100`}>
      <View style={s.shield}>
        <Text style={s.num}>{pct}</Text>
        <Text style={s.den}>/ 100</Text>
      </View>
      <View style={s.bar}>
        <View style={[s.fill, { width: `${pct}%`, backgroundColor: tone }]} />
      </View>
      {label ? <Text style={s.label}>{label}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: "center", gap: 10 },
  shield: { width: 150, height: 150, borderRadius: 40, borderBottomLeftRadius: 75, borderBottomRightRadius: 75, backgroundColor: colors.creme, borderWidth: 4, borderColor: colors.sauge, alignItems: "center", justifyContent: "center" },
  num: { fontFamily: fonts.black, fontSize: 52, color: colors.foret, lineHeight: 56 },
  den: { fontFamily: fonts.bold, fontSize: 13, color: colors.texteDoux, marginTop: -4 },
  bar: { width: 220, height: 10, borderRadius: 999, backgroundColor: colors.ligne, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 999 },
  label: { fontFamily: fonts.regular, fontSize: 13, color: colors.texteDoux, textAlign: "center" },
});
