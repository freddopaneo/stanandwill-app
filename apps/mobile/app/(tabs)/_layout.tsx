import React, { useEffect, useMemo } from "react";
import { Tabs, useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { Text, AppState } from "react-native";
import { ageMonthsFrom, dailyGoal, walkReminderDates, walkReminderText } from "@stanandwill/core";
import { colors, fonts } from "../../lib/theme";
import { useStore } from "../../lib/store";
import { scheduleWalkReminders } from "../../lib/notifications";

const ICONS: Record<string, string> = { aujourdhui: "☀️", balades: "🐾", scanner: "📷", demander: "💬", carnet: "📒" };

function Icon({ name, focused }: { name: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.55 }}>{ICONS[name]}</Text>;
}

/** Replanifie le rappel « pas encore sorti » : à l'ouverture, au retour dans l'app et à chaque balade (tous chiens confondus). */
function useWalkReminder() {
  const { dog, dogs, walkHour, walkMinute } = useStore();
  const allWalks = useMemo(() => dogs.flatMap((r) => r.walks ?? []), [dogs]);
  const lastWalk = allWalks.reduce((a, w) => (w.startedAt > a ? w.startedAt : a), "");
  useEffect(() => {
    if (!dog) return;
    const goal = dailyGoal({ breedId: dog.breed_id, size: dog.size, weightKg: dog.weightKg, ageMonths: ageMonthsFrom(dog.birth_month ?? undefined) });
    const plan = () => scheduleWalkReminders(walkReminderDates(allWalks, walkHour == null ? null : { hour: walkHour, minute: walkMinute }), walkReminderText(dog.name, goal.minutes)).catch(() => {});
    plan();
    const sub = AppState.addEventListener("change", (st) => { if (st === "active") plan(); });
    return () => sub.remove();
  }, [dog?.id, dog?.name, walkHour, walkMinute, lastWalk, allWalks.length]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Un appui sur une notification ouvre l'onglet concerné (rappel de balade → Balades, geste du jour → Aujourd'hui). */
function useNotificationRouting() {
  const router = useRouter();
  const last = Notifications.useLastNotificationResponse();
  useEffect(() => {
    const route = last?.notification.request.content.data?.route;
    if (typeof route === "string" && route.startsWith("/(tabs)/")) router.navigate(route as any);
  }, [last?.notification.request.identifier]); // eslint-disable-line react-hooks/exhaustive-deps
}

export default function TabsLayout() {
  useWalkReminder();
  useNotificationRouting();
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
