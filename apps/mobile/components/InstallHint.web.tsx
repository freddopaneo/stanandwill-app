import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { Button, Card, H2, Small } from "./ui";
import { colors } from "../lib/theme";

const DISMISS_KEY = "sw.install.dismissed.v1";

/** L'app est-elle déjà ouverte depuis l'écran d'accueil (et non depuis un onglet du navigateur) ? */
function isInstalled(): boolean {
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as any).standalone === true;
}

/**
 * Carte « Installer Stan & Will » (web uniquement), affichée tant que l'app tourne dans un onglet de navigateur.
 * - Android / Chrome : le navigateur fournit une invite d'installation, on la déclenche avec le bouton.
 * - iPhone / iPad : pas d'invite possible, on explique le geste (Safari → Partager → Sur l'écran d'accueil).
 */
export function InstallHint() {
  const [visible, setVisible] = useState(false);
  const [prompt, setPrompt] = useState<any>(null);
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => {
    let dismissed = false;
    try { dismissed = localStorage.getItem(DISMISS_KEY) === "1"; } catch {}
    if (isInstalled() || dismissed) return;
    if (ios) setVisible(true);
    const onPrompt = (e: Event) => { e.preventDefault(); setPrompt(e); setVisible(true); };
    const onInstalled = () => setVisible(false);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  const dismiss = () => { try { localStorage.setItem(DISMISS_KEY, "1"); } catch {} setVisible(false); };
  const install = async () => { try { await prompt.prompt(); await prompt.userChoice; } catch {} setVisible(false); };

  return (
    <Card style={{ marginTop: 14, borderColor: colors.sauge }}>
      <H2>Installer Stan & Will sur votre téléphone</H2>
      {prompt ? (
        <Small style={{ marginTop: 4 }}>Une icône sur l'écran d'accueil, l'app en plein écran, sans passer par un store.</Small>
      ) : (
        <Small style={{ marginTop: 4 }}>Dans Safari : touchez le bouton Partager (le carré avec une flèche), puis « Sur l'écran d'accueil ». L'app s'ouvrira en plein écran, comme une application.</Small>
      )}
      <View style={{ marginTop: 10, gap: 4 }}>
        {prompt ? <Button title="Installer l'app" onPress={install} /> : null}
        <Button title={prompt ? "Plus tard" : "J'ai compris"} variant="ghost" onPress={dismiss} />
      </View>
    </Card>
  );
}
