import React from "react";
import { View, Image, StyleSheet, Text, ScrollView, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { FRAGILE_BREEDS } from "@stanandwill/core";
import { Button } from "../../components/ui";
import { colors, fonts } from "../../lib/theme";

/**
 * Écran d'accueil. Hiérarchie : logo → ce que fait l'app (prévention santé par race) → la marque → les races → le bouton.
 * Tout tient sur un écran d'iPhone standard sans défilement ; les mentions secondaires sont en petit, en bas.
 */
export default function Welcome() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const compact = height < 760; // iPhone SE / mini

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} bounces={false} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <Image source={require("../../assets/icon.png")} style={[s.logo, compact && { width: 88, height: 88, borderRadius: 22 }]} accessibilityIgnoresInvertColors />
          <Text style={s.brand}>Stan & Will</Text>
          <Text style={s.kicker}>Prévention santé personnalisée par race</Text>
        </View>

        <View style={s.body}>
          <Text style={s.title}>Les compagnons malins de votre chien</Text>
          <Text style={s.lead}>
            Sa fiche en trois minutes, puis chaque semaine le bon geste pour sa race, son âge et son poids. Des réponses à vos inquiétudes, validées par des vétérinaires.
          </Text>

          <View style={s.pills}>
            {FRAGILE_BREEDS.map((b) => (
              <View key={b.id} style={s.pill}>
                <Text style={s.pillText}>{b.label}</Text>
              </View>
            ))}
            <View style={s.pill}><Text style={s.pillText}>+ toutes les races</Text></View>
            <View style={[s.pill, s.pillMiel]}><Text style={s.pillText}>Plusieurs chiens, un seul compte</Text></View>
          </View>

          <View style={{ marginTop: compact ? 16 : 22, gap: 8 }}>
            <Button title="Créer la fiche de mon chien" onPress={() => router.push("/(onboarding)/quiz/0")} />
            <Text style={s.under}>3 minutes, gratuit · son bilan de vigilance tout de suite</Text>
            <Button title="J'ai déjà un compte" variant="ghost" onPress={() => router.push("/(onboarding)/auth")} />
          </View>
        </View>

        <View style={s.footer}>
          <Text style={s.foot}>Gratuit pour commencer, sans compte. Vos données restent sur votre téléphone.</Text>
          <Text style={s.foot}>Stan, 7 ans, poil dur · Will, 3 ans, poil ras · deux teckels, et l'app qu'on aurait voulu avoir pour eux.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.creme },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12 },
  hero: { alignItems: "center", gap: 6, paddingTop: 8 },
  logo: { width: 112, height: 112, borderRadius: 28 },
  brand: { fontFamily: fonts.black, fontSize: 22, color: colors.foretFonce, marginTop: 6, letterSpacing: -0.3 },
  kicker: { fontFamily: fonts.bold, fontSize: 12, color: colors.foret, textTransform: "uppercase", letterSpacing: 1.2, textAlign: "center" },
  body: { flex: 1, justifyContent: "center", paddingTop: 20 },
  title: { fontFamily: fonts.black, fontSize: 26, lineHeight: 31, color: colors.foretFonce, letterSpacing: -0.4 },
  lead: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.texteDoux, marginTop: 8 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 14 },
  pill: { backgroundColor: colors.saugeClair, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  pillMiel: { backgroundColor: colors.miel },
  pillText: { fontFamily: fonts.bold, fontSize: 12, color: colors.foretFonce },
  under: { fontFamily: fonts.bold, fontSize: 12, color: colors.foret, textAlign: "center", marginTop: -2 },
  footer: { paddingTop: 14, gap: 4 },
  foot: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 15, color: colors.texteDoux, textAlign: "center" },
});
