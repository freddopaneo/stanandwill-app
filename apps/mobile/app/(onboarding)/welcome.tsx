import React from "react";
import { View, Image, StyleSheet, Text, ScrollView, Pressable, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../../components/ui";
import { colors, fonts, radius } from "../../lib/theme";
import { ILLUSTRATIONS } from "../../lib/album";

/**
 * Écran d'accueil (maquette B v2, validée le 18/10) :
 * bandeau foncé en haut avec le logo centré et « Stan & Will » dessous, kicker « Prévention santé par race »,
 * photo de Stan et Will en carte arrondie à cheval sur le bandeau, trois promesses, bouton miel.
 */
const FADE = [0.92, 0.8, 0.66, 0.52, 0.38, 0.26, 0.15, 0.07, 0.02];

export default function Welcome() {
  const router = useRouter();
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compact = height < 760; // iPhone SE / mini
  const cardW = width - 40;

  return (
    <View style={s.root}>
      <View style={s.band}>
        <SafeAreaView edges={["top"]} style={{ alignItems: "center", width: "100%", backgroundColor: colors.foretFonce, paddingBottom: 14 }}>
          <Pressable onPress={() => router.push("/(onboarding)/auth")} style={[s.account, { top: insets.top + 4 }]} accessibilityRole="button">
            <Text style={s.accountText}>J'ai un compte</Text>
          </Pressable>
          <Image source={require("../../assets/icon.png")} style={[s.logo, compact && { width: 56, height: 56, borderRadius: 16 }]} accessibilityIgnoresInvertColors />
          <Text style={[s.brand, compact && { fontSize: 22 }]}>Stan & Will</Text>
          <Text style={s.kicker}>L'application de prévention santé par race</Text>
        </SafeAreaView>
        {/* Dégradé vert forêt → crème (sans dépendance native) */}
        <View style={s.fade} pointerEvents="none">
          {FADE.map((o, i) => <View key={i} style={{ flex: 1, backgroundColor: colors.foretFonce, opacity: o }} />)}
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} bounces={false} showsVerticalScrollIndicator={false}>
        <View style={[s.card, { width: cardW, height: compact ? 220 : 270 }]}>
          <Image source={ILLUSTRATIONS.welcome} style={{ width: cardW, height: compact ? 220 : 270 }} resizeMode="cover" accessibilityLabel="Stan et Will assis devant la porte, prêts pour la balade" />
          <View style={s.shade} />
          <View style={s.cardText}>
            <Text style={s.cardTitle} numberOfLines={1} adjustsFontSizeToFit>Les compagnons malins de votre chien</Text>
            <Text style={s.cardSub}>Stan, 7 ans · Will, 3 ans</Text>
          </View>
        </View>

        <View style={s.tiles}>
          <Tile tint={colors.saugeClair} title="Bilan de vigilance" body="Les risques de sa race, par âge et poids" glyph="🛡️" />
          <Tile tint="#FCEBC2" title="Balades comptées" body="Ses pas estimés, son objectif du jour" glyph="🐾" />
          <Tile tint={colors.saugeClair} title="Copains de balade" body="Des maîtres près de chez vous" glyph="🐕‍🦺" />
        </View>

        {!compact && (
          <Text style={s.lead}>Teckel, bouledogue, chihuahua, spitz, cavalier et toutes les autres races : des conseils relus par des vétérinaires, jamais de diagnostic.</Text>
        )}

        <View style={{ flex: 1, minHeight: 12 }} />

        <Button title="Créer la fiche de mon chien" onPress={() => router.push("/(onboarding)/quiz/0")} />
        <Text style={s.under}>3 minutes · gratuit · sans compte</Text>
        <Pressable onPress={() => router.push("/album")} accessibilityRole="link" style={{ minHeight: 44, justifyContent: "center" }}>
          <Text style={s.album}>Notre album : découvrir Stan & Will</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Tile({ tint, title, body, glyph }: { tint: string; title: string; body: string; glyph: string }) {
  return (
    <View style={s.tile}>
      <View style={[s.tileIcon, { backgroundColor: tint }]}><Text style={{ fontSize: 17 }}>{glyph}</Text></View>
      <Text style={s.tileTitle}>{title}</Text>
      <Text style={s.tileBody}>{body}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.creme },
  band: { backgroundColor: colors.creme, alignItems: "center" },
  fade: { height: 36, width: "100%" },
  account: { position: "absolute", right: 12, minHeight: 44, justifyContent: "center", paddingHorizontal: 10 },
  accountText: { fontFamily: fonts.bold, fontSize: 13, color: colors.saugeClair },
  logo: { width: 60, height: 60, borderRadius: 18, marginTop: 4, shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  brand: { fontFamily: fonts.black, fontSize: 24, letterSpacing: -0.4, color: colors.creme, marginTop: 8 },
  kicker: { fontFamily: fonts.black, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: colors.miel, marginTop: 5, textAlign: "center", paddingHorizontal: 24 },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 22, paddingTop: 4 },
  card: { borderRadius: 26, overflow: "hidden", shadowColor: colors.foretFonce, shadowOpacity: 0.28, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 10, backgroundColor: colors.foretFonce },
  shade: { position: "absolute", left: 0, right: 0, bottom: 0, height: 80, backgroundColor: "rgba(20,41,31,0.55)" },
  cardText: { position: "absolute", left: 14, right: 14, bottom: 12, alignItems: "center" },
  cardTitle: { fontFamily: fonts.black, fontSize: 16, lineHeight: 20, letterSpacing: -0.2, color: colors.creme, textAlign: "center" },
  cardSub: { fontFamily: fonts.bold, fontSize: 12, color: colors.saugeClair, marginTop: 2, textAlign: "center" },
  tiles: { flexDirection: "row", gap: 10, marginTop: 16 },
  tile: { flex: 1, backgroundColor: colors.blanc, borderWidth: 1, borderColor: colors.ligne, borderRadius: 18, padding: 10, gap: 7, alignItems: "center" },
  tileIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  tileTitle: { fontFamily: fonts.black, fontSize: 13, lineHeight: 16, color: colors.foretFonce, textAlign: "center" },
  tileBody: { fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 15, color: colors.texteDoux, textAlign: "center" },
  lead: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.texteDoux, marginTop: 14 },
  under: { fontFamily: fonts.bold, fontSize: 13, color: colors.foret, textAlign: "center", marginTop: 10 },
  album: { fontFamily: fonts.bold, fontSize: 12, color: colors.texteDoux, textAlign: "center", textDecorationLine: "underline" },
});
