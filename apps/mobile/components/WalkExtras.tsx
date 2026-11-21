import React, { useEffect, useState } from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { WalkMap } from "./WalkMap";
import { Small } from "./ui";
import { loadTrace, type TracePoint } from "../lib/walkMedia";
import { listPhotos, type WalkPhoto } from "../lib/photoStore";
import { radius } from "../lib/theme";

/**
 * Souvenirs d'une balade gardés sur le téléphone : carte du parcours et photos.
 * Ne s'affiche que s'il y a quelque chose à montrer (balade au minuteur ou saisie à la main : pas de tracé).
 */
export function WalkExtras({ walkId, width }: { walkId: string; width: number }) {
  const [trace, setTrace] = useState<TracePoint[]>([]);
  const [photos, setPhotos] = useState<WalkPhoto[]>([]);
  const [zoom, setZoom] = useState<WalkPhoto | null>(null);

  useEffect(() => {
    let alive = true;
    setTrace([]); setPhotos([]);
    loadTrace(walkId).then((t) => { if (alive) setTrace(t); });
    listPhotos(walkId).then((p) => { if (alive) setPhotos(p); });
    return () => { alive = false; };
  }, [walkId]);

  if (trace.length < 2 && photos.length === 0) return null;
  return (
    <View style={{ marginTop: 14, gap: 10 }}>
      {trace.length >= 2 ? <WalkMap trace={trace} width={width} height={250} /> : null}
      {photos.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {photos.map((p) => (
            <Pressable key={p.id} onPress={() => setZoom(p)} accessibilityRole="imagebutton" accessibilityLabel="Agrandir la photo">
              <Image source={{ uri: p.uri }} style={s.thumb} />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      <Small style={{ textAlign: "center" }}>Parcours et photos restent sur ce téléphone : ils ne sont pas envoyés à nos serveurs.</Small>
      <Modal visible={!!zoom} transparent animationType="fade" onRequestClose={() => setZoom(null)}>
        <Pressable style={s.zoomBack} onPress={() => setZoom(null)} accessibilityLabel="Fermer la photo">
          {zoom ? <Image source={{ uri: zoom.uri }} style={s.zoom} resizeMode="contain" /> : null}
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  thumb: { width: 84, height: 84, borderRadius: radius.md },
  zoomBack: { flex: 1, backgroundColor: "rgba(20,41,31,0.92)", alignItems: "center", justifyContent: "center", padding: 12 },
  zoom: { width: "100%", height: "100%" },
});
