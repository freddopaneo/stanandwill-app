import React from "react";
import { Pressable, StyleSheet, Text, TextProps, View, ViewProps, ActivityIndicator } from "react-native";
import { colors, fonts, radius } from "../lib/theme";

export function H1({ style, ...p }: TextProps) {
  return <Text {...p} style={[s.h1, style]} />;
}
export function H2({ style, ...p }: TextProps) {
  return <Text {...p} style={[s.h2, style]} />;
}
export function P({ style, ...p }: TextProps) {
  return <Text {...p} style={[s.p, style]} />;
}
export function Small({ style, ...p }: TextProps) {
  return <Text {...p} style={[s.small, style]} />;
}

export function Button({ title, onPress, variant = "primary", disabled, loading }: { title: string; onPress?: () => void; variant?: "primary" | "secondary" | "ghost"; disabled?: boolean; loading?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [s.btn, variant === "secondary" && s.btnSecondary, variant === "ghost" && s.btnGhost, (disabled || loading) && { opacity: 0.55 }, pressed && { transform: [{ scale: 0.99 }] }]}
    >
      {loading ? <ActivityIndicator color={variant === "primary" ? colors.foretFonce : colors.foret} /> : (
        <Text style={[s.btnText, variant === "secondary" && { color: colors.foret }, variant === "ghost" && { color: colors.texteDoux, fontFamily: fonts.bold }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Card({ style, ...p }: ViewProps) {
  return <View {...p} style={[s.card, style]} />;
}

export function Choice({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress} style={[s.choice, selected && s.choiceSel]}>
      <Text style={[s.choiceText, selected && { color: colors.foret, fontFamily: fonts.bold }]}>{label}</Text>
    </Pressable>
  );
}

export function Pill({ label, tone = "sauge" }: { label: string; tone?: "sauge" | "miel" | "bon" | "vigilance" | "urgence" }) {
  const bg = tone === "miel" ? colors.miel : tone === "bon" ? "#DFF0E0" : tone === "vigilance" ? "#FCEBC2" : tone === "urgence" ? "#F6D5D1" : colors.saugeClair;
  const fg = tone === "urgence" ? colors.urgence : colors.foretFonce;
  return <View style={[s.pill, { backgroundColor: bg }]}><Text style={[s.pillText, { color: fg }]}>{label}</Text></View>;
}

const s = StyleSheet.create({
  h1: { fontFamily: fonts.black, fontSize: 28, lineHeight: 34, color: colors.foretFonce, letterSpacing: -0.4 },
  h2: { fontFamily: fonts.black, fontSize: 20, lineHeight: 26, color: colors.foretFonce },
  p: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23, color: colors.texte },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.texteDoux },
  btn: { backgroundColor: colors.miel, borderRadius: radius.md, paddingVertical: 15, paddingHorizontal: 18, alignItems: "center", minHeight: 50, justifyContent: "center" },
  btnSecondary: { backgroundColor: colors.saugeClair },
  btnGhost: { backgroundColor: "transparent" },
  btnText: { fontFamily: fonts.black, fontSize: 17, color: colors.foretFonce },
  card: { backgroundColor: colors.blanc, borderRadius: radius.lg, padding: 18, borderWidth: 1, borderColor: colors.ligne },
  choice: { borderWidth: 1.5, borderColor: colors.ligne, backgroundColor: colors.blanc, borderRadius: radius.md, paddingVertical: 15, paddingHorizontal: 16, minHeight: 50, justifyContent: "center" },
  choiceSel: { borderColor: colors.foret, backgroundColor: colors.saugeClair },
  choiceText: { fontFamily: fonts.regular, fontSize: 16, color: colors.texte },
  pill: { alignSelf: "flex-start", borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  pillText: { fontFamily: fonts.bold, fontSize: 12 },
});
