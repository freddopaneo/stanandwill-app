import React, { forwardRef } from "react";
import { View, Text, Image, StyleSheet, type ImageSourcePropType } from "react-native";
import { fmtDistance, fmtDuration, type WalkSummary } from "@stanandwill/core";
import { colors, fonts } from "../lib/theme";

/**
 * Carte « fin de balade » partageable (format 4:5, Instagram / WhatsApp / Stories).
 * Rendue à 360×450 pt à l'écran, capturée en 1080×1350 px par react-native-view-shot.
 * Contenu : photo (celle du chien si elle existe, sinon Stan et Will), chiffres, objectif, marque.
 */
export const CARD_W = 360;
export const CARD_H = 450;

export interface WalkShareCardProps {
  walk: WalkSummary;
  dogName: string;
  photo: ImageSourcePropType;
  goalMinutes: number;
  goalHit: boolean;
  streak: number;
}

export const WalkShareCard = forwardRef<React.ComponentRef<typeof View>, WalkShareCardProps>(function WalkShareCard({ walk, dogName, photo, goalMinutes, goalHit, streak }, ref) {
  const d = new Date(walk.startedAt);
  const date = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return (
    <View ref={ref} collapsable={false} style={s.card}>
      <Image source={photo} style={s.photo} resizeMode="cover" />
      {/* voile dégradé « maison » : bandes superposées, sans dépendance native */}
      <View style={s.shadeTop} />
      {[0.1, 0.25, 0.42, 0.6, 0.75, 0.86].map((o, i) => (
        <View key={i} style={[s.strip, { bottom: (5 - i) * 34, opacity: o }]} />
      ))}
      <View style={s.bottomFill} />

      <View style={s.header}>
        <View style={s.brand}>
          <Image source={require("../assets/icon.png")} style={s.logo} />
          <Text style={s.brandText}>Stan & Will</Text>
        </View>
        <Text style={s.date}>{date}</Text>
      </View>

      <View style={s.body}>
        <Text style={s.name}>{dogName} a marché</Text>
        <Text style={s.steps}>{walk.stepsEst.toLocaleString("fr-FR")} <Text style={s.stepsUnit}>pas</Text></Text>
        <View style={s.row}>
          <Stat label="Durée" value={fmtDuration(walk.durationS)} />
          <Stat label="Distance" value={fmtDistance(walk.distanceM)} />
          <Stat label="Objectif" value={goalHit ? "atteint ✓" : `${goalMinutes} min`} />
        </View>
        {streak > 1 && <Text style={s.streak}>🔥 {streak} jours d'affilée</Text>}
        <Text style={s.foot}>Pas estimés selon le gabarit · stanandwill.app</Text>
      </View>
    </View>
  );
});

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: { width: CARD_W, height: CARD_H, borderRadius: 24, overflow: "hidden", backgroundColor: colors.foretFonce },
  photo: { position: "absolute", width: CARD_W, height: CARD_H },
  shadeTop: { position: "absolute", top: 0, left: 0, right: 0, height: 90, backgroundColor: "rgba(20,41,31,0.35)" },
  strip: { position: "absolute", left: 0, right: 0, height: 36, backgroundColor: colors.foretFonce },
  bottomFill: { position: "absolute", left: 0, right: 0, bottom: 0, height: 34, backgroundColor: colors.foretFonce, opacity: 0.92 },
  header: { position: "absolute", top: 16, left: 18, right: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  logo: { width: 30, height: 30, borderRadius: 9 },
  brandText: { fontFamily: fonts.black, fontSize: 16, color: colors.creme },
  date: { fontFamily: fonts.bold, fontSize: 12, color: colors.saugeClair, textTransform: "capitalize" },
  body: { position: "absolute", left: 18, right: 18, bottom: 16 },
  name: { fontFamily: fonts.bold, fontSize: 15, color: colors.saugeClair },
  steps: { fontFamily: fonts.black, fontSize: 52, lineHeight: 58, color: colors.miel, letterSpacing: -1 },
  stepsUnit: { fontFamily: fonts.black, fontSize: 24, color: colors.creme, letterSpacing: 0 },
  row: { flexDirection: "row", gap: 10, marginTop: 8 },
  statLabel: { fontFamily: fonts.bold, fontSize: 11, color: colors.saugeClair, textTransform: "uppercase", letterSpacing: 0.8 },
  statValue: { fontFamily: fonts.black, fontSize: 18, color: colors.creme },
  streak: { fontFamily: fonts.bold, fontSize: 13, color: colors.miel, marginTop: 8 },
  foot: { fontFamily: fonts.regular, fontSize: 10, color: "rgba(220,232,216,0.8)", marginTop: 10 },
});
