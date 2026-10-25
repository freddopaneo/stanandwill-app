/**
 * Capture d'une vue en image (1080×1350) et partage natif (Instagram, WhatsApp, Messages…).
 * react-native-view-shot et expo-sharing sont inclus dans Expo Go ; chargés dynamiquement pour que
 * l'app démarre même si une brique manque.
 */
import { Platform, Share } from "react-native";
import type { View } from "react-native";

export async function shareViewAsImage(ref: React.RefObject<React.ComponentRef<typeof View> | null>, fileName: string, message: string): Promise<boolean> {
  if (!ref.current) return false;
  let uri: string;
  try {
    const { captureRef } = await import("react-native-view-shot");
    uri = await captureRef(ref, { format: "png", quality: 1, result: "tmpfile", width: 1080, height: 1350, fileName });
  } catch {
    return false;
  }
  try {
    const Sharing = await import("expo-sharing");
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: message, UTI: "public.png" });
      return true;
    }
  } catch {}
  // Secours : feuille de partage standard (iOS accepte une URL de fichier)
  await Share.share(Platform.OS === "ios" ? { url: uri, message } : { message: `${message}\n${uri}` });
  return true;
}
