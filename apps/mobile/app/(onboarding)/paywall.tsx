import React, { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, Pressable, Text, TextInput, Alert } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "../../lib/store";
import { Button, Card, H1, P, Small } from "../../components/ui";
import { colors, fonts, radius } from "../../lib/theme";
import { OFFERS, loadOffers, purchase, restore, redeemFounderCode, type OfferId } from "../../lib/billing";

/**
 * Écran 16 : le paywall.
 * Les prix affichés viennent de RevenueCat en production (lib/billing.ts) ; ici les valeurs par défaut du cahier des charges.
 */
export default function Paywall() {
  const router = useRouter();
  const { dog, setPremium } = useStore();
  const [choice, setChoice] = useState<OfferId>("annual");
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [offers, setOffers] = useState(OFFERS);
  useEffect(() => { loadOffers().then(setOffers).catch(() => {}); }, []);
  const name = dog?.name ?? "votre chien";

  const doRestore = async () => {
    setBusy(true);
    try { if (await restore()) { setPremium(true); router.replace("/(onboarding)/auth"); } else Alert.alert("Aucun achat trouvé", "Aucun abonnement actif n'est associé à ce compte App Store / Google Play."); }
    finally { setBusy(false); }
  };

  const buy = async () => {
    setBusy(true);
    try {
      const ok = await purchase(choice);
      if (ok) { setPremium(true); router.replace("/(onboarding)/auth"); }
    } catch (e: any) {
      Alert.alert("Paiement impossible", e?.message ?? "Réessayez dans un instant.");
    } finally { setBusy(false); }
  };

  const redeem = async () => {
    setBusy(true);
    try {
      const ok = await redeemFounderCode(code.trim());
      if (ok) { setPremium(true); router.replace("/(onboarding)/auth"); }
      else Alert.alert("Code inconnu", "Vérifiez le code reçu par e-mail (ex. TECKEL-2026).");
    } finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.body}>
        <H1>Le plan de prévention de {name}</H1>
        <P style={{ marginTop: 10 }}>Chaque semaine : un geste concret, le suivi du poids, l'analyse des aliments et des photos, et des réponses à vos inquiétudes, 24 h/24.</P>

        <Card style={{ marginTop: 18 }}>
          {[
            "Les 3 points de vigilance détaillés et mis à jour",
            "Le plan hebdomadaire adapté à son âge et son poids",
            "Scanner : aliments, friandises, selles, peau, yeux",
            "Demander : une réponse sourcée en moins d'une minute",
            "Carnet et fiche d'urgence partageable avec le vétérinaire",
            "Jusqu'à 3 chiens sur le même compte, sans supplément",
          ].map((t) => (
            <View key={t} style={s.row}><Text style={s.check}>✓</Text><P style={{ flex: 1 }}>{t}</P></View>
          ))}
        </Card>

        <View style={{ marginTop: 18, gap: 10 }}>
          {offers.map((o) => (
            <Pressable key={o.id} onPress={() => setChoice(o.id)} style={[s.offer, choice === o.id && s.offerSel]} accessibilityRole="radio" accessibilityState={{ selected: choice === o.id }}>
              <View style={{ flex: 1 }}>
                <Text style={s.offerTitle}>{o.title}</Text>
                <Small>{o.subtitle}</Small>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={s.price}>{o.price}</Text>
                {o.badge ? <View style={s.badge}><Text style={s.badgeText}>{o.badge}</Text></View> : null}
              </View>
            </Pressable>
          ))}
        </View>

        <View style={{ marginTop: 18 }}>
          <Button title={choice === "annual" ? "Commencer les 7 jours d'essai" : "Continuer"} onPress={buy} loading={busy} />
          <Small style={{ textAlign: "center", marginTop: 8 }}>
            {choice === "annual" ? "Gratuit 7 jours, puis 49,99 €/an. Rappel la veille de la fin de l'essai. Résiliable en un geste." : "Sans engagement, résiliable à tout moment depuis les réglages du téléphone."}
          </Small>
        </View>

        {showCode ? (
          <Card style={{ marginTop: 16 }}>
            <P style={{ fontFamily: fonts.bold }}>Code fondateur</P>
            <TextInput value={code} onChangeText={setCode} autoCapitalize="characters" placeholder="TECKEL-2026" style={s.input} />
            <Button title="Activer" variant="secondary" onPress={redeem} loading={busy} disabled={code.trim().length < 4} />
          </Card>
        ) : (
          <Pressable onPress={() => setShowCode(true)} style={{ marginTop: 14 }}><Small style={{ textAlign: "center", textDecorationLine: "underline" }}>J'ai un code fondateur</Small></Pressable>
        )}

        <Button title="Pas maintenant" variant="ghost" onPress={() => router.replace("/(onboarding)/auth")} />
        <Pressable onPress={doRestore}><Small style={{ textAlign: "center", textDecorationLine: "underline" }}>Restaurer un achat</Small></Pressable>
        <Small style={{ textAlign: "center", marginTop: 6 }}>Stan & Will ne pose pas de diagnostic et ne remplace pas votre vétérinaire.</Small>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.creme },
  body: { padding: 20, paddingBottom: 40 },
  row: { flexDirection: "row", gap: 10, paddingVertical: 5, alignItems: "flex-start" },
  check: { color: colors.foret, fontFamily: fonts.black, fontSize: 16, marginTop: 2 },
  offer: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.blanc, borderWidth: 1.5, borderColor: colors.ligne, borderRadius: radius.md, padding: 14 },
  offerSel: { borderColor: colors.foret, backgroundColor: colors.saugeClair },
  offerTitle: { fontFamily: fonts.black, fontSize: 16, color: colors.foretFonce },
  price: { fontFamily: fonts.black, fontSize: 18, color: colors.foretFonce },
  badge: { backgroundColor: colors.miel, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4 },
  badgeText: { fontFamily: fonts.bold, fontSize: 11, color: colors.foretFonce },
  input: { borderWidth: 1, borderColor: colors.ligne, borderRadius: radius.sm, padding: 12, fontFamily: fonts.bold, fontSize: 16, marginVertical: 10, letterSpacing: 1 },
});
