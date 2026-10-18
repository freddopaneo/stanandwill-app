import React from "react";
import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useStore } from "../lib/store";
import { colors } from "../lib/theme";

/** Aiguillage : un chien enregistré → onglets ; sinon → parcours d'entrée. */
export default function Index() {
  const { ready, dog } = useStore();
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.creme, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.foret} /></View>;
  return <Redirect href={dog ? "/(tabs)/aujourdhui" : "/(onboarding)/welcome"} />;
}
