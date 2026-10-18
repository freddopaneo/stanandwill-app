import React, { useState } from "react";
import { View, ScrollView, StyleSheet, Pressable, Text, Image, Modal, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ALBUM, type AlbumPhoto } from "../lib/album";
import { H1, P, Small, Card } from "../components/ui";
import { colors, fonts, radius } from "../lib/theme";

/**
 * « Notre album » : qui sont Stan et Will, et leur vie de tous les jours.
 * Grille 2 colonnes, appui = plein écran avec légende. Les photos sont embarquées dans l'app (aucun chargement réseau).
 */
export default function Album() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState<AlbumPhoto | null>(null);
  const col = (width - 40 - 10) / 2;

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={s.body}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 8, minHeight: 44, justifyContent: "center" }}><Small style={{ color: colors.foret, fontFamily: fonts.bold }}>← Retour</Small></Pressable>
        <H1>Notre album</H1>
        <P style={{ marginTop: 8 }}>
          <Text style={{ fontFamily: fonts.bold }}>Stan</Text>, 7 ans, teckel à poil dur, le sage de la maison : il a passé l'âge où le dos des teckels devient fragile, et on a appris à veiller sur lui.{" "}
          <Text style={{ fontFamily: fonts.bold }}>Will</Text>, 3 ans, poil ras, le joueur : il entre dans cette période. C'est pour eux deux que cette app existe.
        </P>
        <Card style={{ marginTop: 14, backgroundColor: colors.saugeClair, borderColor: colors.sauge }}>
          <Small style={{ color: colors.foretFonce }}>Ce qu'on a voulu pour eux, on l'a construit pour tous les chiens : comprendre les fragilités de sa race, faire les bons gestes au bon moment, et profiter des balades l'esprit léger.</Small>
        </Card>

        <View style={s.grid}>
          {ALBUM.map((ph) => (
            <Pressable key={ph.id} onPress={() => setOpen(ph)} accessibilityRole="imagebutton" accessibilityLabel={ph.caption} style={[s.cell, { width: col, height: ph.tall ? col * 1.5 : col * 1.2 }]}>
              <Image source={ph.src} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
              <View style={s.capWrap}><Text style={s.cap} numberOfLines={2}>{ph.caption}</Text></View>
            </Pressable>
          ))}
        </View>
        <Small style={{ textAlign: "center", marginTop: 18 }}>Vos propres photos restent sur votre téléphone : l'album, c'est juste nous qui nous présentons.</Small>
      </ScrollView>

      <Modal visible={!!open} transparent animationType="fade" onRequestClose={() => setOpen(null)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(null)} accessibilityRole="button" accessibilityLabel="Fermer">
          {open && (
            <View style={{ width, alignItems: "center" }}>
              <Image source={open.src} style={{ width: width - 24, height: (width - 24) * 1.25, borderRadius: radius.lg }} resizeMode="contain" />
              <Text style={s.bigCap}>{open.caption}</Text>
              <Small style={{ color: colors.saugeClair, marginTop: 4 }}>Toucher pour fermer</Small>
            </View>
          )}
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.creme },
  body: { padding: 20, paddingBottom: 40 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 18 },
  cell: { borderRadius: 18, overflow: "hidden", backgroundColor: colors.ligne },
  capWrap: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: "rgba(20,41,31,0.62)" },
  cap: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 15, color: colors.creme },
  backdrop: { flex: 1, backgroundColor: "rgba(20,41,31,0.94)", alignItems: "center", justifyContent: "center" },
  bigCap: { fontFamily: fonts.black, fontSize: 18, color: colors.creme, textAlign: "center", marginTop: 14, paddingHorizontal: 24 },
});
