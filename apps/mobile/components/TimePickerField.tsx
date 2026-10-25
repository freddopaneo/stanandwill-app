import React, { useState } from "react";
import { View, Text, Pressable, Modal, ScrollView, StyleSheet } from "react-native";
import { clampTime, fmtTime, type ReminderTime } from "@stanandwill/core";
import { Button, H2, Small } from "./ui";
import { colors, fonts, radius } from "../lib/theme";

const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 00, 05 … 55

/**
 * Réglage d'une heure de rappel : un bouton « 18 h 30 » + un interrupteur Activé/Désactivé.
 * Le choix se fait dans une feuille : heures (dans la plage autorisée) puis minutes par pas de 5.
 * Aucune dépendance native : fonctionne dans Expo Go sans réinstallation.
 */
export function TimePickerField({ value, onChange, minHour, maxHour, maxMinuteOfMaxHour = 55, title }: {
  value: ReminderTime | null;
  onChange: (t: ReminderTime | null) => void;
  minHour: number;
  maxHour: number;
  /** dernière minute autorisée pour l'heure maximale (ex. 45 pour 21 h 45) */
  maxMinuteOfMaxHour?: number;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ReminderTime>(value ?? { hour: Math.min(maxHour, Math.max(minHour, 18)), minute: 0 });
  const enabled = value != null;
  const hours = Array.from({ length: maxHour - minHour + 1 }, (_, i) => minHour + i);
  const bound = (t: ReminderTime) => clampTime(t, minHour * 60, maxHour * 60 + maxMinuteOfMaxHour);

  const openSheet = () => { setDraft(value ?? draft); setOpen(true); };
  const save = () => { onChange(bound(draft)); setOpen(false); };

  return (
    <>
      <View style={s.row}>
        <Pressable onPress={openSheet} style={[s.timeBtn, !enabled && { opacity: 0.5 }]} accessibilityRole="button" accessibilityLabel={`Choisir l'heure, actuellement ${enabled ? fmtTime(value!) : "désactivé"}`}>
          <Text style={s.timeText}>{enabled ? fmtTime(value!) : "—"}</Text>
          <Small style={{ color: colors.foret, fontFamily: fonts.bold }}>Modifier</Small>
        </Pressable>
        <Pressable onPress={() => (enabled ? onChange(null) : openSheet())} style={s.toggleWrap} accessibilityRole="switch" accessibilityState={{ checked: enabled }} accessibilityLabel={enabled ? "Désactiver le rappel" : "Activer le rappel"}>
          <Small style={{ marginRight: 8 }}>{enabled ? "Activé" : "Désactivé"}</Small>
          <View style={[s.switch, enabled && s.switchOn]}><View style={[s.knob, enabled && { alignSelf: "flex-end" }]} /></View>
        </Pressable>
      </View>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={s.back}>
          <View style={s.sheet}>
            <H2 style={{ textAlign: "center" }}>{title}</H2>
            <Text style={s.preview}>{fmtTime(bound(draft))}</Text>
            <Small style={s.label}>Heure</Small>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
              {hours.map((h) => (
                <Pressable key={h} onPress={() => setDraft((d) => bound({ ...d, hour: h }))} style={[s.chip, draft.hour === h && s.chipOn]} accessibilityRole="radio" accessibilityState={{ selected: draft.hour === h }}>
                  <Text style={[s.chipText, draft.hour === h && { color: colors.blanc }]}>{h} h</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Small style={s.label}>Minutes</Small>
            <View style={s.grid}>
              {MINUTES.map((m) => {
                const off = draft.hour === maxHour && m > maxMinuteOfMaxHour;
                const sel = bound(draft).minute === m;
                return (
                  <Pressable key={m} disabled={off} onPress={() => setDraft((d) => ({ ...d, minute: m }))} style={[s.chip, s.minChip, sel && s.chipOn, off && { opacity: 0.3 }]} accessibilityRole="radio" accessibilityState={{ selected: sel, disabled: off }}>
                    <Text style={[s.chipText, sel && { color: colors.blanc }]}>{String(m).padStart(2, "0")}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ marginTop: 18, gap: 8 }}>
              <Button title="Enregistrer" onPress={save} />
              <Button title="Annuler" variant="ghost" onPress={() => setOpen(false)} />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 },
  timeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.creme, borderWidth: 1, borderColor: colors.ligne, borderRadius: radius.md, paddingHorizontal: 14, minHeight: 50 },
  timeText: { fontFamily: fonts.black, fontSize: 22, color: colors.foretFonce },
  toggleWrap: { flexDirection: "row", alignItems: "center", minHeight: 44 },
  switch: { width: 50, height: 30, borderRadius: 15, backgroundColor: colors.ligne, padding: 3, justifyContent: "center" },
  switchOn: { backgroundColor: colors.foret },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.blanc },
  back: { flex: 1, backgroundColor: "rgba(20,41,31,0.55)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.creme, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 34 },
  preview: { fontFamily: fonts.black, fontSize: 44, color: colors.foretFonce, textAlign: "center", marginVertical: 8 },
  label: { fontFamily: fonts.bold, marginTop: 12, marginBottom: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: colors.saugeClair, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14, minHeight: 44, justifyContent: "center", alignItems: "center" },
  minChip: { width: "14.5%", paddingHorizontal: 0 },
  chipOn: { backgroundColor: colors.foret },
  chipText: { fontFamily: fonts.bold, fontSize: 15, color: colors.foret },
});
