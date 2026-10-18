import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "../../lib/store";
import { Button, Card, H1, H2, P, Pill, Small } from "../../components/ui";
import { ScoreGauge } from "../../components/ScoreGauge";
import { colors } from "../../lib/theme";
import { bilanPoints } from "../../lib/content";
import { BreedWaitlist } from "../../components/BreedWaitlist";
import { breedInfo } from "@stanandwill/core";

/** Écran 15 : le bilan. Premier point complet, les deux suivants verrouillés. */
export default function Bilan() {
  const router = useRouter();
  const { dog, score, premium } = useStore();
  if (!dog || !score) return null;
  const points = bilanPoints(dog, score);
  const info = breedInfo(dog.breed_id);
  const baseline = info.status === "full" ? (info.id === "dachshund" ? "Les teckels de son âge démarrent autour de " : `Les chiens de sa race et de son âge démarrent autour de `) + (score.components.slice(0, 3).reduce((a, c) => a + c.delta, 0)) : info.status === "coming" ? `Bilan de première approche · plan ${info.label} complet en ${info.eta}` : "Bilan général · poids, dents, activité";
  const coming = info.status === "coming";

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.body}>
        <H1>Le bilan de {dog.name}</H1>
        <View style={{ marginTop: 20 }}><ScoreGauge score={score.score} label={baseline} /></View>
        <Small style={{ marginTop: 12, textAlign: "center" }}>Niveau de vigilance : plus il est haut, plus les facteurs que vous contrôlez sont en place. Ce n'est pas un diagnostic.</Small>

        <H2 style={{ marginTop: 28 }}>Les 3 points de vigilance de {dog.name}</H2>
        {points.map((p, i) => (
          <Card key={p.key} style={{ marginTop: 12 }}>
            <Pill label={p.badge} tone={p.tone} />
            <H2 style={{ marginTop: 8, fontSize: 18 }}>{p.title}</H2>
            {i === 0 ? (
              <>
                <P style={{ marginTop: 6 }}>{p.body}</P>
                <View style={s.adviceBox}><P style={{ fontFamily: "Nunito_700Bold" }}>Le geste de cette semaine</P><P>{p.gesture}</P></View>
                <Small style={{ marginTop: 8 }}>Source : {p.source}</Small>
              </>
            ) : (
              <>
                <P style={{ marginTop: 6 }} numberOfLines={1}>{p.body}</P>
                <View style={s.locked}><Small>🔒 Dans le plan de prévention</Small></View>
              </>
            )}
          </Card>
        ))}
        {coming ? <BreedWaitlist breedId={dog.breed_id} dogName={dog.name} /> : null}
        <View style={{ height: 24 }} />
        {coming ? (
          <>
            <Button title="Continuer avec le bilan de première approche" onPress={() => router.replace("/(onboarding)/auth")} />
            <Button title="Voir quand même les offres" variant="ghost" onPress={() => router.push("/(onboarding)/paywall")} />
          </>
        ) : (
          <>
            {premium ? (
              <Button title={`Ouvrir le plan de ${dog.name}`} onPress={() => router.replace("/(tabs)/aujourdhui")} />
            ) : (
              <>
                <Button title={`Voir le plan de prévention de ${dog.name}`} onPress={() => router.push("/(onboarding)/paywall")} />
                <Button title="Continuer sans le plan" variant="ghost" onPress={() => router.replace("/(tabs)/aujourdhui")} />
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.creme },
  body: { padding: 20, paddingBottom: 40 },
  adviceBox: { marginTop: 12, backgroundColor: colors.saugeClair, borderRadius: 14, padding: 14, gap: 4 },
  locked: { marginTop: 10, backgroundColor: colors.creme, borderRadius: 10, padding: 10 },
});
