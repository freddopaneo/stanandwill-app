import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import { useFonts, Nunito_400Regular, Nunito_700Bold, Nunito_800ExtraBold } from "@expo-google-fonts/nunito";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StoreProvider } from "../lib/store";
import { configureBilling } from "../lib/billing";
import { colors } from "../lib/theme";

export default function RootLayout() {
  const [loaded] = useFonts({ Nunito_400Regular, Nunito_700Bold, Nunito_800ExtraBold });
  React.useEffect(() => { configureBilling().catch(() => {}); }, []);
  if (!loaded) {
    return <View style={{ flex: 1, backgroundColor: colors.creme, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.foret} /></View>;
  }
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.creme } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
