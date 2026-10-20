/**
 * Rappel quotidien local (expo-notifications). Aucune donnée ne quitte le téléphone : la notification est planifiée localement.
 * Dans Expo Go, les notifications locales fonctionnent sur iOS ; les notifications distantes (push) demandent un build EAS.
 */
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const ID_KEY = "sw-daily";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

export async function ensurePermission(): Promise<boolean> {
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

/** Planifie (ou replanifie) le rappel du jour à `hour` h, avec le prénom du chien et le titre de l'item du jour. */
export async function scheduleDaily(hour: number | null, dogName: string, itemTitle?: string) {
  await Notifications.cancelScheduledNotificationAsync(ID_KEY).catch(() => {});
  if (hour == null) return;
  if (!(await ensurePermission())) return;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("daily", { name: "Rappel quotidien", importance: Notifications.AndroidImportance.DEFAULT });
  }
  await Notifications.scheduleNotificationAsync({
    identifier: ID_KEY,
    content: {
      title: `Le geste du jour pour ${dogName}`,
      body: itemTitle ? `${itemTitle} · 2 minutes` : "Deux minutes pour son plan de prévention.",
      data: { route: "/(tabs)/aujourdhui" },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute: 0, channelId: "daily" } as any,
  });
}

// ——— Rappel « pas encore sorti » (au plus 1 par jour) ———
const WALK_PREFIX = "sw-walk-";

/**
 * Replanifie les rappels de balade des 7 prochains jours. Appelée à l'ouverture de l'app et à chaque balade
 * enregistrée : le rappel du jour disparaît dès qu'une balade existe. `dates` vient de walkReminderDates (core).
 */
export async function scheduleWalkReminders(dates: Date[], text: { title: string; body: string }) {
  const all = await Notifications.getAllScheduledNotificationsAsync().catch(() => [] as Notifications.NotificationRequest[]);
  await Promise.all(all.filter((n) => n.identifier.startsWith(WALK_PREFIX)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {})));
  if (!dates.length) return;
  if (!(await ensurePermission())) return;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("walks", { name: "Rappel de balade", importance: Notifications.AndroidImportance.DEFAULT });
  }
  for (const d of dates) {
    await Notifications.scheduleNotificationAsync({
      identifier: WALK_PREFIX + d.toISOString().slice(0, 10),
      content: { title: text.title, body: text.body, data: { route: "/(tabs)/balades" } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: d, channelId: "walks" } as any,
    }).catch(() => {});
  }
}
