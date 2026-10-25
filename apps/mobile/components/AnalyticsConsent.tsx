import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { getConsent, onConsentChange, setConsent, type Consent } from "../lib/telemetry";
import { supabase, supabaseConfigured } from "../lib/supabase";
import { Button, Card, H2, Small } from "./ui";
import { colors, fonts } from "../lib/theme";

/** Consentement aux statistiques anonymes : état partagé entre la carte d'accueil et les Réglages. */
export function useAnalyticsConsent(): [Consent, (c: "yes" | "no") => void] {
  const [c, setC] = useState<Consent>(getConsent());
  useEffect(() => onConsentChange(setC), []);
  const choose = (v: "yes" | "no") => {
    setConsent(v).catch(() => {});
    // Trace du choix sur le compte (RGPD : profiles.consent_analytics), si connecté.
    if (supabaseConfigured) {
      supabase.auth.getSession().then(({ data }) => {
        const id = data.session?.user.id;
        if (id) supabase.from("profiles").update({ consent_analytics: v === "yes", consents_updated_at: new Date().toISOString() }).eq("id", id).then(() => {}, () => {});
      });
    }
  };
  return [c, choose];
}

/** Carte affichée une seule fois (tant que le maître n'a pas choisi). Les deux boutons ont le même poids (CNIL). */
export function AnalyticsConsentCard() {
  const [c, choose] = useAnalyticsConsent();
  if (c !== null) return null;
  return (
    <Card style={{ marginTop: 14, borderColor: colors.sauge }}>
      <H2>Aidez Stan & Will à s'améliorer</H2>
      <Small style={{ marginTop: 6 }}>
        Acceptez-vous des statistiques d'usage anonymes (par exemple « une balade a été enregistrée ») ? Jamais le nom de votre chien, vos questions ni votre position. Hébergé en Europe, modifiable à tout moment dans Carnet → Réglages.
      </Small>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
        <View style={{ flex: 1 }}><Button title="Refuser" variant="secondary" onPress={() => choose("no")} /></View>
        <View style={{ flex: 1 }}><Button title="Accepter" variant="secondary" onPress={() => choose("yes")} /></View>
      </View>
    </Card>
  );
}

/** Ligne des Réglages. */
export function AnalyticsConsentSetting() {
  const [c, choose] = useAnalyticsConsent();
  const on = c === "yes";
  return (
    <Card style={{ marginTop: 12 }}>
      <Pressable onPress={() => choose(on ? "no" : "yes")} style={s.row} accessibilityRole="switch" accessibilityState={{ checked: on }}>
        <View style={{ flex: 1 }}>
          <H2>Statistiques anonymes</H2>
          <Small style={{ marginTop: 4 }}>Nous aide à savoir ce qui sert vraiment (écrans utilisés, balades enregistrées). Aucune donnée personnelle, hébergement en Europe. Les rapports de plantage techniques, sans données personnelles, restent actifs pour la sécurité de l'app.</Small>
        </View>
        <View style={[s.switch, on && s.switchOn]}><View style={[s.knob, on && { alignSelf: "flex-end" }]} /></View>
      </Pressable>
      <Text style={s.state}>{c === null ? "Pas encore choisi" : on ? "Activé" : "Désactivé"}</Text>
    </Card>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 },
  switch: { width: 50, height: 30, borderRadius: 15, backgroundColor: colors.ligne, padding: 3, justifyContent: "center" },
  switchOn: { backgroundColor: colors.foret },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.blanc },
  state: { fontFamily: fonts.bold, fontSize: 12, color: colors.texteDoux, marginTop: 6 },
});
