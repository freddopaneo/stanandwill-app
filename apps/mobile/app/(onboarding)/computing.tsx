import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { computeScore, toCreateDogPayload } from "@stanandwill/core";
import { useStore, dogToInput, type Dog } from "../../lib/store";
import { H2, Small } from "../../components/ui";
import { colors } from "../../lib/theme";

const LINES = [
  "Nous comparons votre chien aux données de sa race…",
  "2 000 teckels suivis (Dachshund IVDD UK)…",
  "Cohorte 2018 sur la stérilisation et le dos…",
  "11 082 shih tzus et 1 800 chihuahuas (VetCompass)…",
];

/** Écran 14 : calcul local du score (le serveur enrichira le bilan d'un texte IA en v1.1). */
export default function Computing() {
  const router = useRouter();
  const { answers, addDog, updateDog, dogs } = useStore();
  const [k, setK] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setK((x) => Math.min(LINES.length - 1, x + 1)), 900);
    const done = setTimeout(() => {
      const payload = toCreateDogPayload(answers);
      const editing = answers.editDogId && dogs.some((r) => r.dog.id === answers.editDogId) ? answers.editDogId : null;
      const dog: Dog = {
        id: editing ?? "local-" + Date.now(), name: answers.name ?? "Votre chien", breed_id: payload.breed_id, variety: payload.variety, size: payload.size,
        sex: payload.sex, neutered: payload.neutered as any, neuter_age: payload.neuter_age as any, birth_month: payload.birth_month,
        silhouette: payload.silhouette as any, activity: payload.activity as any, conditions: payload.conditions, insurance: payload.insurance as any,
        main_worry: payload.main_worry, weightKg: answers.weightKg ?? null, photo_path: answers.photoUri ?? null,
      };
      computeScore(dogToInput(dog)); // vérifie que le calcul passe avant d'enregistrer
      if (editing) updateDog(editing, dog); else addDog(dog);
      router.replace("/(onboarding)/bilan");
    }, 3800);
    return () => { clearInterval(t); clearTimeout(done); };
  }, []);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.center}>
        <View style={s.dot} />
        <H2 style={{ textAlign: "center", marginTop: 24 }}>{LINES[k]}</H2>
        <Small style={{ marginTop: 10 }}>Quelques secondes</Small>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.creme },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  dot: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.sauge },
});
