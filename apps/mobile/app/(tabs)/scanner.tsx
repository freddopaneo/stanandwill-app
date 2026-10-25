import React, { useState } from "react";
import { View, ScrollView, StyleSheet, Pressable, Text, TextInput, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useStore } from "../../lib/store";
import { Button, Card, H1, H2, P, Pill, Small } from "../../components/ui";
import { colors, fonts, radius } from "../../lib/theme";
import { analyzeFood, analyzePhoto, QuotaError, type ScanResult } from "../../lib/api";
import { track } from "../../lib/telemetry";

type Mode = "food" | "stool" | "skin" | "eye" | "posture";
const MODES: { id: Mode; emoji: string; label: string; hint: string }[] = [
  { id: "food", emoji: "🍖", label: "Aliment", hint: "Code-barres ou nom du produit" },
  { id: "stool", emoji: "💩", label: "Selles", hint: "Photo, lumière du jour" },
  { id: "skin", emoji: "🐾", label: "Peau / pelage", hint: "Photo nette, à 20 cm" },
  { id: "eye", emoji: "👁️", label: "Œil", hint: "Photo de face, sans flash" },
  { id: "posture", emoji: "🦴", label: "Dos / posture", hint: "Photo de profil, debout" },
];

/**
 * Onglet 2 : Scanner. v1 = saisie du code-barres / nom + photo envoyée au serveur (/api/scan).
 * Étape 5 : lecture du code-barres par la caméra (expo-camera) et Open Pet Food Facts côté serveur.
 */
export default function Scanner() {
  const router = useRouter();
  const { dog, premium } = useStore();
  const [mode, setMode] = useState<Mode>("food");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);

  const runFood = async () => {
    if (!dog) return;
    setBusy(true); setResult(null);
    try { setResult(await analyzeFood(query.trim(), dog)); track("scan_done", { mode: "food" }); }
    catch (e: any) { if (e instanceof QuotaError) router.push("/(onboarding)/paywall"); else Alert.alert("Analyse impossible", e?.message ?? "Réessayez."); }
    finally { setBusy(false); }
  };

  const runPhoto = async (fromCamera: boolean) => {
    if (!dog) return;
    const perm = fromCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Autorisation nécessaire", "Activez l'accès dans les réglages du téléphone."); return; }
    const picked = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, exif: false })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, exif: false, mediaTypes: ["images"] });
    if (picked.canceled || !picked.assets[0]) return;
    setBusy(true); setResult(null);
    try { if (mode === "food") return; setResult(await analyzePhoto(mode, picked.assets[0].uri, dog)); track("scan_done", { mode }); }
    catch (e: any) { if (e instanceof QuotaError) router.push("/(onboarding)/paywall"); else Alert.alert("Analyse impossible", e?.message ?? "Réessayez."); }
    finally { setBusy(false); }
  };

  const current = MODES.find((m) => m.id === mode)!;

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <H1>Scanner</H1>
        <Small style={{ marginTop: 4 }}>Un avis en moins d'une minute. Jamais un diagnostic.</Small>

        <View style={s.modes}>
          {MODES.map((m) => (
            <Pressable key={m.id} onPress={() => { setMode(m.id); setResult(null); }} style={[s.mode, mode === m.id && s.modeSel]}>
              <Text style={{ fontSize: 22 }}>{m.emoji}</Text>
              <Text style={[s.modeLabel, mode === m.id && { color: colors.foret }]}>{m.label}</Text>
            </Pressable>
          ))}
        </View>

        <Card style={{ marginTop: 16 }}>
          <H2>{current.label}</H2>
          <Small style={{ marginTop: 2 }}>{current.hint}</Small>
          {mode === "food" ? (
            <>
              <TextInput value={query} onChangeText={setQuery} placeholder="Ex. 3182550702676 ou « Royal Canin Dachshund »" style={s.input} />
              <Button title="Analyser" onPress={runFood} loading={busy} disabled={query.trim().length < 3} />
              <Small style={{ marginTop: 8 }}>Scan du code-barres par la caméra : étape 5.</Small>
            </>
          ) : (
            <View style={{ marginTop: 12, gap: 8 }}>
              <Button title="Prendre une photo" onPress={() => runPhoto(true)} loading={busy} />
              <Button title="Choisir dans la galerie" variant="secondary" onPress={() => runPhoto(false)} disabled={busy} />
              <Small>La photo est analysée puis supprimée sous 30 jours. Aucune donnée vous concernant n'est transmise au modèle.</Small>
            </View>
          )}
        </Card>

        {result ? <ResultCard r={result} /> : null}

        {!premium ? (
          <Pressable onPress={() => router.push("/(onboarding)/paywall")} style={s.upsell}>
            <Text style={{ fontFamily: fonts.black, color: colors.foretFonce }}>3 scans offerts, puis illimités avec le plan</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function ResultCard({ r }: { r: ScanResult }) {
  const tone = r.triage === "emergency" || r.triage === "consult" ? "urgence" : r.triage === "watch" ? "vigilance" : "bon";
  const label = r.triage === "emergency" ? "Urgence : appelez un vétérinaire" : r.triage === "consult" ? "À montrer au vétérinaire" : r.triage === "watch" ? "À surveiller" : "Rien d'inquiétant";
  return (
    <Card style={{ marginTop: 16, borderColor: tone === "urgence" ? colors.urgence : colors.ligne }}>
      <Pill label={label} tone={tone} />
      <H2 style={{ marginTop: 8 }}>{r.title}</H2>
      <P style={{ marginTop: 6 }}>{r.summary}</P>
      {r.points.map((p) => <P key={p} style={{ marginTop: 6 }}>• {p}</P>)}
      {r.action ? <View style={s.actionBox}><P style={{ fontFamily: fonts.bold }}>Ce que vous pouvez faire</P><P>{r.action}</P></View> : null}
      <Small style={{ marginTop: 10 }}>{r.source ?? "Réponse générée par IA, cadre validé par un vétérinaire."}</Small>
    </Card>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.creme },
  body: { padding: 20, paddingBottom: 40 },
  modes: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  mode: { width: "31%", backgroundColor: colors.blanc, borderWidth: 1.5, borderColor: colors.ligne, borderRadius: radius.md, padding: 10, alignItems: "center", gap: 4 },
  modeSel: { borderColor: colors.foret, backgroundColor: colors.saugeClair },
  modeLabel: { fontFamily: fonts.bold, fontSize: 12, color: colors.texteDoux },
  input: { borderWidth: 1, borderColor: colors.ligne, borderRadius: radius.sm, padding: 12, fontFamily: fonts.regular, fontSize: 16, marginVertical: 12, backgroundColor: colors.creme },
  upsell: { marginTop: 16, backgroundColor: colors.miel, borderRadius: radius.md, padding: 14 },
  actionBox: { marginTop: 12, backgroundColor: colors.saugeClair, borderRadius: 14, padding: 14, gap: 4 },
});
