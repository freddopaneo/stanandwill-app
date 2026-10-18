import React, { useMemo, useState } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable, Image } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { quizSteps, questionTitle, FRAGILE_BREEDS, OTHER_BREEDS, breedInfo, type QuizStep } from "@stanandwill/core";
import { useStore } from "../../../lib/store";
import { Button, Choice, H1, P, Small } from "../../../components/ui";
import { colors, fonts, radius } from "../../../lib/theme";

const VARIETIES = [{ id: "smooth", label: "Poil ras" }, { id: "long", label: "Poil long" }, { id: "wire", label: "Poil dur" }];
const SIZES = [{ id: "mini", label: "Nain (jusqu'à 5 kg environ)" }, { id: "standard", label: "Standard (7 à 12 kg)" }];
const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export default function QuizStepScreen() {
  const { step } = useLocalSearchParams<{ step: string }>();
  const i = Math.max(0, Math.min(quizSteps.length - 1, Number(step) || 0));
  const def = quizSteps[i];
  const router = useRouter();
  const { answers, setAnswers, dogs } = useStore();
  const [local, setLocal] = useState<any>(null);

  const canContinue = useMemo(() => {
    switch (def.id) {
      case "breed": return Boolean(answers.breed_id) && (answers.breed_id !== "dachshund" || (answers.variety && answers.size));
      case "name": return (answers.name ?? "").trim().length >= 2;
      case "photo": return true;
      case "sex": return Boolean(answers.sex);
      case "neutered": return Boolean(answers.neutered) && (answers.neutered !== "yes" || Boolean(answers.neuterAge));
      case "birth": return Boolean(answers.birthMonth);
      case "weight": return answers.weightKg !== undefined;
      case "silhouette": return Boolean(answers.silhouette);
      case "activity": return Boolean(answers.activity);
      case "food": return true;
      case "conditions": return Array.isArray(answers.conditions);
      case "insurance": return Boolean(answers.insurance);
      case "worry": return Boolean(answers.worry);
    }
  }, [def.id, answers]);

  const next = () => {
    if (i + 1 < quizSteps.length) router.push(`/(onboarding)/quiz/${i + 1}`);
    else router.replace("/(onboarding)/computing");
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.progress}><View style={[s.progressFill, { width: `${((i + 1) / quizSteps.length) * 100}%` }]} /></View>
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <Small>{i + 1} / {quizSteps.length}</Small>
        <H1 style={{ marginTop: 6 }}>{questionTitle(def, answers.name)}</H1>
        <View style={{ marginTop: 20, gap: 10 }}>{renderStep(def)}</View>
      </ScrollView>
      <View style={s.footer}>
        <Button title={i + 1 < quizSteps.length ? "Continuer" : "Voir le bilan"} onPress={next} disabled={!canContinue} />
        {i > 0 && <Button title="Retour" variant="ghost" onPress={() => router.back()} />}
        {i === 0 && dogs.length > 0 && <Button title="Annuler" variant="ghost" onPress={() => router.replace("/(tabs)/aujourdhui")} />}
      </View>
    </SafeAreaView>
  );

  function renderStep(d: QuizStep) {
    switch (d.type) {
      case "breed":
        return (
          <>
            <Small style={{ marginBottom: 2 }}>Les races fragiles, avec un plan de prévention dédié</Small>
            {FRAGILE_BREEDS.map((b) => (
              <BreedChoice key={b.id} label={b.label} badge="Plan dédié" full selected={answers.breed_id === b.id} onPress={() => setAnswers({ breed_id: b.id, variety: undefined, size: undefined })} />
            ))}
            {answers.breed_id === "dachshund" && (
              <>
                <P style={{ marginTop: 10, fontFamily: fonts.bold }}>Quel poil ?</P>
                <View style={s.row}>{VARIETIES.map((v) => <View key={v.id} style={{ flex: 1 }}><Choice label={v.label} selected={answers.variety === v.id} onPress={() => setAnswers({ variety: v.id })} /></View>)}</View>
                <P style={{ marginTop: 10, fontFamily: fonts.bold }}>Quelle taille ?</P>
                {SIZES.map((v) => <Choice key={v.id} label={v.label} selected={answers.size === v.id} onPress={() => setAnswers({ size: v.id })} />)}
              </>
            )}
            <Small style={{ marginTop: 12, marginBottom: 2 }}>Autres races</Small>
            {OTHER_BREEDS.map((b) => <Choice key={b.id} label={b.label} selected={answers.breed_id === b.id} onPress={() => setAnswers({ breed_id: b.id, variety: undefined, size: undefined })} />)}
          </>
        );
      case "text":
        return <TextInput style={s.input} placeholder={d.placeholder} placeholderTextColor="#9AA59E" maxLength={d.max} value={answers.name ?? ""} onChangeText={(t) => setAnswers({ name: t })} autoFocus autoCapitalize="words" />;
      case "photo":
        return (
          <View style={{ alignItems: "center", gap: 14 }}>
            <Pressable onPress={pickPhoto} style={s.photoFrame} accessibilityRole="button" accessibilityLabel="Choisir une photo">
              {answers.photoUri ? <Image source={{ uri: answers.photoUri }} style={s.photo} /> : <Text style={{ fontFamily: fonts.bold, color: colors.foret }}>Choisir une photo</Text>}
            </Pressable>
            <Small>Facultatif. Cette photo n'est jamais analysée : elle sert d'avatar.</Small>
          </View>
        );
      case "choice":
        return (
          <>
            {d.options.map((o) => <Choice key={o.value} label={o.label} selected={(answers as any)[keyFor(d.id)] === o.value} onPress={() => setAnswers({ [keyFor(d.id)]: o.value } as any)} />)}
            {"followUp" in d && (answers as any)[keyFor(d.id)] === d.followUp.when && (
              <>
                <P style={{ marginTop: 10, fontFamily: fonts.bold }}>À quel âge ?</P>
                {d.followUp.options.map((o) => <Choice key={o.value} label={o.label} selected={answers.neuterAge === o.value} onPress={() => setAnswers({ neuterAge: o.value as any })} />)}
                <Small>La stérilisation avant 12 mois est le seul facteur de risque du dos prouvé par une grande étude. Ce n'est plus modifiable : on le note, sans jugement.</Small>
              </>
            )}
          </>
        );
      case "month": {
        const now = new Date();
        const years = Array.from({ length: 20 }, (_, k) => now.getFullYear() - k);
        const [y, m] = (answers.birthMonth ?? "").split("-").map(Number);
        return (
          <>
            <P style={{ fontFamily: fonts.bold }}>Année</P>
            <View style={s.wrap}>{years.map((yy) => <Pressable key={yy} onPress={() => setAnswers({ birthMonth: `${yy}-${String(m || 1).padStart(2, "0")}-01` })} style={[s.chip, y === yy && s.chipSel]}><Text style={[s.chipText, y === yy && s.chipTextSel]}>{yy}</Text></Pressable>)}</View>
            <P style={{ fontFamily: fonts.bold, marginTop: 8 }}>Mois (approximatif si besoin)</P>
            <View style={s.wrap}>{MONTHS.map((mm, idx) => <Pressable key={mm} onPress={() => setAnswers({ birthMonth: `${y || now.getFullYear() - 3}-${String(idx + 1).padStart(2, "0")}-01` })} style={[s.chip, m === idx + 1 && s.chipSel]}><Text style={[s.chipText, m === idx + 1 && s.chipTextSel]}>{mm}</Text></Pressable>)}</View>
          </>
        );
      }
      case "weight": {
        const v = answers.weightKg;
        return (
          <>
            <View style={s.weightRow}>
              <Pressable onPress={() => setAnswers({ weightKg: Math.max(d.min, Number(((v ?? 5) - 0.1).toFixed(1))) })} style={s.stepBtn}><Text style={s.stepTxt}>−</Text></Pressable>
              <Text style={s.weightNum}>{v == null ? "—" : `${v.toFixed(1)} kg`}</Text>
              <Pressable onPress={() => setAnswers({ weightKg: Math.min(d.max, Number(((v ?? 5) + 0.1).toFixed(1))) })} style={s.stepBtn}><Text style={s.stepTxt}>+</Text></Pressable>
            </View>
            <View style={s.wrap}>{[3, 4, 5, 6, 8, 10, 12].map((w) => <Pressable key={w} onPress={() => setAnswers({ weightKg: w })} style={[s.chip, v === w && s.chipSel]}><Text style={[s.chipText, v === w && s.chipTextSel]}>{w} kg</Text></Pressable>)}</View>
            <Choice label={d.unknownLabel} selected={v === null} onPress={() => setAnswers({ weightKg: null })} />
            <Small>Astuce : montez sur la balance avec lui, puis sans lui.</Small>
          </>
        );
      }
      case "silhouette":
        return <>{d.options.map((o) => <Choice key={o.value} label={o.label} selected={answers.silhouette === o.value} onPress={() => setAnswers({ silhouette: o.value as any })} />)}<Small>Vue de dessus : la taille doit être marquée ; de profil, le ventre remonte derrière les côtes.</Small></>;
      case "food":
        return (
          <>
            <TextInput style={s.input} placeholder="Marque et gamme (ex. Royal Canin Dachshund Adult)" placeholderTextColor="#9AA59E" value={answers.foodLabel ?? ""} onChangeText={(t) => setAnswers({ foodLabel: t })} />
            <Small>Vous pourrez scanner le code-barres après le bilan : la fiche et la ration en grammes seront calculées pour lui.</Small>
          </>
        );
      case "multi": {
        const sel = answers.conditions ?? [];
        return (
          <>
            {d.options.map((o) => <Choice key={o.value} label={o.label} selected={sel.includes(o.value)} onPress={() => setAnswers({ conditions: sel.includes(o.value) ? sel.filter((x) => x !== o.value) : [...sel, o.value] })} />)}
            <Choice label={d.none} selected={Array.isArray(answers.conditions) && sel.length === 0} onPress={() => setAnswers({ conditions: [] })} />
          </>
        );
      }
      case "worry": {
        const opts = breedInfo(answers.breed_id).worries;
        return <>{opts.map((o) => <Choice key={o.id} label={o.label} selected={answers.worry === o.id} onPress={() => setAnswers({ worry: o.id })} />)}</>;
      }
    }
  }

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.7, exif: false });
    if (!r.canceled && r.assets[0]) setAnswers({ photoUri: r.assets[0].uri });
  }
}

function BreedChoice({ label, badge, full, selected, onPress }: { label: string; badge: string; full: boolean; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress} style={[s.breed, selected && s.breedSel]}>
      <Text style={[s.breedLabel, selected && { color: colors.foret }]}>{label}</Text>
      <View style={[s.badge, full ? { backgroundColor: colors.miel } : { backgroundColor: colors.saugeClair }]}><Text style={s.badgeText}>{badge}</Text></View>
    </Pressable>
  );
}

function keyFor(id: string) {
  return id === "neutered" ? "neutered" : id;
}

const s = StyleSheet.create({
  breed: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, borderWidth: 1.5, borderColor: colors.ligne, backgroundColor: colors.blanc, borderRadius: radius.md, paddingVertical: 13, paddingHorizontal: 16, minHeight: 50 },
  breedSel: { borderColor: colors.foret, backgroundColor: colors.saugeClair },
  breedLabel: { fontFamily: fonts.bold, fontSize: 16, color: colors.texte },
  badge: { borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9 },
  badgeText: { fontFamily: fonts.bold, fontSize: 11, color: colors.foretFonce },
  safe: { flex: 1, backgroundColor: colors.creme },
  progress: { height: 4, backgroundColor: colors.ligne, marginHorizontal: 20, borderRadius: 999, marginTop: 6 },
  progressFill: { height: 4, backgroundColor: colors.foret, borderRadius: 999 },
  body: { padding: 20, paddingBottom: 140 },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 20, paddingBottom: 28, gap: 6, backgroundColor: colors.creme },
  input: { fontFamily: fonts.regular, fontSize: 18, padding: 14, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.ligne, backgroundColor: colors.blanc, color: colors.texte },
  row: { flexDirection: "row", gap: 8 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5, borderColor: colors.ligne, backgroundColor: colors.blanc },
  chipSel: { borderColor: colors.foret, backgroundColor: colors.saugeClair },
  chipText: { fontFamily: fonts.regular, fontSize: 15, color: colors.texte },
  chipTextSel: { fontFamily: fonts.bold, color: colors.foret },
  photoFrame: { width: 160, height: 160, borderRadius: 80, backgroundColor: colors.saugeClair, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  photo: { width: 160, height: 160 },
  weightRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 18 },
  stepBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.saugeClair, alignItems: "center", justifyContent: "center" },
  stepTxt: { fontFamily: fonts.black, fontSize: 26, color: colors.foret },
  weightNum: { fontFamily: fonts.black, fontSize: 36, color: colors.foretFonce, minWidth: 130, textAlign: "center" },
});
