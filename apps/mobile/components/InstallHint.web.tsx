import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button, Card, H2, Small } from "./ui";
import { colors, fonts } from "../lib/theme";

const DISMISS_KEY = "sw.install.dismissed.v1";

/** L'app est-elle déjà ouverte depuis l'écran d'accueil (et non depuis un onglet du navigateur) ? */
function isInstalled(): boolean {
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as any).standalone === true;
}

/**
 * Carte « Installer Stan & Will » (web uniquement), affichée tant que l'app tourne dans un onglet de navigateur.
 * - Android / Chrome : le navigateur fournit une invite d'installation, on la déclenche avec le bouton.
 * - iPhone / iPad : pas d'invite possible, on montre la séquence réelle (vérifiée sur iPhone, Safari et Chrome) :
 *   « ••• » → Partager → En voir plus → Sur l'écran d'accueil. Chaque geste a son pictogramme, dessiné comme le bouton à toucher.
 *   L'app installée ne partage pas la session de Safari : il faut se reconnecter une fois (étape 4).
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
        <View style={{ marginTop: 8, gap: 10 }}>
          <Small>Dans Safari ou Chrome, en 4 gestes :</Small>
          <Step n={1} icon={<Text style={st.dots}>•••</Text>} text="Touchez les trois points, en bas à droite de l'écran." />
          <Step n={2} icon={<ShareIcon />} text="Dans le menu, touchez « Partager »." />
          <Step n={3} icon={<Text style={st.chevron}>⌄</Text>} text="Touchez « En voir plus » (la flèche vers le bas), ou faites glisser la fenêtre vers le haut." />
          <Step n={4} icon={<PlusBoxIcon />} text="Touchez « Sur l'écran d'accueil », puis « Ajouter »." />
          <Small>Ouvrez ensuite Stan & Will depuis sa nouvelle icône. À la première ouverture, touchez « J'ai un compte » et saisissez votre e-mail : un code à 6 chiffres vous est envoyé, et vous retrouvez votre chien et votre plan.</Small>
          <Small>Sur un iPhone plus ancien, le bouton Partager se trouve directement dans la barre du bas.</Small>
        </View>
      )}
      <View style={{ marginTop: 10, gap: 4 }}>
        {prompt ? <Button title="Installer l'app" onPress={install} /> : null}
        <Button title={prompt ? "Plus tard" : "J'ai compris"} variant="ghost" onPress={dismiss} />
      </View>
    </Card>
  );
}

/** Une étape de la séquence : numéro, pictogramme du bouton à toucher, consigne. */
function Step({ n, icon, text }: { n: number; icon: React.ReactNode; text: string }) {
  return (
    <View style={st.step} accessibilityLabel={`Étape ${n} : ${text}`}>
      <View style={st.iconBox}>{icon}</View>
      <Small style={{ flex: 1 }}><Text style={st.num}>{n}. </Text>{text}</Small>
    </View>
  );
}

/** Bouton Partager d'iOS : un carré ouvert en haut, avec une flèche qui en sort. */
function ShareIcon() {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={st.arrow}>↑</Text>
      <View style={st.shareBox} />
    </View>
  );
}

/** « Sur l'écran d'accueil » : un plus dans un carré arrondi. */
function PlusBoxIcon() {
  return <View style={st.plusBox}><Text style={st.plus}>+</Text></View>;
}

const st = StyleSheet.create({
  step: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.saugeClair, alignItems: "center", justifyContent: "center" },
  num: { fontFamily: fonts.black, color: colors.foretFonce },
  dots: { fontFamily: fonts.black, fontSize: 16, letterSpacing: 1, color: colors.foretFonce },
  chevron: { fontFamily: fonts.black, fontSize: 24, lineHeight: 24, color: colors.foretFonce, marginTop: -8 },
  arrow: { fontFamily: fonts.black, fontSize: 15, lineHeight: 15, color: colors.foretFonce, marginBottom: -7, zIndex: 1 },
  shareBox: { width: 16, height: 13, borderWidth: 2, borderTopWidth: 0, borderColor: colors.foretFonce, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 },
  plusBox: { width: 20, height: 20, borderWidth: 2, borderColor: colors.foretFonce, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  plus: { fontFamily: fonts.black, fontSize: 15, lineHeight: 16, color: colors.foretFonce },
});
