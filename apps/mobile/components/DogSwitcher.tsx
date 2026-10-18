import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Image } from "react-native";
import { useRouter } from "expo-router";
import { useStore, DOGS_INCLUDED } from "../lib/store";
import { colors, fonts, radius } from "../lib/theme";

/**
 * Sélecteur de chien : un chip par chien du foyer + « Ajouter ».
 * Invisible quand il n'y a qu'un chien et que `always` est faux (on garde juste le bouton d'ajout discret).
 */
export function DogSwitcher({ always = false }: { always?: boolean }) {
  const router = useRouter();
  const { dogs, activeDogId, setActiveDog, resetAnswers, premium } = useStore();
  if (dogs.length <= 1 && !always) return null;
  const canAdd = premium || dogs.length < DOGS_INCLUDED;

  const add = () => {
    resetAnswers();
    router.push("/(onboarding)/quiz/0");
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row} style={{ flexGrow: 0 }}>
      {dogs.map(({ dog }) => {
        const sel = dog.id === activeDogId;
        return (
          <Pressable key={dog.id} onPress={() => setActiveDog(dog.id)} style={[s.chip, sel && s.chipSel]} accessibilityRole="tab" accessibilityState={{ selected: sel }}>
            {dog.photo_path ? <Image source={{ uri: dog.photo_path }} style={s.avatar} /> : <View style={[s.avatar, s.avatarEmpty]}><Text style={s.initial}>{dog.name.slice(0, 1).toUpperCase()}</Text></View>}
            <Text style={[s.name, sel && { color: colors.blanc }]}>{dog.name}</Text>
          </Pressable>
        );
      })}
      <Pressable onPress={add} style={s.add} accessibilityRole="button" accessibilityLabel="Ajouter un chien">
        <Text style={s.addText}>+ {canAdd ? "Ajouter un chien" : "Ajouter (plan)"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  row: { gap: 8, paddingVertical: 4 },
  chip: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.blanc, borderWidth: 1, borderColor: colors.ligne, borderRadius: 999, paddingVertical: 5, paddingLeft: 5, paddingRight: 12 },
  chipSel: { backgroundColor: colors.foret, borderColor: colors.foret },
  avatar: { width: 26, height: 26, borderRadius: 13 },
  avatarEmpty: { backgroundColor: colors.saugeClair, alignItems: "center", justifyContent: "center" },
  initial: { fontFamily: fonts.black, fontSize: 13, color: colors.foret },
  name: { fontFamily: fonts.bold, fontSize: 14, color: colors.foretFonce },
  add: { justifyContent: "center", borderRadius: 999, borderWidth: 1, borderStyle: "dashed", borderColor: colors.sauge, paddingVertical: 8, paddingHorizontal: 12 },
  addText: { fontFamily: fonts.bold, fontSize: 13, color: colors.foret },
});
