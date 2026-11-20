/**
 * Version web (PWA) de lib/notifications.ts.
 * Un navigateur ne sait pas programmer une notification locale à heure fixe : ces fonctions ne font rien.
 * Sur le web, le lien avec le maître passe par les e-mails (récap du dimanche) ; les rappels restent un atout des apps iOS / Android.
 */
export const REMINDERS_AVAILABLE = false;

export function useNotificationRoute(): { id: string; route: string } | null {
  return null;
}

export async function ensurePermission(): Promise<boolean> {
  return false;
}

export async function scheduleDaily(_hour: number | null, _dogName: string, _itemTitle?: string, _minute = 0): Promise<void> {}

export async function scheduleWalkReminders(_dates: Date[], _text: { title: string; body: string }): Promise<void> {}
