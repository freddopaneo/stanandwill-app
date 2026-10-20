import React, { useState } from "react";
import { View, ScrollView, StyleSheet, TextInput, Pressable, Text, Alert, Linking } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase, supabaseConfigured } from "../../lib/supabase";
import { useStore } from "../../lib/store";
import { Button, Card, H1, P, Small } from "../../components/ui";
import { colors, fonts, radius } from "../../lib/theme";

/**
 * Écran 17 : création du compte (après le bilan, jamais avant).
 * Lien magique par e-mail en v1 ; Apple / Google se branchent avec expo-apple-authentication et le fournisseur Google de Supabase.
 * Les consentements sont enregistrés dans profiles.consents (RGPD).
 */
export default function Auth() {
  const router = useRouter();
  const { dog, pullNow, syncNow } = useStore();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [cgu, setCgu] = useState(false);
  const [news, setNews] = useState(false);

  const valid = /.+@.+\..+/.test(email) && cgu;

  const sendLink = async () => {
    if (!supabaseConfigured) {
      Alert.alert("Compte non configuré", "Renseignez EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY dans .env. En attendant, vous pouvez continuer sans compte : les données restent sur ce téléphone.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: true, data: { marketing_consent: news } } });
    setBusy(false);
    if (error) Alert.alert("Envoi impossible", error.message);
    else setSent(true);
  };

  const verify = async () => {
    setBusy(true);
    const { data, error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: "email" });
    if (error || !data.session) { setBusy(false); Alert.alert("Code incorrect", error?.message ?? "Réessayez."); return; }
    try {
      const now = new Date().toISOString();
      await supabase.from("profiles").update({ consent_marketing: news, consent_ai_notice_at: now, consents_updated_at: now }).eq("id", data.session.user.id);
    } catch {}
    // Carnet cloud : on récupère d'abord ce qui existe déjà sur le compte (autre téléphone), puis on envoie ce téléphone.
    let count = 0;
    try { count = await pullNow(); await syncNow(); } catch {}
    // E-mail de bienvenue (une seule fois par compte, garanti côté serveur). Sans attendre la réponse.
    supabase.functions.invoke("welcome-email").catch(() => {});
    setBusy(false);
    if (count === 0) { router.replace("/(onboarding)/quiz/0"); return; }
    router.replace("/(tabs)/aujourdhui");
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <H1>{dog ? `Gardons le bilan de ${dog.name}` : "Retrouvons votre carnet"}</H1>
        <P style={{ marginTop: 10 }}>{dog
          ? "Un compte, c'est votre carnet retrouvé sur un nouveau téléphone, et une fiche d'urgence partageable. Pas de mot de passe : un code à 6 chiffres par e-mail."
          : "Entrez l'adresse de votre compte : vos chiens, pesées, événements et balades reviennent sur ce téléphone. Pas de mot de passe : un code à 6 chiffres par e-mail."}</P>

        {!sent ? (
          <Card style={{ marginTop: 20 }}>
            <Small>Adresse e-mail</Small>
            <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="vous@exemple.fr" style={s.input} />
            <Check checked={cgu} onPress={() => setCgu(!cgu)}>
              <Small>J'accepte les <Text style={s.link} onPress={() => Linking.openURL("https://stanandwill.netlify.app/confidentialite")}>conditions et la politique de confidentialité</Text>. J'ai compris que les réponses de l'app sont produites par une intelligence artificielle, sous contrôle vétérinaire, et ne constituent pas un diagnostic.</Small>
            </Check>
            <Check checked={news} onPress={() => setNews(!news)}>
              <Small>Je veux recevoir les conseils de saison et les nouveautés (un e-mail toutes les deux semaines au plus).</Small>
            </Check>
            <View style={{ marginTop: 14 }}>
              <Button title="Recevoir mon code" onPress={sendLink} disabled={!valid} loading={busy} />
            </View>
          </Card>
        ) : (
          <Card style={{ marginTop: 20 }}>
            <P style={{ fontFamily: fonts.bold }}>Code envoyé à {email}</P>
            <Small style={{ marginTop: 4 }}>Il arrive en moins d'une minute. Pensez aux courriers indésirables.</Small>
            <TextInput value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={8} placeholder="123456" style={[s.input, { letterSpacing: 6, fontSize: 22, textAlign: "center" }]} />
            <Button title="Valider" onPress={verify} disabled={code.trim().length < 6} loading={busy} />
            <Pressable onPress={() => setSent(false)} style={{ marginTop: 10 }}><Small style={{ textAlign: "center", textDecorationLine: "underline" }}>Changer d'adresse</Small></Pressable>
          </Card>
        )}

        <View style={{ marginTop: 10 }}>
          <Button title="Plus tard, rester sur ce téléphone" variant="ghost" onPress={() => router.replace("/(tabs)/aujourdhui")} />
        </View>
        <Small style={{ textAlign: "center", marginTop: 4 }}>Données hébergées en Europe (Francfort). Export et suppression en un geste depuis les réglages.</Small>
      </ScrollView>
    </SafeAreaView>
  );
}

function Check({ checked, onPress, children }: { checked: boolean; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked }} style={s.checkRow}>
      <View style={[s.box, checked && s.boxOn]}>{checked ? <Text style={{ color: colors.blanc, fontFamily: fonts.black, fontSize: 13 }}>✓</Text> : null}</View>
      <View style={{ flex: 1 }}>{children}</View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.creme },
  body: { padding: 20, paddingBottom: 40 },
  input: { borderWidth: 1, borderColor: colors.ligne, borderRadius: radius.sm, padding: 12, fontFamily: fonts.regular, fontSize: 16, marginTop: 6, marginBottom: 12, backgroundColor: colors.creme },
  checkRow: { flexDirection: "row", gap: 10, alignItems: "flex-start", marginTop: 8 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.sauge, alignItems: "center", justifyContent: "center", marginTop: 1 },
  boxOn: { backgroundColor: colors.foret, borderColor: colors.foret },
  link: { textDecorationLine: "underline", color: colors.foret },
});
