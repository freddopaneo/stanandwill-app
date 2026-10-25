import React, { useRef, useState } from "react";
import { View, ScrollView, StyleSheet, Pressable, Text, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useStore } from "../../lib/store";
import { ask, QuotaError, type Triage } from "../../lib/api";
import { Button, H1, Pill, Small } from "../../components/ui";
import { colors, fonts, radius } from "../../lib/theme";

interface Msg { role: "user" | "assistant"; content: string; triage?: Triage; source?: string }

const SUGGESTIONS = [
  "Il refuse de monter les escaliers depuis ce matin",
  "Peut-il manger du fromage ?",
  "Il tremble au repos, est-ce grave ?",
  "Combien de temps de promenade par jour ?",
  "Harnais ou collier ?",
];

/**
 * Onglet 3 : Demander. Conversation avec l'assistant (serveur /api/assistant, étape 6).
 * Mention IA affichée en permanence (AI Act art. 50). Triage visible sur chaque réponse.
 */
export default function Demander() {
  const router = useRouter();
  const { dog, premium } = useStore();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const FREE_LIMIT = 3;
  const used = msgs.filter((m) => m.role === "user").length;
  const blocked = !premium && used >= FREE_LIMIT;

  const send = async (q?: string) => {
    const question = (q ?? text).trim();
    if (!question || !dog || busy || blocked) return;
    setText("");
    const next: Msg[] = [...msgs, { role: "user", content: question }];
    setMsgs(next);
    setBusy(true);
    try {
      const r = await ask(question, dog, next.map(({ role, content }) => ({ role, content })));
      setMsgs([...next, { role: "assistant", content: r.answer, triage: r.triage, source: r.source }]);
    } catch (e) {
      if (e instanceof QuotaError) router.push("/(onboarding)/paywall");
      else setMsgs([...next, { role: "assistant", content: "Je n'ai pas pu répondre. Vérifiez la connexion et réessayez ; en cas de doute, appelez votre vétérinaire." }]);
    }
    setBusy(false);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={80}>
        <View style={s.header}>
          <H1>Demander</H1>
          <Small>Réponses générées par IA à partir de sources vétérinaires, pour {dog?.name ?? "votre chien"}. Jamais un diagnostic.</Small>
        </View>

        <ScrollView ref={scroll} contentContainerStyle={s.thread} keyboardShouldPersistTaps="handled">
          {msgs.length === 0 ? (
            <View>
              <Small style={{ marginBottom: 8 }}>Les questions les plus posées par les maîtres de teckels :</Small>
              {SUGGESTIONS.map((q) => (
                <Pressable key={q} onPress={() => send(q)} style={s.suggestion}><Text style={s.suggestionText}>{q}</Text></Pressable>
              ))}
            </View>
          ) : null}
          {msgs.map((m, i) => (
            <View key={i} style={[s.bubble, m.role === "user" ? s.me : s.bot]}>
              {m.role === "assistant" && m.triage && m.triage !== "none" ? (
                <View style={{ marginBottom: 6 }}><Pill label={m.triage === "emergency" ? "Urgence" : m.triage === "consult" ? "Consultez" : "À surveiller"} tone={m.triage === "watch" ? "vigilance" : "urgence"} /></View>
              ) : null}
              <Text style={[s.bubbleText, m.role === "user" && { color: colors.blanc }]}>{m.content}</Text>
              {m.source ? <Small style={{ marginTop: 6 }}>{m.source}</Small> : null}
            </View>
          ))}
          {busy ? <View style={[s.bubble, s.bot]}><Text style={s.bubbleText}>…</Text></View> : null}
        </ScrollView>

        {blocked ? (
          <View style={s.paywallBar}>
            <Text style={{ fontFamily: fonts.black, color: colors.foretFonce }}>3 questions offertes utilisées</Text>
            <Button title={`Questions illimitées pour ${dog?.name ?? "lui"}`} onPress={() => router.push("/(onboarding)/paywall")} />
          </View>
        ) : (
          <View style={s.composer}>
            <TextInput value={text} onChangeText={setText} placeholder={`Une inquiétude pour ${dog?.name ?? "votre chien"} ?`} style={s.input} multiline onSubmitEditing={() => send()} />
            <Pressable onPress={() => send()} disabled={!text.trim() || busy} style={[s.sendBtn, (!text.trim() || busy) && { opacity: 0.5 }]} accessibilityLabel="Envoyer">
              <Text style={{ fontFamily: fonts.black, color: colors.foretFonce }}>↑</Text>
            </Pressable>
          </View>
        )}
        {!premium && !blocked ? <Small style={{ textAlign: "center", paddingBottom: 6 }}>{FREE_LIMIT - used} question{FREE_LIMIT - used > 1 ? "s" : ""} offerte{FREE_LIMIT - used > 1 ? "s" : ""}</Small> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.creme },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, gap: 4 },
  thread: { padding: 20, paddingTop: 8, gap: 10, flexGrow: 1 },
  suggestion: { backgroundColor: colors.blanc, borderWidth: 1, borderColor: colors.ligne, borderRadius: radius.md, padding: 12, marginBottom: 8 },
  suggestionText: { fontFamily: fonts.bold, fontSize: 15, color: colors.foret },
  bubble: { maxWidth: "88%", borderRadius: radius.lg, padding: 14 },
  me: { alignSelf: "flex-end", backgroundColor: colors.foret, borderBottomRightRadius: 6 },
  bot: { alignSelf: "flex-start", backgroundColor: colors.blanc, borderWidth: 1, borderColor: colors.ligne, borderBottomLeftRadius: 6 },
  bubbleText: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23, color: colors.texte },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: colors.ligne, backgroundColor: colors.blanc },
  input: { flex: 1, maxHeight: 120, borderWidth: 1, borderColor: colors.ligne, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10, fontFamily: fonts.regular, fontSize: 16, backgroundColor: colors.creme },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.miel, alignItems: "center", justifyContent: "center" },
  paywallBar: { padding: 14, gap: 10, borderTopWidth: 1, borderTopColor: colors.ligne, backgroundColor: colors.blanc },
});
