import React, { useState } from "react";
import { View, TextInput, StyleSheet, Pressable, Text } from "react-native";
import { breedInfo } from "@stanandwill/core";
import { Button, Card, P, Small } from "./ui";
import { colors, fonts, radius } from "../lib/theme";
import { API_URL } from "../lib/supabase";
import { useStore } from "../lib/store";

/**
 * Carte « votre race arrive » : liste d'attente par race pour mesurer la demande.
 * Envoie e-mail + race à /api/waitlist (même route que le site) ; un échec réseau est mémorisé localement.
 */
export function BreedWaitlist({ breedId, dogName }: { breedId: string; dogName: string }) {
  const info = breedInfo(breedId);
  const { waitlist, setWaitlist } = useStore();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const done = waitlist?.breedId === breedId;

  if (info.status !== "coming") return null;

  const submit = async () => {
    const e = email.trim().toLowerCase();
    if (!/.+@.+\..+/.test(e) || !consent) return;
    setBusy(true);
    let sent = false;
    try {
      const r = await fetch(`${API_URL}/api/waitlist`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: e, dog: dogName, breed: info.id, consent: true, source: "app-bilan" }),
      });
      sent = r.ok;
    } catch {}
    setWaitlist({ breedId, email: e, sentAt: new Date().toISOString(), synced: sent });
    setBusy(false);
  };

  return (
    <Card style={s.card}>
      <Text style={s.kicker}>Plan complet {info.label} : {info.eta}</Text>
      <P style={{ marginTop: 6 }}>
        {done
          ? `C'est noté. Vous serez prévenu dès que le plan de prévention ${info.label} est relu par notre vétérinaire, avec le tarif fondateur.`
          : `Le bilan ci-dessus utilise ce que l'on sait déjà de la race. Le plan complet (score affiné, gestes hebdomadaires, signes d'alerte) arrive en ${info.eta}. Laissez votre e-mail pour être prévenu et profiter du tarif fondateur à 29,99 € la première année.`}
      </P>
      {!done ? (
        <>
          <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="vous@exemple.fr" style={s.input} />
          <Pressable onPress={() => setConsent(!consent)} style={s.row} accessibilityRole="checkbox" accessibilityState={{ checked: consent }}>
            <View style={[s.box, consent && s.boxOn]}>{consent ? <Text style={{ color: colors.blanc, fontFamily: fonts.black, fontSize: 12 }}>✓</Text> : null}</View>
            <Small style={{ flex: 1 }}>J'accepte de recevoir l'annonce du plan {info.label} et quelques conseils de race (désinscription en un clic).</Small>
          </Pressable>
          <Button title="Me prévenir" variant="secondary" onPress={submit} loading={busy} disabled={!consent || email.trim().length < 5} />
        </>
      ) : null}
    </Card>
  );
}

const s = StyleSheet.create({
  card: { marginTop: 16, borderColor: colors.sauge, backgroundColor: colors.saugeClair },
  kicker: { fontFamily: fonts.black, fontSize: 14, color: colors.foret, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { borderWidth: 1, borderColor: colors.ligne, borderRadius: radius.sm, padding: 12, fontFamily: fonts.regular, fontSize: 16, marginTop: 12, backgroundColor: colors.blanc },
  row: { flexDirection: "row", gap: 10, alignItems: "flex-start", marginVertical: 10 },
  box: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: colors.sauge, alignItems: "center", justifyContent: "center", marginTop: 1, backgroundColor: colors.blanc },
  boxOn: { backgroundColor: colors.foret, borderColor: colors.foret },
});
