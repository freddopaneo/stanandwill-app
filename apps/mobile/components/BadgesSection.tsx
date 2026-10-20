import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Modal } from "react-native";
import type { Badge, WeeklyChallenge } from "@stanandwill/core";
import { Card, H2, P, Small, Button } from "./ui";
import { colors, fonts, radius } from "../lib/theme";

/** Carte « Défi de la semaine » : objectif, barre de progression, jours restants. */
export function ChallengeCard({ c, dogName }: { c: WeeklyChallenge; dogName: string }) {
  const fmt = (v: number) => v.toLocaleString("fr-FR");
  return (
    <Card style={[{ marginTop: 14 }, c.done && { borderColor: colors.bon, backgroundColor: "#F1F8F1" }]}>
      <View style={s.row}>
        <Text style={s.emoji}>{c.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Small style={{ fontFamily: fonts.bold, color: colors.foret }}>Défi de la semaine</Small>
          <P style={{ fontFamily: fonts.black, fontSize: 18 }}>{c.title}</P>
        </View>
      </View>
      <Small style={{ marginTop: 8 }}>{c.description}</Small>
      <View style={s.track}><View style={[s.fill, { width: `${Math.round(c.progress * 100)}%` }, c.done && { backgroundColor: colors.bon }]} /></View>
      <View style={[s.row, { marginTop: 6 }]}>
        <Small style={{ flex: 1, fontFamily: fonts.bold, color: colors.foretFonce }}>{fmt(Math.min(c.current, c.target))} / {fmt(c.target)} {c.unit}</Small>
        <Small>{c.done ? `Bravo ${dogName} ! ✅` : c.daysLeft <= 1 ? "Dernier jour" : `${c.daysLeft} jours restants`}</Small>
      </View>
    </Card>
  );
}

/** Grille de badges : acquis en couleur, verrouillés en grisé avec leur progression. Un appui ouvre le détail. */
export function BadgesGrid({ badges }: { badges: Badge[] }) {
  const [open, setOpen] = useState<Badge | null>(null);
  const earned = badges.filter((b) => b.earned).length;
  return (
    <>
      <View style={[s.row, { marginTop: 22 }]}>
        <H2 style={{ flex: 1 }}>Badges</H2>
        <Small style={{ fontFamily: fonts.bold }}>{earned} / {badges.length}</Small>
      </View>
      <Card style={{ marginTop: 10, paddingHorizontal: 10 }}>
        <View style={s.grid}>
          {badges.map((b) => (
            <Pressable key={b.id} onPress={() => setOpen(b)} style={s.cell} accessibilityRole="button"
              accessibilityLabel={`${b.title}, ${b.earned ? "obtenu" : `progression ${Math.round(b.progress * 100)} %`}`}>
              <View style={[s.medal, b.earned ? s.medalOn : s.medalOff]}>
                <Text style={[s.medalEmoji, !b.earned && { opacity: 0.35 }]}>{b.emoji}</Text>
              </View>
              {!b.earned && <View style={s.miniTrack}><View style={[s.miniFill, { width: `${Math.round(b.progress * 100)}%` }]} /></View>}
              <Text style={[s.cellText, !b.earned && { color: colors.texteDoux }]} numberOfLines={2}>{b.title}</Text>
            </Pressable>
          ))}
        </View>
      </Card>
      <Modal visible={!!open} transparent animationType="fade" onRequestClose={() => setOpen(null)}>
        <Pressable style={s.back} onPress={() => setOpen(null)}>
          <View style={s.pop}>
            {open && <>
              <Text style={{ fontSize: 54, textAlign: "center", opacity: open.earned ? 1 : 0.4 }}>{open.emoji}</Text>
              <H2 style={{ textAlign: "center", marginTop: 6 }}>{open.title}</H2>
              <Small style={{ textAlign: "center", marginTop: 6 }}>{open.earned ? "Badge obtenu ✅" : `${open.how} (${Math.round(open.progress * 100)} %)`}</Small>
              <View style={{ marginTop: 16 }}><Button title="Fermer" variant="secondary" onPress={() => setOpen(null)} /></View>
            </>}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

/** Bandeau de félicitations affiché dans la feuille de fin de balade. */
export function NewBadgesBanner({ badges }: { badges: Badge[] }) {
  if (!badges.length) return null;
  return (
    <View style={s.banner}>
      <Text style={{ fontSize: 26 }}>{badges.map((b) => b.emoji).join(" ")}</Text>
      <View style={{ flex: 1 }}>
        <Small style={{ fontFamily: fonts.bold, color: colors.foretFonce }}>{badges.length > 1 ? "Nouveaux badges !" : "Nouveau badge !"}</Small>
        <Small style={{ color: colors.foretFonce }}>{badges.map((b) => b.title).join(" · ")}</Small>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  emoji: { fontSize: 30, marginRight: 12 },
  track: { height: 10, backgroundColor: colors.ligne, borderRadius: 999, marginTop: 12, overflow: "hidden" },
  fill: { height: 10, backgroundColor: colors.miel, borderRadius: 999 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: "25%", alignItems: "center", paddingVertical: 8, paddingHorizontal: 2, minHeight: 44 },
  medal: { width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  medalOn: { backgroundColor: "#FDF1D8", borderColor: colors.miel },
  medalOff: { backgroundColor: colors.creme, borderColor: colors.ligne },
  medalEmoji: { fontSize: 26 },
  miniTrack: { width: 40, height: 4, backgroundColor: colors.ligne, borderRadius: 2, marginTop: 4, overflow: "hidden" },
  miniFill: { height: 4, backgroundColor: colors.sauge },
  cellText: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, color: colors.foretFonce, textAlign: "center", marginTop: 4 },
  back: { flex: 1, backgroundColor: "rgba(20,41,31,0.55)", justifyContent: "center", padding: 28 },
  pop: { backgroundColor: colors.creme, borderRadius: radius.xl, padding: 22 },
  banner: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FDF1D8", borderColor: colors.miel, borderWidth: 1.5, borderRadius: radius.md, padding: 12, marginTop: 12 },
});
