import React, { useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, PanResponder, LayoutChangeEvent } from "react-native";
import * as Haptics from "expo-haptics";
import { colors, fonts } from "../lib/theme";

/**
 * Curseur de poids horizontal, fluide, sans dépendance native : glisser ou toucher la piste.
 * Échelle non linéaire (racine carrée) : plus de précision pour les petits chiens (1,5–12 kg), qui sont le cœur de cible.
 * Retour haptique léger à chaque demi-kilo.
 */
export function WeightSlider({ value, min, max, onChange }: { value: number | null | undefined; min: number; max: number; onChange: (kg: number) => void }) {
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  const lastHaptic = useRef<number>(-1);

  const toPos = (kg: number) => (Math.sqrt(kg - min) / Math.sqrt(max - min)) * widthRef.current;
  const toKg = (x: number) => {
    const r = Math.min(1, Math.max(0, x / Math.max(1, widthRef.current)));
    return Math.round((min + r * r * (max - min)) * 10) / 10;
  };

  const set = (x: number) => {
    const kg = toKg(x);
    onChange(kg);
    const half = Math.round(kg * 2);
    if (half !== lastHaptic.current) { lastHaptic.current = half; Haptics.selectionAsync().catch(() => {}); }
  };

  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => set(e.nativeEvent.locationX),
    onPanResponderMove: (e) => set(e.nativeEvent.locationX),
  }), [min, max]);

  const v = value ?? null;
  const pos = v == null ? 0 : toPos(v);
  const ticks = [2, 5, 10, 20, 30, 40].filter((t) => t > min && t <= max);

  return (
    <View>
      <Text style={s.num} accessibilityLiveRegion="polite">{v == null ? "—" : `${v.toFixed(1).replace(".", ",")} kg`}</Text>
      <View
        style={s.hit}
        onLayout={(e: LayoutChangeEvent) => { setWidth(e.nativeEvent.layout.width); widthRef.current = e.nativeEvent.layout.width; }}
        {...pan.panHandlers}
        accessibilityRole="adjustable"
        accessibilityLabel="Poids du chien"
        accessibilityValue={{ min, max, now: v ?? min, text: v == null ? "non renseigné" : `${v} kilos` }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(e) => onChange(Math.min(max, Math.max(min, Math.round(((v ?? 5) + (e.nativeEvent.actionName === "increment" ? 0.5 : -0.5)) * 10) / 10)))}
      >
        <View style={s.track}>
          <View style={[s.fill, { width: width ? Math.max(0, pos) : 0 }]} />
          {ticks.map((t) => <View key={t} style={[s.tick, { left: width ? toPos(t) : 0 }]} />)}
        </View>
        <View style={[s.thumb, { left: (width ? pos : 0) - 16 }]} pointerEvents="none" />
      </View>
      <View style={s.labels}>
        {ticks.map((t) => <Text key={t} style={[s.label, { left: width ? toPos(t) - 14 : 0 }]}>{t} kg</Text>)}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  num: { fontFamily: fonts.black, fontSize: 40, color: colors.foretFonce, textAlign: "center", marginBottom: 10 },
  hit: { height: 56, justifyContent: "center" },
  track: { height: 10, borderRadius: 999, backgroundColor: colors.ligne, overflow: "visible" },
  fill: { position: "absolute", left: 0, top: 0, height: 10, borderRadius: 999, backgroundColor: colors.foret },
  tick: { position: "absolute", top: 2, width: 2, height: 6, borderRadius: 1, backgroundColor: colors.blanc, opacity: 0.9 },
  thumb: { position: "absolute", top: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.blanc, borderWidth: 3, borderColor: colors.foret, shadowColor: colors.foretFonce, shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  labels: { height: 18, position: "relative" },
  label: { position: "absolute", fontFamily: fonts.bold, fontSize: 11, color: colors.texteDoux, width: 40, textAlign: "center" },
});
