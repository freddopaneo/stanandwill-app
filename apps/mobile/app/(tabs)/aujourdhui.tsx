import React, { useEffect, useMemo, useState } from "react";
import { View, ScrollView, StyleSheet, Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { buildPlan, planDayIndex, todaysItem, breedInfo, type PlanItem } from "@stanandwill/core";
import { useStore } from "../../lib/store";
import { bilanPoints } from "../../lib/content";
import { scheduleDaily } from "../../lib/notifications";
import { Button, Card, H1, H2, P, Pill, Small } from "../../components/ui";
import { ScoreGauge } from "../../components/ScoreGauge";
import { DogSwitcher } from "../../components/DogSwitcher";
import { WeatherCard } from "../../components/WeatherCard";
import { colors, fonts, radius } from "../../lib/theme";

const TYPE_LABEL: Record<PlanItem["type"], string> = { lesson: "À lire · 2 min", gesture: "Geste de la semaine", check: "Vérification", weigh: "Pesée" };

/**
 * Onglet 1 : Aujourd'hui. L'item du jour du plan de prévention (4 semaines), la progression, le score.
 * Gratuit : semaine 1 complète. Plan : semaines 2 à 4 et au-delà.
 */
export default function Aujourdhui() {
  const router = useRouter();
  const { dog, score, premium, planStartedOn, done, completeItem, notifHour, notifMinute } = useStore();
  const [answered, setAnswered] = useState<number | null>(null);

  const plan = useMemo(() => (dog ? buildPlan(dog.breed_id) : []), [dog?.breed_id]);
  const dayIndex = planStartedOn ? planDayIndex(planStartedOn) : 0;
  const doneIds = useMemo(() => new Set(Object.keys(done)), [done]);
  const item = todaysItem(plan, dayIndex, doneIds);
  const points = useMemo(() => (dog && score ? bilanPoints(dog, score) : []), [dog, score]);

  useEffect(() => { setAnswered(null); }, [item?.id]);
  useEffect(() => { if (dog) scheduleDaily(notifHour, dog.name, item?.title, notifMinute).catch(() => {}); }, [notifHour, notifMinute, dog?.name, item?.id]);

  if (!dog || !score || !item) return null;

  const locked = !premium && item.week > 1;
  const isDone = doneIds.has(item.id);
  const week = Math.min(4, Math.floor(dayIndex / 7) + 1);
  const weekItems = plan.filter((p) => p.week === week);
  const weekDone = weekItems.filter((p) => doneIds.has(p.id)).length;
  const hello = new Date().getHours() < 18 ? "Bonjour" : "Bonsoir";
  const info = breedInfo(dog.breed_id);

  const markDone = (correct?: boolean) => {
    completeItem(item.id, { correct, gestureKey: item.gestureKey ?? null });
    if (item.type === "weigh") router.push("/(tabs)/carnet");
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={s.body}>
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Small>{hello}</Small>
            <H1>{dog.name}</H1>
          </View>
          <Pressable onPress={() => router.push("/(tabs)/carnet")} style={s.scoreChip} accessibilityLabel="Voir le score">
            <Text style={s.scoreNum}>{score.score}</Text>
            <Small style={{ color: colors.blanc }}>vigilance</Small>
          </Pressable>
        </View>

        <View style={{ marginTop: 10 }}><DogSwitcher /></View>
        <WeatherCard dog={dog} />

        <View style={s.progress}>
          <Small style={{ fontFamily: fonts.bold, color: colors.foret }}>Plan {info.label} · semaine {week} sur 4</Small>
          <View style={s.dots}>{weekItems.map((p) => <View key={p.id} style={[s.dot, doneIds.has(p.id) && s.dotOn, p.id === item.id && s.dotNow]} />)}</View>
          <Small>{weekDone}/{weekItems.length} cette semaine</Small>
        </View>

        <Card style={{ marginTop: 14, backgroundColor: colors.foret, borderColor: colors.foret }}>
          <Pill label={TYPE_LABEL[item.type]} tone="miel" />
          <H2 style={{ color: colors.blanc, marginTop: 10 }}>{item.title}</H2>
          {locked ? (
            <>
              <P style={{ color: colors.saugeClair, marginTop: 6 }} numberOfLines={2}>{item.body}</P>
              <View style={s.lockBox}><P style={{ color: colors.blanc, fontFamily: fonts.bold }}>🔒 Semaine {item.week} : dans le plan de prévention</P><Small style={{ color: colors.saugeClair }}>La semaine 1 est offerte. Les semaines suivantes, le scanner et les questions illimitées font partie du plan.</Small></View>
              <View style={{ marginTop: 12 }}><Button title={`Débloquer le plan de ${dog.name}`} onPress={() => router.push("/(onboarding)/paywall")} /></View>
            </>
          ) : (
            <>
              <P style={{ color: "#EAF2EA", marginTop: 8 }}>{item.body}</P>
              {item.source ? <Small style={{ color: colors.sauge, marginTop: 8 }}>Source : {item.source}</Small> : null}
              {item.check && !isDone ? (
                <View style={{ marginTop: 14, gap: 8 }}>
                  <P style={{ color: colors.blanc, fontFamily: fonts.bold }}>{item.check.question}</P>
                  {item.check.answers.map((a, i) => {
                    const state = answered == null ? "idle" : a.correct ? "ok" : i === answered ? "ko" : "idle";
                    return (
                      <Pressable key={i} disabled={answered != null} onPress={() => setAnswered(i)} style={[s.answer, state === "ok" && s.answerOk, state === "ko" && s.answerKo]}>
                        <Text style={[s.answerText, state === "idle" && { color: colors.blanc }]}>{a.label}</Text>
                      </Pressable>
                    );
                  })}
                  {answered != null ? (
                    <View style={{ marginTop: 6 }}>
                      <Small style={{ color: colors.blanc }}>{item.check.answers[answered].correct ? "Exactement. Vous savez quoi faire." : "Pas tout à fait : la bonne réponse est en vert. L'important est de la retenir."}</Small>
                      <View style={{ marginTop: 10 }}><Button title="Terminer la leçon ✓" onPress={() => markDone(item.check!.answers[answered].correct)} /></View>
                    </View>
                  ) : null}
                </View>
              ) : (
                <View style={{ marginTop: 14 }}>
                  {isDone
                    ? <View style={s.doneBox}><Text style={{ fontFamily: fonts.black, color: colors.foretFonce }}>✓ Fait · à demain</Text></View>
                    : <Button title={item.type === "weigh" ? "Peser et noter" : "C'est fait ✓"} onPress={() => markDone()} />}
                </View>
              )}
            </>
          )}
        </Card>

        <H2 style={{ marginTop: 24 }}>Les points de vigilance de {dog.name}</H2>
        {points.map((p, i) => (
          <Card key={p.key} style={{ marginTop: 10, opacity: premium || i === 0 ? 1 : 0.75 }}>
            <Pill label={p.badge} tone={p.tone} />
            <P style={{ fontFamily: fonts.bold, marginTop: 6 }}>{p.title}</P>
            <Small style={{ marginTop: 4 }} numberOfLines={premium || i === 0 ? undefined : 1}>{p.body}</Small>
            {!premium && i > 0 ? <Small style={{ marginTop: 6 }}>🔒 Dans le plan</Small> : null}
          </Card>
        ))}

        <H2 style={{ marginTop: 24 }}>Raccourcis</H2>
        <View style={s.grid}>
          <Shortcut emoji="⚖️" label="Peser" onPress={() => router.push("/(tabs)/carnet")} />
          <Shortcut emoji="🍖" label="Scanner un aliment" onPress={() => router.push("/(tabs)/scanner")} />
          <Shortcut emoji="💬" label="Une inquiétude ?" onPress={() => router.push("/(tabs)/demander")} />
          <Shortcut emoji="🆘" label="Fiche d'urgence" onPress={() => router.push("/(tabs)/carnet")} />
        </View>

        <Card style={{ marginTop: 24 }}>
          <Small>Score de vigilance</Small>
          <View style={{ marginTop: 8 }}><ScoreGauge score={score.score} /></View>
          <Small style={{ marginTop: 8 }}>Le score monte avec les gestes validés, le poids suivi et le carnet à jour. Il ne mesure pas la santé de {dog.name}, mais ce que vous mettez en place pour la protéger.</Small>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function Shortcut({ emoji, label, onPress }: { emoji: string; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={s.shortcut} accessibilityRole="button">
      <Text style={{ fontSize: 24 }}>{emoji}</Text>
      <Text style={s.shortcutLabel}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.creme },
  body: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  scoreChip: { backgroundColor: colors.foret, borderRadius: radius.lg, paddingVertical: 8, paddingHorizontal: 14, alignItems: "center" },
  scoreNum: { fontFamily: fonts.black, fontSize: 24, color: colors.miel },
  progress: { marginTop: 14, gap: 6 },
  dots: { flexDirection: "row", gap: 6 },
  dot: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.saugeClair },
  dotOn: { backgroundColor: colors.foret },
  dotNow: { backgroundColor: colors.miel },
  lockBox: { marginTop: 12, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 12, padding: 12, gap: 4 },
  answer: { backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "transparent" },
  answerOk: { backgroundColor: "#DFF0E0", borderColor: colors.bon },
  answerKo: { backgroundColor: "#F6D5D1", borderColor: colors.urgence },
  answerText: { fontFamily: fonts.bold, fontSize: 15, color: colors.foretFonce },
  doneBox: { backgroundColor: colors.miel, borderRadius: radius.md, padding: 14, alignItems: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  shortcut: { width: "47.5%", backgroundColor: colors.blanc, borderRadius: radius.md, borderWidth: 1, borderColor: colors.ligne, padding: 14, gap: 6 },
  shortcutLabel: { fontFamily: fonts.bold, fontSize: 14, color: colors.foretFonce },
});
