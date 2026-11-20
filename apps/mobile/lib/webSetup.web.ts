/**
 * Réglages propres au navigateur (PWA), chargés une fois au démarrage (app/_layout.tsx).
 * Dans un navigateur, Alert.alert de React Native ne fait rien : sans ce relais, les messages d'erreur et les
 * confirmations (supprimer une balade, supprimer le compte…) resteraient muets. On passe par les boîtes du navigateur.
 */
import { Alert, Share } from "react-native";

type Btn = { text?: string; style?: string; onPress?: () => void };

(Alert as any).alert = (title: string, message?: string, buttons?: Btn[]) => {
  const text = [title, message].filter(Boolean).join("\n\n");
  if (!buttons || buttons.length <= 1) {
    window.alert(text);
    buttons?.[0]?.onPress?.();
    return;
  }
  const cancel = buttons.find((b) => b.style === "cancel");
  const confirm = buttons.find((b) => b !== cancel);
  if (window.confirm(text)) confirm?.onPress?.();
  else cancel?.onPress?.();
};

// Partage : feuille de partage du téléphone si le navigateur la propose, sinon copie dans le presse-papiers.
const nativeShare = Share.share.bind(Share);
(Share as any).share = async (content: { message?: string; title?: string; url?: string }) => {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") return nativeShare(content as any);
  const text = content.message ?? content.url ?? "";
  try {
    await navigator.clipboard.writeText(text);
    window.alert("Copié dans le presse-papiers.");
  } catch {
    window.prompt("Copiez ce texte :", text);
  }
  return { action: "sharedAction" };
};
