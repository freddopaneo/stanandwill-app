import React, { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, Pressable, Text, TextInput, Alert, Share } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ageMonthsFrom } from "@stanandwill/core";
import { useStore, breedProfile, answersFromDog, DOGS_INCLUDED } from "../../lib/store";
import { DogSwitcher } from "../../components/DogSwitcher";
import { supabase, supabaseConfigured } from "../../lib/supabase";
import { Button, Card, H1, H2, P, Pill, Small } from "../../components/ui";
import { ScoreGauge } from "../../components/ScoreGauge";
import { colors, fonts, radius } from "../../lib/theme";

const GESTURES: { key: string; label: string }[] = [
  { key: "harness", label: "Harnais plutôt que collier" },
  { key: "no_high_jumps", label: "Rampe / plus de sauts depuis le canapé" },
  { key: "knows_signs", label: "Je connais les 5 signes d'alerte du dos" },
  { key: "brushing", label: "Brossage des dents régulier" },
];

/**
 * Onglet 4 : Carnet. Poids, gestes validés, événements, fiche d'urgence, réglages RGPD.
 * Carnet cloud (sprint 3) : pesées, événements et balades sont sauvegardés sur le compte (lib/sync.ts, migration 0004).
 */
export default function Carnet() {
  const router = useRouter();
  const { dog, score, weights, events, walks, addWeight, addEvent, resetAll, session, premium, dogs, removeDog, setAnswers, resetAnswers, notifHour, setNotifHour, walkHour, setWalkHour, syncStatus, syncing, syncNow } = useStore();
  const [kg, setKg] = useState("");
  const [tab, setTab] = useState<"suivi" | "urgence" | "reglages">("suivi");
  const [recap, setRecap] = useState<boolean | null>(null);
  // Préférence « récap du dimanche » (profiles.recap_opt_in, migration 0005), lue à l'ouverture des réglages.
  useEffect(() => {
    if (tab !== "reglages" || !session || !supabaseConfigured) return;
    supabase.from("profiles").select("recap_opt_in").eq("id", session.user.id).single()
      .then(({ data }) => setRecap(data ? Boolean((data as any).recap_opt_in) : null), () => setRecap(null));
  }, [tab, session?.user.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggleRecap = async () => {
    if (!session || recap == null) return;
    const next = !recap; setRecap(next);
    const { error } = await supabase.from("profiles").update({ recap_opt_in: next }).eq("id", session.user.id);
    if (error) { setRecap(!next); Alert.alert("Réglage non enregistré", "Vérifiez votre connexion et réessayez."); }
  };
  if (!dog || !score) return null;

  const ageM = ageMonthsFrom(dog.birth_month ?? undefined);
  const ageTxt = ageM == null ? "âge inconnu" : ageM < 12 ? `${ageM} mois` : `${Math.floor(ageM / 12)} an${ageM >= 24 ? "s" : ""}`;
  const done = new Set(events.filter((e) => e.kind === "gesture").map((e) => e.title));
  const last = weights[weights.length - 1];
  const prev = weights.length > 1 ? weights[weights.length - 2] : null;
  const trend = last && prev ? last.kg - prev.kg : 0;
  const ref = breedProfile(dog.breed_id).weightRef?.[dog.size ?? "standard"];

  const saveWeight = () => {
    const v = parseFloat(kg.replace(",", "."));
    if (!v || v < 0.5 || v > 90) { Alert.alert("Poids invalide", "Entrez un poids en kilos, ex. 8,4"); return; }
    addWeight(Math.round(v * 10) / 10); setKg("");
  };

  const toggleGesture = (key: string) => {
    if (done.has(key)) return;
    addEvent({ kind: "gesture", title: key });
  };

  const shareEmergency = async () => {
    const lines = [
      `FICHE D'URGENCE — ${dog.name}`,
      `Race : ${dog.breed_id === "dachshund" ? "Teckel" : dog.breed_id}${dog.variety ? ` (${dog.variety})` : ""}, ${dog.sex === "female" ? "femelle" : "mâle"}, ${ageTxt}, ${dog.neutered === "yes" ? "stérilisé" : "non stérilisé"}`,
      last ? `Dernier poids : ${last.kg} kg (${new Date(last.date).toLocaleDateString("fr-FR")})` : "",
      dog.conditions.length ? `Antécédents : ${dog.conditions.join(", ")}` : "Antécédents : aucun déclaré",
      `Score de vigilance : ${score.score}/100 (Stan & Will, algo ${score.algoVersion})`,
      "",
      "Signes d'alerte du dos (teckel) : dos voûté, refus de sauter, cris au portage, démarche ivre, tremblements.",
      "Centre antipoison vétérinaire CAPAE Ouest : 02 40 68 77 40 (24 h/24).",
    ].filter(Boolean).join("\n");
    await Share.share({ message: lines, title: `Fiche d'urgence de ${dog.name}` });
  };

  const exportData = async () => {
    if (!supabaseConfigured || !session) {
      const payload = JSON.stringify({ dog, weights, events, walks, score }, null, 2);
      await Share.share({ message: payload, title: "Mes données Stan & Will" });
      return;
    }
    const { data, error } = await supabase.rpc("export_my_data");
    if (error) { Alert.alert("Export impossible", error.message); return; }
    await Share.share({ message: JSON.stringify(data, null, 2), title: "Mes données Stan & Will" });
  };

  const deleteAccount = () => {
    Alert.alert("Supprimer mon compte et mes données", "Tout est effacé : profil, chiens, pesées, photos. Cette action est définitive.", [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: async () => {
        if (supabaseConfigured && session) {
          const { error } = await supabase.rpc("request_account_deletion");
          if (error) { Alert.alert("Erreur", error.message); return; }
          await supabase.auth.signOut();
        }
        await resetAll();
        router.replace("/(onboarding)/welcome");
      } },
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flex: 1 }}><H1>Carnet de {dog.name}</H1><Small>{ageTxt} · {dog.sex === "female" ? "femelle" : "mâle"} · {premium ? "Plan actif" : "Version gratuite"}</Small></View>
        </View>

        <View style={{ marginTop: 10 }}><DogSwitcher always /></View>

        <View style={s.segments}>
          {(["suivi", "urgence", "reglages"] as const).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={[s.segment, tab === t && s.segmentSel]}>
              <Text style={[s.segmentText, tab === t && { color: colors.blanc }]}>{t === "suivi" ? "Suivi" : t === "urgence" ? "Urgence" : "Réglages"}</Text>
            </Pressable>
          ))}
        </View>

        {tab === "suivi" ? (
          <>
            <Card style={{ marginTop: 16 }}>
              <H2>Poids</H2>
              {last ? (
                <P style={{ marginTop: 4 }}>{last.kg} kg le {new Date(last.date).toLocaleDateString("fr-FR")}{prev ? ` · ${trend > 0 ? "+" : ""}${trend.toFixed(1)} kg depuis la pesée précédente` : ""}</P>
              ) : <Small style={{ marginTop: 4 }}>Aucune pesée. Balance de salle de bain : vous avec, vous sans.</Small>}
              {ref ? <Small style={{ marginTop: 4 }}>Fourchette de référence pour sa variété : {ref[dog.sex === "female" ? "female" : "male"][0]}–{ref[dog.sex === "female" ? "female" : "male"][1]} kg</Small> : null}
              <View style={{ flexDirection: "row", gap: 8, marginTop: 12, alignItems: "center" }}>
                <TextInput value={kg} onChangeText={setKg} keyboardType="decimal-pad" placeholder="8,4" style={s.input} />
                <View style={{ flex: 1 }}><Button title="Enregistrer" variant="secondary" onPress={saveWeight} disabled={!kg} /></View>
              </View>
              {weights.length > 1 ? (
                <View style={s.spark}>
                  {weights.slice(-12).map((w, i, arr) => {
                    const min = Math.min(...arr.map((x) => x.kg)), max = Math.max(...arr.map((x) => x.kg));
                    const h = max === min ? 24 : 8 + ((w.kg - min) / (max - min)) * 40;
                    return <View key={i} style={{ width: 10, height: h, backgroundColor: i === arr.length - 1 ? colors.foret : colors.sauge, borderRadius: 4 }} />;
                  })}
                </View>
              ) : null}
            </Card>

            <Card style={{ marginTop: 12 }}>
              <H2>Gestes de prévention</H2>
              <Small style={{ marginTop: 2 }}>Chaque geste validé fait monter le score (+4, jusqu'à +12).</Small>
              {GESTURES.map((g) => (
                <Pressable key={g.key} onPress={() => toggleGesture(g.key)} style={s.gesture} accessibilityRole="checkbox" accessibilityState={{ checked: done.has(g.key) }}>
                  <View style={[s.box, done.has(g.key) && s.boxOn]}>{done.has(g.key) ? <Text style={{ color: colors.blanc, fontFamily: fonts.black }}>✓</Text> : null}</View>
                  <P style={{ flex: 1 }}>{g.label}</P>
                </Pressable>
              ))}
            </Card>

            <Card style={{ marginTop: 12 }}>
              <H2>Score de vigilance</H2>
              <View style={{ marginTop: 10 }}><ScoreGauge score={score.score} /></View>
              <Small style={{ marginTop: 10, fontFamily: fonts.bold }}>Ce qui compose le score</Small>
              {score.components.filter((c) => c.key !== "base").map((c) => (
                <View key={c.key} style={s.compRow}>
                  <Small style={{ flex: 1 }}>{c.label}{c.modifiable ? "" : " (fixe)"}</Small>
                  <Text style={[s.delta, { color: c.delta >= 0 ? colors.bon : colors.urgence }]}>{c.delta > 0 ? `+${c.delta}` : `${c.delta}`}</Text>
                </View>
              ))}
            </Card>

            <Card style={{ marginTop: 12 }}>
              <H2>Événements</H2>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {[{ k: "vaccine", l: "Vaccin" }, { k: "deworm", l: "Vermifuge" }, { k: "vet", l: "Visite véto" }, { k: "symptom", l: "Symptôme" }].map((b) => (
                  <Pressable key={b.k} onPress={() => addEvent({ kind: b.k as any, title: b.l })} style={s.chip}><Text style={s.chipText}>+ {b.l}</Text></Pressable>
                ))}
              </View>
              {events.filter((e) => e.kind !== "gesture").slice(-8).reverse().map((e) => (
                <View key={e.id} style={s.evRow}><Small>{new Date(e.date).toLocaleDateString("fr-FR")}</Small><P style={{ flex: 1 }}>{e.title}</P></View>
              ))}
            </Card>
          </>
        ) : null}

        {tab === "urgence" ? (
          <>
            <Card style={{ marginTop: 16, borderColor: colors.urgence }}>
              <Pill label="Les 5 signes d'alerte du dos" tone="urgence" />
              {["Dos voûté, ventre rentré, refus de bouger", "Refuse de sauter, de monter, ou crie quand on le porte", "Démarche ivre ou pattes arrière qui traînent", "Tremblements au repos, halètement sans effort", "Ne tient plus debout ou ne contrôle plus ses besoins → urgence absolue, chaque heure compte"].map((t, i) => (
                <View key={i} style={{ flexDirection: "row", gap: 10, marginTop: 10 }}><Text style={s.num}>{i + 1}</Text><P style={{ flex: 1 }}>{t}</P></View>
              ))}
              <Small style={{ marginTop: 12 }}>En attendant le vétérinaire : au calme, pas d'escalier, portez-le d'une main sous le poitrail et l'autre sous l'arrière-train, rien par la bouche.</Small>
            </Card>
            <Card style={{ marginTop: 12 }}>
              <H2>Numéros utiles</H2>
              <P style={{ marginTop: 6 }}>Centre antipoison vétérinaire (CAPAE Ouest) : 02 40 68 77 40, 24 h/24</P>
              <P style={{ marginTop: 4 }}>Belgique, centre antipoisons : 070 245 245</P>
              <Small style={{ marginTop: 6 }}>Votre vétérinaire habituel et le service de garde : à renseigner dans Réglages (étape 7).</Small>
            </Card>
            <View style={{ marginTop: 14 }}><Button title={`Partager la fiche d'urgence de ${dog.name}`} onPress={shareEmergency} /></View>
          </>
        ) : null}

        {tab === "reglages" ? (
          <>
            <Card style={{ marginTop: 16 }}>
              <H2>Compte</H2>
              <P style={{ marginTop: 6 }}>{session ? `Connecté : ${session.user.email}` : "Pas de compte : les données restent sur ce téléphone."}</P>
              {session ? (
                <Pressable onPress={() => syncNow()} disabled={syncing} accessibilityRole="button" accessibilityLabel="Sauvegarder maintenant" style={s.syncRow}>
                  <Text style={{ fontSize: 16 }}>{syncing ? "⏳" : "☁️"}</Text>
                  <Small style={{ flex: 1 }}>{syncing ? "Sauvegarde en cours…" : syncStatus}</Small>
                  {!syncing ? <Small style={{ color: colors.foret, fontFamily: fonts.bold }}>Sauvegarder</Small> : null}
                </Pressable>
              ) : null}
              {!session ? <View style={{ marginTop: 10 }}><Button title="Créer un compte pour sauvegarder" variant="secondary" onPress={() => router.push("/(onboarding)/auth")} /></View> : null}
              {!premium ? <View style={{ marginTop: 8 }}><Button title="Voir le plan de prévention" onPress={() => router.push("/(onboarding)/paywall")} /></View> : null}
            </Card>
            <Card style={{ marginTop: 12 }}>
              <H2>Rappel quotidien</H2>
              <Small style={{ marginTop: 4 }}>Une notification par jour, à l'heure de votre choix, avec le geste du jour. Rien n'est envoyé à un serveur.</Small>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                {[null, 7, 8, 9, 12, 18, 20].map((h) => (
                  <Pressable key={String(h)} onPress={() => setNotifHour(h)} style={[s.chip, notifHour === h && { backgroundColor: colors.foret }]}>
                    <Text style={[s.chipText, notifHour === h && { color: colors.blanc }]}>{h == null ? "Désactivé" : `${h} h`}</Text>
                  </Pressable>
                ))}
              </View>
            </Card>
            {session && recap != null ? (
              <Card style={{ marginTop: 12 }}>
                <Pressable onPress={toggleRecap} style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 }} accessibilityRole="switch" accessibilityState={{ checked: recap }}>
                  <View style={{ flex: 1 }}>
                    <H2>Récap du dimanche</H2>
                    <Small style={{ marginTop: 4 }}>Un e-mail court chaque dimanche soir : balades de la semaine, rappel de pesée, conseil de saison.</Small>
                  </View>
                  <View style={[s.switch, recap && s.switchOn]}><View style={[s.knob, recap && { alignSelf: "flex-end" }]} /></View>
                </Pressable>
              </Card>
            ) : null}
            <Card style={{ marginTop: 12 }}>
              <H2>Rappel de balade</H2>
              <Small style={{ marginTop: 4 }}>Si {dog.name} n'est pas encore sorti à cette heure-là, un seul rappel dans la journée. Aucun rappel si une balade est déjà enregistrée.</Small>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                {[null, 12, 17, 18, 19].map((h) => (
                  <Pressable key={String(h)} onPress={() => setWalkHour(h)} style={[s.chip, walkHour === h && { backgroundColor: colors.foret }]} accessibilityRole="radio" accessibilityState={{ selected: walkHour === h }}>
                    <Text style={[s.chipText, walkHour === h && { color: colors.blanc }]}>{h == null ? "Désactivé" : `${h} h`}</Text>
                  </Pressable>
                ))}
              </View>
            </Card>
            <Card style={{ marginTop: 12 }}>
              <H2>Mon foyer</H2>
              <Small style={{ marginTop: 4 }}>{dogs.length} chien{dogs.length > 1 ? "s" : ""} sur ce compte · jusqu'à {DOGS_INCLUDED} inclus dans le plan, sans supplément.</Small>
              <View style={{ marginTop: 12, gap: 8 }}>
                <Button title="Ajouter un chien" variant="secondary" onPress={() => { resetAnswers(); router.push("/(onboarding)/quiz/0"); }} />
                {dogs.length > 1 ? <Button title={`Retirer ${dog.name} de ce compte`} variant="ghost" onPress={() => Alert.alert(`Retirer ${dog.name}`, "Son carnet et ses pesées seront supprimés de ce téléphone.", [{ text: "Annuler", style: "cancel" }, { text: "Retirer", style: "destructive", onPress: () => removeDog(dog.id) }])} /> : null}
              </View>
            </Card>
            <Card style={{ marginTop: 12 }}>
              <H2>Mes données (RGPD)</H2>
              <Small style={{ marginTop: 4 }}>Hébergement en Europe (Francfort). Photos de scan supprimées sous 30 jours. Aucune revente de données.</Small>
              <View style={{ marginTop: 12, gap: 8 }}>
                <Button title="Exporter mes données" variant="secondary" onPress={exportData} />
                <Button title="Supprimer mon compte et mes données" variant="ghost" onPress={deleteAccount} />
              </View>
            </Card>
            <Card style={{ marginTop: 12 }}>
              <H2>À propos</H2>
              <Small style={{ marginTop: 4 }}>Stan & Will est édité par Eureca Design SRL (Belgique). L'app ne pose pas de diagnostic et ne remplace pas une consultation. Les réponses de l'assistant sont générées par une IA dans un cadre validé par un vétérinaire référent. Version 0.1 · score {score.algoVersion}.</Small>
              <View style={{ marginTop: 12 }}><Button title="Notre album : qui sont Stan et Will ?" variant="secondary" onPress={() => router.push("/album")} /></View>
              <View style={{ marginTop: 12 }}><Button title="Refaire le bilan" variant="ghost" onPress={() => Alert.alert("Refaire le bilan", "Les réponses du quiz seront remplacées. Les pesées et événements sont conservés.", [{ text: "Annuler", style: "cancel" }, { text: "Continuer", onPress: () => { setAnswers(answersFromDog(dog)); router.push("/(onboarding)/quiz/0"); } }])} /></View>
            </Card>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.creme },
  body: { padding: 20, paddingBottom: 40 },
  switch: { width: 50, height: 30, borderRadius: 15, backgroundColor: colors.ligne, padding: 3, justifyContent: "center" },
  switchOn: { backgroundColor: colors.foret },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.blanc },
  syncRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, minHeight: 44, backgroundColor: colors.creme, borderRadius: radius.sm, paddingHorizontal: 10 },
  segments: { flexDirection: "row", backgroundColor: colors.saugeClair, borderRadius: radius.md, padding: 4, marginTop: 14 },
  segment: { flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: "center" },
  segmentSel: { backgroundColor: colors.foret },
  segmentText: { fontFamily: fonts.bold, fontSize: 14, color: colors.foret },
  input: { width: 100, borderWidth: 1, borderColor: colors.ligne, borderRadius: radius.sm, padding: 12, fontFamily: fonts.bold, fontSize: 18, textAlign: "center", backgroundColor: colors.creme },
  spark: { flexDirection: "row", alignItems: "flex-end", gap: 6, height: 56, marginTop: 14 },
  gesture: { flexDirection: "row", gap: 10, alignItems: "center", marginTop: 12 },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: colors.sauge, alignItems: "center", justifyContent: "center" },
  boxOn: { backgroundColor: colors.foret, borderColor: colors.foret },
  compRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  delta: { fontFamily: fonts.black, fontSize: 14, minWidth: 36, textAlign: "right" },
  chip: { backgroundColor: colors.saugeClair, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12 },
  chipText: { fontFamily: fonts.bold, fontSize: 13, color: colors.foret },
  evRow: { flexDirection: "row", gap: 12, alignItems: "center", marginTop: 10 },
  num: { fontFamily: fonts.black, color: colors.urgence, fontSize: 16, width: 18 },
});
