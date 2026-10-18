import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, ScrollView, StyleSheet, Pressable, Text, TextInput, Alert, Image, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ageMonthsFrom, dailyGoal, dailyStats, streakDays, fmtDistance, fmtDuration, sizeClass, type WalkInput, type WalkSummary } from "@stanandwill/core";
import { useStore } from "../../lib/store";
import { WalkTracker, manualWalk, type LiveWalk } from "../../lib/walks";
import { Button, Card, H1, H2, P, Pill, Small } from "../../components/ui";
import { DogSwitcher } from "../../components/DogSwitcher";
import { colors, fonts, radius } from "../../lib/theme";
import { ILLUSTRATIONS } from "../../lib/album";
import { WalkShareCard, CARD_W } from "../../components/WalkShareCard";
import { shareViewAsImage } from "../../lib/share";

const DAY_LETTERS = ["D", "L", "M", "M", "J", "V", "S"];

/**
 * Onglet Balades : démarrer/arrêter une balade (GPS ou minuteur), pas estimés selon la taille du chien,
 * objectif du jour, 7 derniers jours, série, historique. Entrée vers « Copains de balade ».
 * Confidentialité : la trace GPS n'est jamais conservée ni envoyée ; seul le résumé est enregistré.
 */
export default function Balades() {
  const router = useRouter();
  const { dog, walks, addWalk, removeWalk, session } = useStore();
  const [live, setLive] = useState<LiveWalk | null>(null);
  const [useGps, setUseGps] = useState(true);
  const [manualMin, setManualMin] = useState("");
  const [showManual, setShowManual] = useState(false);
  const tracker = useRef<WalkTracker | null>(null);
  const cardRef = useRef<View>(null);
  const [shareWalk, setShareWalk] = useState<WalkSummary | null>(null);
  const [sharing, setSharing] = useState(false);

  const input: WalkInput = useMemo(() => dog ? { breedId: dog.breed_id, size: dog.size, weightKg: dog.weightKg, ageMonths: ageMonthsFrom(dog.birth_month ?? undefined) } : {}, [dog]);
  const goal = useMemo(() => dailyGoal(input), [input]);
  const week = useMemo(() => dailyStats(walks, 7), [walks]);
  const today = week[6];
  const streak = useMemo(() => streakDays(walks), [walks]);

  useEffect(() => () => { tracker.current?.stop("x"); }, []);
  if (!dog) return null;

  const start = async () => {
    const t = new WalkTracker(input, useGps);
    tracker.current = t;
    t.on(setLive);
    await t.start();
  };

  const stop = () => {
    const t = tracker.current; if (!t) return;
    const w = t.stop(dog.id);
    tracker.current = null; setLive(null);
    if (!w) { Alert.alert("Balade trop courte", "Moins d'une minute : rien n'a été enregistré."); return; }
    addWalk(w);
    setShareWalk(w);
  };

  const doShare = async () => {
    if (!shareWalk) return;
    setSharing(true);
    const ok = await shareViewAsImage(cardRef, `stanandwill-balade-${shareWalk.id}`, `${dog?.name} a fait ${shareWalk.stepsEst.toLocaleString("fr-FR")} pas avec Stan & Will`);
    setSharing(false);
    if (!ok) Alert.alert("Partage indisponible", "Relancez l'app : la brique de capture n'a pas pu se charger.");
  };

  const saveManual = () => {
    const m = parseInt(manualMin, 10);
    if (!m || m < 1 || m > 600) { Alert.alert("Durée invalide", "Entrez une durée en minutes, ex. 25"); return; }
    addWalk(manualWalk(dog.id, m, input)); setManualMin(""); setShowManual(false);
  };

  const liveMin = live ? live.durationS : 0;
  const doneMin = Math.round((today.durationS + liveMin) / 60);
  const doneSteps = today.stepsEst + (live?.stepsEst ?? 0);
  const pct = Math.min(1, doneMin / goal.minutes);
  const maxDay = Math.max(goal.minutes * 60, ...week.map((d) => d.durationS));
  const classLabel = { toy: "très petit", small: "petit", medium: "moyen", large: "grand" }[sizeClass(input)];

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <DogSwitcher />
        <H1>Balades</H1>
        <Small style={{ marginTop: 4 }}>Les pas de {dog.name} sont estimés d'après sa taille ({classLabel} gabarit) et la distance parcourue.</Small>

        {/* Objectif du jour */}
        <Card style={{ marginTop: 16 }}>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Small>Aujourd'hui</Small>
              <Text style={s.big}>{doneMin} <Text style={s.bigUnit}>/ {goal.minutes} min</Text></Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Small>Pas estimés</Small>
              <Text style={s.mid}>{doneSteps.toLocaleString("fr-FR")}</Text>
              <Small>objectif {goal.stepsEst.toLocaleString("fr-FR")}</Small>
            </View>
          </View>
          <View style={s.track}><View style={[s.fill, { width: `${Math.round(pct * 100)}%` }, pct >= 1 && { backgroundColor: colors.bon }]} /></View>
          <Small style={{ marginTop: 10 }}>{goal.note}</Small>
          {streak > 1 && <View style={{ marginTop: 10 }}><Pill label={`🔥 ${streak} jours d'affilée`} tone="miel" /></View>}
        </Card>

        {/* Balade en cours / démarrer */}
        {live ? (
          <Card style={[{ marginTop: 14, backgroundColor: colors.foret, borderColor: colors.foret }]}>
            <Text style={s.liveLabel}>Balade en cours · {live.gps === "on" ? `GPS actif (${live.points} points)` : live.gps === "denied" ? "GPS refusé → estimation par la durée" : live.gps === "off" ? "mode minuteur" : "GPS indisponible → estimation"}</Text>
            <Text style={s.liveTime}>{fmtDuration(live.durationS)}{live.durationS < 60 ? ` ${String(live.durationS % 60).padStart(2, "0")} s` : ""}</Text>
            <View style={s.row}>
              <View style={{ flex: 1 }}><Text style={s.liveSmall}>Distance</Text><Text style={s.liveVal}>{fmtDistance(live.distanceM)}</Text></View>
              <View style={{ flex: 1 }}><Text style={s.liveSmall}>Pas de {dog.name}</Text><Text style={s.liveVal}>≈ {live.stepsEst.toLocaleString("fr-FR")}</Text></View>
            </View>
            <View style={{ marginTop: 14 }}><Button title="Terminer la balade" onPress={stop} /></View>
          </Card>
        ) : (
          <Card style={{ marginTop: 14 }}>
            <Button title={`🐾  Démarrer une balade avec ${dog.name}`} onPress={start} />
            <Pressable onPress={() => setUseGps((v) => !v)} style={s.toggle} accessibilityRole="switch" accessibilityState={{ checked: useGps }}>
              <View style={[s.box, useGps && s.boxOn]}>{useGps && <Text style={{ color: colors.blanc, fontSize: 12, fontFamily: fonts.black }}>✓</Text>}</View>
              <Small style={{ flex: 1 }}>Mesurer la distance avec le GPS (le trajet n'est jamais enregistré ni partagé)</Small>
            </Pressable>
            <Pressable onPress={() => setShowManual((v) => !v)}><Small style={{ color: colors.foret, fontFamily: fonts.bold, marginTop: 8 }}>J'ai oublié de lancer le suivi → ajouter une balade</Small></Pressable>
            {showManual && (
              <View style={[s.row, { marginTop: 10, gap: 8 }]}>
                <TextInput value={manualMin} onChangeText={setManualMin} keyboardType="number-pad" placeholder="Durée en min" placeholderTextColor={colors.texteDoux} style={s.input} />
                <Button title="Ajouter" variant="secondary" onPress={saveManual} />
              </View>
            )}
          </Card>
        )}

        {/* 7 derniers jours */}
        <H2 style={{ marginTop: 22 }}>Cette semaine</H2>
        <Card style={{ marginTop: 10 }}>
          <View style={[s.row, { alignItems: "flex-end", height: 96 }]}>
            {week.map((d) => {
              const h = Math.max(4, Math.round((d.durationS / maxDay) * 80));
              const hit = d.durationS >= goal.minutes * 60;
              const letter = DAY_LETTERS[new Date(d.day + "T12:00:00").getDay()];
              return (
                <View key={d.day} style={{ flex: 1, alignItems: "center" }}>
                  <View style={[s.bar, { height: h, backgroundColor: hit ? colors.bon : d.durationS ? colors.miel : colors.ligne }]} />
                  <Small style={{ marginTop: 4 }}>{letter}</Small>
                </View>
              );
            })}
          </View>
          <View style={[s.row, { marginTop: 10 }]}>
            <Small style={{ flex: 1 }}>{week.reduce((a, d) => a + d.walks, 0)} balades · {fmtDuration(week.reduce((a, d) => a + d.durationS, 0))}</Small>
            <Small>{fmtDistance(week.reduce((a, d) => a + d.distanceM, 0))} · ≈ {week.reduce((a, d) => a + d.stepsEst, 0).toLocaleString("fr-FR")} pas</Small>
          </View>
        </Card>

        {/* Copains */}
        <Pressable onPress={() => router.push("/copains")} style={{ marginTop: 22 }}>
          <Card style={{ backgroundColor: colors.saugeClair, borderColor: colors.sauge }}>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <H2>Copains de balade</H2>
                <P style={{ marginTop: 4 }}>Trouvez d'autres maîtres près de chez vous et proposez une balade à deux (ou dix) chiens.</P>
                {!session && <Small style={{ marginTop: 6 }}>Nécessite un compte gratuit.</Small>}
              </View>
              <Text style={{ fontSize: 28 }}>🐕‍🦺</Text>
            </View>
          </Card>
        </Pressable>

        {walks.length === 0 && !live && (
          <View style={s.illu}>
            <Image source={ILLUSTRATIONS.baladesEmpty} style={s.illuImg} resizeMode="cover" accessibilityLabel="Stan et Will en balade dans les dunes" />
            <View style={s.illuShade} />
            <Text style={s.illuText}>Première balade ? Stan et Will montrent l'exemple : on sort, on renifle, on compte les pas.</Text>
          </View>
        )}

        {/* Historique */}
        {walks.length > 0 && (
          <>
            <H2 style={{ marginTop: 22 }}>Dernières balades</H2>
            {[...walks].reverse().slice(0, 12).map((w) => (
              <Pressable key={w.id} onLongPress={() => Alert.alert("Supprimer cette balade ?", "", [{ text: "Annuler", style: "cancel" }, { text: "Supprimer", style: "destructive", onPress: () => removeWalk(w.id) }])}>
                <Card style={{ marginTop: 8, paddingVertical: 12 }}>
                  <View style={s.row}>
                    <View style={{ flex: 1 }}>
                      <P style={{ fontFamily: fonts.bold }}>{new Date(w.startedAt).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })} · {new Date(w.startedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</P>
                      <Small>{fmtDuration(w.durationS)} · {fmtDistance(w.distanceM)} · ≈ {w.stepsEst.toLocaleString("fr-FR")} pas</Small>
                    </View>
                    <Pressable onPress={() => setShareWalk(w)} accessibilityRole="button" accessibilityLabel="Partager cette balade" style={{ minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 20 }}>↗️</Text>
                    </Pressable>
                  </View>
                </Card>
              </Pressable>
            ))}
            <Small style={{ marginTop: 8 }}>Appui long sur une balade pour la supprimer.</Small>
          </>
        )}
        <Small style={{ marginTop: 22, textAlign: "center" }}>Les pas sont une estimation indicative (foulée moyenne de la race), pas une mesure médicale.</Small>
      </ScrollView>

      <Modal visible={!!shareWalk} animationType="slide" transparent onRequestClose={() => setShareWalk(null)}>
        <View style={s.sheetBack}>
          <View style={s.sheet}>
            <H2 style={{ textAlign: "center" }}>Belle balade ! 🐾</H2>
            <Small style={{ textAlign: "center", marginTop: 4 }}>Partagez la carte de {dog.name} : c'est aussi comme ça qu'on trouve des copains.</Small>
            {shareWalk && (
              <View style={{ alignItems: "center", marginTop: 14 }}>
                <View style={{ transform: [{ scale: Math.min(1, (320) / CARD_W) }], marginVertical: -20 }}>
                  <WalkShareCard ref={cardRef} walk={shareWalk} dogName={dog.name} photo={dog.photo_path ? { uri: dog.photo_path } : ILLUSTRATIONS.baladesEmpty}
                    goalMinutes={goal.minutes} goalHit={today.durationS >= goal.minutes * 60} streak={streak} />
                </View>
              </View>
            )}
            <View style={{ marginTop: 18, gap: 8 }}>
              <Button title="Partager la carte" onPress={doShare} loading={sharing} />
              <Button title="Fermer" variant="ghost" onPress={() => setShareWalk(null)} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.creme },
  body: { padding: 20, paddingBottom: 40 },
  row: { flexDirection: "row", alignItems: "center" },
  big: { fontFamily: fonts.black, fontSize: 34, color: colors.foretFonce, marginTop: 2 },
  bigUnit: { fontFamily: fonts.bold, fontSize: 16, color: colors.texteDoux },
  mid: { fontFamily: fonts.black, fontSize: 22, color: colors.foretFonce },
  track: { height: 10, backgroundColor: colors.ligne, borderRadius: 999, marginTop: 12, overflow: "hidden" },
  fill: { height: 10, backgroundColor: colors.miel, borderRadius: 999 },
  liveLabel: { fontFamily: fonts.bold, fontSize: 13, color: colors.saugeClair },
  liveTime: { fontFamily: fonts.black, fontSize: 44, color: colors.blanc, marginVertical: 6 },
  liveSmall: { fontFamily: fonts.regular, fontSize: 13, color: colors.saugeClair },
  liveVal: { fontFamily: fonts.black, fontSize: 22, color: colors.blanc },
  toggle: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.sauge, alignItems: "center", justifyContent: "center" },
  boxOn: { backgroundColor: colors.foret, borderColor: colors.foret },
  input: { flex: 1, borderWidth: 1.5, borderColor: colors.ligne, borderRadius: radius.md, paddingHorizontal: 14, minHeight: 50, fontFamily: fonts.regular, fontSize: 16, color: colors.texte, backgroundColor: colors.blanc },
  bar: { width: 22, borderRadius: 6 },
  sheetBack: { flex: 1, backgroundColor: "rgba(20,41,31,0.55)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.creme, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 34 },
  illu: { marginTop: 22, borderRadius: radius.xl, overflow: "hidden", height: 200 },
  illuImg: { width: "100%", height: 200 },
  illuShade: { position: "absolute", left: 0, right: 0, bottom: 0, height: 110, backgroundColor: "rgba(20,41,31,0.6)" },
  illuText: { position: "absolute", left: 16, right: 16, bottom: 14, fontFamily: fonts.bold, fontSize: 14, lineHeight: 19, color: colors.creme },
});
