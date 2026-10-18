import React from "react";
import { Tabs } from "expo-router";
import { Text } from "react-native";
import { colors, fonts } from "../../lib/theme";

const ICONS: Record<string, string> = { aujourdhui: "☀️", balades: "🐾", scanner: "📷", demander: "💬", carnet: "📒" };

function Icon({ name, focused }: { name: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.55 }}>{ICONS[name]}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.foret,
        tabBarInactiveTintColor: colors.texteDoux,
        tabBarStyle: { backgroundColor: colors.blanc, borderTopColor: colors.ligne, height: 64, paddingTop: 6, paddingBottom: 8 },
        tabBarLabelStyle: { fontFamily: fonts.bold, fontSize: 11 },
        tabBarIcon: ({ focused }) => <Icon name={route.name} focused={focused} />,
        sceneStyle: { backgroundColor: colors.creme },
      })}
    >
      <Tabs.Screen name="aujourdhui" options={{ title: "Aujourd'hui" }} />
      <Tabs.Screen name="balades" options={{ title: "Balades" }} />
      <Tabs.Screen name="scanner" options={{ title: "Scanner" }} />
      <Tabs.Screen name="demander" options={{ title: "Demander" }} />
      <Tabs.Screen name="carnet" options={{ title: "Carnet" }} />
    </Tabs>
  );
}
